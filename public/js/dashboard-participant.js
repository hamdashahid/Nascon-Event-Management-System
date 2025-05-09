// dashboard-participant.js

// Wait for auth to be available
function waitForAuth() {
    return new Promise((resolve) => {
        if (window.auth) {
            resolve();
        } else {
            const checkAuth = setInterval(() => {
                if (window.auth) {
                    clearInterval(checkAuth);
                    resolve();
                }
            }, 100);
        }
    });
}

// Initialize dashboard
async function initDashboard() {
    await waitForAuth();

    // Check if user is logged in
    const user = auth.getCurrentUser();
    if (!user) {
        window.location.href = '/pages/login.html';
        return;
    }

    // Initialize sections
    const sections = {
        overviewSection: document.getElementById('overviewSection'),
        eventsSection: document.getElementById('eventsSection'),
        registerSection: document.getElementById('registerSection'),
        accommodationSection: document.getElementById('accommodationSection'),
        paymentsSection: document.getElementById('paymentsSection'),
        profileSection: document.getElementById('profileSection'),
        teamsSection: document.getElementById('teamsSection'),
        roundsSection: document.getElementById('roundsSection'),
        venuesSection: document.getElementById('venuesSection')
    };

    // Show section function
    window.showSection = (sectionId) => {
        Object.values(sections).forEach(section => {
            if (section) section.style.display = 'none';
        });
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.display = 'block';
            // Load section data
            switch (sectionId) {
                case 'overviewSection':
                    loadParticipantOverview(user);
                    break;
                case 'eventsSection':
                    loadMyEventsSection(user, localStorage.getItem('token'));
                    break;
                case 'registerSection':
                    loadRegisterEventsSection(user, localStorage.getItem('token'));
                    break;
                case 'accommodationSection':
                    loadAccommodationStatus(user);
                    loadAvailableAccommodations();
                    break;
                case 'paymentsSection':
                    loadPaymentHistory(user);
                    break;
                case 'profileSection':
                    loadMyProfileSection(user, localStorage.getItem('token'));
                    break;
                case 'teamsSection':
                    loadTeams();
                    break;
                case 'roundsSection':
                    loadRounds();
                    break;
                case 'venuesSection':
                    loadVenues();
                    break;
            }
        }
    };

    // Show overview section by default
    showSection('overviewSection');

    // Add navigation event listeners
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.getAttribute('data-section');
            if (sectionId) {
                showSection(sectionId);
            }
        });
    });

    // Add logout event listener
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        auth.logoutUser();
        window.location.href = '/pages/login.html';
    });

    // Load initial data
    loadEvents();
    loadUsers();

    // Add event listeners
    document.getElementById('teamRegistrationForm')?.addEventListener('submit', handleTeamRegistration);
    document.getElementById('eventSelect')?.addEventListener('change', loadTeams);
    document.getElementById('roundsEventSelect')?.addEventListener('change', loadRounds);

    // Add accommodation request form handler
    const accommodationRequestForm = document.getElementById('accommodationRequestForm');
    if (accommodationRequestForm) {
        accommodationRequestForm.addEventListener('submit', handleAccommodationRequest);
    }
}

// Start initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', initDashboard);

