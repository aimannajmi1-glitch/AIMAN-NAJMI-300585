/**
 * Authentication Routes
 */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getDb } = require('../database');

// POST /api/auth/login
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Sila masukkan nama pengguna dan kata laluan' });
    }

    const db = getDb();
    const result = db.exec(`SELECT * FROM users WHERE username = ? AND is_active = 1`, [username]);

    if (result.length === 0 || result[0].values.length === 0) {
        return res.status(401).json({ error: 'Nama pengguna atau kata laluan tidak sah' });
    }

    const cols = result[0].columns;
    const row = result[0].values[0];
    const user = {};
    cols.forEach((col, i) => user[col] = row[i]);

    if (!bcrypt.compareSync(password, user.password_hash)) {
        return res.status(401).json({ error: 'Nama pengguna atau kata laluan tidak sah' });
    }

    // Set session
    req.session.user = {
        id: user.id,
        username: user.username,
        name: user.full_name,
        role: user.role
    };

    res.json({
        success: true,
        user: req.session.user,
        redirect: user.role === 'admin' ? '/dashboard' : '/pos'
    });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true, redirect: '/login' });
});

// GET /api/auth/me — current user info
router.get('/me', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    res.json({ user: req.session.user });
});

module.exports = router;
