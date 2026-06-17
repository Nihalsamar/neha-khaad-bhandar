/** Public product + category browsing endpoints. */
const express = require('express');
const { all, get } = require('../database/db');

const router = express.Router();

// All categories
router.get('/categories', async (req, res, next) => {
  try {
    res.json(await all('SELECT * FROM categories ORDER BY id'));
  } catch (e) { next(e); }
});

// List products (only active). Supports ?category=slug & ?q=search
router.get('/products', async (req, res, next) => {
  try {
    const { category, q } = req.query;
    let sql = `
      SELECT p.*, c.name AS category_name, c.slug AS category_slug
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.active = 1
    `;
    const args = [];
    if (category) {
      sql += ' AND c.slug = ?';
      args.push(category);
    }
    if (q) {
      sql += ' AND (p.name LIKE ? OR p.brand LIKE ? OR p.description LIKE ?)';
      const like = `%${q}%`;
      args.push(like, like, like);
    }
    sql += ' ORDER BY p.name';
    res.json(await all(sql, args));
  } catch (e) { next(e); }
});

// Single product
router.get('/products/:id', async (req, res, next) => {
  try {
    const row = await get(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM products p LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id = ? AND p.active = 1`,
      [req.params.id]
    );
    if (!row) return res.status(404).json({ error: 'Product not found' });
    res.json(row);
  } catch (e) { next(e); }
});

module.exports = router;
