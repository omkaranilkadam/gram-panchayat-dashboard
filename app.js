const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_URL = isLocal ? 'http://localhost:8080/api/v1' : 'https://gram-panchayat-api-wd18.onrender.com/api/v1';
const formatDate = (dateString) => {
    const options = { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('en-IN', options);
};
const getStatusDetails = (status) => {
    switch(status) {
        case 'pending': return { label: 'Pending', icon: 'ph-hourglass-high', class: 'status-pending' };
        case 'in_progress': return { label: 'In Progress', icon: 'ph-wrench', class: 'status-inprogress' };
        case 'resolved': return { label: 'Resolved', icon: 'ph-check-circle', class: 'status-resolved' };
        default: return { label: 'Unknown', icon: 'ph-question', class: '' };
    }
};
let map, fullMap;
let markers = {};
let fullMarkers = {};
let complaintsData = []; 
const initMaps = () => {
    if (!map) {
        map = L.map('map').setView([21.1458, 79.0882], 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map);
    }
    if (!fullMap) {
        fullMap = L.map('full-map').setView([21.1458, 79.0882], 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(fullMap);
    }
};
const updateStats = (data) => {
    const total = data.length;
    const pending = data.filter(c => c.status === 'pending').length;
    const resolved = data.filter(c => c.status === 'resolved').length;
    const inProgress = data.filter(c => c.status === 'in_progress').length;
    document.getElementById('stat-total').innerText = total;
    document.getElementById('stat-pending').innerText = pending;
    document.getElementById('stat-resolved').innerText = resolved;
    document.getElementById('stat-inprogress').innerText = inProgress;
    const badge = document.getElementById('newComplaintsBadge');
    const notifDot = document.getElementById('notificationDot');
    if (pending > 0) {
        badge.innerText = `${pending} New`;
        badge.style.display = 'inline-block';
        notifDot.style.display = 'block';
    } else {
        badge.style.display = 'none';
        notifDot.style.display = 'none';
    }
};
const renderMarkers = (data) => {
    if (!map || !fullMap) return;
    Object.values(markers).forEach(m => map.removeLayer(m));
    Object.values(fullMarkers).forEach(m => fullMap.removeLayer(m));
    markers = {};
    fullMarkers = {};
    data.forEach(complaint => {
        const statusClass = complaint.status === 'resolved' ? 'resolved' : '';
        const customIcon = L.divIcon({ className: `custom-marker ${statusClass}`, iconSize: [16, 16], iconAnchor: [8, 8] });
        const popupContent = `<b>${complaint.title}</b><br><a href="#" onclick="openComplaintModal('${complaint.id}'); return false;">View Details</a>`;
        const m1 = L.marker([complaint.latitude, complaint.longitude], { icon: customIcon }).addTo(map);
        m1.bindPopup(popupContent);
        markers[complaint.id] = m1;
        const m2 = L.marker([complaint.latitude, complaint.longitude], { icon: customIcon }).addTo(fullMap);
        m2.bindPopup(popupContent);
        fullMarkers[complaint.id] = m2;
    });
};
const renderComplaintsList = (data) => {
    const listContainer = document.getElementById('complaintsList');
    const fullListContainer = document.getElementById('fullComplaintsList');
    listContainer.innerHTML = '';
    fullListContainer.innerHTML = '';
    if(data.length === 0) {
        listContainer.innerHTML = '<p style="padding: 1rem; color: var(--text-muted);">No complaints found.</p>';
        fullListContainer.innerHTML = '<p style="padding: 1rem; color: var(--text-muted);">No complaints found.</p>';
        return;
    }
    data.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).forEach(complaint => {
        const statusInfo = getStatusDetails(complaint.status);
        const imgUrl = complaint.media_urls ? `http://localhost:8080${complaint.media_urls}` : 'assets/pothole.jpg';
        const html = `
            <img src="${imgUrl}" alt="Complaint" class="complaint-thumbnail" onerror="this.src='assets/pothole.jpg'">
            <div class="complaint-info">
                <div class="complaint-header">
                    <div class="complaint-title">${complaint.title}</div>
                    <span class="badge ${statusInfo.class}"><i class="ph ${statusInfo.icon}"></i> ${statusInfo.label}</span>
                </div>
                <div class="complaint-meta">
                    <span><i class="ph ph-map-pin"></i> ${complaint.latitude.toFixed(4)}, ${complaint.longitude.toFixed(4)}</span>
                    <span>&bull;</span>
                    <span><i class="ph ph-clock"></i> ${formatDate(complaint.created_at)}</span>
                </div>
            </div>
        `;
        const card = document.createElement('div');
        card.className = 'complaint-card';
        card.onclick = () => openComplaintModal(complaint.id);
        card.innerHTML = html;
        listContainer.appendChild(card);
        const cardCopy = document.createElement('div');
        cardCopy.className = 'complaint-card';
        cardCopy.onclick = () => openComplaintModal(complaint.id);
        cardCopy.innerHTML = html;
        fullListContainer.appendChild(cardCopy);
    });
};
const reRenderAll = (dataToRender) => {
    renderMarkers(dataToRender);
    renderComplaintsList(dataToRender);
    updateStats(complaintsData); 
};
const filterAndRender = () => {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('mapFilter').value;
    const filtered = complaintsData.filter(c => {
        const matchesSearch = c.title.toLowerCase().includes(searchTerm) || 
                              c.description.toLowerCase().includes(searchTerm);
        const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
        return matchesSearch && matchesStatus;
    });
    reRenderAll(filtered);
};
document.getElementById('searchInput').addEventListener('input', filterAndRender);
document.getElementById('mapFilter').addEventListener('change', filterAndRender);
window.switchView = (viewName) => {
    document.querySelectorAll('.view-section').forEach(el => {
        if(el.id !== 'view-login') el.classList.remove('active-view');
    });
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`view-${viewName}`).classList.add('active-view');
    const navItem = document.getElementById(`nav-${viewName}`);
    if(navItem) navItem.classList.add('active');
    if(viewName === 'dashboard' || viewName === 'map') {
        setTimeout(() => {
            if(map) map.invalidateSize();
            if(fullMap) fullMap.invalidateSize();
        }, 100);
    }
};
window.toggleNotifications = () => {
    document.getElementById('notificationsDropdown').classList.toggle('show');
};
document.addEventListener('click', (e) => {
    const dd = document.getElementById('notificationsDropdown');
    if(!e.target.closest('.header-actions') && dd && dd.classList.contains('show')) {
        dd.classList.remove('show');
    }
});
const modal = document.getElementById('complaintModal');
window.openComplaintModal = (id) => {
    const complaint = complaintsData.find(c => c.id == id); 
    if (!complaint) return;
    const statusInfo = getStatusDetails(complaint.status);
    const imgUrl = complaint.media_urls ? `http://localhost:8080${complaint.media_urls}` : 'assets/pothole.jpg';
    document.getElementById('modalBody').innerHTML = `
        <div class="modal-media">
            <img src="${imgUrl}" alt="Complaint Evidence" onerror="this.src='assets/pothole.jpg'">
        </div>
        <div class="modal-details">
            <div class="modal-header-row">
                <h2 class="modal-title">${complaint.title}</h2>
                <span class="badge ${statusInfo.class}"><i class="ph ${statusInfo.icon}"></i> ${statusInfo.label}</span>
            </div>
            <p class="modal-desc">${complaint.description}</p>
            <div class="modal-meta-grid">
                <div class="meta-item">
                    <div class="meta-icon"><i class="ph ph-map-pin-line"></i></div>
                    <div class="meta-info">
                        <h5>Coordinates</h5>
                        <p style="font-size: 0.85rem;">Lat: ${complaint.latitude.toFixed(4)}</p>
                        <p style="font-size: 0.85rem;">Lng: ${complaint.longitude.toFixed(4)}</p>
                    </div>
                </div>
                <div class="meta-item">
                    <div class="meta-icon"><i class="ph ph-calendar"></i></div>
                    <div class="meta-info">
                        <h5>Date & Time</h5>
                        <p>${formatDate(complaint.created_at)}</p>
                    </div>
                </div>
                <div class="meta-item">
                    <div class="meta-icon"><i class="ph ph-hash"></i></div>
                    <div class="meta-info">
                        <h5>Complaint ID</h5>
                        <p>${complaint.id}</p>
                    </div>
                </div>
            </div>
            <div class="modal-actions">
                <button class="btn btn-primary" onclick="updateStatus(${complaint.id}, 'in_progress')">
                    <i class="ph ph-wrench"></i> Mark In Progress
                </button>
                <button class="btn btn-outline" style="background-color: var(--success); color: white; border-color: var(--success);" onclick="updateStatus(${complaint.id}, 'resolved')">
                    <i class="ph ph-check-circle"></i> Mark Resolved
                </button>
            </div>
        </div>
    `;
    modal.classList.add('show');
    if(map) map.flyTo([complaint.latitude, complaint.longitude], 16);
    if(fullMap) fullMap.flyTo([complaint.latitude, complaint.longitude], 16);
};
window.closeModal = () => {
    modal.classList.remove('show');
};
document.getElementById('closeModalBtn').addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('show');
});
window.updateStatus = async (id, newStatus) => {
    const token = localStorage.getItem('token');
    if (!token) return handleLogout();
    try {
        const response = await fetch(`${API_URL}/complaints/${id}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: newStatus })
        });
        if (response.ok) {
            closeModal();
            fetchAndRenderComplaints(); 
            alert(`Complaint ${id} marked as ${newStatus.replace('_', ' ')}.`);
        } else {
            const errData = await response.json();
            alert("Error: " + (errData.detail || "Could not update status"));
        }
    } catch (error) {
        console.error('Error updating status:', error);
    }
};
window.fetchAndRenderComplaints = async () => {
    const token = localStorage.getItem('token');
    if (!token) return handleLogout();
    try {
        const response = await fetch(`${API_URL}/complaints/`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (response.ok) {
            complaintsData = await response.json();
            reRenderAll(complaintsData);
        } else if (response.status === 401) {
            handleLogout();
        }
    } catch (error) {
        console.error('Error fetching complaints:', error);
    }
};
let pollingInterval = null;
window.handleLogin = async (e) => {
    e.preventDefault();
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const err = document.getElementById('loginError');
    try {
        const formData = new URLSearchParams();
        formData.append('username', user);
        formData.append('password', pass);
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData
        });
        if (!response.ok) {
            throw new Error('Invalid credentials');
        }
        const data = await response.json();
        localStorage.setItem('token', data.access_token);
        err.innerText = '';
        document.getElementById('view-login').classList.remove('active-view');
        document.getElementById('appContainer').classList.remove('hidden-app');
        initMaps();
        await fetchAndRenderComplaints();
        switchView('dashboard');
        if (pollingInterval) clearInterval(pollingInterval);
        pollingInterval = setInterval(fetchAndRenderComplaints, 15000);
    } catch (error) {
        err.innerText = error.message;
    }
};
window.handleLogout = () => {
    localStorage.removeItem('token');
    document.getElementById('appContainer').classList.add('hidden-app');
    document.getElementById('view-login').classList.add('active-view');
    document.getElementById('loginForm').reset();
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
};
if (localStorage.getItem('token')) {
    document.getElementById('view-login').classList.remove('active-view');
    document.getElementById('appContainer').classList.remove('hidden-app');
    initMaps();
    fetchAndRenderComplaints();
    switchView('dashboard');
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(fetchAndRenderComplaints, 15000);
}