const fs = require('fs');
const path = require('path');
const { exec, all, run, get } = require('./database');
const bcrypt = require('bcryptjs');

async function ensureColumn(table, column, definition) {
  const columns = await all(`PRAGMA table_info(${table})`);
  if (!columns.some((c) => c.name === column)) {
    await exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

async function ensureSchema() {
  const schemaPath = path.resolve(__dirname, '../database/schema.sql');
  await exec(fs.readFileSync(schemaPath, 'utf8'));

  // Backward-compatible migrations for databases created by earlier versions.
  await ensureColumn('administrators', 'must_change_password', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumn('assessments', 'academic_year', "TEXT NOT NULL DEFAULT 'ALL'");
  await ensureColumn('examination_attempts', 'candidate_class', "TEXT NOT NULL DEFAULT ''");
  await ensureColumn('examination_attempts', 'candidate_division', "TEXT NOT NULL DEFAULT ''");
  await exec("CREATE TABLE IF NOT EXISTS teachers (id INTEGER PRIMARY KEY, full_name TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE, password_hash TEXT NOT NULL, must_change_password INTEGER NOT NULL DEFAULT 1 CHECK(must_change_password IN(0,1)), active INTEGER NOT NULL DEFAULT 1 CHECK(active IN(0,1)), created_at TEXT NOT NULL DEFAULT (datetime('now')), password_changed_at TEXT)");

  await exec(`CREATE TABLE IF NOT EXISTS teacher_subjects (id INTEGER PRIMARY KEY, teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE, subject_name TEXT NOT NULL, academic_year TEXT NOT NULL DEFAULT 'FY', divisions TEXT NOT NULL DEFAULT '', UNIQUE(teacher_id, subject_name, academic_year));
  CREATE TABLE IF NOT EXISTS teacher_assessments (teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE, assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE, PRIMARY KEY(teacher_id, assessment_id));`);
  await ensureColumn('assessments', 'owner_teacher_id', 'INTEGER REFERENCES teachers(id)');

  await exec(`CREATE TABLE IF NOT EXISTS student_accounts (
    id INTEGER PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    full_name TEXT NOT NULL,
    academic_year TEXT NOT NULL DEFAULT '',
    division TEXT NOT NULL DEFAULT '',
    roll_number TEXT NOT NULL DEFAULT '',
    admission_year TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL,
    must_change_password INTEGER NOT NULL DEFAULT 1 CHECK(must_change_password IN(0,1)),
    active INTEGER NOT NULL DEFAULT 1 CHECK(active IN(0,1)),
    profile_photo_data TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    password_changed_at TEXT
  )`);
  // Keep the current known assessments assigned to FY.
  await run("UPDATE assessments SET academic_year='FY' WHERE lower(trim(title)) IN ('introduction to web design','office management tool')");
  // Teacher division assignments were not verified; clear guessed A/B/C/D assignments.
  await run("UPDATE teacher_subjects SET divisions='' WHERE divisions IS NOT NULL AND trim(divisions)<>''");

  // Import the supplied teacher directory into SQLite on startup. Existing teacher
  // passwords are deliberately preserved; only newly-created accounts get the
  // initial password and are forced to change it after first login.
  const directory = [
    ['Archana M. Jade','archana.jade@rcpimrd.ac.in',['English: Oral Communication']],
    ['Diksha Vikas Patil','dikshapatil41103@gmail.com',['Web Design-I','Practical on Web-I']],
    ['Dr. Laxmikant M. Sharma','sharmalaxmikant07@gmail.com',['Basics of Stock Markets']],
    ['Kirtika N. Behere','kirtikabehere20@gmail.com',['Practical on OMT']],
    ['Lucky Rajendra Kalal','luckykalal9@gmail.com',['Environmental Studies','Essential of Computers and Programming']],
    ['Milind A. Patil','patilmilind732@gmail.com',['Fundamentals of Banking']],
    ['Priyanka S. Saindane','piyurap1418@gmail.com',['IKS - Ancient Indian Knowledge Tradition']],
    ['Rahul D. Chaudhari','rdc.imrd@gmail.com',['Programming using C++']],
    ['Vaishnavi Nandalal Kuwar','vaishnavikuwar215@gmail.com',['Office Management Tools','Practical based on Programming using C++']],
    ['Dr. Tushar R. Patel','tushar.patel@rcpimrd.ac.in',[]]
  ];
  const initialTeacherPassword = process.env.TEACHER_INITIAL_PASSWORD || 'Login@123';
  const initialHash = await bcrypt.hash(initialTeacherPassword, 12);
  for (const [name, email, subjects] of directory) {
    let teacher = await get('SELECT id FROM teachers WHERE lower(email)=lower(?)', [email]);
    if (!teacher) {
      const inserted = await run('INSERT INTO teachers(full_name,email,password_hash,must_change_password,active) VALUES(?,?,?,1,1)', [name,email,initialHash]);
      teacher = { id: inserted.lastID };
    } else {
      await run('UPDATE teachers SET full_name=?,active=1 WHERE id=?', [name,teacher.id]);
    }
    for (const subject of subjects) {
      await run("INSERT OR IGNORE INTO teacher_subjects(teacher_id,subject_name,academic_year,divisions) VALUES(?,?, 'FY','')", [teacher.id,subject]);
    }
  }

  // Link existing Web Design and OMT assessments to the matching subject teachers.
  const assessmentLinks = [
    ['introduction to web design','dikshapatil41103@gmail.com'],
    ['office management tool','vaishnavikuwar215@gmail.com']
  ];
  for (const [title,email] of assessmentLinks) {
    const teacher = await get('SELECT id FROM teachers WHERE lower(email)=lower(?)',[email]);
    const assessment = await get('SELECT id FROM assessments WHERE lower(trim(title))=? ORDER BY id LIMIT 1',[title]);
    if (teacher && assessment) {
      await run('INSERT OR IGNORE INTO teacher_assessments(teacher_id,assessment_id) VALUES(?,?)',[teacher.id,assessment.id]);
      await run('UPDATE assessments SET owner_teacher_id=? WHERE id=? AND owner_teacher_id IS NULL',[teacher.id,assessment.id]);
    }
  }
}

module.exports = { ensureSchema };
