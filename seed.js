/**
 * Database Seeder — Populates the database with sample data
 */

const { initDb, getDb, saveDb } = require('./database');
const bcrypt = require('bcryptjs');

async function seed() {
    console.log('🌱 Seeding KoperasiPOS database...');

    await initDb();
    const db = getDb();

    // Clear existing data
    const tables = ['audit_log', 'teacher_credits', 'sale_items', 'sales', 'shifts', 'teachers', 'products', 'categories', 'users'];
    tables.forEach(t => db.run(`DELETE FROM ${t}`));
    tables.forEach(t => db.run(`DELETE FROM sqlite_sequence WHERE name='${t}'`));

    // --- 1. Users ---
    const adminHash = bcrypt.hashSync('sekolah123', 10);
    const cashierHash = bcrypt.hashSync('cashier123', 10);

    db.run(`INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)`,
        ['Admin', adminHash, 'Puan Siti Nurhaliza', 'admin']);
    db.run(`INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)`,
        ['cashier1', cashierHash, 'Ahmad bin Ali', 'cashier']);
    db.run(`INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)`,
        ['cashier2', cashierHash, 'Nurul Aisyah', 'cashier']);

    console.log('  ✅ 3 users (Admin/sekolah123, cashier1/cashier123, cashier2/cashier123)');

    // --- 2. Categories ---
    const categories = [
        ['Makanan', 'Makanan ringan dan berat', '#EF4444', 1],
        ['Minuman', 'Minuman sejuk dan panas', '#3B82F6', 2],
        ['Alat Tulis', 'Pen, pensil, buku, dan lain-lain', '#10B981', 3],
        ['Roti & Kek', 'Roti, kek, dan pastri', '#F59E0B', 4],
        ['Lain-lain', 'Barangan lain', '#8B5CF6', 5],
    ];
    categories.forEach(c => {
        db.run(`INSERT INTO categories (name, description, color_code, sort_order) VALUES (?, ?, ?, ?)`, c);
    });
    console.log('  ✅ 5 categories');

    // --- 3. Products ---
    const products = [
        // Makanan (cat 1)
        [1, 'Nasi Lemak', 'NL001', 2.50, '🍚', 1, 1],
        [1, 'Mee Goreng', 'MG001', 2.00, '🍜', 1, 2],
        [1, 'Roti Canai', 'RC001', 1.50, '🫓', 1, 3],
        [1, 'Karipap', 'KP001', 0.80, '🥟', 1, 4],
        [1, 'Kuih Muih', 'KM001', 0.50, '🍡', 1, 5],
        [1, 'Sandwich', 'SW001', 2.50, '🥪', 1, 6],
        [1, 'Nugget (5 pcs)', 'NG001', 2.00, '🍗', 1, 7],
        // Minuman (cat 2)
        [2, 'Air Sirap', 'AS001', 1.00, '🥤', 1, 8],
        [2, 'Milo Ais', 'MI001', 1.50, '🧋', 1, 9],
        [2, 'Teh Tarik', 'TT001', 1.50, '☕', 1, 10],
        [2, 'Air Mineral', 'AM001', 1.00, '💧', 1, 11],
        [2, 'Jus Oren', 'JO001', 2.00, '🍊', 1, 12],
        // Alat Tulis (cat 3)
        [3, 'Pen Biru', 'PB001', 1.50, '🖊️', 1, 13],
        [3, 'Pensil 2B', 'P2B01', 1.00, '✏️', 1, 14],
        [3, 'Pemadam', 'PM001', 1.00, '🧽', 1, 15],
        [3, 'Pembaris 30cm', 'PR001', 2.00, '📏', 0, null],
        [3, 'Buku Latihan', 'BL001', 2.50, '📓', 0, null],
        [3, 'Gunting', 'GT001', 3.50, '✂️', 0, null],
        // Roti & Kek (cat 4)
        [4, 'Roti Gardenia', 'RG001', 3.50, '🍞', 1, 16],
        [4, 'Donut', 'DN001', 1.00, '🍩', 1, 17],
        [4, 'Kek Coklat', 'KC001', 2.00, '🍫', 1, 18],
        // Lain-lain (cat 5)
        [5, 'Tisu Poket', 'TP001', 1.00, '🧻', 0, null],
        [5, 'Plaster Luka', 'PL001', 0.50, '🩹', 0, null],
    ];
    products.forEach(p => {
        db.run(`INSERT INTO products (category_id, name, barcode, price, quick_select_icon, is_quick_select, quick_select_position) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`, p);
    });
    console.log('  ✅ 23 products');

    // --- 4. Teachers ---
    const teachers = [
        ['Encik Razak bin Ahmad', 'T001', 'Matematik', '012-3456789', 'razak@sekolah.edu.my'],
        ['Puan Faridah binti Yusof', 'T002', 'Bahasa Melayu', '013-2345678', 'faridah@sekolah.edu.my'],
        ['Cikgu Lee Wei Ming', 'T003', 'Sains', '014-3456789', 'weiming@sekolah.edu.my'],
        ['Puan Priya a/p Raman', 'T004', 'Bahasa Inggeris', '015-4567890', 'priya@sekolah.edu.my'],
        ['Encik Ahmad bin Hassan', 'T005', 'Pendidikan Jasmani', '016-5678901', 'ahmad.h@sekolah.edu.my'],
    ];
    teachers.forEach(t => {
        db.run(`INSERT INTO teachers (name, staff_id, department, phone, email) VALUES (?, ?, ?, ?, ?)`, t);
    });
    console.log('  ✅ 5 teachers');

    // --- 5. Sample Shifts & Sales (last 30 days) ---
    const now = new Date();
    let saleCount = 0;
    let shiftCount = 0;

    for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
        const date = new Date(now);
        date.setDate(date.getDate() - dayOffset);
        
        // Skip weekends
        if (date.getDay() === 0 || date.getDay() === 6) continue;

        const dateStr = date.toISOString().split('T')[0];

        // Create a shift for this day
        const shiftStart = `${dateStr} 07:00:00`;
        const shiftEnd = `${dateStr} 14:00:00`;
        const userId = (dayOffset % 2 === 0) ? 2 : 3; // Alternate cashiers

        db.run(`INSERT INTO shifts (user_id, start_time, end_time, opening_cash, status) 
                VALUES (?, ?, ?, ?, 'closed')`, [userId, shiftStart, shiftEnd, 50.00]);
        
        const shiftResult = db.exec(`SELECT last_insert_rowid() as id`);
        const shiftId = shiftResult[0].values[0][0];
        shiftCount++;

        // Generate 15-40 random sales per day
        const salesPerDay = 15 + Math.floor(Math.random() * 26);
        let dayTotalCash = 0;
        let dayTotalQR = 0;
        let dayTransactions = 0;

        for (let s = 0; s < salesPerDay; s++) {
            // Simulate peak hours: 10:00-10:30 (recess 1) and 12:30-13:00 (recess 2)
            let hour, minute;
            const rand = Math.random();
            if (rand < 0.4) {
                hour = 10; minute = Math.floor(Math.random() * 30); // Recess 1 peak
            } else if (rand < 0.7) {
                hour = 12; minute = 30 + Math.floor(Math.random() * 30); // Recess 2 peak
            } else {
                hour = 7 + Math.floor(Math.random() * 7); // Scattered
                minute = Math.floor(Math.random() * 60);
            }

            const saleTime = `${dateStr} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
            const paymentMethod = Math.random() < 0.65 ? 'cash' : 'qr_pay';
            const receiptNo = `KOP-${dateStr.replace(/-/g, '')}-${String(saleCount + 1).padStart(4, '0')}`;

            // Pick 1-4 random products
            const numItems = 1 + Math.floor(Math.random() * 4);
            const selectedProducts = [];
            for (let i = 0; i < numItems; i++) {
                const pIdx = Math.floor(Math.random() * products.length);
                const qty = 1 + Math.floor(Math.random() * 3);
                selectedProducts.push({ idx: pIdx, qty });
            }

            let subtotal = 0;
            const items = selectedProducts.map(sp => {
                const p = products[sp.idx];
                const lineTotal = p[3] * sp.qty;
                subtotal += lineTotal;
                return {
                    productId: sp.idx + 1,
                    productName: p[1],
                    unitPrice: p[3],
                    quantity: sp.qty,
                    lineTotal: Math.round(lineTotal * 100) / 100
                };
            });

            subtotal = Math.round(subtotal * 100) / 100;
            const discount = Math.random() < 0.05 ? Math.round(subtotal * 0.1 * 100) / 100 : 0;
            const total = Math.round((subtotal - discount) * 100) / 100;
            
            let tendered = null;
            let change = null;
            if (paymentMethod === 'cash') {
                tendered = Math.ceil(total);
                if (tendered < total) tendered = total;
                change = Math.round((tendered - total) * 100) / 100;
            }

            db.run(`INSERT INTO sales (receipt_no, shift_id, user_id, subtotal, discount_amount, total_amount, amount_tendered, change_given, payment_method, status, sale_time) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)`,
                [receiptNo, shiftId, userId, subtotal, discount, total, tendered, change, paymentMethod, saleTime]);

            const saleResult = db.exec(`SELECT last_insert_rowid() as id`);
            const saleId = saleResult[0].values[0][0];

            items.forEach(item => {
                db.run(`INSERT INTO sale_items (sale_id, product_id, product_name, unit_price, quantity, line_total) 
                        VALUES (?, ?, ?, ?, ?, ?)`,
                    [saleId, item.productId, item.productName, item.unitPrice, item.quantity, item.lineTotal]);
            });

            if (paymentMethod === 'cash') dayTotalCash += total;
            else dayTotalQR += total;
            dayTransactions++;
            saleCount++;
        }

        // Update shift totals
        const expectedCash = 50.00 + dayTotalCash;
        const closingCash = expectedCash + (Math.random() * 4 - 2); // Small variance
        const variance = Math.round((closingCash - expectedCash) * 100) / 100;

        db.run(`UPDATE shifts SET 
                total_cash_sales = ?, total_qr_sales = ?, total_sales = ?, 
                total_transactions = ?, expected_cash = ?, closing_cash = ?, cash_variance = ?,
                status = 'reconciled'
                WHERE id = ?`,
            [Math.round(dayTotalCash * 100) / 100, Math.round(dayTotalQR * 100) / 100,
             Math.round((dayTotalCash + dayTotalQR) * 100) / 100, dayTransactions,
             Math.round(expectedCash * 100) / 100, Math.round(closingCash * 100) / 100,
             variance, shiftId]);
    }
    console.log(`  ✅ ${shiftCount} shifts with ${saleCount} sales`);

    // --- 6. Sample Teacher Credits ---
    const creditEntries = [
        [1, null, 1, 15.50, 'credit', 'Makan tengahari - Nasi Lemak + Teh Tarik'],
        [1, null, 1, 10.00, 'payment', 'Bayaran tunai'],
        [2, null, 1, 8.00, 'credit', 'Beli alat tulis'],
        [3, null, 1, 12.00, 'credit', 'Minuman untuk mesyuarat'],
        [3, null, 1, 12.00, 'payment', 'Bayaran penuh'],
        [4, null, 1, 5.50, 'credit', 'Roti dan air'],
    ];
    creditEntries.forEach(c => {
        db.run(`INSERT INTO teacher_credits (teacher_id, sale_id, recorded_by, amount, type, description) VALUES (?, ?, ?, ?, ?, ?)`, c);
    });
    console.log('  ✅ 6 teacher credit entries');

    saveDb();
    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('   Admin:   Admin / sekolah123');
    console.log('   Cashier: cashier1 / cashier123');
    console.log('   Cashier: cashier2 / cashier123');
}

seed().catch(err => {
    console.error('Seeding failed:', err);
    process.exit(1);
});
