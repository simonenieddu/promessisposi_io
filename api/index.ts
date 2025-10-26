import { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

// Crypto utility for Vercel compatibility (bcrypt doesn't work in serverless)
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, hashedPassword: string): boolean {
  const [salt, hash] = hashedPassword.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

// JWT utility for admin authentication
function verifyAdminToken(authHeader: string | undefined): { adminId: number; username: string } | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'admin-secret-key-development') as any;
    return { adminId: decoded.adminId, username: decoded.username };
  } catch (error) {
    return null;
  }
}

// Helper function to check admin auth for protected endpoints
function requireAdminAuth(req: VercelRequest, res: VercelResponse): { adminId: number; username: string } | null {
  const adminData = verifyAdminToken(req.headers.authorization as string);
  if (!adminData) {
    res.status(401).json({ message: "Accesso admin richiesto" });
    return null;
  }
  return adminData;
}

const sql = neon(process.env.DATABASE_URL!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS - Secure production configuration with whitelist
  const allowedOrigins = [
    'https://promessisposi-io.vercel.app',
    'http://localhost:5000', // For local testing only
  ];
  
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    // Default for same-origin requests
    res.setHeader('Access-Control-Allow-Origin', 'https://promessisposi-io.vercel.app');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.url === '/test') {
      return res.json({ 
        message: "API funzionante", 
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url,
        env: {
          NODE_ENV: process.env.NODE_ENV,
          DATABASE_URL: process.env.DATABASE_URL ? 'presente' : 'mancante'
        }
      });
    }

    if (req.url === '/auth/register' && req.method === 'POST') {
      const { email, password, firstName, lastName, studyReason } = req.body || {};
      
      // Validation
      if (!email || !password || !firstName || !lastName || !studyReason) {
        return res.status(400).json({ 
          message: "Tutti i campi sono richiesti",
          required: ["email", "password", "firstName", "lastName", "studyReason"]
        });
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Email non valida" });
      }

      // Password validation
      if (password.length < 6) {
        return res.status(400).json({ message: "La password deve essere di almeno 6 caratteri" });
      }

      try {
        // Check if user exists
        const existingUser = await sql`SELECT id FROM users WHERE email = ${email}`;
        if (existingUser.length > 0) {
          return res.status(400).json({ message: "Email già registrata" });
        }

        // Hash password with crypto (native Node.js)
        const hashedPassword = hashPassword(password);
        
        // Create user
        const newUser = await sql`
          INSERT INTO users (email, password, first_name, last_name, study_reason, points, level, role)
          VALUES (${email}, ${hashedPassword}, ${firstName}, ${lastName}, ${studyReason}, 0, 'Novizio', 'student')
          RETURNING id, email, first_name, last_name, points, level
        `;

        return res.json({ 
          message: "Registrazione effettuata con successo",
          user: {
            id: newUser[0].id,
            email: newUser[0].email,
            firstName: newUser[0].first_name,
            lastName: newUser[0].last_name,
            points: newUser[0].points,
            level: newUser[0].level
          }
        });

      } catch (dbError: any) {
        console.error("Database error:", dbError);
        if (dbError.message?.includes('unique')) {
          return res.status(400).json({ message: "Email già registrata" });
        }
        return res.status(500).json({ message: "Errore durante la registrazione" });
      }
    }

    if (req.url === '/auth/login' && req.method === 'POST') {
      const { email, password } = req.body || {};
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email e password richieste" });
      }

      try {
        // Get user
        const users = await sql`SELECT * FROM users WHERE email = ${email}`;
        if (users.length === 0) {
          return res.status(401).json({ message: "Credenziali non valide" });
        }

        const user = users[0];

        // Check password
        const isValid = verifyPassword(password, user.password);
        if (!isValid) {
          return res.status(401).json({ message: "Credenziali non valide" });
        }

        // Update last active
        await sql`UPDATE users SET last_active_at = NOW() WHERE id = ${user.id}`;

        return res.json({ 
          message: "Login effettuato con successo",
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            points: user.points,
            level: user.level
          }
        });

      } catch (dbError: any) {
        console.error("Database error:", dbError);
        return res.status(500).json({ message: "Errore durante il login" });
      }
    }

    if (req.url === '/chapters' && req.method === 'GET') {
      try {
        const chapters = await sql`SELECT * FROM chapters ORDER BY number`;
        return res.json(chapters);
      } catch (dbError: any) {
        console.error("Database error:", dbError);
        return res.status(500).json({ message: "Errore recupero capitoli" });
      }
    }

    // Get single chapter
    if (req.url?.startsWith('/chapters/') && !req.url.includes('/quiz') && req.method === 'GET') {
      const chapterId = req.url.split('/')[3];
      
      try {
        const chapters = await sql`SELECT * FROM chapters WHERE id = ${chapterId}`;
        if (chapters.length === 0) {
          return res.status(404).json({ message: "Capitolo non trovato" });
        }
        return res.json(chapters[0]);
      } catch (dbError: any) {
        console.error("Database error:", dbError);
        return res.status(500).json({ message: "Errore recupero capitolo" });
      }
    }

    // Get quizzes for specific chapter
    if (req.url?.startsWith('/quizzes/chapter/') && req.method === 'GET') {
      const chapterId = req.url.split('/')[4];
      
      try {
        const quizzes = await sql`SELECT * FROM quizzes WHERE chapter_id = ${chapterId} ORDER BY id`;
        return res.json(quizzes);
      } catch (dbError: any) {
        console.error("Database error:", dbError);
        return res.status(500).json({ message: "Errore recupero quiz" });
      }
    }

    // User dashboard stats
    if (req.url?.startsWith('/users/') && req.url?.endsWith('/stats') && req.method === 'GET') {
      const userId = req.url.split('/')[3];
      
      try {
        // Get user basic info
        const users = await sql`SELECT id, email, first_name, last_name, points, level, created_at, last_active_at FROM users WHERE id = ${userId}`;
        if (users.length === 0) {
          return res.status(404).json({ message: "Utente non trovato" });
        }
        const user = users[0];

        // Get reading progress
        const progress = await sql`SELECT chapter_id, last_read_at FROM user_progress WHERE user_id = ${userId} AND is_completed = true`;
        
        // Get quiz scores
        const quizScores = await sql`SELECT chapter_id, score, completed_at FROM quiz_results WHERE user_id = ${userId}`;
        
        // Get achievements/badges
        const achievements = await sql`
          SELECT ub.*, b.name, b.description, b.icon, b.color, b.rarity, b.points
          FROM user_badges ub
          JOIN badges b ON ub.badge_id = b.id
          WHERE ub.user_id = ${userId}
          ORDER BY ub.earned_at DESC
        `;

        // Calculate stats
        const completedChapters = progress.length;
        const avgQuizScore = quizScores.length > 0 
          ? Math.round(quizScores.reduce((sum, q) => sum + q.score, 0) / quizScores.length)
          : 0;
        
        const stats = {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            points: user.points,
            level: user.level,
            joinedDate: user.created_at,
            lastActive: user.last_active_at
          },
          progress: {
            completedChapters,
            totalChapters: 38,
            completionPercentage: Math.round((completedChapters / 38) * 100)
          },
          quizzes: {
            completed: quizScores.length,
            averageScore: avgQuizScore,
            scores: quizScores
          },
          achievements: {
            unlocked: achievements.length,
            list: achievements
          },
          recentActivity: [
            ...progress.slice(-3).map(p => ({
              type: 'chapter',
              title: `Capitolo ${p.chapter_id} completato`,
              date: p.last_read_at,
              icon: 'fas fa-book',
              color: 'green'
            })),
            ...quizScores.slice(-3).map(q => ({
              type: 'quiz',
              title: `Quiz Capitolo ${q.chapter_id} - ${q.score}%`,
              date: q.completed_at,
              icon: 'fas fa-star',
              color: 'edo-gold'
            }))
          ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5)
        };

        return res.json(stats);

      } catch (dbError: any) {
        console.error("Database error:", dbError);
        return res.status(500).json({ message: "Errore recupero statistiche utente" });
      }
    }

    // Get user progress
    if (req.url?.startsWith('/users/') && req.url?.endsWith('/progress') && req.method === 'GET') {
      const userId = req.url.split('/')[3];
      
      try {
        const progress = await sql`
          SELECT 
            user_progress.*,
            chapters.title as chapter_title,
            chapters.number as chapter_number
          FROM user_progress 
          JOIN chapters ON user_progress.chapter_id = chapters.id
          WHERE user_progress.user_id = ${userId}
          ORDER BY chapters.number
        `;
        
        const formattedProgress = progress.map(p => ({
          chapterId: p.chapter_id,
          isCompleted: p.is_completed,
          readingProgress: p.reading_progress || 0,
          timeSpent: p.time_spent || 0,
          currentPage: p.current_page || 0,
          lastReadAt: p.last_read_at,
          chapterTitle: p.chapter_title,
          chapterNumber: p.chapter_number
        }));
        
        return res.json(formattedProgress);
        
      } catch (dbError: any) {
        console.error("Database error:", dbError);
        return res.status(500).json({ message: "Errore recupero progressi" });
      }
    }

    // Update user progress
    if (req.url?.startsWith('/users/') && req.url?.endsWith('/progress') && req.method === 'POST') {
      const userId = req.url.split('/')[3];
      const { chapterId, completed, timeSpent, readingProgress, currentPage } = req.body || {};
      
      try {
        // Use provided reading progress or calculate it
        const finalReadingProgress = readingProgress || (completed ? 100 : 0);
        
        await sql`
          INSERT INTO user_progress (user_id, chapter_id, is_completed, reading_progress, time_spent, current_page, last_read_at)
          VALUES (${userId}, ${chapterId}, ${completed}, ${finalReadingProgress}, ${timeSpent}, ${currentPage || 0}, NOW())
          ON CONFLICT (user_id, chapter_id) 
          DO UPDATE SET 
            is_completed = ${completed}, 
            reading_progress = ${finalReadingProgress},
            time_spent = COALESCE(user_progress.time_spent, 0) + ${timeSpent}, 
            current_page = ${currentPage || 0},
            last_read_at = NOW()
        `;

        // Award points if chapter completed
        if (completed) {
          await sql`UPDATE users SET points = points + 50 WHERE id = ${userId}`;
          
          // Check and award badges
          const completedChapters = await sql`
            SELECT COUNT(*) as count FROM user_progress WHERE user_id = ${userId} AND is_completed = true
          `;
          const chaptersCount = parseInt(completedChapters[0].count);
          
          // Award badges based on chapters completed
          if (chaptersCount === 1) {
            await sql`
              INSERT INTO user_badges (user_id, badge_id, earned_at, progress)
              VALUES (${userId}, 1, NOW(), 100)
              ON CONFLICT (user_id, badge_id) DO NOTHING
            `;
          }
          if (chaptersCount === 5) {
            await sql`
              INSERT INTO user_badges (user_id, badge_id, earned_at, progress)
              VALUES (${userId}, 2, NOW(), 100)
              ON CONFLICT (user_id, badge_id) DO NOTHING
            `;
          }
          if (chaptersCount === 10) {
            await sql`
              INSERT INTO user_badges (user_id, badge_id, earned_at, progress)
              VALUES (${userId}, 3, NOW(), 100)
              ON CONFLICT (user_id, badge_id) DO NOTHING
            `;
          }
          if (chaptersCount >= 37) {
            await sql`
              INSERT INTO user_badges (user_id, badge_id, earned_at, progress)
              VALUES (${userId}, 4, NOW(), 100)
              ON CONFLICT (user_id, badge_id) DO NOTHING
            `;
          }
        }

        return res.json({ message: "Progresso aggiornato" });

      } catch (dbError: any) {
        console.error("Database error:", dbError);
        return res.status(500).json({ message: "Errore aggiornamento progresso" });
      }
    }

    // Get user personalized stats endpoint
    if (req.url?.startsWith('/users/') && req.url?.endsWith('/stats') && req.method === 'GET') {
      const userId = parseInt(req.url.split('/')[3]);
      
      try {
        // Get user basic info
        const userQuery = await sql`SELECT * FROM users WHERE id = ${userId}`;
        const user = userQuery[0];
        if (!user) {
          return res.status(404).json({ message: 'Utente non trovato' });
        }

        // Get user's progress data
        const progress = await sql`
          SELECT * FROM user_progress WHERE user_id = ${userId}
        `;

        // Get user's quiz results
        const quizResults = await sql`
          SELECT * FROM quiz_results WHERE user_id = ${userId} ORDER BY completed_at DESC
        `;

        // Get user's badges
        const userBadges = await sql`
          SELECT ub.*, b.name, b.description, b.icon, b.color, b.rarity, b.points
          FROM user_badges ub
          JOIN badges b ON ub.badge_id = b.id
          WHERE ub.user_id = ${userId}
          ORDER BY ub.earned_at DESC
        `;
        
        const achievements = userBadges;

        // Calculate personalized stats
        const completedChapters = progress.filter((p: any) => p.is_completed).length;
        const avgQuizScore = quizResults.length > 0 
          ? Math.round(quizResults.reduce((sum: number, q: any) => sum + (q.score || 0), 0) / quizResults.length)
          : 0;

        const stats = {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            points: user.points,
            level: user.level,
            joinedDate: user.created_at,
            lastActive: user.last_active_at
          },
          progress: {
            completedChapters,
            totalChapters: 38,
            completionPercentage: Math.round((completedChapters / 38) * 100)
          },
          quizzes: {
            completed: quizResults.length,
            averageScore: avgQuizScore,
            scores: quizResults
          },
          achievements: {
            unlocked: achievements.length,
            list: achievements
          },
          recentActivity: [
            ...progress.slice(-3).map((p: any) => ({
              type: 'chapter',
              title: `Capitolo ${p.chapter_id} completato`,
              date: p.last_read_at,
              icon: 'fas fa-book',
              color: 'green'
            })),
            ...quizResults.slice(-3).map((q: any) => ({
              type: 'quiz',
              title: `Quiz completato - ${q.score} punti`,
              date: q.completed_at,
              icon: 'fas fa-star',
              color: 'edo-gold'
            }))
          ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5)
        };

        return res.json(stats);
      } catch (error: any) {
        console.error('Stats error:', error);
        return res.status(500).json({ message: 'Errore nel recupero delle statistiche' });
      }
    }

    // Admin login
    if (req.url === '/admin/login' && req.method === 'POST') {
      const { username, password } = req.body || {};
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username e password richiesti" });
      }

      try {
        // Get admin user
        const admins = await sql`SELECT * FROM admin_users WHERE username = ${username}`;
        if (admins.length === 0) {
          return res.status(401).json({ message: "Credenziali non valide" });
        }

        const admin = admins[0];

        // Check password using proper hash verification
        const isValid = verifyPassword(password, admin.password);
        if (!isValid) {
          return res.status(401).json({ message: "Credenziali non valide" });
        }

        // Update last login
        await sql`UPDATE admin_users SET last_login_at = NOW() WHERE id = ${admin.id}`;

        // Generate JWT token
        const token = jwt.sign(
          { adminId: admin.id, username: admin.username },
          process.env.JWT_SECRET || 'admin-secret-key-development',
          { expiresIn: '24h' }
        );

        return res.json({ 
          message: "Login admin effettuato con successo",
          admin: { id: admin.id, username: admin.username },
          token
        });

      } catch (dbError: any) {
        console.error("Database error:", dbError);
        return res.status(500).json({ message: "Errore durante il login admin" });
      }
    }

    // Admin: Verify authentication
    if (req.url === '/admin/me' && req.method === 'GET') {
      const adminData = verifyAdminToken(req.headers.authorization as string);
      if (!adminData) {
        return res.status(401).json({ message: "Non autenticato" });
      }

      try {
        // Get fresh admin data from database
        const admins = await sql`SELECT id, username, last_login_at FROM admin_users WHERE id = ${adminData.adminId}`;
        if (admins.length === 0) {
          return res.status(401).json({ message: "Admin non trovato" });
        }

        return res.json(admins[0]);
      } catch (error) {
        console.error("Admin me error:", error);
        return res.status(500).json({ message: "Errore verifica autenticazione" });
      }
    }

    // Admin: Get all chapters
    if (req.url === '/admin/chapters' && req.method === 'GET') {
      const adminData = requireAdminAuth(req, res);
      if (!adminData) return;
      
      try {
        const chapters = await sql`SELECT * FROM chapters ORDER BY number`;
        return res.json(chapters);
      } catch (error) {
        return res.status(500).json({ message: "Errore recupero capitoli" });
      }
    }

    // Admin: Create/Update chapter
    if (req.url === '/admin/chapters' && req.method === 'POST') {
      const adminData = requireAdminAuth(req, res);
      if (!adminData) return;
      
      const { number, title, content, summary } = req.body || {};
      
      if (!number || !title || !content) {
        return res.status(400).json({ message: "Numero, titolo e contenuto sono richiesti" });
      }
      
      try {
        const result = await sql`
          INSERT INTO chapters (number, title, content, summary)
          VALUES (${number}, ${title}, ${content}, ${summary || null})
          ON CONFLICT (number) DO UPDATE SET
            title = ${title},
            content = ${content},
            summary = ${summary || null}
          RETURNING *
        `;
        return res.json(result[0]);
      } catch (error) {
        console.error("Error creating chapter:", error);
        return res.status(500).json({ message: "Errore salvataggio capitolo" });
      }
    }

    // Admin: Delete chapter
    if (req.url?.startsWith('/admin/chapters/') && req.method === 'DELETE') {
      const adminData = requireAdminAuth(req, res);
      if (!adminData) return;
      
      const chapterId = req.url.split('/')[4];
      
      try {
        await sql`DELETE FROM chapters WHERE id = ${chapterId}`;
        return res.json({ message: "Capitolo eliminato" });
      } catch (error) {
        return res.status(500).json({ message: "Errore eliminazione capitolo" });
      }
    }

    // Admin: Get all users
    if (req.url === '/admin/users' && req.method === 'GET') {
      const adminData = requireAdminAuth(req, res);
      if (!adminData) return;
      
      try {
        const users = await sql`
          SELECT id, email, first_name, last_name, points, level, created_at, last_active_at
          FROM users ORDER BY created_at DESC
        `;
        return res.json(users);
      } catch (error) {
        return res.status(500).json({ message: "Errore recupero utenti" });
      }
    }

    // Admin: Get all quizzes
    if (req.url === '/admin/quizzes' && req.method === 'GET') {
      const adminData = requireAdminAuth(req, res);
      if (!adminData) return;
      
      try {
        const quizzes = await sql`SELECT * FROM quizzes ORDER BY chapter_id, id`;
        return res.json(quizzes);
      } catch (error) {
        return res.status(500).json({ message: "Errore recupero quiz" });
      }
    }

    // Admin: Get glossary terms
    if (req.url === '/admin/glossary' && req.method === 'GET') {
      const adminData = requireAdminAuth(req, res);
      if (!adminData) return;
      
      try {
        const terms = await sql`SELECT * FROM glossary_terms ORDER BY term`;
        return res.json(terms);
      } catch (error) {
        return res.status(500).json({ message: "Errore recupero glossario" });
      }
    }

    // Admin: Create glossary term
    if (req.url === '/admin/glossary' && req.method === 'POST') {
      const adminData = requireAdminAuth(req, res);
      if (!adminData) return;
      
      const { term, definition, context, chapter_id } = req.body || {};
      
      try {
        const result = await sql`
          INSERT INTO glossary_terms (term, definition, context, chapter_id)
          VALUES (${term}, ${definition}, ${context}, ${chapter_id})
          RETURNING *
        `;
        return res.json(result[0]);
      } catch (error) {
        return res.status(500).json({ message: "Errore creazione termine" });
      }
    }

    // Admin: Delete glossary term
    if (req.url?.startsWith('/admin/glossary/') && req.method === 'DELETE') {
      const adminData = requireAdminAuth(req, res);
      if (!adminData) return;
      
      const termId = req.url.split('/')[4];
      
      try {
        await sql`DELETE FROM glossary_terms WHERE id = ${termId}`;
        return res.json({ message: "Termine eliminato" });
      } catch (error) {
        return res.status(500).json({ message: "Errore eliminazione termine" });
      }
    }

    // Admin: Get historical contexts
    if (req.url === '/admin/contexts' && req.method === 'GET') {
      const adminData = requireAdminAuth(req, res);
      if (!adminData) return;
      
      try {
        const contexts = await sql`
          SELECT hc.*, c.title as chapter_title 
          FROM historical_contexts hc
          LEFT JOIN chapters c ON hc.chapter_id = c.id
          ORDER BY hc.chapter_id, hc.page_number
        `;
        return res.json(contexts);
      } catch (error) {
        return res.status(500).json({ message: "Errore recupero contesti" });
      }
    }

    // Admin: Create historical context
    if (req.url === '/admin/contexts' && req.method === 'POST') {
      const adminData = requireAdminAuth(req, res);
      if (!adminData) return;
      
      const { chapterId, pageNumber, contextType, title, content } = req.body || {};
      
      try {
        const result = await sql`
          INSERT INTO historical_contexts (chapter_id, page_number, context_type, title, content)
          VALUES (${chapterId}, ${pageNumber}, ${contextType}, ${title}, ${content})
          RETURNING *
        `;
        return res.json(result[0]);
      } catch (error) {
        return res.status(500).json({ message: "Errore creazione contesto" });
      }
    }

    // Save quiz result
    if (req.url?.startsWith('/users/') && req.url?.endsWith('/quiz') && req.method === 'POST') {
      const userId = req.url.split('/')[3];
      const { chapterId, score, answers } = req.body || {};
      
      try {
        await sql`
          INSERT INTO quiz_results (user_id, chapter_id, score, answers, completed_at)
          VALUES (${userId}, ${chapterId}, ${score}, ${JSON.stringify(answers)}, NOW())
          ON CONFLICT (user_id, chapter_id)
          DO UPDATE SET score = GREATEST(quiz_results.score, ${score}), answers = ${JSON.stringify(answers)}, completed_at = NOW()
        `;

        // Award points based on score
        const points = Math.floor(score / 10);
        await sql`UPDATE users SET points = points + ${points} WHERE id = ${userId}`;
        
        // Check and award quiz badges
        const completedQuizzes = await sql`
          SELECT COUNT(*) as count FROM quiz_results WHERE user_id = ${userId}
        `;
        const quizzesCount = parseInt(completedQuizzes[0].count);
        
        // Award badges based on quizzes completed
        if (quizzesCount === 1) {
          await sql`
            INSERT INTO user_badges (user_id, badge_id, earned_at, progress)
            VALUES (${userId}, 5, NOW(), 100)
            ON CONFLICT (user_id, badge_id) DO NOTHING
          `;
        }
        if (quizzesCount === 5) {
          await sql`
            INSERT INTO user_badges (user_id, badge_id, earned_at, progress)
            VALUES (${userId}, 6, NOW(), 100)
            ON CONFLICT (user_id, badge_id) DO NOTHING
          `;
        }
        
        // Perfect score badge (score >= 80)
        if (score >= 80) {
          const perfectQuizzes = await sql`
            SELECT COUNT(*) as count FROM quiz_results WHERE user_id = ${userId} AND score >= 80
          `;
          const perfectCount = parseInt(perfectQuizzes[0].count);
          
          if (perfectCount === 1) {
            await sql`
              INSERT INTO user_badges (user_id, badge_id, earned_at, progress)
              VALUES (${userId}, 8, NOW(), 100)
              ON CONFLICT (user_id, badge_id) DO NOTHING
            `;
          }
        }

        return res.json({ message: "Quiz completato", pointsEarned: points });

      } catch (dbError: any) {
        console.error("Database error:", dbError);
        return res.status(500).json({ message: "Errore salvataggio quiz" });
      }
    }

    // Admin: Update chapter
    if (req.url?.startsWith('/admin/chapters/') && req.method === 'PUT') {
      const adminData = requireAdminAuth(req, res);
      if (!adminData) return;
      
      const chapterId = req.url.split('/')[4];
      const { number, title, content, summary } = req.body || {};
      
      try {
        const result = await sql`
          UPDATE chapters 
          SET number = ${number}, title = ${title}, content = ${content}, summary = ${summary}
          WHERE id = ${chapterId}
          RETURNING *
        `;
        if (result.length === 0) {
          return res.status(404).json({ message: "Capitolo non trovato" });
        }
        return res.json(result[0]);
      } catch (error) {
        return res.status(500).json({ message: "Errore aggiornamento capitolo" });
      }
    }

    // Admin: Update glossary term
    if (req.url?.startsWith('/admin/glossary/') && req.method === 'PUT') {
      const adminData = requireAdminAuth(req, res);
      if (!adminData) return;
      
      const termId = req.url.split('/')[4];
      const { term, definition, context, chapter_id } = req.body || {};
      
      try {
        const result = await sql`
          UPDATE glossary_terms 
          SET term = ${term}, definition = ${definition}, context = ${context}, chapter_id = ${chapter_id}
          WHERE id = ${termId}
          RETURNING *
        `;
        if (result.length === 0) {
          return res.status(404).json({ message: "Termine non trovato" });
        }
        return res.json(result[0]);
      } catch (error) {
        return res.status(500).json({ message: "Errore aggiornamento termine" });
      }
    }

    // Admin: Update historical context
    if (req.url?.startsWith('/admin/contexts/') && req.method === 'PUT') {
      const adminData = requireAdminAuth(req, res);
      if (!adminData) return;
      
      const contextId = req.url.split('/')[4];
      const { chapterId, pageNumber, contextType, title, content } = req.body || {};
      
      try {
        const result = await sql`
          UPDATE historical_contexts 
          SET chapter_id = ${chapterId}, page_number = ${pageNumber}, 
              context_type = ${contextType}, title = ${title}, content = ${content}
          WHERE id = ${contextId}
          RETURNING *
        `;
        if (result.length === 0) {
          return res.status(404).json({ message: "Contesto non trovato" });
        }
        return res.json(result[0]);
      } catch (error) {
        return res.status(500).json({ message: "Errore aggiornamento contesto" });
      }
    }

    // Admin: Delete historical context
    if (req.url?.startsWith('/admin/contexts/') && req.method === 'DELETE') {
      const adminData = requireAdminAuth(req, res);
      if (!adminData) return;
      
      const contextId = req.url.split('/')[4];
      
      try {
        await sql`DELETE FROM historical_contexts WHERE id = ${contextId}`;
        return res.json({ message: "Contesto eliminato" });
      } catch (error) {
        return res.status(500).json({ message: "Errore eliminazione contesto" });
      }
    }

    // Admin: Get all quizzes
    if (req.url === '/admin/quizzes' && req.method === 'GET') {
      const adminData = requireAdminAuth(req, res);
      if (!adminData) return;
      
      try {
        const quizzes = await sql`
          SELECT q.*, c.title as chapter_title 
          FROM quizzes q
          LEFT JOIN chapters c ON q.chapter_id = c.id
          ORDER BY q.chapter_id, q.id
        `;
        return res.json(quizzes);
      } catch (error) {
        return res.status(500).json({ message: "Errore recupero quiz" });
      }
    }

    // Admin: Create quiz
    if (req.url === '/admin/quizzes' && req.method === 'POST') {
      const adminData = requireAdminAuth(req, res);
      if (!adminData) return;
      
      const { chapter_id, question, options, correct_answer, explanation, points } = req.body || {};
      
      try {
        const result = await sql`
          INSERT INTO quizzes (chapter_id, question, options, correct_answer, explanation, points)
          VALUES (${chapter_id}, ${question}, ${JSON.stringify(options)}, ${correct_answer}, ${explanation}, ${points || 10})
          RETURNING *
        `;
        return res.json(result[0]);
      } catch (error) {
        return res.status(500).json({ message: "Errore creazione quiz" });
      }
    }

    // Admin: Update quiz
    if (req.url?.startsWith('/admin/quizzes/') && req.method === 'PUT') {
      const adminData = requireAdminAuth(req, res);
      if (!adminData) return;
      
      const quizId = req.url.split('/')[4];
      const { chapter_id, question, options, correct_answer, explanation, points } = req.body || {};
      
      try {
        const result = await sql`
          UPDATE quizzes 
          SET chapter_id = ${chapter_id}, question = ${question}, options = ${JSON.stringify(options)}, 
              correct_answer = ${correct_answer}, explanation = ${explanation}, points = ${points || 10}
          WHERE id = ${quizId}
          RETURNING *
        `;
        if (result.length === 0) {
          return res.status(404).json({ message: "Quiz non trovato" });
        }
        return res.json(result[0]);
      } catch (error) {
        return res.status(500).json({ message: "Errore aggiornamento quiz" });
      }
    }

    // Admin: Delete quiz
    if (req.url?.startsWith('/admin/quizzes/') && req.method === 'DELETE') {
      const adminData = requireAdminAuth(req, res);
      if (!adminData) return;
      
      const quizId = req.url.split('/')[4];
      
      try {
        await sql`DELETE FROM quizzes WHERE id = ${quizId}`;
        return res.json({ message: "Quiz eliminato" });
      } catch (error) {
        return res.status(500).json({ message: "Errore eliminazione quiz" });
      }
    }

    // Get user badges endpoint
    if (req.url?.startsWith('/users/') && req.url?.endsWith('/badges') && req.method === 'GET') {
      const userId = req.url.split('/')[3];
      
      try {
        const userBadges = await sql`
          SELECT ub.*, b.name, b.description, b.icon, b.color, b.rarity, b.points, b.category, b.requirement
          FROM user_badges ub
          JOIN badges b ON ub.badge_id = b.id
          WHERE ub.user_id = ${userId}
          ORDER BY ub.earned_at DESC
        `;
        
        // Trasforma i dati per corrispondere alla struttura aspettata dal frontend
        const transformedBadges = userBadges.map((ub: any) => ({
          id: ub.id,
          userId: ub.user_id,
          badgeId: ub.badge_id,
          earnedAt: ub.earned_at,
          progress: ub.progress,
          badge: {
            id: ub.badge_id,
            name: ub.name,
            description: ub.description,
            icon: ub.icon,
            color: ub.color,
            category: ub.category || 'general',
            requirement: ub.requirement || '',
            points: ub.points,
            rarity: ub.rarity,
            isActive: true,
            createdAt: new Date().toISOString()
          }
        }));
        
        return res.json(transformedBadges);
        
      } catch (dbError: any) {
        console.error("Database error:", dbError);
        return res.status(500).json({ message: "Errore recupero badge" });
      }
    }

    // Get user streaks endpoint
    if (req.url?.startsWith('/users/') && req.url?.endsWith('/streaks') && req.method === 'GET') {
      const userId = req.url.split('/')[3];
      
      try {
        // Per ora restituisce dati vuoti dato che non abbiamo ancora implementato le streak
        return res.json({
          reading: null,
          quiz: null
        });
        
      } catch (dbError: any) {
        console.error("Database error:", dbError);
        return res.status(500).json({ message: "Errore recupero streaks" });
      }
    }

    // Get leaderboard endpoint
    if (req.url?.endsWith('/leaderboard') && req.method === 'GET') {
      try {
        const leaderboard = await sql`
          SELECT u.id as "userId", u.first_name as "firstName", u.last_name as "lastName", 
                 u.points, u.level,
                 COUNT(CASE WHEN up.is_completed = true THEN 1 END) as "chaptersCompleted"
          FROM users u
          LEFT JOIN user_progress up ON u.id = up.user_id
          GROUP BY u.id, u.first_name, u.last_name, u.points, u.level
          ORDER BY u.points DESC, "chaptersCompleted" DESC
          LIMIT 10
        `;
        
        // Trasforma i dati per corrispondere alla struttura aspettata dal frontend
        const transformedLeaderboard = leaderboard.map((entry: any) => ({
          userId: entry.userId,
          points: entry.points,
          level: entry.level,
          chaptersCompleted: parseInt(entry.chaptersCompleted) || 0,
          user: {
            firstName: entry.firstName,
            lastName: entry.lastName
          }
        }));
        
        return res.json(transformedLeaderboard);
        
      } catch (dbError: any) {
        console.error("Database error:", dbError);
        return res.status(500).json({ message: "Errore recupero classifica" });
      }
    }
    
    return res.status(404).json({ 
      message: "Endpoint non trovato",
      url: req.url,
      method: req.method
    });
    
  } catch (error: any) {
    console.error("Errore API:", error);
    return res.status(500).json({ 
      message: "Errore interno del server",
      error: error.message
    });
  }
}