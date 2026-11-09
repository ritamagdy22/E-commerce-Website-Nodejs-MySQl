require('dotenv').config();
const path = require('path');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const pool = require('./db');

const app = express();
const SECRET = process.env.JWT_SECRET || 'dev_secret';
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, 'uploads'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname).toLowerCase())
  }),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, /^image\/(png|jpe?g|webp|gif)$/.test(file.mimetype))
});

const wrap = fn => (req, res) => fn(req, res).catch(e => { console.error(e); res.status(500).json({ error: 'Server error' }); });

function auth(required = true) {
  return (req, res, next) => {
    const h = req.headers.authorization || '';
    try { req.user = jwt.verify(h.replace('Bearer ', ''), SECRET); }
    catch { if (required) return res.status(401).json({ error: 'Please log in' }); }
    next();
  };
}
const admin = (req, res, next) => req.user.role === 'admin' ? next() : res.status(403).json({ error: 'Admins only' });
const token = u => jwt.sign({ id: u.id, name: u.name, role: u.role }, SECRET, { expiresIn: '7d' });

// ---------- Auth ----------
app.post('/api/auth/register', wrap(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !/^\S+@\S+\.\S+$/.test(email || '') || (password || '').length < 6)
    return res.status(400).json({ error: 'Valid name, email and a 6+ character password are required' });
  const [dup] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
  if (dup.length) return res.status(409).json({ error: 'Email already registered' });
  const [r] = await pool.query('INSERT INTO users (name,email,password) VALUES (?,?,?)', [name, email, await bcrypt.hash(password, 10)]);
  const u = { id: r.insertId, name, role: 'user' };
  res.json({ token: token(u), user: u });
}));

app.post('/api/auth/login', wrap(async (req, res) => {
  const { email, password } = req.body;
  const [rows] = await pool.query('SELECT * FROM users WHERE email=?', [email]);
  if (!rows.length || !(await bcrypt.compare(password || '', rows[0].password)))
    return res.status(401).json({ error: 'Wrong email or password' });
  const u = rows[0];
  res.json({ token: token(u), user: { id: u.id, name: u.name, role: u.role } });
}));

// ---------- Products ----------
app.get('/api/products', auth(false), wrap(async (req, res) => {
  const { q = '', category = '', sort = 'new' } = req.query;
  const order = { new: 'p.id DESC', low: 'p.price ASC', high: 'p.price DESC', rating: 'avg_rating DESC' }[sort] || 'p.id DESC';
  const uid = req.user ? req.user.id : 0;
  const [rows] = await pool.query(
    `SELECT p.*, ROUND(AVG(r.rating),1) avg_rating, COUNT(DISTINCT r.id) review_count,
       MAX(f.user_id IS NOT NULL) is_favorite, MAX(w.user_id IS NOT NULL) in_wishlist
     FROM products p
     LEFT JOIN reviews r ON r.product_id=p.id
     LEFT JOIN favorites f ON f.product_id=p.id AND f.user_id=?
     LEFT JOIN wishlist w ON w.product_id=p.id AND w.user_id=?
     WHERE (p.name LIKE ? OR p.description LIKE ?) AND (?='' OR p.category=?)
     GROUP BY p.id ORDER BY ${order}`,
    [uid, uid, `%${q}%`, `%${q}%`, category, category]);
  res.json(rows);
}));

app.get('/api/categories', wrap(async (req, res) => {
  const [rows] = await pool.query('SELECT DISTINCT category FROM products ORDER BY category');
  res.json(rows.map(r => r.category));
}));

app.get('/api/products/:id/reviews', wrap(async (req, res) => {
  const [rows] = await pool.query(
    'SELECT r.rating, r.comment, r.created_at, u.name FROM reviews r JOIN users u ON u.id=r.user_id WHERE r.product_id=? ORDER BY r.id DESC', [req.params.id]);
  res.json(rows);
}));

function productFields(req) {
  const { name, description, price, category, stock, imageUrl } = req.body;
  const image = req.file ? '/uploads/' + req.file.filename : (imageUrl || null);
  return { name, description, price: Number(price), category: category || 'General', stock: parseInt(stock || 0, 10), image };
}
const validProduct = p => p.name && p.price >= 0 && !Number.isNaN(p.price) && p.stock >= 0;

