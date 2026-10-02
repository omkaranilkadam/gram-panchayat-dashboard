/* ============================================================
   GRAM PANCHAYAT DASHBOARD — app.js
   Full production implementation — zero stubs, zero placeholders.
   ============================================================ */

// ────────────────────────────────────────────────────────────
// 1. CONFIGURATION
// ────────────────────────────────────────────────────────────
const CONFIG = {
    // ⚠️ CHANGE this to your Render URL after deploying the backend
    //    e.g. 'https://your-app.onrender.com/api/v1'
    API_URL: (() => {
        const h = window.location.hostname;
        if (h === 'localhost' || h === '127.0.0.1' || /^192\.168\./.test(h))
            return `${window.location.protocol}//${h}:8002/api/v1`;
        return 'https://gram-panchayat-api-wd18.onrender.com/api/v1';
    })(),
    POLL_INTERVAL: 30_000,
    MAP_CENTER: [21.1458, 79.0882],
    MAP_ZOOM: 14,
};

// ────────────────────────────────────────────────────────────
// 2. APPLICATION STATE
// ────────────────────────────────────────────────────────────
const S = {
    token: localStorage.getItem('token'),
    complaints: [],
    stats: null,
    settings: null,
    user: null,
    charts: {},
    maps: { dash: null, full: null },
    markers: { dash: {}, full: {} },
    pollId: null,
    confirmCb: null,
};

// ────────────────────────────────────────────────────────────
// 3. UTILITY HELPERS
// ────────────────────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const PLACEHOLDER_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' fill='%23cbd5e1'%3E%3Crect width='400' height='300' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='16' fill='%2394a3b8'%3ENo Image%3C/text%3E%3C/svg%3E";

const formatDate = (s) => {
    if (!s) return '—';
    const d = new Date(s);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const statusMap = {
    pending:     { label: 'Pending',     icon: 'ph-hourglass-high', cls: 'status-pending' },
    in_progress: { label: 'In Progress', icon: 'ph-wrench',         cls: 'status-in_progress' },
    resolved:    { label: 'Resolved',    icon: 'ph-check-circle',   cls: 'status-resolved' },
};
const getStatus = (s) => statusMap[s] || { label: s, icon: 'ph-question', cls: '' };

const categoryLabels = {
    road: '🛣️ Road', water: '💧 Water', electricity: '⚡ Electricity',
    sanitation: '🧹 Sanitation', drainage: '🌊 Drainage',
    public_property: '🏛️ Public Property', animal_control: '🐄 Animal Control',
    encroachment: '🚧 Encroachment',
};
const getCategoryLabel = (c) => categoryLabels[c] || c;

const priorityLabels = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };

const imgUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const base = CONFIG.API_URL.replace('/api/v1', '');
    return `${base}${path}`;
};

// ────────────────────────────────────────────────────────────
// 4. TOAST NOTIFICATIONS
// ────────────────────────────────────────────────────────────
const TOAST_ICONS = { success: 'ph-check-circle', error: 'ph-x-circle', warning: 'ph-warning', info: 'ph-info' };

function showToast(message, type = 'info', duration = 4000) {
    const container = $('#toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="ph ${TOAST_ICONS[type] || TOAST_ICONS.info}"></i><span>${message}</span><button class="toast-close" aria-label="Close"><i class="ph ph-x"></i></button>`;
    container.appendChild(toast);
    toast.querySelector('.toast-close').onclick = () => removeToast(toast);
    setTimeout(() => removeToast(toast), duration);
}

function removeToast(el) {
    if (!el || el.classList.contains('removing')) return;
    el.classList.add('removing');
    el.addEventListener('animationend', () => el.remove());
}

// ────────────────────────────────────────────────────────────
// 5. CONFIRM DIALOG
// ────────────────────────────────────────────────────────────
function showConfirm(title, message) {
    return new Promise((resolve) => {
        $('#confirmTitle').textContent = title;
        $('#confirmMessage').textContent = message;
        $('#confirmDialog').classList.add('show');
        S.confirmCb = resolve;
    });
}

$('#confirmOk').addEventListener('click', () => { $('#confirmDialog').classList.remove('show'); S.confirmCb?.(true); });
$('#confirmCancel').addEventListener('click', () => { $('#confirmDialog').classList.remove('show'); S.confirmCb?.(false); });

// ────────────────────────────────────────────────────────────
// 6. API SERVICE LAYER
// ────────────────────────────────────────────────────────────
async function api(path, opts = {}) {
    const headers = { ...(opts.headers || {}) };
    if (S.token) headers['Authorization'] = `Bearer ${S.token}`;
    if (opts.body && !(opts.body instanceof FormData) && !(opts.body instanceof URLSearchParams)) {
        headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(opts.body);
    }
    try {
        const res = await fetch(`${CONFIG.API_URL}${path}`, { ...opts, headers });
        if (res.status === 401) { handleLogout(); throw new Error('Session expired'); }
        if (res.status === 204) return null;
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || `HTTP ${res.status}`); }
        return res.json();
    } catch (err) {
        if (err.message !== 'Session expired') console.error('API Error:', err);
        throw err;
    }
}

