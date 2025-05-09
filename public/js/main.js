// API Configuration
const API_BASE_URL = '/api';

// DOM Elements
const eventGrid = document.getElementById('eventGrid');
const upcomingEvents = document.getElementById('upcomingEvents');
const venueGrid = document.getElementById('venueGrid');
const sponsorGrid = document.getElementById('sponsorGrid');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const toastContainer = document.getElementById('toastContainer');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const navLinksContainer = document.querySelector('.nav-links-container');
const navLinks = document.querySelectorAll('.nav-links a[data-page]');
const pages = document.querySelectorAll('.page');

// Event Management Elements
const eventsTable = document.getElementById('events-tbody');
const addEventBtn = document.getElementById('addEventBtn');
const eventModal = document.getElementById('eventModal');
const closeEventModal = document.getElementById('closeEventModal');
const eventForm = document.getElementById('eventForm');

// Sponsorship Management Elements
const sponsorshipsTable = document.getElementById('sponsorships-tbody');
const addSponsorshipBtn = document.getElementById('addSponsorshipBtn');
const sponsorshipModal = document.getElementById('sponsorshipModal');
const closeSponsorshipModal = document.getElementById('closeSponsorshipModal');
const sponsorshipForm = document.getElementById('sponsorshipForm');

// Track current filters and filtered events
globalThis.currentCategoryFilter = '';
globalThis.currentDateFilter = '';
globalThis.currentFilteredEvents = null;

// Check if user is logged in
const isLoggedIn = () => {
    return localStorage.getItem('token') !== null;
};

// Update UI based on authentication status
const updateAuthUI = () => {
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');

    if (authButtons && userMenu) {
        if (isLoggedIn()) {
            const user = JSON.parse(localStorage.getItem('user'));
            authButtons.classList.add('hidden');
            userMenu.classList.remove('hidden');
            document.getElementById('userName').textContent = user.name;
        } else {
            authButtons.classList.remove('hidden');
            userMenu.classList.add('hidden');
        }
    }
};

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Load initial data
    if (eventGrid || upcomingEvents) loadEvents();
    if (venueGrid) loadVenues();
    if (sponsorGrid) loadSponsors();

    // Load table data if on relevant pages
    if (eventsTable) loadEventsTable();
    if (sponsorshipsTable) loadSponsorshipsTable();

    // Setup event listeners
    setupEventListeners();

    // Update UI based on authentication status
    updateAuthUI();

    // Control visibility of admin-only buttons
    updateButtonVisibility();

    // Handle logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/';
        });
    }

    // Attach event delegation for event table actions
    const eventsTbody = document.getElementById('events-tbody');
    if (eventsTbody) {
        eventsTbody.addEventListener('click', function (e) {
            if (e.target.closest('.btn-edit')) {
                const eventId = e.target.closest('.btn-edit').dataset.id;
                openEditEventModal(eventId);
            }
            if (e.target.closest('.btn-delete')) {
                const eventId = e.target.closest('.btn-delete').dataset.id;
                deleteEvent(eventId);
            }
        });
    }

    // --- Minimal Robust Toggle Sponsors View Button Logic ---
    const grid = document.getElementById('sponsorGrid');
    const table = document.getElementById('sponsorTableContainer');
    const btn = document.getElementById('toggleSponsorsViewBtn');
    const tbody = document.getElementById('sponsors-tbody');

    if (btn && grid && table && tbody) {
        btn.addEventListener('click', () => {
            const gridVisible = !grid.classList.contains('hidden');
            grid.classList.toggle('hidden', gridVisible);
            table.classList.toggle('hidden', !gridVisible);
            btn.textContent = gridVisible ? 'Switch to Grid View' : 'Switch to List View';
            if (!gridVisible) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4">Loading sponsors...</td></tr>';
                loadSponsorsTable();
            }
        });
    }
});

