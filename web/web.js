require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.get('/js/config.js', (req, res) => {
  res.type('application/javascript');
  res.send(`const CONFIG = { API_URL: '${process.env.API_URL || 'http://localhost:3000'}' };`);
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'pages', 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'pages', 'register.html')));
app.get('/profile', (req, res) => res.sendFile(path.join(__dirname, 'public', 'pages', 'profile.html')));
app.get('/property', (req, res) => res.sendFile(path.join(__dirname, 'public', 'pages', 'property.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'pages', 'admin.html')));

app.listen(PORT, () => {
  console.log(`\n  À la Casa — Web Server`);
  console.log(`  http://localhost:${PORT}\n`);
});
