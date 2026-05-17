import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, 'data', 'court.db')

let _db = null

export function getDb() {
  if (!_db) {
    _db = new Database(DB_PATH)
    _db.pragma('journal_mode = WAL')
    _db.pragma('foreign_keys = ON')
    initSchema(_db)
  }
  return _db
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE,
      role TEXT NOT NULL DEFAULT 'clerk',
      password_hash TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      last_login TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS judges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      rank TEXT DEFAULT 'High Court Judge',
      gender TEXT DEFAULT 'Male',
      division TEXT DEFAULT 'Abuja',
      specializations TEXT NOT NULL DEFAULT '[]',
      available_days TEXT NOT NULL DEFAULT '[]',
      max_hearings_per_day INTEGER NOT NULL DEFAULT 4,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS courtrooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      capacity INTEGER NOT NULL,
      location TEXT DEFAULT '',
      equipment TEXT NOT NULL DEFAULT '[]',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_number TEXT NOT NULL,
      title TEXT NOT NULL,
      case_type TEXT NOT NULL,
      num_parties INTEGER NOT NULL DEFAULT 2,
      priority TEXT NOT NULL DEFAULT 'normal',
      assigned_judge_id INTEGER,
      assigned_judge_name TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (date('now'))
    );

    CREATE TABLE IF NOT EXISTS hearings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_id INTEGER NOT NULL,
      case_number TEXT NOT NULL,
      title TEXT NOT NULL,
      case_type TEXT NOT NULL,
      assigned_judge_id INTEGER,
      judge_name TEXT DEFAULT '',
      courtroom_id INTEGER,
      courtroom_name TEXT DEFAULT '',
      scheduled_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      duration_prediction INTEGER NOT NULL DEFAULT 30,
      confidence REAL NOT NULL DEFAULT 1.0,
      status TEXT NOT NULL DEFAULT 'scheduled',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (case_id) REFERENCES cases(id)
    );

    CREATE TABLE IF NOT EXISTS schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_start_date TEXT NOT NULL,
      generated_at TEXT NOT NULL DEFAULT (datetime('now')),
      scheduled_count INTEGER NOT NULL DEFAULT 0,
      unscheduled_count INTEGER NOT NULL DEFAULT 0,
      conflict_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft',
      options TEXT DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS holidays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      user TEXT DEFAULT '',
      action TEXT NOT NULL,
      target TEXT DEFAULT '',
      details TEXT DEFAULT '',
      time TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  // Seed data if empty
  if (db.prepare('SELECT COUNT(*) AS c FROM users').get().c === 0) seed(db)
}

