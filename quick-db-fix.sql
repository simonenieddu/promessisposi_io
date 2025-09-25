-- Script minimo per far funzionare registrazione/login
-- Copia TUTTO questo codice nella console SQL di Neon

-- Tabella utenti (essenziale)
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

-- Tabella capitoli (per dashboard)
CREATE TABLE IF NOT EXISTS chapters (
  id SERIAL PRIMARY KEY,
  number INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL DEFAULT 'Contenuto in caricamento...',
  summary TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Inserisci capitoli base
INSERT INTO chapters (number, title, summary) VALUES
(0, 'Introduzione', 'Introduzione al romanzo'),
(1, 'Don Abbondio e i bravi', 'Don Abbondio incontra i bravi'),
(2, 'Renzo e Lucia', 'Presentazione dei protagonisti')
ON CONFLICT DO NOTHING;

-- Verifica che funzioni
SELECT 'Database configurato correttamente!' as status;