// dashboard-sponsor.js

document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in and is sponsor
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    if (!token || !user || user.role !== 'sponsor') {
        window.location.href = '../pages/login.html';
        return;
    }

    // Sidebar navigation logic
    const prevShowSection = window.showSection;
    window.showSection = function (section) {
        const sections = ['overview', 'sponsorships', 'events', 'payments', 'profile', 'analytics', 'messages', 'sponsorEvent'];
        sections.forEach(s => {
            const el = document.getElementById(s + 'Section');
            if (el) el.classList.add('hidden');
        });
        const showEl = document.getElementById(section + 'Section');
        if (showEl) showEl.classList.remove('hidden');
        if (section === 'overview') loadSponsorOverview(user, token);
        if (section === 'sponsorships') loadMySponsorshipsSection(user, token);
        if (section === 'events') loadEventsSponsoredSection(user, token);
        if (section === 'payments') loadPaymentsSection(user, token);
        if (section === 'profile') loadProfileSection(user, token);
        if (section === 'sponsorEvent') loadSponsorEventSection(user, token);
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
});

// --- Overview Section ---
async function loadSponsorOverview(user, token) {
    const overviewSection = document.getElementById('overviewSection');
    if (!overviewSection) return;
    overviewSection.innerHTML = `
    <div class="glass p-8 mb-8 flex flex-col items-center text-center">
        <h2 class="text-3xl md:text-4xl font-extrabold text-indigo-900 mb-2 flex items-center gap-2">
            <i class="fas fa-building text-indigo-500"></i> Welcome, <span id="sponsorName">${user.name}</span>!
        </h2>
        <p class="text-gray-600 mb-6 text-lg">Here's a quick overview of your sponsorship impact and status.</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full mt-4 justify-center">
            <div class="bg-gradient-to-br from-indigo-100 to-white rounded-xl shadow p-6 flex flex-col items-center stat-card hover:shadow-lg transition group">
                <div class="text-indigo-600 text-4xl mb-2"><i class="fas fa-hand-holding-usd"></i></div>
                <div class="text-3xl font-bold" id="sponsorPackage">...</div>
                <div class="text-gray-700 font-semibold">Package</div>
                <div class="text-xs text-gray-400 mt-1">Your highest sponsorship tier</div>
            </div>
            <div class="bg-gradient-to-br from-green-100 to-white rounded-xl shadow p-6 flex flex-col items-center stat-card hover:shadow-lg transition group">
                <div class="text-green-600 text-4xl mb-2"><i class="fas fa-calendar-alt"></i></div>
                <div class="text-3xl font-bold" id="eventsSponsored">...</div>
                <div class="text-gray-700 font-semibold">Events Sponsored</div>
                <div class="text-xs text-gray-400 mt-1">Confirmed events you support</div>
            </div>
            <div class="bg-gradient-to-br from-yellow-100 to-white rounded-xl shadow p-6 flex flex-col items-center stat-card hover:shadow-lg transition group">
                <div class="text-yellow-600 text-4xl mb-2"><i class="fas fa-rupee-sign"></i></div>
                <div class="text-3xl font-bold" id="totalSponsoredAmount">...</div>
                <div class="text-gray-700 font-semibold">Total Sponsored</div>
                <div class="text-xs text-gray-400 mt-1">Total confirmed sponsorship (Rs.)</div>
            </div>
            <div class="bg-gradient-to-br from-blue-100 to-white rounded-xl shadow p-6 flex flex-col items-center stat-card hover:shadow-lg transition group" title="Unique participants in your sponsored events">
                <div class="text-blue-600 text-4xl mb-2"><i class="fas fa-users"></i></div>
                <div class="text-3xl font-bold" id="eventReach">...</div>
                <div class="text-gray-700 font-semibold">Event Reach</div>
                <div class="text-xs text-gray-400 mt-1">Unique participants reached</div>
            </div>
        </div>
    </div>`;
    // Fetch stats from backend and update the counts
    try {
        const sponsorObj = await getSponsorForUser(user);
        const sponsorId = sponsorObj.sponsor_id;
        const res = await fetch(`/api/sponsor/${sponsorId}/stats`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error('Failed to load stats');
        const stats = await res.json();
        document.getElementById('sponsorPackage').textContent = stats.package;
        document.getElementById('eventsSponsored').textContent = stats.events_sponsored;
        document.getElementById('totalSponsoredAmount').textContent = `Rs. ${stats.total_amount}`;
        document.getElementById('eventReach').textContent = stats.event_reach;
    } catch (err) {
        document.getElementById('sponsorPackage').textContent = '-';
        document.getElementById('eventsSponsored').textContent = '-';
        document.getElementById('totalSponsoredAmount').textContent = '-';
        document.getElementById('eventReach').textContent = '-';
    }
}

// --- Sponsor Cache Helper ---
let cachedSponsor = null;
async function getSponsorForUser(user) {
    if (cachedSponsor && cachedSponsor.user_id === user.user_id) return cachedSponsor;
    const sponsorRes = await fetch(`/api/sponsors/by-user/${user.user_id}`);
    if (!sponsorRes.ok) throw new Error('Sponsor company not found for your account.');
    const sponsorObj = await sponsorRes.json();
    cachedSponsor = sponsorObj;
    return sponsorObj;
}

// --- My Sponsorships Section ---
async function loadMySponsorshipsSection(user, token) {
    const sponsorshipsSection = document.getElementById('sponsorshipsSection');
    const sponsorshipsList = document.getElementById('sponsorshipsList');
    if (!sponsorshipsSection || !sponsorshipsList) return;
    sponsorshipsList.innerHTML = '<div class="loading">Loading your sponsorships...</div>';
    try {
        const sponsorObj = await getSponsorForUser(user);
        const sponsorId = sponsorObj.sponsor_id;
        // Fetch sponsorships for this sponsor
        const response = await fetch(`/api/sponsorships?sponsor_id=${sponsorId}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) throw new Error('Failed to load sponsorships');
        const sponsorships = await response.json();
        if (!Array.isArray(sponsorships) || sponsorships.length === 0) {
            sponsorshipsList.innerHTML = '<div class="empty-state text-gray-500">You have no sponsorships yet.</div>';
            return;
        }
        sponsorshipsList.innerHTML = sponsorships.map(s => `
            <div class="flex items-center gap-2 mb-2">
                <span class="text-indigo-600"><i class="fas fa-hand-holding-usd"></i></span>
                <span class="font-semibold">${capitalize(s.sponsorship_type)} Package</span>
                <span class="ml-auto px-2 py-1 ${s.status === 'Confirmed' ? 'bg-green-100 text-green-700' : s.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'} rounded text-xs">${s.status}</span>
            </div>
            <div class="text-gray-600 text-sm">Amount: Rs. ${s.amount}</div>
            <div class="text-gray-600 text-sm">Benefits: ${s.benefits || 'See package details'}</div>
        `).join('<hr class="my-2">');
    } catch (error) {
        sponsorshipsList.innerHTML = `<div class="error-message">${error.message}</div>`;
    }
}

// --- Events Sponsored Section ---
async function loadEventsSponsoredSection(user, token) {
    const eventsSection = document.getElementById('eventsSection');
    const eventsList = document.getElementById('eventsSponsoredList');
    if (!eventsSection || !eventsList) return;
    eventsList.innerHTML = '<tr><td colspan="3" class="py-4 text-center text-gray-500">Loading your sponsored events...</td></tr>';
    try {
        const sponsorObj = await getSponsorForUser(user);
        const sponsorId = sponsorObj.sponsor_id;
        // Fetch sponsored events for this sponsor
        const response = await fetch(`/api/sponsorships/events?sponsor_id=${sponsorId}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) throw new Error('Failed to load sponsored events');
        const events = await response.json();
        if (!Array.isArray(events) || events.length === 0) {
            eventsList.innerHTML = '<tr><td colspan="3" class="py-4 text-center text-gray-500">You are not sponsoring any events yet.</td></tr>';
            return;
        }
        eventsList.innerHTML = events.map(event => `
            <tr>
                <td class="py-2 px-4">${event.event_name}</td>
                <td class="py-2 px-4">${event.event_date ? new Date(event.event_date).toLocaleDateString() : '-'}</td>
                <td class="py-2 px-4">${event.venue_name || 'TBD'}</td>
            </tr>
        `).join('');
    } catch (error) {
        eventsList.innerHTML = `<tr><td colspan="3" class="py-4 text-center text-red-500">${error.message}</td></tr>`;
    }
}

// --- Payments Section ---
async function loadPaymentsSection(user, token) {
    const paymentsSection = document.getElementById('paymentsSection');
    const paymentsList = document.getElementById('paymentsList');
    if (!paymentsSection || !paymentsList) return;
    paymentsList.innerHTML = '<tr><td colspan="4" class="py-4 text-center text-gray-500">Loading your payments...</td></tr>';
    try {
        const sponsorObj = await getSponsorForUser(user);
        const sponsorId = sponsorObj.sponsor_id;
        // Fetch payments for this sponsor
        const response = await fetch(`/api/payments?sponsor_id=${sponsorId}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) throw new Error('Failed to load payments');
        const payments = await response.json();
        if (!Array.isArray(payments) || payments.length === 0) {
            paymentsList.innerHTML = '<tr><td colspan="4" class="py-4 text-center text-gray-500">No payments found.</td></tr>';
            return;
        }
        paymentsList.innerHTML = payments.map(p => `
            <tr>
                <td class="py-2 px-4">${capitalize(p.package || p.sponsorship_type)}</td>
                <td class="py-2 px-4">Rs. ${p.amount}</td>
                <td class="py-2 px-4">${p.payment_date ? new Date(p.payment_date).toLocaleDateString() : '-'}</td>
                <td class="py-2 px-4"><span class="px-2 py-1 ${p.status === 'completed' || p.status === 'Confirmed' ? 'bg-green-100 text-green-700' : p.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'} rounded text-xs">${p.status === 'completed' ? 'Paid' : capitalize(p.status)}</span></td>
            </tr>
        `).join('');
    } catch (error) {
        paymentsList.innerHTML = `<tr><td colspan="4" class="py-4 text-center text-red-500">${error.message}</td></tr>`;
    }
}

// --- Sponsor an Event Section ---
async function loadSponsorEventSection(user, token) {
    const sponsorEventSection = document.getElementById('sponsorEventSection');
    const eventSelect = document.getElementById('sponsorEventSelect');
    const sponsorEventForm = document.getElementById('sponsorEventForm');
    const sponsorEventMessage = document.getElementById('sponsorEventMessage');
    if (!sponsorEventSection || !eventSelect || !sponsorEventForm) return;
    sponsorEventMessage.textContent = '';
    // Populate event dropdown
    try {
        // Fetch all events
        const res = await fetch('/api/events', { headers: { 'Authorization': `Bearer ${token}` } });
        const events = await res.json();
        const sponsorObj = await getSponsorForUser(user);
        const sponsorId = sponsorObj.sponsor_id;
        // Fetch already sponsored events for this sponsor
        const sponsoredRes = await fetch(`/api/sponsorships/events?sponsor_id=${sponsorId}`, { headers: { 'Authorization': `Bearer ${token}` } });
        const sponsoredEvents = await sponsoredRes.json();
        const sponsoredEventIds = new Set(sponsoredEvents.map(ev => ev.event_id));
        // Filter out already sponsored events
        const availableEvents = events.filter(ev => !sponsoredEventIds.has(ev.event_id));
        eventSelect.innerHTML = '<option value="">Select Event</option>';
        availableEvents.forEach(ev => {
            eventSelect.innerHTML += `<option value="${ev.event_id}">${ev.event_name} (${ev.event_date ? new Date(ev.event_date).toLocaleDateString() : '-'})</option>`;
        });
        if (availableEvents.length === 0) {
            eventSelect.innerHTML = '<option value="">You have sponsored all available events!</option>';
        }
    } catch (err) {
        eventSelect.innerHTML = '<option value="">Error loading events</option>';
    }
    // Handle form submission
    sponsorEventForm.onsubmit = async function (e) {
        e.preventDefault();
        sponsorEventMessage.textContent = '';
        const event_id = eventSelect.value;
        const sponsorship_type = document.getElementById('sponsorPackageSelect').value;
        const amount = document.getElementById('sponsorAmountInput').value;
        if (!event_id || !sponsorship_type || !amount) {
            sponsorEventMessage.textContent = 'Please fill all fields.';
            sponsorEventMessage.className = 'text-red-600';
            return;
        }
        try {
            const sponsorObj = await getSponsorForUser(user);
            const companyName = sponsorObj.company_name;
            // 1. Create sponsorship
            const sponsorshipRes = await fetch('/api/sponsorships', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ sponsor: companyName, package: sponsorship_type, amount, status: 'Confirmed', event_id })
            });
            if (!sponsorshipRes.ok) throw new Error('Failed to create sponsorship');
            // 2. Create payment
            const paymentRes = await fetch('/api/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ user_id: user.user_id, event_id, amount, payment_type: 'sponsorship', status: 'completed' })
            });
            if (!paymentRes.ok) throw new Error('Failed to create payment');
            sponsorEventMessage.textContent = 'Sponsorship and payment successful!';
            sponsorEventMessage.className = 'text-green-600';
            sponsorEventForm.reset();
            // Refresh sponsorships, events, and payments sections
            loadMySponsorshipsSection(user, token);
            loadEventsSponsoredSection(user, token);
            loadPaymentsSection(user, token);
        } catch (err) {
            sponsorEventMessage.textContent = err.message;
            sponsorEventMessage.className = 'text-red-600';
        }
    };
}

// --- Profile Section ---
async function loadProfileSection(user, token) {
    const profileSection = document.getElementById('profileSection');
    if (!profileSection) return;
    // Populate with user info (can be expanded as needed)
    profileSection.innerHTML = `<div class="glass p-8 mb-8"><h2 class="text-2xl font-bold text-indigo-800 mb-4">My Profile</h2><div class="bg-white rounded-xl shadow p-6 flex flex-col gap-2"><div class="flex items-center gap-2 mb-2"><span class="text-indigo-600"><i class="fas fa-user"></i></span><span class="font-semibold">${user.name}</span></div><div class="text-gray-600 text-sm">Email: ${user.email}</div></div></div>`;
}

// Helper function to capitalize strings
function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

// ... more sections as needed ... 