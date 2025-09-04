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
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.url === '/api/test') {
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

    if (req.url === '/api/auth/register' && req.method === 'POST') {
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

    if (req.url === '/api/auth/login' && req.method === 'POST') {
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

    if (req.url === '/api/chapters' && req.method === 'GET') {
      try {
        const chapters = await sql`SELECT * FROM chapters ORDER BY number`;
        return res.json(chapters);
      } catch (dbError: any) {
        console.error("Database error:", dbError);
        return res.status(500).json({ message: "Errore recupero capitoli" });
      }
    }

    // User dashboard stats
    if (req.url?.startsWith('/api/users/') && req.url?.endsWith('/stats') && req.method === 'GET') {
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
        
        // Get achievements
        const achievements = await sql`SELECT achievement_id, unlocked_at FROM user_achievements WHERE user_id = ${userId}`;

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

    // Update user progress
    if (req.url?.startsWith('/api/users/') && req.url?.endsWith('/progress') && req.method === 'POST') {
      const userId = req.url.split('/')[3];
      const { chapterId, completed, timeSpent } = req.body || {};
      
      try {
        await sql`
          INSERT INTO user_progress (user_id, chapter_id, is_completed, time_spent, last_read_at)
          VALUES (${userId}, ${chapterId}, ${completed}, ${timeSpent}, NOW())
          ON CONFLICT (user_id, chapter_id) 
          DO UPDATE SET is_completed = ${completed}, time_spent = COALESCE(user_progress.time_spent, 0) + ${timeSpent}, last_read_at = NOW()
        `;

        // Award points if chapter completed
        if (completed) {
          await sql`UPDATE users SET points = points + 10 WHERE id = ${userId}`;
        }

        return res.json({ message: "Progresso aggiornato" });

      } catch (dbError: any) {
        console.error("Database error:", dbError);
        return res.status(500).json({ message: "Errore aggiornamento progresso" });
      }
    }

    // Get user personalized stats endpoint
    if (req.url?.startsWith('/api/users/') && req.url?.endsWith('/stats') && req.method === 'GET') {
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

        // Get user's achievements (create empty array for now)
        const achievements: any[] = [];

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
    if (req.url === '/api/admin/login' && req.method === 'POST') {
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
    if (req.url === '/api/admin/me' && req.method === 'GET') {
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
    if (req.url === '/api/admin/chapters' && req.method === 'GET') {
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
    if (req.url === '/api/admin/chapters' && req.method === 'POST') {
      const adminData = requireAdminAuth(req, res);
      if (!adminData) return;
      
      const { number, title, content, summary } = req.body || {};
      
      try {
        const result = await sql`
          INSERT INTO chapters (number, title, content, summary)
          VALUES (${number}, ${title}, ${content}, ${summary})
          ON CONFLICT (number) DO UPDATE SET
            title = ${title},
            content = ${content},
            summary = ${summary}
          RETURNING *
        `;
        return res.json(result[0]);
      } catch (error) {
        return res.status(500).json({ message: "Errore salvataggio capitolo" });
      }
    }

    // Admin: Delete chapter
    if (req.url?.startsWith('/api/admin/chapters/') && req.method === 'DELETE') {
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
    if (req.url === '/api/admin/users' && req.method === 'GET') {
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

    // Admin: Get glossary terms
    if (req.url === '/api/admin/glossary' && req.method === 'GET') {
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
    if (req.url === '/api/admin/glossary' && req.method === 'POST') {
      const adminData = requireAdminAuth(req, res);
      if (!adminData) return;
      
      const { term, definition, category } = req.body || {};
      
      try {
        const result = await sql`
          INSERT INTO glossary_terms (term, definition, category)
          VALUES (${term}, ${definition}, ${category})
          RETURNING *
        `;
        return res.json(result[0]);
      } catch (error) {
        return res.status(500).json({ message: "Errore creazione termine" });
      }
    }

    // Admin: Delete glossary term
    if (req.url?.startsWith('/api/admin/glossary/') && req.method === 'DELETE') {
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
    if (req.url === '/api/admin/contexts' && req.method === 'GET') {
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
    if (req.url === '/api/admin/contexts' && req.method === 'POST') {
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
    if (req.url?.startsWith('/api/users/') && req.url?.endsWith('/quiz') && req.method === 'POST') {
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

        return res.json({ message: "Quiz completato", pointsEarned: points });

      } catch (dbError: any) {
        console.error("Database error:", dbError);
        return res.status(500).json({ message: "Errore salvataggio quiz" });
      }
    }

    // Admin: Update chapter
    if (req.url?.startsWith('/api/admin/chapters/') && req.method === 'PUT') {
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
    if (req.url?.startsWith('/api/admin/glossary/') && req.method === 'PUT') {
      const adminData = requireAdminAuth(req, res);
      if (!adminData) return;
      
      const termId = req.url.split('/')[4];
      const { term, definition, category } = req.body || {};
      
      try {
        const result = await sql`
          UPDATE glossary_terms 
          SET term = ${term}, definition = ${definition}, category = ${category}
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
    if (req.url?.startsWith('/api/admin/contexts/') && req.method === 'PUT') {
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
    if (req.url?.startsWith('/api/admin/contexts/') && req.method === 'DELETE') {
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
    if (req.url === '/api/admin/quizzes' && req.method === 'GET') {
      const adminData = requireAdminAuth(req, res);
      if (!adminData) return;
      
      try {
        const quizzes = await sql`
          SELECT q.*, c.title as chapter_title 
          FROM quizzes q
          LEFT JOIN chapters c ON q.chapter_id = c.id
          ORDER BY q.chapter_id
        `;
        return res.json(quizzes);
      } catch (error) {
        return res.status(500).json({ message: "Errore recupero quiz" });
      }
    }

    // Admin: Create quiz
    if (req.url === '/api/admin/quizzes' && req.method === 'POST') {
      const adminData = requireAdminAuth(req, res);
      if (!adminData) return;
      
      const { chapterId, title, questions } = req.body || {};
      
      try {
        const result = await sql`
          INSERT INTO quizzes (chapter_id, title, questions)
          VALUES (${chapterId}, ${title}, ${JSON.stringify(questions)})
          RETURNING *
        `;
        return res.json(result[0]);
      } catch (error) {
        return res.status(500).json({ message: "Errore creazione quiz" });
      }
    }

    // Admin: Update quiz
    if (req.url?.startsWith('/api/admin/quizzes/') && req.method === 'PUT') {
      const adminData = requireAdminAuth(req, res);
      if (!adminData) return;
      
      const quizId = req.url.split('/')[4];
      const { chapterId, title, questions } = req.body || {};
      
      try {
        const result = await sql`
          UPDATE quizzes 
          SET chapter_id = ${chapterId}, title = ${title}, questions = ${JSON.stringify(questions)}
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
    if (req.url?.startsWith('/api/admin/quizzes/') && req.method === 'DELETE') {
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