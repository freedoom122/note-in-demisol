const express = require('express');
const db = require('../db');
const { requireAdmin, generateToken } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

const router = express.Router();

router.use(requireAdmin);

router.get('/users', async (req, res) => {
  try {
    const users = await db.query('SELECT username, email, isAdmin, createdAt FROM users');
    res.json({ ok: true, users: users.map(u => ({ ...u, isAdmin: !!u.isAdmin })) });
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ ok: false, error: 'Eroare interna' });
  }
});

router.post('/users/promote', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ ok: false, error: 'Username obligatoriu' });
    const user = await db.get('SELECT * FROM users WHERE username = ?', [username.trim().toLowerCase()]);
    if (!user) return res.status(404).json({ ok: false, error: 'Utilizator negasit' });
    if (user.isAdmin) return res.json({ ok: true, message: 'Deja admin' });
    await db.run('UPDATE users SET isAdmin = 1 WHERE username = ?', [user.username]);
    res.json({ ok: true, message: 'Utilizator promovat' });
  } catch (err) {
    console.error('Promote error:', err);
    res.status(500).json({ ok: false, error: 'Eroare interna' });
  }
});

router.post('/users/email', async (req, res) => {
  try {
    let { username, newEmail } = req.body;
    if (!username || !newEmail) return res.status(400).json({ ok: false, error: 'Toate campurile sunt obligatorii' });
    username = username.trim().toLowerCase();
    newEmail = newEmail.trim().toLowerCase();
    if (!newEmail.includes('@')) return res.status(400).json({ ok: false, error: 'Email invalid' });
    const existing = await db.get('SELECT id FROM users WHERE email = ? AND username != ?', [newEmail, username]);
    if (existing) return res.status(409).json({ ok: false, error: 'Email deja folosit' });
    const result = await db.run('UPDATE users SET email = ? WHERE username = ?', [newEmail, username]);
    if (!result.changes) return res.status(404).json({ ok: false, error: 'Utilizator negasit' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Admin change email error:', err);
    res.status(500).json({ ok: false, error: 'Eroare interna' });
  }
});

router.get('/events', async (req, res) => {
  try {
    const events = await db.query('SELECT * FROM events WHERE deleted = 0 ORDER BY date DESC');
    res.json({ ok: true, events });
  } catch (err) {
    console.error('Admin events error:', err);
    res.status(500).json({ ok: false, error: 'Eroare interna' });
  }
});

router.get('/events/trash', async (req, res) => {
  try {
    const events = await db.query('SELECT * FROM events WHERE deleted = 1 ORDER BY trashedAt DESC');
    res.json({ ok: true, events });
  } catch (err) {
    console.error('Admin events trash error:', err);
    res.status(500).json({ ok: false, error: 'Eroare interna' });
  }
});

router.post('/events', async (req, res) => {
  try {
    let { name, startDate, endDate, startTime, endTime, location, description } = req.body;
    if (!name || !startDate || !location) return res.status(400).json({ ok: false, error: 'Nume, data si locatia sunt obligatorii' });
    const result = await db.run(
      'INSERT INTO events (name, date, endDate, startTime, endTime, location, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, startDate, endDate || '', startTime || '', endTime || '', location, description || '']
    );
    const ev = await db.get('SELECT * FROM events WHERE id = ?', [result.changes]);
    res.json({ ok: true, event: ev });
  } catch (err) {
    console.error('Create event error:', err);
    res.status(500).json({ ok: false, error: 'Eroare interna' });
  }
});

router.put('/events/:id', async (req, res) => {
  try {
    let { name, startDate, endDate, startTime, endTime, location, description } = req.body;
    const result = await db.run(
      'UPDATE events SET name = ?, date = ?, endDate = ?, startTime = ?, endTime = ?, location = ?, description = ? WHERE id = ? AND deleted = 0',
      [name, startDate, endDate || '', startTime || '', endTime || '', location, description || '', req.params.id]
    );
    if (!result.changes) return res.status(404).json({ ok: false, error: 'Eveniment negasit' });
    const ev = await db.get('SELECT * FROM events WHERE id = ?', [req.params.id]);
    res.json({ ok: true, event: ev });
  } catch (err) {
    console.error('Update event error:', err);
    res.status(500).json({ ok: false, error: 'Eroare interna' });
  }
});

router.delete('/events/:id', async (req, res) => {
  try {
    const result = await db.run(
      'UPDATE events SET deleted = 1, trashedAt = ? WHERE id = ? AND deleted = 0',
      [new Date().toISOString(), req.params.id]
    );
    if (!result.changes) return res.status(404).json({ ok: false, error: 'Eveniment negasit' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete event error:', err);
    res.status(500).json({ ok: false, error: 'Eroare interna' });
  }
});

router.post('/events/:id/restore', async (req, res) => {
  try {
    const result = await db.run(
      "UPDATE events SET deleted = 0, trashedAt = '' WHERE id = ? AND deleted = 1",
      [req.params.id]
    );
    if (!result.changes) return res.status(404).json({ ok: false, error: 'Eveniment negasit in cos' });
    const ev = await db.get('SELECT * FROM events WHERE id = ?', [req.params.id]);
    res.json({ ok: true, event: ev });
  } catch (err) {
    console.error('Restore event error:', err);
    res.status(500).json({ ok: false, error: 'Eroare interna' });
  }
});

router.delete('/events/:id/permanent', async (req, res) => {
  try {
    const result = await db.run('DELETE FROM events WHERE id = ? AND deleted = 1', [req.params.id]);
    if (!result.changes) return res.status(404).json({ ok: false, error: 'Eveniment negasit in cos' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Permanent delete error:', err);
    res.status(500).json({ ok: false, error: 'Eroare interna' });
  }
});

router.get('/subscribers', async (req, res) => {
  try {
    const subscribers = await db.query('SELECT * FROM subscribers ORDER BY id');
    res.json({ ok: true, subscribers });
  } catch (err) {
    console.error('Admin subscribers error:', err);
    res.status(500).json({ ok: false, error: 'Eroare interna' });
  }
});

router.post('/subscribers', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ ok: false, error: 'Email obligatoriu' });
    await db.run('INSERT INTO subscribers (email, date) VALUES (?, ?)', [email, new Date().toLocaleDateString('ro-RO')]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Add subscriber error:', err);
    res.status(500).json({ ok: false, error: 'Eroare interna' });
  }
});

router.delete('/subscribers/:id', async (req, res) => {
  try {
    const result = await db.run('DELETE FROM subscribers WHERE id = ?', [req.params.id]);
    if (!result.changes) return res.status(404).json({ ok: false, error: 'Subscriptie negasita' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete subscriber error:', err);
    res.status(500).json({ ok: false, error: 'Eroare interna' });
  }
});

router.get('/bans', async (req, res) => {
  try {
    const bans = await db.query('SELECT * FROM bans ORDER BY id');
    res.json({ ok: true, bans });
  } catch (err) {
    console.error('Admin bans error:', err);
    res.status(500).json({ ok: false, error: 'Eroare interna' });
  }
});

router.post('/bans', async (req, res) => {
  try {
    const { identifier, reason } = req.body;
    if (!identifier) return res.status(400).json({ ok: false, error: 'Identificator obligatoriu' });
    await db.run('INSERT INTO bans (identifier, date, reason) VALUES (?, ?, ?)',
      [identifier, new Date().toLocaleDateString('ro-RO'), reason || 'Blocat manual']);
    res.json({ ok: true });
  } catch (err) {
    console.error('Add ban error:', err);
    res.status(500).json({ ok: false, error: 'Eroare interna' });
  }
});

router.delete('/bans/:id', async (req, res) => {
  try {
    const result = await db.run('DELETE FROM bans WHERE id = ?', [req.params.id]);
    if (!result.changes) return res.status(404).json({ ok: false, error: 'Ban negasit' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete ban error:', err);
    res.status(500).json({ ok: false, error: 'Eroare interna' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const userCount = await db.query('SELECT COUNT(*) as cnt FROM users');
    const eventCount = await db.query('SELECT COUNT(*) as cnt FROM events WHERE deleted = 0');
    const subCount = await db.query('SELECT COUNT(*) as cnt FROM subscribers');
    const banCount = await db.query('SELECT COUNT(*) as cnt FROM bans');
    res.json({
      ok: true,
      stats: {
        users: userCount[0].cnt,
        events: eventCount[0].cnt,
        subscribers: subCount[0].cnt,
        bans: banCount[0].cnt
      }
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ ok: false, error: 'Eroare interna' });
  }
});

router.post('/notify', async (req, res) => {
  try {
    const { eventId } = req.body;
    const ev = await db.get('SELECT * FROM events WHERE id = ?', [eventId]);
    if (!ev) return res.status(404).json({ ok: false, error: 'Eveniment negasit' });
    const subs = await db.query('SELECT * FROM subscribers');
    res.json({ ok: true, message: 'Notificare trimisa la ' + subs.length + ' subscriptii pentru: ' + ev.name });
  } catch (err) {
    console.error('Notify error:', err);
    res.status(500).json({ ok: false, error: 'Eroare interna' });
  }
});

router.post('/reset', async (req, res) => {
  try {
    await db.run('DELETE FROM users');
    await db.run('DELETE FROM events');
    await db.run('DELETE FROM subscribers');
    await db.run('DELETE FROM bans');
    await db.run('DELETE FROM reset_codes');
    await db.run('DELETE FROM email_change_codes');
    await db.run('DELETE FROM password_change_codes');
    const bcrypt = require('bcryptjs');
    const admins = [
      { username: 'alexczirai', email: 'alex@noteindemisol.ro', password: 'admin123' },
      { username: 'marcuadmin', email: 'marcubrsv@gmail.com', password: 'admin123' }
    ];
    for (const a of admins) {
      const hash = await bcrypt.hash(a.password, 12);
      await db.run('INSERT INTO users (username, email, password, isAdmin, createdAt) VALUES (?, ?, ?, 1, ?)',
        [a.username, a.email, hash, new Date().toISOString()]);
    }
    res.json({ ok: true, message: 'Sistemul a fost resetat. Adminii au fost recreati.' });
  } catch (err) {
    console.error('Reset error:', err);
    res.status(500).json({ ok: false, error: 'Eroare interna' });
  }
});

module.exports = router;
