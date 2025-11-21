const express = require('express');

module.exports = (pool) => {
  const router = express.Router();

  // Helper: Validate URL
  const isValidURL = (string) => {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  };

  // Helper: Generate random code
  const generateCode = (length = 6) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // POST /api/links - create a new link
  router.post('/', async (req, res) => {
    const { url, code } = req.body;
    if (!url) return res.status(400).json({ error: "URL required" });
    if (!isValidURL(url)) return res.status(400).json({ error: "Invalid URL" });

    const finalCode = code || generateCode();

    try {
      const exists = await pool.query('SELECT * FROM links WHERE code=$1', [finalCode]);
      if (exists.rows.length > 0) return res.status(409).json({ error: "Code exists" });

      const result = await pool.query(
        'INSERT INTO links(code, url) VALUES($1, $2) RETURNING *',
        [finalCode, url]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/links - list all links
  router.get('/', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM links ORDER BY created_at DESC');
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/links/:code - get stats for a single link
  router.get('/:code', async (req, res) => {
    const { code } = req.params;
    try {
      const result = await pool.query('SELECT * FROM links WHERE code=$1', [code]);
      if (result.rows.length === 0) return res.status(404).json({ error: "Link not found" });
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/links/:code - delete a link
  router.delete('/:code', async (req, res) => {
    const { code } = req.params;
    try {
      const result = await pool.query('DELETE FROM links WHERE code=$1 RETURNING *', [code]);
      if (result.rows.length === 0) return res.status(404).json({ error: "Link not found" });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
