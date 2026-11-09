let products = [], view = localStorage.getItem('view') || 'grid', mode = 'all', cart = JSON.parse(localStorage.getItem('cart') || '[]'), signup = false;
const openModal = id => $('#' + id).classList.add('open');
const closeModal = id => $('#' + id).classList.remove('open');
document.querySelectorAll('.modal').forEach(m => m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); }));

function renderHeader() {
  const a = $('#btnAuth');
  a.textContent = state.user ? `Logout (${state.user.name})` : 'Log in';
  a.onclick = state.user ? logout : () => openModal('authModal');
  $('#adminLink').style.display = state.user?.role === 'admin' ? '' : 'none';
  $('#cartCount').textContent = cart.reduce((s, i) => s + i.quantity, 0);
}
function switchAuth() {
  signup = !signup;
  $('#authTitle').textContent = signup ? 'Create account' : 'Log in';
  $('#aName').style.display = signup ? '' : 'none';
  $('#authSwitch').textContent = signup ? 'Have an account? Log in' : 'Need an account? Sign up';
}
async function submitAuth() {
  try {
    const body = { email: $('#aEmail').value, password: $('#aPass').value, name: $('#aName').value };
    const d = await api('/api/auth/' + (signup ? 'register' : 'login'), { method: 'POST', body });
    state.token = d.token; state.user = d.user;
    localStorage.setItem('token', d.token); localStorage.setItem('user', JSON.stringify(d.user));
    closeModal('authModal'); renderHeader(); load(); toast('Welcome, ' + d.user.name);
  } catch (e) { toast(e.message); }
}

async function loadCategories() {
  const cats = await api('/api/categories');
  $('#category').innerHTML = '<option value="">All categories</option>' + cats.map(c => `<option>${esc(c)}</option>`).join('');
}
async function load() {
  mode = 'all'; $('#title').textContent = '';
  const qs = new URLSearchParams({ q: $('#search').value, category: $('#category').value, sort: $('#sort').value });
  products = await api('/api/products?' + qs);
  render();
}
function render() {
  const box = $('#products');
  box.className = view;
  $('#viewToggle').textContent = view === 'grid' ? '☰ List' : '▦ Grid';
  if (!products.length) { box.innerHTML = '<p class="muted">No products found.</p>'; return; }
  box.innerHTML = products.map(p => `
    <div class="card">
      <div class="icons">
        <button class="${p.is_favorite ? 'on' : ''}" onclick="toggle('favorites',${p.id})" title="Favorite">♥</button>
        <button class="${p.in_wishlist ? 'on' : ''}" onclick="toggle('wishlist',${p.id})" title="Wishlist">★</button>
      </div>
      <img src="${esc(p.image || FALLBACK)}" alt="${esc(p.name)}" loading="lazy" onerror="this.onerror=null;this.src=FALLBACK" onclick="openProduct(${p.id})">
      <div class="body">
        <span class="tag">${esc(p.category)}</span>
        <h3>${esc(p.name)}</h3>
        <div class="stars">${stars(p.avg_rating)} <span class="muted">(${p.review_count})</span></div>
        <div class="muted">${esc((p.description || '').slice(0, 80))}</div>
        <div class="row between" style="margin-top:auto"><span class="price">${money(p.price)}</span>
          <button class="primary" ${p.stock < 1 ? 'disabled' : ''} onclick="addToCart(${p.id})">${p.stock < 1 ? 'Sold out' : 'Add'}</button></div>
      </div>
    </div>`).join('');
}
async function toggle(table, id) {
  if (!state.user) return toast('Please log in first'), openModal('authModal');
  const r = await api(`/api/${table}/${id}`, { method: 'POST' });
  toast(r.active ? 'Added to ' + table : 'Removed from ' + table);
  mode === 'all' ? load() : showSaved(mode);
}
async function showSaved(table) {
  if (!state.user) return toast('Please log in first'), openModal('authModal');
  mode = table; products = await api('/api/' + table);
  products = products.map(p => ({ ...p, review_count: 0, avg_rating: 0, is_favorite: table === 'favorites', in_wishlist: table === 'wishlist' }));
  $('#title').textContent = 'My ' + table; render();
}

