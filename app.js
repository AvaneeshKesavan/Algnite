const express = require('express');
const session = require('express-session');
const path = require('path');
const multer = require('multer');
const Database = require('better-sqlite3');

const app = express();
const port = 3000;

// Separate databases
const db = new Database("./data.db"); // for messages, booking
const usersDb = new Database("./users.db"); // for registration and authentication

// Middleware
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.use(session({ secret: 'yourSecretKey', resave: false, saveUninitialized: true }));

// File upload
const upload = multer({ dest: 'public/uploads/' });

app.use('/uploads', express.static(path.resolve('public/uploads')));

// Ensure messages and booking
db.prepare(`
  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT,
    message TEXT NOT NULL
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT,
    service TEXT,
    date TEXT,
    time TEXT,
    note TEXT
  )
`).run();

// Ensure users table with profilePicture
usersDb.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fullname TEXT,
    email TEXT UNIQUE,
    password TEXT,
    age INTEGER,
    gender TEXT,
    address TEXT,
    phone TEXT,
    profilePicture TEXT
  )
`).run();

// Home
app.get("/", (req, res) => {
  res.render("index", { user: req.session?.user });
});

// About / Services
app.get("/about", (req, res) => res.render("about", { user: req.session?.user }));
app.get("/services", (req, res) => res.render("services", { user: req.session?.user }));
app.get("/volunteer", (req, res) => res.render("volunteer", { user: req.session?.user }))

// Contact
app.get("/contact", (req, res) => {
  const success = req.session.success;
  delete req.session.success;
  res.render("contact", { user: req.session?.user, success });
});



// Handle contact form submission
app.post("/contact", (req, res) => {
  const { name, email, subject, message } = req.body;
  try {
    db.prepare(`INSERT INTO contacts (name, email, subject, message) VALUES (?, ?, ?, ?)`).
      run(name, email, subject, message);
    req.session.success = "Thank you for contacting us!";
  } catch (err) {
    req.session.success = "Something went wrong. Please try again.";
  }
  res.redirect("/contact");
});

// Authentication
app.get("/login", (req, res) => {
  const next = req.query.next || '';
  res.render("auth", { isLogin: true, error: null, user: null, next });
});

// Handle login
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const next = req.query.next || '/profile';

  const user = usersDb.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    return res.render('auth', { isLogin: true, error: 'Email not registered!', user: null, next });
  }
  if (user.password !== password) {
    return res.render('auth', { isLogin: true, error: 'Invalid password!', user: null, next });
  }
  req.session.user = user;
  res.redirect(next);
});

// Register
app.get("/register", (req, res) => {
  res.render("auth", { isLogin: false, error: null, user: null, next: '' });
});

// Handle registration
app.post("/register", (req, res) => {
  const { fullname, email, password, age, gender, address, phone } = req.body;

  if (!fullname || !email || !password || !phone) {
    return res.render('auth', { isLogin: false, error: 'Please fill in all required fields', user: null, next: '' });
  }
  if (password.length < 6) {
    return res.render('auth', { isLogin: false, error: 'Password must be at least 6 characters', user: null, next: '' });
  }

  try {
    usersDb.prepare(`
      INSERT INTO users (fullname, email, password, age, gender, address, phone)
      VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(fullname, email, password, age, gender, address, phone);

    const user = usersDb.prepare('SELECT * FROM users WHERE email = ?').get(email);
    req.session.user = user;
    res.redirect('/profile');
  } catch (err) {
    res.render('auth', { isLogin: false, error: 'Email already in use or something went wrong!', user: null, next: '' });
  }
});

// Profile view
app.get("/profile", (req, res) => {
  if (!req.session?.user) return res.redirect("/login");
  res.render("profile", { user: req.session?.user });
});

// Update profile
app.post("/profile/update", upload.single('profilePicture'), (req, res) => {
  if (!req.session?.user) return res.redirect("/login");

  const { fullname, age, gender, address, phone } = req.body;
  let profilePicture = req.session?.user?.profilePicture;

  if (req.file) {
    profilePicture = req.file.filename;
  }

  usersDb.prepare(`
    UPDATE users SET fullname = ?, age = ?, gender = ?, address = ?, phone = ?, profilePicture = ?
    WHERE id = ?
  `).run(fullname, age, gender, address, phone, profilePicture, req.session?.user?.id);

  req.session.user = usersDb.prepare('SELECT * FROM users WHERE id = ?').get(req.session?.user?.id);

  res.redirect('/profile');
});

// Book
app.get("/book", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login?next=/book");
  }
  const success = req.session.success;
  delete req.session.success;
  res.render("book", { user: req.session.user, success });
});

// Handle booking
app.post("/book", (req, res) => {
  const { name, email, service, date, time, note } = req.body;
  try {
    db.prepare(`
      INSERT INTO bookings (name, email, service, date, time, note) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(name, email, service, date, time, note);
    req.session.success = "Booking successful!";
  } catch (err) {
    req.session.success = "Booking failed. Please try again.";
  }
  res.redirect("/book");
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// Start
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