// Setup Event Listeners
function setupEventListeners() {
    // Login and Register buttons redirect to dedicated pages
    if (loginBtn) {
        loginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = '/pages/login.html';
        });
    }

    if (registerBtn) {
        registerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = '/pages/signup.html';
        });
    }

    // Filter Controls
    const applyFilters = document.getElementById('applyFilters');
    const checkAvailability = document.getElementById('checkAvailability');
    const filterSponsors = document.getElementById('filterSponsors');

    if (applyFilters) applyFilters.addEventListener('click', applyEventFilters);
    if (checkAvailability) checkAvailability.addEventListener('click', checkVenueAvailability);
    if (filterSponsors) filterSponsors.addEventListener('click', filterSponsorsList);

    // Mobile Menu Toggle
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            navLinksContainer.classList.toggle('active');
        });
    }

    // Event Management
    if (addEventBtn) {
        addEventBtn.addEventListener('click', () => {
            // Clear form fields
            eventForm.reset();
            document.getElementById('eventModalTitle').textContent = 'Add Event';
            eventForm.dataset.mode = 'add';
            eventForm.dataset.eventId = '';
            eventModal.classList.remove('hidden');
        });
    }

    if (closeEventModal) {
        closeEventModal.addEventListener('click', () => {
            eventModal.classList.add('hidden');
            if (eventForm) eventForm.reset();
            // Remove error messages if any
            const errorMsg = eventModal.querySelector('.error-message');
            if (errorMsg) errorMsg.remove();
        });
    }

    if (eventForm) {
        eventForm.addEventListener('submit', handleEventSubmit);
    }

    // Sponsorship Management
    if (addSponsorshipBtn) {
        addSponsorshipBtn.addEventListener('click', () => {
            // Clear form fields
            sponsorshipForm.reset();
            document.getElementById('sponsorshipModalTitle').textContent = 'Add Sponsorship';
            sponsorshipForm.dataset.mode = 'add';
            sponsorshipForm.dataset.sponsorshipId = '';
            sponsorshipModal.classList.remove('hidden');
        });
    }

    if (closeSponsorshipModal) {
        closeSponsorshipModal.addEventListener('click', () => {
            sponsorshipModal.classList.add('hidden');
        });
    }

    if (sponsorshipForm) {
        sponsorshipForm.addEventListener('submit', handleSponsorshipSubmit);
    }
}

// API Functions
async function loadEvents() {
    try {
        showLoading('events');
        const response = await fetch(`${API_BASE_URL}/events`);
        if (!response.ok) {
            throw new Error('Failed to load events');
        }
        const events = await response.json();
        displayEvents(events);
    } catch (error) {
        console.error('Error loading events:', error);
        showError('Failed to load events');
    } finally {
        hideLoading('events');
    }
}

async function loadVenues() {
    try {
        showLoading('venues');
        const response = await fetch(`${API_BASE_URL}/venues`);
        if (!response.ok) {
            throw new Error('Failed to load venues');
        }
        const venues = await response.json();
        displayVenues(venues);
    } catch (error) {
        console.error('Error loading venues:', error);
        showError('Failed to load venues');
    } finally {
        hideLoading('venues');
    }
}

async function loadSponsors() {
    try {
        showLoading('sponsors');
        const response = await fetch(`${API_BASE_URL}/sponsors`);
        if (!response.ok) {
            throw new Error('Failed to load sponsors');
        }
        const sponsors = await response.json();
        displaySponsors(sponsors);
    } catch (error) {
        console.error('Error loading sponsors:', error);
        showError('Failed to load sponsors');
    } finally {
        hideLoading('sponsors');
    }
}

// UI Functions
function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = '<div class="loading">Loading...</div>';
    }
}

function hideLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element && element.querySelector('.loading')) {
        element.querySelector('.loading').remove();
    }
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 3000);
}