// ----- Product details & reviews -----
async function openProduct(id) {
  const p = products.find(x => x.id === id);
  const revs = await api(`/api/products/${id}/reviews`);
  $('#productBox').innerHTML = `
    <img class="hero" src="${esc(p.image || FALLBACK)}" onerror="this.onerror=null;this.src=FALLBACK">
    <h2 style="margin:0">${esc(p.name)}</h2><span class="tag">${esc(p.category)}</span>
    <p>${esc(p.description)}</p>
    <div class="row between"><span class="price">${money(p.price)}</span><span class="muted">${p.stock} in stock</span></div>
    <button class="primary" ${p.stock < 1 ? 'disabled' : ''} onclick="addToCart(${p.id});closeModal('productModal')">Add to cart</button>
    <h3 style="margin-bottom:0">Reviews</h3>
    ${revs.map(r => `<div class="review"><span class="stars">${stars(r.rating)}</span> <b>${esc(r.name)}</b><div>${esc(r.comment)}</div></div>`).join('') || '<p class="muted">No reviews yet.</p>'}
    ${state.user ? `<div class="row"><select id="rRating">${[5, 4, 3, 2, 1].map(n => `<option value="${n}">${n} ★</option>`).join('')}</select>
      <input id="rComment" placeholder="Write a review…" style="flex:1"><button onclick="sendReview(${id})">Post</button></div>` : '<p class="muted">Log in to leave a review.</p>'}
    <button onclick="closeModal('productModal')">Close</button>`;
  openModal('productModal');
}
async function sendReview(id) {
  try { await api(`/api/products/${id}/reviews`, { method: 'POST', body: { rating: $('#rRating').value, comment: $('#rComment').value } });
    toast('Review saved'); await load(); openProduct(id); } catch (e) { toast(e.message); }
}

// ----- Cart & checkout -----
const saveCart = () => { localStorage.setItem('cart', JSON.stringify(cart)); renderHeader(); };
function addToCart(id) {
  const p = products.find(x => x.id === id); if (!p) return;
  const line = cart.find(i => i.id === id);
  if (line) { if (line.quantity < p.stock) line.quantity++; else return toast('No more stock'); }
  else cart.push({ id, name: p.name, price: Number(p.price), image: p.image, quantity: 1 });
  saveCart(); toast('Added to cart');
}
function openCart() {
  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  $('#cartBox').innerHTML = `<h3 style="margin:0">Your cart</h3>` + (cart.length ? cart.map(i => `
    <div class="row between"><span>${esc(i.name)}</span>
    <span class="row"><button onclick="qty(${i.id},-1)">−</button>${i.quantity}<button onclick="qty(${i.id},1)">+</button> ${money(i.price * i.quantity)}</span></div>`).join('') +
    `<div class="row between"><b>Total</b><b>${money(total)}</b></div>
     <button class="primary" onclick="checkoutForm()">Checkout</button>` : '<p class="muted">Cart is empty.</p>') +
    `<button onclick="closeModal('cartModal')">Close</button>`;
  openModal('cartModal');
}
function qty(id, d) { const l = cart.find(i => i.id === id); l.quantity += d; if (l.quantity < 1) cart = cart.filter(i => i.id !== id); saveCart(); openCart(); }
function checkoutForm() {
  if (!state.user) { closeModal('cartModal'); toast('Please log in to checkout'); return openModal('authModal'); }
  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  $('#cartBox').innerHTML = `<h3 style="margin:0">Payment</h3>
    <p class="muted">Demo payment form — no real card is charged or stored.</p>
    <input placeholder="Name on card"><input placeholder="4242 4242 4242 4242" maxlength="19"><div class="row"><input placeholder="MM/YY" style="flex:1"><input placeholder="CVC" style="flex:1"></div>
    <button class="primary" onclick="pay()">Pay ${money(total)}</button><button onclick="openCart()">Back</button>`;
}
async function pay() {
  try {
    const r = await api('/api/orders', { method: 'POST', body: { items: cart.map(i => ({ id: i.id, quantity: i.quantity })) } });
    cart = []; saveCart(); closeModal('cartModal'); toast(`Order #${r.orderId} placed!`); load();
  } catch (e) { toast(e.message); }
}
async function showOrders() {
  if (!state.user) return toast('Please log in first'), openModal('authModal');
  const o = await api('/api/orders');
  $('#infoBox').innerHTML = `<h3 style="margin:0">My orders</h3>` + (o.map(x => `<div class="review"><b>#${x.id}</b> · ${money(x.total)} · ${esc(x.status)}<div class="muted">${esc(x.items)}</div></div>`).join('') || '<p class="muted">No orders yet.</p>') + `<button onclick="closeModal('infoModal')">Close</button>`;
  openModal('infoModal');
}

// ----- wiring -----
let timer; $('#search').oninput = () => { clearTimeout(timer); timer = setTimeout(load, 250); };
$('#category').onchange = load; $('#sort').onchange = load;
$('#viewToggle').onclick = () => { view = view === 'grid' ? 'list' : 'grid'; localStorage.setItem('view', view); render(); };
renderHeader(); loadCategories(); load();
