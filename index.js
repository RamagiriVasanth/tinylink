require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// DB Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Serve static frontend files first
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/healthz', (req, res) => {
  res.json({ ok: true, version: "1.0" });
});

// Dashboard route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Stats page route
app.get('/code/:code', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'stats.html'));
});

// Import link routes
const linkRoutes = require('./routes/links')(pool);
app.use('/api/links', linkRoutes);

// Redirect route (must be after /code/:code)
app.get('/:code', async (req, res) => {
  const { code } = req.params;
  try {
    const result = await pool.query('SELECT * FROM links WHERE code=$1', [code]);
    if (result.rows.length === 0) return res.status(404).send("Link not found");

    const link = result.rows[0];
    await pool.query(
      'UPDATE links SET clicks=clicks+1, last_clicked=NOW() WHERE code=$1',
      [code]
    );
    res.redirect(302, link.url);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
