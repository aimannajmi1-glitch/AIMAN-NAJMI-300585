/**
 * Teacher Credit/Debt Routes
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

// GET /api/credits — all credit entries
router.get('/', requireAdmin, (req, res) => {
    const db = getDb();
    const { teacher_id, type } = req.query;

    let sql = `SELECT tc.*, t.name as teacher_name, t.staff_id, u.full_name as recorded_by_name
               FROM teacher_credits tc
               JOIN teachers t ON tc.teacher_id = t.id
               JOIN users u ON tc.recorded_by = u.id`;
    let conditions = [];
    let params = [];

    if (teacher_id) { conditions.push(`tc.teacher_id = ?`); params.push(teacher_id); }
    if (type) { conditions.push(`tc.type = ?`); params.push(type); }

    if (conditions.length) sql += ` WHERE ` + conditions.join(' AND ');
    sql += ` ORDER BY tc.created_at DESC`;

    const result = db.exec(sql, params);
    res.json(toObjects(result));
});

// POST /api/credits — record a credit or payment
router.post('/', requireAuth, (req, res) => {
    const { teacher_id, sale_id, amount, type, description } = req.body;

    if (!teacher_id || !amount || !type) {
        return res.status(400).json({ error: 'ID guru, jumlah, dan jenis diperlukan' });
    }
    if (!['credit', 'payment'].includes(type)) {
        return res.status(400).json({ error: 'Jenis mesti "credit" atau "payment"' });
    }

    const db = getDb();
    db.run(`INSERT INTO teacher_credits (teacher_id, sale_id, recorded_by, amount, type, description) 
            VALUES (?, ?, ?, ?, ?, ?)`,
        [teacher_id, sale_id || null, req.session.user.id, parseFloat(amount), type, description || null]);

    const result = db.exec(`SELECT last_insert_rowid() as id`);
    const id = result[0].values[0][0];
    saveDb();

    res.status(201).json({ id, message: type === 'credit' ? 'Hutang berjaya direkodkan' : 'Bayaran berjaya direkodkan' });
});

// GET /api/credits/balances — all teachers with balances
router.get('/balances', requireAdmin, (req, res) => {
    const db = getDb();
    const result = db.exec(`
        SELECT t.id, t.name, t.staff_id, t.department,
            COALESCE(SUM(CASE WHEN tc.type='credit' THEN tc.amount ELSE 0 END), 0) as total_credit,
            COALESCE(SUM(CASE WHEN tc.type='payment' THEN tc.amount ELSE 0 END), 0) as total_payment,
            COALESCE(SUM(CASE WHEN tc.type='credit' THEN tc.amount ELSE 0 END), 0) -
            COALESCE(SUM(CASE WHEN tc.type='payment' THEN tc.amount ELSE 0 END), 0) as outstanding
        FROM teachers t
        LEFT JOIN teacher_credits tc ON t.id = tc.teacher_id
        WHERE t.is_active = 1
        GROUP BY t.id
        HAVING outstanding > 0
        ORDER BY outstanding DESC
    `);
    res.json(toObjects(result));
});

module.exports = router;
