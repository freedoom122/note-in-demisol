const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/blog', async (req, res) => {
  try {
    const posts = await db.query('SELECT * FROM blog_posts ORDER BY date DESC');
    res.json({ ok: true, posts });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Eroare interna' });
  }
});

router.post('/contact-messages', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) return res.status(400).json({ ok: false, error: 'Toate campurile sunt obligatorii' });
    await db.run("INSERT INTO contact_messages (name, email, message, date) VALUES (?, ?, ?, datetime('now'))",
      [name, email, message]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Eroare interna' });
  }
});

router.get('/contact-messages', async (req, res) => {
  try {
    const msgs = await db.query('SELECT * FROM contact_messages ORDER BY date DESC');
    res.json({ ok: true, messages: msgs });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Eroare interna' });
  }
});

router.get('/site-content', async (req, res) => {
  try {
    const content = await db.query('SELECT * FROM site_content');
    const map = {};
    content.forEach(function(c) { map[c.key] = { title: c.title, content: c.content }; });
    res.json({ ok: true, content: map });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Eroare interna' });
  }
});

// Admin routes
router.get('/admin/blog', requireAdmin, async (req, res) => {
  try {
    const posts = await db.query('SELECT * FROM blog_posts ORDER BY date DESC');
    res.json({ ok: true, posts });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Eroare interna' });
  }
});

router.post('/admin/blog', requireAdmin, async (req, res) => {
  try {
    const { title, content, author } = req.body;
    if (!title || !content) return res.status(400).json({ ok: false, error: 'Titlu si continut obligatorii' });
    const result = await db.run(
      "INSERT INTO blog_posts (title, content, date, author) VALUES (?, ?, date('now'), ?)",
      [title, content, author || 'Admin']
    );
    const post = await db.get('SELECT * FROM blog_posts WHERE id = ?', [result.changes]);
    res.json({ ok: true, post });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Eroare interna' });
  }
});

router.put('/admin/blog/:id', requireAdmin, async (req, res) => {
  try {
    const { title, content, author } = req.body;
    const result = await db.run('UPDATE blog_posts SET title = ?, content = ?, author = ? WHERE id = ?',
      [title, content, author || 'Admin', req.params.id]);
    if (!result.changes) return res.status(404).json({ ok: false, error: 'Postare negasita' });
    const post = await db.get('SELECT * FROM blog_posts WHERE id = ?', [req.params.id]);
    res.json({ ok: true, post });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Eroare interna' });
  }
});

router.delete('/admin/blog/:id', requireAdmin, async (req, res) => {
  try {
    const result = await db.run('DELETE FROM blog_posts WHERE id = ?', [req.params.id]);
    if (!result.changes) return res.status(404).json({ ok: false, error: 'Postare negasita' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Eroare interna' });
  }
});

router.put('/admin/site-content', requireAdmin, async (req, res) => {
  try {
    const { key, title, content } = req.body;
    if (!key) return res.status(400).json({ ok: false, error: 'Cheia este obligatorie' });
    await db.run('UPDATE site_content SET title = ?, content = ? WHERE key = ?', [title || '', content || '', key]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Eroare interna' });
  }
});

module.exports = router;
