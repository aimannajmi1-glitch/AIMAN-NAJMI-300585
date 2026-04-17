/**
 * Teacher Management Routes
 */
const express = require('express');
const router = express.Router();
const { getDb, saveDb } = require('../database');
const { requireAdmin } = require('../middleware/auth');

function toObjects(result) {
    if (!result.length) return [];
    const cols = result[0].columns;
    return result[0].values.map(row => {
        const obj = {};
        cols.forEach((col, i) => obj[col] = row[i]);
        return obj;
    });
}

// GET /api/teachers — list all with balances
router.get('/', requireAdmin, (req, res) => {
    const db = getDb();
    const result = db.exec(`
        SELECT t.*,
            COALESCE(SUM(CASE WHEN tc.type='credit' THEN tc.amount ELSE 0 END), 0) as total_credit,
            COALESCE(SUM(CASE WHEN tc.type='payment' THEN tc.amount ELSE 0 END), 0) as total_payment,
            COALESCE(SUM(CASE WHEN tc.type='credit' THEN tc.amount ELSE 0 END), 0) -
            COALESCE(SUM(CASE WHEN tc.type='payment' THEN tc.amount ELSE 0 END), 0) as outstanding_balance
        FROM teachers t
        LEFT JOIN teacher_credits tc ON t.id = tc.teacher_id
        GROUP BY t.id
        ORDER BY t.name ASC
    `);
    res.json(toObjects(result));
});

// GET /api/teachers/:id
router.get('/:id', requireAdmin, (req, res) => {
    const db = getDb();
    const result = db.exec(`SELECT * FROM teachers WHERE id = ?`, [req.params.id]);
    const teachers = toObjects(result);
    if (!teachers.length) return res.status(404).json({ error: 'Guru tidak dijumpai' });
    res.json(teachers[0]);
});

// POST /api/teachers — create
router.post('/', requireAdmin, (req, res) => {
    const { name, staff_id, department, phone, email } = req.body;
    if (!name || !staff_id) return res.status(400).json({ error: 'Nama dan ID staf diperlukan' });

    const db = getDb();
    const existing = db.exec(`SELECT id FROM teachers WHERE staff_id = ?`, [staff_id]);
    if (existing.length && existing[0].values.length) {
        return res.status(400).json({ error: 'ID staf sudah wujud' });
    }

    db.run(`INSERT INTO teachers (name, staff_id, department, phone, email) VALUES (?, ?, ?, ?, ?)`,
        [name, staff_id, department || null, phone || null, email || null]);

    const result = db.exec(`SELECT last_insert_rowid() as id`);
    const id = result[0].values[0][0];
    saveDb();

    res.status(201).json({ id, message: 'Guru berjaya ditambah' });
});

// PUT /api/teachers/:id — update
router.put('/:id', requireAdmin, (req, res) => {
    const { name, staff_id, department, phone, email } = req.body;
    if (!name || !staff_id) return res.status(400).json({ error: 'Nama dan ID staf diperlukan' });

    const db = getDb();
    db.run(`UPDATE teachers SET name=?, staff_id=?, department=?, phone=?, email=? WHERE id=?`,
        [name, staff_id, department || null, phone || null, email || null, req.params.id]);
    saveDb();

    res.json({ message: 'Maklumat guru berjaya dikemaskini' });
});

// PATCH /api/teachers/:id/toggle
router.patch('/:id/toggle', requireAdmin, (req, res) => {
    const db = getDb();
    db.run(`UPDATE teachers SET is_active = CASE WHEN is_active=1 THEN 0 ELSE 1 END WHERE id=?`, [req.params.id]);
    saveDb();
    res.json({ message: 'Status guru dikemaskini' });
});

module.exports = router;
