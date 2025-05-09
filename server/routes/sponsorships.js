const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Get all sponsorships
router.get('/', async (req, res) => {
    try {
        const [sponsorships] = await db.query(`
            SELECT sp.*, 
                   s.company_name,
                   e.event_name,
                   u.name as organizer_name
            FROM sponsorships sp
            LEFT JOIN sponsors s ON sp.sponsor_id = s.sponsor_id
            LEFT JOIN events e ON sp.event_id = e.event_id
            LEFT JOIN users u ON sp.user_id = u.user_id
            ORDER BY sp.created_at DESC
        `);
        res.json(sponsorships);
    } catch (error) {
        console.error('Error fetching sponsorships:', error);
        res.status(500).json({ error: 'Failed to fetch sponsorships' });
    }
});

// Get sponsorship by ID
router.get('/:id', async (req, res) => {
    try {
        const [sponsorships] = await db.query(`
            SELECT sp.*, 
                   s.company_name,
                   e.event_name,
                   u.name as organizer_name
            FROM sponsorships sp
            LEFT JOIN sponsors s ON sp.sponsor_id = s.sponsor_id
            LEFT JOIN events e ON sp.event_id = e.event_id
            LEFT JOIN users u ON sp.user_id = u.user_id
            WHERE sp.sponsorship_id = ?
        `, [req.params.id]);

        if (sponsorships.length === 0) {
            return res.status(404).json({ error: 'Sponsorship not found' });
        }

        res.json(sponsorships[0]);
    } catch (error) {
        console.error('Error fetching sponsorship:', error);
        res.status(500).json({ error: 'Failed to fetch sponsorship' });
    }
});

// Create new sponsorship
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { sponsor_id, event_id, user_id, sponsorship_type, amount } = req.body;

        // Validate sponsorship type
        const validTypes = ['Gold', 'Silver', 'Title'];
        if (!validTypes.includes(sponsorship_type)) {
            return res.status(400).json({ error: 'Invalid sponsorship type' });
        }

        const [result] = await db.query(`
            INSERT INTO sponsorships (sponsor_id, event_id, user_id, sponsorship_type, amount)
            VALUES (?, ?, ?, ?, ?)
        `, [sponsor_id, event_id, user_id, sponsorship_type, amount]);

        res.status(201).json({
            message: 'Sponsorship created successfully',
            sponsorship_id: result.insertId
        });
    } catch (error) {
        console.error('Error creating sponsorship:', error);
        res.status(500).json({ error: 'Failed to create sponsorship' });
    }
});

// Update sponsorship
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { sponsorship_type, amount, status } = req.body;

        // Validate sponsorship type if provided
        if (sponsorship_type) {
            const validTypes = ['Gold', 'Silver', 'Title'];
            if (!validTypes.includes(sponsorship_type)) {
                return res.status(400).json({ error: 'Invalid sponsorship type' });
            }
        }

        await db.query(`
            UPDATE sponsorships SET
                sponsorship_type = COALESCE(?, sponsorship_type),
                amount = COALESCE(?, amount),
                status = COALESCE(?, status)
            WHERE sponsorship_id = ?
        `, [sponsorship_type, amount, status, req.params.id]);

        res.json({ message: 'Sponsorship updated successfully' });
    } catch (error) {
        console.error('Error updating sponsorship:', error);
        res.status(500).json({ error: 'Failed to update sponsorship' });
    }
});

// Delete sponsorship
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        await db.query('DELETE FROM sponsorships WHERE sponsorship_id = ?', [req.params.id]);
        res.json({ message: 'Sponsorship deleted successfully' });
    } catch (error) {
        console.error('Error deleting sponsorship:', error);
        res.status(500).json({ error: 'Failed to delete sponsorship' });
    }
});

// Get sponsorships by event
router.get('/event/:event_id', async (req, res) => {
    try {
        const [sponsorships] = await db.query(`
            SELECT sp.*, 
                   s.company_name,
                   u.name as organizer_name
            FROM sponsorships sp
            LEFT JOIN sponsors s ON sp.sponsor_id = s.sponsor_id
            LEFT JOIN users u ON sp.user_id = u.user_id
            WHERE sp.event_id = ?
            ORDER BY sp.created_at DESC
        `, [req.params.event_id]);

        res.json(sponsorships);
    } catch (error) {
        console.error('Error fetching event sponsorships:', error);
        res.status(500).json({ error: 'Failed to fetch event sponsorships' });
    }
});

// Get sponsorships by sponsor
router.get('/sponsor/:sponsor_id', async (req, res) => {
    try {
        const [sponsorships] = await db.query(`
            SELECT sp.*, 
                   e.event_name,
                   u.name as organizer_name
            FROM sponsorships sp
            LEFT JOIN events e ON sp.event_id = e.event_id
            LEFT JOIN users u ON sp.user_id = u.user_id
            WHERE sp.sponsor_id = ?
            ORDER BY sp.created_at DESC
        `, [req.params.sponsor_id]);

        res.json(sponsorships);
    } catch (error) {
        console.error('Error fetching sponsor sponsorships:', error);
        res.status(500).json({ error: 'Failed to fetch sponsor sponsorships' });
    }
});

// Get sponsorship statistics
router.get('/stats', async (req, res) => {
    try {
        const [stats] = await db.query(`
            SELECT 
                COUNT(sponsorship_id) as total_sponsorships,
                SUM(amount) as total_amount,
                AVG(amount) as average_amount,
                MAX(amount) as highest_amount,
                MIN(amount) as lowest_amount,
                COUNT(DISTINCT sponsor_id) as total_sponsors,
                COUNT(DISTINCT event_id) as total_events
            FROM sponsorships
        `);

        res.json(stats[0] || {
            total_sponsorships: 0,
            total_amount: 0,
            average_amount: 0,
            highest_amount: 0,
            lowest_amount: 0,
            total_sponsors: 0,
            total_events: 0
        });
    } catch (error) {
        console.error('Error fetching sponsorship statistics:', error);
        res.status(500).json({ error: 'Failed to fetch sponsorship statistics' });
    }
});

// Get sponsorships by type
router.get('/by-type/:type', async (req, res) => {
    try {
        const [sponsorships] = await db.query(`
            SELECT sp.*, 
                   s.company_name,
                   e.event_name,
                   u.name as organizer_name
            FROM sponsorships sp
            LEFT JOIN sponsors s ON sp.sponsor_id = s.sponsor_id
            LEFT JOIN events e ON sp.event_id = e.event_id
            LEFT JOIN users u ON sp.user_id = u.user_id
            WHERE sp.sponsorship_type = ?
            ORDER BY sp.amount DESC
        `, [req.params.type]);

        res.json(sponsorships);
    } catch (error) {
        console.error('Error fetching sponsorships by type:', error);
        res.status(500).json({ error: 'Failed to fetch sponsorships by type' });
    }
});

module.exports = router; 