function showToast(message, type = 'info') {
    if (!toastContainer) {
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'fixed bottom-4 right-4 z-50 flex flex-col gap-2';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast bg-white p-3 rounded-lg shadow-lg ${type === 'error' ? 'border-l-4 border-red-500' : type === 'success' ? 'border-l-4 border-green-500' : 'border-l-4 border-blue-500'}`;
    toast.textContent = message;

    const toastContainer = document.getElementById('toastContainer');
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Display Functions
function displayEvents(events) {
    const eventsContainer = document.getElementById('eventGrid');
    if (!eventsContainer) return;

    if (events.length === 0) {
        eventsContainer.innerHTML = '<div class="empty-state p-8 text-center text-gray-500">No events found</div>';
        return;
    }

    eventsContainer.innerHTML = events.map(event => `
        <div class="bg-white rounded-xl shadow overflow-hidden flex flex-col">
            <div class="bg-indigo-600 text-white p-4">
                <h3 class="text-xl font-bold">${event.event_name}</h3>
            </div>
            <div class="p-4 flex-grow">
                <p class="text-gray-700 mb-3">${event.description || 'No description available'}</p>
                <div class="flex items-center gap-2 mb-2">
                    <i class="fas fa-calendar-alt text-indigo-600"></i>
                    <span>${event.event_date ? new Date(event.event_date).toLocaleDateString() : 'TBD'}</span>
                </div>
                <div class="flex items-center gap-2 mb-2">
                    <i class="fas fa-map-marker-alt text-indigo-600"></i>
                    <span>${event.venue_name || 'Venue TBD'}</span>
                </div>
                <div class="flex items-center gap-2 mb-2">
                    <i class="fas fa-users text-indigo-600"></i>
                    <span>${event.registered_participants || 0}/${event.max_participants || '∞'} participants</span>
                </div>
            </div>
            <div class="p-4 border-t border-gray-200">
                <button onclick="registerForEvent(${event.event_id})" class="w-full py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition">Register Now</button>
            </div>
        </div>
    `).join('');
}

function displayVenues(venues) {
    const venuesContainer = document.getElementById('venues');
    if (!venuesContainer) return;

    if (venues.length === 0) {
        venuesContainer.innerHTML = '<div class="empty-state">No venues found</div>';
        return;
    }

    venuesContainer.innerHTML = venues.map(venue => `
        <div class="venue-card">
            <h3>${venue.venue_name}</h3>
            <p>Capacity: ${venue.capacity}</p>
            <p>Location: ${venue.location}</p>
            <p>Upcoming Events: ${venue.upcoming_events}</p>
            <button onclick="checkAvailability(${venue.venue_id})">Check Availability</button>
        </div>
    `).join('');
}

function displaySponsors(sponsors) {
    const sponsorsContainer = document.getElementById('sponsorGrid');
    if (!sponsorsContainer) return;

    if (sponsors.length === 0) {
        sponsorsContainer.innerHTML = '<div class="empty-state p-8 text-center text-gray-500">No sponsors found</div>';
        return;
    }

    // Map level to display name
    const levelDisplay = {
        'title': 'Title',
        'gold': 'Gold',
        'silver': 'Silver',
        'bronze': 'Bronze'
    };

    sponsorsContainer.innerHTML = sponsors.map(sponsor => `
        <div class="bg-white rounded-xl shadow overflow-hidden flex flex-col">
            <div class="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4">
                <h3 class="text-xl font-bold">${sponsor.company_name}</h3>
                <div class="text-sm text-indigo-100">Level: ${levelDisplay[sponsor.sponsorship_level] || 'Partner'}</div>
            </div>
            <div class="p-4 flex-grow">
                <div class="flex items-center gap-2 mb-2">
                    <i class="fas fa-user-tie text-indigo-600"></i>
                    <span>${sponsor.contact_person || 'Contact not available'}</span>
                </div>
                <div class="flex items-center gap-2 mb-2">
                    <i class="fas fa-envelope text-indigo-600"></i>
                    <span>${sponsor.email || 'Email not available'}</span>
                </div>
                <div class="flex items-center gap-2 mb-2">
                    <i class="fas fa-money-bill-wave text-indigo-600"></i>
                    <span>Rs. ${sponsor.amount || '0'}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Event Management Functions
async function loadEventsTable(filteredEvents = null) {
    if (!eventsTable) return;
    try {
        eventsTable.innerHTML = '<tr><td colspan="4" class="text-center py-4">Loading events...</td></tr>';
        let events;
        if (filteredEvents) {
            events = filteredEvents;
        } else if (currentCategoryFilter || currentDateFilter) {
            // If filters are set, fetch filtered events
            const response = await fetch(`${API_BASE_URL}/events?category=${currentCategoryFilter}&date=${currentDateFilter}`);
            if (!response.ok) throw new Error('Failed to load events');
            events = await response.json();
        } else {
            // No filters, fetch all
            const token = localStorage.getItem('token');
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            const response = await fetch(`${API_BASE_URL}/events`, { headers });
            if (!response.ok) throw new Error('Failed to load events');
            events = await response.json();
        }
        if (events.length === 0) {
            eventsTable.innerHTML = '<tr><td colspan="4" class="text-center py-4">No events found</td></tr>';
            return;
        }
        eventsTable.innerHTML = events.map(event => `
            <tr>
                <td class="py-2 px-4">${event.event_name}</td>
                <td class="py-2 px-4">${event.event_date ? new Date(event.event_date).toLocaleDateString() : 'TBD'}</td>
                <td class="py-2 px-4">${event.venue_name || 'Not assigned'}</td>
                <td class="py-2 px-4 flex gap-2">
                    ${(function () {
                const token = localStorage.getItem('token');
                let userRole = null;
                if (token) {
                    const user = JSON.parse(localStorage.getItem('user') || '{}');
                    userRole = user.role;
                }
                const canManageEvents = userRole === 'admin' || userRole === 'organizer';
                if (canManageEvents) {
                    return `
                                <button class="py-1 px-3 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs" onclick="editEvent(${event.event_id})">Edit</button>
                                <button class="py-1 px-3 bg-red-600 text-white rounded hover:bg-red-700 text-xs" onclick="deleteEvent(${event.event_id})">Delete</button>
                            `;
                } else {
                    return `<button class="py-1 px-3 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-xs" onclick="registerForEvent(${event.event_id})">Register</button>`;
                }
            })()}
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading events table:', error);
        eventsTable.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-red-500">Error: ${error.message}</td></tr>`;
    }
}

async function handleEventSubmit(e) {
    e.preventDefault();

    try {
        const formData = new FormData(eventForm);
        const eventData = Object.fromEntries(formData.entries());

        const token = localStorage.getItem('token');
        if (!token) {
            showToast('You must be logged in to perform this action', 'error');
            return;
        }

        const mode = eventForm.dataset.mode;
        const eventId = eventForm.dataset.eventId;

        let url = `${API_BASE_URL}/events`;
        let method = 'POST';

        if (mode === 'edit' && eventId) {
            url = `${API_BASE_URL}/events/${eventId}`;
            method = 'PATCH';
        }

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(eventData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to save event');
        }

        // Success
        eventModal.classList.add('hidden');
        loadEventsTable();
        showToast(mode === 'edit' ? 'Event updated successfully' : 'Event added successfully', 'success');
    } catch (error) {
        console.error('Error saving event:', error);
        showToast(error.message, 'error');
    }
}

// Make these functions globally available
window.editEvent = function (eventId) {
    fetch(`${API_BASE_URL}/events/${eventId}`)
        .then(res => res.json())
        .then(event => {
            document.getElementById('eventModalTitle').textContent = 'Edit Event';

            // Fill form
            const form = document.getElementById('eventForm');
            form.querySelector('[name="event_name"]').value = event.event_name || '';

            // Format date for input field (YYYY-MM-DD)
            if (event.event_date) {
                const date = new Date(event.event_date);
                const formattedDate = date.toISOString().split('T')[0];
                form.querySelector('[name="event_date"]').value = formattedDate;
            }

            form.querySelector('[name="venue"]').value = event.venue_name || '';

            // Set form mode
            form.dataset.mode = 'edit';
            form.dataset.eventId = eventId;

            // Show modal
            eventModal.classList.remove('hidden');
        })
        .catch(err => {
            console.error('Error fetching event details:', err);
            showToast('Could not load event details', 'error');
        });
};

window.deleteEvent = function (eventId) {
    if (!confirm('Are you sure you want to delete this event?')) return;

    const token = localStorage.getItem('token');
    if (!token) {
        showToast('You must be logged in to perform this action', 'error');
        return;
    }

    fetch(`${API_BASE_URL}/events/${eventId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then(res => {
            if (!res.ok) throw new Error('Failed to delete event');
            loadEventsTable();
            showToast('Event deleted successfully', 'success');
        })
        .catch(err => {
            console.error('Error deleting event:', err);
            showToast(err.message, 'error');
        });
};

// Sponsorship Management Functions
async function loadSponsorshipsTable() {
    if (!sponsorshipsTable) return;

    try {
        sponsorshipsTable.innerHTML = '<tr><td colspan="5" class="text-center py-4">Loading sponsorships...</td></tr>';

        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        // Get user role if logged in
        let userRole = null;
        if (token) {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            userRole = user.role;
        }

        // Check if user is admin or sponsor
        const canManageSponsorships = userRole === 'admin' || userRole === 'sponsor';

        const response = await fetch(`${API_BASE_URL}/sponsorships`, { headers });
        if (!response.ok) throw new Error('Failed to load sponsorships');

        const sponsorships = await response.json();

        if (sponsorships.length === 0) {
            sponsorshipsTable.innerHTML = '<tr><td colspan="5" class="text-center py-4">No sponsorships found</td></tr>';
            return;
        }

        sponsorshipsTable.innerHTML = sponsorships.map(sponsorship => `
            <tr>
                <td class="py-2 px-4">${sponsorship.sponsor || sponsorship.company_name || 'Unknown'}</td>
                <td class="py-2 px-4">${sponsorship.package || sponsorship.sponsorship_type || 'Standard'}</td>
                <td class="py-2 px-4">Rs. ${sponsorship.amount || '0'}</td>
                <td class="py-2 px-4">
                    <span class="px-2 py-1 ${sponsorship.status === 'Confirmed' ? 'bg-green-100 text-green-700' :
                sponsorship.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
            } rounded text-xs">${sponsorship.status || 'Unknown'}</span>
                </td>
                ${canManageSponsorships ? `
                    <td class="py-2 px-4 flex gap-2">
                        <button class="py-1 px-3 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs" onclick="editSponsorship(${sponsorship.sponsorship_id || sponsorship.sponsor_id})">Edit</button>
                        <button class="py-1 px-3 bg-red-600 text-white rounded hover:bg-red-700 text-xs" onclick="deleteSponsorship(${sponsorship.sponsorship_id || sponsorship.sponsor_id})">Delete</button>
                    </td>
                ` : `
                    <td class="py-2 px-4">
                        <a href="mailto:${sponsorship.email || 'contact@nascon.com'}" class="py-1 px-3 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-xs">Contact</a>
                    </td>
                `}
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading sponsorships table:', error);
        sponsorshipsTable.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-red-500">Error: ${error.message}</td></tr>`;
    }
}

async function handleSponsorshipSubmit(e) {
    e.preventDefault();

    try {
        const formData = new FormData(sponsorshipForm);
        const sponsorshipData = Object.fromEntries(formData.entries());

        const token = localStorage.getItem('token');
        if (!token) {
            showToast('You must be logged in to perform this action', 'error');
            return;
        }

        const mode = sponsorshipForm.dataset.mode;
        const sponsorshipId = sponsorshipForm.dataset.sponsorshipId;

        let url = `${API_BASE_URL}/sponsorships`;
        let method = 'POST';

        if (mode === 'edit' && sponsorshipId) {
            url = `${API_BASE_URL}/sponsorships/${sponsorshipId}`;
            method = 'PATCH';
        }

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(sponsorshipData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to save sponsorship');
        }

        // Success
        sponsorshipModal.classList.add('hidden');
        loadSponsorshipsTable();
        showToast(mode === 'edit' ? 'Sponsorship updated successfully' : 'Sponsorship added successfully', 'success');
    } catch (error) {
        console.error('Error saving sponsorship:', error);
        showToast(error.message, 'error');
    }
}

// Make these functions globally available
window.editSponsorship = function (sponsorshipId) {
    fetch(`${API_BASE_URL}/sponsorships/${sponsorshipId}`)
        .then(res => res.json())
        .then(sponsorship => {
            document.getElementById('sponsorshipModalTitle').textContent = 'Edit Sponsorship';

            // Fill form
            const form = document.getElementById('sponsorshipForm');
            form.querySelector('[name="sponsor"]').value = sponsorship.sponsor || sponsorship.company_name || '';
            form.querySelector('[name="package"]').value = sponsorship.package || sponsorship.sponsorship_type || '';
            form.querySelector('[name="amount"]').value = sponsorship.amount || '';
            form.querySelector('[name="status"]').value = sponsorship.status || '';

            // Set form mode
            form.dataset.mode = 'edit';
            form.dataset.sponsorshipId = sponsorshipId;

            // Show modal
            sponsorshipModal.classList.remove('hidden');
        })
        .catch(err => {
            console.error('Error fetching sponsorship details:', err);
            showToast('Could not load sponsorship details', 'error');
        });
};

window.deleteSponsorship = function (sponsorshipId) {
    if (!confirm('Are you sure you want to delete this sponsorship?')) return;

    const token = localStorage.getItem('token');
    if (!token) {
        showToast('You must be logged in to perform this action', 'error');
        return;
    }

    fetch(`${API_BASE_URL}/sponsorships/${sponsorshipId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then(res => {
            if (!res.ok) throw new Error('Failed to delete sponsorship');
            loadSponsorshipsTable();
            showToast('Sponsorship deleted successfully', 'success');
        })
        .catch(err => {
            console.error('Error deleting sponsorship:', err);
            showToast(err.message, 'error');
        });
};

// Event Registration
async function registerForEvent(eventId) {
    const token = localStorage.getItem('token');
    if (!token) {
        showToast('Please login to register for events', 'error');
        window.location.href = '/pages/login.html';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/events/${eventId}/register`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to register for event');
        }

        showToast('Successfully registered for event!', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Filter Functions
async function applyEventFilters() {
    const category = document.getElementById('categoryFilter').value;
    const date = document.getElementById('dateFilter').value;
    currentCategoryFilter = category;
    currentDateFilter = date;
    try {
        showLoading('eventGrid');
        const response = await fetch(`${API_BASE_URL}/events?category=${category}&date=${date}`);
        if (!response.ok) throw new Error('Failed to filter events');
        const events = await response.json();
        currentFilteredEvents = events;
        displayEvents(events);
        // If table view is visible, update it too
        if (document.getElementById('eventTableContainer') && !document.getElementById('eventTableContainer').classList.contains('hidden')) {
            loadEventsTable(events);
        }
    } catch (error) {
        showError('Failed to filter events. Please try again.');
    }
}

async function checkVenueAvailability() {
    const date = document.getElementById('venueDate').value;
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;

    try {
        showLoading(venueGrid);
        const response = await fetch(`${API_BASE_URL}/venues/availability?date=${date}&startTime=${startTime}&endTime=${endTime}`);
        if (!response.ok) throw new Error('Failed to check availability');

        const venues = await response.json();
        displayVenues(venues);
    } catch (error) {
        showError('Failed to check venue availability. Please try again.');
    }
}

async function filterSponsorsList() {
    const level = document.getElementById('sponsorLevel').value;

    try {
        showLoading(sponsorGrid);
        const response = await fetch(`${API_BASE_URL}/sponsors?level=${level}`);
        if (!response.ok) throw new Error('Failed to filter sponsors');

        const sponsors = await response.json();
        displaySponsors(sponsors);
    } catch (error) {
        showError('Failed to filter sponsors. Please try again.');
    }
}

// Smooth Scrolling
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

// Intersection Observer for Animations
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

document.querySelectorAll('.feature-card, .event-card').forEach(element => {
    observer.observe(element);
});

// Tab Switching
function switchTab(tabName) {
    // Update active state in navigation
    navLinks.forEach(link => {
        if (link.getAttribute('data-page') === tabName) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Show selected page and hide others
    pages.forEach(page => {
        if (page.id === tabName) {
            page.classList.add('active');
            // Scroll to top of the page
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        } else {
            page.classList.remove('active');
        }
    });

    // Close mobile menu if open
    navLinksContainer.classList.remove('active');

    // Load content for the selected tab
    loadTabContent(tabName);
}

// Load content for specific tab
async function loadTabContent(tabName) {
    try {
        switch (tabName) {
            case 'events':
                const eventsResponse = await fetch('/api/events');
                const events = await eventsResponse.json();
                updateEventGrid(events);
                break;
            case 'venues':
                const venuesResponse = await fetch('/api/venues');
                const venues = await venuesResponse.json();
                updateVenueGrid(venues);
                break;
            case 'sponsors':
                const sponsorsResponse = await fetch('/api/sponsors');
                const sponsors = await sponsorsResponse.json();
                updateSponsorGrid(sponsors);
                break;
        }
    } catch (error) {
        showToast(`Error loading ${tabName} content`, 'error');
        console.error(`Error loading ${tabName}:`, error);
    }
}

// Update Venue Grid
function updateVenueGrid(venues) {
    const venueGrid = document.querySelector('.venue-grid');
    if (!venueGrid) return;

    venueGrid.innerHTML = venues.map(venue => `
        <div class="venue-card">
            <div class="venue-card-content">
                <h3>${venue.venue_name}</h3>
                <p><i class="fas fa-users"></i> Capacity: ${venue.capacity}</p>
                <p><i class="fas fa-map-marker-alt"></i> ${venue.location}</p>
                <p><i class="fas fa-cogs"></i> Facilities: ${venue.facilities}</p>
                <button class="cta-button" onclick="checkVenueAvailability(${venue.venue_id})">Check Availability</button>
            </div>
        </div>
    `).join('');
}

// Update Sponsor Grid
function updateSponsorGrid(sponsors) {
    const sponsorLevels = {
        'title': document.getElementById('titleSponsors'),
        'gold': document.getElementById('goldSponsors'),
        'silver': document.getElementById('silverSponsors')
    };

    // Clear existing content
    Object.values(sponsorLevels).forEach(grid => {
        if (grid) grid.innerHTML = '';
    });

    // Add sponsors to appropriate level
    sponsors.forEach(sponsor => {
        const sponsorCard = `
            <div class="sponsor-card">
                <h4>${sponsor.company_name}</h4>
                <p>${sponsor.contact_person}</p>
                <p><i class="fas fa-envelope"></i> ${sponsor.email}</p>
                <p><i class="fas fa-phone"></i> ${sponsor.phone}</p>
                <p class="sponsor-amount">$${sponsor.amount}</p>
            </div>
        `;

        const grid = sponsorLevels[sponsor.sponsorship_level.toLowerCase()];
        if (grid) {
            grid.innerHTML += sponsorCard;
        }
    });
}

// Add click event listeners to navigation links
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const tabName = link.getAttribute('data-page');
        switchTab(tabName);
    });
});

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    // Load initial content for the active tab
    const activeTab = document.querySelector('.nav-links a.active');
    if (activeTab) {
        const tabName = activeTab.getAttribute('data-page');
        loadTabContent(tabName);
    }

    // Mobile menu toggle
    mobileMenuBtn.addEventListener('click', () => {
        navLinksContainer.classList.toggle('active');
    });

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            hideModal(e.target.id);
        }
    });

    // Login button click handler
    document.querySelectorAll('#loginBtn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            showModal(loginModal);
        });
    });

    // Register button click handler
    document.querySelectorAll('#registerBtn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            showModal(registerModal);
        });
    });

    // Show register form from login modal
    document.querySelectorAll('#showRegister').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            hideModal('loginModal');
            showModal(registerModal);
        });
    });
});

