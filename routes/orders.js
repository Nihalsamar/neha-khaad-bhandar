/** Order placement (checkout) endpoint. Handles stock validation + deduction. */
const express = require('express');
const { get, all, tx } = require('../database/db');

const router = express.Router();

function genOrderNo() {
  const d = new Date();
  const stamp =
    d.getFullYear().toString().slice(2) +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `NKB${stamp}${rand}`;
}

/**
 * Create an order.
 * Body: { customer_name, phone, address, items:[{id, qty}] }
 */
router.post('/orders', async (req, res, next) => {
  const { customer_name, phone, address, items } = req.body;

  if (!customer_name || !phone || !address)
    return res.status(400).json({ error: 'Name, phone and address are required.' });
  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ error: 'Cart is empty.' });

  const transaction = await tx();
  try {
    // Validate stock and compute total
    let total = 0;
    const resolved = [];
    for (const it of items) {
      const r = await transaction.execute({
        sql: 'SELECT * FROM products WHERE id = ? AND active = 1',
        args: [it.id],
      });
      const p = r.rows[0];
      if (!p) throw new Error(`Product ${it.id} not available.`);
      const qty = Math.max(1, parseInt(it.qty, 10) || 1);
      if (Number(p.stock) < qty)
        throw new Error(`Only ${p.stock} ${p.unit} of "${p.name}" left in stock.`);
      total += Number(p.price) * qty;
      resolved.push({ p, qty });
    }

    const orderNo = genOrderNo();
    const info = await transaction.execute({
      sql: `INSERT INTO orders (order_no, customer_name, phone, address, total, status)
            VALUES (?, ?, ?, ?, ?, 'NEW')`,
      args: [orderNo, customer_name, phone, address, total],
    });
    const orderId = Number(info.lastInsertRowid);

    for (const { p, qty } of resolved) {
      await transaction.execute({
        sql: `INSERT INTO order_items (order_id, product_id, product_name, unit, price, qty)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [orderId, p.id, p.name, p.unit, p.price, qty],
      });
      await transaction.execute({
        sql: 'UPDATE products SET stock = stock - ? WHERE id = ?',
        args: [qty, p.id],
      });
    }

    await transaction.commit();
    res.status(201).json({ id: orderId, order_no: orderNo, total });
  } catch (e) {
    try { await transaction.rollback(); } catch {}
    res.status(400).json({ error: e.message });
  }
});

// Lookup an order by order number (for customer order confirmation)
router.get('/orders/:orderNo', async (req, res, next) => {
  try {
    const order = await get('SELECT * FROM orders WHERE order_no = ?', [req.params.orderNo]);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    order.items = await all('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
    res.json(order);
  } catch (e) { next(e); }
});

module.exports = router;
