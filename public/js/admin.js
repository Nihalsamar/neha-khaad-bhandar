/* ============================================================
   Neha Khaad Bhandar — admin panel logic
   ============================================================ */
const $ = (id) => document.getElementById(id);
const rupee = (n) => '₹' + Number(n).toLocaleString('en-IN');
const api = async (url, opts = {}) => {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error((data && data.error) || 'Request failed');
  return data;
};

let categories = [];
let allProducts = [];

/* ----------------------------- Auth ----------------------------- */
async function checkAuth() {
  try {
    const me = await api('/api/auth/me');
    showApp(me.username);
  } catch {
    $('loginView').style.display = 'grid';
    $('appView').style.display = 'none';
  }
}

async function login() {
  const username = $('loginUser').value.trim();
  const password = $('loginPass').value;
  if (!username || !password) return toast('Enter username and password', true);
  $('loginBtn').disabled = true;
  try {
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    showApp(data.username);
  } catch (e) {
    toast(e.message, true);
  } finally {
    $('loginBtn').disabled = false;
  }
}

async function logout() {
  await api('/api/auth/logout', { method: 'POST' });
  location.reload();
}

function showApp(username) {
  $('loginView').style.display = 'none';
  $('appView').style.display = 'flex';
  $('whoAmI').textContent = username;
  loadCategories().then(loadDashboard);
}

/* ----------------------------- Tabs ----------------------------- */
document.querySelectorAll('.nav-item').forEach((btn) =>
  btn.addEventListener('click', () => switchTab(btn.dataset.tab))
);
function switchTab(tab) {
  document.querySelectorAll('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab').forEach((s) => (s.style.display = 'none'));
  $('tab-' + tab).style.display = 'block';
  const titles = { dashboard: 'Dashboard', products: 'Products', inventory: 'Inventory', orders: 'Orders' };
  $('tabTitle').textContent = titles[tab];
  if (tab === 'dashboard') loadDashboard();
  if (tab === 'products') loadProducts();
  if (tab === 'inventory') loadInventory();
  if (tab === 'orders') loadOrders();
}

/* ----------------------------- Dashboard ----------------------------- */
async function loadDashboard() {
  const s = await api('/api/admin/stats');
  $('statGrid').innerHTML = `
    <div class="stat"><div class="label">Total Products</div><div class="value">${s.totalProducts}</div></div>
    <div class="stat warn"><div class="label">Low Stock Items</div><div class="value">${s.lowStock}</div></div>
    <div class="stat danger"><div class="label">Out of Stock</div><div class="value">${s.outOfStock}</div></div>
    <div class="stat"><div class="label">New Orders</div><div class="value">${s.newOrders}</div></div>
    <div class="stat"><div class="label">Total Orders</div><div class="value">${s.totalOrders}</div></div>
    <div class="stat"><div class="label">Order Revenue</div><div class="value">${rupee(Math.round(s.revenue))}</div></div>
    <div class="stat"><div class="label">Stock Value</div><div class="value">${rupee(Math.round(s.stockValue))}</div></div>`;

  const products = await api('/api/admin/products');
  const low = products.filter((p) => p.stock <= p.low_stock_at);
  $('lowStockList').innerHTML = low.length
    ? `<div class="table-wrap"><table><thead><tr><th>Product</th><th>Stock</th><th>Status</th></tr></thead><tbody>${low
        .map(
          (p) => `<tr><td>${p.image || '📦'} ${p.name}</td><td>${p.stock} ${p.unit}</td><td>${stockPill(p)}</td></tr>`
        )
        .join('')}</tbody></table></div>`
    : '<p class="muted">All products are well stocked. 👍</p>';
}

function stockPill(p) {
  if (p.stock <= 0) return '<span class="pill-tag pill-out">Out of stock</span>';
  if (p.stock <= p.low_stock_at) return '<span class="pill-tag pill-low">Low</span>';
  return '<span class="pill-tag pill-ok">In stock</span>';
}