// ────────────────────────────────────────────────────────────
// 7. AUTH
// ────────────────────────────────────────────────────────────
async function handleLogin(e) {
    e.preventDefault();
    const user = $('#username').value.trim();
    const pass = $('#password').value;
    const errEl = $('#loginError');
    const btn = $('#loginBtn');

    btn.querySelector('.btn-text').classList.add('hidden');
    btn.querySelector('.btn-loader').classList.remove('hidden');
    btn.disabled = true;
    errEl.textContent = '';

    try {
        const form = new URLSearchParams();
        form.append('username', user);
        form.append('password', pass);
        const data = await api('/auth/login', { method: 'POST', body: form });
        S.token = data.access_token;
        localStorage.setItem('token', S.token);
        enterApp();
    } catch (err) {
        errEl.textContent = err.message || 'Login failed';
    } finally {
        btn.querySelector('.btn-text').classList.remove('hidden');
        btn.querySelector('.btn-loader').classList.add('hidden');
        btn.disabled = false;
    }
}

function handleLogout() {
    S.token = null;
    localStorage.removeItem('token');
    if (S.pollId) clearInterval(S.pollId);
    S.pollId = null;
    $('#appContainer').classList.add('hidden-app');
    $('#view-login').classList.add('active-view');
    $('#loginForm').reset();
    showToast('Logged out successfully', 'info');
}

async function enterApp() {
    $('#view-login').classList.remove('active-view');
    $('#appContainer').classList.remove('hidden-app');

    // Fetch user profile
    try { S.user = await api('/auth/me'); } catch { S.user = null; }
    updateUserUI();

    initMaps();
    await Promise.all([fetchComplaints(), fetchStats(), fetchSettings()]);
    switchView('dashboard');
    startPolling();
}

function updateUserUI() {
    if (!S.user) return;
    const name = S.user.full_name || S.user.username;
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    $('#userName').textContent = name;
    $('#userAvatar').textContent = initials;
}

function startPolling() {
    if (S.pollId) clearInterval(S.pollId);
    S.pollId = setInterval(async () => {
        await Promise.all([fetchComplaints(), fetchStats()]);
    }, CONFIG.POLL_INTERVAL);
}

// ────────────────────────────────────────────────────────────
// 8. SPA NAVIGATION
// ────────────────────────────────────────────────────────────
function switchView(name) {
    $$('.view-section').forEach(el => { if (el.id !== 'view-login') el.classList.remove('active-view'); });
    $$('.nav-item').forEach(el => el.classList.remove('active'));
    const view = $(`#view-${name}`);
    if (view) view.classList.add('active-view');
    const nav = $(`#nav-${name}`);
    if (nav) nav.classList.add('active');

    // Close mobile sidebar
    $('#sidebar').classList.remove('open');
    $('#sidebarOverlay').classList.remove('show');

    // Fix map rendering
    if (name === 'dashboard' || name === 'map') {
        setTimeout(() => {
            S.maps.dash?.invalidateSize();
            S.maps.full?.invalidateSize();
        }, 150);
    }

    // Init analytics charts when visiting analytics view
    if (name === 'analytics' && S.stats) renderAnalyticsCharts(S.stats);
}

// ────────────────────────────────────────────────────────────
// 9. MAPS (Leaflet)
// ────────────────────────────────────────────────────────────
function initMaps() {
    if (!S.maps.dash) {
        S.maps.dash = L.map('map').setView(CONFIG.MAP_CENTER, CONFIG.MAP_ZOOM);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OSM' }).addTo(S.maps.dash);
    }
    if (!S.maps.full) {
        S.maps.full = L.map('full-map').setView(CONFIG.MAP_CENTER, CONFIG.MAP_ZOOM);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OSM' }).addTo(S.maps.full);
    }
}