app.post('/api/products', auth(), admin, upload.single('image'), wrap(async (req, res) => {
  const p = productFields(req);
  if (!validProduct(p)) return res.status(400).json({ error: 'Name, price and stock are required' });
  const [r] = await pool.query('INSERT INTO products (name,description,price,category,image,stock) VALUES (?,?,?,?,?,?)',
    [p.name, p.description, p.price, p.category, p.image, p.stock]);
  res.json({ id: r.insertId });
}));

app.put('/api/products/:id', auth(), admin, upload.single('image'), wrap(async (req, res) => {
  const p = productFields(req);
  if (!validProduct(p)) return res.status(400).json({ error: 'Name, price and stock are required' });
  await pool.query('UPDATE products SET name=?,description=?,price=?,category=?,stock=?,image=COALESCE(?,image) WHERE id=?',
    [p.name, p.description, p.price, p.category, p.stock, p.image, req.params.id]);
  res.json({ ok: true });
}));

app.delete('/api/products/:id', auth(), admin, wrap(async (req, res) => {
  try { await pool.query('DELETE FROM products WHERE id=?', [req.params.id]); res.json({ ok: true }); }
  catch { res.status(409).json({ error: 'Product is part of existing orders and cannot be deleted. Set stock to 0 instead.' }); }
}));

// ---------- Favorites / Wishlist ----------
for (const table of ['favorites', 'wishlist']) {
  app.get(`/api/${table}`, auth(), wrap(async (req, res) => {
    const [rows] = await pool.query(`SELECT p.* FROM ${table} t JOIN products p ON p.id=t.product_id WHERE t.user_id=?`, [req.user.id]);
    res.json(rows);
  }));
  app.post(`/api/${table}/:productId`, auth(), wrap(async (req, res) => {
    const [r] = await pool.query(`DELETE FROM ${table} WHERE user_id=? AND product_id=?`, [req.user.id, req.params.productId]);
    if (!r.affectedRows) await pool.query(`INSERT INTO ${table} (user_id,product_id) VALUES (?,?)`, [req.user.id, req.params.productId]);
    res.json({ active: !r.affectedRows });
  }));
}

// ---------- Reviews ----------
app.post('/api/products/:id/reviews', auth(), wrap(async (req, res) => {
  const rating = parseInt(req.body.rating, 10);
  if (!(rating >= 1 && rating <= 5)) return res.status(400).json({ error: 'Rating must be 1-5' });
  await pool.query(
    'INSERT INTO reviews (user_id,product_id,rating,comment) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE rating=VALUES(rating), comment=VALUES(comment)',
    [req.user.id, req.params.id, rating, (req.body.comment || '').slice(0, 1000)]);
  res.json({ ok: true });
}));

// ---------- Orders (payment UI is simulated) ----------
app.post('/api/orders', auth(), wrap(async (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  if (!items.length) return res.status(400).json({ error: 'Cart is empty' });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    let total = 0; const lines = [];
    for (const it of items) {
      const qty = parseInt(it.quantity, 10);
      const [[p]] = await conn.query('SELECT id, price, stock FROM products WHERE id=? FOR UPDATE', [it.id]);
      if (!p || !(qty > 0) || p.stock < qty) throw new Error('Not enough stock for one of the items');
      total += Number(p.price) * qty; lines.push([p.id, qty, p.price]);
      await conn.query('UPDATE products SET stock=stock-? WHERE id=?', [qty, p.id]);
    }
    const [o] = await conn.query('INSERT INTO orders (user_id,total) VALUES (?,?)', [req.user.id, total.toFixed(2)]);
    await conn.query('INSERT INTO order_items (order_id,product_id,quantity,price) VALUES ?', [lines.map(l => [o.insertId, ...l])]);
    await conn.commit();
    res.json({ orderId: o.insertId, total });
  } catch (e) { await conn.rollback(); res.status(400).json({ error: e.message }); }
  finally { conn.release(); }
}));

app.get('/api/orders', auth(), wrap(async (req, res) => {
  const where = req.user.role === 'admin' ? '' : 'WHERE o.user_id=' + Number(req.user.id);
  const [rows] = await pool.query(
    `SELECT o.id, o.total, o.status, o.created_at, u.name customer,
       GROUP_CONCAT(CONCAT(p.name,' x',i.quantity) SEPARATOR ', ') items
     FROM orders o JOIN users u ON u.id=o.user_id
     JOIN order_items i ON i.order_id=o.id JOIN products p ON p.id=i.product_id
     ${where} GROUP BY o.id ORDER BY o.id DESC`);
  res.json(rows);
}));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Store running at http://localhost:${PORT}`));