/* ----------------------------- Categories ----------------------------- */
async function loadCategories() {
  categories = await api('/api/admin/categories');
  $('pCategory').innerHTML =
    '<option value="">— none —</option>' +
    categories.map((c) => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
}

/* ----------------------------- Products ----------------------------- */
async function loadProducts() {
  allProducts = await api('/api/admin/products');
  renderProductTable(allProducts);
}
function renderProductTable(list) {
  const tbody = $('productTable').querySelector('tbody');
  if (!list.length) { tbody.innerHTML = '<tr><td colspan="5" class="muted">No products.</td></tr>'; return; }
  tbody.innerHTML = list
    .map(
      (p) => `
      <tr>
        <td><div class="prod-cell"><span class="ic">${imgCell(p)}</span><div><div class="nm">${p.name}</div><div class="br">${p.brand || ''} · ${p.unit}</div></div></div></td>
        <td>${p.category_name || '-'}</td>
        <td><b>${rupee(p.price)}</b>${p.mrp > p.price ? `<br><small class="muted" style="text-decoration:line-through">${rupee(p.mrp)}</small>` : ''}</td>
        <td>${p.stock} ${stockPill(p)}</td>
        <td>
          <button class="icon-btn" data-edit="${p.id}" title="Edit">✏️</button>
          <button class="icon-btn del" data-del="${p.id}" title="Delete">🗑️</button>
        </td>
      </tr>`
    )
    .join('');
  tbody.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => openProductModal(Number(b.dataset.edit))));
  tbody.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => deleteProduct(Number(b.dataset.del))));
}
function imgCell(p) {
  return p.image && p.image.startsWith('http')
    ? `<img src="${p.image}" style="width:32px;height:32px;border-radius:6px;object-fit:cover">`
    : (p.image || '📦');
}

$('prodSearch').addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  renderProductTable(allProducts.filter((p) => (p.name + p.brand + (p.category_name || '')).toLowerCase().includes(q)));
});

/* ----- Product modal ----- */
function openProductModal(id) {
  const p = id ? allProducts.find((x) => x.id === id) : null;
  $('prodModalTitle').textContent = p ? 'Edit Product' : 'Add Product';
  $('pId').value = p ? p.id : '';
  $('pName').value = p ? p.name : '';
  $('pCategory').value = p ? p.category_id || '' : '';
  $('pBrand').value = p ? p.brand : '';
  $('pUnit').value = p ? p.unit : '';
  $('pImage').value = p ? p.image : '📦';
  $('pPrice').value = p ? p.price : '';
  $('pMrp').value = p ? p.mrp : '';
  $('pStock').value = p ? p.stock : 0;
  $('pLow').value = p ? p.low_stock_at : 5;
  $('pSku').value = p ? p.sku : '';
  $('pDesc').value = p ? p.description : '';
  $('adminOverlay').classList.add('show');
  $('productModal').classList.add('show');
}
function closeProductModal() {
  $('adminOverlay').classList.remove('show');
  $('productModal').classList.remove('show');
}
async function saveProduct() {
  const id = $('pId').value;
  const body = {
    name: $('pName').value.trim(),
    category_id: $('pCategory').value ? Number($('pCategory').value) : null,
    brand: $('pBrand').value.trim(),
    unit: $('pUnit').value.trim() || 'unit',
    image: $('pImage').value.trim() || '📦',
    price: Number($('pPrice').value) || 0,
    mrp: Number($('pMrp').value) || Number($('pPrice').value) || 0,
    stock: parseInt($('pStock').value, 10) || 0,
    low_stock_at: parseInt($('pLow').value, 10) || 5,
    sku: $('pSku').value.trim(),
    description: $('pDesc').value.trim(),
  };
  if (!body.name) return toast('Product name is required', true);
  try {
    if (id) await api('/api/admin/products/' + id, { method: 'PUT', body: JSON.stringify(body) });
    else await api('/api/admin/products', { method: 'POST', body: JSON.stringify(body) });
    toast('Product saved');
    closeProductModal();
    loadProducts();
  } catch (e) { toast(e.message, true); }
}
async function deleteProduct(id) {
  if (!confirm('Remove this product from the store?')) return;
  await api('/api/admin/products/' + id, { method: 'DELETE' });
  toast('Product removed');
  loadProducts();
}

/* ----------------------------- Inventory ----------------------------- */
async function loadInventory() {
  const products = await api('/api/admin/products');
  const tbody = $('invTable').querySelector('tbody');
  tbody.innerHTML = products
    .map(
      (p) => `
      <tr data-id="${p.id}">
        <td><div class="prod-cell"><span class="ic">${imgCell(p)}</span><div class="nm">${p.name}</div></div></td>
        <td>${p.sku || '-'}</td>
        <td class="cur"><b>${p.stock}</b> ${p.unit}</td>
        <td>
          <div class="stock-adjust">
            <button data-delta="-1">−</button>
            <input type="number" class="setval" value="${p.stock}" min="0" />
            <button data-delta="1">+</button>
            <button class="set" title="Set">✔</button>
          </div>
        </td>
        <td class="stat-cell">${stockPill(p)}</td>
      </tr>`
    )
    .join('');

  tbody.querySelectorAll('tr').forEach((tr) => {
    const id = Number(tr.dataset.id);
    const input = tr.querySelector('.setval');
    tr.querySelectorAll('[data-delta]').forEach((b) =>
      b.addEventListener('click', () => adjustStock(id, { delta: Number(b.dataset.delta) }, tr, input))
    );
    tr.querySelector('.set').addEventListener('click', () =>
      adjustStock(id, { set: parseInt(input.value, 10) || 0 }, tr, input)
    );
  });
}
async function adjustStock(id, payload, tr, input) {
  try {
    const p = await api('/api/admin/products/' + id + '/stock', { method: 'PATCH', body: JSON.stringify(payload) });
    tr.querySelector('.cur').innerHTML = `<b>${p.stock}</b> ${p.unit}`;
    input.value = p.stock;
    tr.querySelector('.stat-cell').innerHTML = stockPill(p);
    toast('Stock updated');
  } catch (e) { toast(e.message, true); }
}

