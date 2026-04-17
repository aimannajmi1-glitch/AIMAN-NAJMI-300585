/**
 * POS Terminal Logic
 * Handles: product grid, cart, barcode scanning, shift management, checkout
 */

let allProducts = [];
let categories = [];
let cart = [];
let currentShift = null;
let currentCategory = 'all';

// Barcode scanner detection
let barcodeBuffer = '';
let barcodeTimer = null;

(async () => {
    const user = await APP.checkAuth();
    if (!user) return;

    await loadCategories();
    await loadProducts();
    await checkShift();
    setupEventListeners();
    setupBarcodeScanner();
})();

async function loadCategories() {
    categories = await APP.api('/api/categories');
    renderCategoryTabs();
}

async function loadProducts() {
    allProducts = await APP.api('/api/products?active_only=1');
    renderProducts();
}

async function checkShift() {
    const shift = await APP.api('/api/shifts/current');
    currentShift = shift;
    updateShiftDisplay();

    if (!shift) {
        document.getElementById('shiftModal').classList.add('active');
    }
}

function updateShiftDisplay() {
    const el = document.getElementById('shiftInfo');
    if (currentShift) {
        el.textContent = `Syif Aktif ✓`;
        el.className = 'pos-shift-info';
        el.onclick = () => showCloseShiftModal();
        el.style.cursor = 'pointer';
        el.title = 'Klik untuk tutup syif';
    } else {
        el.textContent = 'Tiada Syif';
        el.className = 'pos-shift-info no-shift';
        el.onclick = () => document.getElementById('shiftModal').classList.add('active');
        el.style.cursor = 'pointer';
        el.title = 'Klik untuk buka syif';
    }
    updatePayButtons();
}

function renderCategoryTabs() {
    const container = document.getElementById('categoryTabs');
    let html = `<button class="pos-cat-btn active" data-cat="all" style="background:var(--accent);color:white;border-color:var(--accent)">Semua</button>`;
    categories.filter(c => c.is_active).forEach(c => {
        html += `<button class="pos-cat-btn" data-cat="${c.id}" style="--cat-color:${c.color_code}">${c.name}</button>`;
    });
    container.innerHTML = html;

    container.querySelectorAll('.pos-cat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.pos-cat-btn').forEach(b => {
                b.classList.remove('active');
                b.style.background = '';
                b.style.color = '';
                b.style.borderColor = '';
            });
            btn.classList.add('active');
            const catColor = btn.style.getPropertyValue('--cat-color') || 'var(--accent)';
            btn.style.background = catColor;
            btn.style.color = 'white';
            btn.style.borderColor = catColor;
            currentCategory = btn.dataset.cat;
            renderProducts();
        });
    });
}

