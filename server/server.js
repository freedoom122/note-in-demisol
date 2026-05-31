const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const contentRoutes = require('./routes/content');

const app = express();
const PORT = process.env.PORT || 3456;

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/content', contentRoutes);

app.get('/api/events', async (req, res) => {
  try {
    const d = await db.getDb();
    const now = new Date().toISOString().split('T')[0];
    const events = await db.query(
      "SELECT * FROM events WHERE deleted = 0 ORDER BY date DESC"
    );
    res.json({ ok: true, events });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Eroare interna' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Note In Demisol API functioneaza' });
});

app.use(express.static(path.join(__dirname, '..')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

async function start() {
  await db.getDb();
  console.log('Baza de date initializata');
  app.listen(PORT, () => {
    console.log('Server pornit pe http://localhost:' + PORT);
  });
}

start().catch(err => {
  console.error('Eroare la pornire:', err);
  process.exit(1);
});
