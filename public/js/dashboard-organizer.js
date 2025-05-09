// dashboard-organizer.js

document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in and is organizer
    const token = getAuthToken();
    const user = JSON.parse(localStorage.getItem('user'));
    if (!token || !user || user.role !== 'organizer') {
        window.location.href = '../pages/login.html';
        return;
    }

    // Sidebar navigation logic
    window.showSection = function (section) {
        const sections = ['overview', 'myevents', 'createevent', 'venues', 'participants', 'payments', 'messages'];
        sections.forEach(s => {
            const el = document.getElementById(s + 'Section');
            if (el) el.classList.add('hidden');
        });
        const showEl = document.getElementById(section + 'Section');
        if (showEl) showEl.classList.remove('hidden');
        if (section === 'overview') loadOrganizerOverview(user, token);
        if (section === 'myevents') loadMyEventsSection(user, token);
        if (section === 'payments') loadOrganizerPaymentsSection(user, token);
        if (section === 'createevent') populateVenueDropdown(token);
        if (section === 'venues') {
            const token = localStorage.getItem('token');
            loadVenuesSection(token);
        }
        if (section === 'participants') {
            const token = localStorage.getItem('token');
            const user = JSON.parse(localStorage.getItem('user'));
            loadParticipantsSection(user, token);
        }
        // Add more as needed
    };
    // Set default section
    showSection('overview');

    // Logout
    window.logout = function () {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '../index.html';
    };

    // Add event creation logic for organizer
    // Attach this to your event creation form's submit event
    const createEventForm = document.querySelector('#createEventForm');
    if (createEventForm) {
        createEventForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const user = JSON.parse(localStorage.getItem('user'));
            const token = localStorage.getItem('token');
            const eventData = {
                event_name: document.getElementById('eventName').value,
                description: document.getElementById('description').value,
                category: document.getElementById('eventCategory').value,
                event_date: document.getElementById('eventDate').value,
                max_participants: parseInt(document.getElementById('maxParticipants').value),
                venue_id: parseInt(document.getElementById('venue').value),
                registration_fee: parseFloat(document.getElementById('registrationFee').value),
                organizer_id: user.user_id
            };

            try {
                const response = await fetch('/api/events', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(eventData)
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to create event');
                }
                // Refresh dashboard sections
                loadOrganizerOverview(user, token);
                loadMyEventsSection(user, token);
                showNotification('Event created successfully!', 'success');
                createEventForm.reset();
            } catch (err) {
                showNotification('Error creating event: ' + err.message, 'error');
            }
        });
    }

    // Event Categories Configuration
    const eventCategories = {
        'Tech Events': {
            description: 'Technical competitions and challenges focused on programming, development, and artificial intelligence.',
            icon: 'code'
        },
        'Business Competitions': {
            description: 'Business-focused events including case study competitions and entrepreneurship challenges.',
            icon: 'business'
        },
        'Gaming Tournaments': {
            description: 'Competitive gaming events for both e-sports and console gaming enthusiasts.',
            icon: 'sports_esports'
        },
        'General Events': {
            description: 'Various general events including debates, photography contests, and quiz competitions.',
            icon: 'event'
        }
    };

    // Initialize event creation form
    function initEventCreation() {
        const categorySelect = document.getElementById('eventCategory');
        const categoryDescription = document.getElementById('categoryDescription');

        // Populate category select
        Object.keys(eventCategories).forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categorySelect.appendChild(option);
        });

        // Update category description when category changes
        categorySelect.addEventListener('change', () => {
            const selectedCategory = categorySelect.value;
            categoryDescription.textContent = eventCategories[selectedCategory].description;
        });

        // Initialize form submission
        const eventForm = document.getElementById('createEventForm');
        eventForm.addEventListener('submit', handleEventCreation);
    }

    // Handle event creation
    async function handleEventCreation(event) {
        event.preventDefault();

        const formData = new FormData(event.target);
        const eventData = {
            event_name: formData.get('eventName'),
            description: formData.get('description'),
            category: formData.get('category'),
            event_date: formData.get('eventDate'),
            max_participants: parseInt(formData.get('maxParticipants')),
            venue_id: parseInt(formData.get('venue')),
            registration_fee: parseFloat(formData.get('registrationFee')),
            organizer_id: getCurrentUserId()
        };

        try {
            const response = await fetch('/api/events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify(eventData)
            });

            const result = await response.json();

            if (response.ok) {
                showNotification('Event created successfully!', 'success');
                event.target.reset();
            } else {
                showNotification(result.error || 'Failed to create event', 'error');
            }
        } catch (error) {
            console.error('Error creating event:', error);
            showNotification('An error occurred while creating the event', 'error');
        }
    }

    // Load venues for selection
    async function loadVenues() {
        try {
            const token = getAuthToken();
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch('/api/venues', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch venues');
            }

            const venues = await response.json();
            const venueSelect = document.getElementById('venue');

            if (!venueSelect) {
                console.warn('Venue select element not found');
                return;
            }

            // Clear existing options except the first one
            venueSelect.innerHTML = '<option value="">Select Venue</option>';

            // Add venue options
            venues.forEach(venue => {
                const option = document.createElement('option');
                option.value = venue.venue_id;
                option.textContent = `${venue.venue_name} (Capacity: ${venue.capacity})`;
                venueSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading venues:', error);
            showNotification('Failed to load venues: ' + error.message, 'error');
        }
    }

    // Show notification
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    // Initialize when DOM is loaded
    initEventCreation();
    loadVenues();
});

