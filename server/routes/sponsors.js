const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Get all sponsors
router.get('/', async (req, res) => {
    try {
        const [sponsors] = await db.query(`
            SELECT s.*, u.name as contact_name, u.email as contact_email
            FROM sponsors s
            LEFT JOIN users u ON s.user_id = u.user_id
            ORDER BY s.company_name ASC
        `);
        res.json(sponsors);
    } catch (error) {
        console.error('Error fetching sponsors:', error);
        res.status(500).json({ error: 'Failed to fetch sponsors' });
    }
});

// Get sponsor by ID
router.get('/:id', async (req, res) => {
    try {
        const [sponsors] = await db.query(`
            SELECT s.*, u.name as contact_name, u.email as contact_email
            FROM sponsors s
            LEFT JOIN users u ON s.user_id = u.user_id
            WHERE s.sponsor_id = ?
        `, [req.params.id]);

        if (sponsors.length === 0) {
            return res.status(404).json({ error: 'Sponsor not found' });
        }

        res.json(sponsors[0]);
    } catch (error) {
        console.error('Error fetching sponsor:', error);
        res.status(500).json({ error: 'Failed to fetch sponsor' });
    }
});

// Create new sponsor
router.post('/', async (req, res) => {
    try {
        const {
            company_name,
            contact_person,
            email,
            phone,
            sponsorship_level,
            amount,
            user_id
        } = req.body;

        const [result] = await db.query(`
            INSERT INTO sponsors (
                company_name, contact_person, email, phone,
                sponsorship_level, amount, user_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            company_name, contact_person, email, phone,
            sponsorship_level, amount, user_id
        ]);

        res.status(201).json({
            message: 'Sponsor created successfully',
            sponsor_id: result.insertId
        });
    } catch (error) {
        console.error('Error creating sponsor:', error);
        res.status(500).json({ error: 'Failed to create sponsor' });
    }
});

// Update sponsor
router.put('/:id', async (req, res) => {
    try {
        const {
            company_name,
            contact_person,
            email,
            phone,
            sponsorship_level,
            amount,
            user_id
        } = req.body;

        await db.query(`
            UPDATE sponsors SET
                company_name = ?,
                contact_person = ?,
                email = ?,
                phone = ?,
                sponsorship_level = ?,
                amount = ?,
                user_id = ?
            WHERE sponsor_id = ?
        `, [
            company_name, contact_person, email, phone,
            sponsorship_level, amount, user_id, req.params.id
        ]);

        res.json({ message: 'Sponsor updated successfully' });
    } catch (error) {
        console.error('Error updating sponsor:', error);
        res.status(500).json({ error: 'Failed to update sponsor' });
    }
});

// Delete sponsor
router.delete('/:id', async (req, res) => {
    try {
        // Check if sponsor has any sponsorships
        const [sponsorships] = await db.query(
            'SELECT COUNT(*) as count FROM sponsorships WHERE sponsor_id = ?',
            [req.params.id]
        );

        if (sponsorships[0].count > 0) {
            return res.status(400).json({
                error: 'Cannot delete sponsor with associated sponsorships'
            });
        }

        await db.query('DELETE FROM sponsors WHERE sponsor_id = ?', [req.params.id]);
        res.json({ message: 'Sponsor deleted successfully' });
    } catch (error) {
        console.error('Error deleting sponsor:', error);
        res.status(500).json({ error: 'Failed to delete sponsor' });
    }
});

// Get sponsor's sponsorships
router.get('/:id/sponsorships', async (req, res) => {
    try {
        const [sponsorships] = await db.query(`
            SELECT sp.*, e.event_name, u.name as organizer_name
            FROM sponsorships sp
            LEFT JOIN events e ON sp.event_id = e.event_id
            LEFT JOIN users u ON sp.user_id = u.user_id
            WHERE sp.sponsor_id = ?
            ORDER BY sp.created_at DESC
        `, [req.params.id]);

        res.json(sponsorships);
    } catch (error) {
        console.error('Error fetching sponsor sponsorships:', error);
        res.status(500).json({ error: 'Failed to fetch sponsor sponsorships' });
    }
});

// Get sponsor statistics
router.get('/:id/stats', async (req, res) => {
    try {
        const [stats] = await db.query(`
            SELECT 
                COUNT(sp.sponsorship_id) as total_sponsorships,
                SUM(sp.amount) as total_amount,
                AVG(sp.amount) as avg_amount,
                MAX(sp.amount) as max_amount,
                MIN(sp.amount) as min_amount
            FROM sponsors s
            LEFT JOIN sponsorships sp ON s.sponsor_id = sp.sponsor_id
            WHERE s.sponsor_id = ?
            GROUP BY s.sponsor_id
        `, [req.params.id]);

        res.json(stats[0] || {
            total_sponsorships: 0,
            total_amount: 0,
            avg_amount: 0,
            max_amount: 0,
            min_amount: 0
        });
    } catch (error) {
        console.error('Error fetching sponsor statistics:', error);
        res.status(500).json({ error: 'Failed to fetch sponsor statistics' });
    }
});

// Get all sponsorships by level
router.get('/by-level/:level', async (req, res) => {
    try {
        const [sponsors] = await db.query(`
            SELECT s.*, u.name as contact_name, u.email as contact_email,
                   COUNT(sp.sponsorship_id) as total_sponsorships,
                   SUM(sp.amount) as total_amount
            FROM sponsors s
            LEFT JOIN users u ON s.user_id = u.user_id
            LEFT JOIN sponsorships sp ON s.sponsor_id = sp.sponsor_id
            WHERE s.sponsorship_level = ?
            GROUP BY s.sponsor_id
            ORDER BY total_amount DESC
        `, [req.params.level]);

        res.json(sponsors);
    } catch (error) {
        console.error('Error fetching sponsors by level:', error);
        res.status(500).json({ error: 'Failed to fetch sponsors by level' });
    }
});

// Add sponsorship to event
router.post('/:id/sponsor-event', authenticateToken, async (req, res) => {
    try {
        const { event_id, amount } = req.body;

        // Check if event exists
        const [events] = await db.query(
            'SELECT * FROM events WHERE event_id = ?',
            [event_id]
        );

        if (events.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }

        // Check if sponsorship already exists
        const [existing] = await db.query(`
            SELECT * FROM sponsorships
            WHERE sponsor_id = ? AND event_id = ?
        `, [req.params.id, event_id]);

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Sponsorship already exists for this event' });
        }

        // Create sponsorship
        const [result] = await db.query(`
            INSERT INTO sponsorships (sponsor_id, event_id, amount)
            VALUES (?, ?, ?)
        `, [req.params.id, event_id, amount]);

        res.status(201).json({
            sponsorship_id: result.insertId,
            message: 'Sponsorship added successfully'
        });
    } catch (error) {
        console.error('Error adding sponsorship:', error);
        res.status(500).json({ error: 'Failed to add sponsorship' });
    }
});

// Get total sponsorship funds (SUM)
router.get('/total-funds', async (req, res) => {
    try {
        const [result] = await db.query('SELECT SUM(amount) AS total_funds FROM sponsorships');
        res.json({ total_funds: result[0].total_funds || 0 });
    } catch (error) {
        console.error('Error fetching total sponsorship funds:', error);
        res.status(500).json({ error: 'Failed to fetch total sponsorship funds' });
    }
});

// Get sponsorship details with sponsor payments (LEFT JOIN)
router.get('/details-with-payments', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT s.company_name, sp.amount AS sponsorship_amount, p.amount AS payment_amount, p.status AS payment_status
            FROM sponsors s
            LEFT JOIN sponsorships sp ON s.sponsor_id = sp.sponsor_id
            LEFT JOIN payments p ON s.sponsor_id = p.user_id
        `);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching sponsorship details with payments:', error);
        res.status(500).json({ error: 'Failed to fetch sponsorship details with payments' });
    }
});

// Get sponsor by user_id (for dashboard use)
router.get('/by-user/:user_id', async (req, res) => {
    try {
        const [sponsors] = await db.query('SELECT * FROM sponsors WHERE user_id = ?', [req.params.user_id]);
        if (sponsors.length === 0) {
            return res.status(404).json({ error: 'Sponsor not found for this user_id' });
        }
        res.json(sponsors[0]);
    } catch (error) {
        console.error('Error fetching sponsor by user_id:', error);
        res.status(500).json({ error: 'Failed to fetch sponsor by user_id' });
    }
});

module.exports = router; 