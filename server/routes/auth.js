const express = require('express');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const db = require('../db');
const { generateToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

const ADMIN_USERS = ['alexczirai', 'marcuadmin'];
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

async function findOrCreateSocialUser(provider, providerId, email, displayName) {
  const existing = await db.get('SELECT * FROM users WHERE email = ?', [email]);
  if (existing) {
    if (!existing.password.startsWith('$2')) {
      await db.run('UPDATE users SET password = ? WHERE id = ?', [existing.password, existing.id]);
    }
    return existing;
  }
  let baseUsername = (email ? email.split('@')[0] : provider + '_' + providerId).toLowerCase().replace(/[^a-z0-9_]/g, '_');
  let username = baseUsername;
  let suffix = 1;
  while (await db.get('SELECT id FROM users WHERE username = ?', [username])) {
    username = baseUsername + suffix;
    suffix++;
  }
  const hash = await bcrypt.hash(Math.random().toString(36), 12);
  const isAdmin = ADMIN_USERS.includes(username) ? 1 : 0;
  await db.run(
    'INSERT INTO users (username, email, password, isAdmin, createdAt) VALUES (?, ?, ?, ?, ?)',
    [username, email || (provider + '_' + providerId + '@social.local'), hash, isAdmin, new Date().toISOString()]
  );
  return await db.get('SELECT * FROM users WHERE username = ?', [username]);
}

router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ ok: false, error: 'Token Google lipsa' });
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    const user = await findOrCreateSocialUser('google', payload.sub, payload.email, payload.name);
    const banned = await db.get('SELECT id FROM bans WHERE identifier = ?', [user.username]);
    if (banned) return res.status(403).json({ ok: false, error: 'Cont blocat' });
    const token = generateToken(user);
    res.json({ ok: true, token, user: { username: user.username, email: user.email, isAdmin: !!user.isAdmin } });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(401).json({ ok: false, error: 'Autentificare Google esuata' });
  }
});

router.post('/register', async (req, res) => {
  try {
    let { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ ok: false, error: 'Toate campurile sunt obligatorii' });
    }
    username = username.trim().toLowerCase();
    email = email.trim().toLowerCase();
    if (password.length < 6) {
      return res.status(400).json({ ok: false, error: 'Parola trebuie sa aiba minim 6 caractere' });
    }
    if (!email.includes('@')) {
      return res.status(400).json({ ok: false, error: 'Email invalid' });
    }
    if (!/^[a-z0-9_]+$/.test(username)) {
      return res.status(400).json({ ok: false, error: 'Username poate contine doar litere, cifre si underscore' });
    }
    const existing = await db.get('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
    if (existing) {
      return res.status(409).json({ ok: false, error: 'Username sau email deja inregistrat' });
    }
    const hash = await bcrypt.hash(password, 12);
    const isAdmin = ADMIN_USERS.includes(username) ? 1 : 0;
    await db.run(
      'INSERT INTO users (username, email, password, isAdmin, createdAt) VALUES (?, ?, ?, ?, ?)',
      [username, email, hash, isAdmin, new Date().toISOString()]
    );
    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    const token = generateToken(user);
    res.json({
      ok: true,
      token,
      user: { username: user.username, email: user.email, isAdmin: !!user.isAdmin }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ ok: false, error: 'Eroare interna' });
  }
});

router.post('/login', async (req, res) => {
  try {
    let { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ ok: false, error: 'Completeaza toate campurile' });
    }
    username = username.trim().toLowerCase();
    const user = await db.get(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username, username]
    );
    if (!user) {
      return res.status(401).json({ ok: false, error: 'Utilizator negasit' });
    }
    const banned = await db.get('SELECT id FROM bans WHERE identifier = ?', [user.username]);
    if (banned) {
      return res.status(403).json({ ok: false, error: 'Contul tau a fost blocat. Contacteaza administratorul.' });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ ok: false, error: 'Parola incorecta' });
    }
    const token = generateToken(user);
    res.json({
      ok: true,
      token,
      user: { username: user.username, email: user.email, isAdmin: !!user.isAdmin }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ ok: false, error: 'Eroare interna' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await db.get('SELECT username, email, isAdmin, createdAt FROM users WHERE username = ?', [req.user.username]);
  if (!user) return res.status(404).json({ ok: false, error: 'Utilizator negasit' });
  res.json({ ok: true, user: { ...user, isAdmin: !!user.isAdmin } });
});

