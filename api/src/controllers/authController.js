const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const db     = require('../config/db');

const generateToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });

    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = generateToken(user);
    const { password: _, ...safeUser } = user;

    return res.json({ success: true, user: safeUser, token });
  } catch (err) { next(err); }
};

const register = async (req, res, next) => {
  try {
    const { email, username, password } = req.body;

    if (!email || !username || !password)
      return res.status(400).json({ error: 'Email, username and password are required' });

    const [existing] = await db.query(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email, username]
    );
    if (existing.length)
      return res.status(409).json({ error: 'Email or username already in use' });

    const hashed = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (email, username, password) VALUES (?, ?, ?)',
      [email, username, hashed]
    );

    const [rows] = await db.query(
      'SELECT id, username, email, role, picture, created_at FROM users WHERE id = ?',
      [result.insertId]
    );
    const user  = rows[0];
    const token = generateToken(user);

    return res.status(201).json({ success: true, user, token });
  } catch (err) { next(err); }
};

module.exports = { login, register };
