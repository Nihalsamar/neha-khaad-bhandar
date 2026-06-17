/* ============================================================
   Neha Khaad Bhandar — storefront logic
   ============================================================ */
const state = {
  products: [],
  categories: [],
  cart: JSON.parse(localStorage.getItem('nkb_cart') || '{}'), // { id: qty }
  activeCat: '',
  search: '',
};

const $ = (id) => document.getElementById(id);
const rupee = (n) => '₹' + Number(n).toLocaleString('en-IN');

/* ----------------------------- Data ----------------------------- */
async function loadCategories() {
  const res = await fetch('/api/categories');
  state.categories = await res.json();
  renderCatBar();
}

async function loadProducts() {
  const grid = $('productGrid');
  grid.innerHTML = Array(8).fill('<div class="skeleton"></div>').join('');
  const params = new URLSearchParams();
  if (state.activeCat) params.set('category', state.activeCat);
  if (state.search) params.set('q', state.search);
  const res = await fetch('/api/products?' + params.toString());
  state.products = await res.json();
  renderProducts();
}

/* ----------------------------- Render ----------------------------- */
function renderCatBar() {
  const bar = $('catBar');
  const chips = [`<button class="cat-chip ${!state.activeCat ? 'active' : ''}" data-slug="">🏪 All</button>`];
  for (const c of state.categories) {
    chips.push(
      `<button class="cat-chip ${state.activeCat === c.slug ? 'active' : ''}" data-slug="${c.slug}">${c.icon} ${c.name}</button>`
    );
  }
  bar.innerHTML = chips.join('');
  bar.querySelectorAll('.cat-chip').forEach((chip) =>
    chip.addEventListener('click', () => {
      state.activeCat = chip.dataset.slug;
      const cat = state.categories.find((c) => c.slug === state.activeCat);
      $('listTitle').textContent = cat ? cat.name : 'All Products';
      renderCatBar();
      loadProducts();
    })
  );
}