function renderProducts() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    let filtered = allProducts;

    if (currentCategory !== 'all') {
        filtered = filtered.filter(p => p.category_id == currentCategory);
    }
    if (search) {
        filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(search) ||
            (p.barcode && p.barcode.toLowerCase().includes(search))
        );
    }

    const grid = document.getElementById('productGrid');
    if (!filtered.length) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🔍</div><h3>Tiada produk dijumpai</h3></div>`;
        return;
    }

    grid.innerHTML = filtered.map(p => {
        const inCart = cart.find(c => c.product_id === p.id);
        return `
            <div class="pos-item ${inCart ? 'added' : ''}" onclick="addToCart(${p.id})" title="${p.name} — ${APP.formatRM(p.price)}">
                <div class="item-icon">${p.quick_select_icon || '📦'}</div>
                <div class="item-name">${p.name}</div>
                <div class="item-price">${APP.formatRM(p.price)}</div>
            </div>`;
    }).join('');
}

// ===== Cart Logic =====
function addToCart(productId) {
    if (!currentShift) {
        APP.toast('Sila buka syif terlebih dahulu', 'error');
        document.getElementById('shiftModal').classList.add('active');
        return;
    }

    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    const existing = cart.find(c => c.product_id === productId);
    if (existing) {
        existing.quantity++;
        existing.line_total = existing.quantity * existing.unit_price;
    } else {
        cart.push({
            product_id: product.id,
            product_name: product.name,
            unit_price: product.price,
            quantity: 1,
            line_total: product.price,
            icon: product.quick_select_icon || '📦'
        });
    }

    renderCart();
    renderProducts(); // Update "added" indicators
}

function updateQty(productId, delta) {
    const item = cart.find(c => c.product_id === productId);
    if (!item) return;

    item.quantity += delta;
    if (item.quantity <= 0) {
        cart = cart.filter(c => c.product_id !== productId);
    } else {
        item.line_total = item.quantity * item.unit_price;
    }
    renderCart();
    renderProducts();
}

function removeFromCart(productId) {
    cart = cart.filter(c => c.product_id !== productId);
    renderCart();
    renderProducts();
}

function clearCart() {
    cart = [];
    document.getElementById('discountInput').value = '0';
    renderCart();
    renderProducts();
}

function getSubtotal() {
    return cart.reduce((sum, item) => sum + item.line_total, 0);
}

function getDiscount() {
    return parseFloat(document.getElementById('discountInput').value) || 0;
}

function getTotal() {
    return Math.max(0, getSubtotal() - getDiscount());
}

function renderCart() {
    const container = document.getElementById('cartItems');
    const countEl = document.getElementById('cartCount');
    const subtotalEl = document.getElementById('subtotalDisplay');
    const totalEl = document.getElementById('totalDisplay');

    const totalItems = cart.reduce((sum, c) => sum + c.quantity, 0);
    countEl.textContent = totalItems;

    if (!cart.length) {
        container.innerHTML = `<div class="cart-empty"><div class="empty-icon">🛒</div><p>Troli kosong</p></div>`;
    } else {
        container.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.icon} ${item.product_name}</div>
                    <div class="cart-item-price">${APP.formatRM(item.unit_price)} / unit</div>
                </div>
                <div class="cart-item-qty">
                    <button onclick="updateQty(${item.product_id}, -1)">−</button>
                    <span>${item.quantity}</span>
                    <button onclick="updateQty(${item.product_id}, 1)">+</button>
                </div>
                <div class="cart-item-total">${APP.formatRM(item.line_total)}</div>
                <button class="cart-item-remove" onclick="removeFromCart(${item.product_id})">✕</button>
            </div>
        `).join('');
    }

    subtotalEl.textContent = APP.formatRM(getSubtotal());
    totalEl.textContent = APP.formatRM(getTotal());
    updatePayButtons();
}

function updatePayButtons() {
    const hasItems = cart.length > 0;
    const hasShift = !!currentShift;
    document.getElementById('cashPayBtn').disabled = !hasItems || !hasShift;
    document.getElementById('qrPayBtn').disabled = !hasItems || !hasShift;
}

// ===== Payment =====
function showCashModal() {
    if (!cart.length) return;
    const total = getTotal();
    document.getElementById('cashTotalDisplay').textContent = APP.formatRM(total);
    document.getElementById('tenderedInput').value = '';
    document.getElementById('changeDisplay').style.display = 'none';
    document.getElementById('confirmCashBtn').disabled = true;

    // Quick cash buttons
    const rounded = Math.ceil(total);
    const quickAmounts = [...new Set([rounded, rounded + 1, rounded + 5, rounded + 10, 50, 100])].filter(a => a >= total).slice(0, 8);
    document.getElementById('quickCashBtns').innerHTML = quickAmounts.map(a =>
        `<button onclick="setTendered(${a})">RM ${a.toFixed(2)}</button>`
    ).join('');

    document.getElementById('cashModal').classList.add('active');
    setTimeout(() => document.getElementById('tenderedInput').focus(), 200);
}

function setTendered(amount) {
    document.getElementById('tenderedInput').value = amount.toFixed(2);
    updateChange();
}

function updateChange() {
    const tendered = parseFloat(document.getElementById('tenderedInput').value) || 0;
    const total = getTotal();
    const change = tendered - total;
    const changeDisplay = document.getElementById('changeDisplay');
    const confirmBtn = document.getElementById('confirmCashBtn');

    if (tendered >= total && tendered > 0) {
        changeDisplay.style.display = 'block';
        document.getElementById('changeAmount').textContent = APP.formatRM(change);
        confirmBtn.disabled = false;
    } else {
        changeDisplay.style.display = 'none';
        confirmBtn.disabled = true;
    }
}

