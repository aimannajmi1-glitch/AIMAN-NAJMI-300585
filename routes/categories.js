/**
 * Category Management Routes
 */
const express = require('express');
const router = express.Router();
const { getDb, saveDb } = require('../database');
const { requireAdmin } = require('../middleware/auth');

// Helper: convert db result to array of objects
function toObjects(result) {
    if (!result.length) return [];
    const cols = result[0].columns;
    return result[0].values.map(row => {
        const obj = {};
        cols.forEach((col, i) => obj[col] = row[i]);
        return obj;
    });
}

// GET /api/categories — list all
router.get('/', (req, res) => {
    const db = getDb();
    const result = db.exec(`SELECT * FROM categories ORDER BY sort_order ASC, name ASC`);
    res.json(toObjects(result));
});

// GET /api/categories/:id — single
router.get('/:id', (req, res) => {
    const db = getDb();
    const result = db.exec(`SELECT * FROM categories WHERE id = ?`, [req.params.id]);
    const categories = toObjects(result);
    if (!categories.length) return res.status(404).json({ error: 'Kategori tidak dijumpai' });
    res.json(categories[0]);
});

// POST /api/categories — create
router.post('/', requireAdmin, (req, res) => {
    const { name, description, color_code, sort_order } = req.body;
    if (!name) return res.status(400).json({ error: 'Nama kategori diperlukan' });

    const db = getDb();
    db.run(`INSERT INTO categories (name, description, color_code, sort_order) VALUES (?, ?, ?, ?)`,
        [name, description || null, color_code || '#3B82F6', sort_order || 0]);
    
    const result = db.exec(`SELECT last_insert_rowid() as id`);
    const id = result[0].values[0][0];
    saveDb();

    res.status(201).json({ id, message: 'Kategori berjaya ditambah' });
});

// PUT /api/categories/:id — update
router.put('/:id', requireAdmin, (req, res) => {
    const { name, description, color_code, sort_order } = req.body;
    if (!name) return res.status(400).json({ error: 'Nama kategori diperlukan' });

    const db = getDb();
    db.run(`UPDATE categories SET name=?, description=?, color_code=?, sort_order=? WHERE id=?`,
        [name, description || null, color_code || '#3B82F6', sort_order || 0, req.params.id]);
    saveDb();

    res.json({ message: 'Kategori berjaya dikemaskini' });
});

// PATCH /api/categories/:id/toggle — toggle active status
router.patch('/:id/toggle', requireAdmin, (req, res) => {
    const db = getDb();
    db.run(`UPDATE categories SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?`,
        [req.params.id]);
    saveDb();
    res.json({ message: 'Status kategori dikemaskini' });
});

module.exports = router;
