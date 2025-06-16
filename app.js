const express = require('express');
const session = require('express-session');
const path = require('path');
const multer = require('multer');
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');

const app = express();
const port = 3000;

// Databases
const db = new Database("./data.db");
const usersDb = new Database("./users.db");

const ADMIN_EMAIL = 'admin@example.com';

// Middleware
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'yourSecretKey', resave: false, saveUninitialized: true }));

// File upload setup
const upload = multer({ dest: 'public/uploads/' });
app.use('/uploads', express.static(path.resolve('public/uploads')));

// Tables setup
db.prepare(`
  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT,
    message TEXT NOT NULL
)`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT,
    service TEXT,
    date TEXT,
    time TEXT,
    note TEXT,
    status TEXT DEFAULT 'pending'
)`).run();

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
)`).run();

// Clear flash messages
function clearFlash(req) {
  req.session.success = null;
  req.session.error = null;
}

// Routes
app.get("/", (req, res) => res.render("index", { user: req.session?.user }));

app.get("/about", (req, res) => res.render("about", { user: req.session?.user }));
app.get("/volunteer", (req, res) => res.render("volunteer", { user: req.session?.user }));
app.get("/services", (req, res) => res.render("services", { user: req.session?.user }));
app.get("/services/:type", (req, res) => res.render(req.params.type, { user: req.session?.user }));

// Contact
app.get("/contact", (req, res) => {
  const success = req.session.success;
  clearFlash(req);
  res.render("contact", { user: req.session?.user, success });
});

app.post("/contact", (req, res) => {
  const { name, email, subject, message } = req.body;
  try {
    db.prepare(`INSERT INTO contacts (name, email, subject, message) VALUES (?, ?, ?, ?)`)
      .run(name, email, subject, message);
    req.session.success = "Thank you for contacting us!";
  } catch (err) {
    req.session.success = "Something went wrong. Please try again.";
  }
  res.redirect("/contact");
});

// Auth pages
app.get("/login", (req, res) => {
  const error = req.session.error;
  req.session.error = null;
  res.render("auth", { isLogin: true, error, user: null, next: '', showForm: 'login' });
});

app.get("/register", (req, res) => {
  const error = req.session.error;
  req.session.error = null;
  res.render("auth", { isLogin: false, error, user: null, next: '', showForm: 'register' });
});

// Register
app.post("/register", async (req, res) => {
  const { fullname, email, password, age, gender, address, phone } = req.body;
  if (!fullname || !email || !password || !phone) {
    req.session.error = 'Please fill in all required fields';
    return res.redirect('/register');
  }
  if (password.length < 6) {
    req.session.error = 'Password must be at least 6 characters';
    return res.redirect('/register');
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    usersDb.prepare(`
      INSERT INTO users (fullname, email, password, age, gender, address, phone)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(fullname, email, hashedPassword, age, gender, address, phone);

    const user = usersDb.prepare('SELECT * FROM users WHERE email = ?').get(email);
    req.session.user = user;
    res.redirect('/profile');
  } catch (err) {
    req.session.error = 'Email already in use or something went wrong!';
    res.redirect('/register');
  }
});

// Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = usersDb.prepare('SELECT * FROM users WHERE email = ?').get(email);

  if (!user) {
    req.session.error = 'Email not registered!';
    return res.redirect('/login');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    req.session.error = 'Invalid password!';
    return res.redirect('/login');
  }

  req.session.user = user;
  if (email === ADMIN_EMAIL) {
    return res.redirect('/admin');
  }
  res.redirect('/profile');
});

// Profile
app.get("/profile", (req, res) => {
  if (!req.session?.user) return res.redirect("/login");
  res.render("profile", { user: req.session?.user });
});

app.post("/profile/update", upload.single('profilePicture'), (req, res) => {
  if (!req.session?.user) return res.redirect("/login");

  const { fullname, age, gender, address, phone } = req.body;
  let profilePicture = req.session.user.profilePicture;

  if (req.file) {
    profilePicture = req.file.filename;
  }

  usersDb.prepare(`
    UPDATE users SET fullname = ?, age = ?, gender = ?, address = ?, phone = ?, profilePicture = ?
    WHERE id = ?
  `).run(fullname, age, gender, address, phone, profilePicture, req.session.user.id);

  req.session.user = usersDb.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);
  res.redirect('/profile');
});

// Booking
app.get("/book", (req, res) => {
  if (!req.session?.user) return res.redirect("/login?next=/book");
  const success = req.session.success;
  clearFlash(req);

  const bookingList = db.prepare('SELECT * FROM bookings WHERE email = ?').all(req.session.user.email);
  res.render("book", { user: req.session.user, success, bookingList });
});

app.post("/book", (req, res) => {
  const { name, email, service, date, time, note } = req.body;
  try {
    db.prepare(`
      INSERT INTO bookings (name, email, service, date, time, note, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(name, email, service, date, time, note, 'pending');

    req.session.success = "Booking successful!";
  } catch {
    req.session.success = "Booking failed. Please try again.";
  }
  res.redirect("/book");
});

// Admin Dashboard
app.get("/admin", (req, res) => {
  if (!req.session?.user || req.session.user.email !== ADMIN_EMAIL) return res.redirect("/");
  const users = usersDb.prepare("SELECT * FROM users").all();
  res.render("admin", { user: req.session.user, users, bookings: [], contacts: [], currentPage: 'users' });
});

app.get("/admin/bookings", (req, res) => {
  if (!req.session?.user || req.session.user.email !== ADMIN_EMAIL) return res.redirect("/");
  const bookings = db.prepare("SELECT * FROM bookings").all();
  res.render("admin", { user: req.session.user, users: [], bookings, contacts: [], currentPage: 'bookings' });
});

app.get("/admin/messages", (req, res) => {
  if (!req.session?.user || req.session.user.email !== ADMIN_EMAIL) return res.redirect("/");
  const contacts = db.prepare("SELECT * FROM contacts").all();
  res.render("admin", { user: req.session.user, users: [], bookings: [], contacts, currentPage: 'messages' });
});

// Booking status change
app.post("/admin/bookings/approve", (req, res) => {
  if (req.session?.user?.email !== ADMIN_EMAIL) return res.redirect("/");
  db.prepare("UPDATE bookings SET status = 'approved' WHERE id = ?").run(req.body.id);
  res.redirect("/admin/bookings");
});

app.post("/admin/bookings/reject", (req, res) => {
  if (req.session?.user?.email !== ADMIN_EMAIL) return res.redirect("/");
  db.prepare("UPDATE bookings SET status = 'rejected' WHERE id = ?").run(req.body.id);
  res.redirect("/admin/bookings");
});

app.post("/admin/bookings/request-change", (req, res) => {
  if (req.session?.user?.email !== ADMIN_EMAIL) return res.redirect("/");
  db.prepare("UPDATE bookings SET status = 'change-requested', date = ? WHERE id = ?").run(req.body.newDate, req.body.id);
  res.redirect("/admin/bookings");
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

// Start
app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
