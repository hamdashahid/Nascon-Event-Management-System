const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Get all venues
router.get('/', async (req, res) => {
    try {
        const [venues] = await db.query(`
            SELECT v.*, 
                   COUNT(e.event_id) as total_events,
                   MAX(e.event_date) as last_event_date
            FROM venues v
            LEFT JOIN events e ON v.venue_id = e.venue_id
            GROUP BY v.venue_id
            ORDER BY v.venue_name ASC
        `);
        res.json(venues);
    } catch (error) {
        console.error('Error fetching venues:', error);
        res.status(500).json({ error: 'Failed to fetch venues' });
    }
});

// Get venue by ID
router.get('/:id', async (req, res) => {
    try {
        const [venues] = await db.query(`
            SELECT v.*, 
                   COUNT(e.event_id) as total_events,
                   MAX(e.event_date) as last_event_date
            FROM venues v
            LEFT JOIN events e ON v.venue_id = e.venue_id
            WHERE v.venue_id = ?
            GROUP BY v.venue_id
        `, [req.params.id]);

        if (venues.length === 0) {
            return res.status(404).json({ error: 'Venue not found' });
        }

        res.json(venues[0]);
    } catch (error) {
        console.error('Error fetching venue:', error);
        res.status(500).json({ error: 'Failed to fetch venue' });
    }
});

// Create new venue
router.post('/', async (req, res) => {
    try {
        const { venue_name, capacity, facilities, location } = req.body;

        const [result] = await db.query(`
            INSERT INTO venues (venue_name, capacity, facilities, location)
            VALUES (?, ?, ?, ?)
        `, [venue_name, capacity, facilities, location]);

        res.status(201).json({
            message: 'Venue created successfully',
            venue_id: result.insertId
        });
    } catch (error) {
        console.error('Error creating venue:', error);
        res.status(500).json({ error: 'Failed to create venue' });
    }
});

// Update venue
router.put('/:id', async (req, res) => {
    try {
        const { venue_name, capacity, facilities, location } = req.body;

        await db.query(`
            UPDATE venues SET
                venue_name = ?,
                capacity = ?,
                facilities = ?,
                location = ?
            WHERE venue_id = ?
        `, [venue_name, capacity, facilities, location, req.params.id]);

        res.json({ message: 'Venue updated successfully' });
    } catch (error) {
        console.error('Error updating venue:', error);
        res.status(500).json({ error: 'Failed to update venue' });
    }
});

// Delete venue
router.delete('/:id', async (req, res) => {
    try {
        // Check if venue has any events
        const [events] = await db.query(
            'SELECT COUNT(*) as count FROM events WHERE venue_id = ?',
            [req.params.id]
        );

        if (events[0].count > 0) {
            return res.status(400).json({
                error: 'Cannot delete venue with associated events'
            });
        }

        await db.query('DELETE FROM venues WHERE venue_id = ?', [req.params.id]);
        res.json({ message: 'Venue deleted successfully' });
    } catch (error) {
        console.error('Error deleting venue:', error);
        res.status(500).json({ error: 'Failed to delete venue' });
    }
});

// Get venue schedule
router.get('/:id/schedule', async (req, res) => {
    try {
        const [schedule] = await db.query(`
            SELECT e.event_id, e.event_name, e.event_date, e.category,
                   e.max_participants, e.registered_participants,
                   u.name as organizer_name
            FROM events e
            LEFT JOIN users u ON e.organizer_id = u.user_id
            WHERE e.venue_id = ?
            ORDER BY e.event_date ASC
        `, [req.params.id]);

        res.json(schedule);
    } catch (error) {
        console.error('Error fetching venue schedule:', error);
        res.status(500).json({ error: 'Failed to fetch venue schedule' });
    }
});

// Check venue availability
router.post('/:id/availability', async (req, res) => {
    try {
        const { date } = req.body;

        // Call the stored procedure to check availability
        const [availability] = await db.query(
            'CALL check_venue_availability(?, ?)',
            [req.params.id, date]
        );

        res.json(availability[0]);
    } catch (error) {
        console.error('Error checking venue availability:', error);
        res.status(500).json({ error: 'Failed to check venue availability' });
    }
});

