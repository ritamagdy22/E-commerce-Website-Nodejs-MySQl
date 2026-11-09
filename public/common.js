const $ = (s, el = document) => el.querySelector(s);
const state = { token: localStorage.getItem('token'), user: JSON.parse(localStorage.getItem('user') || 'null') };
function applyTheme(t) { document.documentElement.dataset.theme = t; localStorage.setItem('theme', t); }
applyTheme(localStorage.getItem('theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
function toggleTheme() { applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'); }
async function api(url, opts = {}) {
  opts.headers = Object.assign({}, opts.headers);
  if (state.token) opts.headers.Authorization = 'Bearer ' + state.token;
  if (opts.body && !(opts.body instanceof FormData)) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(opts.body); }
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.style.display = 'block'; clearTimeout(t._t); t._t = setTimeout(() => t.style.display = 'none', 2600); }
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => '$' + Number(n).toFixed(2);
const stars = n => '★'.repeat(Math.round(n || 0)) + '☆'.repeat(5 - Math.round(n || 0));
const FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect width='100%25' height='100%25' fill='%23d1d5db'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' fill='%236b7280' font-family='sans-serif'%3ENo image%3C/text%3E%3C/svg%3E";
function logout() { localStorage.removeItem('token'); localStorage.removeItem('user'); location.href = '/'; }