router.post('/forgot-password', async (req, res) => {
  try {
    let { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ ok: false, error: 'Email invalid' });
    }
    email = email.trim().toLowerCase();
    const user = await db.get('SELECT id, username FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(404).json({ ok: false, error: 'Nu exista cont cu acest email' });
    }
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expires = new Date(Date.now() + 3600000).toISOString();
    await db.run('DELETE FROM reset_codes WHERE email = ?', [email]);
    await db.run('INSERT INTO reset_codes (email, code, expires) VALUES (?, ?, ?)', [email, code, expires]);
    res.json({ ok: true, message: 'Cod de resetare trimis la ' + email, code, username: user.username });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ ok: false, error: 'Eroare interna' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    let { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ ok: false, error: 'Toate campurile sunt obligatorii' });
    }
    email = email.trim().toLowerCase();
    if (newPassword.length < 6) {
      return res.status(400).json({ ok: false, error: 'Parola trebuie sa aiba minim 6 caractere' });
    }
    const reset = await db.get(
      'SELECT * FROM reset_codes WHERE email = ? AND code = ?',
      [email, code.toUpperCase()]
    );
    if (!reset) {
      return res.status(400).json({ ok: false, error: 'Cod invalid sau nicio cerere de resetare' });
    }
    if (new Date(reset.expires) < new Date()) {
      return res.status(400).json({ ok: false, error: 'Codul a expirat' });
    }
    const hash = await bcrypt.hash(newPassword, 12);
    await db.run('UPDATE users SET password = ? WHERE email = ?', [hash, email]);
    await db.run('DELETE FROM reset_codes WHERE email = ?', [email]);
    res.json({ ok: true, message: 'Parola a fost schimbata cu succes' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ ok: false, error: 'Eroare interna' });
  }
});

router.post('/change-email', requireAuth, async (req, res) => {
  try {
    let { newEmail } = req.body;
    if (!newEmail || !newEmail.includes('@')) {
      return res.status(400).json({ ok: false, error: 'Email invalid' });
    }
    newEmail = newEmail.trim().toLowerCase();
    const existing = await db.get('SELECT id FROM users WHERE email = ? AND username != ?', [newEmail, req.user.username]);
    if (existing) {
      return res.status(409).json({ ok: false, error: 'Email deja folosit de alt utilizator' });
    }
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expires = new Date(Date.now() + 3600000).toISOString();
    await db.run('DELETE FROM email_change_codes WHERE username = ?', [req.user.username]);
    await db.run('INSERT INTO email_change_codes (username, newEmail, code, expires) VALUES (?, ?, ?, ?)',
      [req.user.username, newEmail, code, expires]);
    res.json({ ok: true, message: 'Cod de verificare trimis', code });
  } catch (err) {
    console.error('Change email error:', err);
    res.status(500).json({ ok: false, error: 'Eroare interna' });
  }
});

router.post('/confirm-email', requireAuth, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ ok: false, error: 'Codul este obligatoriu' });
    const data = await db.get(
      'SELECT * FROM email_change_codes WHERE username = ? AND code = ?',
      [req.user.username, code.toUpperCase()]
    );
    if (!data) return res.status(400).json({ ok: false, error: 'Cod invalid' });
    if (new Date(data.expires) < new Date()) return res.status(400).json({ ok: false, error: 'Codul a expirat' });
    await db.run('UPDATE users SET email = ? WHERE username = ?', [data.newEmail, req.user.username]);
    await db.run('DELETE FROM email_change_codes WHERE username = ?', [req.user.username]);
    const token = generateToken({ ...req.user, email: data.newEmail });
    res.json({ ok: true, token, user: { username: req.user.username, email: data.newEmail, isAdmin: req.user.isAdmin } });
  } catch (err) {
    console.error('Confirm email error:', err);
    res.status(500).json({ ok: false, error: 'Eroare interna' });
  }
});

router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expires = new Date(Date.now() + 3600000).toISOString();
    await db.run('DELETE FROM password_change_codes WHERE username = ?', [req.user.username]);
    await db.run('INSERT INTO password_change_codes (username, code, expires) VALUES (?, ?, ?)',
      [req.user.username, code, expires]);
    res.json({ ok: true, message: 'Cod de verificare trimis', code });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ ok: false, error: 'Eroare interna' });
  }
});

