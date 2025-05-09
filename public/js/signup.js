document.getElementById('signupForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const role = document.getElementById('signupRole').value;
    const errorDiv = document.getElementById('signupError');
    errorDiv.classList.add('hidden');
    errorDiv.textContent = '';
    try {
        const res = await fetch('/api/users/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, role })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Signup failed');
        // Store user and token
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        if (data.user.role === 'admin') {
            window.location.href = 'dashboard-admin.html';
        } else if (data.user.role == 'participant') {
            // Redirect to participant dashboard
            window.location.href = 'dashboard-participant.html';
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