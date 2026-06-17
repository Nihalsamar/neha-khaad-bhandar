# 🌾 Neha Khaad Bhandar — Online Store + Inventory System

A modern web app for an agricultural supplies shop (fertilizers / खाद, seeds / बीज,
pesticides, nutrients and tools). Customers can browse products and place orders;
the shop owner manages products, stock and orders from an admin panel.

> **Payments are not handled online.** Customers place an order and pay cash on
> delivery / pickup. The owner confirms each order by phone.

## ✨ Features

**Storefront**
- Modern, mobile-friendly design (green & yellow farm theme)
- Browse by category, live search
- Shopping cart (saved in the browser)
- Simple checkout with name / phone / address
- Order confirmation with a unique order number

**Admin panel** (`/admin`)
- Secure login
- Dashboard: product count, low-stock & out-of-stock alerts, orders, revenue, stock value
- Product management: add / edit / delete, price, MRP, brand, unit, image/emoji
- Inventory management: quick +/- or exact stock updates, low-stock alerts
- Orders: view all orders, update status (New → Confirmed → Delivered / Cancelled).
  Cancelling an order returns its items to stock automatically.

## 🗂️ Where the data lives

- **Locally:** a SQLite file inside this project — `database/store.db` — created automatically when `TURSO_DATABASE_URL` is not set.
- **In production:** a free **Turso** cloud database (SQLite-compatible). Set
  `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` and the app uses that instead.

## 🚀 Run it locally

You need [Node.js](https://nodejs.org) (version 18 or newer).

```bash
npm install
copy .env.example .env        # Windows  (cp on Mac/Linux)
npm run seed                  # loads sample products + admin user
npm start
```

- Store: http://localhost:3000
- Admin: http://localhost:3000/admin  (default **admin / admin123**)

## ☁️ Deploy free (Render + Turso, no credit card)

**1. Create the database (Turso)**
- Sign up at https://turso.tech (log in with GitHub — free, no card).
- Create a database (any name; pick a region near you).
- Copy the **Database URL** (looks like `libsql://<name>-<org>.turso.io`).
- Create a **database token** and copy it.

**2. Put the code on GitHub**
- Create a new repo and push this folder to it (the project is already a git repo).

**3. Deploy on Render**
- At https://render.com sign up (GitHub login — free, no card).
- New + → **Blueprint** → pick your repo. Render reads `render.yaml`.
- When prompted, set these environment variables:
  - `TURSO_DATABASE_URL` = your Turso URL
  - `TURSO_AUTH_TOKEN` = your Turso token
  - `ADMIN_USERNAME` = e.g. `admin`
  - `ADMIN_PASSWORD` = a strong password
  - (`JWT_SECRET` is generated automatically.)
- Click **Apply**. Render runs the seed once, then starts the server.

Your store goes live at `https://<your-service>.onrender.com`.

> Note: Render's free instance sleeps after ~15 min idle and takes ~30–60s to
> wake on the next visit. Your data is safe regardless — it lives in Turso, not
> on the instance.

## 🧰 Tech stack
- **Backend:** Node.js + Express
- **Database:** SQLite via **libSQL / Turso** (`@libsql/client`) — local file in dev, Turso cloud in production
- **Auth:** JSON Web Tokens (admin only)
- **Frontend:** plain HTML / CSS / JavaScript (no build step, loads fast)

## 📁 Project structure
```
.
├── server.js              # Express app entry
├── database/
│   ├── db.js              # SQLite connection + schema
│   ├── seed.js            # sample data + admin user
│   └── store.db           # the database file (created on first run)
├── middleware/auth.js     # admin JWT auth
├── routes/
│   ├── products.js        # public product/category APIs
│   ├── orders.js          # public checkout API
│   ├── auth.js            # admin login/logout
│   └── admin.js           # admin product/inventory/order APIs
└── public/                # storefront + admin UI
    ├── index.html / admin.html
    ├── css/ and js/
```

 
