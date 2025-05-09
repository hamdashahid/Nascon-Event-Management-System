const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { authenticateToken, generateToken } = require('../middleware/auth');
require('dotenv').config();

// Register new user
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Validate role
        const validRoles = ['admin', 'organizer', 'participant', 'sponsor', 'judge'];
        const finalRole = role.toLowerCase();
        if (!validRoles.includes(finalRole)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        // Check if email already exists
        const [existing] = await db.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Create user
        const [result] = await db.query(`
            INSERT INTO users (name, email, password, role)
            VALUES (?, ?, ?, ?)
        `, [name, email, password_hash, finalRole]);

        const user_id = result.insertId;

        // Add to respective table based on role
        if (finalRole === 'sponsor') {
            // Add minimal sponsor record (company_name can be same as name for now)
            await db.query(
                `INSERT INTO sponsors (company_name, contact_person, email, sponsorship_level, amount, user_id)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [name, name, email, 'silver', 0, user_id]
            );
        } else if (finalRole === 'judge') {
            // Add to judges table
            await db.query(
                `INSERT INTO judges (name, email) VALUES (?, ?)`,
                [name, email]
            );
        }
        // For organizer and participant, you may have additional tables or logic if needed

        // Generate JWT token
        const token = generateToken({ user_id, email, role: finalRole });

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                user_id,
                name,
                email,
                role: finalRole
            }
        });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const [users] = await db.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = users[0];

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = generateToken(user);

        res.json({
            token,
            user: {
                user_id: user.user_id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
});

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const [users] = await db.query(
            'SELECT user_id, name, email, role, created_at, status FROM users WHERE user_id = ?',
            [req.user.user_id]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(users[0]);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ error: 'Failed to fetch user profile' });
    }
});

// Update user profile
router.put('/profile', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { name, email, current_password, new_password } = req.body;

        // Get current user data
        const [users] = await db.query(
            'SELECT * FROM users WHERE user_id = ?',
            [decoded.user_id]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = users[0];

        // Verify current password if changing password
        if (new_password) {
            const validPassword = await bcrypt.compare(current_password, user.password);
            if (!validPassword) {
                return res.status(401).json({ error: 'Current password is incorrect' });
            }

            // Hash new password
            const salt = await bcrypt.genSalt(10);
            const password_hash = await bcrypt.hash(new_password, salt);

            await db.query(
                'UPDATE users SET name = ?, email = ?, password = ? WHERE user_id = ?',
                [name, email, password_hash, decoded.user_id]
            );
        } else {
            await db.query(
                'UPDATE users SET name = ?, email = ? WHERE user_id = ?',
                [name, email, decoded.user_id]
            );
        }

        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Get all users (admin only)
router.get('/', async (req, res) => {
    try {
        let { role, order_by } = req.query;
        let sql = 'SELECT user_id, name, email, role, created_at FROM users';
        const params = [];
        if (role) {
            sql += ' WHERE role = ?';
            params.push(role);
        }
        // Allow ordering by name or created_at
        if (order_by === 'created_at') {
            sql += ' ORDER BY created_at DESC';
        } else {
            sql += ' ORDER BY name ASC';
        }
        const [users] = await db.query(sql, params);
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Error fetching users' });
    }
});

// Update user permissions (admin only)
router.put('/:id/permissions', async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        await db.query('UPDATE users SET role = ? WHERE user_id = ?', [role, id]);
        res.json({ message: 'User permissions updated successfully' });
    } catch (error) {
        console.error('Error updating permissions:', error);
        res.status(500).json({ error: 'Error updating permissions' });
    }
});

// Get user stats (total and by role)
router.get('/stats', async (req, res) => {
    try {
        const [totalRows] = await db.query('SELECT COUNT(*) as total FROM users');
        const [roleRows] = await db.query('SELECT role, COUNT(*) as count FROM users GROUP BY role');
        const byRole = {};
        roleRows.forEach(row => { byRole[row.role] = row.count; });
        res.json({
            total: totalRows[0].total || 0,
            byRole
        });
    } catch (error) {
        console.error('Error fetching user stats:', error);
        res.status(500).json({ error: 'Failed to fetch user stats' });
    }
});

// Sponsorships total revenue
router.get('/total', async (req, res) => {
    try {
        const [result] = await db.query('SELECT SUM(amount) as total FROM sponsorships WHERE status = "Confirmed"');
        res.json({ total: result[0].total || 0 });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch sponsorship revenue' });
    }
});

// Accommodation occupancy
router.get('/occupancy', async (req, res) => {
    try {
        const [result] = await db.query('SELECT COUNT(*) as occupied, (SELECT COUNT(*) FROM accommodations) as total FROM accommodations WHERE status = "Occupied"');
        res.json(result[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch accommodation occupancy' });
    }
});

// Edit user (admin only)
router.patch('/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const { name, email, role, status, password } = req.body;
        // Build update fields
        let fields = [];
        let values = [];
        if (name) { fields.push('name = ?'); values.push(name); }
        if (email) { fields.push('email = ?'); values.push(email); }
        if (role) { fields.push('role = ?'); values.push(role); }
        if (status) { fields.push('status = ?'); values.push(status); }
        if (password) {
            const bcrypt = require('bcrypt');
            const salt = await bcrypt.genSalt(10);
            const password_hash = await bcrypt.hash(password, salt);
            fields.push('password = ?');
            values.push(password_hash);
        }
        if (fields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }
        values.push(userId);
        const [result] = await db.query(
            `UPDATE users SET ${fields.join(', ')} WHERE user_id = ?`,
            values
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ message: 'User updated successfully' });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// Delete user (admin only)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await db.query('DELETE FROM users WHERE user_id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// Admin: Add user
router.post('/', async (req, res) => {
    try {
        const { name, email, password, role, status } = req.body;
        // Validate role
        const validRoles = ['admin', 'organizer', 'participant', 'sponsor', 'judge'];
        const finalRole = role ? role.toLowerCase() : 'participant';
        if (!validRoles.includes(finalRole)) {
            return res.status(400).json({ error: 'Invalid role' });
        }
        // Check if email already exists
        const [existing] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);
        // Create user
        const [result] = await db.query(
            'INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)',
            [name, email, password_hash, finalRole, status || 'active']
        );
        res.status(201).json({
            message: 'User added successfully',
            user: {
                user_id: result.insertId,
                name,
                email,
                role: finalRole,
                status: status || 'active'
            }
        });
    } catch (error) {
        console.error('Error adding user:', error);
        res.status(500).json({ error: 'Failed to add user' });
    }
});

// Get accommodation assignment for a user (participant dashboard)
router.get('/:id/accommodation', async (req, res) => {
    // No user-to-accommodation mapping in schema
    res.json(null);
});

// Get all payments for a user (participant dashboard)
router.get('/:id/payments', async (req, res) => {
    try {
        const userId = req.params.id;
        const [rows] = await db.query(
            `SELECT amount, status, payment_date, payment_type
             FROM payments
             WHERE user_id = ?
             ORDER BY payment_date DESC`,
            [userId]
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching user payments:', error);
        res.status(500).json({ error: 'Failed to fetch payments' });
    }
});

// Get all events a user is registered for (participant dashboard)
router.get('/:id/events', async (req, res) => {
    try {
        const userId = req.params.id;
        const [rows] = await db.query(
            `SELECT e.event_id, e.event_name, e.event_date, v.venue_name
             FROM participants p
             JOIN events e ON p.event_id = e.event_id
             LEFT JOIN venues v ON e.venue_id = v.venue_id
             WHERE p.user_id = ?
             ORDER BY e.event_date ASC`,
            [userId]
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching user events:', error);
        res.status(500).json({ error: 'Failed to fetch user events' });
    }
});

// Get a single user by ID (admin only)
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [users] = await db.query('SELECT user_id, name, email, role, status, created_at FROM users WHERE user_id = ?', [id]);
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(users[0]);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// Refresh token
router.post('/refresh-token', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(401).json({ error: 'Refresh token required' });
        }

        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const [users] = await db.query(
            'SELECT * FROM users WHERE user_id = ?',
            [decoded.user_id]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = users[0];
        const newToken = generateToken(user);

        res.json({ token: newToken });
    } catch (error) {
        console.error('Error refreshing token:', error);
        res.status(401).json({ error: 'Invalid refresh token' });
    }
});

module.exports = router;