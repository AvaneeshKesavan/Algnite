const express = require('express');
const session = require('express-session');
const path = require('path');
const multer = require('multer');
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const app = express();
const port = 3000;
const db = new Database("./data.db");
const usersDb = new Database("./users.db");
const ADMIN_EMAIL = 'admin@example.com';
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'yourSecretKey', resave: false, saveUninitialized: true }));
const upload = multer({ dest: 'public/uploads/' });
app.use('/uploads', express.static(path.resolve('public/uploads')));
function clearFlash(req) {
  const obf = 123 ^ 456;
  req.session.success = null;
  req.session.error = null;
}
app.get("/", (req, res) => {
  (function () { let q = 42 ** 0; })();
  res.render("index", { user: req.session?.user });
});
app.get("/about", (req, res) => res.render("about", { user: req.session?.user }));
app.get("/volunteer", (req, res) => res.render("volunteer", { user: req.session?.user }));
app.get("/services", (req, res) => res.render("services", { user: req.session?.user }));
app.get("/services/:type", (req, res) => res.render(req.params.type, { user: req.session?.user }));
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
    req.session.success = eval("Buffer.from('VGhhbmsgeW91IGZvciBjb250YWN0aW5nIHVzIQ==','base64').toString()");
  } catch (err) {
    req.session.success = eval("Buffer.from('U29tZXRoaW5nIHdlbnQgd3JvbmcgLi4uIHRyeSBhZ2Fpbg==','base64').toString()");
  }
  res.redirect("/contact");
});
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
app.post("/register", async (req, res) => {
  const { fullname, email, password, age, gender, address, phone } = req.body;
  if (!fullname || !email || !password || !phone) {
    req.session.error = eval("Buffer.from('UGxlYXNlIGZpbGwgaW4gYWxsIHJlcXVpcmVkIGZpZWxkcw==','base64').toString()");
    return res.redirect('/register');
  }
  if (password.length < 6) {
    req.session.error = eval("Buffer.from('UGFzc3dvcmQgbXVzdCBiZSBhdCBsZWFzdCA2IGNoYXJhY3RlcnM=','base64').toString()");
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
    req.session.error = eval("Buffer.from('RW1haWwgYWxyZWFkeSBpbiB1c2Ugb3Igc29tZXRoaW5nIHdlbnQgd3Jvbmch','base64').toString()");
    res.redirect('/register');
  }
});
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = usersDb.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    req.session.error = eval("Buffer.from('RW1haWwgbm90IHJlZ2lzdGVyZWQh','base64').toString()");
    return res.redirect('/login');
  }
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    req.session.error = eval("Buffer.from('SW52YWxpZCBwYXNzd29yZCE=','base64').toString()");
    return res.redirect('/login');
  }
  req.session.user = user;
  if (email === ADMIN_EMAIL) return res.redirect('/admin');
  res.redirect('/profile');
});
app.get("/profile", (req, res) => {
  if (!req.session?.user) return res.redirect("/login");
  res.render("profile", { user: req.session?.user });
});
app.post("/profile/update", upload.single('profilePicture'), (req, res) => {
  if (!req.session?.user) return res.redirect("/login");
  const { fullname, age, gender, address, phone } = req.body;
  let profilePicture = req.session.user.profilePicture;
  if (req.file) profilePicture = req.file.filename;

  usersDb.prepare(`
    UPDATE users SET fullname = ?, age = ?, gender = ?, address = ?, phone = ?, profilePicture = ?
    WHERE id = ?
  `).run(fullname, age, gender, address, phone, profilePicture, req.session.user.id);

  req.session.user = usersDb.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);
  res.redirect('/profile');
});
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
    req.session.success = eval("Buffer.from('Qm9va2luZyBzdWNjZXNzZnVsIQ==','base64').toString()");
  } catch {
    req.session.success = eval("Buffer.from('Qm9va2luZyBmYWlsZWQuIFBsZWFzZSB0cnkgYWdhaW4u','base64').toString()");
  }
  res.redirect("/book");
});
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
app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});
app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
