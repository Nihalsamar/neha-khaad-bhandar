/**
 * Database layer backed by libSQL / Turso (SQLite-compatible).
 *
 * - In production set TURSO_DATABASE_URL (libsql://...) and TURSO_AUTH_TOKEN.
 * - Locally, with neither set, it falls back to a file inside this project
 *   folder: database/store.db  (so the database still lives "in the folder").
 *
 * Exposes small async helpers (get/all/run/tx) so the rest of the app does
 * not need to know about the underlying client details.
 */
const path = require('path');
const fs = require('fs');
const { createClient } = require('@libsql/client');

let client;

if (process.env.TURSO_DATABASE_URL) {
  client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
} else {
  // Local development fallback: a SQLite file kept inside the project folder.
  const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'store.db');
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  client = createClient({ url: 'file:' + DB_PATH });
}

/** Run a statement and return the first row (or undefined). */
async function get(sql, args = []) {
  const res = await client.execute({ sql, args });
  return res.rows[0];
}

/** Run a statement and return all rows. */
async function all(sql, args = []) {
  const res = await client.execute({ sql, args });
  return res.rows;
}

/** Run a write statement; returns the raw result (lastInsertRowid, rowsAffected). */
async function run(sql, args = []) {
  return client.execute({ sql, args });
}

/** Begin a write transaction. Caller must commit()/rollback(). */
function tx() {
  return client.transaction('write');
}

/** Create tables if they do not exist. */
async function init() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS categories (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      icon TEXT DEFAULT '🌱'
    )`,
    `CREATE TABLE IF NOT EXISTS products (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL,
      description   TEXT DEFAULT '',
      category_id   INTEGER,
      brand         TEXT DEFAULT '',
      unit          TEXT DEFAULT 'unit',
      price         REAL NOT NULL DEFAULT 0,
      mrp           REAL NOT NULL DEFAULT 0,
      stock         INTEGER NOT NULL DEFAULT 0,
      low_stock_at  INTEGER NOT NULL DEFAULT 5,
      image         TEXT DEFAULT '',
      sku           TEXT DEFAULT '',
      active        INTEGER NOT NULL DEFAULT 1,
      created_at    TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS orders (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no       TEXT NOT NULL UNIQUE,
      customer_name  TEXT NOT NULL,
      phone          TEXT NOT NULL,
      address        TEXT NOT NULL,
      total          REAL NOT NULL DEFAULT 0,
      status         TEXT NOT NULL DEFAULT 'NEW',
      created_at     TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS order_items (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id     INTEGER NOT NULL,
      product_id   INTEGER,
      product_name TEXT NOT NULL,
      unit         TEXT DEFAULT '',
      price        REAL NOT NULL,
      qty          INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS admins (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at    TEXT DEFAULT (datetime('now'))
    )`,
  ];
  for (const sql of statements) await client.execute(sql);
}

module.exports = { client, init, get, all, run, tx };
