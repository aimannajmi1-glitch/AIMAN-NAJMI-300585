/**
 * Product Management Routes
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

// GET /api/products — list all (with category info)
router.get('/', requireAuth, (req, res) => {
    const db = getDb();
    const { category_id, search, active_only } = req.query;

    let sql = `SELECT p.*, c.name as category_name, c.color_code as category_color 
               FROM products p 
               JOIN categories c ON p.category_id = c.id`;
    let conditions = [];
    let params = [];

    if (active_only === '1') {
        conditions.push(`p.is_active = 1`);
    }
    if (category_id) {
        conditions.push(`p.category_id = ?`);
        params.push(category_id);
    }
    if (search) {
        conditions.push(`(p.name LIKE ? OR p.barcode LIKE ?)`);
        params.push(`%${search}%`, `%${search}%`);
    }

    if (conditions.length) {
        sql += ` WHERE ` + conditions.join(' AND ');
    }
    sql += ` ORDER BY p.is_quick_select DESC, p.quick_select_position ASC, p.name ASC`;

    const result = db.exec(sql, params);
    res.json(toObjects(result));
});

// GET /api/products/:id — single product
router.get('/:id', requireAuth, (req, res) => {
    const db = getDb();
    const result = db.exec(
        `SELECT p.*, c.name as category_name FROM products p JOIN categories c ON p.category_id = c.id WHERE p.id = ?`,
        [req.params.id]
    );
    const products = toObjects(result);
    if (!products.length) return res.status(404).json({ error: 'Produk tidak dijumpai' });
    res.json(products[0]);
});

// GET /api/products/barcode/:code — lookup by barcode
router.get('/barcode/:code', requireAuth, (req, res) => {
    const db = getDb();
    const result = db.exec(
        `SELECT p.*, c.name as category_name FROM products p JOIN categories c ON p.category_id = c.id WHERE p.barcode = ? AND p.is_active = 1`,
        [req.params.code]
    );
    const products = toObjects(result);
    if (!products.length) return res.status(404).json({ error: 'Produk dengan kod bar ini tidak dijumpai' });
    res.json(products[0]);
});

// POST /api/products — create
router.post('/', requireAdmin, (req, res) => {
    const { category_id, name, barcode, price, quick_select_icon, is_quick_select, quick_select_position } = req.body;

    if (!name || !category_id || price === undefined) {
        return res.status(400).json({ error: 'Nama, kategori, dan harga diperlukan' });
    }
    if (isNaN(parseFloat(price)) || parseFloat(price) < 0) {
        return res.status(400).json({ error: 'Harga mestilah nombor yang sah' });
    }

    const db = getDb();

    // Check barcode uniqueness
    if (barcode) {
        const existing = db.exec(`SELECT id FROM products WHERE barcode = ?`, [barcode]);
        if (existing.length && existing[0].values.length) {
            return res.status(400).json({ error: 'Kod bar sudah digunakan oleh produk lain' });
        }
    }

    db.run(`INSERT INTO products (category_id, name, barcode, price, quick_select_icon, is_quick_select, quick_select_position) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [category_id, name, barcode || null, parseFloat(price), quick_select_icon || null,
         is_quick_select ? 1 : 0, quick_select_position || null]);

    const result = db.exec(`SELECT last_insert_rowid() as id`);
    const id = result[0].values[0][0];
    saveDb();

    res.status(201).json({ id, message: 'Produk berjaya ditambah' });
});

// PUT /api/products/:id — update
router.put('/:id', requireAdmin, (req, res) => {
    const { category_id, name, barcode, price, quick_select_icon, is_quick_select, quick_select_position } = req.body;

    if (!name || !category_id || price === undefined) {
        return res.status(400).json({ error: 'Nama, kategori, dan harga diperlukan' });
    }

    const db = getDb();

    // Check barcode uniqueness (exclude self)
    if (barcode) {
        const existing = db.exec(`SELECT id FROM products WHERE barcode = ? AND id != ?`, [barcode, req.params.id]);
        if (existing.length && existing[0].values.length) {
            return res.status(400).json({ error: 'Kod bar sudah digunakan oleh produk lain' });
        }
    }

    db.run(`UPDATE products SET category_id=?, name=?, barcode=?, price=?, quick_select_icon=?, 
            is_quick_select=?, quick_select_position=?, updated_at=datetime('now', '+8 hours') WHERE id=?`,
        [category_id, name, barcode || null, parseFloat(price), quick_select_icon || null,
         is_quick_select ? 1 : 0, quick_select_position || null, req.params.id]);
    saveDb();

    res.json({ message: 'Produk berjaya dikemaskini' });
});

// PATCH /api/products/:id/toggle — toggle active
router.patch('/:id/toggle', requireAdmin, (req, res) => {
    const db = getDb();
    db.run(`UPDATE products SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?`,
        [req.params.id]);
    saveDb();
    res.json({ message: 'Status produk dikemaskini' });
});

module.exports = router;
