/**
 * Dashboard Page Logic
 */
(async () => {
    const user = await APP.checkAuth('admin');
    if (!user) return;

    document.getElementById('sidebar').innerHTML = APP.renderSidebar(user);
    APP.initSidebar('dashboard');

    // Load summary stats
    const summary = await APP.api('/api/analytics/summary');

    document.getElementById('statsGrid').innerHTML = `
        <div class="stat-card" style="--stat-color: var(--success)">
            <div class="stat-icon" style="background:var(--success-bg);color:var(--success)">💰</div>
            <div class="stat-value">${APP.formatRM(summary.todayRevenue)}</div>
            <div class="stat-label">Hasil Hari Ini</div>
        </div>
        <div class="stat-card" style="--stat-color: var(--info)">
            <div class="stat-icon" style="background:var(--info-bg);color:var(--info)">🧾</div>
            <div class="stat-value">${summary.todayTransactions}</div>
            <div class="stat-label">Transaksi Hari Ini</div>
        </div>
        <div class="stat-card" style="--stat-color: var(--accent)">
            <div class="stat-icon" style="background:var(--accent-glow);color:var(--accent-hover)">📊</div>
            <div class="stat-value">${APP.formatRM(summary.totalSales)}</div>
            <div class="stat-label">Jumlah Keseluruhan</div>
        </div>
        <div class="stat-card" style="--stat-color: var(--warning)">
            <div class="stat-icon" style="background:var(--warning-bg);color:var(--warning)">📦</div>
            <div class="stat-value">${summary.activeProducts}</div>
            <div class="stat-label">Produk Aktif</div>
        </div>
        <div class="stat-card" style="--stat-color: var(--qr-color)">
            <div class="stat-icon" style="background:rgba(139,92,246,0.1);color:var(--qr-color)">💳</div>
            <div class="stat-value">${APP.formatRM(summary.avgTransaction)}</div>
            <div class="stat-label">Purata Transaksi</div>
        </div>
        <div class="stat-card" style="--stat-color: var(--danger)">
            <div class="stat-icon" style="background:var(--danger-bg);color:var(--danger)">📕</div>
            <div class="stat-value">${APP.formatRM(summary.outstandingCredits)}</div>
            <div class="stat-label">Hutang Guru</div>
        </div>
    `;

    // Chart defaults
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.borderColor = '#2a3452';
    Chart.defaults.font.family = "'Inter', sans-serif";

    // Revenue trend chart
    const daily = await APP.api('/api/analytics/daily?days=30');
    new Chart(document.getElementById('revenueChart'), {
        type: 'line',
        data: {
            labels: daily.map(d => {
                const dt = new Date(d.sale_date);
                return `${dt.getDate()}/${dt.getMonth()+1}`;
            }),
            datasets: [{
                label: 'Hasil (RM)',
                data: daily.map(d => d.revenue),
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99,102,241,0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 2,
                pointHoverRadius: 5,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, grid: { color: '#1e293b' } }, x: { grid: { display: false } } }
        }
    });

    // Hourly chart
    const hourly = await APP.api('/api/analytics/hourly');
    const schoolHours = hourly.filter(h => h.hour >= 7 && h.hour <= 15);
    new Chart(document.getElementById('hourlyChart'), {
        type: 'bar',
        data: {
            labels: schoolHours.map(h => h.label),
            datasets: [{
                label: 'Transaksi',
                data: schoolHours.map(h => h.transactions),
                backgroundColor: schoolHours.map(h =>
                    (h.hour === 10 || h.hour === 12) ? 'rgba(239,68,68,0.7)' : 'rgba(99,102,241,0.5)'
                ),
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, grid: { color: '#1e293b' } }, x: { grid: { display: false } } }
        }
    });

    // Payment distribution
    const payments = await APP.api('/api/analytics/payments');
    const cashData = payments.find(p => p.payment_method === 'cash') || { total_amount: 0, transaction_count: 0 };
    const qrData = payments.find(p => p.payment_method === 'qr_pay') || { total_amount: 0, transaction_count: 0 };

    new Chart(document.getElementById('paymentChart'), {
        type: 'doughnut',
        data: {
            labels: ['Tunai (Cash)', 'QR Pay'],
            datasets: [{
                data: [cashData.total_amount, qrData.total_amount],
                backgroundColor: ['#10b981', '#8b5cf6'],
                borderColor: '#1a2035',
                borderWidth: 3,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true } }
            }
        }
    });

    // Top products
    const products = await APP.api('/api/analytics/products?limit=8');
    new Chart(document.getElementById('productsChart'), {
        type: 'bar',
        data: {
            labels: products.map(p => p.product_name),
            datasets: [{
                label: 'Hasil (RM)',
                data: products.map(p => p.total_revenue),
                backgroundColor: 'rgba(99,102,241,0.6)',
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: { legend: { display: false } },
            scales: { x: { beginAtZero: true, grid: { color: '#1e293b' } }, y: { grid: { display: false } } }
        }
    });
})();