function renderMarkers(data) {
    if (!S.maps.dash || !S.maps.full) return;
    // Clear old
    Object.values(S.markers.dash).forEach(m => S.maps.dash.removeLayer(m));
    Object.values(S.markers.full).forEach(m => S.maps.full.removeLayer(m));
    S.markers.dash = {}; S.markers.full = {};

    data.forEach(c => {
        const icon = L.divIcon({ className: `custom-marker marker-${c.status}`, iconSize: [14, 14], iconAnchor: [7, 7] });
        const popup = `<b>${c.title}</b><br><small>${getCategoryLabel(c.category)}</small><br><a href="#" onclick="openDetail(${c.id}); return false;">View Details</a>`;
        const m1 = L.marker([c.latitude, c.longitude], { icon }).addTo(S.maps.dash).bindPopup(popup);
        S.markers.dash[c.id] = m1;
        const m2 = L.marker([c.latitude, c.longitude], { icon }).addTo(S.maps.full).bindPopup(popup);
        S.markers.full[c.id] = m2;
    });
}

// ────────────────────────────────────────────────────────────
// 10. FETCH & RENDER COMPLAINTS
// ────────────────────────────────────────────────────────────
async function fetchComplaints() {
    try {
        S.complaints = await api('/complaints/');
        renderAll();
    } catch (err) {
        console.error('Fetch complaints failed:', err);
    }
}

function renderAll() {
    const filter = $('#mapFilter').value;
    const fullFilter = $('#fullMapFilter').value;
    const search = $('#searchInput').value.toLowerCase();
    const fStatus = $('#filterStatus').value;
    const fCat = $('#filterCategory').value;
    const fPri = $('#filterPriority').value;

    // Dashboard map: use mapFilter
    const mapData = S.complaints.filter(c =>
        (filter === 'all' || c.status === filter)
    );
    renderMarkers(mapData);

    // Dashboard feed: recent 8
    const feedData = [...S.complaints]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 8);
    renderComplaintsList($('#complaintsList'), feedData, true);

    // Full list: all filters
    const fullData = S.complaints.filter(c => {
        if (fStatus !== 'all' && c.status !== fStatus) return false;
        if (fCat !== 'all' && c.category !== fCat) return false;
        if (fPri !== 'all' && c.priority !== fPri) return false;
        if (search) {
            const s = search;
            if (!c.title.toLowerCase().includes(s) &&
                !c.description.toLowerCase().includes(s) &&
                !(c.ward || '').toLowerCase().includes(s) &&
                !(c.complainant_name || '').toLowerCase().includes(s)) return false;
        }
        return true;
    });
    renderComplaintsList($('#fullComplaintsList'), fullData, false);

    // Empty state
    const emptyEl = $('#complaintsEmpty');
    if (fullData.length === 0) { emptyEl.classList.remove('hidden'); $('#fullComplaintsList').style.display = 'none'; }
    else { emptyEl.classList.add('hidden'); $('#fullComplaintsList').style.display = ''; }

    // Badge
    const pendingCount = S.complaints.filter(c => c.status === 'pending').length;
    const badge = $('#newComplaintsBadge');
    badge.textContent = pendingCount > 0 ? pendingCount : '';

    // Notification dot
    const dot = $('#notificationDot');
    if (dot) dot.style.display = pendingCount > 0 ? 'block' : 'none';
}

