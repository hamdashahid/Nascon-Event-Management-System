// auth.js - Handles user authentication and role-based access

// User roles and their permissions
const ROLES = {
    admin: {
        name: 'Administrator',
        dashboard: 'dashboard-admin.html',
        permissions: ['all']
    },
    participant: {
        name: 'Participant',
        dashboard: 'dashboard-participant.html',
        permissions: ['view_events', 'register_events', 'view_teams', 'manage_teams', 'view_payments', 'make_payments']
    },
    organizer: {
        name: 'Organizer',
        dashboard: 'dashboard-organizer.html',
        permissions: ['manage_events', 'view_participants', 'manage_venues', 'view_payments']
    },
    judge: {
        name: 'Judge',
        dashboard: 'dashboard-judge.html',
        permissions: ['view_events', 'manage_scores', 'view_participants']
    },
    sponsor: {
        name: 'Sponsor',
        dashboard: 'dashboard-sponsor.html',
        permissions: ['view_events', 'manage_sponsorships', 'view_payments']
    }
};

// Add token to request headers
const addAuthHeader = (headers = {}) => {
    const token = localStorage.getItem('token');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};

// Handle API response
const handleResponse = async (response) => {
    if (response.ok) {
        return await response.json();
    }

    const error = await response.json();
    if (response.status === 401 && error.error === 'Token expired') {
        // Token expired, redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/pages/login.html';
        throw new Error('Session expired. Please login again.');
    }
    throw new Error(error.message || 'Request failed');
};

// Register new user
async function registerUser(userData) {
    try {
        const response = await fetch('/api/users/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });

        const data = await handleResponse(response);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        return data;
    } catch (error) {
        console.error('Registration error:', error);
        throw error;
    }
}

// Login user
async function loginUser(email, password) {
    try {
        const response = await fetch('/api/users/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await handleResponse(response);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        // Redirect to appropriate dashboard based on role
        const role = data.user.role;
        if (ROLES[role]) {
            window.location.href = `/pages/${ROLES[role].dashboard}`;
        } else {
            throw new Error('Invalid user role');
        }
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

// Logout user
function logoutUser() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/pages/login.html';
}

// Check if user is authenticated
function isAuthenticated() {
    return !!localStorage.getItem('token');
}

// Get current user
function getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

// Make authenticated API request
async function authenticatedFetch(url, options = {}) {
    try {
        const headers = addAuthHeader(options.headers || {});
        const response = await fetch(url, { ...options, headers });
        return await handleResponse(response);
    } catch (error) {
        console.error('API request error:', error);
        throw error;
    }
}

// Check if user has required permission
function hasPermission(permission) {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return false;

    const role = ROLES[user.role];
    if (!role) return false;

    return role.permissions.includes('all') || role.permissions.includes(permission);
}

// Get current user's role
function getCurrentUserRole() {
    const user = JSON.parse(localStorage.getItem('user'));
    return user ? user.role : null;
}

// Initialize authentication check
function initAuth() {
    // Check if user is on a protected page
    const protectedPages = [
        'dashboard-admin.html',
        'dashboard-participant.html',
        'dashboard-organizer.html',
        'dashboard-judge.html',
        'dashboard-sponsor.html'
    ];

    const currentPage = window.location.pathname.split('/').pop();

    if (protectedPages.includes(currentPage)) {
        if (!isAuthenticated()) {
            window.location.href = '/pages/login.html';
            return;
        }

        const user = JSON.parse(localStorage.getItem('user'));
        const role = user.role;

        // Check if user has access to current page
        if (!ROLES[role] || ROLES[role].dashboard !== currentPage) {
            window.location.href = '/pages/login.html';
            return;
        }

        // Update UI based on user role
        updateUIForRole(role);
    }
}

// Update UI based on user role
function updateUIForRole(role) {
    // Update navigation menu
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        const requiredPermission = link.dataset.permission;
        if (requiredPermission && !hasPermission(requiredPermission)) {
            link.style.display = 'none';
        }
    });

    // Update user info in header
    const user = JSON.parse(localStorage.getItem('user'));
    const userInfoElement = document.getElementById('userInfo');
    if (userInfoElement) {
        userInfoElement.textContent = `${user.name} (${ROLES[role].name})`;
    }
}

// Export functions
window.auth = {
    registerUser,
    loginUser,
    logoutUser,
    isAuthenticated,
    getCurrentUser,
    authenticatedFetch,
    hasPermission,
    getCurrentUserRole,
    initAuth
}; 