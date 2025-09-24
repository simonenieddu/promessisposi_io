import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage-simple";
import { gamificationService } from "./gamification-service";
import bcrypt from "bcrypt";
import { loginSchema, registerSchema, insertUserQuizResultSchema } from "@shared/schema";
import { z } from "zod";
import session from "express-session";
import MemoryStore from "memorystore";


// Extend session type for admin
declare module 'express-session' {
  export interface SessionData {
    adminUser?: { id: number; username: string };
  }
}

// Admin authentication middleware
function requireAdminAuth(req: any, res: any, next: any) {
  if (!req.session?.adminUser) {
    return res.status(401).json({ message: "Accesso admin richiesto" });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session store for admin authentication
  const MemStore = MemoryStore(session);
  
  app.use(session({
    store: new MemStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    secret: process.env.SESSION_SECRET || 'admin-secret-key-development-2024',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: process.env.NODE_ENV === 'production', 
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
    },
    name: 'admin.session.id'
  }));

  // Admin Authentication Routes
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username e password richiesti" });
      }

      try {
        // Try to get admin from database first
        const adminUser = await storage.getAdminByUsername(username);
        if (adminUser && await bcrypt.compare(password, adminUser.password)) {
          // Database admin user found and password matches
          await storage.updateAdminLastLogin(adminUser.id);
          req.session.adminUser = { id: adminUser.id, username: adminUser.username };
          
          res.json({ 
            message: "Login admin effettuato con successo",
            admin: { id: adminUser.id, username: adminUser.username }
          });
        } else {
          // Fallback to environment variables for development
          const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
          const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
          
          if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            req.session.adminUser = { id: 1, username: ADMIN_USERNAME };
            
            res.json({ 
              message: "Login admin effettuato con successo (dev mode)",
              admin: { id: 1, username: ADMIN_USERNAME }
            });
          } else {
            res.status(401).json({ message: "Credenziali non valide" });
          }
        }
      } catch (dbError) {
        // If database fails, fallback to environment variables
        console.log("Database admin auth failed, using environment fallback");
        const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
        const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
        
        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
          req.session.adminUser = { id: 1, username: ADMIN_USERNAME };
          
          res.json({ 
            message: "Login admin effettuato con successo (fallback mode)",
            admin: { id: 1, username: ADMIN_USERNAME }
          });
        } else {
          res.status(401).json({ message: "Credenziali non valide" });
        }
      }
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({ message: "Errore del server" });
    }
  });

  app.post("/api/admin/logout", (req, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Errore durante il logout" });
      }
      res.json({ message: "Logout effettuato con successo" });
    });
  });

  app.get("/api/admin/me", requireAdminAuth, (req, res) => {
    res.json(req.session.adminUser);
  });

  // Admin Content Management Routes
  app.get("/api/admin/quizzes", requireAdminAuth, async (req, res) => {
    try {
      const quizzes = await storage.getAllQuizzes();
      res.json(quizzes);
    } catch (error) {
      console.error("Error fetching quizzes:", error);
      res.status(500).json({ message: "Errore nel recupero dei quiz" });
    }
  });

  app.post("/api/admin/chapters", requireAdminAuth, async (req, res) => {
    try {
      const chapterData = req.body;
      const chapter = await storage.createChapter(chapterData);
      res.json(chapter);
    } catch (error) {
      console.error("Error creating chapter:", error);
      res.status(500).json({ message: "Errore nella creazione del capitolo" });
    }
  });

  app.put("/api/admin/chapters/:id", requireAdminAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const chapterData = req.body;
      const chapter = await storage.updateChapter(id, chapterData);
      res.json(chapter);
    } catch (error) {
      console.error("Error updating chapter:", error);
      res.status(500).json({ message: "Errore nell'aggiornamento del capitolo" });
    }
  });

  app.delete("/api/admin/chapters/:id", requireAdminAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteChapter(id);
      res.json({ message: "Capitolo eliminato con successo" });
    } catch (error) {
      console.error("Error deleting chapter:", error);
      res.status(500).json({ message: "Errore nell'eliminazione del capitolo" });
    }
  });

  app.post("/api/admin/glossary", requireAdminAuth, async (req, res) => {
    try {
      const termData = req.body;
      const term = await storage.createGlossaryTerm(termData);
      res.json(term);
    } catch (error) {
      console.error("Error creating glossary term:", error);
      res.status(500).json({ message: "Errore nella creazione del termine" });
    }
  });

  app.put("/api/admin/glossary/:term", requireAdminAuth, async (req, res) => {
    try {
      const term = req.params.term;
      const termData = req.body;
      const updatedTerm = await storage.updateGlossaryTerm(term, termData);
      res.json(updatedTerm);
    } catch (error) {
      console.error("Error updating glossary term:", error);
      res.status(500).json({ message: "Errore nell'aggiornamento del termine" });
    }
  });

  app.delete("/api/admin/glossary/:term", requireAdminAuth, async (req, res) => {
    try {
      const term = req.params.term;
      await storage.deleteGlossaryTerm(term);
      res.json({ message: "Termine eliminato con successo" });
    } catch (error) {
      console.error("Error deleting glossary term:", error);
      res.status(500).json({ message: "Errore nell'eliminazione del termine" });
    }
  });

  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email già registrata" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Create user
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      res.json({ 
        message: "Registrazione completata con successo",
        user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dati non validi", errors: error.errors });
      }
      res.status(500).json({ message: "Errore del server" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Credenziali non valide" });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Credenziali non valide" });
      }

      // Update last active
      await storage.updateUserLastActive(user.id);

      res.json({ 
        message: "Login effettuato con successo",
        user: { 
          id: user.id, 
          email: user.email, 
          firstName: user.firstName, 
          lastName: user.lastName,
          points: user.points,
          level: user.level 
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dati non validi", errors: error.errors });
      }
      res.status(500).json({ message: "Errore del server" });
    }
  });

  // Chapter routes
  app.get("/api/chapters", async (req, res) => {
    try {
      const chapters = await storage.getAllChapters();
      res.json(chapters);
    } catch (error) {
      res.status(500).json({ message: "Errore nel recupero dei capitoli" });
    }
  });

  app.get("/api/chapters/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const chapter = await storage.getChapter(id);
      if (!chapter) {
        return res.status(404).json({ message: "Capitolo non trovato" });
      }
      res.json(chapter);
    } catch (error) {
      res.status(500).json({ message: "Errore nel recupero del capitolo" });
    }
  });

  // User progress routes
  app.get("/api/users/:userId/progress", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const progress = await storage.getUserProgress(userId);
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "Errore nel recupero dei progressi" });
    }
  });

  // User personalized stats endpoint
  app.get("/api/users/:userId/stats", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Get user basic info
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "Utente non trovato" });
      }

      // Get user's progress, quiz results and achievements
      const progress = await storage.getUserProgress(userId);
      const quizResults = await storage.getUserQuizResults(userId);
      const achievements = await storage.getUserAchievements(userId);

      // Calculate personalized stats
      const completedChapters = progress.filter((p: any) => p.isCompleted).length;
      const avgQuizScore = quizResults.length > 0 
        ? Math.round(quizResults.reduce((sum: number, q: any) => sum + (q.pointsEarned || 0), 0) / quizResults.length)
        : 0;

      const stats = {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          points: user.points,
          level: user.level,
          joinedDate: user.createdAt,
          lastActive: user.lastActiveAt
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
            title: `Capitolo ${p.chapterId} completato`,
            date: p.lastReadAt,
            icon: 'fas fa-book',
            color: 'green'
          })),
          ...quizResults.slice(-3).map((q: any) => ({
            type: 'quiz',
            title: `Quiz completato - ${q.pointsEarned} punti`,
            date: q.completedAt,
            icon: 'fas fa-star',
            color: 'edo-gold'
          }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5)
      };

      res.json(stats);
    } catch (error) {
      console.error("Stats error:", error);
      res.status(500).json({ message: "Errore nel recupero delle statistiche" });
    }
  });

  app.post("/api/users/:userId/progress", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const progressData = { ...req.body, userId };
      const progress = await storage.updateUserProgress(progressData);
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "Errore nell'aggiornamento dei progressi" });
    }
  });

  // Quiz routes
  app.get("/api/chapters/:chapterId/quizzes", async (req, res) => {
    try {
      const chapterId = parseInt(req.params.chapterId);
      const quizzes = await storage.getQuizzesByChapter(chapterId);
      res.json(quizzes);
    } catch (error) {
      res.status(500).json({ message: "Errore nel recupero dei quiz" });
    }
  });

  app.post("/api/quiz-results", async (req, res) => {
    try {
      const resultData = insertUserQuizResultSchema.parse(req.body);
      const result = await storage.saveQuizResult(resultData);
      
      // Award points to user
      if (result.isCorrect) {
        await storage.addPointsToUser(result.userId, result.pointsEarned || 10);
      }
      
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dati non validi", errors: error.errors });
      }
      res.status(500).json({ message: "Errore nel salvataggio del risultato" });
    }
  });

  app.post("/api/chapters/:chapterId/quiz-results", async (req, res) => {
    try {
      const chapterId = parseInt(req.params.chapterId);
      const { answers, score, totalQuestions } = req.body;
      
      // Salva i risultati del quiz completo
      // Per ora utilizzeremo l'utente con ID 1 (hardcoded per demo)
      const userId = 1;
      
      // Award points to user based on score
      if (score > 0) {
        await storage.addPointsToUser(userId, score);
      }
      
      res.json({ 
        message: "Risultati quiz salvati con successo",
        score,
        totalQuestions,
        pointsAwarded: score
      });
    } catch (error) {
      console.error("Errore nel salvare i risultati del quiz:", error);
      res.status(500).json({ message: "Errore nel salvataggio dei risultati" });
    }
  });

  // Achievement routes
  app.get("/api/users/:userId/achievements", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const achievements = await storage.getUserAchievements(userId);
      res.json(achievements);
    } catch (error) {
      res.status(500).json({ message: "Errore nel recupero dei traguardi" });
    }
  });

  // Glossary routes
  app.get("/api/glossary", async (req, res) => {
    try {
      const glossaryTerms = await storage.getAllGlossaryTerms();
      res.json(glossaryTerms);
    } catch (error) {
      console.error("Error fetching glossary:", error);
      res.status(500).json({ message: "Errore nel recupero del glossario" });
    }
  });

  app.get("/api/glossary/:term", async (req, res) => {
    try {
      const term = req.params.term;
      const glossaryTerm = await storage.getGlossaryTerm(term);
      if (!glossaryTerm) {
        return res.status(404).json({ message: "Termine non trovato" });
      }
      res.json(glossaryTerm);
    } catch (error) {
      res.status(500).json({ message: "Errore nel recupero del termine" });
    }
  });


  // Historical Context routes - temporarily disabled until storage is updated
  app.get("/api/chapters/:chapterId/contexts", async (req, res) => {
    try {
      res.json([]); // Return empty array for now
    } catch (error) {
      res.status(500).json({ message: "Errore nel recupero dei contesti storici" });
    }
  });


  // AI Literary Insights Routes
  app.post("/api/insights/analyze", async (req, res) => {
    try {
      const { passage, chapterId } = req.body;
      
      if (!passage || !passage.trim()) {
        return res.status(400).json({ message: "Brano richiesto per l'analisi" });
      }

      try {
        // Try AI analysis first
        const { aiInsights } = await import("./ai-insights");
        const analysis = await aiInsights.analyzePassage(passage);
        res.json(analysis);
      } catch (aiError) {
        // Fallback to high-quality pre-compiled analysis
        console.log("Using fallback analysis due to API limitations");
        const { getMockInsight } = await import("./mock-insights");
        const analysis = getMockInsight(passage);
        res.json(analysis);
      }
    } catch (error) {
      console.error("Error analyzing passage:", error);
      res.status(500).json({ message: "Errore nell'analisi del brano" });
    }
  });

  app.post("/api/insights/questions", async (req, res) => {
    try {
      const { passage, difficulty = 'intermediate' } = req.body;
      
      if (!passage || !passage.trim()) {
        return res.status(400).json({ message: "Brano richiesto per generare domande" });
      }

      const { aiInsights } = await import("./ai-insights");
      const questions = await aiInsights.generateContextualQuestions(passage, difficulty);
      
      res.json(questions);
    } catch (error) {
      console.error("Error generating questions:", error);
      res.status(500).json({ message: "Errore nella generazione delle domande" });
    }
  });

  app.post("/api/insights/ask", async (req, res) => {
    try {
      const { concept, context } = req.body;
      
      if (!concept || !concept.trim()) {
        return res.status(400).json({ message: "Domanda richiesta" });
      }

      const { aiInsights } = await import("./ai-insights");
      const explanation = await aiInsights.explainConcept(concept, context);
      
      res.json({ explanation });
    } catch (error) {
      console.error("Error explaining concept:", error);
      res.status(500).json({ message: "Errore nella spiegazione del concetto" });
    }
  });

  // Gamification API endpoints
  app.get("/api/users/:userId/badges", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const badges = await gamificationService.getUserBadges(userId);
      res.json(badges);
    } catch (error) {
      res.status(500).json({ message: "Errore nel recupero dei badge" });
    }
  });

  app.get("/api/users/:userId/stats", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const stats = await gamificationService.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Errore nel recupero delle statistiche" });
    }
  });

  app.get("/api/users/:userId/streaks", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const readingStreak = await gamificationService.getUserStreak(userId, 'reading');
      const quizStreak = await gamificationService.getUserStreak(userId, 'quiz');
      
      res.json({
        reading: readingStreak,
        quiz: quizStreak
      });
    } catch (error) {
      res.status(500).json({ message: "Errore nel recupero delle streak" });
    }
  });

  app.get("/api/leaderboard", async (req, res) => {
    try {
      const timeframe = req.query.timeframe as 'weekly' | 'monthly' | 'total' || 'total';
      const limit = parseInt(req.query.limit as string) || 10;
      
      const leaderboard = await gamificationService.getLeaderboard(timeframe, limit);
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ message: "Errore nel recupero della classifica" });
    }
  });

  app.get("/api/badges", async (req, res) => {
    try {
      const badges = await gamificationService.getAllBadges();
      res.json(badges);
    } catch (error) {
      res.status(500).json({ message: "Errore nel recupero dei badge" });
    }
  });

  // Update quiz results endpoint to include gamification
  app.post("/api/chapters/:chapterId/quiz-results-gamified", async (req, res) => {
    try {
      const chapterId = parseInt(req.params.chapterId);
      const { answers, score, totalQuestions, userId } = req.body;
      
      // Save quiz results
      const maxScore = totalQuestions * 10; // Assuming 10 points per question
      
      // Trigger gamification events
      const newBadges = await gamificationService.onQuizCompleted(userId, score, maxScore);
      await gamificationService.addExperiencePoints(userId, score);
      
      res.json({ 
        message: "Risultati quiz salvati con successo",
        score,
        totalQuestions,
        pointsAwarded: score,
        newBadges: newBadges.length > 0 ? newBadges : null,
        experienceGained: score
      });
    } catch (error) {
      console.error("Errore nel salvare i risultati del quiz:", error);
      res.status(500).json({ message: "Errore nel salvataggio dei risultati" });
    }
  });

  // Update chapter completion endpoint to include gamification
  app.post("/api/users/:userId/chapters/:chapterId/complete", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const chapterId = parseInt(req.params.chapterId);
      
      // Mark chapter as completed in user progress
      await storage.updateUserProgress({
        userId,
        chapterId,
        isCompleted: true
      });

      // Trigger gamification events
      const newBadges = await gamificationService.onChapterCompleted(userId);
      await gamificationService.addExperiencePoints(userId, 100); // 100 XP for completing a chapter
      
      res.json({
        message: "Capitolo completato!",
        newBadges: newBadges.length > 0 ? newBadges : null,
        experienceGained: 100
      });
    } catch (error) {
      console.error("Errore nel completare il capitolo:", error);
      res.status(500).json({ message: "Errore nel completamento del capitolo" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
