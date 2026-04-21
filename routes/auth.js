/**
 * Authentication Routes — N.A.D.I. POS
 */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getDb, saveDb } = require('../database');

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
        redirect: '/pos'
    });
});

// POST /api/auth/logout — auto-close any open shift before logging out
router.post('/logout', (req, res) => {
    if (req.session && req.session.user) {
        const db = getDb();
        const userId = req.session.user.id;
        const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
        try {
            // Get the open shift to calculate expected cash
            const shiftResult = db.exec(
                `SELECT * FROM shifts WHERE user_id = ? AND status = 'open' ORDER BY id DESC LIMIT 1`,
                [userId]
            );
            if (shiftResult.length && shiftResult[0].values.length) {
                const cols = shiftResult[0].columns;
                const row = shiftResult[0].values[0];
                const shift = {};
                cols.forEach((c, i) => shift[c] = row[i]);
                const expectedCash = (shift.opening_cash || 0) + (shift.total_cash_sales || 0);
                db.run(
                    `UPDATE shifts SET status='closed', end_time=?, closing_cash=?, expected_cash=?, cash_variance=0, notes='Auto-ditutup semasa log keluar' WHERE id=?`,
                    [now, expectedCash, expectedCash, shift.id]
                );
                saveDb();
            }
        } catch (e) {
            console.error('Error auto-closing shift on logout:', e.message);
        }
    }
    req.session.destroy();
    res.json({ success: true, redirect: '/login' });
});

// POST /api/auth/verify-password — used by PIN gate
router.post('/verify-password', (req, res) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ error: 'Tidak disahkan' });
    }
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Kata laluan diperlukan' });

    const db = getDb();
    const result = db.exec(`SELECT password_hash FROM users WHERE id = ?`, [req.session.user.id]);
    if (!result.length || !result[0].values.length) {
        return res.status(404).json({ error: 'Pengguna tidak dijumpai' });
    }
    const hash = result[0].values[0][0];
    if (!bcrypt.compareSync(password, hash)) {
        return res.status(401).json({ error: 'Kata laluan tidak sah' });
    }
    res.json({ success: true });
});

// GET /api/auth/me — current user info
router.get('/me', (req, res) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    res.json({ user: req.session.user });
});

// GET /api/auth/settings — get system settings
router.get('/settings', (req, res) => {
    const db = getDb();
    const result = db.exec(`SELECT key, value FROM settings`);
    const settings = {};
    if (result.length) result[0].values.forEach(([k, v]) => settings[k] = v);
    res.json(settings);
});

// POST /api/auth/settings — update a setting (admin only)
router.post('/settings', (req, res) => {
    if (!req.session || !req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Akses pentadbir diperlukan' });
    }
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: 'Key diperlukan' });
    const db = getDb();
    const now = new Date().toISOString();
    db.run(`INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)`, [key, String(value), now]);
    saveDb();
    res.json({ success: true });
});

module.exports = router;
