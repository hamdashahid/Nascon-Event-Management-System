const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Get all payments
router.get('/', async (req, res) => {
    try {
        const [payments] = await db.query(`
            SELECT p.*, 
                   u.name as user_name,
                   e.event_name
            FROM payments p
            LEFT JOIN users u ON p.user_id = u.user_id
            LEFT JOIN events e ON p.event_id = e.event_id
            ORDER BY p.payment_date DESC
        `);
        res.json(payments);
    } catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({ error: 'Failed to fetch payments' });
    }
});

// Get payment by ID
router.get('/:id', async (req, res) => {
    try {
        const [payments] = await db.query(`
            SELECT p.*, 
                   u.name as user_name,
                   e.event_name
            FROM payments p
            LEFT JOIN users u ON p.user_id = u.user_id
            LEFT JOIN events e ON p.event_id = e.event_id
            WHERE p.payment_id = ?
        `, [req.params.id]);

        if (payments.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        res.json(payments[0]);
    } catch (error) {
        console.error('Error fetching payment:', error);
        res.status(500).json({ error: 'Failed to fetch payment' });
    }
});

// Create new payment
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { user_id, event_id, amount, payment_type } = req.body;

        // Validate payment type
        const validTypes = ['registration', 'accommodation', 'sponsorship'];
        if (!validTypes.includes(payment_type)) {
            return res.status(400).json({ error: 'Invalid payment type' });
        }

        // Check for duplicate payment
        const [existing] = await db.query(`
            SELECT * FROM payments 
            WHERE user_id = ? AND event_id = ? AND payment_type = ?
        `, [user_id, event_id, payment_type]);

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Payment already exists for this user, event, and type' });
        }

        const [result] = await db.query(`
            INSERT INTO payments (user_id, event_id, amount, payment_type, status)
            VALUES (?, ?, ?, ?, 'pending')
        `, [user_id, event_id, amount, payment_type]);

        res.status(201).json({
            message: 'Payment created successfully',
            payment_id: result.insertId
        });
    } catch (error) {
        console.error('Error creating payment:', error);
        res.status(500).json({ error: 'Failed to create payment' });
    }
});

// Update payment status
router.put('/:id/status', authenticateToken, async (req, res) => {
    try {
        const { status } = req.body;

        // Validate status
        const validStatuses = ['pending', 'completed', 'failed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid payment status' });
        }

        await db.query(`
            UPDATE payments SET
                status = ?,
                payment_date = CASE 
                    WHEN ? = 'completed' THEN CURRENT_TIMESTAMP 
                    ELSE payment_date 
                END
            WHERE payment_id = ?
        `, [status, status, req.params.id]);

        res.json({ message: 'Payment status updated successfully' });
    } catch (error) {
        console.error('Error updating payment status:', error);
        res.status(500).json({ error: 'Failed to update payment status' });
    }
});

// Get payments by user
router.get('/user/:user_id', async (req, res) => {
    try {
        const [payments] = await db.query(`
            SELECT p.*, 
                   e.event_name
            FROM payments p
            LEFT JOIN events e ON p.event_id = e.event_id
            WHERE p.user_id = ?
            ORDER BY p.payment_date DESC
        `, [req.params.user_id]);

        res.json(payments);
    } catch (error) {
        console.error('Error fetching user payments:', error);
        res.status(500).json({ error: 'Failed to fetch user payments' });
    }
});

// Get payments by event
router.get('/event/:event_id', async (req, res) => {
    try {
        const [payments] = await db.query(`
            SELECT p.*, 
                   u.name as user_name
            FROM payments p
            LEFT JOIN users u ON p.user_id = u.user_id
            WHERE p.event_id = ?
            ORDER BY p.payment_date DESC
        `, [req.params.event_id]);

        res.json(payments);
    } catch (error) {
        console.error('Error fetching event payments:', error);
        res.status(500).json({ error: 'Failed to fetch event payments' });
    }
});

// Get payment statistics
router.get('/stats', async (req, res) => {
    try {
        const [stats] = await db.query(`
            SELECT 
                COUNT(payment_id) as total_payments,
                SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_revenue,
                AVG(CASE WHEN status = 'completed' THEN amount ELSE NULL END) as average_amount,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payments,
                COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_payments,
                COUNT(DISTINCT user_id) as total_users,
                COUNT(DISTINCT event_id) as total_events
            FROM payments
        `);

        res.json(stats[0] || {
            total_payments: 0,
            total_revenue: 0,
            average_amount: 0,
            pending_payments: 0,
            failed_payments: 0,
            total_users: 0,
            total_events: 0
        });
    } catch (error) {
        console.error('Error fetching payment statistics:', error);
        res.status(500).json({ error: 'Failed to fetch payment statistics' });
    }
});

// Get payments by type
router.get('/by-type/:type', async (req, res) => {
    try {
        const [payments] = await db.query(`
            SELECT p.*, 
                   u.name as user_name,
                   e.event_name
            FROM payments p
            LEFT JOIN users u ON p.user_id = u.user_id
            LEFT JOIN events e ON p.event_id = e.event_id
            WHERE p.payment_type = ?
            ORDER BY p.payment_date DESC
        `, [req.params.type]);

        res.json(payments);
    } catch (error) {
        console.error('Error fetching payments by type:', error);
        res.status(500).json({ error: 'Failed to fetch payments by type' });
    }
});

// Get payments by status
router.get('/by-status/:status', async (req, res) => {
    try {
        const [payments] = await db.query(`
            SELECT p.*, 
                   u.name as user_name,
                   e.event_name
            FROM payments p
            LEFT JOIN users u ON p.user_id = u.user_id
            LEFT JOIN events e ON p.event_id = e.event_id
            WHERE p.status = ?
            ORDER BY p.payment_date DESC
        `, [req.params.status]);

        res.json(payments);
    } catch (error) {
        console.error('Error fetching payments by status:', error);
        res.status(500).json({ error: 'Failed to fetch payments by status' });
    }
});

module.exports = router; 