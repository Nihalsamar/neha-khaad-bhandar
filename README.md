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

## 🗂️ The database lives in this folder

Data is stored in a single SQLite file at **`database/store.db`** inside this
project — exactly where the app lives. No external database server needed.

## 🚀 Run it locally

You need [Node.js](https://nodejs.org) (version 18 or newer).

```bash
# 1. install dependencies
npm install

# 2. (optional) create your settings
copy .env.example .env        # Windows
# cp .env.example .env        # Mac/Linux

# 3. load sample products + create the admin user
npm run seed

# 4. start the app
npm start
```

Then open:
- Store: http://localhost:3000
- Admin: http://localhost:3000/admin  (default login **admin / admin123**)

> Change `ADMIN_PASSWORD` and `JWT_SECRET` in `.env`, then run `npm run seed`
> again on a fresh database to apply a new admin password.

## ☁️ Deploy live for free

Because the app uses a database file, it needs a host that keeps a persistent
disk. **Fly.io** offers this on its free allowance and is the easiest option.

1. Install the CLI: https://fly.io/docs/hands-on/install-flyctl/
2. Sign up / log in: `fly auth signup`
3. From this folder:
   ```bash
   fly launch --no-deploy            # uses the included fly.toml
   fly volumes create nkb_data --size 1 --region sin
   fly secrets set JWT_SECRET="a-long-random-string" ADMIN_PASSWORD="your-password"
   fly deploy
   ```
4. Your store will be live at `https://<your-app-name>.fly.dev`

A `Dockerfile` is included, so the same setup also works on Render, Railway,
or any host that supports Docker + a persistent volume mounted at `/data`.

## 🧰 Tech stack
- **Backend:** Node.js + Express
- **Database:** SQLite (`better-sqlite3`) — file stored in `database/`
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

Jai Kisan 🚜
