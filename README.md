# Store — E-Commerce Website

A full-stack online store built with **Node.js, Express and MySQL**, with a plain HTML/CSS/JavaScript frontend.

## Features

- Product list with search, category filter and sorting
- Grid / list view and dark / light mode
- Register and login (JWT) with two roles: user and admin
- Shopping cart and checkout (the payment form is a demo; no real payment)
- Orders saved in MySQL, with order history for each user
- Favorites, wishlist and star-rating reviews
- Admin page: add, edit and delete products, upload product images, view all orders

## Technologies

- Node.js and Express (backend)
- MySQL with the `mysql2` package (database)
- JSON Web Tokens and `bcryptjs` (login and passwords)
- Multer (image upload)
- HTML, CSS and JavaScript (frontend)

## How to run

1. Install [Node.js](https://nodejs.org) and MySQL, and make sure MySQL is running.
2. Install the packages:
   ```
   npm install
   ```
3. Copy `.env.example` to `.env` and write your MySQL password:
   ```
   PORT=3000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=store_db
   JWT_SECRET=any_long_random_text
   ADMIN_EMAIL=admin@store.com
   ADMIN_PASSWORD=Admin123!
   ```
4. Create the database, tables, admin account and sample products:
   ```
   npm run setup
   ```
5. Start the server:
   ```
   npm start
   ```
6. Open http://localhost:3000

## Admin

Log in with `admin@store.com` / `Admin123!` (or the values in your `.env`), then click **Admin** in the header, or open `/admin.html`.

## Project files

```
server.js      Express server and API routes
setup.js       Creates the database, tables and sample data
db.js          MySQL connection
public/        Frontend (index.html, admin.html, app.js, common.js, style.css)
uploads/       Images uploaded from the admin page
```

## Database tables

`users`, `products`, `orders`, `order_items`, `reviews`, `favorites`, `wishlist`

## Author

Rita Magdy
## 👩‍💻 Author

**Rita Magdy** — aspiring backend engineer

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Rita%20Magdy-0A66C2?logo=linkedin&logoColor=white)](https://www.linkedin.com/in/rita-magdy-033054268/)
[![GitHub](https://img.shields.io/badge/GitHub-ritamagdy22-181717?logo=github&logoColor=white)](https://github.com/ritamagdy22)

---

<div align="center">⭐ If you found this project useful, consider giving it a star!</div>


<img width="1906" height="902" alt="image" src="https://github.com/user-attachments/assets/94aaf578-1fa7-4f5b-9dbd-ece519d1337a" />


<img width="1907" height="907" alt="image" src="https://github.com/user-attachments/assets/d794a459-0c7f-4dd9-ae99-4eb448507976" />




https://github.com/user-attachments/assets/38413fb9-570e-4b65-b582-1d711df46544



## 👩‍💻 Author

**Rita Magdy** — aspiring backend engineer

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Rita%20Magdy-0A66C2?logo=linkedin&logoColor=white)](https://www.linkedin.com/in/rita-magdy-033054268/)
[![GitHub](https://img.shields.io/badge/GitHub-ritamagdy22-181717?logo=github&logoColor=white)](https://github.com/ritamagdy22)

---

<div align="center">⭐ If you found this project useful, consider giving it a star!</div>
