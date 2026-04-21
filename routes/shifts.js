/**
 * Shift Management Routes
 */
const express = require('express');
const router = express.Router();
const { getDb, saveDb } = require('../database');
const { requireAuth, requireAdmin } = require('../middleware/auth');

function toObjects(result) {
    if (!result.length) return [];
    const cols = result[0].columns;
    return result[0].values.map(row => {
        const obj = {};
        cols.forEach((col, i) => obj[col] = row[i]);
        return obj;
    });
}

// GET /api/shifts — list all shifts
router.get('/', requireAdmin, (req, res) => {
    const db = getDb();
    const { status, date } = req.query;

    let sql = `SELECT s.*, u.full_name as cashier_name FROM shifts s JOIN users u ON s.user_id = u.id`;
    let conditions = [];
    let params = [];

    if (status) { conditions.push(`s.status = ?`); params.push(status); }
    if (date) { conditions.push(`DATE(s.start_time) = ?`); params.push(date); }

    if (conditions.length) sql += ` WHERE ` + conditions.join(' AND ');
    sql += ` ORDER BY s.start_time DESC`;

    const result = db.exec(sql, params);
    res.json(toObjects(result));
});

// GET /api/shifts/current — get user's current open shift
router.get('/current', requireAuth, (req, res) => {
    const db = getDb();
    const result = db.exec(
        `SELECT s.*, u.full_name as cashier_name FROM shifts s JOIN users u ON s.user_id = u.id 
         WHERE s.user_id = ? AND s.status = 'open' ORDER BY s.id DESC LIMIT 1`,
        [req.session.user.id]
    );
    const shifts = toObjects(result);
    res.json(shifts.length ? shifts[0] : null);
});

// POST /api/shifts/open — open a new shift
router.post('/open', requireAuth, (req, res) => {
    const { opening_cash } = req.body;
    const userId = req.session.user.id;
    const db = getDb();

    // Check if user already has an open shift
    const existing = db.exec(`SELECT id FROM shifts WHERE user_id = ? AND status = 'open'`, [userId]);
    if (existing.length && existing[0].values.length) {
        return res.status(400).json({ error: 'Anda sudah mempunyai syif yang terbuka' });
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const cash = parseFloat(opening_cash) || 0;

    db.run(`INSERT INTO shifts (user_id, start_time, opening_cash, status) VALUES (?, ?, ?, 'open')`,
        [userId, now, cash]);

    const result = db.exec(`SELECT last_insert_rowid() as id`);
    const id = result[0].values[0][0];
    saveDb();

    res.json({
        success: true,
        shift: { id, user_id: userId, start_time: now, opening_cash: cash, status: 'open' }
    });
});

// POST /api/shifts/close — close the current shift (cashier just ends shift)
router.post('/close', requireAuth, (req, res) => {
    const userId = req.session.user.id;
    const db = getDb();

    const shiftResult = db.exec(
        `SELECT * FROM shifts WHERE user_id = ? AND status = 'open' ORDER BY id DESC LIMIT 1`,
        [userId]
    );
    const shifts = toObjects(shiftResult);
    if (!shifts.length) {
        return res.status(400).json({ error: 'Tiada syif terbuka untuk ditutup' });
    }

    const shift = shifts[0];
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    // Cashier does not declare closing cash. Admin does during reconcile.
    const expectedCash = shift.opening_cash + shift.total_cash_sales;

    db.run(`UPDATE shifts SET end_time=?, expected_cash=?, status='closed' WHERE id=?`,
        [now, expectedCash, shift.id]);
    saveDb();

    res.json({
        success: true,
        shift: {
            ...shift,
            end_time: now,
            expected_cash: expectedCash,
            status: 'closed'
        }
    });
});

// GET /api/shifts/:id — single shift detail
router.get('/:id', requireAuth, (req, res) => {
    const db = getDb();
    const result = db.exec(
        `SELECT s.*, u.full_name as cashier_name FROM shifts s JOIN users u ON s.user_id = u.id WHERE s.id = ?`,
        [req.params.id]
    );
    const shifts = toObjects(result);
    if (!shifts.length) return res.status(404).json({ error: 'Syif tidak dijumpai' });

    // Get sales for this shift
    const salesResult = db.exec(
        `SELECT * FROM sales WHERE shift_id = ? ORDER BY sale_time ASC`,
        [req.params.id]
    );

    res.json({ ...shifts[0], sales: toObjects(salesResult) });
});

// POST /api/shifts/:id/reconcile — mark shift as reconciled (admin)
router.post('/:id/reconcile', requireAdmin, (req, res) => {
    const { notes, closing_cash } = req.body;
    const db = getDb();

    const shiftResult = db.exec(`SELECT * FROM shifts WHERE id = ? AND status = 'closed'`, [req.params.id]);
    const shifts = toObjects(shiftResult);
    if (!shifts.length) return res.status(400).json({ error: 'Syif tidak dijumpai atau bukan berstatus ditutup' });

    const shift = shifts[0];
    const closingAmount = parseFloat(closing_cash);
    if (isNaN(closingAmount)) return res.status(400).json({ error: 'Sila masukkan tunai penutup yang sah' });

    const expectedCash = shift.expected_cash || (shift.opening_cash + shift.total_cash_sales);
    const variance = Math.round((closingAmount - expectedCash) * 100) / 100;

    db.run(`UPDATE shifts SET closing_cash = ?, cash_variance = ?, status = 'reconciled', notes = ? WHERE id = ?`,
        [closingAmount, variance, notes || null, req.params.id]);
    saveDb();

    res.json({ message: 'Syif berjaya disahkan', variance });
});

module.exports = router;
