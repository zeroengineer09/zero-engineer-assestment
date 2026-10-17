
require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const helmet = require('helmet');
const { exec } = require('./database');

const app = express();
const isProd = process.env.NODE_ENV === 'production';

// Render proxy configuration
app.set('trust proxy', 1);

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  console.warn('WARNING: Set a random SESSION_SECRET (32+ characters) in .env before deployment.');
}

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: isProd ? [] : null
    }
  }
}));

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '20kb' }));

app.use(session({
  name: 'cdt.sid',
  secret: process.env.SESSION_SECRET || 'development-only-change-this-secret-before-use',
  resave: false,
  saveUninitialized: false,
  store: new SQLiteStore({
    db: 'sessions.sqlite',
    dir: path.resolve('./database')
  }),
  cookie: {
    httpOnly: true,
    sameSite: 'strict',
    secure: isProd,
    maxAge: 8 * 60 * 60 * 1000
  }
}));

app.use((req, res, next) => {
  if (
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) &&
    req.path.startsWith('/api/admin') &&
    !req.session.adminId
  ) {
    return res.status(401).json({ error: 'Administrator login required.' });
  }
  next();
});

app.use('/api/auth', require('./auth'));
app.use('/api/teachers', require('./teacherAuth'));
app.use('/api/exam', require('./examRoutes'));
app.use('/api/admin', require('./adminRoutes'));

app.use(express.static(path.join(__dirname, '../public')));

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'Certified Developer Test' });
});

app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found.' });
  }
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'An unexpected server error occurred.' });
});

const port = Number(process.env.PORT) || 3000;

if (require.main === module) {
  exec('PRAGMA foreign_keys=ON')
    .then(async () => {
      // Backward-compatible migration for existing SQLite databases.
      const { all } = require('./database');
      const cols = await all('PRAGMA table_info(examination_attempts)');
      if (!cols.some(c => c.name === 'candidate_class')) await exec("ALTER TABLE examination_attempts ADD COLUMN candidate_class TEXT NOT NULL DEFAULT ''");
      if (!cols.some(c => c.name === 'candidate_division')) await exec("ALTER TABLE examination_attempts ADD COLUMN candidate_division TEXT NOT NULL DEFAULT ''");
      const adminCols = await all('PRAGMA table_info(administrators)');
      if (!adminCols.some(c => c.name === 'must_change_password')) await exec('ALTER TABLE administrators ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0');
      await exec("CREATE TABLE IF NOT EXISTS teachers (id INTEGER PRIMARY KEY, full_name TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE, password_hash TEXT NOT NULL, must_change_password INTEGER NOT NULL DEFAULT 1 CHECK(must_change_password IN(0,1)), active INTEGER NOT NULL DEFAULT 1 CHECK(active IN(0,1)), created_at TEXT NOT NULL DEFAULT (datetime('now')), password_changed_at TEXT)");
      const assessmentCols = await all('PRAGMA table_info(assessments)');
      if (!assessmentCols.some(c => c.name === 'academic_year')) await exec("ALTER TABLE assessments ADD COLUMN academic_year TEXT NOT NULL DEFAULT 'FY'");
      // Keep the two currently available assessments assigned to FY across existing deployments.
      await exec("UPDATE assessments SET academic_year='FY' WHERE lower(trim(title)) IN ('introduction to web design','office management tool')");
      app.listen(port, () => {
        console.log(`Certified Developer Test running at http://localhost:${port}`);
      });
    })
    .catch(err => {
      console.error('Database initialization error', err);
      process.exit(1);
    });
}

module.exports = app;