function showModal(modal) {
    if (!modal) return;
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    // Focus first input in modal
    const firstInput = modal.querySelector('input, select, textarea');
    if (firstInput) firstInput.focus();
}

// Close modal on Escape key
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(modal => {
            if (modal.style.display === 'block') {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });
    }
});

// Mobile menu toggle (if not already present)
document.addEventListener('DOMContentLoaded', function () {
    const btn = document.getElementById('mobileMenuBtn');
    const menu = document.getElementById('mobileMenu');
    if (btn && menu) {
        btn.addEventListener('click', () => {
            menu.classList.toggle('hidden');
        });
    }
});

// Function to control visibility of buttons based on user role
function updateButtonVisibility() {
    // Get user role if logged in
    let userRole = null;
    const token = localStorage.getItem('token');

    if (token) {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        userRole = user.role;
    }

    // Add Event button - only visible to admin/organizer
    const addEventBtn = document.getElementById('addEventBtn');
    if (addEventBtn) {
        const canManageEvents = userRole === 'admin' || userRole === 'organizer';
        addEventBtn.style.display = canManageEvents ? 'block' : 'none';
    }

    // Add Sponsorship button - only visible to admin/sponsor
    const addSponsorshipBtn = document.getElementById('addSponsorshipBtn');
    if (addSponsorshipBtn) {
        const canManageSponsorships = userRole === 'admin' || userRole === 'sponsor';
        addSponsorshipBtn.style.display = canManageSponsorships ? 'block' : 'none';
    }
}

