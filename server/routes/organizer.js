const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Get all organizers
router.get('/', async (req, res) => {
    try {
        const [organizers] = await db.query(`
            SELECT u.*, 
                   COUNT(DISTINCT e.event_id) as total_events,
                   COUNT(DISTINCT p.participant_id) as total_participants
            FROM users u
            LEFT JOIN events e ON u.user_id = e.organizer_id
            LEFT JOIN participants p ON e.event_id = p.event_id
            WHERE u.role = 'organizer'
            GROUP BY u.user_id
            ORDER BY u.name
        `);
        res.json(organizers);
    } catch (error) {
        console.error('Error fetching organizers:', error);
        res.status(500).json({ error: 'Failed to fetch organizers' });
    }
});

// Get organizer by ID
router.get('/:id', async (req, res) => {
    try {
        const [organizers] = await db.query(`
            SELECT u.*, 
                   COUNT(DISTINCT e.event_id) as total_events,
                   COUNT(DISTINCT p.participant_id) as total_participants
            FROM users u
            LEFT JOIN events e ON u.user_id = e.organizer_id
            LEFT JOIN participants p ON e.event_id = p.event_id
            WHERE u.user_id = ? AND u.role = 'organizer'
            GROUP BY u.user_id
        `, [req.params.id]);

        if (organizers.length === 0) {
            return res.status(404).json({ error: 'Organizer not found' });
        }

        res.json(organizers[0]);
    } catch (error) {
        console.error('Error fetching organizer:', error);
        res.status(500).json({ error: 'Failed to fetch organizer' });
    }
});

// Get organizer's events
router.get('/:id/events', async (req, res) => {
    try {
        const [events] = await db.query(`
            SELECT e.*, 
                   v.venue_name,
                   COUNT(p.participant_id) as registered_participants
            FROM events e
            LEFT JOIN venues v ON e.venue_id = v.venue_id
            LEFT JOIN participants p ON e.event_id = p.event_id
            WHERE e.organizer_id = ?
            GROUP BY e.event_id
            ORDER BY e.event_date DESC
        `, [req.params.id]);

        res.json(events);
    } catch (error) {
        console.error('Error fetching organizer events:', error);
        res.status(500).json({ error: 'Failed to fetch organizer events' });
    }
});

// Get organizer's event statistics
router.get('/:id/stats', async (req, res) => {
    try {
        const [stats] = await db.query(`
            SELECT 
                COUNT(DISTINCT e.event_id) as total_events,
                COUNT(DISTINCT p.participant_id) as total_participants,
                SUM(e.registration_fee * e.registered_participants) as total_revenue,
                AVG(e.registered_participants) as avg_participants,
                COUNT(DISTINCT CASE 
                    WHEN e.event_date >= CURRENT_DATE THEN e.event_id 
                END) as upcoming_events,
                COUNT(DISTINCT CASE 
                    WHEN e.event_date < CURRENT_DATE THEN e.event_id 
                END) as past_events
            FROM users u
            LEFT JOIN events e ON u.user_id = e.organizer_id
            LEFT JOIN participants p ON e.event_id = p.event_id
            WHERE u.user_id = ? AND u.role = 'organizer'
        `, [req.params.id]);

        res.json(stats[0] || {
            total_events: 0,
            total_participants: 0,
            total_revenue: 0,
            avg_participants: 0,
            upcoming_events: 0,
            past_events: 0
        });
    } catch (error) {
        console.error('Error fetching organizer statistics:', error);
        res.status(500).json({ error: 'Failed to fetch organizer statistics' });
    }
});

// Get organizer's venue usage
router.get('/:id/venues', async (req, res) => {
    try {
        const [venues] = await db.query(`
            SELECT 
                v.venue_id,
                v.venue_name,
                COUNT(e.event_id) as total_events,
                MAX(e.event_date) as last_used,
                SUM(e.registered_participants) as total_participants
            FROM venues v
            JOIN events e ON v.venue_id = e.venue_id
            WHERE e.organizer_id = ?
            GROUP BY v.venue_id, v.venue_name
            ORDER BY total_events DESC
        `, [req.params.id]);

        res.json(venues);
    } catch (error) {
        console.error('Error fetching organizer venues:', error);
        res.status(500).json({ error: 'Failed to fetch organizer venues' });
    }
});

// Get organizer's participant demographics
router.get('/:id/demographics', async (req, res) => {
    try {
        const [demographics] = await db.query(`
            SELECT 
                u.role,
                COUNT(DISTINCT p.participant_id) as count,
                COUNT(DISTINCT CASE 
                    WHEN e.event_date >= CURRENT_DATE THEN p.participant_id 
                END) as upcoming_participants
            FROM users u
            JOIN participants p ON u.user_id = p.user_id
            JOIN events e ON p.event_id = e.event_id
            WHERE e.organizer_id = ?
            GROUP BY u.role
        `, [req.params.id]);

        res.json(demographics);
    } catch (error) {
        console.error('Error fetching participant demographics:', error);
        res.status(500).json({ error: 'Failed to fetch participant demographics' });
    }
});

// Update organizer profile
router.put('/:id/profile', authenticateToken, async (req, res) => {
    try {
        const { name, email } = req.body;

        // Validate required fields
        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required' });
        }

        // Check if email is already taken by another user
        const [existing] = await db.query(
            'SELECT * FROM users WHERE email = ? AND user_id != ?',
            [email, req.params.id]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Email is already taken' });
        }

        await db.query(`
            UPDATE users SET
                name = ?,
                email = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ? AND role = 'organizer'
        `, [name, email, req.params.id]);

        res.json({ message: 'Organizer profile updated successfully' });
    } catch (error) {
        console.error('Error updating organizer profile:', error);
        res.status(500).json({ error: 'Failed to update organizer profile' });
    }
});

// Get organizer's payment history
router.get('/:id/payments', async (req, res) => {
    try {
        const [payments] = await db.query(`
            SELECT p.*, 
                   e.event_name,
                   u.name as participant_name
            FROM payments p
            JOIN events e ON p.event_id = e.event_id
            JOIN users u ON p.user_id = u.user_id
            WHERE e.organizer_id = ?
            ORDER BY p.payment_date DESC
        `, [req.params.id]);

        res.json(payments);
    } catch (error) {
        console.error('Error fetching organizer payments:', error);
        res.status(500).json({ error: 'Failed to fetch organizer payments' });
    }
});

// Get participants for all events organized by this organizer
router.get('/:id/participants', async (req, res) => {
    try {
        const [participants] = await db.query(`
            SELECT 
                e.event_id,
                e.event_name,
                u.user_id,
                u.name as participant_name,
                u.email as participant_email,
                p.registration_date,
                COALESCE(pay.status, 'pending') as payment_status,
                COALESCE(pay.amount, 0) as payment_amount
            FROM events e
            JOIN participants p ON e.event_id = p.event_id
            JOIN users u ON p.user_id = u.user_id
            LEFT JOIN payments pay ON p.user_id = pay.user_id AND p.event_id = pay.event_id
            WHERE e.organizer_id = ?
            ORDER BY e.event_date DESC, u.name ASC
        `, [req.params.id]);

        res.json(participants);
    } catch (error) {
        console.error('Error fetching organizer participants:', error);
        res.status(500).json({ error: 'Failed to fetch participants' });
    }
});

module.exports = router; 