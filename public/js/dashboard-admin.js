// Admin Dashboard JS

document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in and is admin
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    if (!token || !user || user.role !== 'admin') {
        window.location.href = '../pages/login.html';
        return;
    }

    // Sidebar navigation
    const sections = ['overview', 'users', 'events', 'payments', 'sponsorships', 'reports', 'settings'];
    sections.forEach(section => {
        const btn = document.querySelector(`.sidebar-link[onclick*="${section}"]`);
        if (btn) {
            btn.addEventListener('click', () => showSection(section));
        }
    });

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '../index.html';
        });
    }

    // Set default section
    showSection('overview');
    loadSection('overview');
});

// Ensure Add User button always opens the modal, even after re-renders
// This should be placed after DOMContentLoaded

document.addEventListener('click', function (e) {
    if (e.target.closest('#addUserBtn')) {
        console.log('Add User button clicked');
        openAddUserModal();
    }
});

function showSection(section) {
    const sectionIds = ['overviewSection', 'usersSection', 'eventsSection', 'paymentsSection', 'sponsorshipsSection', 'reportsSection', 'settingsSection'];
    sectionIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    const showEl = document.getElementById(section + 'Section');
    if (showEl) showEl.classList.remove('hidden');
    loadSection(section);
}

function loadSection(section) {
    switch (section) {
        case 'overview':
            loadAdminOverviewStats();
            break;
        case 'users':
            loadUsersSection();
            break;
        case 'events':
            loadEventsSection();
            break;
        case 'payments':
            loadPaymentsSection();
            break;
        case 'sponsorships':
            loadSponsorshipsSection();
            break;
        case 'reports':
            loadReportsSection();
            break;
        case 'settings':
            // Implement settings if needed
            break;
    }
}

// --- Overview Stats ---
async function loadAdminOverviewStats() {
    const statsGrid = document.getElementById('adminStatsGrid');
    if (!statsGrid) return;
    // Add username to welcome message
    const user = JSON.parse(localStorage.getItem('user'));
    const username = user && user.name ? user.name : 'Admin';
    // Update the welcome message
    const welcomeHeader = document.querySelector('#overviewSection h2');
    if (welcomeHeader) {
        welcomeHeader.innerHTML = `Welcome, <span style="color:#6366f1">${username}</span>!`;
    }
    statsGrid.innerHTML = '<div class="col-span-4 text-center py-8 text-gray-400">Loading stats...</div>';
    try {
        const [usersStatsRes, eventsRes, sponsorshipsRes, accommodationsRes] = await Promise.all([
            fetch('/api/users/stats', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }),
            fetch('/api/events', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }),
            fetch('/api/sponsorships/total', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }),
            fetch('/api/venues/accommodations/occupancy', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
        ]);
        let usersStats = {};
        let events = [];
        let sponsorships = {};
        let accommodations = {};
        try { usersStats = await usersStatsRes.json(); } catch { usersStats = {}; }
        try { events = await eventsRes.json(); } catch { events = []; }
        try { sponsorships = await sponsorshipsRes.json(); } catch { sponsorships = {}; }
        // Remove accommodations
        statsGrid.innerHTML = `
            <div class="bg-white rounded-xl shadow p-6 flex flex-col items-center hover:shadow-xl transition-shadow duration-200">
                <div class="text-indigo-600 text-3xl mb-2"><i class="fas fa-users"></i></div>
                <div class="text-2xl font-bold">${usersStats.total || 0}</div>
                <div class="text-gray-600">Total Users</div>
                <ul class="text-xs mt-2 text-gray-500 text-left w-full pl-4">
                    ${usersStats.byRole ? Object.entries(usersStats.byRole).map(([role, count]) => `<li class='flex items-center gap-1'><i class='fas fa-user-circle'></i> <span class='capitalize'>${role}</span>: <span class='font-semibold'>${count}</span></li>`).join('') : `<li>participant: 0</li><li>organizer: 0</li><li>sponsor: 0</li><li>admin: 0</li><li>judge: 0</li>`}
                </ul>
            </div>
            <div class="bg-white rounded-xl shadow p-6 flex flex-col items-center">
                <div class="text-indigo-600 text-3xl mb-2"><i class="fas fa-calendar-alt"></i></div>
                <div class="text-2xl font-bold">${Array.isArray(events) ? events.length : 0}</div>
                <div class="text-gray-600">Events</div>
            </div>
            <div class="bg-white rounded-xl shadow p-6 flex flex-col items-center">
                <div class="text-indigo-600 text-3xl mb-2"><i class="fas fa-hand-holding-usd"></i></div>
                <div class="text-2xl font-bold">Rs. ${sponsorships.total || 0}</div>
                <div class="text-gray-600">Sponsorship Revenue</div>
            </div>
        `;
    } catch (err) {
        statsGrid.innerHTML = '<div class="text-red-500">Failed to load stats.</div>';
    }
}

