# Store — Full-Stack E-Commerce Application

A full-stack online store built with **Node.js, Express, MySQL** and a vanilla JavaScript frontend.

## Features
- Product catalog with **real-time search**, category filter, sorting, **grid/list toggle** and **dark/light mode**
- **JWT authentication** with role-based access (admin / user), bcrypt-hashed passwords
- Shopping cart, checkout with **transactional stock handling** (MySQL transactions + row locks); payment form is a demo UI
- **Admin dashboard** with full product CRUD, image upload (Multer) and an orders overview
- **Favorites, wishlist** and **star-rating reviews**

## Tech stack
Node.js · Express · MySQL (mysql2) · JWT · bcrypt · Multer · HTML/CSS/JavaScript

## Run locally
1. Install [Node.js](https://nodejs.org) (18+) and MySQL, and make sure MySQL is running.
2. `npm install`
3. Copy `.env.example` to `.env` and fill in your MySQL password and a JWT secret.
4. `npm run setup` — creates the database, tables, an admin account and 8 sample products.
5. `npm start` — open http://localhost:3000

Admin login (from your `.env`): `admin@store.com` / `Admin123!` → then open **Admin** in the header.

## Project structure
```
server.js     Express API (auth, products, favorites, wishlist, reviews, orders)
setup.js      Creates DB + tables + seed data
db.js         MySQL connection pool
public/       Frontend (index.html, admin.html, app.js, style.css)
uploads/      Images uploaded from the admin panel
```