// --- Overview Section ---
async function loadOrganizerOverview(user, token) {
    const overviewSection = document.getElementById('overviewSection');
    if (!overviewSection) return;
    overviewSection.innerHTML = `
    <div class="glass p-8 mb-8 flex flex-col items-center text-center">
        <h2 class="text-3xl md:text-4xl font-extrabold text-indigo-900 mb-2 flex items-center gap-2">
            <i class="fas fa-user-tie text-indigo-500"></i> Welcome, <span id="organizerName">${user.name}</span>!
        </h2>
        <p class="text-gray-600 mb-6 text-lg">Here's a quick overview of your events and stats.</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 w-full mt-4 justify-center">
            <div class="bg-gradient-to-br from-indigo-100 to-white rounded-xl shadow p-6 flex flex-col items-center stat-card hover:shadow-lg transition group">
                <div class="text-indigo-600 text-4xl mb-2"><i class="fas fa-calendar-check"></i></div>
                <div class="text-3xl font-bold" id="eventsManagedCount">...</div>
                <div class="text-gray-700 font-semibold">Events Managed</div>
                <div class="text-xs text-gray-400 mt-1">Events you are organizing</div>
            </div>
            <div class="bg-gradient-to-br from-green-100 to-white rounded-xl shadow p-6 flex flex-col items-center stat-card hover:shadow-lg transition group">
                <div class="text-green-600 text-4xl mb-2"><i class="fas fa-users"></i></div>
                <div class="text-3xl font-bold" id="participantsCount">...</div>
                <div class="text-gray-700 font-semibold">Participants</div>
                <div class="text-xs text-gray-400 mt-1">Total unique participants</div>
            </div>
            <div class="bg-gradient-to-br from-blue-100 to-white rounded-xl shadow p-6 flex flex-col items-center stat-card hover:shadow-lg transition group">
                <div class="text-blue-600 text-4xl mb-2"><i class="fas fa-building"></i></div>
                <div class="text-3xl font-bold" id="venuesBookedCount">...</div>
                <div class="text-gray-700 font-semibold">Venues Booked</div>
                <div class="text-xs text-gray-400 mt-1">Venues you have booked</div>
            </div>
            <div class="bg-gradient-to-br from-yellow-100 to-white rounded-xl shadow p-6 flex flex-col items-center stat-card hover:shadow-lg transition group">
                <div class="text-yellow-600 text-4xl mb-2"><i class="fas fa-credit-card"></i></div>
                <div class="text-3xl font-bold" id="paymentsTotal">...</div>
                <div class="text-gray-700 font-semibold">Payments</div>
                <div class="text-xs text-gray-400 mt-1">Total payments received (Rs.)</div>
            </div>
        </div>
    </div>`;
    // Fetch stats from backend and update the counts
    try {
        const res = await fetch(`/api/organizer/${user.user_id}/stats`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error('Failed to load stats');
        const stats = await res.json();
        document.getElementById('eventsManagedCount').textContent = stats.events_managed;
        document.getElementById('participantsCount').textContent = stats.total_participants;
        document.getElementById('venuesBookedCount').textContent = stats.venues_booked;
        document.getElementById('paymentsTotal').textContent = `Rs. ${stats.total_payments}`;
    } catch (err) {
        document.getElementById('eventsManagedCount').textContent = '-';
        document.getElementById('participantsCount').textContent = '-';
        document.getElementById('venuesBookedCount').textContent = '-';
        document.getElementById('paymentsTotal').textContent = '-';
    }
}

// --- My Events Section ---
async function loadMyEventsSection(user, token) {
    const eventsSection = document.getElementById('myeventsSection');
    if (!eventsSection) return;
    eventsSection.innerHTML = `<div class="glass p-8 mb-8"><h2 class="text-2xl font-bold text-indigo-800 mb-4">My Events</h2><div class="loading">Loading your events...</div></div>`;
    try {
        const response = await fetch(`/api/organizer/${user.user_id}/events`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to load your events');
        const events = await response.json();
        if (!Array.isArray(events) || events.length === 0) {
            eventsSection.innerHTML = `<div class="glass p-8 mb-8 flex flex-col items-center justify-center"><span class='text-5xl text-indigo-300 mb-4'><i class="fas fa-calendar-times"></i></span><h2 class="text-2xl font-bold text-indigo-800 mb-2">My Events</h2><div class="empty-state text-gray-500">You are not managing any events yet.</div></div>`;
            return;
        }
        eventsSection.innerHTML = `<div class="glass p-8 mb-8"><h2 class="text-2xl font-bold text-indigo-800 mb-4">My Events</h2><div class="grid grid-cols-1 md:grid-cols-2 gap-6">${events.map(event => `
            <div class="bg-white rounded-xl shadow p-6 flex flex-col gap-2 border border-indigo-100 hover:shadow-lg transition">
                <div class="flex items-center gap-2 mb-2">
                    <span class="text-indigo-600 text-2xl"><i class="fas fa-calendar-check"></i></span>
                    <span class="font-semibold text-lg">${event.event_name}</span>
                </div>
                <div class="flex gap-2 items-center mb-1">
                    <span class="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs flex items-center gap-1"><i class="fas fa-clock"></i> ${event.event_date ? new Date(event.event_date).toLocaleDateString() : '-'}</span>
                    <span class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs flex items-center gap-1"><i class="fas fa-map-marker-alt"></i> ${event.venue_name || 'TBD'}</span>
                </div>
                <div class="text-gray-600 text-sm">Participants: <span class="font-bold">${event.registered_participants || 0}</span></div>
                <div class="text-gray-600 text-sm">Judge: <span class="font-bold">${event.judge_name ? event.judge_name + (event.judge_email ? ` (${event.judge_email})` : '') : 'Not assigned'}</span></div>
            </div>
        `).join('')}</div></div>`;
    } catch (error) {
        eventsSection.innerHTML = `<div class="glass p-8 mb-8"><h2 class="text-2xl font-bold text-indigo-800 mb-4">My Events</h2><div class="error-message">${error.message}</div></div>`;
    }
}

// --- Payments Section ---
async function loadOrganizerPaymentsSection(user, token) {
    const paymentsSection = document.getElementById('paymentsSection');
    if (!paymentsSection) return;
    paymentsSection.innerHTML = `<div class="glass p-8 mb-8"><h2 class="text-2xl font-bold text-indigo-800 mb-4 flex items-center gap-2"><i class="fas fa-credit-card"></i> Payments</h2><div class="loading">Loading payment history...</div></div>`;
    try {
        // Fetch payments for events managed by this organizer
        const response = await fetch(`/api/organizer/${user.user_id}/payments`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to load payments');
        const payments = await response.json();
        if (!Array.isArray(payments) || payments.length === 0) {
            paymentsSection.innerHTML = `<div class="glass p-8 mb-8 flex flex-col items-center justify-center"><span class='text-5xl text-indigo-300 mb-4'><i class="fas fa-money-check-alt"></i></span><h2 class="text-2xl font-bold text-indigo-800 mb-2">Payments</h2><div class="empty-state text-gray-500">No payments found.</div></div>`;
            return;
        }
        // Calculate total paid
        const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
        // Enhanced card layout for each payment
        paymentsSection.innerHTML = `
            <div class="glass p-8 mb-8">
                <h2 class="text-2xl font-bold text-indigo-800 mb-4 flex items-center gap-2"><i class="fas fa-credit-card"></i> Payments</h2>
                <div class="mb-6 flex items-center gap-4">
                    <span class="text-lg font-semibold text-green-700 flex items-center gap-2"><i class="fas fa-wallet"></i> Total Received: <span class="ml-1">Rs. ${totalPaid}</span></span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    ${payments.map(payment => `
                        <div class="bg-white rounded-xl shadow p-6 flex flex-col gap-2 border border-indigo-100 hover:shadow-lg transition">
                            <div class="flex items-center gap-2 mb-2">
                                <span class="text-indigo-600 text-2xl"><i class="fas fa-receipt"></i></span>
                                <span class="font-semibold text-lg capitalize">${payment.event_name || ''}</span>
                                <span class="ml-auto px-2 py-1 ${payment.status === 'completed' ? 'bg-green-100 text-green-700' : payment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'} rounded text-xs flex items-center gap-1"><i class="fas fa-check-circle"></i> ${payment.status === 'completed' ? 'Paid' : payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}</span>
                            </div>
                            <div class="text-gray-600 text-sm">Participant: <span class="font-bold">${payment.participant_name || '-'}</span></div>
                            <div class="text-gray-600 text-sm">Amount: <span class="font-bold">Rs. ${payment.amount}</span></div>
                            <div class="text-gray-600 text-sm">Date: ${payment.payment_date ? new Date(payment.payment_date).toLocaleString() : '-'}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } catch (error) {
        paymentsSection.innerHTML = `<div class="glass p-8 mb-8"><h2 class="text-2xl font-bold text-indigo-800 mb-4">Payments</h2><div class="error-message">${error.message}</div></div>`;
    }
}

// Helper to populate venue dropdown
async function populateVenueDropdown(token) {
    const venueSelect = document.getElementById('eventVenue');
    if (!venueSelect) return;
    try {
        const res = await fetch('/api/venues', { headers: { 'Authorization': `Bearer ${token}` } });
        const venues = await res.json();
        venueSelect.innerHTML = '<option value="">Select Venue</option>';
        venues.forEach(v => {
            venueSelect.innerHTML += `<option value="${v.venue_id}">${v.venue_name}</option>`;
        });
    } catch (err) {
        venueSelect.innerHTML = '<option value="">Error loading venues</option>';
    }
}

// --- Venues Section ---
async function loadVenuesSection(token) {
    const venuesSection = document.getElementById('venuesSection');
    if (!venuesSection) return;
    venuesSection.innerHTML = `<div class="glass p-8 mb-8"><h2 class="text-2xl font-bold text-indigo-800 mb-4">Venues</h2><div class="loading">Loading venues...</div></div>`;
    try {
        const response = await fetch('/api/venues', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) throw new Error('Failed to load venues');
        const venues = await response.json();
        if (!Array.isArray(venues) || venues.length === 0) {
            venuesSection.innerHTML = `<div class='glass p-8 mb-8 flex flex-col items-center justify-center'><span class='text-5xl text-indigo-300 mb-4'><i class="fas fa-building"></i></span><h2 class='text-2xl font-bold text-indigo-800 mb-2'>Venues</h2><div class='empty-state text-gray-500'>No venues found.</div></div>`;
            return;
        }
        venuesSection.innerHTML = `<div class="glass p-8 mb-8"><h2 class="text-2xl font-bold text-indigo-800 mb-4">Venues</h2><div class="overflow-x-auto"><table class="min-w-full bg-white rounded-xl shadow"><thead><tr class="bg-indigo-100 text-indigo-800"><th class="py-2 px-4">Venue</th><th class="py-2 px-4">Capacity</th><th class="py-2 px-4">Status</th></tr></thead><tbody>${venues.map(venue => `<tr><td class="py-2 px-4">${venue.venue_name}</td><td class="py-2 px-4">${venue.capacity}</td><td class="py-2 px-4"><span class="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Available</span></td></tr>`).join('')}</tbody></table></div></div>`;
    } catch (error) {
        venuesSection.innerHTML = `<div class="glass p-8 mb-8"><h2 class="text-2xl font-bold text-indigo-800 mb-4">Venues</h2><div class="error-message">${error.message}</div></div>`;
    }
}

// --- Participants Section ---
async function loadParticipantsSection(user, token) {
    const participantsSection = document.getElementById('participantsSection');
    if (!participantsSection) return;
    participantsSection.innerHTML = `<div class="glass p-8 mb-8"><h2 class="text-2xl font-bold text-indigo-800 mb-4">Participants</h2><div class="loading">Loading participants...</div></div>`;
    try {
        const response = await fetch(`/api/organizer/${user.user_id}/participants`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) throw new Error('Failed to load participants');
        const participants = await response.json();
        if (!Array.isArray(participants) || participants.length === 0) {
            participantsSection.innerHTML = `<div class='glass p-8 mb-8 flex flex-col items-center justify-center'><span class='text-5xl text-indigo-300 mb-4'><i class="fas fa-users"></i></span><h2 class='text-2xl font-bold text-indigo-800 mb-2'>Participants</h2><div class='empty-state text-gray-500'>No participants found.</div></div>`;
            return;
        }
        participantsSection.innerHTML = `<div class="glass p-8 mb-8"><h2 class="text-2xl font-bold text-indigo-800 mb-4">Participants</h2><div class="overflow-x-auto"><table class="min-w-full bg-white rounded-xl shadow"><thead><tr class="bg-indigo-100 text-indigo-800"><th class="py-2 px-4">Name</th><th class="py-2 px-4">Email</th><th class="py-2 px-4">Event</th><th class="py-2 px-4">Registration Status</th><th class="py-2 px-4">Payment</th><th class="py-2 px-4">Accommodation</th><th class="py-2 px-4">Actions</th></tr></thead><tbody>${participants.map(p => `<tr><td class="py-2 px-4">${p.participant_name}</td><td class="py-2 px-4">${p.participant_email}</td><td class="py-2 px-4">${p.event_name}</td><td class="py-2 px-4">${p.registration_status || 'Confirmed'}</td><td class="py-2 px-4">${p.payment_status === 'completed' || p.payment_status === 'Paid' ? '<span class=\'px-2 py-1 bg-green-100 text-green-700 rounded text-xs\'>Paid</span>' : '<span class=\'px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs\'>Unpaid</span>'}</td><td class="py-2 px-4">${p.accommodation}</td><td class="py-2 px-4"><button class='py-1 px-3 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs'>View</button></td></tr>`).join('')}</tbody></table></div></div>`;
    } catch (error) {
        participantsSection.innerHTML = `<div class="glass p-8 mb-8"><h2 class="text-2xl font-bold text-indigo-800 mb-4">Participants</h2><div class="error-message">${error.message}</div></div>`;
    }
}

// Helper functions for authentication
function getAuthToken() {
    return localStorage.getItem('token');
}

function getCurrentUserId() {
    const user = JSON.parse(localStorage.getItem('user'));
    return user ? user.user_id : null;
}

// ... more sections as needed ... 