/* ----------------------------- Orders ----------------------------- */
async function loadOrders() {
  const status = $('orderFilter').value;
  const orders = await api('/api/admin/orders' + (status ? '?status=' + status : ''));
  const wrap = $('ordersList');
  if (!orders.length) { wrap.innerHTML = '<p class="muted">No orders found.</p>'; return; }
  wrap.innerHTML = orders
    .map((o) => {
      const items = o.items
        .map((it) => `<div class="li"><span>${it.product_name} × ${it.qty}</span><span>${rupee(it.price * it.qty)}</span></div>`)
        .join('');
      const opts = ['NEW', 'CONFIRMED', 'DELIVERED', 'CANCELLED']
        .map((s) => `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s}</option>`)
        .join('');
      return `
        <div class="order-card">
          <div class="order-head">
            <span class="ono">#${o.order_no}</span>
            <span class="muted">${new Date(o.created_at + 'Z').toLocaleString('en-IN')}</span>
          </div>
          <div class="order-meta">👤 ${o.customer_name} · 📞 ${o.phone}<br>📍 ${o.address}</div>
          <div class="order-items-list">${items}</div>
          <div class="order-foot">
            <span class="tot">Total: ${rupee(o.total)}</span>
            <select class="status-select st-${o.status}" data-order="${o.id}">${opts}</select>
          </div>
        </div>`;
    })
    .join('');
  wrap.querySelectorAll('.status-select').forEach((sel) =>
    sel.addEventListener('change', async () => {
      try {
        await api('/api/admin/orders/' + sel.dataset.order + '/status', {
          method: 'PATCH',
          body: JSON.stringify({ status: sel.value }),
        });
        toast('Order updated');
        loadOrders();
      } catch (e) { toast(e.message, true); }
    })
  );
}
$('orderFilter').addEventListener('change', loadOrders);

/* ----------------------------- Toast ----------------------------- */
let toastTimer;
function toast(msg, isErr = false) {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'toast show' + (isErr ? ' err' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = 'toast'), 2400);
}

/* ----------------------------- Change password ----------------------------- */
function openPwModal() {
  $('curPw').value = '';
  $('newPw').value = '';
  $('confirmPw').value = '';
  $('adminOverlay').classList.add('show');
  $('passwordModal').classList.add('show');
}
function closePwModal() {
  $('adminOverlay').classList.remove('show');
  $('passwordModal').classList.remove('show');
}
async function savePassword() {
  const currentPassword = $('curPw').value;
  const newPassword = $('newPw').value;
  const confirmPassword = $('confirmPw').value;
  if (!currentPassword || !newPassword) return toast('Fill all fields', true);
  if (newPassword.length < 6) return toast('New password must be at least 6 characters', true);
  if (newPassword !== confirmPassword) return toast('New passwords do not match', true);
  $('savePwBtn').disabled = true;
  try {
    await api('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    toast('Password updated successfully');
    closePwModal();
  } catch (e) {
    toast(e.message, true);
  } finally {
    $('savePwBtn').disabled = false;
  }
}

/* ----------------------------- Events ----------------------------- */
$('loginBtn').addEventListener('click', login);
$('loginPass').addEventListener('keydown', (e) => e.key === 'Enter' && login());
$('logoutBtn').addEventListener('click', logout);
$('changePwBtn').addEventListener('click', openPwModal);
$('savePwBtn').addEventListener('click', savePassword);
$('closePwModal').addEventListener('click', closePwModal);
$('addProductBtn').addEventListener('click', () => openProductModal(null));
$('saveProductBtn').addEventListener('click', saveProduct);
$('closeProductModal').addEventListener('click', closeProductModal);
$('adminOverlay').addEventListener('click', () => { closeProductModal(); closePwModal(); });

checkAuth();