// --- Dynamic Participant Overview Section ---
async function loadParticipantOverview(user) {
    const overviewSection = document.getElementById('overviewSection');
    if (!overviewSection) return;
    overviewSection.innerHTML = `
    <div class="glass p-8 mb-8 flex flex-col items-center text-center">
        <h2 class="text-3xl md:text-4xl font-extrabold text-indigo-900 mb-2 flex items-center gap-2">
            <i class="fas fa-user-graduate text-indigo-500"></i> Welcome, <span id="participantName">${user.name}</span>!
        </h2>
        <p class="text-gray-600 mb-6 text-lg">Here's a quick overview of your NASCON participation.</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 w-full mt-4 justify-center">
            <div class="bg-gradient-to-br from-indigo-100 to-white rounded-xl shadow p-6 flex flex-col items-center stat-card hover:shadow-lg transition group">
                <div class="text-indigo-600 text-4xl mb-2"><i class="fas fa-calendar-check"></i></div>
                <div class="text-3xl font-bold" id="registeredEventsCount">...</div>
                <div class="text-gray-700 font-semibold">Registered Events</div>
                <div class="text-xs text-gray-400 mt-1">Events you are participating in</div>
            </div>
            <div class="bg-gradient-to-br from-green-100 to-white rounded-xl shadow p-6 flex flex-col items-center stat-card hover:shadow-lg transition group" id="accommodationOverviewCard">
                <div class="text-green-600 text-4xl mb-2"><i class="fas fa-bed"></i></div>
                <div class="text-3xl font-bold" id="accommodationStatus">...</div>
                <div class="text-gray-700 font-semibold">Accommodation</div>
                <div class="text-xs text-gray-400 mt-1">Your room booking status</div>
                <div id="accommodationDetails" class="mt-2 w-full"></div>
            </div>
            <div class="bg-gradient-to-br from-yellow-100 to-white rounded-xl shadow p-6 flex flex-col items-center stat-card hover:shadow-lg transition group">
                <div class="text-yellow-600 text-4xl mb-2"><i class="fas fa-credit-card"></i></div>
                <div class="text-3xl font-bold" id="paymentStatus">...</div>
                <div class="text-gray-700 font-semibold">Payment Status</div>
                <div class="text-xs text-gray-400 mt-1">Your registration/accommodation payments</div>
            </div>
        </div>
    </div>`;
    try {
        const [eventsRes, accommodationRes, paymentsRes] = await Promise.all([
            fetch(`/api/users/${user.user_id}/events`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }),
            fetch(`/api/accommodations/user/${user.user_id}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }),
            fetch(`/api/users/${user.user_id}/payments`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
        ]);
        let eventsCount = '0';
        if (eventsRes.ok) {
            const events = await eventsRes.json();
            eventsCount = Array.isArray(events) ? events.length : '0';
        }
        document.getElementById('registeredEventsCount').textContent = eventsCount;
        let accommodationText = 'Not Assigned';
        let accommodationDetails = '';
        if (accommodationRes.ok) {
            const accommodation = await accommodationRes.json();
            if (accommodation && accommodation.accommodation_id) {
                accommodationText = 'Assigned';
                accommodationDetails = `
                    <div class='text-sm text-gray-700 mt-2'>
                        <div><span class='font-semibold'>Room Type:</span> ${accommodation.room_type}</div>
                        <div><span class='font-semibold'>Capacity:</span> ${accommodation.capacity}</div>
                        <div><span class='font-semibold'>Price per night:</span> Rs. ${accommodation.price_per_night}</div>
                        <div><span class='font-semibold'>Available Rooms:</span> ${accommodation.available_rooms}</div>
                    </div>
                `;
            }
        }
        document.getElementById('accommodationStatus').textContent = accommodationText;
        document.getElementById('accommodationDetails').innerHTML = accommodationDetails;
        let paymentText = 'Unpaid';
        if (paymentsRes.ok) {
            const payments = await paymentsRes.json();
            if (Array.isArray(payments) && payments.length > 0) {
                const paid = payments.find(p => p.status && p.status.toLowerCase().includes('paid'));
                paymentText = paid ? 'Paid' : (payments[0].status || 'Unpaid');
            }
        }
        document.getElementById('paymentStatus').textContent = paymentText;
    } catch (error) {
        document.getElementById('registeredEventsCount').textContent = '0';
        document.getElementById('accommodationStatus').textContent = 'Not Assigned';
        document.getElementById('accommodationDetails').innerHTML = '';
        document.getElementById('paymentStatus').textContent = 'Unpaid';
    }
}

// --- My Events Section ---
async function loadMyEventsSection(user, token) {
    const eventsSection = document.getElementById('eventsSection');
    if (!eventsSection) return;
    eventsSection.innerHTML = `<div class="glass p-8 mb-8 flex flex-col items-center text-center">
        <h2 class="text-3xl font-bold text-indigo-900 mb-2 flex items-center gap-2"><i class="fas fa-calendar-check text-indigo-500"></i> My Registered Events</h2>
        <div class="loading">Loading your events...</div>
    </div>`;
    try {
        const response = await fetch(`/api/users/${user.user_id}/events`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to load your events');
        const events = await response.json();
        if (!Array.isArray(events) || events.length === 0) {
            eventsSection.innerHTML = `<div class="glass p-8 mb-8 flex flex-col items-center justify-center"><span class='text-5xl text-indigo-300 mb-4'><i class="fas fa-calendar-times"></i></span><h2 class="text-2xl font-bold text-indigo-800 mb-2">My Registered Events</h2><div class="empty-state text-gray-500">You have not registered for any events yet.</div></div>`;
            return;
        }
        eventsSection.innerHTML = `<div class="glass p-8 mb-8 flex flex-col items-center text-center"><h2 class="text-3xl font-bold text-indigo-900 mb-4 flex items-center gap-2"><i class="fas fa-calendar-check text-indigo-500"></i> My Registered Events</h2><div class="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mt-4 justify-center">${events.map(event => `
            <div class="bg-gradient-to-br from-indigo-50 to-white rounded-xl shadow p-6 flex flex-col stat-card hover:shadow-lg transition group border border-indigo-100">
                <div class="flex items-center gap-2 mb-2">
                    <span class="text-indigo-600 text-2xl"><i class="fas fa-calendar-check"></i></span>
                    <span class="font-semibold text-lg">${event.event_name}</span>
                </div>
                <div class="flex gap-2 items-center mb-1">
                    <span class="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs flex items-center gap-1"><i class="fas fa-clock"></i> ${event.event_date ? new Date(event.event_date).toLocaleDateString() : '-'}</span>
                    <span class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs flex items-center gap-1"><i class="fas fa-map-marker-alt"></i> ${event.venue_name || 'TBD'}</span>
                </div>
            </div>
        `).join('')}</div></div>`;
    } catch (error) {
        eventsSection.innerHTML = `<div class="glass p-8 mb-8"><h2 class="text-2xl font-bold text-indigo-800 mb-4">My Registered Events</h2><div class="error-message">${error.message}</div></div>`;
    }
}

// --- Profile Section ---
async function loadMyProfileSection(user, token) {
    const profileSection = document.getElementById('profileSection');
    if (!profileSection) return;
    profileSection.innerHTML = `<div class="glass p-8 mb-8 flex flex-col items-center text-center"><h2 class="text-3xl font-bold text-indigo-900 mb-4 flex items-center gap-2"><i class="fas fa-user text-indigo-500"></i> My Profile</h2><div class="loading">Loading profile...</div></div>`;
    try {
        const response = await fetch('/api/users/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to load profile');
        const profile = await response.json();
        profileSection.innerHTML = `<div class="glass p-8 mb-8 flex flex-col items-center text-center"><h2 class="text-3xl font-bold text-indigo-900 mb-4 flex items-center gap-2"><i class="fas fa-user text-indigo-500"></i> My Profile</h2><div class="bg-gradient-to-br from-indigo-50 to-white rounded-xl shadow p-6 flex flex-col stat-card border border-indigo-100 items-center"><div class="flex items-center gap-2 mb-2"><span class="text-indigo-600 text-2xl"><i class="fas fa-user"></i></span><span class="font-semibold text-lg">${profile.name}</span></div><div class="text-gray-600 text-sm">Email: ${profile.email}</div><div class="text-gray-600 text-sm">Role: ${profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}</div></div></div>`;
    } catch (error) {
        profileSection.innerHTML = `<div class="glass p-8 mb-8 flex flex-col items-center text-center"><h2 class="text-3xl font-bold text-indigo-900 mb-4 flex items-center gap-2"><i class="fas fa-user text-indigo-500"></i> My Profile</h2><div class="error-message">${error.message}</div></div>`;
    }
}

// --- Register for Events Section ---
async function loadRegisterEventsSection(user, token) {
    const registerSection = document.getElementById('registerSection');
    if (!registerSection) return;
    registerSection.innerHTML = `<div class="glass p-8 mb-8 flex flex-col items-center text-center"><h2 class="text-3xl font-bold text-indigo-900 mb-4 flex items-center gap-2"><i class="fas fa-plus-circle text-indigo-500"></i> Register for New Events</h2><div class="loading">Loading available events...</div></div>`;
    try {
        // Fetch all events
        const eventsRes = await fetch('/api/events', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!eventsRes.ok) throw new Error('Failed to load events');
        const allEvents = await eventsRes.json();
        // Fetch user's registered events
        const myEventsRes = await fetch(`/api/users/${user.user_id}/events`, { headers: { 'Authorization': `Bearer ${token}` } });
        const myEvents = myEventsRes.ok ? await myEventsRes.json() : [];
        const registeredEventIds = new Set(myEvents.map(e => e.event_id));
        registerSection.innerHTML = `<div class="glass p-8 mb-8 flex flex-col items-center text-center"><h2 class="text-3xl font-bold text-indigo-900 mb-4 flex items-center gap-2"><i class="fas fa-plus-circle text-indigo-500"></i> Register for New Events</h2><p class="text-gray-700 mb-4">Browse and register for available events below.</p><div class="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mt-4 justify-center">${allEvents.map(event => {
            const isRegistered = registeredEventIds.has(event.event_id);
            return `<div class="bg-gradient-to-br from-indigo-50 to-white rounded-xl shadow p-6 flex flex-col stat-card hover:shadow-lg transition group border border-indigo-100">
                <div class="flex items-center gap-2 mb-2">
                    <span class="text-indigo-600"><i class="fas fa-lightbulb"></i></span>
                    <span class="font-semibold">${event.event_name}</span>
                    ${isRegistered ? `<span class=\"ml-auto px-2 py-1 bg-green-100 text-green-700 rounded text-xs\">Registered</span>` : ''}
                </div>
                <div class="text-gray-600 text-sm">Date: ${event.event_date ? new Date(event.event_date).toLocaleDateString() : '-'}</div>
                <div class="text-gray-600 text-sm">Venue: ${event.venue_name || 'TBD'}</div>
                <div class="text-gray-600 text-sm">Registration Fee: <span class='font-bold'>Rs. ${event.registration_fee || 0}</span></div>
                <button class="mt-2 py-2 px-4 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition register-btn" data-event-id="${event.event_id}" ${isRegistered ? 'disabled' : ''}>${isRegistered ? 'Registered' : 'Register'}</button>
            </div>`;
        }).join('')}</div></div>`;
        // Attach event listeners to register buttons
        registerSection.querySelectorAll('.register-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const eventId = btn.getAttribute('data-event-id');
                btn.disabled = true;
                btn.textContent = 'Registering...';
                try {
                    const event = allEvents.find(ev => ev.event_id == eventId);
                    // Register for event
                    const res = await fetch(`/api/events/${eventId}/register`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!res.ok) {
                        const errData = await res.json().catch(() => ({}));
                        throw new Error(errData.error || 'Failed to register for event');
                    }
                    btn.textContent = 'Registered';
                    btn.classList.add('bg-green-100', 'text-green-700');
                } catch (err) {
                    btn.disabled = false;
                    btn.textContent = 'Register';
                    alert(err.message);
                }
            });
        });
    } catch (error) {
        registerSection.innerHTML = `<div class="glass p-8 mb-8 flex flex-col items-center text-center"><h2 class="text-3xl font-bold text-indigo-900 mb-4 flex items-center gap-2"><i class="fas fa-plus-circle text-indigo-500"></i> Register for New Events</h2><div class="error-message">${error.message}</div></div>`;
    }
}

// --- Payments Section ---
async function loadMyPaymentsSection(user, token) {
    const paymentsSection = document.getElementById('paymentsSection');
    if (!paymentsSection) return;
    paymentsSection.innerHTML = `<div class="glass p-8 mb-8 flex flex-col items-center text-center"><h2 class="text-3xl font-bold text-indigo-900 mb-4 flex items-center gap-2"><i class="fas fa-credit-card text-yellow-500"></i> My Payments</h2><div class="loading">Loading payment history...</div></div>`;
    try {
        const response = await fetch(`/api/users/${user.user_id}/payments`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to load payments');
        const payments = await response.json();
        if (!Array.isArray(payments) || payments.length === 0) {
            paymentsSection.innerHTML = `<div class="glass p-8 mb-8 flex flex-col items-center justify-center"><span class='text-5xl text-indigo-300 mb-4'><i class="fas fa-money-check-alt"></i></span><h2 class="text-2xl font-bold text-indigo-800 mb-2">My Payments</h2><div class="empty-state text-gray-500">No payments found.</div></div>`;
            return;
        }
        // Calculate total paid
        const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
        // Enhanced card layout for each payment
        paymentsSection.innerHTML = `
            <div class="glass p-8 mb-8 flex flex-col items-center text-center">
                <h2 class="text-3xl font-bold text-indigo-900 mb-4 flex items-center gap-2"><i class="fas fa-credit-card text-yellow-500"></i> My Payments</h2>
                <div class="mb-6 flex items-center gap-4 justify-center">
                    <span class="text-lg font-semibold text-green-700 flex items-center gap-2"><i class="fas fa-wallet"></i> Total Paid: <span class="ml-1">Rs. ${totalPaid}</span></span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mt-4 justify-center">
                    ${payments.map(payment => `
                        <div class="bg-gradient-to-br from-yellow-50 to-white rounded-xl shadow p-6 flex flex-col stat-card hover:shadow-lg transition group border border-yellow-100">
                            <div class="flex items-center gap-2 mb-2">
                                <span class="text-yellow-600 text-2xl"><i class="fas fa-receipt"></i></span>
                                <span class="font-semibold text-lg capitalize">${payment.payment_type}</span>
                                <span class="ml-auto px-2 py-1 bg-green-100 text-green-700 rounded text-xs flex items-center gap-1"><i class="fas fa-check-circle"></i> Paid</span>
                            </div>
                            <div class="text-gray-600 text-sm">Amount: <span class="font-bold">Rs. ${payment.amount}</span></div>
                            <div class="text-gray-600 text-sm">Date: ${payment.payment_date ? new Date(payment.payment_date).toLocaleString() : '-'}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } catch (error) {
        paymentsSection.innerHTML = `<div class="glass p-8 mb-8 flex flex-col items-center text-center"><h2 class="text-3xl font-bold text-indigo-900 mb-4 flex items-center gap-2"><i class="fas fa-credit-card text-yellow-500"></i> My Payments</h2><div class="error-message">${error.message}</div></div>`;
    }
}

// --- Accommodations Section ---
async function loadAccommodationsSection(user, token) {
    const accommodationSection = document.getElementById('accommodationSection');
    if (!accommodationSection) return;
    // Check if user is registered for at least one event
    let hasEvent = false;
    try {
        const myEventsRes = await fetch(`/api/users/${user.user_id}/events`, { headers: { 'Authorization': `Bearer ${token}` } });
        const myEvents = myEventsRes.ok ? await myEventsRes.json() : [];
        hasEvent = Array.isArray(myEvents) && myEvents.length > 0;
    } catch { }
    if (!hasEvent) {
        accommodationSection.innerHTML = `<div class="glass p-8 mb-8 flex flex-col items-center justify-center"><span class='text-5xl text-indigo-300 mb-4'><i class="fas fa-bed"></i></span><h2 class="text-2xl font-bold text-indigo-800 mb-2">Accommodation</h2><div class="empty-state text-gray-500">You must register for at least one event before booking accommodation.</div></div>`;
        return;
    }
    // Check if user already booked accommodation
    let bookedAccommodation = null;
    try {
        const bookedRes = await fetch(`/api/accommodations/user/${user.user_id}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (bookedRes.ok) {
            bookedAccommodation = await bookedRes.json();
        }
    } catch { }
    if (bookedAccommodation && bookedAccommodation.accommodation_id) {
        accommodationSection.innerHTML = `<div class="glass p-8 mb-8 flex flex-col items-center justify-center"><span class='text-5xl text-green-400 mb-4'><i class="fas fa-check-circle"></i></span><h2 class="text-2xl font-bold text-indigo-800 mb-2">Accommodation Booked</h2><div class="text-green-700 font-semibold mb-2">You have already booked accommodation.</div><div class="bg-gradient-to-br from-green-50 to-white rounded-xl shadow p-6 flex flex-col stat-card border border-green-100 mt-4"><div class="flex items-center gap-2 mb-2"><span class="text-indigo-600 text-2xl"><i class="fas fa-bed"></i></span><span class="font-semibold text-lg">${bookedAccommodation.room_type}</span></div><div class="text-gray-600 text-sm">Capacity: ${bookedAccommodation.capacity}</div><div class="text-gray-600 text-sm">Price per night: Rs. ${bookedAccommodation.price_per_night}</div><div class="text-gray-600 text-sm">Available Rooms: ${bookedAccommodation.available_rooms}</div></div></div>`;
        return;
    }
    // Fetch available accommodation types
    accommodationSection.innerHTML = `<div class="glass p-8 mb-8 flex flex-col items-center text-center"><h2 class="text-3xl font-bold text-indigo-900 mb-4 flex items-center gap-2"><i class="fas fa-bed text-green-500"></i> Available Accommodations</h2><div class="loading">Loading accommodation types...</div></div>`;
    try {
        const response = await fetch('/api/accommodations', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) throw new Error('Failed to load accommodations');
        const accommodations = await response.json();
        if (!Array.isArray(accommodations) || accommodations.length === 0) {
            accommodationSection.innerHTML = `<div class="glass p-8 mb-8 flex flex-col items-center justify-center"><span class='text-5xl text-indigo-300 mb-4'><i class="fas fa-bed"></i></span><h2 class="text-2xl font-bold text-indigo-800 mb-2">Available Accommodations</h2><div class="empty-state text-gray-500">No accommodation types found.</div></div>`;
            return;
        }
        // Show available accommodation types and a Book button
        accommodationSection.innerHTML = `<div class="glass p-8 mb-8 flex flex-col items-center text-center"><h2 class="text-3xl font-bold text-indigo-900 mb-4 flex items-center gap-2"><i class="fas fa-bed text-green-500"></i> Available Accommodations</h2><div class="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mt-4 justify-center">${accommodations.map(a => `
            <div class="bg-gradient-to-br from-green-50 to-white rounded-xl shadow p-6 flex flex-col stat-card border border-green-100 hover:shadow-lg transition group">
                <div class="flex items-center gap-2 mb-2">
                    <span class="text-green-600 text-2xl"><i class="fas fa-bed"></i></span>
                    <span class="font-semibold text-lg">${a.room_type}</span>
                </div>
                <div class="text-gray-600 text-sm">Capacity: ${a.capacity}</div>
                <div class="text-gray-600 text-sm">Price per night: Rs. ${a.price_per_night}</div>
                <div class="text-gray-600 text-sm">Available Rooms: ${a.available_rooms}</div>
                <button class="mt-2 py-2 px-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition book-accommodation-btn" data-id="${a.accommodation_id}" data-fee="${a.price_per_night}">Book & Pay</button>
            </div>
        `).join('')}</div></div>`;
        // Attach event listeners to book buttons
        accommodationSection.querySelectorAll('.book-accommodation-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                btn.disabled = true;
                btn.textContent = 'Processing...';
                try {
                    const fee = btn.getAttribute('data-fee');
                    const accommodationId = btn.getAttribute('data-id');
                    // Create payment
                    await fetch('/api/payments', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ user_id: user.user_id, amount: fee, payment_type: 'accommodation', status: 'completed' })
                    });
                    // Book accommodation
                    await fetch('/api/accommodations/book', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ user_id: user.user_id, accommodation_id: accommodationId })
                    });
                    btn.textContent = 'Booked';
                    btn.classList.add('bg-green-100', 'text-green-700');
                    loadAccommodationsSection(user, token); // Refresh to show details
                } catch (err) {
                    btn.disabled = false;
                    btn.textContent = 'Book & Pay';
                    alert('Failed to book accommodation.');
                }
            });
        });
    } catch (error) {
        accommodationSection.innerHTML = `<div class="glass p-8 mb-8 flex flex-col items-center text-center"><h2 class="text-3xl font-bold text-indigo-900 mb-4 flex items-center gap-2"><i class="fas fa-bed text-green-500"></i> Available Accommodations</h2><div class="error-message">${error.message}</div></div>`;
    }
}

window.logout = function () {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '../index.html';
};

// Team Registration Functions
async function loadEvents() {
    try {
        const response = await fetch('/api/events');
        const events = await response.json();

        const eventSelect = document.getElementById('eventSelect');
        const roundsEventSelect = document.getElementById('roundsEventSelect');

        events.forEach(event => {
            const option = new Option(event.event_name, event.event_id);
            eventSelect.add(option);
            roundsEventSelect.add(new Option(event.event_name, event.event_id));
        });
    } catch (error) {
        console.error('Error loading events:', error);
        showNotification('Failed to load events', 'error');
    }
}

async function loadUsers() {
    try {
        const response = await fetch('/api/users');
        const users = await response.json();

        const teamMembersSelect = document.getElementById('teamMembers');
        users.forEach(user => {
            teamMembersSelect.add(new Option(user.name, user.user_id));
        });
    } catch (error) {
        console.error('Error loading users:', error);
        showNotification('Failed to load users', 'error');
    }
}

async function loadTeams() {
    try {
        const eventId = document.getElementById('eventSelect').value;
        if (!eventId) return;

        const response = await fetch(`/api/teams/event/${eventId}`);
        const teams = await response.json();

        const teamsList = document.getElementById('teamsList');
        teamsList.innerHTML = teams.map(team => `
            <div class="bg-gray-50 rounded-lg p-4">
                <div class="flex items-center justify-between mb-2">
                    <h4 class="font-semibold text-indigo-700">${team.team_name}</h4>
                    <span class="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                        ${team.team_size} Members
                    </span>
                </div>
                <p class="text-gray-600 text-sm">Members: ${team.team_members}</p>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading teams:', error);
        showNotification('Failed to load teams', 'error');
    }
}

async function handleTeamRegistration(event) {
    event.preventDefault();

    const teamName = document.getElementById('teamName').value;
    const eventId = document.getElementById('eventSelect').value;
    const teamMembers = Array.from(document.getElementById('teamMembers').selectedOptions)
        .map(option => option.value);

    try {
        const response = await fetch('/api/teams/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                teamName,
                eventId,
                teamMembers
            })
        });

        if (response.ok) {
            showNotification('Team registered successfully', 'success');
            document.getElementById('teamRegistrationForm').reset();
            loadTeams();
        } else {
            const error = await response.json();
            throw new Error(error.message);
        }
    } catch (error) {
        console.error('Error registering team:', error);
        showNotification(error.message || 'Failed to register team', 'error');
    }
}

// Event Rounds Functions
async function loadRounds() {
    try {
        const eventId = document.getElementById('roundsEventSelect').value;
        if (!eventId) return;

        const response = await fetch(`/api/rounds/event/${eventId}`);
        const rounds = await response.json();

        const roundsList = document.getElementById('roundsList');
        roundsList.innerHTML = rounds.map(round => `
            <div class="bg-gray-50 rounded-lg p-4">
                <div class="flex items-center justify-between mb-2">
                    <h4 class="font-semibold text-indigo-700">${round.round_type}</h4>
                    <span class="px-2 py-1 ${round.status === 'Scheduled' ? 'bg-blue-100 text-blue-700' :
                round.status === 'In Progress' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
            } rounded text-xs">
                        ${round.status}
                    </span>
                </div>
                <p class="text-gray-600 text-sm">Date: ${new Date(round.round_date).toLocaleDateString()}</p>
                <p class="text-gray-600 text-sm">Venue: ${round.venue_name}</p>
                <p class="text-gray-600 text-sm">Participants: ${round.registered_participants}/${round.max_participants}</p>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading rounds:', error);
        showNotification('Failed to load rounds', 'error');
    }
}

// Venue Schedule Functions
async function loadVenues() {
    try {
        const response = await fetch('/api/venues');
        const venues = await response.json();

        const venueSelect = document.getElementById('venueSelect');
        venues.forEach(venue => {
            venueSelect.add(new Option(venue.venue_name, venue.venue_id));
        });
    } catch (error) {
        console.error('Error loading venues:', error);
        showNotification('Failed to load venues', 'error');
    }
}

async function generateVenueSchedule() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (!startDate || !endDate) {
        showNotification('Please select both start and end dates', 'error');
        return;
    }

    try {
        const response = await fetch(`/api/venues/schedule?start=${startDate}&end=${endDate}`);
        const schedule = await response.json();

        const scheduleReport = document.getElementById('scheduleReport');
        scheduleReport.innerHTML = schedule.map(venue => `
            <div class="bg-gray-50 rounded-lg p-4">
                <div class="flex items-center justify-between mb-2">
                    <h4 class="font-semibold text-indigo-700">${venue.venue_name}</h4>
                    <span class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                        ${venue.available_slots} Available Slots
                    </span>
                </div>
                <div class="space-y-2">
                    ${venue.events.map(event => `
                        <div class="flex items-center justify-between text-sm">
                            <span class="text-gray-600">${event.event_name}</span>
                            <span class="text-gray-500">${new Date(event.event_date).toLocaleDateString()}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error generating schedule:', error);
        showNotification('Failed to generate schedule', 'error');
    }
}

async function checkVenueAvailability() {
    const venueId = document.getElementById('venueSelect').value;
    const date = document.getElementById('venueDate').value;

    if (!venueId || !date) {
        showNotification('Please select both venue and date', 'error');
        return;
    }

    try {
        const response = await fetch(`/api/venues/${venueId}/availability?date=${date}`);
        const availability = await response.json();

        const scheduleReport = document.getElementById('scheduleReport');
        scheduleReport.innerHTML = `
            <div class="bg-gray-50 rounded-lg p-4">
                <div class="flex items-center justify-between mb-2">
                    <h4 class="font-semibold text-indigo-700">${availability.venue_name}</h4>
                    <span class="px-2 py-1 ${availability.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} rounded text-xs">
                        ${availability.is_available ? 'Available' : 'Not Available'}
                    </span>
                </div>
                ${availability.events ? `
                    <div class="mt-2">
                        <p class="text-gray-600 text-sm">Scheduled Events:</p>
                        <div class="space-y-2 mt-1">
                            ${availability.events.map(event => `
                                <div class="flex items-center justify-between text-sm">
                                    <span class="text-gray-600">${event.event_name}</span>
                                    <span class="text-gray-500">${event.start_time} - ${event.end_time}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    } catch (error) {
        console.error('Error checking availability:', error);
        showNotification('Failed to check availability', 'error');
    }
}

// Helper function for notifications
function showNotification(message, type = 'info') {
    // You can implement this based on your preferred notification system
    alert(message);
}

// Accommodation Functions
async function loadAccommodationStatus(user) {
    try {
        const accommodation = await auth.authenticatedFetch(`/api/accommodations/user/${user.user_id}`);
        const accommodationStatus = document.getElementById('accommodationStatus');

        if (accommodation && accommodation.accommodation_id) {
            accommodationStatus.innerHTML = `
                <div class="bg-green-50 rounded-lg p-4">
                    <div class="flex items-center justify-between mb-2">
                        <h4 class="font-semibold text-green-700">Accommodation Assigned</h4>
                        <span class="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Confirmed</span>
                    </div>
                    <div class="space-y-2">
                        <p class="text-gray-600">Room Type: ${accommodation.room_type}</p>
                        <p class="text-gray-600">Price per Night: Rs. ${accommodation.price_per_night}</p>
                        <p class="text-gray-600">Booked on: ${new Date(accommodation.booked_at).toLocaleDateString()}</p>
                    </div>
                </div>
            `;
        } else {
            accommodationStatus.innerHTML = `
                <div class="bg-yellow-50 rounded-lg p-4">
                    <div class="flex items-center justify-between mb-2">
                        <h4 class="font-semibold text-yellow-700">No Accommodation Assigned</h4>
                        <span class="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">Pending</span>
                    </div>
                    <p class="text-gray-600">You haven't booked any accommodation yet.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading accommodation status:', error);
        const accommodationStatus = document.getElementById('accommodationStatus');
        accommodationStatus.innerHTML = `
            <div class="bg-red-50 rounded-lg p-4">
                <div class="flex items-center justify-between mb-2">
                    <h4 class="font-semibold text-red-700">Error</h4>
                    <span class="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">Failed</span>
                </div>
                <p class="text-gray-600">Failed to load accommodation status.</p>
            </div>
        `;
    }
}

async function loadAvailableAccommodations() {
    try {
        const accommodations = await auth.authenticatedFetch('/api/accommodations/available');
        const accommodationsList = document.getElementById('availableAccommodations');

        if (!accommodations || accommodations.length === 0) {
            accommodationsList.innerHTML = `
                <div class="text-center text-gray-500 py-4">
                    No accommodations available at the moment.
                </div>
            `;
            return;
        }

        accommodationsList.innerHTML = accommodations.map(acc => `
            <div class="glass p-4 mb-4">
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="text-lg font-semibold text-indigo-800">${acc.room_type}</h3>
                        <p class="text-gray-600">Capacity: ${acc.capacity} people</p>
                        <p class="text-gray-600">Available Rooms: ${acc.remaining_rooms}</p>
                        <p class="text-indigo-600 font-semibold">Rs. ${acc.price_per_night} per night</p>
                    </div>
                    <button 
                        class="book-accommodation-btn px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                        data-id="${acc.accommodation_id}"
                        data-fee="${acc.price_per_night}"
                    >
                        Book & Pay
                    </button>
                </div>
            </div>
        `).join('');

        // Attach event listeners to book buttons
        accommodationsList.querySelectorAll('.book-accommodation-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                btn.disabled = true;
                btn.textContent = 'Processing...';
                try {
                    const accommodationId = btn.getAttribute('data-id');
                    const fee = btn.getAttribute('data-fee');
                    const user = auth.getCurrentUser();

                    // Create payment
                    await auth.authenticatedFetch('/api/payments', {
                        method: 'POST',
                        body: JSON.stringify({
                            user_id: user.user_id,
                            amount: fee,
                            payment_type: 'accommodation',
                            status: 'completed'
                        })
                    });

                    // Book accommodation
                    await auth.authenticatedFetch(`/api/accommodations/${accommodationId}/book`, {
                        method: 'POST',
                        body: JSON.stringify({ user_id: user.user_id })
                    });

                    btn.textContent = 'Booked';
                    btn.classList.add('bg-green-100', 'text-green-700');
                    loadAccommodationStatus(user);
                    loadAvailableAccommodations();
                } catch (err) {
                    btn.disabled = false;
                    btn.textContent = 'Book & Pay';
                    alert('Failed to book accommodation.');
                }
            });
        });
    } catch (error) {
        console.error('Error loading available accommodations:', error);
        const accommodationsList = document.getElementById('availableAccommodations');
        accommodationsList.innerHTML = `
            <div class="text-center text-red-500 py-4">
                Failed to load accommodations. Please try again later.
            </div>
        `;
    }
}

async function handleAccommodationRequest(event) {
    event.preventDefault();

    const numPeople = document.getElementById('numPeople').value;
    const budget = document.getElementById('budget').value;
    const checkInDate = document.getElementById('checkInDate').value;
    const checkOutDate = document.getElementById('checkOutDate').value;
    const specialRequirements = document.getElementById('specialRequirements').value;

    try {
        const response = await fetch('/api/accommodations/request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                num_people: numPeople,
                budget: budget,
                check_in_date: checkInDate,
                check_out_date: checkOutDate,
                special_requirements: specialRequirements
            })
        });

        if (response.ok) {
            showNotification('Accommodation request submitted successfully', 'success');
            document.getElementById('accommodationRequestForm').reset();
            loadAccommodationStatus(JSON.parse(localStorage.getItem('user')));
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Failed to submit accommodation request');
        }
    } catch (error) {
        console.error('Error submitting accommodation request:', error);
        showNotification(error.message || 'Failed to submit accommodation request', 'error');
    }
}

// Payment Functions
function showOnlinePaymentModal() {
    const modal = document.getElementById('onlinePaymentModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    // Get the registration fee from the selected event
    const eventSelect = document.getElementById('eventSelect');
    const selectedEvent = eventSelect.options[eventSelect.selectedIndex];
    const registrationFee = selectedEvent ? selectedEvent.dataset.fee : 0;

    document.getElementById('paymentAmount').value = registrationFee;
}

function hideOnlinePaymentModal() {
    const modal = document.getElementById('onlinePaymentModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function showManualPaymentModal() {
    const modal = document.getElementById('manualPaymentModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    // Get the registration fee from the selected event
    const eventSelect = document.getElementById('eventSelect');
    const selectedEvent = eventSelect.options[eventSelect.selectedIndex];
    const registrationFee = selectedEvent ? selectedEvent.dataset.fee : 0;

    document.getElementById('manualPaymentAmount').value = registrationFee;
}

function hideManualPaymentModal() {
    const modal = document.getElementById('manualPaymentModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

async function handleOnlinePayment(event) {
    event.preventDefault();

    const cardNumber = document.getElementById('cardNumber').value;
    const expiryDate = document.getElementById('expiryDate').value;
    const cvv = document.getElementById('cvv').value;
    const amount = document.getElementById('paymentAmount').value;

    try {
        // In a real application, you would integrate with a payment gateway here
        // For now, we'll simulate a successful payment
        const response = await fetch('/api/payments/online', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                card_number: cardNumber,
                expiry_date: expiryDate,
                cvv: cvv,
                amount: amount,
                payment_type: 'registration'
            })
        });

        if (response.ok) {
            showNotification('Payment successful!', 'success');
            hideOnlinePaymentModal();
            loadPaymentHistory();
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Payment failed');
        }
    } catch (error) {
        showNotification(error.message || 'Payment failed', 'error');
    }
}

async function requestManualPayment() {
    const amount = document.getElementById('manualPaymentAmount').value;

    try {
        const response = await fetch('/api/payments/manual', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                amount: amount,
                payment_type: 'registration',
                status: 'pending'
            })
        });

        if (response.ok) {
            showNotification('Manual payment request submitted successfully', 'success');
            hideManualPaymentModal();
            loadPaymentHistory();
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Failed to submit manual payment request');
        }
    } catch (error) {
        showNotification(error.message || 'Failed to submit manual payment request', 'error');
    }
}

// Payment Receipt Generation
async function generatePaymentReceipt(paymentId) {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        const token = localStorage.getItem('token');

        const response = await fetch(`/api/payments/${paymentId}/receipt`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to generate receipt');

        const receipt = await response.json();

        // Create receipt content
        const receiptContent = `
            <div class="bg-white p-8 rounded-lg shadow-lg max-w-2xl mx-auto">
                <div class="text-center mb-6">
                    <h2 class="text-2xl font-bold text-indigo-800">Payment Receipt</h2>
                    <p class="text-gray-600">NASCON Event Management System</p>
                </div>
                
                <div class="border-t border-b border-gray-200 py-4 mb-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <p class="text-gray-600">Receipt No:</p>
                            <p class="font-semibold">${receipt.receipt_id}</p>
                        </div>
                        <div>
                            <p class="text-gray-600">Date:</p>
                            <p class="font-semibold">${new Date(receipt.payment_date).toLocaleString()}</p>
                        </div>
                    </div>
                </div>
                
                <div class="mb-6">
                    <h3 class="font-semibold text-lg mb-2">Payment Details</h3>
                    <div class="space-y-2">
                        <div class="flex justify-between">
                            <span class="text-gray-600">Payment Type:</span>
                            <span class="font-semibold">${receipt.payment_type}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Amount:</span>
                            <span class="font-semibold">Rs. ${receipt.amount}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Status:</span>
                            <span class="font-semibold ${receipt.status === 'completed' ? 'text-green-600' : 'text-yellow-600'}">
                                ${receipt.status.toUpperCase()}
                            </span>
                        </div>
                        ${receipt.transaction_id ? `
                            <div class="flex justify-between">
                                <span class="text-gray-600">Transaction ID:</span>
                                <span class="font-semibold">${receipt.transaction_id}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="mb-6">
                    <h3 class="font-semibold text-lg mb-2">Event Details</h3>
                    <div class="space-y-2">
                        <div class="flex justify-between">
                            <span class="text-gray-600">Event Name:</span>
                            <span class="font-semibold">${receipt.event_name}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Event Date:</span>
                            <span class="font-semibold">${new Date(receipt.event_date).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
                
                <div class="border-t border-gray-200 pt-4">
                    <p class="text-gray-600 text-sm">This is a computer-generated receipt and does not require a signature.</p>
                </div>
            </div>
        `;

        // Create and show receipt modal
        const receiptModal = document.createElement('div');
        receiptModal.id = 'receiptModal';
        receiptModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center';
        receiptModal.innerHTML = `
            <div class="bg-white rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-semibold text-indigo-700">Payment Receipt</h3>
                    <div class="flex gap-2">
                        <button onclick="printReceipt()" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                            <i class="fas fa-print mr-2"></i>Print
                        </button>
                        <button onclick="closeReceiptModal()" class="text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                ${receiptContent}
            </div>
        `;

        document.body.appendChild(receiptModal);
    } catch (error) {
        console.error('Error generating receipt:', error);
        showNotification('Failed to generate receipt', 'error');
    }
}

function closeReceiptModal() {
    const modal = document.getElementById('receiptModal');
    if (modal) {
        modal.remove();
    }
}

function printReceipt() {
    const receiptContent = document.querySelector('#receiptModal .bg-white').innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>Payment Receipt</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                    @media print {
                        body { padding: 20px; }
                        button { display: none; }
                    }
                </style>
            </head>
            <body>
                ${receiptContent}
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// Manual Payment Status Updates
async function updateManualPaymentStatus(paymentId, status) {
    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`/api/payments/${paymentId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status })
        });

        if (!response.ok) throw new Error('Failed to update payment status');

        showNotification('Payment status updated successfully', 'success');
        loadPaymentHistory();
    } catch (error) {
        console.error('Error updating payment status:', error);
        showNotification('Failed to update payment status', 'error');
    }
}

// Update the loadPaymentHistory function to include receipt and status update buttons
async function loadPaymentHistory(user) {
    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`/api/users/${user.user_id}/payments`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to load payment history');

        const payments = await response.json();
        const paymentHistory = document.getElementById('paymentHistory');

        if (!Array.isArray(payments) || payments.length === 0) {
            paymentHistory.innerHTML = `
                <div class="text-center text-gray-500 py-4">
                    No payment history found
                </div>
            `;
            return;
        }

        paymentHistory.innerHTML = payments.map(payment => `
            <div class="bg-white border border-gray-200 rounded-lg p-4">
                <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                        <i class="fas ${payment.payment_type === 'online' ? 'fa-credit-card' : 'fa-money-bill-wave'} text-indigo-600"></i>
                        <span class="font-semibold">${payment.payment_type.charAt(0).toUpperCase() + payment.payment_type.slice(1)} Payment</span>
                    </div>
                    <span class="px-2 py-1 ${payment.status === 'completed' ? 'bg-green-100 text-green-700' :
                payment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'} rounded text-xs">
                        ${payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                    </span>
                </div>
                <div class="text-gray-600 text-sm">Amount: Rs. ${payment.amount}</div>
                <div class="text-gray-600 text-sm">Date: ${new Date(payment.payment_date).toLocaleString()}</div>
                ${payment.transaction_id ? `
                    <div class="text-gray-600 text-sm">Transaction ID: ${payment.transaction_id}</div>
                ` : ''}
                <div class="mt-4 flex gap-2">
                    <button onclick="generatePaymentReceipt('${payment.payment_id}')"
                        class="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm">
                        <i class="fas fa-receipt mr-1"></i> View Receipt
                    </button>
                    ${payment.payment_type === 'manual' && payment.status === 'pending' ? `
                        <button onclick="updateManualPaymentStatus('${payment.payment_id}', 'completed')"
                            class="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm">
                            <i class="fas fa-check mr-1"></i> Mark as Paid
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading payment history:', error);
        showNotification('Failed to load payment history', 'error');
    }
} 