async function processSale(paymentMethod) {
    const total = getTotal();
    const payload = {
        items: cart.map(c => ({ product_id: c.product_id, quantity: c.quantity })),
        payment_method: paymentMethod,
        discount_amount: getDiscount()
    };

    if (paymentMethod === 'cash') {
        payload.amount_tendered = parseFloat(document.getElementById('tenderedInput').value);
    }

    try {
        const result = await APP.api('/api/pos/sale', { method: 'POST', body: payload });
        document.getElementById('cashModal').classList.remove('active');
        showReceipt(result.sale);
        clearCart();
        APP.toast('Jualan berjaya diproses! ✅', 'success');
    } catch (err) {
        APP.toast(err.message, 'error');
    }
}

function showReceipt(sale) {
    const appConfig = { name: 'Koperasi Sekolah', address: '' };
    document.getElementById('receiptContent').innerHTML = `
        <div class="receipt">
            <div class="receipt-header">
                <h4>🏪 ${appConfig.name}</h4>
                <p>${sale.receipt_no}</p>
                <p>${new Date(sale.sale_time).toLocaleString('ms-MY')}</p>
            </div>
            <div class="receipt-items">
                ${sale.items.map(i => `
                    <div class="receipt-item">
                        <span>${i.product_name} x${i.quantity}</span>
                        <span>${APP.formatRM(i.line_total)}</span>
                    </div>
                `).join('')}
            </div>
            <div class="receipt-divider"></div>
            <div class="receipt-item"><span>Jumlah Kecil</span><span>${APP.formatRM(sale.subtotal)}</span></div>
            ${sale.discount_amount > 0 ? `<div class="receipt-item"><span>Diskaun</span><span>-${APP.formatRM(sale.discount_amount)}</span></div>` : ''}
            <div class="receipt-divider"></div>
            <div class="receipt-total"><span>JUMLAH</span><span>${APP.formatRM(sale.total_amount)}</span></div>
            <div class="receipt-divider"></div>
            <div class="receipt-item"><span>Bayaran</span><span>${sale.payment_method === 'cash' ? 'Tunai' : 'QR Pay'}</span></div>
            ${sale.amount_tendered ? `<div class="receipt-item"><span>Diterima</span><span>${APP.formatRM(sale.amount_tendered)}</span></div>` : ''}
            ${sale.change_given ? `<div class="receipt-item"><span>Baki</span><span>${APP.formatRM(sale.change_given)}</span></div>` : ''}
            <div class="receipt-footer">
                <p>Terima kasih! 🙏</p>
                <p>Sila datang lagi</p>
            </div>
        </div>
    `;
    document.getElementById('receiptModal').classList.add('active');
}

function closeReceipt() {
    document.getElementById('receiptModal').classList.remove('active');
}

// ===== Shift Management =====
async function openShift() {
    const cash = parseFloat(document.getElementById('openingCash').value) || 0;
    try {
        const result = await APP.api('/api/shifts/open', { method: 'POST', body: { opening_cash: cash } });
        currentShift = result.shift;
        document.getElementById('shiftModal').classList.remove('active');
        updateShiftDisplay();
        APP.toast('Syif berjaya dibuka! ⏰', 'success');
    } catch (err) {
        APP.toast(err.message, 'error');
    }
}