function renderComplaintsList(container, data, compact) {
    if (!container) return;
    container.innerHTML = '';
    if (data.length === 0) {
        container.innerHTML = '<p style="padding:1rem;color:var(--text-muted);text-align:center;">No complaints to display.</p>';
        return;
    }
    data.forEach(c => {
        const st = getStatus(c.status);
        const card = document.createElement('div');
        card.className = 'complaint-card';
        card.onclick = () => openDetail(c.id);
        card.innerHTML = `
            <div class="category-icon"><span>${(categoryLabels[c.category] || '📋').split(' ')[0]}</span></div>
            <div class="complaint-info">
                <div class="complaint-header">
                    <div class="complaint-title">${c.title}</div>
                    <span class="status-badge ${st.cls}"><i class="ph ${st.icon}"></i> ${st.label}</span>
                </div>
                <div class="complaint-meta">
                    ${c.ward ? `<span><i class="ph ph-map-pin"></i> ${c.ward}</span><span>&bull;</span>` : ''}
                    <span><i class="ph ph-clock"></i> ${formatDate(c.created_at)}</span>
                    ${!compact ? `<span>&bull;</span><span class="priority-badge priority-${c.priority}">${priorityLabels[c.priority] || c.priority}</span>` : ''}
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// ────────────────────────────────────────────────────────────
// 11. DASHBOARD STATS
// ────────────────────────────────────────────────────────────
async function fetchStats() {
    try {
        S.stats = await api('/stats/dashboard');
        renderStats(S.stats);
        renderDashboardCharts(S.stats);
    } catch (err) {
        console.error('Fetch stats failed:', err);
    }
}

function renderStats(d) {
    animateValue('stat-total', d.total);
    animateValue('stat-pending', d.pending);
    animateValue('stat-resolved', d.resolved);
    animateValue('stat-inprogress', d.in_progress);
    const rate = d.total > 0 ? Math.round((d.resolved / d.total) * 100) : 0;
    const rateEl = $('#resolutionRate');
    if (rateEl) rateEl.textContent = `${rate}%`;

    // Notifications list
    renderNotifications(d.recent_activity);
}

function animateValue(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    const start = parseInt(el.textContent) || 0;
    if (start === target) { el.textContent = target; return; }
    const duration = 600;
    const startTime = performance.now();
    function update(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        el.textContent = Math.round(start + (target - start) * eased);
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

// ────────────────────────────────────────────────────────────
// 12. NOTIFICATIONS
// ────────────────────────────────────────────────────────────
function renderNotifications(recent) {
    const list = $('#notificationsList');
    const emptyEl = $('#notifEmpty');
    if (!list) return;
    list.innerHTML = '';
    const pending = (recent || []).filter(r => r.status === 'pending').slice(0, 6);
    if (pending.length === 0) { emptyEl.classList.remove('hidden'); return; }
    emptyEl.classList.add('hidden');
    pending.forEach(r => {
        const item = document.createElement('div');
        item.className = 'notif-item';
        item.onclick = () => { openDetail(r.id); toggleNotifications(); };
        item.innerHTML = `<i class="ph ph-warning-circle text-warning"></i><div><p>${r.title}</p><small>${r.ward || r.category} — ${formatDate(r.created_at)}</small></div>`;
        list.appendChild(item);
    });
}

function toggleNotifications() {
    $('#notificationsDropdown').classList.toggle('show');
}

// ────────────────────────────────────────────────────────────
// 13. CHARTS (Chart.js)
// ────────────────────────────────────────────────────────────
const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

function getChartDefaults() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
        color: isDark ? '#94a3b8' : '#64748b',
        borderColor: isDark ? 'rgba(51,65,85,0.5)' : 'rgba(226,232,240,0.8)',
    };
}

function destroyChart(key) { if (S.charts[key]) { S.charts[key].destroy(); delete S.charts[key]; } }

function renderDashboardCharts(d) {
    const defaults = getChartDefaults();

    // Category Donut
    destroyChart('category');
    const catLabels = Object.keys(d.categories);
    const catData = Object.values(d.categories);
    S.charts.category = new Chart($('#categoryChart'), {
        type: 'doughnut',
        data: { labels: catLabels.map(getCategoryLabel), datasets: [{ data: catData, backgroundColor: CHART_COLORS.slice(0, catLabels.length), borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { padding: 15, color: defaults.color, font: { size: 11 } } } }, cutout: '65%' },
    });

    // Monthly Trend
    destroyChart('trend');
    const months = (d.monthly_trend || []).map(m => m.month);
    S.charts.trend = new Chart($('#trendChart'), {
        type: 'line',
        data: {
            labels: months,
            datasets: [
                { label: 'Pending', data: d.monthly_trend.map(m => m.pending), borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', fill: true, tension: 0.4 },
                { label: 'In Progress', data: d.monthly_trend.map(m => m.in_progress), borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', fill: true, tension: 0.4 },
                { label: 'Resolved', data: d.monthly_trend.map(m => m.resolved), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.4 },
            ],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { padding: 15, color: defaults.color, font: { size: 11 } } } }, scales: { y: { beginAtZero: true, ticks: { color: defaults.color, stepSize: 1 }, grid: { color: defaults.borderColor } }, x: { ticks: { color: defaults.color }, grid: { display: false } } } },
    });
}

function renderAnalyticsCharts(d) {
    const defaults = getChartDefaults();

    // Time chart (same as trend but larger)
    destroyChart('analyticsTime');
    const months = (d.monthly_trend || []).map(m => m.month);
    S.charts.analyticsTime = new Chart($('#analyticsTimeChart'), {
        type: 'bar',
        data: {
            labels: months,
            datasets: [
                { label: 'Pending', data: d.monthly_trend.map(m => m.pending), backgroundColor: '#f59e0b' },
                { label: 'In Progress', data: d.monthly_trend.map(m => m.in_progress), backgroundColor: '#3b82f6' },
                { label: 'Resolved', data: d.monthly_trend.map(m => m.resolved), backgroundColor: '#10b981' },
            ],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: defaults.color } } }, scales: { y: { beginAtZero: true, stacked: true, ticks: { color: defaults.color, stepSize: 1 }, grid: { color: defaults.borderColor } }, x: { stacked: true, ticks: { color: defaults.color }, grid: { display: false } } } },
    });

    // Category donut
    destroyChart('analyticsCat');
    const catLabels = Object.keys(d.categories);
    S.charts.analyticsCat = new Chart($('#analyticsCategoryChart'), {
        type: 'doughnut',
        data: { labels: catLabels.map(getCategoryLabel), datasets: [{ data: Object.values(d.categories), backgroundColor: CHART_COLORS, borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '60%', plugins: { legend: { position: 'bottom', labels: { color: defaults.color, font: { size: 11 }, padding: 12 } } } },
    });

    // Priority bar
    destroyChart('analyticsPri');
    const priLabels = Object.keys(d.priorities);
    const priColors = { critical: '#ef4444', high: '#f59e0b', medium: '#3b82f6', low: '#10b981' };
    S.charts.analyticsPri = new Chart($('#analyticsPriorityChart'), {
        type: 'bar',
        data: { labels: priLabels.map(p => priorityLabels[p] || p), datasets: [{ label: 'Count', data: Object.values(d.priorities), backgroundColor: priLabels.map(p => priColors[p] || '#94a3b8'), borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { color: defaults.color, stepSize: 1 }, grid: { color: defaults.borderColor } }, y: { ticks: { color: defaults.color }, grid: { display: false } } } },
    });

    // Status pie
    destroyChart('analyticsStatus');
    S.charts.analyticsStatus = new Chart($('#analyticsStatusChart'), {
        type: 'pie',
        data: { labels: ['Pending', 'In Progress', 'Resolved'], datasets: [{ data: [d.pending, d.in_progress, d.resolved], backgroundColor: ['#f59e0b', '#3b82f6', '#10b981'], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: defaults.color, padding: 12 } } } },
    });

    // Ward bar
    destroyChart('analyticsWard');
    const wardLabels = Object.keys(d.wards || {});
    S.charts.analyticsWard = new Chart($('#analyticsWardChart'), {
        type: 'bar',
        data: { labels: wardLabels, datasets: [{ label: 'Complaints', data: Object.values(d.wards || {}), backgroundColor: '#8b5cf6', borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { color: defaults.color, stepSize: 1 }, grid: { color: defaults.borderColor } }, x: { ticks: { color: defaults.color }, grid: { display: false } } } },
    });
}

// ────────────────────────────────────────────────────────────
// 14. COMPLAINT DETAIL MODAL
// ────────────────────────────────────────────────────────────
window.openDetail = async function (id) {
    let complaint;
    try { complaint = await api(`/complaints/${id}`); } catch { showToast('Failed to load complaint', 'error'); return; }

    const st = getStatus(complaint.status);
    const image = imgUrl(complaint.media_urls);

    let timelineHtml = '';
    if (complaint.notes && complaint.notes.length > 0) {
        const items = [...complaint.notes].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        timelineHtml = `
            <div class="timeline-section">
                <h4><i class="ph ph-clock-counter-clockwise"></i> Timeline</h4>
                <div class="timeline-list">${items.map(n => `
                    <div class="timeline-item ${n.note_type === 'status_change' ? 'status-change' : ''}">
                        <div class="timeline-dot"></div>
                        <div class="timeline-content">
                            <p>${n.content}</p>
                            <small>${n.author} — ${formatDate(n.created_at)}</small>
                        </div>
                    </div>`).join('')}
                </div>
                <div class="note-form mt-2">
                    <input type="text" class="modern-input" id="noteInput" placeholder="Add a note...">
                    <button class="btn btn-primary btn-sm" onclick="addNote(${complaint.id})"><i class="ph ph-paper-plane-tilt"></i></button>
                </div>
            </div>`;
    } else {
        timelineHtml = `
            <div class="timeline-section">
                <h4><i class="ph ph-clock-counter-clockwise"></i> Timeline</h4>
                <p class="text-muted" style="font-size:.85rem;">No timeline entries yet.</p>
                <div class="note-form mt-1">
                    <input type="text" class="modern-input" id="noteInput" placeholder="Add a note...">
                    <button class="btn btn-primary btn-sm" onclick="addNote(${complaint.id})"><i class="ph ph-paper-plane-tilt"></i></button>
                </div>
            </div>`;
    }

    $('#modalBody').innerHTML = `
        <div class="modal-media">
            ${image
                ? `<img src="${image}" alt="Evidence" onerror="this.parentElement.innerHTML='<div class=\\'no-image\\'><i class=\\'ph ph-image-broken\\'></i><p>Image unavailable</p></div>'">`
                : `<div class="no-image"><i class="ph ph-camera-slash"></i><p>No photo attached</p></div>`
            }
        </div>
        <div class="modal-details">
            <div class="modal-header-row">
                <h2 class="modal-title">${complaint.title}</h2>
                <div class="modal-badges">
                    <span class="status-badge ${st.cls}"><i class="ph ${st.icon}"></i> ${st.label}</span>
                    <span class="priority-badge priority-${complaint.priority}">${priorityLabels[complaint.priority] || complaint.priority}</span>
                </div>
            </div>
            <p class="modal-desc">${complaint.description}</p>
            <div class="modal-meta-grid">
                <div class="meta-item"><div class="meta-icon"><i class="ph ph-tag"></i></div><div class="meta-info"><h5>Category</h5><p>${getCategoryLabel(complaint.category)}</p></div></div>
                <div class="meta-item"><div class="meta-icon"><i class="ph ph-map-pin-line"></i></div><div class="meta-info"><h5>Location</h5><p>${complaint.ward || `${complaint.latitude.toFixed(4)}, ${complaint.longitude.toFixed(4)}`}</p></div></div>
                <div class="meta-item"><div class="meta-icon"><i class="ph ph-calendar"></i></div><div class="meta-info"><h5>Filed On</h5><p>${formatDate(complaint.created_at)}</p></div></div>
                <div class="meta-item"><div class="meta-icon"><i class="ph ph-hash"></i></div><div class="meta-info"><h5>ID</h5><p>#${complaint.id}</p></div></div>
                ${complaint.complainant_name ? `<div class="meta-item"><div class="meta-icon"><i class="ph ph-user"></i></div><div class="meta-info"><h5>Complainant</h5><p>${complaint.complainant_name}</p></div></div>` : ''}
                ${complaint.complainant_phone ? `<div class="meta-item"><div class="meta-icon"><i class="ph ph-phone"></i></div><div class="meta-info"><h5>Phone</h5><p>${complaint.complainant_phone}</p></div></div>` : ''}
            </div>
            ${timelineHtml}
            <div class="modal-actions">
                ${complaint.status !== 'in_progress' ? `<button class="btn btn-primary" onclick="updateStatus(${complaint.id},'in_progress')"><i class="ph ph-wrench"></i> Mark In Progress</button>` : ''}
                ${complaint.status !== 'resolved' ? `<button class="btn btn-outline" style="background:var(--success);color:#fff;border-color:var(--success);" onclick="updateStatus(${complaint.id},'resolved')"><i class="ph ph-check-circle"></i> Mark Resolved</button>` : ''}
                <button class="btn btn-danger btn-sm" onclick="deleteComplaint(${complaint.id})"><i class="ph ph-trash"></i> Delete</button>
            </div>
        </div>`;

    $('#complaintModal').classList.add('show');
    // Fly map to location
    S.maps.dash?.flyTo([complaint.latitude, complaint.longitude], 16);
    S.maps.full?.flyTo([complaint.latitude, complaint.longitude], 16);
};

window.addNote = async function (id) {
    const input = $('#noteInput');
    const content = input?.value.trim();
    if (!content) return;
    try {
        await api(`/complaints/${id}/notes`, { method: 'POST', body: { content } });
        showToast('Note added', 'success');
        openDetail(id); // Refresh modal
    } catch (err) { showToast(err.message, 'error'); }
};

window.updateStatus = async function (id, newStatus) {
    try {
        await api(`/complaints/${id}/status`, { method: 'PATCH', body: { status: newStatus } });
        closeModal('complaintModal');
        showToast(`Complaint #${id} marked as ${newStatus.replace('_', ' ')}`, 'success');
        await Promise.all([fetchComplaints(), fetchStats()]);
    } catch (err) { showToast(err.message, 'error'); }
};

window.deleteComplaint = async function (id) {
    const ok = await showConfirm('Delete Complaint', `Are you sure you want to permanently delete complaint #${id}? This cannot be undone.`);
    if (!ok) return;
    try {
        await api(`/complaints/${id}`, { method: 'DELETE' });
        closeModal('complaintModal');
        showToast(`Complaint #${id} deleted`, 'warning');
        await Promise.all([fetchComplaints(), fetchStats()]);
    } catch (err) { showToast(err.message, 'error'); }
};

// ────────────────────────────────────────────────────────────
// 15. NEW COMPLAINT
// ────────────────────────────────────────────────────────────
async function submitNewComplaint(e) {
    e.preventDefault();
    const btn = $('#submitComplaintBtn');
    btn.querySelector('.btn-text').classList.add('hidden');
    btn.querySelector('.btn-loader').classList.remove('hidden');
    btn.disabled = true;

    try {
        let mediaUrl = null;
        const fileInput = $('#ncImage');
        if (fileInput.files.length > 0) {
            const formData = new FormData();
            formData.append('file', fileInput.files[0]);
            const uploadRes = await api('/upload/', { method: 'POST', body: formData });
            mediaUrl = uploadRes.url;
        }

        const body = {
            title: $('#ncTitle').value.trim(),
            description: $('#ncDescription').value.trim(),
            category: $('#ncCategory').value,
            priority: $('#ncPriority').value,
            latitude: parseFloat($('#ncLat').value),
            longitude: parseFloat($('#ncLng').value),
            ward: $('#ncWard').value.trim() || null,
            complainant_name: $('#ncName').value.trim() || null,
            complainant_phone: $('#ncPhone').value.trim() || null,
            media_urls: mediaUrl,
        };

        await api('/complaints/', { method: 'POST', body });
        closeModal('newComplaintModal');
        $('#newComplaintForm').reset();
        showToast('Complaint registered successfully!', 'success');
        await Promise.all([fetchComplaints(), fetchStats()]);
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.querySelector('.btn-text').classList.remove('hidden');
        btn.querySelector('.btn-loader').classList.add('hidden');
        btn.disabled = false;
    }
}

function geolocate() {
    if (!navigator.geolocation) { showToast('Geolocation not supported', 'warning'); return; }
    showToast('Detecting location...', 'info', 2000);
    navigator.geolocation.getCurrentPosition(
        (pos) => { $('#ncLat').value = pos.coords.latitude.toFixed(6); $('#ncLng').value = pos.coords.longitude.toFixed(6); showToast('Location detected!', 'success'); },
        () => showToast('Could not detect location', 'error')
    );
}

// ────────────────────────────────────────────────────────────
// 16. SETTINGS
// ────────────────────────────────────────────────────────────
async function fetchSettings() {
    try {
        S.settings = await api('/settings/');
        populateSettings(S.settings);
    } catch (err) { console.error('Fetch settings failed:', err); }
}

function populateSettings(s) {
    if (!s) return;
    $('#settPanchayatName').value = s.panchayat_name || '';
    $('#settPanchayatNameEn').value = s.panchayat_name_en || '';
    $('#settVillage').value = s.village_name || '';
    $('#settDistrict').value = s.district || '';
    $('#settState').value = s.state || '';
    $('#settAdminName').value = s.admin_name || '';
    $('#settPhone').value = s.contact_phone || '';
    $('#settEmail').value = s.contact_email || '';
    $('#settNotifications').checked = s.notifications_enabled;
    $('#settDarkMode').checked = s.dark_mode;
    // Apply dark mode
    applyDarkMode(s.dark_mode);
    // Update sidebar subtitle
    const sub = $('#sidebarSubtitle');
    if (sub) sub.textContent = s.village_name ? `${s.village_name}, ${s.district}` : '';
}

async function saveSettings() {
    const body = {
        panchayat_name: $('#settPanchayatName').value,
        panchayat_name_en: $('#settPanchayatNameEn').value,
        village_name: $('#settVillage').value,
        district: $('#settDistrict').value,
        state: $('#settState').value,
        admin_name: $('#settAdminName').value,
        contact_phone: $('#settPhone').value,
        contact_email: $('#settEmail').value,
        notifications_enabled: $('#settNotifications').checked,
        dark_mode: $('#settDarkMode').checked,
    };
    try {
        S.settings = await api('/settings/', { method: 'PUT', body });
        populateSettings(S.settings);
        showToast('Settings saved successfully!', 'success');
    } catch (err) { showToast(err.message, 'error'); }
}

// ────────────────────────────────────────────────────────────
// 17. DARK MODE
// ────────────────────────────────────────────────────────────
function applyDarkMode(enabled) {
    document.documentElement.setAttribute('data-theme', enabled ? 'dark' : 'light');
    // Re-render charts with new colors if they exist
    if (S.stats) {
        renderDashboardCharts(S.stats);
        // Only re-render analytics if that view is active
        if ($('#view-analytics')?.classList.contains('active-view')) renderAnalyticsCharts(S.stats);
    }
}

// ────────────────────────────────────────────────────────────
// 18. CSV EXPORT
// ────────────────────────────────────────────────────────────
function exportCSV() {
    if (S.complaints.length === 0) { showToast('No data to export', 'warning'); return; }
    const headers = ['ID', 'Title', 'Description', 'Category', 'Priority', 'Status', 'Ward', 'Complainant', 'Phone', 'Latitude', 'Longitude', 'Created At'];
    const rows = S.complaints.map(c => [
        c.id, `"${(c.title || '').replace(/"/g, '""')}"`, `"${(c.description || '').replace(/"/g, '""')}"`,
        c.category, c.priority, c.status, c.ward || '', c.complainant_name || '', c.complainant_phone || '',
        c.latitude, c.longitude, c.created_at || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `complaints_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported!', 'success');
}

// ────────────────────────────────────────────────────────────
// 19. MODAL HELPERS
// ────────────────────────────────────────────────────────────
function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('show');
}

// Close on backdrop click
$$('.modal-backdrop').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('show');
    });
});

// Close buttons
$$('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.close));
});

// ────────────────────────────────────────────────────────────
// 20. EVENT LISTENERS
// ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Login form
    $('#loginForm').addEventListener('submit', handleLogin);

    // Logout
    $('#logoutBtn').addEventListener('click', handleLogout);

    // Sidebar nav
    $$('.nav-item[data-view]').forEach(item => {
        item.addEventListener('click', () => switchView(item.dataset.view));
    });

    // Navigate buttons (e.g. "View All")
    $$('[data-navigate]').forEach(btn => {
        btn.addEventListener('click', () => switchView(btn.dataset.navigate));
    });

    // Mobile hamburger
    $('#hamburgerBtn')?.addEventListener('click', () => {
        $('#sidebar').classList.toggle('open');
        $('#sidebarOverlay').classList.toggle('show');
    });
    $('#sidebarOverlay')?.addEventListener('click', () => {
        $('#sidebar').classList.remove('open');
        $('#sidebarOverlay').classList.remove('show');
    });

    // Search
    $('#searchInput').addEventListener('input', renderAll);
    $('#mapFilter').addEventListener('change', renderAll);
    $('#fullMapFilter').addEventListener('change', () => {
        const filter = $('#fullMapFilter').value;
        const data = S.complaints.filter(c => filter === 'all' || c.status === filter);
        renderMarkers(data);
    });

    // Complaint list filters
    $('#filterStatus').addEventListener('change', renderAll);
    $('#filterCategory').addEventListener('change', renderAll);
    $('#filterPriority').addEventListener('change', renderAll);

    // New complaint modal
    $('#newComplaintBtn').addEventListener('click', () => $('#newComplaintModal').classList.add('show'));
    $('#newComplaintForm').addEventListener('submit', submitNewComplaint);
    $('#geolocateBtn').addEventListener('click', geolocate);

    // Notifications
    $('#notifBellBtn').addEventListener('click', toggleNotifications);
    $('#mobileNotifBtn')?.addEventListener('click', toggleNotifications);
    $('#clearNotifsBtn').addEventListener('click', () => {
        $('#notificationsList').innerHTML = '';
        $('#notifEmpty').classList.remove('hidden');
        toggleNotifications();
    });

    // Close notification dropdown on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.notif-wrapper') && !e.target.closest('#mobileNotifBtn')) {
            $('#notificationsDropdown')?.classList.remove('show');
        }
    });

    // Settings
    $('#saveSettingsBtn').addEventListener('click', saveSettings);
    $('#settDarkMode').addEventListener('change', (e) => applyDarkMode(e.target.checked));

    // CSV Export
    $('#exportCsvBtn').addEventListener('click', exportCSV);

    // Auto-login if token exists
    if (S.token) enterApp();
});
