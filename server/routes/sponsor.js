const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Get all sponsors
router.get('/', async (req, res) => {
    try {
        const [sponsors] = await db.query(`
            SELECT s.*, 
                   u.name as user_name,
                   COUNT(DISTINCT sp.sponsorship_id) as total_sponsorships,
                   SUM(sp.amount) as total_sponsored
            FROM sponsors s
            LEFT JOIN users u ON s.user_id = u.user_id
            LEFT JOIN sponsorships sp ON s.sponsor_id = sp.sponsor_id
            GROUP BY s.sponsor_id
            ORDER BY s.company_name
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
            SELECT s.*, 
                   u.name as user_name,
                   COUNT(DISTINCT sp.sponsorship_id) as total_sponsorships,
                   SUM(sp.amount) as total_sponsored
            FROM sponsors s
            LEFT JOIN users u ON s.user_id = u.user_id
            LEFT JOIN sponsorships sp ON s.sponsor_id = sp.sponsor_id
            WHERE s.sponsor_id = ?
            GROUP BY s.sponsor_id
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
router.post('/', authenticateToken, async (req, res) => {
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

        // Validate required fields
        if (!company_name || !contact_person || !email || !sponsorship_level) {
            return res.status(400).json({ error: 'Required fields missing' });
        }

        // Validate sponsorship level
        const validLevels = ['Gold', 'Silver', 'Bronze'];
        if (!validLevels.includes(sponsorship_level)) {
            return res.status(400).json({ error: 'Invalid sponsorship level' });
        }

        const [result] = await db.query(`
            INSERT INTO sponsors (
                company_name, contact_person, email, phone, 
                sponsorship_level, amount, user_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [company_name, contact_person, email, phone, sponsorship_level, amount, user_id]);

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
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const {
            company_name,
            contact_person,
            email,
            phone,
            sponsorship_level,
            amount
        } = req.body;

        // Validate sponsorship level if provided
        if (sponsorship_level) {
            const validLevels = ['Gold', 'Silver', 'Bronze'];
            if (!validLevels.includes(sponsorship_level)) {
                return res.status(400).json({ error: 'Invalid sponsorship level' });
            }
        }

        await db.query(`
            UPDATE sponsors SET
                company_name = COALESCE(?, company_name),
                contact_person = COALESCE(?, contact_person),
                email = COALESCE(?, email),
                phone = COALESCE(?, phone),
                sponsorship_level = COALESCE(?, sponsorship_level),
                amount = COALESCE(?, amount),
                updated_at = CURRENT_TIMESTAMP
            WHERE sponsor_id = ?
        `, [company_name, contact_person, email, phone, sponsorship_level, amount, req.params.id]);

        res.json({ message: 'Sponsor updated successfully' });
    } catch (error) {
        console.error('Error updating sponsor:', error);
        res.status(500).json({ error: 'Failed to update sponsor' });
    }
});

// Delete sponsor
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        // Check if sponsor has any sponsorships
        const [sponsorships] = await db.query(
            'SELECT COUNT(*) as count FROM sponsorships WHERE sponsor_id = ?',
            [req.params.id]
        );

        if (sponsorships[0].count > 0) {
            return res.status(400).json({
                error: 'Cannot delete sponsor with existing sponsorships'
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
            SELECT sp.*, 
                   e.event_name,
                   u.name as organizer_name
            FROM sponsorships sp
            JOIN events e ON sp.event_id = e.event_id
            JOIN users u ON e.organizer_id = u.user_id
            WHERE sp.sponsor_id = ?
            ORDER BY sp.created_at DESC
        `, [req.params.id]);

        res.json(sponsorships);
    } catch (error) {
        console.error('Error fetching sponsor sponsorships:', error);
        res.status(500).json({ error: 'Failed to fetch sponsor sponsorships' });
    }
});

// Get sponsor's statistics
router.get('/:id/stats', async (req, res) => {
    try {
        const [stats] = await db.query(`
            SELECT 
                COUNT(DISTINCT sp.sponsorship_id) as total_sponsorships,
                SUM(sp.amount) as total_sponsored,
                COUNT(DISTINCT sp.event_id) as total_events,
                AVG(sp.amount) as average_sponsorship,
                MAX(sp.amount) as highest_sponsorship,
                MIN(sp.amount) as lowest_sponsorship,
                COUNT(DISTINCT CASE 
                    WHEN e.event_date >= CURRENT_DATE THEN sp.sponsorship_id 
                END) as active_sponsorships
            FROM sponsors s
            LEFT JOIN sponsorships sp ON s.sponsor_id = sp.sponsor_id
            LEFT JOIN events e ON sp.event_id = e.event_id
            WHERE s.sponsor_id = ?
        `, [req.params.id]);

        res.json(stats[0] || {
            total_sponsorships: 0,
            total_sponsored: 0,
            total_events: 0,
            average_sponsorship: 0,
            highest_sponsorship: 0,
            lowest_sponsorship: 0,
            active_sponsorships: 0
        });
    } catch (error) {
        console.error('Error fetching sponsor statistics:', error);
        res.status(500).json({ error: 'Failed to fetch sponsor statistics' });
    }
});

// Get sponsors by level
router.get('/by-level/:level', async (req, res) => {
    try {
        const validLevels = ['Gold', 'Silver', 'Bronze'];
        if (!validLevels.includes(req.params.level)) {
            return res.status(400).json({ error: 'Invalid sponsorship level' });
        }

        const [sponsors] = await db.query(`
            SELECT s.*, 
                   u.name as user_name,
                   COUNT(DISTINCT sp.sponsorship_id) as total_sponsorships,
                   SUM(sp.amount) as total_sponsored
            FROM sponsors s
            LEFT JOIN users u ON s.user_id = u.user_id
            LEFT JOIN sponsorships sp ON s.sponsor_id = sp.sponsor_id
            WHERE s.sponsorship_level = ?
            GROUP BY s.sponsor_id
            ORDER BY s.company_name
        `, [req.params.level]);

        res.json(sponsors);
    } catch (error) {
        console.error('Error fetching sponsors by level:', error);
        res.status(500).json({ error: 'Failed to fetch sponsors by level' });
    }
});

module.exports = router; 