function renderProducts() {
  const grid = $('productGrid');
  if (!state.products.length) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><div class="ico">🔍</div><p>No products found.</p></div>`;
    return;
  }
  grid.innerHTML = state.products
    .map((p) => {
      const out = p.stock <= 0;
      const low = !out && p.stock <= p.low_stock_at;
      const discount = p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
      return `
        <div class="card">
          <div class="thumb">
            ${out ? '<span class="badge out">Out of stock</span>' : discount ? `<span class="badge">${discount}% OFF</span>` : ''}
            ${p.image && p.image.startsWith('http') ? `<img src="${p.image}" alt="${p.name}" style="height:100%;object-fit:cover;width:100%">` : `<span>${p.image || '📦'}</span>`}
          </div>
          <div class="body">
            <span class="brand-tag">${p.brand || p.category_name || ''}</span>
            <h4>${p.name}</h4>
            <span class="unit">${p.unit}${low ? ` · only ${p.stock} left` : ''}</span>
            <div class="price-row">
              <span class="price">${rupee(p.price)}</span>
              ${discount ? `<span class="mrp">${rupee(p.mrp)}</span>` : ''}
            </div>
            <button class="add" data-id="${p.id}" ${out ? 'disabled' : ''}>
              ${out ? 'Unavailable' : '+ Add to Cart'}
            </button>
          </div>
        </div>`;
    })
    .join('');
  grid.querySelectorAll('.add').forEach((btn) =>
    btn.addEventListener('click', () => addToCart(Number(btn.dataset.id)))
  );
}

/* ----------------------------- Cart ----------------------------- */
function saveCart() {
  localStorage.setItem('nkb_cart', JSON.stringify(state.cart));
  updateCartCount();
}
function updateCartCount() {
  const count = Object.values(state.cart).reduce((a, b) => a + b, 0);
  $('cartCount').textContent = count;
}
function findProduct(id) {
  return state.products.find((p) => p.id === id);
}

function addToCart(id) {
  const p = findProduct(id);
  if (!p) return;
  const current = state.cart[id] || 0;
  if (current + 1 > p.stock) return toast('No more stock available', true);
  state.cart[id] = current + 1;
  saveCart();
  toast(`${p.name} added to cart`);
  if ($('cartDrawer').classList.contains('show')) renderCart();
}

async function renderCart() {
  // We need product details for items that may not be in current filtered list
  const ids = Object.keys(state.cart);
  const wrap = $('cartItems');
  if (!ids.length) {
    wrap.innerHTML = `<div class="empty"><div class="ico">🛒</div><p>Your cart is empty.</p></div>`;
    $('cartTotal').textContent = rupee(0);
    $('checkoutBtn').disabled = true;
    return;
  }
  $('checkoutBtn').disabled = false;

  // Fetch any missing products
  const products = {};
  for (const id of ids) {
    let p = findProduct(Number(id));
    if (!p) {
      try { p = await (await fetch('/api/products/' + id)).json(); } catch { p = null; }
    }
    if (p && !p.error) products[id] = p;
    else { delete state.cart[id]; }
  }
  saveCart();

  let total = 0;
  wrap.innerHTML = Object.entries(state.cart)
    .map(([id, qty]) => {
      const p = products[id];
      if (!p) return '';
      const line = p.price * qty;
      total += line;
      const img = p.image && p.image.startsWith('http')
        ? `<img src="${p.image}" style="width:46px;height:46px;border-radius:8px;object-fit:cover">`
        : `<div class="ico">${p.image || '📦'}</div>`;
      return `
        <div class="cart-item">
          ${img}
          <div class="info">
            <h5>${p.name}</h5>
            <div class="u">${p.unit} · ${rupee(p.price)}</div>
            <div class="qty" data-id="${id}">
              <button class="dec">−</button><span>${qty}</span><button class="inc">+</button>
            </div>
            <button class="remove" data-rm="${id}">Remove</button>
          </div>
          <div class="line-price">${rupee(line)}</div>
        </div>`;
    })
    .join('');
  $('cartTotal').textContent = rupee(total);

  wrap.querySelectorAll('.qty').forEach((q) => {
    const id = q.dataset.id;
    q.querySelector('.inc').addEventListener('click', () => changeQty(id, 1, products[id]));
    q.querySelector('.dec').addEventListener('click', () => changeQty(id, -1, products[id]));
  });
  wrap.querySelectorAll('[data-rm]').forEach((b) =>
    b.addEventListener('click', () => { delete state.cart[b.dataset.rm]; saveCart(); renderCart(); })
  );
}

function changeQty(id, delta, product) {
  const next = (state.cart[id] || 0) + delta;
  if (next <= 0) { delete state.cart[id]; }
  else if (product && next > product.stock) { return toast('Reached available stock', true); }
  else { state.cart[id] = next; }
  saveCart();
  renderCart();
}

function cartTotalValue() {
  return Object.entries(state.cart).reduce((sum, [id, qty]) => {
    const p = findProduct(Number(id));
    return sum + (p ? p.price * qty : 0);
  }, 0);
}

/* ----------------------------- Checkout ----------------------------- */
async function placeOrder() {
  const customer_name = $('cName').value.trim();
  const phone = $('cPhone').value.trim();
  const address = $('cAddress').value.trim();
  if (!customer_name || !phone || !address) return toast('Please fill all fields', true);
  if (!/^\d{10}$/.test(phone)) return toast('Enter a valid 10-digit phone', true);

  const items = Object.entries(state.cart).map(([id, qty]) => ({ id: Number(id), qty }));
  if (!items.length) return toast('Cart is empty', true);

  $('placeOrderBtn').disabled = true;
  $('placeOrderBtn').textContent = 'Placing...';
  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_name, phone, address, items }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not place order');
    // success
    state.cart = {};
    saveCart();
    $('checkoutForm').style.display = 'none';
    $('checkoutSuccess').style.display = 'block';
    $('successOrderNo').textContent = data.order_no;
  } catch (e) {
    toast(e.message, true);
  } finally {
    $('placeOrderBtn').disabled = false;
    $('placeOrderBtn').textContent = 'Place Order';
  }
}

/* ----------------------------- UI helpers ----------------------------- */
function openDrawer() { $('overlay').classList.add('show'); $('cartDrawer').classList.add('show'); renderCart(); }
function closeDrawer() { $('overlay').classList.remove('show'); $('cartDrawer').classList.remove('show'); closeModal(); }
function openModal() {
  $('checkoutForm').style.display = 'block';
  $('checkoutSuccess').style.display = 'none';
  $('modalTotal').textContent = rupee(cartTotalValue());
  $('overlay').classList.add('show');
  $('checkoutModal').classList.add('show');
}
function closeModal() { $('checkoutModal').classList.remove('show'); }

let toastTimer;
function toast(msg, isErr = false) {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'toast show' + (isErr ? ' err' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = 'toast'), 2400);
}

/* ----------------------------- Events ----------------------------- */
$('openCart').addEventListener('click', openDrawer);
$('closeCart').addEventListener('click', closeDrawer);
$('overlay').addEventListener('click', closeDrawer);
$('checkoutBtn').addEventListener('click', () => { $('cartDrawer').classList.remove('show'); openModal(); });
$('cancelCheckout').addEventListener('click', () => { closeModal(); openDrawer(); });
$('placeOrderBtn').addEventListener('click', placeOrder);
$('doneBtn').addEventListener('click', () => { closeDrawer(); });

let searchTimer;
$('searchInput').addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { state.search = e.target.value.trim(); loadProducts(); }, 300);
});

$('year').textContent = new Date().getFullYear();

/* ----------------------------- Init ----------------------------- */
(async function init() {
  updateCartCount();
  await loadCategories();
  await loadProducts();
})();