// Get venue utilization statistics
router.get('/:id/stats', async (req, res) => {
    try {
        const [stats] = await db.query(`
            SELECT 
                COUNT(e.event_id) as total_events,
                SUM(e.max_participants) as total_participants,
                AVG(e.max_participants) as avg_participants,
                MAX(e.max_participants) as max_participants,
                MIN(e.max_participants) as min_participants,
                (COUNT(e.event_id) * 100.0 / 
                    (SELECT COUNT(DISTINCT event_date) FROM events)) as utilization_percentage
            FROM venues v
            LEFT JOIN events e ON v.venue_id = e.venue_id
            WHERE v.venue_id = ?
            GROUP BY v.venue_id
        `, [req.params.id]);

        res.json(stats[0] || {
            total_events: 0,
            total_participants: 0,
            avg_participants: 0,
            max_participants: 0,
            min_participants: 0,
            utilization_percentage: 0
        });
    } catch (error) {
        console.error('Error fetching venue statistics:', error);
        res.status(500).json({ error: 'Failed to fetch venue statistics' });
    }
});

// Get venue scheduling conflicts with detailed information
router.get('/scheduling-conflicts', async (req, res) => {
    try {
        const [conflicts] = await db.query(`
            SELECT 
                v.venue_id,
                v.venue_name,
                e1.event_id AS event1_id,
                e1.event_name AS event1_name,
                e1.event_date AS event1_date,
                e1.start_time AS event1_start,
                e1.end_time AS event1_end,
                e2.event_id AS event2_id,
                e2.event_name AS event2_name,
                e2.event_date AS event2_date,
                e2.start_time AS event2_start,
                e2.end_time AS event2_end,
                CASE 
                    WHEN e1.start_time <= e2.start_time AND e1.end_time > e2.start_time THEN 'Event 1 overlaps with Event 2 start'
                    WHEN e1.start_time < e2.end_time AND e1.end_time >= e2.end_time THEN 'Event 1 overlaps with Event 2 end'
                    ELSE 'Events completely overlap'
                END as conflict_type
            FROM venues v
            JOIN events e1 ON v.venue_id = e1.venue_id
            JOIN events e2 ON v.venue_id = e2.venue_id AND e1.event_id < e2.event_id
            WHERE e1.event_date = e2.event_date
            AND (
                (e1.start_time <= e2.start_time AND e1.end_time > e2.start_time) OR
                (e1.start_time < e2.end_time AND e1.end_time >= e2.end_time) OR
                (e1.start_time >= e2.start_time AND e1.end_time <= e2.end_time)
            )
            ORDER BY v.venue_name, e1.event_date, e1.start_time
        `);
        res.json(conflicts);
    } catch (error) {
        console.error('Error fetching venue scheduling conflicts:', error);
        res.status(500).json({ error: 'Failed to fetch venue scheduling conflicts' });
    }
});

// Get venue utilization report
router.get('/utilization-report', async (req, res) => {
    try {
        const [report] = await db.query(`
            SELECT 
                v.venue_id,
                v.venue_name,
                COUNT(DISTINCT e.event_id) as total_events,
                SUM(e.registered_participants) as total_participants,
                AVG(e.registered_participants) as avg_participants,
                MAX(e.registered_participants) as max_participants,
                MIN(e.registered_participants) as min_participants,
                v.capacity,
                ROUND((SUM(e.registered_participants) / (v.capacity * COUNT(DISTINCT e.event_id))) * 100, 2) as utilization_percentage
            FROM venues v
            LEFT JOIN events e ON v.venue_id = e.venue_id
            WHERE e.event_date > NOW() OR e.event_id IS NULL
            GROUP BY v.venue_id
            ORDER BY utilization_percentage DESC
        `);
        res.json(report);
    } catch (error) {
        console.error('Error generating venue utilization report:', error);
        res.status(500).json({ error: 'Failed to generate venue utilization report' });
    }
});

// Accommodation occupancy stats
router.get('/accommodations/occupancy', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT SUM(capacity) as total, SUM(capacity - available_rooms) as occupied FROM accommodations');
        res.json({
            total: rows[0].total || 0,
            occupied: rows[0].occupied || 0
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch accommodation occupancy' });
    }
});

module.exports = router; 