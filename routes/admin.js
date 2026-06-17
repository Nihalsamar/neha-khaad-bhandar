/** Admin-only endpoints: product CRUD, inventory, orders, dashboard stats. */
const express = require('express');
const { get, all, run, tx } = require('../database/db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAdmin); // everything below requires a logged-in admin

/* ----------------------------- Dashboard ----------------------------- */
router.get('/stats', async (req, res, next) => {
  try {
    const totalProducts = (await get('SELECT COUNT(*) c FROM products WHERE active = 1')).c;
    const lowStock = (await get('SELECT COUNT(*) c FROM products WHERE active = 1 AND stock <= low_stock_at')).c;
    const outOfStock = (await get('SELECT COUNT(*) c FROM products WHERE active = 1 AND stock <= 0')).c;
    const newOrders = (await get("SELECT COUNT(*) c FROM orders WHERE status = 'NEW'")).c;
    const totalOrders = (await get('SELECT COUNT(*) c FROM orders')).c;
    const revenue = (await get("SELECT COALESCE(SUM(total),0) s FROM orders WHERE status != 'CANCELLED'")).s;
    const stockValue = (await get('SELECT COALESCE(SUM(price * stock),0) s FROM products WHERE active = 1')).s;

    res.json({
      totalProducts: Number(totalProducts),
      lowStock: Number(lowStock),
      outOfStock: Number(outOfStock),
      newOrders: Number(newOrders),
      totalOrders: Number(totalOrders),
      revenue: Number(revenue),
      stockValue: Number(stockValue),
    });
  } catch (e) { next(e); }
});

/* ----------------------------- Categories ----------------------------- */
router.get('/categories', async (req, res, next) => {
  try {
    res.json(await all('SELECT * FROM categories ORDER BY id'));
  } catch (e) { next(e); }
});

router.post('/categories', async (req, res, next) => {
  try {
    const { name, icon } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name required.' });
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    try {
      const info = await run('INSERT INTO categories (name, slug, icon) VALUES (?, ?, ?)', [name, slug, icon || '🌱']);
      res.status(201).json(await get('SELECT * FROM categories WHERE id = ?', [Number(info.lastInsertRowid)]));
    } catch {
      res.status(400).json({ error: 'Category already exists.' });
    }
  } catch (e) { next(e); }
});

/* ------------------------------ Products ------------------------------ */
router.get('/products', async (req, res, next) => {
  try {
    res.json(await all(
      `SELECT p.*, c.name AS category_name FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.active = 1 ORDER BY p.created_at DESC`
    ));
  } catch (e) { next(e); }
});

router.post('/products', async (req, res, next) => {
  try {
    const b = req.body;
    if (!b.name) return res.status(400).json({ error: 'Product name required.' });
    const info = await run(
      `INSERT INTO products (name, description, category_id, brand, unit, price, mrp, stock, low_stock_at, image, sku, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        b.name, b.description || '', b.category_id || null, b.brand || '', b.unit || 'unit',
        Number(b.price) || 0, Number(b.mrp) || Number(b.price) || 0,
        parseInt(b.stock, 10) || 0, parseInt(b.low_stock_at, 10) || 5,
        b.image || '📦', b.sku || '',
      ]
    );
    res.status(201).json(await get('SELECT * FROM products WHERE id = ?', [Number(info.lastInsertRowid)]));
  } catch (e) { next(e); }
});

router.put('/products/:id', async (req, res, next) => {
  try {
    const existing = await get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Product not found.' });
    const b = { ...existing, ...req.body };
    await run(
      `UPDATE products SET name=?, description=?, category_id=?, brand=?, unit=?, price=?, mrp=?,
         stock=?, low_stock_at=?, image=?, sku=? WHERE id=?`,
      [
        b.name, b.description || '', b.category_id || null, b.brand || '', b.unit || 'unit',
        Number(b.price) || 0, Number(b.mrp) || 0, parseInt(b.stock, 10) || 0,
        parseInt(b.low_stock_at, 10) || 5, b.image || '📦', b.sku || '', existing.id,
      ]
    );
    res.json(await get('SELECT * FROM products WHERE id = ?', [existing.id]));
  } catch (e) { next(e); }
});

// Quick stock adjustment (restock / correction)
router.patch('/products/:id/stock', async (req, res, next) => {
  try {
    const { delta, set } = req.body;
    const p = await get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!p) return res.status(404).json({ error: 'Product not found.' });
    let newStock = Number(p.stock);
    if (typeof set === 'number') newStock = set;
    else if (typeof delta === 'number') newStock = Number(p.stock) + delta;
    newStock = Math.max(0, newStock);
    await run('UPDATE products SET stock = ? WHERE id = ?', [newStock, p.id]);
    res.json(await get('SELECT * FROM products WHERE id = ?', [p.id]));
  } catch (e) { next(e); }
});

router.delete('/products/:id', async (req, res, next) => {
  try {
    await run('UPDATE products SET active = 0 WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

/* ------------------------------- Orders ------------------------------- */
router.get('/orders', async (req, res, next) => {
  try {
    const { status } = req.query;
    let sql = 'SELECT * FROM orders';
    const args = [];
    if (status) { sql += ' WHERE status = ?'; args.push(status); }
    sql += ' ORDER BY created_at DESC';
    const orders = await all(sql, args);
    for (const o of orders) {
      o.items = await all('SELECT * FROM order_items WHERE order_id = ?', [o.id]);
    }
    res.json(orders);
  } catch (e) { next(e); }
});

router.patch('/orders/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    const valid = ['NEW', 'CONFIRMED', 'DELIVERED', 'CANCELLED'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status.' });

    const order = await get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    // If cancelling (and not already cancelled), return items to stock atomically.
    if (status === 'CANCELLED' && order.status !== 'CANCELLED') {
      const transaction = await tx();
      try {
        const items = (await transaction.execute({
          sql: 'SELECT * FROM order_items WHERE order_id = ?', args: [order.id],
        })).rows;
        for (const it of items) {
          if (it.product_id) {
            await transaction.execute({
              sql: 'UPDATE products SET stock = stock + ? WHERE id = ?',
              args: [it.qty, it.product_id],
            });
          }
        }
        await transaction.execute({
          sql: 'UPDATE orders SET status = ? WHERE id = ?', args: [status, order.id],
        });
        await transaction.commit();
      } catch (err) {
        try { await transaction.rollback(); } catch {}
        throw err;
      }
    } else {
      await run('UPDATE orders SET status = ? WHERE id = ?', [status, order.id]);
    }

    res.json(await get('SELECT * FROM orders WHERE id = ?', [order.id]));
  } catch (e) { next(e); }
});

module.exports = router;
