// Creates the database, tables, an admin user and sample products with real photos.
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const U = id => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=80`;
const products = [
  ['Wireless Headphones', 'Over-ear Bluetooth headphones with deep bass and 30h battery.', 129.99, 'Electronics', U('1505740420928-5e560c06d30e'), 25],
  ['Classic Wrist Watch', 'Minimal stainless steel watch with leather strap.', 189.0, 'Accessories', U('1523275335684-37898b6baf30'), 12],
  ['Running Sneakers', 'Lightweight breathable running shoes for daily training.', 99.5, 'Fashion', U('1542291026-7eec264c27ff'), 40],
  ['Aviator Sunglasses', 'UV400 polarized sunglasses with metal frame.', 59.0, 'Accessories', U('1572635196237-14b3f281503f'), 30],
  ['Travel Backpack', 'Water-resistant 25L backpack with laptop compartment.', 74.9, 'Fashion', U('1553062407-98eeb64c6a62'), 18],
  ['Mirrorless Camera', '24MP mirrorless camera with 4K video.', 749.0, 'Electronics', U('1526170375885-4d8ecf77b99f'), 6],
  ['Smart Watch', 'Fitness tracking, heart rate and notifications.', 159.0, 'Electronics', U('1546868871-7041f2a55e12'), 20],
  ['Casual Sneakers', 'Everyday low-top sneakers in premium canvas.', 69.0, 'Fashion', U('1491553895911-0055eca6402d'), 35]
];

(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  });
  const db = process.env.DB_NAME || 'store_db';
  await c.query(`CREATE DATABASE IF NOT EXISTS \`${db}\`; USE \`${db}\`;
  CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE, password VARCHAR(255) NOT NULL,
    role ENUM('user','admin') NOT NULL DEFAULT 'user', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(150) NOT NULL, description TEXT,
    price DECIMAL(10,2) NOT NULL, category VARCHAR(60) NOT NULL DEFAULT 'General',
    image VARCHAR(500), stock INT NOT NULL DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS favorites (
    user_id INT NOT NULL, product_id INT NOT NULL, PRIMARY KEY (user_id, product_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS wishlist (
    user_id INT NOT NULL, product_id INT NOT NULL, PRIMARY KEY (user_id, product_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS reviews (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, product_id INT NOT NULL,
    rating TINYINT NOT NULL, comment TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY one_review (user_id, product_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, total DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'paid', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id));
  CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY, order_id INT NOT NULL, product_id INT NOT NULL,
    quantity INT NOT NULL, price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id));`);

  const email = process.env.ADMIN_EMAIL || 'admin@store.com';
  const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin123!', 10);
  await c.query('INSERT IGNORE INTO users (name,email,password,role) VALUES (?,?,?,?)', ['Admin', email, hash, 'admin']);

  const [[{ n }]] = await c.query('SELECT COUNT(*) n FROM products');
  if (n === 0) await c.query('INSERT INTO products (name,description,price,category,image,stock) VALUES ?', [products]);

  console.log('Database ready. Admin login:', email);
  await c.end();
})().catch(e => { console.error('Setup failed:', e.message); process.exit(1); });
