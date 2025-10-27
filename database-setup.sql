-- Script per creare tutte le tabelle su Neon
-- Esegui questo script nella console SQL di Neon

-- 1. Tabella utenti
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  study_reason TEXT,
  points INTEGER DEFAULT 0,
  level VARCHAR(50) DEFAULT 'Novizio',
  role VARCHAR(20) DEFAULT 'student',
  created_at TIMESTAMP DEFAULT NOW(),
  last_active_at TIMESTAMP DEFAULT NOW()
);

-- 2. Tabella admin
CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP
);

-- 3. Tabella capitoli
CREATE TABLE IF NOT EXISTS chapters (
  id SERIAL PRIMARY KEY,
  number INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Tabella progressi utente
CREATE TABLE IF NOT EXISTS user_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  chapter_id INTEGER REFERENCES chapters(id) ON DELETE CASCADE,
  is_completed BOOLEAN DEFAULT FALSE,
  reading_progress INTEGER DEFAULT 0,
  time_spent INTEGER DEFAULT 0,
  last_read_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, chapter_id)
);

-- 5. Tabella quiz results
CREATE TABLE IF NOT EXISTS quiz_results (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  chapter_id INTEGER REFERENCES chapters(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  answers JSONB,
  completed_at TIMESTAMP DEFAULT NOW()
);

-- 6. Tabella domande quiz
CREATE TABLE IF NOT EXISTS quiz_questions (
  id SERIAL PRIMARY KEY,
  chapter_id INTEGER REFERENCES chapters(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer INTEGER NOT NULL,
  explanation TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 7. Tabella glossario
CREATE TABLE IF NOT EXISTS glossary_terms (
  id SERIAL PRIMARY KEY,
  term VARCHAR(255) NOT NULL,
  definition TEXT NOT NULL,
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 8. Tabella contesti storici
CREATE TABLE IF NOT EXISTS historical_contexts (
  id SERIAL PRIMARY KEY,
  chapter_id INTEGER REFERENCES chapters(id) ON DELETE CASCADE,
  page_number INTEGER,
  context_type VARCHAR(50) NOT NULL, -- 'Storia', 'Geografia', 'Cultura', 'Società', 'Diritto'
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 9. Sistema gamification - Badges
CREATE TABLE IF NOT EXISTS badges (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  icon VARCHAR(100) NOT NULL,
  color VARCHAR(50) NOT NULL,
  category VARCHAR(100) NOT NULL,
  requirement TEXT NOT NULL,
  points INTEGER DEFAULT 0,
  rarity VARCHAR(50) DEFAULT 'common',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 10. Badge utenti
CREATE TABLE IF NOT EXISTS user_badges (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  badge_id INTEGER REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP DEFAULT NOW(),
  progress INTEGER DEFAULT 100,
  UNIQUE(user_id, badge_id)
);

-- 11. Statistiche utenti
CREATE TABLE IF NOT EXISTS user_stats (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  total_points INTEGER DEFAULT 0,
  weekly_points INTEGER DEFAULT 0,
  monthly_points INTEGER DEFAULT 0,
  chapters_completed INTEGER DEFAULT 0,
  quizzes_completed INTEGER DEFAULT 0,
  perfect_quizzes INTEGER DEFAULT 0,
  average_quiz_score DECIMAL(5,2) DEFAULT 0,
  reading_time_minutes INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  experience INTEGER DEFAULT 0,
  rank INTEGER DEFAULT 0,
  last_active TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 12. Streak tracking
CREATE TABLE IF NOT EXISTS user_streaks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'reading', 'quiz'
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, type)
);

-- Inserisci admin di default (password: aranciagatto1)
INSERT INTO admin_users (username, password) 
VALUES ('simonenieddu', 'aranciagatto1') 
ON CONFLICT (username) DO NOTHING;

-- Inserisci badges predefiniti
INSERT INTO badges (name, description, icon, color, category, requirement, points, rarity) VALUES
('Primo Lettore', 'Hai completato il tuo primo capitolo!', 'book-open', 'blue', 'Lettura', 'Completa 1 capitolo', 10, 'common'),
('Studioso Dedito', 'Hai completato 5 capitoli.', 'books', 'green', 'Lettura', 'Completa 5 capitoli', 50, 'rare'),
('Esperto Manzoniano', 'Hai completato 15 capitoli.', 'graduation-cap', 'purple', 'Lettura', 'Completa 15 capitoli', 150, 'epic'),
('Maestro de I Promessi Sposi', 'Hai completato tutti i 38 capitoli!', 'crown', 'gold', 'Lettura', 'Completa tutti i capitoli', 500, 'legendary'),
('Genio del Quiz', 'Hai ottenuto il 100% in un quiz.', 'brain', 'yellow', 'Quiz', 'Punteggio perfetto in un quiz', 25, 'rare'),
('Quiz Master', 'Hai completato 10 quiz con successo.', 'lightbulb', 'orange', 'Quiz', 'Completa 10 quiz', 100, 'epic'),
('Perfezionista', 'Hai ottenuto il 100% in 5 quiz diversi.', 'star', 'gold', 'Quiz', '5 quiz perfetti', 200, 'legendary'),
('Lettore Costante', 'Hai letto per 3 giorni consecutivi.', 'fire', 'red', 'Streak', '3 giorni di lettura consecutivi', 30, 'rare'),
('Studente Disciplinato', 'Hai letto per 7 giorni consecutivi.', 'flame', 'orange', 'Streak', '7 giorni di lettura consecutivi', 75, 'epic'),
('Collezionista di Punti', 'Hai guadagnato 100 punti totali.', 'medal', 'bronze', 'Punti', 'Raggiungi 100 punti', 0, 'common'),
('Esploratore', 'Hai iniziato a leggere 10 capitoli diversi.', 'compass', 'teal', 'Esplorazione', 'Inizia 10 capitoli', 50, 'rare'),
('Velocista', 'Hai completato un capitolo in meno di 10 minuti.', 'zap', 'blue', 'Velocità', 'Completa capitolo in <10 min', 20, 'rare'),
('Early Bird', 'Ti sei registrato nelle prime settimane!', 'clock', 'pink', 'Speciale', 'Registrazione anticipata', 50, 'epic')
ON CONFLICT DO NOTHING;

-- Inserisci alcuni capitoli di esempio
INSERT INTO chapters (number, title, content, summary) VALUES
(0, 'Introduzione', 'Quel ramo del lago di Como, che volge a mezzogiorno, tra due catene non interrotte di monti...', 'Introduzione al romanzo e descrizione del paesaggio lombardo.'),
(1, 'Don Abbondio e i bravi', 'Il sole non era ancora tramontato, quando don Abbondio, voltata la cantonata...', 'Don Abbondio incontra i bravi di don Rodrigo e viene minacciato.'),
(2, 'Renzo e Lucia', 'Intanto Renzo era arrivato al paese...', 'Renzo scopre che don Abbondio non può celebrare il matrimonio.')
ON CONFLICT DO NOTHING;