# Guida al Deployment su Vercel

## Pre-requisiti
- Account GitHub
- Account Vercel
- Database PostgreSQL su Neon

## 1. Preparazione Repository GitHub

```bash
# Inizializza repository Git
git init
git add .
git commit -m "Initial commit: PromessiSposi educational platform"

# Connetti a GitHub
git remote add origin https://github.com/tuoUsername/promessisposi-io.git
git push -u origin main
```

## 2. Setup Database Neon

1. Vai su [Neon.tech](https://neon.tech)
2. Crea un nuovo progetto
3. Copia la stringa di connessione DATABASE_URL
4. Esegui le migrazioni del database:

```bash
npm run db:push
```

## 3. Deploy su Vercel

### Metodo 1: Dashboard Vercel
1. Vai su [vercel.com](https://vercel.com)
2. Clicca "New Project"
3. Importa il repository GitHub
4. Configura le variabili d'ambiente:
   - `DATABASE_URL`: la stringa di connessione Neon
   - `SESSION_SECRET`: una stringa casuale sicura
   - `ANTHROPIC_API_KEY`: la tua chiave API Anthropic

### Metodo 2: CLI Vercel
```bash
# Installa Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Aggiungi variabili d'ambiente
vercel env add DATABASE_URL
vercel env add SESSION_SECRET
vercel env add ANTHROPIC_API_KEY
```

## 4. Configurazione Post-Deploy

1. Verifica che l'applicazione sia online
2. Testa registrazione e login utenti
3. Controlla connettività database
4. Verifica funzionalità AI insights

## Struttura Progetto per Vercel

```
/
├── api/
│   └── index.ts          # Serverless functions
├── client/               # Frontend React
├── shared/               # Schema e tipi condivisi
├── vercel.json           # Configurazione Vercel
└── package.json          # Dipendenze
```

## Note Tecniche

- **Node.js**: Versione 20.19.3 (compatibile Vercel, 20.x richiesto)
- **Database**: PostgreSQL con Neon serverless
- **Autenticazione**: Crypto nativo (no bcrypt per serverless)
- **Build**: Frontend statico + API serverless
- **CORS**: Configurato per domini Vercel

## Variabili d'Ambiente

### DATABASE_URL
Formato: `postgresql://username:password@hostname:port/database?sslmode=require`

### SESSION_SECRET
Una stringa casuale per firmare le sessioni. Genera con:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### ANTHROPIC_API_KEY
Chiave API per insights AI letterari. Ottieni da:
https://console.anthropic.com/

## Troubleshooting

### Errore Database
- Verifica che DATABASE_URL sia corretto
- Controlla che il database Neon sia attivo
- Esegui le migrazioni: `npm run db:push`

### Errore Build
- Controlla i log di Vercel  
- Verifica compatibilità Node.js 20.x (richiesto da Vercel)
- Controlla dipendenze in package.json

### Errore CORS
- Verifica configurazione in api/index.ts
- Controlla domini autorizzati

### Performance
- Usa connection pooling Neon
- Ottimizza query database
- Implementa caching per dati statici