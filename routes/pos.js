/**
 * POS Terminal Routes — Sale Processing
 */
const express = require('express');
const router = express.Router();
const { getDb, saveDb } = require('../database');
const { requireAuth } = require('../middleware/auth');

function toObjects(result) {
    if (!result.length) return [];
    const cols = result[0].columns;
    return result[0].values.map(row => {
        const obj = {};
        cols.forEach((col, i) => obj[col] = row[i]);
        return obj;
    });
}

// POST /api/pos/sale — Process a sale
router.post('/sale', requireAuth, (req, res) => {
    const { items, payment_method, amount_tendered, discount_amount } = req.body;
    const userId = req.session.user.id;

    // Validate
    if (!items || !items.length) {
        return res.status(400).json({ error: 'Tiada item dalam troli' });
    }
    if (!['cash', 'qr_pay'].includes(payment_method)) {
        return res.status(400).json({ error: 'Kaedah pembayaran tidak sah' });
    }

    const db = getDb();

    // Check for open shift
    const shiftResult = db.exec(
        `SELECT * FROM shifts WHERE user_id = ? AND status = 'open' ORDER BY id DESC LIMIT 1`,
        [userId]
    );
    const shifts = toObjects(shiftResult);
    if (!shifts.length) {
        return res.status(400).json({ error: 'Tiada syif terbuka. Sila buka syif terlebih dahulu.' });
    }
    const shift = shifts[0];

    // Calculate totals
    let subtotal = 0;
    const saleItems = [];

    for (const item of items) {
        const prodResult = db.exec(`SELECT * FROM products WHERE id = ? AND is_active = 1`, [item.product_id]);
        const products = toObjects(prodResult);
        if (!products.length) {
            return res.status(400).json({ error: `Produk ID ${item.product_id} tidak dijumpai atau tidak aktif` });
        }
        const product = products[0];
        const qty = parseInt(item.quantity) || 1;
        const lineTotal = Math.round(product.price * qty * 100) / 100;
        subtotal += lineTotal;

        saleItems.push({
            product_id: product.id,
            product_name: product.name,
            unit_price: product.price,
            quantity: qty,
            line_total: lineTotal
        });
    }

    subtotal = Math.round(subtotal * 100) / 100;
    const discount = Math.round((parseFloat(discount_amount) || 0) * 100) / 100;
    const totalAmount = Math.round((subtotal - discount) * 100) / 100;

    // Cash validation
    let tendered = null;
    let change = null;
    if (payment_method === 'cash') {
        tendered = parseFloat(amount_tendered) || 0;
        if (tendered < totalAmount) {
            return res.status(400).json({ error: 'Jumlah diterima kurang daripada jumlah perlu dibayar' });
        }
        change = Math.round((tendered - totalAmount) * 100) / 100;
    }

    // Generate receipt number
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const countResult = db.exec(
        `SELECT COUNT(*) as cnt FROM sales WHERE receipt_no LIKE ?`,
        [`KOP-${dateStr}-%`]
    );
    const count = countResult.length ? countResult[0].values[0][0] : 0;
    const receiptNo = `KOP-${dateStr}-${String(count + 1).padStart(4, '0')}`;

    const saleTime = now.toISOString().replace('T', ' ').substring(0, 19);

    // Insert sale
    db.run(`INSERT INTO sales (receipt_no, shift_id, user_id, subtotal, discount_amount, total_amount, 
            amount_tendered, change_given, payment_method, status, sale_time)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)`,
        [receiptNo, shift.id, userId, subtotal, discount, totalAmount, tendered, change, payment_method, saleTime]);

    const saleIdResult = db.exec(`SELECT last_insert_rowid() as id`);
    const saleId = saleIdResult[0].values[0][0];

    // Insert sale items
    saleItems.forEach(item => {
        db.run(`INSERT INTO sale_items (sale_id, product_id, product_name, unit_price, quantity, line_total)
                VALUES (?, ?, ?, ?, ?, ?)`,
            [saleId, item.product_id, item.product_name, item.unit_price, item.quantity, item.line_total]);
    });

    // Update shift totals
    if (payment_method === 'cash') {
        db.run(`UPDATE shifts SET total_cash_sales = total_cash_sales + ?, total_sales = total_sales + ?, 
                total_transactions = total_transactions + 1 WHERE id = ?`,
            [totalAmount, totalAmount, shift.id]);
    } else {
        db.run(`UPDATE shifts SET total_qr_sales = total_qr_sales + ?, total_sales = total_sales + ?, 
                total_transactions = total_transactions + 1 WHERE id = ?`,
            [totalAmount, totalAmount, shift.id]);
    }

    saveDb();

    res.json({
        success: true,
        sale: {
            id: saleId,
            receipt_no: receiptNo,
            subtotal,
            discount_amount: discount,
            total_amount: totalAmount,
            amount_tendered: tendered,
            change_given: change,
            payment_method,
            sale_time: saleTime,
            items: saleItems
        }
    });
});

// GET /api/pos/receipt/:id — Get receipt details
router.get('/receipt/:id', requireAuth, (req, res) => {
    const db = getDb();
    const saleResult = db.exec(
        `SELECT s.*, u.full_name as cashier_name FROM sales s JOIN users u ON s.user_id = u.id WHERE s.id = ?`,
        [req.params.id]
    );
    const sales = toObjects(saleResult);
    if (!sales.length) return res.status(404).json({ error: 'Resit tidak dijumpai' });

    const itemsResult = db.exec(`SELECT * FROM sale_items WHERE sale_id = ?`, [req.params.id]);
    const items = toObjects(itemsResult);

    res.json({ ...sales[0], items });
});

module.exports = router;