// --- Utility Functions ---
function showModal(modalId) {
    console.log('showModal called for', modalId);
    document.getElementById(modalId).classList.remove('hidden');
}
function hideModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}
function debounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer') || document.createElement('div');
    if (!document.getElementById('toastContainer')) {
        toastContainer.id = 'toastContainer';
        document.body.appendChild(toastContainer);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// --- User Management Section ---
let userList = [];
let filteredUserList = [];
let currentUserPage = 1;
const USERS_PER_PAGE = 10;

async function loadUsersSection() {
    const container = document.getElementById('usersSection');
    container.innerHTML = '<div class="loading">Loading users...</div>';
    try {
        const response = await fetch('/api/users', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!response.ok) throw new Error('Failed to load users');
        userList = await response.json();
        filteredUserList = userList;
        renderUsersTable();
    } catch (error) {
        container.innerHTML = `<div class="error-message">${error.message}</div>`;
    }
}

function renderUsersTable() {
    let container = document.getElementById('usersSection');
    container.innerHTML = `
        <div class="dashboard-section-header flex justify-between items-center mb-4">
            <h2 class="text-3xl font-bold text-indigo-900 flex items-center gap-2"><i class="fas fa-users"></i> User Management</h2>
            <button id="addUserBtn" class="cta-button bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"><i class="fas fa-plus"></i> Add User</button>
        </div>
        <div class="table-responsive rounded-xl shadow bg-white p-4">
            <div style="display:flex;align-items:center;gap:0.5rem;position:relative;" class="mb-2">
                <button id="userSearchBackBtn" type="button" aria-label="Back" style="padding:0.5rem 0.7rem;border:none;background:transparent;color:#6366f1;border-radius:0.5rem;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1.2rem;">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <input id="userSearchInput" class="dashboard-input mb-2 px-4 py-2 rounded border border-indigo-200 focus:ring-2 focus:ring-indigo-400 outline-none" type="text" placeholder="Search users...">
            </div>
            <table class="dashboard-table min-w-full bg-white rounded-xl shadow">
                <thead>
                    <tr class="bg-indigo-100 text-indigo-800">
                        <th class="py-2 px-4">Name</th>
                        <th class="py-2 px-4">Email</th>
                        <th class="py-2 px-4">Role</th>
                        <th class="py-2 px-4">Status</th>
                        <th class="py-2 px-4">Actions</th>
                    </tr>
                </thead>
                <tbody id="users-tbody"></tbody>
            </table>
            <div id="userPagination" class="mt-2 flex justify-center"></div>
        </div>
        <div id="userModal" class="modal hidden">
            <div class="modal-content">
                <span class="close-modal" id="closeUserModal">&times;</span>
                <h3 id="userModalTitle">Add/Edit User</h3>
                <form id="userForm">
                    <div id="userFormError" class="text-red-500 text-sm mb-2 hidden"></div>
                    <label>Name:<input type="text" id="userNameInput" required></label>
                    <label>Email:<input type="email" id="userEmailInput" required></label>
                    <label>Password:<input type="password" id="userPasswordInput"></label>
                    <label>Role:
                        <select id="userRoleInput" required>
                            <option value="participant">Participant</option>
                            <option value="organizer">Organizer</option>
                            <option value="sponsor">Sponsor</option>
                            <option value="admin">Admin</option>
                            <option value="judge">Judge</option>
                        </select>
                    </label>
                    <label>Status:
                        <select id="userStatusInput" required>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </label>
                    <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition">Save</button>
                </form>
            </div>
        </div>
    `;
    const tbody = document.getElementById('users-tbody');
    const start = (currentUserPage - 1) * USERS_PER_PAGE;
    const end = start + USERS_PER_PAGE;
    const usersToShow = filteredUserList.slice(start, end);
    if (usersToShow.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-400">No users found.</td></tr>';
    } else {
        usersToShow.forEach(user => {
            tbody.innerHTML += `
                <tr class="hover:bg-indigo-50 transition">
                    <td class="py-2 px-4">${user.name}</td>
                    <td class="py-2 px-4">${user.email}</td>
                    <td class="py-2 px-4 capitalize">${user.role}</td>
                    <td class="py-2 px-4">
                        <span class="px-2 py-1 rounded text-xs ${user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">${user.status || 'active'}</span>
                    </td>
                    <td class="py-2 px-4 flex gap-2">
                        <button class="btn-edit bg-yellow-100 text-yellow-800 px-2 py-1 rounded hover:bg-yellow-200 transition" data-id="${user.user_id}"><i class="fas fa-edit"></i></button>
                        <button class="btn-delete bg-red-100 text-red-800 px-2 py-1 rounded hover:bg-red-200 transition" data-id="${user.user_id}"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
    }
    setupUserSearch();
    setupUserPagination();
    document.getElementById('addUserBtn').onclick = openAddUserModal;
    document.getElementById('closeUserModal').onclick = () => hideModal('userModal');
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.onclick = () => openEditUserModal(btn.getAttribute('data-id'));
    });
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.onclick = () => deleteUser(btn.getAttribute('data-id'));
    });
    // Attach back button event
    const backBtn = document.getElementById('userSearchBackBtn');
    if (backBtn) {
        backBtn.onclick = function () {
            filteredUserList = userList;
            currentUserPage = 1;
            renderUsersTable();
            // Restore the search input value after re-render
            setTimeout(() => {
                const searchInput = document.getElementById('userSearchInput');
                if (searchInput) searchInput.value = '';
            }, 0);
        };
    }
}

function setupUserSearch() {
    const searchInput = document.getElementById('userSearchInput');
    if (!searchInput) return;
    // Add a clear (X) button if not already present
    if (!document.getElementById('userSearchClear')) {
        const clearBtn = document.createElement('span');
        clearBtn.id = 'userSearchClear';
        clearBtn.innerHTML = '&times;';
        clearBtn.style.position = 'absolute';
        clearBtn.style.right = '18px';
        clearBtn.style.top = '50%';
        clearBtn.style.transform = 'translateY(-50%)';
        clearBtn.style.cursor = 'pointer';
        clearBtn.style.fontSize = '1.3rem';
        clearBtn.style.color = '#a1a1aa';
        clearBtn.style.display = 'none';
        searchInput.parentNode.style.position = 'relative';
        searchInput.parentNode.appendChild(clearBtn);
        clearBtn.onclick = function () {
            searchInput.value = '';
            filteredUserList = userList;
            currentUserPage = 1;
            renderUsersTable();
        };
        searchInput.addEventListener('input', function () {
            clearBtn.style.display = this.value ? 'block' : 'none';
        });
    }
    searchInput.oninput = debounce(function () {
        const q = this.value.toLowerCase();
        if (!q) {
            filteredUserList = userList;
        } else {
            filteredUserList = userList.filter(u =>
                u.name.toLowerCase().includes(q) ||
                u.email.toLowerCase().includes(q) ||
                u.role.toLowerCase().includes(q)
            );
        }
        currentUserPage = 1;
        renderUsersTable();
        // Restore the search input value after re-render
        setTimeout(() => {
            const searchInput = document.getElementById('userSearchInput');
            if (searchInput) searchInput.value = this.value;
        }, 0);
    }, 200);
}

function setupUserPagination() {
    const pagination = document.getElementById('userPagination');
    if (!pagination) return;
    pagination.innerHTML = '';
    const totalPages = Math.ceil(filteredUserList.length / USERS_PER_PAGE);
    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.className = `px-3 py-1 rounded ${i === currentUserPage ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`;
        btn.onclick = () => {
            currentUserPage = i;
            renderUsersTable();
        };
        pagination.appendChild(btn);
    }
}

function openAddUserModal() {
    console.log('openAddUserModal called');
    document.getElementById('userModalTitle').textContent = 'Add User';
    document.getElementById('userNameInput').value = '';
    document.getElementById('userEmailInput').value = '';
    document.getElementById('userPasswordInput').value = '';
    document.getElementById('userRoleInput').value = 'participant';
    document.getElementById('userStatusInput').value = 'active';
    document.getElementById('userPasswordInput').required = true;
    document.getElementById('userFormError').classList.add('hidden');
    showModal('userModal');
    document.getElementById('userForm').onsubmit = handleAddUserSubmit;
}

async function handleAddUserSubmit(e) {
    e.preventDefault();
    const errorDiv = document.getElementById('userFormError');
    errorDiv.classList.add('hidden');
    errorDiv.textContent = '';
    const data = {
        name: document.getElementById('userNameInput').value,
        email: document.getElementById('userEmailInput').value,
        password: document.getElementById('userPasswordInput').value,
        role: document.getElementById('userRoleInput').value,
        status: document.getElementById('userStatusInput').value
    };
    if (!data.password) {
        errorDiv.textContent = 'Password is required.';
        errorDiv.classList.remove('hidden');
        return;
    }
    try {
        const res = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Failed to add user');
        hideModal('userModal');
        showToast('User added successfully', 'success');
        await loadUsersSection();
    } catch (err) {
        errorDiv.textContent = err.message;
        errorDiv.classList.remove('hidden');
    }
}

function openEditUserModal(userId) {
    const user = userList.find(u => u.user_id == userId);
    if (!user) return;
    document.getElementById('userModalTitle').textContent = 'Edit User';
    document.getElementById('userNameInput').value = user.name;
    document.getElementById('userEmailInput').value = user.email;
    document.getElementById('userPasswordInput').value = '';
    document.getElementById('userRoleInput').value = user.role;
    document.getElementById('userStatusInput').value = user.status || 'active';
    document.getElementById('userPasswordInput').required = false;
    document.getElementById('userFormError').classList.add('hidden');
    showModal('userModal');
    document.getElementById('userForm').onsubmit = (e) => handleEditUserSubmit(e, userId);
}

async function handleEditUserSubmit(e, userId) {
    e.preventDefault();
    const errorDiv = document.getElementById('userFormError');
    errorDiv.classList.add('hidden');
    errorDiv.textContent = '';
    const data = {
        name: document.getElementById('userNameInput').value,
        email: document.getElementById('userEmailInput').value,
        role: document.getElementById('userRoleInput').value,
        status: document.getElementById('userStatusInput').value
    };
    const password = document.getElementById('userPasswordInput').value;
    if (password) data.password = password;
    try {
        const res = await fetch(`/api/users/${userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Failed to update user');
        hideModal('userModal');
        showToast('User updated successfully', 'success');
        await loadUsersSection();
    } catch (err) {
        errorDiv.textContent = err.message;
        errorDiv.classList.remove('hidden');
    }
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
        const res = await fetch(`/api/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!res.ok) throw new Error('Failed to delete user');
        showToast('User deleted', 'success');
        await loadUsersSection();
    } catch (err) {
        showToast('Failed to delete user', 'error');
    }
}

// --- Event Management Section ---
async function loadEventsSection() {
    const container = document.getElementById('eventsSection');
    container.innerHTML = '<div class="loading">Loading events...</div>';
    try {
        const response = await fetch('/api/events', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!response.ok) throw new Error('Failed to load events');
        const events = await response.json();
        if (!Array.isArray(events) || events.length === 0) {
            container.innerHTML = '<div class="empty-state">No events found.</div>';
            return;
        }
        container.innerHTML = `
            <div class="dashboard-section-header flex justify-between items-center mb-4">
                <h2 class="text-3xl font-bold text-indigo-900 flex items-center gap-2"><i class="fas fa-calendar-alt"></i> Events Management</h2>
                <button id="addEventBtn" class="cta-button bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"><i class="fas fa-plus"></i> Add Event</button>
            </div>
            <div class="table-responsive rounded-xl shadow bg-white p-4">
                <table class="dashboard-table min-w-full bg-white rounded-xl shadow">
                    <thead>
                        <tr class="bg-indigo-100 text-indigo-800">
                            <th class="py-2 px-4">Name</th>
                            <th class="py-2 px-4">Category</th>
                            <th class="py-2 px-4">Date</th>
                            <th class="py-2 px-4">Venue</th>
                            <th class="py-2 px-4">Max Participants</th>
                            <th class="py-2 px-4">Status</th>
                            <th class="py-2 px-4">Judge</th>
                            <th class="py-2 px-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${events.map(event => `
                            <tr class="hover:bg-indigo-50 transition">
                                <td class="py-2 px-4">${event.event_name}</td>
                                <td class="py-2 px-4">${event.category || '-'}</td>
                                <td class="py-2 px-4">${event.event_date ? new Date(event.event_date).toLocaleString() : '-'}</td>
                                <td class="py-2 px-4">${event.venue_name || 'TBD'}</td>
                                <td class="py-2 px-4">${event.max_participants || '-'}</td>
                                <td class="py-2 px-4">
                                    <span class="px-2 py-1 rounded text-xs ${event.status === 'upcoming' ? 'bg-blue-100 text-blue-700' : event.status === 'ongoing' ? 'bg-yellow-100 text-yellow-700' : event.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">${event.status || '-'}</span>
                                </td>
                                <td class="py-2 px-4">${event.judge_name ? event.judge_name + (event.judge_email ? ` (${event.judge_email})` : '') : 'Not assigned'}</td>
                                <td class="py-2 px-4 flex gap-2">
                                    <button class="btn-edit bg-yellow-100 text-yellow-800 px-2 py-1 rounded hover:bg-yellow-200 transition" data-id="${event.event_id}"><i class="fas fa-edit"></i></button>
                                    <button class="btn-delete bg-red-100 text-red-800 px-2 py-1 rounded hover:bg-red-200 transition" data-id="${event.event_id}"><i class="fas fa-trash"></i></button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div id="addEventModal" class="modal hidden">
                <div class="modal-content">
                    <span class="close-modal" id="closeAddEventModal">&times;</span>
                    <h3>Add New Event</h3>
                    <form id="addEventForm">
                        <label>Event Name:<input type="text" id="eventName" required></label>
                        <label>Category:
                            <select id="eventCategory" required>
                                <option value="">Select Category</option>
                                <option value="Tech">Tech</option>
                                <option value="Business">Business</option>
                                <option value="Gaming">Gaming</option>
                                <option value="Sports">Sports</option>
                                <option value="Arts">Arts</option>
                                <option value="Other">Other</option>
                            </select>
                        </label>
                        <label>Date and Time:<input type="datetime-local" id="eventDate" required></label>
                        <label>Venue:
                            <select id="eventVenue">
                                <option value="">Select Venue</option>
                            </select>
                        </label>
                        <label>Max Participants:<input type="number" id="eventMaxParticipants" min="1"></label>
                        <label>Status:
                            <select id="eventStatus" required>
                                <option value="upcoming">Upcoming</option>
                                <option value="ongoing">Ongoing</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </label>
                        <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition">Add Event</button>
                    </form>
                </div>
            </div>
        `;
        document.getElementById('addEventBtn').onclick = () => {
            document.getElementById('addEventModal').classList.remove('hidden');
            loadVenuesForSelect();
        };
        document.getElementById('closeAddEventModal').onclick = () => {
            document.getElementById('addEventModal').classList.add('hidden');
        };
        document.getElementById('addEventForm').onsubmit = async (e) => {
            e.preventDefault();
            const eventData = {
                event_name: document.getElementById('eventName').value,
                category: document.getElementById('eventCategory').value,
                event_date: document.getElementById('eventDate').value,
                venue_id: document.getElementById('eventVenue').value,
                max_participants: document.getElementById('eventMaxParticipants').value,
                status: document.getElementById('eventStatus').value
            };
            try {
                const response = await fetch('/api/events', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify(eventData)
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to add event');
                }
                document.getElementById('addEventModal').classList.add('hidden');
                await loadEventsSection();
                showToast('Event added successfully', 'success');
            } catch (error) {
                showToast(error.message, 'error');
            }
        };
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.onclick = () => showToast('Edit functionality to be implemented', 'info');
        });
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.onclick = async () => {
                if (confirm('Are you sure you want to delete this event?')) {
                    const eventId = btn.getAttribute('data-id');
                    try {
                        const response = await fetch(`/api/events/${eventId}`, {
                            method: 'DELETE',
                            headers: {
                                'Authorization': `Bearer ${localStorage.getItem('token')}`
                            }
                        });
                        if (!response.ok) {
                            const errorData = await response.json();
                            throw new Error(errorData.error || 'Failed to delete event');
                        }
                        await loadEventsSection();
                        showToast('Event deleted successfully', 'success');
                    } catch (error) {
                        showToast(error.message, 'error');
                    }
                }
            };
        });
    } catch (error) {
        container.innerHTML = `<div class="error-message">${error.message}</div>`;
    }
}

async function loadVenuesForSelect() {
    try {
        const response = await fetch('/api/venues', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!response.ok) throw new Error('Failed to load venues');
        const venues = await response.json();
        const venueSelect = document.getElementById('eventVenue');
        venueSelect.innerHTML = '<option value="">Select Venue</option>';
        venues.forEach(venue => {
            venueSelect.innerHTML += `<option value="${venue.venue_id}">${venue.venue_name}</option>`;
        });
    } catch (error) {
        console.error('Error loading venues:', error);
    }
}

// --- Payments Section ---
async function loadPaymentsSection() {
    const container = document.getElementById('paymentsSection');
    container.innerHTML = '<div class="loading">Loading payments...</div>';
    try {
        const response = await fetch('/api/payments', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!response.ok) throw new Error('Failed to load payments');
        const payments = await response.json();
        if (!Array.isArray(payments) || payments.length === 0) {
            container.innerHTML = '<div class="empty-state">No payments found.</div>';
            return;
        }
        container.innerHTML = `
            <div class="dashboard-section-header flex justify-between items-center mb-4">
                <h2 class="text-3xl font-bold text-indigo-900 flex items-center gap-2"><i class="fas fa-credit-card"></i> Payments</h2>
            </div>
            <div class="table-responsive rounded-xl shadow bg-white p-4">
                <table class="dashboard-table min-w-full bg-white rounded-xl shadow">
                    <thead>
                        <tr class="bg-indigo-100 text-indigo-800">
                            <th class="py-2 px-4">User</th>
                            <th class="py-2 px-4">Amount</th>
                            <th class="py-2 px-4">Date</th>
                            <th class="py-2 px-4">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${payments.map(payment => `
                            <tr class="hover:bg-indigo-50 transition">
                                <td class="py-2 px-4">${payment.user_name} <br><span class='text-xs text-gray-400'>${payment.email}</span></td>
                                <td class="py-2 px-4">Rs. ${payment.amount}</td>
                                <td class="py-2 px-4">${payment.payment_date ? new Date(payment.payment_date).toLocaleString() : '-'}</td>
                                <td class="py-2 px-4"><span class="px-2 py-1 rounded text-xs ${payment.status === 'completed' ? 'bg-green-100 text-green-700' : payment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}">${payment.status}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        container.innerHTML = `<div class="error-message">${error.message}</div>`;
    }
}

// --- Sponsorships Section ---
async function loadSponsorshipsSection() {
    const container = document.getElementById('sponsorshipsSection');
    container.innerHTML = '<div class="loading">Loading sponsorships...</div>';
    try {
        const response = await fetch('/api/sponsorships', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!response.ok) throw new Error('Failed to load sponsorships');
        const sponsorships = await response.json();
        if (!Array.isArray(sponsorships) || sponsorships.length === 0) {
            container.innerHTML = '<div class="empty-state">No sponsorships found.</div>';
            return;
        }
        // Only allow actions for sponsorships with IDs 6 and 7
        const allowedIds = [6, 7];
        container.innerHTML = `
            <div class="dashboard-section-header flex justify-between items-center mb-4">
                <h2 class="text-3xl font-bold text-indigo-900 flex items-center gap-2"><i class="fas fa-hand-holding-usd"></i> Sponsorships</h2>
            </div>
            <div class="table-responsive rounded-xl shadow bg-white p-4">
                <table class="dashboard-table min-w-full bg-white rounded-xl shadow">
                    <thead>
                        <tr class="bg-indigo-100 text-indigo-800">
                            <th class="py-2 px-4">Sponsor</th>
                            <th class="py-2 px-4">Package</th>
                            <th class="py-2 px-4">Amount</th>
                            <th class="py-2 px-4">Status</th>
                            <th class="py-2 px-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sponsorships.map(s => `
                            <tr class="hover:bg-indigo-50 transition">
                                <td class="py-2 px-4">${s.sponsor}</td>
                                <td class="py-2 px-4">${s.package}</td>
                                <td class="py-2 px-4">Rs. ${s.amount}</td>
                                <td class="py-2 px-4"><span class="px-2 py-1 rounded text-xs ${s.status === 'Confirmed' ? 'bg-green-100 text-green-700' : s.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}">${s.status}</span></td>
                                <td class="py-2 px-4 flex gap-2">
                                    ${allowedIds.includes(s.sponsorship_id) ? `
                                        <button class="btn-edit bg-yellow-100 text-yellow-800 px-2 py-1 rounded hover:bg-yellow-200 transition" data-id="${s.sponsorship_id}"><i class="fas fa-edit"></i></button>
                                        <button class="btn-delete bg-red-100 text-red-800 px-2 py-1 rounded hover:bg-red-200 transition" data-id="${s.sponsorship_id}"><i class="fas fa-trash"></i></button>
                                    ` : '<span class="text-gray-400">N/A</span>'}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        // Attach event listeners only for allowed IDs
        container.querySelectorAll('.btn-edit').forEach(btn => {
            const id = parseInt(btn.getAttribute('data-id'));
            if ([6, 7].includes(id)) {
                btn.onclick = () => showToast('Edit functionality to be implemented', 'info');
            }
        });
        container.querySelectorAll('.btn-delete').forEach(btn => {
            const id = parseInt(btn.getAttribute('data-id'));
            if ([6, 7].includes(id)) {
                btn.onclick = async () => {
                    if (confirm('Are you sure you want to delete this sponsorship?')) {
                        try {
                            const response = await fetch(`/api/sponsorships/${id}`, {
                                method: 'DELETE',
                                headers: {
                                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                                }
                            });
                            if (!response.ok) {
                                const errorData = await response.json();
                                throw new Error(errorData.error || 'Failed to delete sponsorship');
                            }
                            await loadSponsorshipsSection();
                            showToast('Sponsorship deleted successfully', 'success');
                        } catch (error) {
                            showToast(error.message, 'error');
                        }
                    }
                };
            }
        });
    } catch (error) {
        container.innerHTML = `<div class="error-message">${error.message}</div>`;
    }
}

// --- Reports Section ---
async function loadReportsSection() {
    const section = document.getElementById('reportsSection');
    // Tab bar HTML
    section.innerHTML = `
      <div class="mb-4 border-b border-gray-200">
        <nav class="flex flex-wrap -mb-px" id="reportsTabBar">
          <button class="tab-btn px-4 py-2 text-lg font-semibold text-indigo-600 border-b-4 border-indigo-600 focus:outline-none flex items-center gap-2" data-tab="overview"><i class="fas fa-chart-bar"></i> Overview Charts</button>
          <button class="tab-btn px-4 py-2 text-lg font-semibold text-gray-600 border-b-4 border-transparent hover:text-indigo-600 hover:border-indigo-600 focus:outline-none flex items-center gap-2" data-tab="event-participation"><i class="fas fa-users"></i> Event Participation</button>
          <button class="tab-btn px-4 py-2 text-lg font-semibold text-gray-600 border-b-4 border-transparent hover:text-indigo-600 hover:border-indigo-600 focus:outline-none flex items-center gap-2" data-tab="venue-utilization"><i class="fas fa-building"></i> Venue Utilization</button>
          <button class="tab-btn px-4 py-2 text-lg font-semibold text-gray-600 border-b-4 border-transparent hover:text-indigo-600 hover:border-indigo-600 focus:outline-none flex items-center gap-2" data-tab="accommodation"><i class="fas fa-bed"></i> Accommodation</button>
          <button class="tab-btn px-4 py-2 text-lg font-semibold text-gray-600 border-b-4 border-transparent hover:text-indigo-600 hover:border-indigo-600 focus:outline-none flex items-center gap-2" data-tab="demographics"><i class="fas fa-user-friends"></i> Demographics</button>
          <button class="tab-btn px-4 py-2 text-lg font-semibold text-gray-600 border-b-4 border-transparent hover:text-indigo-600 hover:border-indigo-600 focus:outline-none flex items-center gap-2" data-tab="room-allocation"><i class="fas fa-door-open"></i> Room Allocation</button>
          <button class="tab-btn px-4 py-2 text-lg font-semibold text-gray-600 border-b-4 border-transparent hover:text-indigo-600 hover:border-indigo-600 focus:outline-none flex items-center gap-2" data-tab="sponsorship-funds"><i class="fas fa-hand-holding-usd"></i> Sponsorship Funds</button>
        </nav>
      </div>
      <div id="reportsTabContent">
        <div id="tab-overview" class="tab-pane">
          <div id="reportsCharts" class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div class="bg-white rounded-xl shadow p-6"><h3 class="text-lg font-semibold mb-2 flex items-center gap-2"><i class="fas fa-users"></i> Event Participation</h3><canvas id="eventParticipationChart" height="200"></canvas></div>
            <div class="bg-white rounded-xl shadow p-6"><h3 class="text-lg font-semibold mb-2 flex items-center gap-2"><i class="fas fa-building"></i> Venue Utilization</h3><canvas id="venueUtilizationChart" height="200"></canvas></div>
            <div class="bg-white rounded-xl shadow p-6"><h3 class="text-lg font-semibold mb-2 flex items-center gap-2"><i class="fas fa-coins"></i> Financial Overview</h3><canvas id="financialChart" height="200"></canvas></div>
            <div class="bg-white rounded-xl shadow p-6"><h3 class="text-lg font-semibold mb-2 flex items-center gap-2"><i class="fas fa-bed"></i> Accommodation Occupancy</h3><canvas id="accommodationChart" height="200"></canvas></div>
            <div class="bg-white rounded-xl shadow p-6"><h3 class="text-lg font-semibold mb-2 flex items-center gap-2"><i class="fas fa-user-friends"></i> Participant Demographics</h3><canvas id="demographicsChart" height="200"></canvas></div>
            <div class="bg-white rounded-xl shadow p-6"><h3 class="text-lg font-semibold mb-2 flex items-center gap-2"><i class="fas fa-hand-holding-usd"></i> Sponsorship Funds</h3><canvas id="sponsorshipChart" height="200"></canvas></div>
          </div>
        </div>
        <div id="tab-event-participation" class="tab-pane hidden">
          <h3 class="text-2xl font-bold text-indigo-900 mb-4 flex items-center gap-2"><i class="fas fa-users"></i> Event Participation (Details)</h3>
          <div id="eventParticipationTable"></div>
        </div>
        <div id="tab-venue-utilization" class="tab-pane hidden">
          <h3 class="text-2xl font-bold text-indigo-900 mb-4 flex items-center gap-2"><i class="fas fa-building"></i> Venue Utilization (Details)</h3>
          <div id="venueUtilizationTable"></div>
        </div>
        <div id="tab-accommodation" class="tab-pane hidden">
          <h3 class="text-2xl font-bold text-indigo-900 mb-4 flex items-center gap-2"><i class="fas fa-bed"></i> Accommodation Occupancy (Details)</h3>
          <div id="accommodationTable"></div>
        </div>
        <div id="tab-demographics" class="tab-pane hidden">
          <h3 class="text-2xl font-bold text-indigo-900 mb-4 flex items-center gap-2"><i class="fas fa-user-friends"></i> Participant Demographics (Details)</h3>
          <div id="demographicsTable"></div>
        </div>
        <div id="tab-room-allocation" class="tab-pane hidden">
          <h3 class="text-2xl font-bold text-indigo-900 mb-4 flex items-center gap-2"><i class="fas fa-door-open"></i> Room Allocation (Details)</h3>
          <div id="roomAllocationTable"></div>
        </div>
        <div id="tab-sponsorship-funds" class="tab-pane hidden">
          <h3 class="text-2xl font-bold text-indigo-900 mb-4 flex items-center gap-2"><i class="fas fa-hand-holding-usd"></i> Sponsorship Funds Collected (Details)</h3>
          <div id="sponsorshipFundsTable"></div>
        </div>
      </div>
    `;
    try {
        // Fetch all reports in parallel
        const [eventParticipationRes, venueUtilizationRes, revenueRes, accommodationRes, demographicsRes, roomAllocRes, sponsorshipFundsRes] = await Promise.all([
            fetch('/api/reports/event-participation', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }),
            fetch('/api/reports/venue-utilization', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }),
            fetch('/api/reports/revenue', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }),
            fetch('/api/reports/accommodation-occupancy', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }),
            fetch('/api/reports/participant-demographics', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }),
            fetch('/api/reports/room-allocation', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }),
            fetch('/api/reports/sponsorship-funds', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
        ]);
        // Parse all responses
        const eventParticipation = await eventParticipationRes.json();
        const venueUtilization = await venueUtilizationRes.json();
        const revenue = await revenueRes.json();
        const accommodation = await accommodationRes.json();
        const demographics = await demographicsRes.json();
        const roomAlloc = await roomAllocRes.json();
        const sponsorshipFunds = await sponsorshipFundsRes.json();

        // Render charts (assuming you have a renderReportsCharts function)
        setTimeout(() => renderReportsCharts({ eventParticipation, venueUtilization, revenue, accommodation, demographics, sponsorshipFunds }), 0);

        // Render tables for details in their respective tab panes
        document.getElementById('eventParticipationTable').innerHTML = `
          <div class="overflow-x-auto"><table class="min-w-full bg-white rounded-xl shadow"><thead><tr class="bg-indigo-100 text-indigo-800"><th class="py-2 px-4">Event</th><th class="py-2 px-4">Participants</th></tr></thead><tbody>${eventParticipation.map(ev => `<tr><td class="py-2 px-4">${ev.event_name}</td><td class="py-2 px-4">${ev.participant_count}</td></tr>`).join('')}</tbody></table></div>
        `;
        document.getElementById('venueUtilizationTable').innerHTML = `
          <div class="overflow-x-auto"><table class="min-w-full bg-white rounded-xl shadow"><thead><tr class="bg-indigo-100 text-indigo-800"><th class="py-2 px-4">Venue</th><th class="py-2 px-4">Capacity</th><th class="py-2 px-4">Events Hosted</th></tr></thead><tbody>${venueUtilization.map(v => `<tr><td class="py-2 px-4">${v.venue_name}</td><td class="py-2 px-4">${v.capacity}</td><td class="py-2 px-4">${v.events_hosted}</td></tr>`).join('')}</tbody></table></div>
        `;
        document.getElementById('accommodationTable').innerHTML = `
          <div class="overflow-x-auto"><table class="min-w-full bg-white rounded-xl shadow"><thead><tr class="bg-indigo-100 text-indigo-800"><th class="py-2 px-4">Room Type</th><th class="py-2 px-4">Capacity</th><th class="py-2 px-4">Available</th><th class="py-2 px-4">Occupied</th></tr></thead><tbody>${accommodation.map(a => `<tr><td class="py-2 px-4">${a.room_type}</td><td class="py-2 px-4">${a.capacity}</td><td class="py-2 px-4">${a.available_rooms}</td><td class="py-2 px-4">${a.occupied}</td></tr>`).join('')}</tbody></table></div>
        `;
        document.getElementById('demographicsTable').innerHTML = `
          <div class="overflow-x-auto"><table class="min-w-full bg-white rounded-xl shadow"><thead><tr class="bg-indigo-100 text-indigo-800"><th class="py-2 px-4">Role</th><th class="py-2 px-4">Count</th></tr></thead><tbody>${demographics.byRole.map(d => `<tr><td class="py-2 px-4">${d.role}</td><td class="py-2 px-4">${d.count}</td></tr>`).join('')}</tbody></table></div>
        `;
        document.getElementById('roomAllocationTable').innerHTML = `
          <div class="overflow-x-auto"><table class="min-w-full bg-white rounded-xl shadow"><thead><tr class="bg-indigo-100 text-indigo-800"><th class="py-2 px-4">Room Type</th><th class="py-2 px-4">Participant</th><th class="py-2 px-4">Email</th></tr></thead><tbody>${roomAlloc.map(r => `<tr><td class="py-2 px-4">${r.room_type}</td><td class="py-2 px-4">${r.name}</td><td class="py-2 px-4">${r.email}</td></tr>`).join('')}</tbody></table></div>
        `;
        document.getElementById('sponsorshipFundsTable').innerHTML = `
          <div class="overflow-x-auto"><table class="min-w-full bg-white rounded-xl shadow"><thead><tr class="bg-indigo-100 text-indigo-800"><th class="py-2 px-4">Sponsor</th><th class="py-2 px-4">Total Funds</th></tr></thead><tbody>${sponsorshipFunds.map(s => `<tr><td class="py-2 px-4">${s.company_name}</td><td class="py-2 px-4">${s.total_funds}</td></tr>`).join('')}</tbody></table></div>
        `;

        // Tab switching logic
        const tabBtns = section.querySelectorAll('.tab-btn');
        const tabPanes = section.querySelectorAll('.tab-pane');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', function () {
                tabBtns.forEach(b => b.classList.remove('text-indigo-600', 'border-indigo-600'));
                tabBtns.forEach(b => b.classList.add('text-gray-600', 'border-transparent'));
                this.classList.add('text-indigo-600', 'border-indigo-600');
                this.classList.remove('text-gray-600', 'border-transparent');
                const tab = this.getAttribute('data-tab');
                tabPanes.forEach(pane => pane.classList.add('hidden'));
                const activePane = section.querySelector(`#tab-${tab}`);
                if (activePane) activePane.classList.remove('hidden');
            });
        });
        // Default to Overview tab
        tabBtns[0].click();
    } catch (error) {
        section.innerHTML = `<div class="error-message">${error.message}</div>`;
    }
}

