const path = require('path');
const fs = require('fs');

let db = null;

async function getDb() {
  if (db) return db;
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();
  const dbPath = path.join(__dirname, 'data', 'nid.db');
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(dbPath)) {
    const buf = fs.readFileSync(dbPath);
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
  }
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    isAdmin INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    location TEXT NOT NULL,
    description TEXT DEFAULT '',
    endDate TEXT DEFAULT '',
    startTime TEXT DEFAULT '',
    endTime TEXT DEFAULT '',
    deleted INTEGER DEFAULT 0,
    trashedAt TEXT DEFAULT ''
  )`);
  try { db.run('ALTER TABLE events ADD COLUMN endDate TEXT DEFAULT ""'); } catch(e) {}
  try { db.run('ALTER TABLE events ADD COLUMN startTime TEXT DEFAULT ""'); } catch(e) {}
  try { db.run('ALTER TABLE events ADD COLUMN endTime TEXT DEFAULT ""'); } catch(e) {}
  try { db.run('ALTER TABLE events ADD COLUMN deleted INTEGER DEFAULT 0'); } catch(e) {}
  try { db.run('ALTER TABLE events ADD COLUMN trashedAt TEXT DEFAULT ""'); } catch(e) {}
  db.run(`CREATE TABLE IF NOT EXISTS subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    date TEXT NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS bans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    identifier TEXT NOT NULL,
    date TEXT NOT NULL,
    reason TEXT DEFAULT ''
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS reset_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expires TEXT NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS email_change_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    newEmail TEXT NOT NULL,
    code TEXT NOT NULL,
    expires TEXT NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS password_change_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    code TEXT NOT NULL,
    expires TEXT NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS blog_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    date TEXT NOT NULL,
    author TEXT DEFAULT ''
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS contact_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    date TEXT NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS site_content (
    key TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL
  )`);
  try { db.run("INSERT OR IGNORE INTO site_content (key, title, content) VALUES ('about', 'Despre Noi', 'Sub îndrumarea lui Alex Czirai, Note In Demisol este un grup de chitare dedicat pasionaților de muzică. Oferim lecții, organizăm evenimente și construim o comunitate în jurul artei chitarei.')"); } catch(e) {}
  try { db.run("INSERT OR IGNORE INTO site_content (key, title, content) VALUES ('hero_subtitle', 'Sunetul care te definește', '')"); } catch(e) {}
  try { db.run("INSERT OR IGNORE INTO site_content (key, title, content) VALUES ('contact_email', 'contact@noteindemisol.ro', '')"); } catch(e) {}
  try { db.run("INSERT OR IGNORE INTO site_content (key, title, content) VALUES ('contact_phone', '+40 700 000 000', '')"); } catch(e) {}
  try { db.run("INSERT OR IGNORE INTO site_content (key, title, content) VALUES ('contact_address', 'Strada Muzicii, Nr. 1, Brașov', '')"); } catch(e) {}
  try { db.run("INSERT OR IGNORE INTO site_content (key, title, content) VALUES ('lessons_title', 'Categorii de Lecții', '')"); } catch(e) {}
  try { db.run("INSERT OR IGNORE INTO site_content (key, title, content) VALUES ('lessons', 'Continut Lectii', 'Descopera lectii de chitara pentru toate nivelurile: incepator, intermediar si avansat. Fie ca vrei sa inveti acorduri de baza sau tehnici avansate, suntem aici sa te ajutam.')"); } catch(e) {}
  try { db.run("INSERT OR IGNORE INTO site_content (key, title, content) VALUES ('home_tagline', 'Tagline Homepage', '♫ Sunetul care te definește ♫')"); } catch(e) {}
  try { db.run("INSERT OR IGNORE INTO site_content (key, title, content) VALUES ('home_description', 'Descriere Homepage', 'Sub îndrumarea lui Alex Czirai, explorăm arta chitarei împreună. Lecții, evenimente și comunitate pentru pasionații de muzică.')"); } catch(e) {}
  try { db.run("INSERT OR IGNORE INTO site_content (key, title, content) VALUES ('social_facebook', 'https://facebook.com/noteindemisol', '')"); } catch(e) {}
  try { db.run("INSERT OR IGNORE INTO site_content (key, title, content) VALUES ('social_youtube', 'https://youtube.com/@noteindemisol', '')"); } catch(e) {}
  try { db.run("INSERT OR IGNORE INTO site_content (key, title, content) VALUES ('social_instagram', 'https://instagram.com/noteindemisol', '')"); } catch(e) {}
  try { db.run("INSERT OR IGNORE INTO site_content (key, title, content) VALUES ('social_tiktok', 'https://tiktok.com/@noteindemisol', '')"); } catch(e) {}
  try {
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync('admin123', 12);
    db.run("INSERT OR IGNORE INTO users (username, email, password, isAdmin, createdAt) VALUES ('alexczirai', 'alex@noteindemisol.ro', ?, 1, datetime('now'))", [hash]);
    db.run("INSERT OR IGNORE INTO users (username, email, password, isAdmin, createdAt) VALUES ('marcuadmin', 'marcubrsv@gmail.com', ?, 1, datetime('now'))", [hash]);
  } catch(e) {}
  save();
  return db;
}

function save() {
  if (!db) return;
  const dbPath = path.join(__dirname, 'data', 'nid.db');
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

async function query(sql, params = []) {
  const d = await getDb();
  const stmt = d.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

async function run(sql, params = []) {
  const d = await getDb();
  d.run(sql, params);
  save();
  return { changes: d.getRowsModified() };
}

async function get(sql, params = []) {
  const rows = await query(sql, params);
  return rows.length ? rows[0] : null;
}

module.exports = { getDb, query, run, get, save };