function seed(db) {
  const now = new Date().toISOString()
  const seedUser = (username, fullName, role, password) => {
    const hash = '$2a$10$' + Buffer.from(password + '_salt').toString('base64').slice(0, 53)
    return { username, fullName, role, hash }
  }

  const users = [
    seedUser('ahmedadmin', 'Ahmed Admin', 'admin', 'admin123'),
    seedUser('judgeadeyemi', 'Hon. Justice Adeyemi', 'judge', 'judge123'),
    seedUser('clerkokon', 'Clerk Okon', 'clerk', 'clerk123'),
  ]

  const insertUser = db.prepare(
    `INSERT INTO users (username, full_name, role, password_hash, last_login) VALUES (?,?,?,?,?)`
  )
  const insertJudge = db.prepare(
    `INSERT INTO judges (name, email, phone, rank, gender, division, specializations, available_days, max_hearings_per_day, is_active)
     VALUES (?,?,?,?,?,?,?,?,?,?)`
  )
  const insertCourtroom = db.prepare(
    `INSERT INTO courtrooms (name, capacity, location, equipment, is_active) VALUES (?,?,?,?,?)`
  )
  const insertCase = db.prepare(
    `INSERT INTO cases (case_number, title, case_type, num_parties, priority, assigned_judge_id, assigned_judge_name, notes, status, created_at) 
     VALUES (?,?,?,?,?,?,?,?,?,?)`
  )
  const insertHearing = db.prepare(
    `INSERT INTO hearings (case_id, case_number, title, case_type, assigned_judge_id, judge_name, courtroom_id, courtroom_name, scheduled_date, start_time, end_time, duration_prediction, confidence, status)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  )
  const insertSchedule = db.prepare(
    `INSERT INTO schedules (week_start_date, generated_at, scheduled_count, unscheduled_count, conflict_count, status)
     VALUES (?,?,?,?,?,?)`
  )
  const insertHoliday = db.prepare(
    `INSERT INTO holidays (name, date, is_active) VALUES (?,?,?)`
  )
  const insertAudit = db.prepare(
    `INSERT INTO audit_logs (user, action, target, time) VALUES (?,?,?,?)`
  )

  db.transaction(() => {
    users.forEach(u => insertUser.run(u.username, u.fullName, u.role, u.hash, now))

    insertJudge.run('Hon. Justice Adeyemi', 'adeyemi@court.gov.ng', '+234 800 111 0001', 'High Court Judge', 'Male', 'Abuja', JSON.stringify(['criminal','civil']), JSON.stringify(['monday','tuesday','wednesday','thursday','friday']), 5, 1)
    insertJudge.run('Hon. Justice Okon',     'okon@court.gov.ng',     '+234 800 111 0002', 'High Court Judge', 'Male', 'Lagos',   JSON.stringify(['family','commercial']),            JSON.stringify(['monday','wednesday','friday']),            4, 1)
    insertJudge.run('Hon. Justice Bello',    'bello@court.gov.ng',    '+234 800 111 0003', 'High Court Judge', 'Male', 'Abuja',   JSON.stringify(['land','constitutional']),           JSON.stringify(['tuesday','thursday']),                   3, 1)
    insertJudge.run('Hon. Justice Nwosu',    'nwosu@court.gov.ng',    '+234 800 111 0004', 'High Court Judge', 'Female','Kano',   JSON.stringify(['civil','family','land']),           JSON.stringify(['monday','tuesday','wednesday','thursday']),6, 1)
    insertJudge.run('Magistrate Eze',        'eze@court.gov.ng',      '+234 800 111 0005', 'Magistrate',       'Male', 'Enugu',   JSON.stringify(['criminal']),                        JSON.stringify(['monday','tuesday','wednesday','friday']),4, 1)

    insertCourtroom.run('Court 1',   60, 'Wing A, Ground Floor',  JSON.stringify(['Video Conferencing','Digital Recording','Wheelchair Accessible']), 1)
    insertCourtroom.run('Court 2',   50, 'Wing A, First Floor',   JSON.stringify(['Video Conferencing','Climate Control']),                          1)
    insertCourtroom.run('Court 3',   40, 'Wing B, Ground Floor',  JSON.stringify(['Digital Recording','Projector']),                                 1)
    insertCourtroom.run('Court 3A',  30, 'Wing B, First Floor',   JSON.stringify(['Wheelchair Accessible']),                                         1)
    insertCourtroom.run('Court 4',   55, 'Wing C, Ground Floor',  JSON.stringify(['Video Conferencing','Digital Recording','Climate Control','Wheelchair Accessible','Projector']), 1)
    insertCourtroom.run('Court 5',   35, 'Wing C, First Floor',   JSON.stringify(['Digital Recording']),                                              0)

    insertCase.run('FHC/ABJ/CR/001/2024', 'FRN v. Adeyemi',      'criminal',      3, 'urgent',   1, 'Hon. Justice Adeyemi', '', 'pending',   '2024-01-15')
    insertCase.run('FHC/ABJ/CV/002/2024', 'ABC Ltd v. XYZ Corp', 'civil',         2, 'normal',   1, 'Hon. Justice Adeyemi', '', 'pending',   '2024-01-16')
    insertCase.run('FHC/LAG/FM/003/2024', 'Mary v. John',        'family',        2, 'urgent',   2, 'Hon. Justice Okon',     '', 'scheduled', '2024-01-17')
    insertCase.run('FHC/ABJ/CM/004/2024', 'Dangote v. Zenith',   'commercial',    5, 'normal',   3, 'Hon. Justice Bello',    '', 'pending',   '2024-01-18')
    insertCase.run('FHC/ABJ/LD/005/2024', 'Lagos State v. Okafor','land',          4, 'normal',   2, 'Hon. Justice Okon',     '', 'adjourned', '2024-01-19')
    insertCase.run('FHC/ABJ/CC/006/2024', 'Fawehinmi v. FRN',     'constitutional',3, 'urgent',   3, 'Hon. Justice Bello',    '', 'pending',   '2024-01-20')
    insertCase.run('FHC/KAN/CR/007/2024', 'State v. Usman',       'criminal',      2, 'normal',   5, 'Magistrate Eze',       '', 'pending',   '2024-01-21')
    insertCase.run('FHC/LAG/CV/008/2024', 'Shell v. SPDC',        'civil',         8, 'normal',   4, 'Hon. Justice Nwosu',    '', 'pending',   '2024-01-22')
    insertCase.run('FHC/ABJ/FM/009/2024', 'Amina v. Ibrahim',     'family',        2, 'urgent',   2, 'Hon. Justice Okon',     '', 'pending',   '2024-01-23')
    insertCase.run('FHC/ENU/CR/010/2024', 'EFCC v. Oyelaran',    'criminal',      4, 'low',      5, 'Magistrate Eze',       '', 'pending',   '2024-01-24')
    insertCase.run('FHC/ABJ/CR/011/2024', 'Ojukwu v. State',      'criminal',      3, 'urgent',   1, 'Hon. Justice Adeyemi',  '', 'pending',   '2024-01-25')
    insertCase.run('FHC/ABJ/CV/012/2024', 'MTN v. NCC',           'commercial',    2, 'low',      3, 'Hon. Justice Bello',    '', 'pending',   '2024-01-26')

    const insertScheduleRow = (week, gen, sc, uc, cc, status) => insertSchedule.run(week, gen, sc, uc, cc, status)

    insertScheduleRow('2024-01-22', '2024-01-20T10:30:00', 8, 0, 0, 'published')
    insertScheduleRow('2024-01-29', '2024-01-27T09:15:00', 6, 2, 1, 'published')
    insertScheduleRow('2024-02-05', '2024-02-03T14:00:00', 9, 1, 0, 'draft')
    insertScheduleRow('2024-02-12', '2024-02-10T11:45:00', 7, 3, 2, 'draft')

    insertHearing.run(1, 'FHC/ABJ/CR/001/2024','FRN v. Adeyemi',     'criminal',       1,'Hon. Justice Adeyemi',1,'Court 1','2024-01-22','09:00','10:30', 90, 0.85, 'scheduled')
    insertHearing.run(2, 'FHC/ABJ/CV/002/2024','ABC Ltd v. XYZ Corp','civil',          1,'Hon. Justice Adeyemi',2,'Court 2','2024-01-22','11:00','12:30', 90, 0.78, 'scheduled')
    insertHearing.run(3, 'FHC/LAG/FM/003/2024','Mary v. John',        'family',         2,'Hon. Justice Okon',    3,'Court 3','2024-01-23','10:00','11:30', 90, 0.91, 'scheduled')
    insertHearing.run(6, 'FHC/ABJ/CC/006/2024','Fawehinmi v. FRN',    'constitutional', 3,'Hon. Justice Bello',   4,'Court 3A','2024-01-24','09:00','11:00',120, 0.72, 'scheduled')
    insertHearing.run(5, 'FHC/ABJ/LD/005/2024','Lagos State v. Okafor','land',          2,'Hon. Justice Okon',    1,'Court 1','2024-01-24','14:00','15:30', 90, 0.65, 'scheduled')

    insertHoliday.run('New Year Holiday',        '2024-01-01', 1)
    insertHoliday.run('Nigeria Republic Day',    '2024-01-15', 1)
    insertHoliday.run('Eid al-Fitr',             '2024-04-10', 1)
    insertHoliday.run('Eid al-Adha',             '2024-06-17', 1)
    insertHoliday.run('Independence Day',        '2024-10-01', 1)
    insertHoliday.run('Christmas Day',           '2024-12-25', 1)

    insertAudit.run('ahmedadmin', 'LOGIN',         'auth',   '2024-01-20T10:30:00')
    insertAudit.run('ahmedadmin', 'CREATE_CASE',   'cases',  '2024-01-20T10:32:00')
    insertAudit.run('judgeadeyemi','VIEW_SCHEDULE','schedules','2024-01-20T11:00:00')
    insertAudit.run('ahmedadmin', 'GENERATE_SCHEDULE','schedules','2024-01-20T14:00:00')
    insertAudit.run('ahmedadmin', 'EDIT_JUDGE',    'judges', '2024-01-21T09:15:00')
    insertAudit.run('judgeadeyemi','UPDATE_HEARING','hearings','2024-01-22T09:05:00')
  })
}

export default getDb
