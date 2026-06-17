/**
 * Neha Khaad Bhandar — e-commerce + inventory management server.
 * Express + libSQL/Turso (SQLite-compatible).
 */
require('dotenv').config();
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

const { init } = require('./database/db');

const app = express();
app.use(express.json());
app.use(cookieParser());

// API routes
app.use('/api', require('./routes/products'));
app.use('/api', require('./routes/orders'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));

// Static frontend
app.use(express.static(path.join(__dirname, 'public')));

// Admin SPA entry
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Fallback to storefront
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Central error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

const PORT = process.env.PORT || 3000;

init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n🌾  Neha Khaad Bhandar running at http://localhost:${PORT}`);
      console.log(`    Storefront : http://localhost:${PORT}/`);
      console.log(`    Admin panel: http://localhost:${PORT}/admin\n`);
    });
  })
  .catch((e) => {
    console.error('Failed to initialise database:', e);
    process.exit(1);
  });
