/**
 * Seeds the database with categories, sample agricultural products,
 * and a default admin account. Safe to run multiple times.
 *
 * Run with:  npm run seed
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { init, get, all, run } = require('./db');

const categories = [
  { name: 'Fertilizers (खाद)', slug: 'fertilizers', icon: '🧪' },
  { name: 'Seeds (बीज)', slug: 'seeds', icon: '🌱' },
  { name: 'Pesticides (कीटनाशक)', slug: 'pesticides', icon: '🐛' },
  { name: 'Plant Nutrients (पोषक)', slug: 'nutrients', icon: '🌿' },
  { name: 'Tools & Equipment', slug: 'tools', icon: '🛠️' },
];

const products = [
  { name: 'NPK 20:20:0:13', cat: 'fertilizers', brand: 'IFFCO', unit: '50 kg bag', price: 1450, mrp: 1500, stock: 40, image: '🧪', desc: 'Balanced complex fertilizer for all crops.' },
  { name: 'Urea (यूरिया)', cat: 'fertilizers', brand: 'IFFCO', unit: '45 kg bag', price: 266, mrp: 280, stock: 120, image: '🧪', desc: 'Nitrogen rich fertilizer for vegetative growth.' },
  { name: 'DAP (डी.ए.पी)', cat: 'fertilizers', brand: 'IPL', unit: '50 kg bag', price: 1350, mrp: 1400, stock: 60, image: '🧪', desc: 'Di-Ammonium Phosphate for root development.' },
  { name: 'TSP', cat: 'fertilizers', brand: 'Coromandel', unit: '50 kg bag', price: 1250, mrp: 1300, stock: 25, image: '🧪', desc: 'Triple Super Phosphate.' },
  { name: 'MOP (Potash)', cat: 'fertilizers', brand: 'IPL', unit: '50 kg bag', price: 1700, mrp: 1750, stock: 18, image: '🧪', desc: 'Muriate of Potash for fruit quality.' },
  { name: 'SSP', cat: 'fertilizers', brand: 'Coromandel', unit: '50 kg bag', price: 500, mrp: 540, stock: 30, image: '🧪', desc: 'Single Super Phosphate with sulphur.' },
  { name: 'Wheat Seed NU-555', cat: 'seeds', brand: 'NU', unit: '10 kg packet', price: 480, mrp: 520, stock: 50, image: '🌾', desc: 'High yielding wheat seed variety.' },
  { name: 'Paddy Seed Sona', cat: 'seeds', brand: 'Annapurna', unit: '5 kg packet', price: 350, mrp: 380, stock: 45, image: '🌾', desc: 'Fine grain paddy seed.' },
  { name: 'Hybrid Tomato Seed', cat: 'seeds', brand: 'US Agriseeds', unit: '10 g packet', price: 90, mrp: 110, stock: 80, image: '🍅', desc: 'Disease resistant hybrid tomato.' },
  { name: 'Bottle Gourd Seed', cat: 'seeds', brand: 'Mahyco', unit: '50 g packet', price: 120, mrp: 140, stock: 35, image: '🥒', desc: 'Vigorous bottle gourd (lauki) seeds.' },
  { name: 'Mustard Seed', cat: 'seeds', brand: 'Pioneer', unit: '1 kg packet', price: 160, mrp: 180, stock: 4, image: '🌻', desc: 'Oilseed mustard, high oil content.' },
  { name: 'Imidacloprid 17.8% SL', cat: 'pesticides', brand: 'Bayer', unit: '250 ml', price: 320, mrp: 360, stock: 22, image: '🧴', desc: 'Systemic insecticide for sucking pests.' },
  { name: 'Mancozeb 75% WP', cat: 'pesticides', brand: 'Indofil', unit: '500 g', price: 240, mrp: 270, stock: 28, image: '🧴', desc: 'Broad spectrum fungicide.' },
  { name: 'Glyphosate 41% SL', cat: 'pesticides', brand: 'UPL', unit: '1 litre', price: 410, mrp: 450, stock: 3, image: '🧴', desc: 'Non-selective systemic herbicide.' },
  { name: 'YaraVita Micronutrient', cat: 'nutrients', brand: 'Yara', unit: '500 ml', price: 380, mrp: 420, stock: 30, image: '🌿', desc: 'Foliar micronutrient mix.' },
  { name: 'Sagarika Liquid', cat: 'nutrients', brand: 'IFFCO', unit: '1 litre', price: 290, mrp: 320, stock: 26, image: '🌿', desc: 'Bio-stimulant for better growth.' },
  { name: 'Knapsack Sprayer 16L', cat: 'tools', brand: 'Neptune', unit: 'piece', price: 1250, mrp: 1450, stock: 12, image: '🛠️', desc: 'Manual backpack sprayer.' },
  { name: 'Hand Weeder', cat: 'tools', brand: 'Falcon', unit: 'piece', price: 220, mrp: 260, stock: 20, image: '🛠️', desc: 'Durable steel hand weeder.' },
];

async function main() {
  await init();

  for (const c of categories) {
    await run('INSERT OR IGNORE INTO categories (name, slug, icon) VALUES (?, ?, ?)', [c.name, c.slug, c.icon]);
  }

  const existing = await get('SELECT COUNT(*) AS c FROM products');
  if (Number(existing.c) === 0) {
    let i = 1;
    for (const p of products) {
      const cat = await get('SELECT id FROM categories WHERE slug = ?', [p.cat]);
      await run(
        `INSERT INTO products (name, description, category_id, brand, unit, price, mrp, stock, low_stock_at, image, sku, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [p.name, p.desc, cat ? cat.id : null, p.brand, p.unit, p.price, p.mrp, p.stock, 5, p.image, 'NKB-' + String(i++).padStart(4, '0')]
      );
    }
    console.log(`Seeded ${products.length} products.`);
  } else {
    console.log(`Products already exist (${existing.c}); skipping product seed.`);
  }

  const adminUser = process.env.ADMIN_USERNAME || 'admin';
  const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
  const hasAdmin = await get('SELECT COUNT(*) AS c FROM admins');
  if (Number(hasAdmin.c) === 0) {
    const hash = bcrypt.hashSync(adminPass, 10);
    await run('INSERT INTO admins (username, password_hash) VALUES (?, ?)', [adminUser, hash]);
    console.log(`Created admin user "${adminUser}" (password: "${adminPass}").`);
  } else {
    console.log('Admin already exists; skipping.');
  }

  console.log('Seed complete.');
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
