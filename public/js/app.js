/**
 * N.A.D.I. POS — Global JavaScript Utilities
 * Sistem Jualan Koperasi Sekolah
 */

const APP = {
    currency: 'RM',
    _inactivityTimer: null,
    _shiftGateActive: false,

    /** Format number as RM currency */
    formatRM(amount) {
        return `RM ${parseFloat(amount || 0).toFixed(2)}`;
    },

    /** Make an API request */
    async api(url, options = {}) {
        const defaults = {
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin'
        };
        const config = { ...defaults, ...options };
        if (options.body && typeof options.body === 'object') {
            config.body = JSON.stringify(options.body);
        }
        try {
            const res = await fetch(url, config);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
            return data;
        } catch (err) {
            if (err.message === 'Unexpected end of JSON input') {
                throw new Error('Server error. Sila cuba lagi.');
            }
            throw err;
        }
    },

    /** Show a toast notification */
    toast(message, type = 'success') {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;
        container.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    },

    /** Check if user is authenticated — redirects to login if not */
    async checkAuth(requiredRole = null) {
        try {
            const data = await this.api('/api/auth/me');
            const user = data.user;
            if (requiredRole && user.role !== requiredRole) {
                window.location.href = '/login';
                return null;
            }
            return user;
        } catch {
            window.location.href = '/login';
            return null;
        }
    },

    /** Logout — auto-closes shift via API */
    async logout() {
        try {
            await this.api('/api/auth/logout', { method: 'POST' });
        } catch {}
        window.location.href = '/login';
    },

    /** 30-minute inactivity auto-logout */
    initInactivityTimer() {
        const TIMEOUT = 30 * 60 * 1000; // 30 minutes
        const reset = () => {
            clearTimeout(this._inactivityTimer);
            this._inactivityTimer = setTimeout(async () => {
                this.toast('Sesi tamat kerana tidak aktif selama 30 minit. Log keluar...', 'warning');
                await new Promise(r => setTimeout(r, 2500));
                this.logout();
            }, TIMEOUT);
        };
        ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'].forEach(e =>
            document.addEventListener(e, reset, { passive: true })
        );
        reset();
    },

    /** Shift Gate — blocks all content until a shift is opened */
    async enforceShiftGate() {
        try {
            const shift = await this.api('/api/shifts/current');
            if (!shift) {
                this._showShiftGate();
            }
            return shift;
        } catch {
            this._showShiftGate();
            return null;
        }
    },

    _showShiftGate() {
        if (document.getElementById('shiftGateOverlay')) return;
        this._shiftGateActive = true;
        const overlay = document.createElement('div');
        overlay.id = 'shiftGateOverlay';
        overlay.className = 'shift-gate-overlay';
        overlay.innerHTML = `
            <div class="shift-gate-card">
                <div class="shift-gate-icon">⚠️</div>
                <h2>Syif Belum Dibuka</h2>
                <p>Anda perlu membuka syif baharu sebelum boleh menggunakan sistem ini. Pastikan anda bersedia untuk memulakan operasi harian.</p>
                <div class="form-group" style="margin-top:20px;">
                    <label class="form-label">Wang Tunai Pembukaan (RM)</label>
                    <input type="number" id="gateOpeningCash" class="form-input" placeholder="0.00" min="0" step="0.01">
                </div>
                <button class="btn btn-primary btn-lg" id="gateOpenShiftBtn" style="width:100%;margin-top:12px;">
                    🔓 Buka Syif Sekarang
                </button>
                <button class="btn btn-ghost" onclick="APP.logout()" style="width:100%;margin-top:8px;">
                    Keluar dari Sistem
                </button>
            </div>
        `;
        document.body.appendChild(overlay);
        document.getElementById('gateOpenShiftBtn').addEventListener('click', async () => {
            const cash = parseFloat(document.getElementById('gateOpeningCash').value) || 0;
            const btn = document.getElementById('gateOpenShiftBtn');
            btn.disabled = true;
            btn.textContent = 'Membuka...';
            try {
                await this.api('/api/shifts/open', { method: 'POST', body: { opening_cash: cash } });
                overlay.remove();
                this._shiftGateActive = false;
                this.toast('Syif berjaya dibuka! Selamat bertugas.', 'success');
            } catch (err) {
                btn.disabled = false;
                btn.textContent = '🔓 Buka Syif Sekarang';
                this.toast(err.message, 'error');
            }
        });
    },

    /** PIN Gate — requires user to verify their password before accessing restricted content */
    async requirePIN(title = 'Kawalan Akses', reason = 'Bahagian ini memerlukan pengesahan kata laluan pentadbir.') {
        return new Promise((resolve) => {
            if (document.getElementById('pinGateModal')) {
                document.getElementById('pinGateModal').remove();
            }
            const modal = document.createElement('div');
            modal.id = 'pinGateModal';
            modal.className = 'modal-overlay active';
            modal.innerHTML = `
                <div class="modal" style="max-width:380px;">
                    <div class="modal-header">
                        <h3>🔐 ${title}</h3>
                        <button class="btn btn-ghost btn-icon" id="pinGateClose">✕</button>
                    </div>
                    <div class="modal-body">
                        <p style="color:var(--text-secondary);margin-bottom:16px;font-size:0.9rem;">${reason}</p>
                        <div class="form-group">
                            <label class="form-label">Kata Laluan Anda</label>
                            <input type="password" id="pinGateInput" class="form-input" placeholder="Masukkan kata laluan..." autocomplete="current-password">
                        </div>
                        <div id="pinGateError" style="color:var(--danger);font-size:0.82rem;min-height:20px;margin-top:4px;"></div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline" id="pinGateCancelBtn">Batal</button>
                        <button class="btn btn-primary" id="pinGateConfirmBtn">Sahkan</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            const input = document.getElementById('pinGateInput');
            const errorEl = document.getElementById('pinGateError');
            const close = (result) => { modal.remove(); resolve(result); };
            document.getElementById('pinGateClose').onclick = () => close(false);
            document.getElementById('pinGateCancelBtn').onclick = () => close(false);
            const confirm = async () => {
                const password = input.value.trim();
                if (!password) { errorEl.textContent = 'Sila masukkan kata laluan.'; return; }
                const btn = document.getElementById('pinGateConfirmBtn');
                btn.disabled = true; btn.textContent = 'Mengesahkan...';
                try {
                    await this.api('/api/auth/verify-password', { method: 'POST', body: { password } });
                    close(true);
                } catch (err) {
                    errorEl.textContent = err.message || 'Kata laluan tidak sah.';
                    btn.disabled = false; btn.textContent = 'Sahkan';
                    input.value = ''; input.focus();
                }
            };
            document.getElementById('pinGateConfirmBtn').onclick = confirm;
            input.addEventListener('keydown', e => { if (e.key === 'Enter') confirm(); });
            setTimeout(() => input.focus(), 100);
        });
    },

    /** Initialize sidebar for admin pages */
    initSidebar(activePage) {
        document.querySelectorAll('.nav-item').forEach(item => {
            if (item.dataset.page === activePage) item.classList.add('active');
        });

        let backdrop = document.getElementById('sidebarBackdrop');
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.id = 'sidebarBackdrop';
            backdrop.className = 'sidebar-backdrop';
            document.body.appendChild(backdrop);
        }
        const sidebar = document.querySelector('.sidebar');
        const openSidebar = () => { sidebar.classList.add('open'); backdrop.classList.add('active'); document.body.style.overflow = 'hidden'; };
        const closeSidebar = () => { sidebar.classList.remove('open'); backdrop.classList.remove('active'); document.body.style.overflow = ''; };
        document.querySelectorAll('.mobile-toggle').forEach(btn => btn.addEventListener('click', () => sidebar.classList.contains('open') ? closeSidebar() : openSidebar()));
        backdrop.addEventListener('click', closeSidebar);
        sidebar.querySelectorAll('.nav-item').forEach(item => item.addEventListener('click', () => { if (window.innerWidth <= 768) closeSidebar(); }));

        if (!document.querySelector('.mobile-top-bar')) {
            const topBar = document.createElement('div');
            topBar.className = 'mobile-top-bar';
            topBar.innerHTML = `<button class="mobile-toggle" aria-label="Buka menu">☰</button><span class="mobile-brand">N.A.D.I.</span>`;
            const mainContent = document.querySelector('.main-content');
            if (mainContent) mainContent.prepend(topBar);
        }

        if (!document.querySelector('.mobile-bottom-nav')) {
            const nav = document.createElement('nav');
            nav.className = 'mobile-bottom-nav';
            const pages = [
                { page: 'dashboard', icon: '📊', label: 'Dashboard' },
                { page: 'pos', icon: '🖥️', label: 'POS' },
                { page: 'sales', icon: '🧾', label: 'Jualan' },
                { page: 'analytics', icon: '📈', label: 'Analitik' },
                { page: 'shifts', icon: '⏰', label: 'Syif' },
            ];
            nav.innerHTML = `<div class="mobile-bottom-nav-inner">` +
                pages.map(p => `<a href="/${p.page}" class="mobile-nav-btn ${activePage === p.page ? 'active' : ''}"><span class="nav-emoji">${p.icon}</span><span>${p.label}</span></a>`).join('') +
            `</div>`;
            document.body.appendChild(nav);
        }
    },

    /** Initialize Theme from LocalStorage */
    initTheme() {
        const theme = localStorage.getItem('theme') || 'light';
        if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
        else document.documentElement.removeAttribute('data-theme');
    },

    /** Toggle Theme */
    toggleTheme() {
        const current = localStorage.getItem('theme') || 'light';
        const next = current === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', next);
        this.initTheme();
        window.dispatchEvent(new Event('themeChanged'));
    },

    /** Render sidebar HTML */
    renderSidebar(user) {
        return `
        <div class="sidebar-brand">
            <div class="brand-icon">🏪</div>
            <div>
                <h1>N.A.D.I.</h1>
                <div class="brand-sub">Sistem Jualan Koperasi</div>
            </div>
        </div>
        <nav class="sidebar-nav">
            <div class="nav-section">
                <div class="nav-section-title" data-i18n="sidebar.main">Utama</div>
                <a href="/dashboard" class="nav-item" data-page="dashboard"><span class="nav-icon">📊</span> <span data-i18n="sidebar.dashboard">Dashboard</span></a>
                <a href="/pos" class="nav-item" data-page="pos"><span class="nav-icon">🖥️</span> <span data-i18n="sidebar.pos">Terminal POS</span></a>
            </div>
            <div class="nav-section">
                <div class="nav-section-title" data-i18n="sidebar.management">Pengurusan</div>
                <a href="/products" class="nav-item protected-nav" data-page="products"><span class="nav-icon">📦</span> <span data-i18n="sidebar.products">Produk</span></a>
                <a href="/categories" class="nav-item protected-nav" data-page="categories"><span class="nav-icon">🏷️</span> <span data-i18n="sidebar.categories">Kategori</span></a>
            </div>
            <div class="nav-section">
                <div class="nav-section-title" data-i18n="sidebar.finance">Kewangan</div>
                <a href="/sales" class="nav-item" data-page="sales"><span class="nav-icon">🧾</span> <span data-i18n="sidebar.sales">Jualan</span></a>
                <a href="/shifts" class="nav-item protected-nav" data-page="shifts"><span class="nav-icon">⏰</span> <span data-i18n="sidebar.shifts">Syif</span></a>
                <a href="/teachers" class="nav-item" data-page="teachers"><span class="nav-icon">👩‍🏫</span> <span data-i18n="sidebar.teachers">Guru</span></a>
                <a href="/credits" class="nav-item" data-page="credits"><span class="nav-icon">💳</span> <span data-i18n="sidebar.credits">Hutang Guru</span></a>
            </div>
            <div class="nav-section">
                <div class="nav-section-title" data-i18n="sidebar.reports">Laporan</div>
                <a href="/analytics" class="nav-item" data-page="analytics"><span class="nav-icon">📈</span> <span data-i18n="sidebar.analytics">Analitik</span></a>
                <a href="/reports" class="nav-item" data-page="reports"><span class="nav-icon">📋</span> <span data-i18n="sidebar.reports_page">Laporan</span></a>
            </div>
        </nav>
        <div class="sidebar-toggles" style="padding:0 20px 10px; display:flex; gap:10px;">
            <button class="btn btn-outline" style="flex:1; padding:6px; font-size:1rem;" onclick="APP.toggleTheme()" title="Toggle Theme">🌙/☀️</button>
            <button class="btn btn-outline" style="flex:1; padding:6px; font-size:0.85rem; font-weight:bold;" onclick="if(window.I18N) window.I18N.toggleLang()" title="Toggle Language">🌐 EN/MS</button>
        </div>
        <div class="sidebar-footer">
            <div class="user-card">
                <div class="user-avatar">${(user.name || 'U')[0].toUpperCase()}</div>
                <div class="user-info">
                    <div class="user-name">${user.name}</div>
                    <div class="user-role">${user.role === 'admin' ? 'Pentadbir' : 'Juruwang'}</div>
                </div>
                <button class="btn-ghost" onclick="APP.logout()" title="Log Keluar">🚪</button>
            </div>
        </div>`;
    },

    /** Attach PIN gate to protected nav items */
    initProtectedNav() {
        document.querySelectorAll('.protected-nav').forEach(link => {
            link.addEventListener('click', async (e) => {
                e.preventDefault();
                const href = link.getAttribute('href');
                const passed = await this.requirePIN('Kawalan Akses Pengurusan', 'Bahagian ini dikhaskan untuk pentadbir. Sila masukkan kata laluan anda untuk teruskan.');
                if (passed) window.location.href = href;
            });
        });
    },

    /** Date formatting helpers */
    formatDate(dateStr) {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' });
    },
    formatTime(dateStr) {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' });
    },
    formatDateTime(dateStr) {
        if (!dateStr) return '-';
        return `${this.formatDate(dateStr)} ${this.formatTime(dateStr)}`;
    },

    /** Debounce helper */
    debounce(fn, delay = 300) {
        let timer;
        return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
    }
};

// Initialize theme immediately to prevent flash
APP.initTheme();
