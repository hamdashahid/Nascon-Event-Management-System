// dashboard.js

document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../pages/login.html';
        return;
    }

    // Get user info from localStorage
    const user = JSON.parse(localStorage.getItem('user'));
    const dashboardNav = document.getElementById('dashboardNav');
    const dashboardContent = document.getElementById('dashboardContent');
    const dashboardTitle = document.getElementById('dashboardTitle');
    const userInfo = document.getElementById('userInfo');

    // Show user info if element exists
    if (userInfo) {
        userInfo.innerHTML = `<span><i class="fas fa-user"></i> ${user.name} (${capitalize(user.role)})</span>`;
    }

    // Show/hide sidebar links based on role
    showSidebarLinks(user.role);

    // Handle navigation
    if (dashboardNav) {
        dashboardNav.querySelectorAll('a[data-section]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                dashboardNav.querySelectorAll('a').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                const section = link.getAttribute('data-section');
                if (dashboardTitle) {
                    dashboardTitle.textContent = sectionTitle(section);
                }
                loadDashboardSection(section, user, token);
            });
        });
    }

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

    // Load default section if dashboardContent exists
    if (dashboardContent) {
        loadDashboardSection('overview', user, token);
    }

    // Fill admin info if on admin dashboard
    const adminName = document.getElementById('adminName');
    const adminEmail = document.getElementById('adminEmail');
    if (adminName && adminEmail && user.role === 'admin') {
        adminName.textContent = `Welcome, ${user.name}!`;
        adminEmail.textContent = user.email;
    }
});

function showSidebarLinks(role) {
    // Hide all role-specific links
    document.querySelectorAll('.admin-only, .organizer-only, .participant-only, .sponsor-only, .judge-only').forEach(el => {
        el.style.display = 'none';
    });
    // Show links for the user's role
    if (role === 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
    }
    if (role === 'participant') {
        document.querySelectorAll('.participant-only').forEach(el => el.style.display = 'block');
    }
    if (role === 'sponsor') {
        document.querySelectorAll('.sponsor-only').forEach(el => el.style.display = 'block');
    }
    if (role === 'judge') {
        document.querySelectorAll('.judge-only').forEach(el => el.style.display = 'block');
    }
}

function sectionTitle(section) {
    const titles = {
        'overview': 'Dashboard',
        'events': 'Manage Events',
        'venues': 'Manage Venues',
        'sponsors': 'Manage Sponsors',
        'accommodations': 'Manage Accommodations',
        'payments': 'Payments & Finance',
        'judging': 'Judging & Evaluation',
        'my-events': 'My Events',
        'accommodation-status': 'Accommodation Status',
        'payments-status': 'My Payments',
        'my-sponsorships': 'My Sponsorships',
        'brand-promotion': 'Brand Promotion'
    };
    return titles[section] || 'Dashboard';
}

function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

async function loadDashboardSection(section, user, token) {
    const dashboardContent = document.getElementById('dashboardContent');
    if (!dashboardContent) return;

    dashboardContent.innerHTML = '<div class="loading">Loading...</div>';
    try {
        switch (section) {
            case 'overview':
                await loadAdminOverviewStats();
                break;
            case 'events':
                await loadEventsSection(dashboardContent, token);
                break;
            case 'venues':
                await loadVenuesSection(dashboardContent, token);
                break;
            case 'sponsors':
                await loadSponsorsSection(dashboardContent, token);
                break;
            case 'accommodations':
                await loadAccommodationsSection(dashboardContent, token);
                break;
            case 'payments':
                await loadPaymentsSection(dashboardContent, token);
                break;
            case 'judging':
                await loadJudgingSection(dashboardContent, token);
                break;
            case 'my-events':
                await loadMyEventsSection(dashboardContent, user, token);
                break;
            case 'accommodation-status':
                await loadMyAccommodationSection(dashboardContent, user, token);
                break;
            case 'payments-status':
                await loadMyPaymentsSection(dashboardContent, user, token);
                break;
            case 'my-sponsorships':
                await loadMySponsorshipsSection(dashboardContent, user, token);
                break;
            case 'brand-promotion':
                await loadBrandPromotionSection(dashboardContent, user, token);
                break;
            case 'users':
                await loadUsersSection(dashboardContent, token);
                break;
            case 'sponsorships':
                await loadSponsorshipsSection(dashboardContent, token);
                break;
            default:
                dashboardContent.innerHTML = '<div class="dashboard-welcome">Section not found.</div>';
        }
    } catch (error) {
        dashboardContent.innerHTML = `<div class="error-message">Failed to load section: ${error.message}</div>`;
    }
}

