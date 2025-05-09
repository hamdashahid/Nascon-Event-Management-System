// dashboard-judge.js

document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in and is judge
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    if (!token || !user || user.role !== 'judge') {
        window.location.href = '../pages/login.html';
        return;
    }

    // Sidebar navigation logic
    window.showSection = function (section) {
        const sections = ['overview', 'myevents', 'judging', 'results', 'leaderboard', 'schedule', 'profile', 'messages'];
        sections.forEach(s => {
            const el = document.getElementById(s + 'Section');
            if (el) el.classList.add('hidden');
        });
        const showEl = document.getElementById(section + 'Section');
        if (showEl) showEl.classList.remove('hidden');
        if (section === 'overview') loadOverviewSection(user, token);
        if (section === 'myevents') loadMyEventsSection(user, token);
        if (section === 'judging') loadJudgingPanelSection(user, token);
        if (section === 'results') loadResultsSection(user, token);
        if (section === 'leaderboard') loadLeaderboardSection(user, token);
        if (section === 'profile') loadProfileSection(user, token);
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
async function loadOverviewSection(user, token) {
    const overviewSection = document.getElementById('overviewSection');
    if (!overviewSection) return;
    overviewSection.innerHTML = `
    <div class="glass p-8 mb-8 flex flex-col items-center text-center">
        <h2 class="text-3xl md:text-4xl font-extrabold text-indigo-900 mb-2 flex items-center gap-2">
            <i class="fas fa-gavel text-indigo-500"></i> Welcome, <span id="judgeName">${user.name}</span>!
        </h2>
        <p class="text-gray-600 mb-6 text-lg">Here's a quick overview of your judging assignments.</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 w-full mt-4 justify-center">
            <div class="bg-gradient-to-br from-indigo-100 to-white rounded-xl shadow p-6 flex flex-col items-center stat-card hover:shadow-lg transition group">
                <div class="text-indigo-600 text-4xl mb-2"><i class="fas fa-calendar-check"></i></div>
                <div class="text-3xl font-bold" id="eventsAssigned">...</div>
                <div class="text-gray-700 font-semibold">Events Assigned</div>
                <div class="text-xs text-gray-400 mt-1">Events you are judging</div>
            </div>
            <div class="bg-gradient-to-br from-green-100 to-white rounded-xl shadow p-6 flex flex-col items-center stat-card hover:shadow-lg transition group">
                <div class="text-green-600 text-4xl mb-2"><i class="fas fa-gavel"></i></div>
                <div class="text-3xl font-bold" id="roundsCount">...</div>
                <div class="text-gray-700 font-semibold">Rounds</div>
                <div class="text-xs text-gray-400 mt-1">Total rounds to judge</div>
            </div>
            <div class="bg-gradient-to-br from-yellow-100 to-white rounded-xl shadow p-6 flex flex-col items-center stat-card hover:shadow-lg transition group">
                <div class="text-yellow-600 text-4xl mb-2"><i class="fas fa-clipboard-list"></i></div>
                <div class="text-3xl font-bold" id="pendingScores">...</div>
                <div class="text-gray-700 font-semibold">Pending Scores</div>
                <div class="text-xs text-gray-400 mt-1">Scores you need to submit</div>
            </div>
            <div class="bg-gradient-to-br from-blue-100 to-white rounded-xl shadow p-6 flex flex-col items-center stat-card hover:shadow-lg transition group">
                <div class="text-blue-600 text-4xl mb-2"><i class="fas fa-trophy"></i></div>
                <div class="text-3xl font-bold" id="resultsCount">...</div>
                <div class="text-gray-700 font-semibold">Results</div>
                <div class="text-xs text-gray-400 mt-1">Results you have finalized</div>
            </div>
        </div>
    </div>`;
    try {
        const res = await fetch('/api/judging/overview', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error('Failed to load stats');
        const stats = await res.json();
        console.log('Overview:', stats);
        document.getElementById('eventsAssigned').textContent = stats.events_assigned;
        document.getElementById('roundsCount').textContent = stats.rounds;
        document.getElementById('pendingScores').textContent = stats.pending_scores;
        document.getElementById('resultsCount').textContent = stats.results;
    } catch (err) {
        document.getElementById('eventsAssigned').textContent = '-';
        document.getElementById('roundsCount').textContent = '-';
        document.getElementById('pendingScores').textContent = '-';
        document.getElementById('resultsCount').textContent = '-';
        console.error('Overview error:', err);
    }
}

// --- My Events Section ---
async function loadMyEventsSection(user, token) {
    const myeventsSection = document.getElementById('myeventsSection');
    if (!myeventsSection) return;
    myeventsSection.innerHTML = '<div class="loading">Loading your events...</div>';
    try {
        const res = await fetch('/api/judging/assigned-events', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error('Failed to load events');
        const events = await res.json();
        console.log('My Events:', events);
        if (!Array.isArray(events) || events.length === 0) {
            myeventsSection.innerHTML = '<div class="empty-state text-gray-500">No events assigned.</div>';
            return;
        }
        myeventsSection.innerHTML = `<div class="glass p-8 mb-8"><h2 class="text-2xl font-bold text-indigo-800 mb-4">My Events</h2><div class="overflow-x-auto"><table class="min-w-full bg-white rounded-xl shadow"><thead><tr class="bg-indigo-100 text-indigo-800"><th class="py-2 px-4">Event</th><th class="py-2 px-4">Date</th><th class="py-2 px-4">Venue</th></tr></thead><tbody>${events.map(ev => `<tr><td class="py-2 px-4">${ev.event_name}</td><td class="py-2 px-4">${ev.event_date ? new Date(ev.event_date).toLocaleDateString() : '-'}</td><td class="py-2 px-4">${ev.venue_name || 'TBD'}</td></tr>`).join('')}</tbody></table></div></div>`;
    } catch (err) {
        myeventsSection.innerHTML = `<div class="error-message">${err.message}</div>`;
        console.error('My Events error:', err);
    }
}

// --- Judging Panel Section ---
async function loadJudgingPanelSection(user, token) {
    const judgingSection = document.getElementById('judgingSection');
    if (!judgingSection) return;
    judgingSection.innerHTML = '<div class="loading">Loading judging panel...</div>';
    try {
        // Fetch assigned events
        const eventsRes = await fetch('/api/judging/assigned-events', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!eventsRes.ok) throw new Error('Failed to load events');
        const events = await eventsRes.json();
        console.log('Judging Panel Events:', events);
        if (!Array.isArray(events) || events.length === 0) {
            judgingSection.innerHTML = '<div class="empty-state text-gray-500">No events assigned.</div>';
            return;
        }
        // Event selector
        judgingSection.innerHTML = `<div class="glass p-8 mb-8"><h2 class="text-2xl font-bold text-indigo-800 mb-4">Judging Panel</h2><div class="mb-4"><label class="block text-gray-700 font-semibold mb-1">Select Event</label><select id="judgeEventSelect" class="w-full px-4 py-2 rounded-lg border border-indigo-200 focus:ring-2 focus:ring-indigo-400 outline-none"><option value="">Select Event</option>${events.map(ev => `<option value="${ev.event_id}">${ev.event_name} (${ev.event_date ? new Date(ev.event_date).toLocaleDateString() : '-'})</option>`).join('')}</select></div><div id="judgeParticipantsContainer"></div></div>`;
        const eventSelect = document.getElementById('judgeEventSelect');
        const participantsContainer = document.getElementById('judgeParticipantsContainer');
        eventSelect.onchange = async function () {
            const eventId = eventSelect.value;
            if (!eventId) {
                participantsContainer.innerHTML = '';
                return;
            }
            participantsContainer.innerHTML = '<div class="loading">Loading participants...</div>';
            try {
                // Fetch participants for this event
                const partRes = await fetch(`/api/judging/event/${eventId}/participants`, { headers: { 'Authorization': `Bearer ${token}` } });
                if (!partRes.ok) throw new Error('Failed to load participants');
                const participants = await partRes.json();
                console.log('Participants:', participants);
                // Fetch scores for this event by this judge
                const scoresRes = await fetch(`/api/judging/event/${eventId}/scores`, { headers: { 'Authorization': `Bearer ${token}` } });
                const scores = scoresRes.ok ? await scoresRes.json() : [];
                console.log('Scores:', scores);
                if (!Array.isArray(participants) || participants.length === 0) {
                    participantsContainer.innerHTML = '<div class="empty-state text-gray-500">No participants for this event.</div>';
                    return;
                }
                participantsContainer.innerHTML = `<table class="min-w-full bg-white rounded-xl shadow"><thead><tr class="bg-indigo-100 text-indigo-800"><th class="py-2 px-4">Participant</th><th class="py-2 px-4">Score</th><th class="py-2 px-4">Action</th></tr></thead><tbody>${participants.map(p => {
                    const scoreObj = scores.find(s => s.participant_id === p.participant_id);
                    return `<tr><td class="py-2 px-4">${p.name}</td><td class="py-2 px-4">${scoreObj ? scoreObj.score : '-'}</td><td class="py-2 px-4"><button class="py-1 px-3 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-xs" onclick="openScoreModal(${p.participant_id}, '${p.name}', ${eventId}, ${scoreObj ? scoreObj.score : ''}, '${scoreObj ? scoreObj.comments : ''}')">${scoreObj ? 'Update Score' : 'Score'}</button></td></tr>`;
                }).join('')}</tbody></table>`;
            } catch (err) {
                participantsContainer.innerHTML = `<div class="error-message">${err.message}</div>`;
                console.error('Judging Panel error:', err);
            }
        };
    } catch (err) {
        judgingSection.innerHTML = `<div class="error-message">${err.message}</div>`;
        console.error('Judging Panel error:', err);
    }
}

// --- Results Section ---
async function loadResultsSection(user, token) {
    const resultsSection = document.getElementById('resultsSection');
    if (!resultsSection) return;
    resultsSection.innerHTML = '<div class="loading">Loading results...</div>';
    try {
        const res = await fetch('/api/judging/results', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error('Failed to load results');
        const results = await res.json();
        console.log('Results:', results);
        if (!Array.isArray(results) || results.length === 0) {
            resultsSection.innerHTML = '<div class="empty-state text-gray-500">No results found.</div>';
            return;
        }
        resultsSection.innerHTML = `<div class="glass p-8 mb-8"><h2 class="text-2xl font-bold text-indigo-800 mb-4">Results</h2><div class="overflow-x-auto"><table class="min-w-full bg-white rounded-xl shadow"><thead><tr class="bg-indigo-100 text-indigo-800"><th class="py-2 px-4">Event</th><th class="py-2 px-4">Round</th><th class="py-2 px-4">Winner</th></tr></thead><tbody>${results.map(r => `<tr><td class="py-2 px-4">${r.event_name}</td><td class="py-2 px-4">${r.round || '-'}</td><td class="py-2 px-4">${r.winner || '-'}</td></tr>`).join('')}</tbody></table></div></div>`;
    } catch (err) {
        resultsSection.innerHTML = `<div class="error-message">${err.message}</div>`;
        console.error('Results error:', err);
    }
}

// --- Leaderboard Section ---
async function loadLeaderboardSection(user, token) {
    const leaderboardSection = document.getElementById('leaderboardSection');
    if (!leaderboardSection) return;
    leaderboardSection.innerHTML = '<div class="loading">Loading leaderboard...</div>';
    try {
        // Fetch assigned events
        const eventsRes = await fetch('/api/judging/assigned-events', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!eventsRes.ok) throw new Error('Failed to load events');
        const events = await eventsRes.json();
        if (!Array.isArray(events) || events.length === 0) {
            leaderboardSection.innerHTML = '<div class="empty-state text-gray-500">No events assigned.</div>';
            return;
        }
        leaderboardSection.innerHTML = `<div class="glass p-8 mb-8"><h2 class="text-2xl font-bold text-indigo-800 mb-4">Leaderboard</h2><div class="mb-4"><label class="block text-gray-700 font-semibold mb-1">Select Event</label><select id="leaderboardEventSelect" class="w-full px-4 py-2 rounded-lg border border-indigo-200 focus:ring-2 focus:ring-indigo-400 outline-none"><option value="">Select Event</option>${events.map(ev => `<option value="${ev.event_id}">${ev.event_name} (${ev.event_date ? new Date(ev.event_date).toLocaleDateString() : '-'})</option>`).join('')}</select></div><div id="leaderboardTableContainer"></div></div>`;
        const eventSelect = document.getElementById('leaderboardEventSelect');
        const tableContainer = document.getElementById('leaderboardTableContainer');
        eventSelect.onchange = async function () {
            const eventId = eventSelect.value;
            if (!eventId) {
                tableContainer.innerHTML = '';
                return;
            }
            tableContainer.innerHTML = '<div class="loading">Loading leaderboard...</div>';
            try {
                const res = await fetch(`/api/judging/event/${eventId}/leaderboard`, { headers: { 'Authorization': `Bearer ${token}` } });
                if (!res.ok) throw new Error('Failed to load leaderboard');
                const leaderboard = await res.json();
                if (!Array.isArray(leaderboard) || leaderboard.length === 0) {
                    tableContainer.innerHTML = '<div class="empty-state text-gray-500">No scores yet for this event.</div>';
                    return;
                }
                tableContainer.innerHTML = `<table class="min-w-full bg-white rounded-xl shadow"><thead><tr class="bg-indigo-100 text-indigo-800"><th class="py-2 px-4">Rank</th><th class="py-2 px-4">Participant</th><th class="py-2 px-4">Average Score</th></tr></thead><tbody>${leaderboard.map(row => `<tr${row.rank === 1 ? ' class="bg-yellow-100 font-bold"' : ''}><td class="py-2 px-4">${row.rank}</td><td class="py-2 px-4">${row.participant_name}</td><td class="py-2 px-4">${row.avg_score !== null && !isNaN(Number(row.avg_score)) ? Number(row.avg_score).toFixed(2) : '-'}</td></tr>`).join('')}</tbody></table>`;
            } catch (err) {
                tableContainer.innerHTML = `<div class="error-message">${err.message}</div>`;
            }
        };
    } catch (err) {
        leaderboardSection.innerHTML = `<div class="error-message">${err.message}</div>`;
    }
}

// --- Profile Section ---
async function loadProfileSection(user, token) {
    const profileSection = document.getElementById('profileSection');
    if (!profileSection) return;
    profileSection.innerHTML = `<div class="glass p-8 mb-8"><h2 class="text-2xl font-bold text-indigo-800 mb-4">My Profile</h2><div class="bg-white rounded-xl shadow p-6 flex flex-col gap-2"><div class="flex items-center gap-2 mb-2"><span class="text-indigo-600"><i class="fas fa-user"></i></span><span class="font-semibold" id="profileName"></span></div><div class="text-gray-600 text-sm">Email: <span id="profileEmail"></span></div><div class="text-gray-600 text-sm">Contact: <span id="profileContact"></span></div></div></div>`;
    try {
        const res = await fetch('/api/judging/profile', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error('Failed to load profile');
        const judge = await res.json();
        document.getElementById('profileName').textContent = judge.name || user.name;
        document.getElementById('profileEmail').textContent = judge.email || user.email;
        document.getElementById('profileContact').textContent = judge.contact || '-';
        console.log('Profile:', judge);
    } catch (err) {
        document.getElementById('profileName').textContent = user.name;
        document.getElementById('profileEmail').textContent = user.email;
        document.getElementById('profileContact').textContent = '-';
        console.error('Profile error:', err);
    }
}

// --- Score Modal (global, for simplicity) ---
window.openScoreModal = function (participant_id, participant_name, event_id, score = '', comments = '') {
    // Create modal dynamically if not exists
    let modal = document.getElementById('scoreModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'scoreModal';
        modal.className = 'fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50';
        modal.innerHTML = `<div class="bg-white rounded-lg p-8 w-full max-w-md"><h2 class="text-xl font-bold mb-4">Score Participant</h2><form id="scoreForm"><div class="mb-4"><label class="block text-gray-700 font-semibold mb-1">Participant</label><input type="text" class="w-full px-4 py-2 rounded-lg border border-indigo-200" value="${participant_name}" readonly></div><div class="mb-4"><label class="block text-gray-700 font-semibold mb-1">Score (1-100)</label><input type="number" id="scoreInput" class="w-full px-4 py-2 rounded-lg border border-indigo-200" min="1" max="100" value="${score || ''}" required></div><div class="mb-4"><label class="block text-gray-700 font-semibold mb-1">Comments</label><textarea id="commentsInput" class="w-full px-4 py-2 rounded-lg border border-indigo-200" rows="3">${comments || ''}</textarea></div><div class="flex justify-end gap-2"><button type="button" id="cancelScoreBtn" class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Cancel</button><button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Submit</button></div></form></div>`;
        document.body.appendChild(modal);
    } else {
        modal.style.display = 'flex';
        modal.querySelector('input[type="text"]').value = participant_name;
        modal.querySelector('#scoreInput').value = score || '';
        modal.querySelector('#commentsInput').value = comments || '';
    }
    modal.style.display = 'flex';
    // Cancel button
    modal.querySelector('#cancelScoreBtn').onclick = function () {
        modal.style.display = 'none';
    };
    // Submit form
    modal.querySelector('#scoreForm').onsubmit = async function (e) {
        e.preventDefault();
        const token = localStorage.getItem('token');
        const scoreVal = modal.querySelector('#scoreInput').value;
        const commentsVal = modal.querySelector('#commentsInput').value;
        try {
            // Validate score
            if (!scoreVal || isNaN(scoreVal) || Number(scoreVal) < 1 || Number(scoreVal) > 100) {
                alert('Score must be a number between 1 and 100.');
                return;
            }
            const res = await fetch('/api/judging/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ event_id, participant_id, score: Number(scoreVal), comments: commentsVal })
            });
            if (!res.ok) throw new Error('Failed to submit score');
            modal.style.display = 'none';
            // Refresh participants list
            document.getElementById('judgeEventSelect').dispatchEvent(new Event('change'));
        } catch (err) {
            alert(err.message);
        }
    };
}; 