router.post('/confirm-password', requireAuth, async (req, res) => {
  try {
    const { code, newPassword } = req.body;
    if (!code || !newPassword) return res.status(400).json({ ok: false, error: 'Toate campurile sunt obligatorii' });
    if (newPassword.length < 6) return res.status(400).json({ ok: false, error: 'Parola trebuie sa aiba minim 6 caractere' });
    const data = await db.get(
      'SELECT * FROM password_change_codes WHERE username = ? AND code = ?',
      [req.user.username, code.toUpperCase()]
    );
    if (!data) return res.status(400).json({ ok: false, error: 'Cod invalid' });
    if (new Date(data.expires) < new Date()) return res.status(400).json({ ok: false, error: 'Codul a expirat' });
    const hash = await bcrypt.hash(newPassword, 12);
    await db.run('UPDATE users SET password = ? WHERE username = ?', [hash, req.user.username]);
    await db.run('DELETE FROM password_change_codes WHERE username = ?', [req.user.username]);
    res.json({ ok: true, message: 'Parola schimbata cu succes' });
  } catch (err) {
    console.error('Confirm password error:', err);
    res.status(500).json({ ok: false, error: 'Eroare interna' });
  }
});

router.post('/seed', async (req, res) => {
  try {
    const admins = [
      { username: 'alexczirai', email: 'alex@noteindemisol.ro', password: 'admin123' },
      { username: 'marcuadmin', email: 'marcubrsv@gmail.com', password: 'admin123' }
    ];
    let count = 0;
    for (const a of admins) {
      const existing = await db.get('SELECT id FROM users WHERE username = ?', [a.username]);
      if (!existing) {
        const hash = await bcrypt.hash(a.password, 12);
        await db.run('INSERT INTO users (username, email, password, isAdmin, createdAt) VALUES (?, ?, ?, 1, ?)',
          [a.username, a.email, hash, new Date().toISOString()]);
        count++;
      }
    }
    const existingEvents = await db.query('SELECT COUNT(*) as cnt FROM events');
    if (existingEvents[0].cnt === 0) {
      const events = [
        { name: 'Concert de Primavara', startDate: '2026-06-15', endDate: '2026-06-15', startTime: '19:00', endTime: '22:00', location: 'Sala Concerturilor', desc: 'Performanta live cu repertoriu clasic si modern' },
        { name: 'Workshop Tehnici Avansate', startDate: '2026-06-01', endDate: '2026-06-03', startTime: '10:00', endTime: '17:00', location: 'Studioul Nostru', desc: 'Tehnici de sweep picking, tapping si legato' },
        { name: 'Festival de Chitare', startDate: '2026-07-20', endDate: '2026-07-22', startTime: '12:00', endTime: '23:00', location: 'Parcul Central', desc: 'Concerte, workshop-uri si jam sessions' }
      ];
      for (const e of events) {
        await db.run('INSERT INTO events (name, date, endDate, startTime, endTime, location, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [e.name, e.startDate, e.endDate, e.startTime, e.endTime, e.location, e.desc]);
      }
    }
    const existingPosts = await db.query('SELECT COUNT(*) as cnt FROM blog_posts');
    if (existingPosts[0].cnt === 0) {
      const posts = [
        { title: 'Bine ati venit la Note In Demisol!', content: 'Suntem incantati sa anuntam lansarea oficiala a site-ului nostru. Aici veti gasi informatii despre lectii, evenimente si intreaga noastra activitate. Ramaneti aproape pentru noutati!', author: 'Alex Czirai' },
        { title: 'Tehnici de baza pentru incepatori', content: 'In lectiile noastre pentru incepatori, punem accent pe postura corecta, acordarea chitarei si acorduri de baza. Fiecare elev progreseaza in ritmul propriu, cu exercitii adaptate nivelului sau.', author: 'Alex Czirai' },
        { title: 'Concertul de Primavara - Recapitulare', content: 'Multumim tuturor celor care au participat la concertul nostru de primavara! A fost o seara memorabila cu interpretari de exceptie. Fotografiile si inregistrarile sunt disponibile in galerie.', author: 'Echipa NID' }
      ];
      for (const p of posts) {
        await db.run('INSERT INTO blog_posts (title, content, date, author) VALUES (?, ?, ?, ?)',
          [p.title, p.content, new Date().toISOString().split('T')[0], p.author]);
      }
    }
    res.json({ ok: true, message: count + ' admini adaugati', admins: admins.map(a => a.username) });
  } catch (err) {
    console.error('Seed error:', err);
    res.status(500).json({ ok: false, error: 'Eroare interna' });
  }
});

module.exports = router;