async function showCloseShiftModal() {
    if (!currentShift) return;
    // Refresh shift data
    try {
        const shift = await APP.api('/api/shifts/current');
        if (shift) currentShift = shift;
    } catch {}

    document.getElementById('shiftSummary').innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="stat-card" style="padding:14px;--stat-color:var(--success)">
                <div class="stat-value" style="font-size:1.2rem">${APP.formatRM(currentShift.total_cash_sales)}</div>
                <div class="stat-label">Jualan Tunai</div>
            </div>
            <div class="stat-card" style="padding:14px;--stat-color:var(--qr-color)">
                <div class="stat-value" style="font-size:1.2rem">${APP.formatRM(currentShift.total_qr_sales)}</div>
                <div class="stat-label">Jualan QR</div>
            </div>
            <div class="stat-card" style="padding:14px;--stat-color:var(--accent)">
                <div class="stat-value" style="font-size:1.2rem">${APP.formatRM(currentShift.total_sales)}</div>
                <div class="stat-label">Jumlah Jualan</div>
            </div>
            <div class="stat-card" style="padding:14px;--stat-color:var(--info)">
                <div class="stat-value" style="font-size:1.2rem">${currentShift.total_transactions}</div>
                <div class="stat-label">Transaksi</div>
            </div>
        </div>
        <div style="margin-top:12px;padding:12px;background:var(--bg-secondary);border-radius:8px;font-size:0.85rem;">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                <span style="color:var(--text-muted)">Tunai Pembukaan:</span>
                <span>${APP.formatRM(currentShift.opening_cash)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;">
                <span style="color:var(--text-muted)">Jangkaan Tunai:</span>
                <span style="font-weight:700">${APP.formatRM(currentShift.opening_cash + currentShift.total_cash_sales)}</span>
            </div>
        </div>
    `;
    document.getElementById('closingCash').value = (currentShift.opening_cash + currentShift.total_cash_sales).toFixed(2);
    document.getElementById('closeShiftModal').classList.add('active');
}

async function closeShift() {
    const closingCash = parseFloat(document.getElementById('closingCash').value) || 0;
    try {
        const result = await APP.api('/api/shifts/close', { method: 'POST', body: { closing_cash: closingCash } });
        document.getElementById('closeShiftModal').classList.remove('active');
        currentShift = null;
        updateShiftDisplay();

        const variance = result.shift.cash_variance;
        const msg = variance === 0 ? 'Tiada perbezaan tunai. 🎯' :
            `Perbezaan tunai: ${APP.formatRM(Math.abs(variance))} ${variance > 0 ? '(lebihan)' : '(kurang)'}`;
        APP.toast(`Syif ditutup. ${msg}`, variance === 0 ? 'success' : 'info');
    } catch (err) {
        APP.toast(err.message, 'error');
    }
}

// ===== Event Listeners =====
function setupEventListeners() {
    document.getElementById('searchInput').addEventListener('input', APP.debounce(renderProducts, 200));
    document.getElementById('clearCartBtn').addEventListener('click', clearCart);
    document.getElementById('cashPayBtn').addEventListener('click', showCashModal);
    document.getElementById('qrPayBtn').addEventListener('click', () => processSale('qr_pay'));
    document.getElementById('openShiftBtn').addEventListener('click', openShift);
    document.getElementById('closeShiftBtn').addEventListener('click', closeShift);
    document.getElementById('tenderedInput').addEventListener('input', updateChange);
    document.getElementById('confirmCashBtn').addEventListener('click', () => processSale('cash'));
    document.getElementById('discountInput').addEventListener('input', renderCart);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F1') { e.preventDefault(); showCashModal(); }
        if (e.key === 'F2') { e.preventDefault(); if (cart.length && currentShift) processSale('qr_pay'); }
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
        }
    });
}

// ===== Barcode Scanner =====
function setupBarcodeScanner() {
    document.addEventListener('keypress', (e) => {
        // Ignore if focus is on search/inputs (except when rapid input suggesting scanner)
        const active = document.activeElement;
        const isInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');

        if (isInput && active.id !== 'searchInput') return;

        // Scanner sends characters rapidly followed by Enter
        if (e.key === 'Enter' && barcodeBuffer.length >= 3) {
            e.preventDefault();
            lookupBarcode(barcodeBuffer);
            barcodeBuffer = '';
            clearTimeout(barcodeTimer);
            document.getElementById('barcodeIndicator').classList.remove('show');
            return;
        }

        if (e.key.length === 1) {
            barcodeBuffer += e.key;
            clearTimeout(barcodeTimer);

            if (barcodeBuffer.length >= 3) {
                document.getElementById('barcodeIndicator').classList.add('show');
            }

            barcodeTimer = setTimeout(() => {
                barcodeBuffer = '';
                document.getElementById('barcodeIndicator').classList.remove('show');
            }, 100); // Scanner sends chars within ~50ms
        }
    });
}

async function lookupBarcode(code) {
    const product = allProducts.find(p => p.barcode === code);
    if (product) {
        addToCart(product.id);
        APP.toast(`${product.name} ditambah ✓`, 'success');
    } else {
        APP.toast(`Produk "${code}" tidak dijumpai`, 'error');
    }
}