// --- Reports Charts Rendering ---
function renderReportsCharts({ eventParticipation, venueUtilization, revenue, accommodation, demographics, sponsorshipFunds }) {
    // Destroy previous charts if they exist (to avoid Chart.js errors)
    if (window._adminCharts) {
        window._adminCharts.forEach(chart => chart && chart.destroy());
    }
    window._adminCharts = [];

    // 1. Event Participation Chart
    const epCtx = document.getElementById('eventParticipationChart');
    if (epCtx && eventParticipation && eventParticipation.length) {
        const epChart = new Chart(epCtx, {
            type: 'bar',
            data: {
                labels: eventParticipation.map(ev => ev.event_name),
                datasets: [{
                    label: 'Participants',
                    data: eventParticipation.map(ev => ev.participant_count),
                    backgroundColor: '#6366f1'
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
        window._adminCharts.push(epChart);
    }

    // 2. Venue Utilization Chart
    const vuCtx = document.getElementById('venueUtilizationChart');
    if (vuCtx && venueUtilization && venueUtilization.length) {
        const vuChart = new Chart(vuCtx, {
            type: 'bar',
            data: {
                labels: venueUtilization.map(v => v.venue_name),
                datasets: [{
                    label: 'Events Hosted',
                    data: venueUtilization.map(v => v.events_hosted),
                    backgroundColor: '#10b981'
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
        window._adminCharts.push(vuChart);
    }

    // 3. Financial Overview Chart
    const finCtx = document.getElementById('financialChart');
    if (finCtx && revenue && Object.keys(revenue).length) {
        // Example: revenue = { registration: 10000, accommodation: 5000, sponsorship: 20000 }
        const labels = Object.keys(revenue);
        const data = Object.values(revenue);
        const finChart = new Chart(finCtx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: ['#6366f1', '#f59e42', '#10b981']
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'bottom' } }
            }
        });
        window._adminCharts.push(finChart);
    }

    // 4. Accommodation Occupancy Chart
    const accCtx = document.getElementById('accommodationChart');
    if (accCtx && accommodation && accommodation.length) {
        const accChart = new Chart(accCtx, {
            type: 'bar',
            data: {
                labels: accommodation.map(a => a.room_type),
                datasets: [
                    {
                        label: 'Occupied',
                        data: accommodation.map(a => a.occupied),
                        backgroundColor: '#6366f1'
                    },
                    {
                        label: 'Available',
                        data: accommodation.map(a => a.available_rooms),
                        backgroundColor: '#f59e42'
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'top' } },
                scales: { y: { beginAtZero: true } }
            }
        });
        window._adminCharts.push(accChart);
    }

    // 5. Demographics Chart
    const demoCtx = document.getElementById('demographicsChart');
    if (demoCtx && demographics && demographics.byRole && demographics.byRole.length) {
        const demoChart = new Chart(demoCtx, {
            type: 'pie',
            data: {
                labels: demographics.byRole.map(d => d.role),
                datasets: [{
                    data: demographics.byRole.map(d => d.count),
                    backgroundColor: ['#6366f1', '#10b981', '#f59e42', '#f43f5e', '#a21caf']
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'bottom' } }
            }
        });
        window._adminCharts.push(demoChart);
    }

    // 6. Sponsorship Funds Chart
    const sponCtx = document.getElementById('sponsorshipChart');
    if (sponCtx && sponsorshipFunds && sponsorshipFunds.length) {
        const sponChart = new Chart(sponCtx, {
            type: 'bar',
            data: {
                labels: sponsorshipFunds.map(s => s.company_name),
                datasets: [{
                    label: 'Total Funds',
                    data: sponsorshipFunds.map(s => s.total_funds),
                    backgroundColor: '#f43f5e'
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
        window._adminCharts.push(sponChart);
    }
}