async function loadEventsSection(container, token) {
    container.innerHTML = '<div class="loading">Loading events...</div>';
    try {
        const response = await fetch('/api/events', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to load events');
        const events = await response.json();
        if (!Array.isArray(events) || events.length === 0) {
            container.innerHTML = '<div class="empty-state">No events found.</div>';
            return;
        }
        container.innerHTML = `
            <div class="dashboard-section-header">
                <h2>Events Management</h2>
                <button id="addEventBtn" class="cta-button"><i class="fas fa-plus"></i> Add Event</button>
            </div>
            <div class="table-responsive">
                <table class="dashboard-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Category</th>
                            <th>Date</th>
                            <th>Venue</th>
                            <th>Max Participants</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${events.map(event => `
                            <tr>
                                <td>${event.event_name}</td>
                                <td>${event.category || '-'}</td>
                                <td>${event.event_date ? new Date(event.event_date).toLocaleString() : '-'}</td>
                                <td>${event.venue_name || 'TBD'}</td>
                                <td>${event.max_participants || '-'}</td>
                                <td>${event.status || '-'}</td>
                                <td>
                                    <button class="btn-edit" data-id="${event.event_id}"><i class="fas fa-edit"></i></button>
                                    <button class="btn-delete" data-id="${event.event_id}"><i class="fas fa-trash"></i></button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div id="addEventModal" class="modal" style="display:none;">
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
                        <button type="submit">Add Event</button>
                    </form>
                </div>
            </div>
        `;

        // Add Event Button
        document.getElementById('addEventBtn').addEventListener('click', () => {
            const modal = document.getElementById('addEventModal');
            modal.style.display = 'block';
            loadVenuesForSelect(token);
        });

        // Close Modal
        document.getElementById('closeAddEventModal').addEventListener('click', () => {
            document.getElementById('addEventModal').style.display = 'none';
        });

        // Add Event Form
        document.getElementById('addEventForm').addEventListener('submit', async (e) => {
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
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(eventData)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to add event');
                }

                document.getElementById('addEventModal').style.display = 'none';
                loadEventsSection(container, token);
                showToast('Event added successfully', 'success');
            } catch (error) {
                showToast(error.message, 'error');
            }
        });

        // Edit and Delete buttons
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', async () => {
                const eventId = btn.getAttribute('data-id');
                // Implement edit functionality
                showToast('Edit functionality to be implemented', 'info');
            });
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (confirm('Are you sure you want to delete this event?')) {
                    const eventId = btn.getAttribute('data-id');
                    try {
                        const response = await fetch(`/api/events/${eventId}`, {
                            method: 'DELETE',
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        });

                        if (!response.ok) {
                            const errorData = await response.json();
                            throw new Error(errorData.error || 'Failed to delete event');
                        }

                        loadEventsSection(container, token);
                        showToast('Event deleted successfully', 'success');
                    } catch (error) {
                        showToast(error.message, 'error');
                    }
                }
            });
        });
    } catch (error) {
        container.innerHTML = `<div class="error-message">${error.message}</div>`;
    }
}

async function loadVenuesForSelect(token) {
    try {
        const response = await fetch('/api/venues', {
            headers: { 'Authorization': `Bearer ${token}` }
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

async function loadVenuesSection(container, token) {
    container.innerHTML = '<div class="loading">Loading venues...</div>';
    try {
        const response = await fetch('/api/venues', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to load venues');
        const venues = await response.json();
        if (!Array.isArray(venues) || venues.length === 0) {
            container.innerHTML = '<div class="empty-state">No venues found.</div>';
            return;
        }

        // Implement venues section UI
        container.innerHTML = `
            <div class="dashboard-section-header">
                <h2>Venues Management</h2>
                <button id="addVenueBtn" class="cta-button"><i class="fas fa-plus"></i> Add Venue</button>
            </div>
            <div class="table-responsive">
                <table class="dashboard-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Location</th>
                            <th>Capacity</th>
                            <th>Availability</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${venues.map(venue => `
                            <tr>
                                <td>${venue.venue_name}</td>
                                <td>${venue.location || '-'}</td>
                                <td>${venue.capacity || '-'}</td>
                                <td>${venue.availability || 'Available'}</td>
                                <td>
                                    <button class="btn-edit" data-id="${venue.venue_id}"><i class="fas fa-edit"></i></button>
                                    <button class="btn-delete" data-id="${venue.venue_id}"><i class="fas fa-trash"></i></button>
                                </td>
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

async function loadSponsorsSection(container, token) {
    // Implement sponsors section
    container.innerHTML = '<div class="loading">Loading sponsors...</div>';
    try {
        const response = await fetch('/api/sponsors', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to load sponsors');
        const sponsors = await response.json();
        if (!Array.isArray(sponsors) || sponsors.length === 0) {
            container.innerHTML = '<div class="empty-state">No sponsors found.</div>';
            return;
        }

        // Implement sponsors section UI
        container.innerHTML = `
            <div class="dashboard-section-header">
                <h2>Sponsors Management</h2>
                <button id="addSponsorBtn" class="cta-button"><i class="fas fa-plus"></i> Add Sponsor</button>
            </div>
            <div class="table-responsive">
                <table class="dashboard-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Level</th>
                            <th>Amount</th>
                            <th>Contact</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sponsors.map(sponsor => `
                            <tr>
                                <td>${sponsor.sponsor_name}</td>
                                <td>${sponsor.level || '-'}</td>
                                <td>${sponsor.amount ? '$' + sponsor.amount : '-'}</td>
                                <td>${sponsor.contact_email || '-'}</td>
                                <td>
                                    <button class="btn-edit" data-id="${sponsor.sponsor_id}"><i class="fas fa-edit"></i></button>
                                    <button class="btn-delete" data-id="${sponsor.sponsor_id}"><i class="fas fa-trash"></i></button>
                                </td>
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

async function loadAccommodationsSection(container, token) {
    // Implement accommodations section
    container.innerHTML = '<div class="empty-state">Accommodations management coming soon.</div>';
}

async function loadPaymentsSection(container, token) {
    container.innerHTML = '<div class="loading">Loading payments...</div>';
    try {
        const response = await fetch('/api/payments', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to load payments');
        const payments = await response.json();
        if (!Array.isArray(payments) || payments.length === 0) {
            container.innerHTML = '<div class="empty-state">No payments found.</div>';
            return;
        }
        container.innerHTML = `
            <div class="dashboard-section-header">
                <h2>Payments</h2>
            </div>
            <div class="table-responsive">
                <table class="dashboard-table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Amount</th>
                            <th>Date</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${payments.map(payment => `
                            <tr>
                                <td>${payment.user_name} <br><span class='text-xs text-gray-400'>${payment.email}</span></td>
                                <td>Rs. ${payment.amount}</td>
                                <td>${payment.payment_date ? new Date(payment.payment_date).toLocaleString() : '-'}</td>
                                <td><span class="px-2 py-1 rounded text-xs ${payment.status === 'completed' ? 'bg-green-100 text-green-700' : payment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}">${payment.status}</span></td>
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

async function loadJudgingSection(container, token) {
    container.innerHTML = '<div class="loading">Loading judging data...</div>';
    try {
        // Get user info
        const userResponse = await fetch('/api/users/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!userResponse.ok) throw new Error('Failed to get user profile');
        const user = await userResponse.json();

        // Get list of events
        const eventsResponse = await fetch('/api/events', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!eventsResponse.ok) throw new Error('Failed to load events');
        const events = await eventsResponse.json();

        // Check if we have any judging summary data
        const summaryResponse = await fetch('/api/judging/summary', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const hasSummaryData = summaryResponse.ok;
        const summaryData = hasSummaryData ? await summaryResponse.json() : [];

        // Dashboard cards for summary
        let summaryHTML = '';
        if (hasSummaryData && summaryData.length > 0) {
            summaryHTML = `
                <div class="dashboard-cards">
                    <div class="card">
                        <div class="card-icon"><i class="fas fa-medal"></i></div>
                        <div class="card-body">
                            <h3>${summaryData.length}</h3>
                            <p>Events Judged</p>
                        </div>
                    </div>
                    <div class="card">
                        <div class="card-icon"><i class="fas fa-users"></i></div>
                        <div class="card-body">
                            <h3>${summaryData.reduce((acc, curr) => acc + curr.participants_judged, 0)}</h3>
                            <p>Participants Evaluated</p>
                        </div>
                    </div>
                    <div class="card">
                        <div class="card-icon"><i class="fas fa-star"></i></div>
                        <div class="card-body">
                            <h3>${Math.round(summaryData.reduce((acc, curr) => acc + parseFloat(curr.average_score || 0), 0) / summaryData.length || 0)}</h3>
                            <p>Average Score</p>
                        </div>
                    </div>
                </div>
            `;
        }

        // Build judging interface
        container.innerHTML = `
            <div class="dashboard-section-header">
                <h2>Judging & Evaluation</h2>
            </div>
            
            ${summaryHTML}
            
            <div class="judging-controls">
                <div class="form-group">
                    <label for="eventSelector">Select Event to Judge:</label>
                    <select id="eventSelector" class="dashboard-select">
                        <option value="">-- Select Event --</option>
                        ${events.map(event => `<option value="${event.event_id}">${event.event_name}</option>`).join('')}
                    </select>
                </div>
                <button id="viewParticipantsBtn" class="cta-button" disabled>View Participants</button>
            </div>
            
            <div id="participantsContainer" class="judging-participants-container hidden">
                <h3>Participants</h3>
                <div class="loading">Select an event to view participants</div>
            </div>
            
            <div id="topParticipantsContainer" class="mt-4 hidden">
                <h3>Top Participants</h3>
                <div class="table-responsive">
                    <table class="dashboard-table">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Name</th>
                                <th>Average Score</th>
                                <th>Times Judged</th>
                            </tr>
                        </thead>
                        <tbody id="topParticipantsTbody">
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div id="scoringModal" class="dashboard-modal hidden">
                <div class="dashboard-modal-content">
                    <div class="dashboard-modal-header">
                        <h3>Score Participant</h3>
                        <span class="close-modal">&times;</span>
                    </div>
                    <div class="dashboard-modal-body">
                        <form id="scoringForm">
                            <input type="hidden" id="participantId" name="participantId">
                            <input type="hidden" id="eventId" name="eventId">
                            
                            <div class="form-group">
                                <label for="participantName">Participant:</label>
                                <input type="text" id="participantName" readonly class="dashboard-input">
                            </div>
                            
                            <div class="form-group">
                                <label for="scoreInput">Score (1-100):</label>
                                <input type="number" id="scoreInput" name="score" min="1" max="100" required class="dashboard-input">
                            </div>
                            
                            <div class="form-group">
                                <label for="commentsInput">Comments:</label>
                                <textarea id="commentsInput" name="comments" rows="4" class="dashboard-textarea"></textarea>
                            </div>
                            
                            <div class="form-actions">
                                <button type="submit" class="submit-button">Submit Score</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        // Add event listeners
        const eventSelector = document.getElementById('eventSelector');
        const viewParticipantsBtn = document.getElementById('viewParticipantsBtn');
        const participantsContainer = document.getElementById('participantsContainer');
        const topParticipantsContainer = document.getElementById('topParticipantsContainer');
        const scoringModal = document.getElementById('scoringModal');
        const scoringForm = document.getElementById('scoringForm');

        // Enable view button when event selected
        eventSelector.addEventListener('change', () => {
            viewParticipantsBtn.disabled = !eventSelector.value;
        });

        // View participants button
        viewParticipantsBtn.addEventListener('click', async () => {
            const eventId = eventSelector.value;
            if (!eventId) return;

            participantsContainer.classList.remove('hidden');
            participantsContainer.innerHTML = '<div class="loading">Loading participants...</div>';

            try {
                // Get participants for the event
                const response = await fetch(`/api/events/${eventId}/participants`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error('Failed to load participants');
                const participants = await response.json();

                if (participants.length === 0) {
                    participantsContainer.innerHTML = '<div class="empty-state">No participants found for this event.</div>';
                    return;
                }

                // Get any existing scores by this judge
                const judgeResponse = await fetch(`/api/judging/event/${eventId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const existingScores = judgeResponse.ok ? await judgeResponse.json() : [];

                // Create participant cards
                let participantsHTML = '<div class="participant-cards">';

                participants.forEach(participant => {
                    // Check if this participant has already been scored by this judge
                    const existingScore = existingScores.find(score =>
                        score.participant_name === participant.name
                    );

                    const scoreDisplay = existingScore
                        ? `<div class="score-badge">Score: ${existingScore.score}</div>`
                        : '<div class="score-badge pending">Not Scored</div>';

                    participantsHTML += `
                        <div class="participant-card" data-participant-id="${participant.user_id}" data-participant-name="${participant.name}">
                            <div class="participant-info">
                                <h4>${participant.name}</h4>
                                <p>${participant.email}</p>
                            </div>
                            ${scoreDisplay}
                            <button class="score-button" data-participant-id="${participant.user_id}" data-participant-name="${participant.name}">
                                ${existingScore ? 'Update Score' : 'Score'}
                            </button>
                        </div>
                    `;
                });

                participantsHTML += '</div>';
                participantsContainer.innerHTML = participantsHTML;

                // Add event listeners to score buttons
                document.querySelectorAll('.score-button').forEach(button => {
                    button.addEventListener('click', () => {
                        const participantId = button.getAttribute('data-participant-id');
                        const participantName = button.getAttribute('data-participant-name');

                        // Set values in the scoring form
                        document.getElementById('participantId').value = participantId;
                        document.getElementById('eventId').value = eventId;
                        document.getElementById('participantName').value = participantName;

                        // Check if we have an existing score
                        const existingScore = existingScores.find(score =>
                            score.participant_name === participantName
                        );

                        if (existingScore) {
                            document.getElementById('scoreInput').value = existingScore.score;
                            document.getElementById('commentsInput').value = existingScore.comments || '';
                        } else {
                            // Clear form if no existing score
                            document.getElementById('scoreInput').value = '';
                            document.getElementById('commentsInput').value = '';
                        }

                        // Show the modal
                        scoringModal.classList.remove('hidden');
                    });
                });

                // Also load top participants for this event
                try {
                    const topResponse = await fetch(`/api/judging/top-participants/${eventId}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    if (topResponse.ok) {
                        const topParticipants = await topResponse.json();
                        if (topParticipants.length > 0) {
                            topParticipantsContainer.classList.remove('hidden');
                            const tbody = document.getElementById('topParticipantsTbody');
                            tbody.innerHTML = topParticipants.map((participant, index) => `
                                <tr>
                                    <td>${index + 1}</td>
                                    <td>${participant.participant_name}</td>
                                    <td>${parseFloat(participant.average_score).toFixed(2)}</td>
                                    <td>${participant.times_judged}</td>
                                </tr>
                            `).join('');
                        } else {
                            topParticipantsContainer.classList.add('hidden');
                        }
                    }
                } catch (err) {
                    console.error('Error fetching top participants:', err);
                    topParticipantsContainer.classList.add('hidden');
                }
            } catch (err) {
                participantsContainer.innerHTML = `<div class="error-message">Error: ${err.message}</div>`;
            }
        });

        // Close modal
        document.querySelector('.close-modal').addEventListener('click', () => {
            scoringModal.classList.add('hidden');
        });

        // Scoring form submission
        scoringForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const participantId = document.getElementById('participantId').value;
            const eventId = document.getElementById('eventId').value;
            const score = document.getElementById('scoreInput').value;
            const comments = document.getElementById('commentsInput').value;

            try {
                const response = await fetch('/api/judging', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        event_id: eventId,
                        participant_id: participantId,
                        score: parseInt(score),
                        comments
                    })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Failed to submit score');
                }

                // Hide modal and refresh participants
                scoringModal.classList.add('hidden');
                showToast('Score submitted successfully', 'success');

                // Refresh participants list
                viewParticipantsBtn.click();
            } catch (err) {
                showToast(err.message, 'error');
            }
        });

    } catch (error) {
        container.innerHTML = `<div class="error-message">Error: ${error.message}</div>`;
    }
}

async function loadMyEventsSection(container, user, token) {
    // Implement my events section for participant
    container.innerHTML = '<div class="loading">Loading your events...</div>';
    try {
        const response = await fetch(`/api/users/${user.user_id}/events`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to load your events');
        const events = await response.json();
        if (!Array.isArray(events) || events.length === 0) {
            container.innerHTML = '<div class="empty-state">You have not registered for any events yet.</div>';
            return;
        }

        container.innerHTML = `
            <div class="dashboard-section-header">
                <h2>My Events</h2>
            </div>
            <div class="table-responsive">
                <table class="dashboard-table">
                    <thead>
                        <tr>
                            <th>Event Name</th>
                            <th>Date</th>
                            <th>Venue</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${events.map(event => `
                            <tr>
                                <td>${event.event_name}</td>
                                <td>${event.event_date ? new Date(event.event_date).toLocaleString() : '-'}</td>
                                <td>${event.venue_name || 'TBD'}</td>
                                <td>${event.status || '-'}</td>
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

async function loadMyAccommodationSection(container, user, token) {
    // Implement my accommodation section for participant
    container.innerHTML = '<div class="empty-state">Accommodation status coming soon.</div>';
}

async function loadMyPaymentsSection(container, user, token) {
    // Implement my payments section for participant
    container.innerHTML = '<div class="empty-state">Payment status coming soon.</div>';
}

async function loadMySponsorshipsSection(container, user, token) {
    // Implement my sponsorships section for sponsor
    container.innerHTML = '<div class="empty-state">Your sponsorships information coming soon.</div>';
}

async function loadBrandPromotionSection(container, user, token) {
    // Implement brand promotion section for sponsor
    container.innerHTML = '<div class="empty-state">Brand promotion information coming soon.</div>';
}

async function loadSponsorshipsSection(container, token) {
    container.innerHTML = '<div class="loading">Loading sponsorships...</div>';
    try {
        const response = await fetch('/api/sponsorships', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to load sponsorships');
        const sponsorships = await response.json();
        if (!Array.isArray(sponsorships) || sponsorships.length === 0) {
            container.innerHTML = '<div class="empty-state">No sponsorships found.</div>';
            return;
        }
        container.innerHTML = `
            <div class="dashboard-section-header">
                <h2>Sponsorships</h2>
            </div>
            <div class="table-responsive">
                <table class="dashboard-table">
                    <thead>
                        <tr>
                            <th>Sponsor</th>
                            <th>Package</th>
                            <th>Amount</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sponsorships.map(s => `
                            <tr>
                                <td>${s.sponsor}</td>
                                <td>${s.package}</td>
                                <td>Rs. ${s.amount}</td>
                                <td><span class="px-2 py-1 rounded text-xs ${s.status === 'Confirmed' ? 'bg-green-100 text-green-700' : s.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}">${s.status}</span></td>
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