// --- Toggle View Button Logic ---
const toggleEventsViewBtn = document.getElementById('toggleEventsViewBtn');
if (toggleEventsViewBtn) {
    toggleEventsViewBtn.addEventListener('click', () => {
        const gridContainer = document.getElementById('eventGridContainer');
        const tableContainer = document.getElementById('eventTableContainer');
        if (gridContainer && tableContainer) {
            const isGrid = !gridContainer.classList.contains('hidden');
            gridContainer.classList.toggle('hidden', isGrid);
            tableContainer.classList.toggle('hidden', !isGrid);
            toggleEventsViewBtn.textContent = isGrid ? 'Switch to Grid View' : 'Switch to List View';
            // When switching to table view, use filtered events if available
            if (!isGrid) {
                loadEventsTable(currentFilteredEvents);
            }
        }
    });
}

// --- Mobile Menu: Close on Navigation ---
const mobileMenu = document.getElementById('mobileMenu');
if (mobileMenu) {
    mobileMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.add('hidden');
        });
    });
}

// --- Helper Functions for Event Actions ---
function openEditEventModal(eventId) {
    // Fetch event data and populate modal for editing
    // ... implement as needed ...
    eventModal.classList.remove('hidden');
    document.getElementById('eventModalTitle').textContent = 'Edit Event';
    eventForm.dataset.mode = 'edit';
    eventForm.dataset.eventId = eventId;
    // Populate form fields with event data (fetch from API or from loaded events)
}

function deleteEvent(eventId) {
    if (!confirm('Are you sure you want to delete this event?')) return;
    fetch(`${API_BASE_URL}/events/${eventId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
        .then(res => res.json())
        .then(result => {
            if (result.error) throw new Error(result.error);
            showToast('Event deleted successfully', 'success');
            loadEventsTable();
        })
        .catch(err => {
            showToast(err.message, 'error');
        });
}

// Function to render sponsors in table view
function loadSponsorsTable() {
    fetch('/api/sponsors')
        .then(res => res.json())
        .then(sponsors => {
            const tbody = document.getElementById('sponsors-tbody');
            if (!tbody) return;
            if (!Array.isArray(sponsors) || sponsors.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4">No sponsors found</td></tr>';
                return;
            }
            tbody.innerHTML = sponsors.map(s => `
                <tr>
                    <td class="py-2 px-4">${s.company_name}</td>
                    <td class="py-2 px-4">${s.contact_person} <br><span class="text-xs text-gray-400">${s.email}</span></td>
                    <td class="py-2 px-4">${s.sponsorship_level}</td>
                    <td class="py-2 px-4">Rs. ${s.amount}</td>
                </tr>
            `).join('');
        });
} 