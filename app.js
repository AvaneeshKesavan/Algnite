const express = require('express');
const session = require('express-session');
const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'yourSecretKey',
  resave: false,
  saveUninitialized: true
}));

// Home
app.get('/', (req, res) => {
  res.render('index', { user: req.session.user });
});

// Login page
app.get('/login', (req, res) => {
  req.session.user = true;
  res.redirect('/');
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Show contact form with success message if any
app.get('/contact', (req, res) => {
  const success = req.session.success;
  delete req.session.success; // clear success message after reading
  res.render('contact', { user: req.session.user, success });
});

// Other pages
app.get('/about', (req, res) => res.send('About Page'));
app.get('/dashboard', (req, res) => res.send('Dashboard Page'));
app.get('/profile', (req, res) => res.send('Profile Page'));
app.get('/register', (req, res) => res.send('Register Page'));

// Handle form submission
app.post('/contact', (req, res) => {
  console.log('Contact form data:', req.body);
  req.session.success = 'Thank you for contacting us!';
  res.redirect('/contact');
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
