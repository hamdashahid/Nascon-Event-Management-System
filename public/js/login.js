document.getElementById('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');
    errorDiv.classList.add('hidden');
    errorDiv.textContent = '';
    try {
        const res = await fetch('/api/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');
        // Store user and token
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        if (data.user.role === 'admin') {
            window.location.href = 'dashboard-admin.html';
        } else if (data.user.role == 'participant') {
            // Redirect to participant dashboard
            window.location.href = 'dashboard-participant.html';
            // window.location.href = 'dashboard.html';
        } else if (data.user.role == 'judge') {
            // Redirect to judge dashboard
            window.location.href = 'dashboard-judge.html';
        } else if (data.user.role == 'sponsor') {
            // Redirect to sponsor dashboard
            window.location.href = 'dashboard-sponsor.html';
        } else if (data.user.role == 'organizer') {
            // Redirect to organizer dashboard
            // Redirect to default dashboard
            window.location.href = 'dashboard-organizer.html';
        }
    } catch (err) {
        errorDiv.textContent = err.message;
        errorDiv.classList.remove('hidden');
    }
});