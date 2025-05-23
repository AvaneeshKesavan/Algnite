const express = require('express');
const session = require('express-session');
const app = express();
const port = 3000;

// ✅ Import better-sqlite3 instead of sqlite3
const Database = require('better-sqlite3');
const db = new Database('./data.db');

// Middleware setup
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'yourSecretKey',
  resave: false,
  saveUninitialized: true
}));

// ✅ Ensure contacts table exists
db.prepare(`
  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT,
    message TEXT NOT NULL
  )
`).run();

// Home
app.get('/', (req, res) => {
  res.render('index', { user: req.session.user });
});

// Login
app.get('/login', (req, res) => {
  req.session.user = true;
  res.redirect('/');
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Contact page with message
app.get('/contact', (req, res) => {
  const success = req.session.success;
  delete req.session.success;
  res.render('contact', { user: req.session.user, success });
});

// About Us
app.get('/about', (req,res) => {
  res.render('about',{ user: req.session.user});
});

// Services Page
app.get('/services', (req,res) => {
  res.render('services',{ user: req.session.user});
});

// Booking Page
app.get('/book', (req,res) => {
  res.render('book',{ user: req.session.user});
});

// Other pages
app.get('/about', (req, res) => res.send('About Page'));
app.get('/dashboard', (req, res) => res.send('Dashboard Page'));
app.get('/profile', (req, res) => res.send('Profile Page'));
app.get('/register', (req, res) => res.send('Register Page'));

// ✅ Handle contact form submission using better-sqlite3
app.post('/contact', (req, res) => {
  const { name, email, subject, message } = req.body;

  try {
    const stmt = db.prepare(`
      INSERT INTO contacts (name, email, subject, message)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(name, email, subject, message);

    console.log('Contact saved successfully');
    req.session.success = 'Thank you for contacting us!';
  } catch (err) {
    console.error('Error inserting into contacts:', err.message);
    req.session.success = 'Something went wrong. Please try again.';
  }

  res.redirect('/contact');
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
