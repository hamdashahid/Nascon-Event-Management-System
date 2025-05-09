const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const eventCategories = require('../config/eventCategories');

// Get all event categories
router.get('/categories', (req, res) => {
    res.json(eventCategories);
});

// Get all events with category filtering
router.get('/', async (req, res) => {
    try {
        const { category, subcategory } = req.query;
        let query = `
            SELECT e.*, v.venue_name, v.capacity, u.name as organizer_name
            FROM events e
            JOIN venues v ON e.venue_id = v.venue_id
            JOIN users u ON e.organizer_id = u.user_id
        `;
        const params = [];

        if (category) {
            query += ' WHERE e.category = ?';
            params.push(category);

            if (subcategory) {
                query += ' AND e.subcategory = ?';
                params.push(subcategory);
            }
        }

        const [events] = await db.query(query, params);
        res.json(events);
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({
            error: error.message
        });
    }
});

// Get event by ID
router.get('/:id', async (req, res) => {
    try {
        const [events] = await db.query(
            `SELECT e.*, v.venue_name, v.capacity, u.name as organizer_name
            FROM events e
            JOIN venues v ON e.venue_id = v.venue_id
            JOIN users u ON e.organizer_id = u.user_id
            WHERE e.event_id = ?`,
            [req.params.id]
        );

        if (events.length === 0) {
            return res.status(404).json({
                error: 'Event not found'
            });
        }

        res.json(events[0]);
    } catch (error) {
        console.error('Error fetching event:', error);
        res.status(500).json({
            error: error.message
        });
    }
});

// Create a new event
router.post('/', async (req, res) => {
    try {
        const {
            event_name,
            description,
            category,
            event_date,
            max_participants,
            venue_id,
            registration_fee,
            organizer_id
        } = req.body;

        // Validate category
        if (!eventCategories[category]) {
            return res.status(400).json({
                error: 'Invalid category'
            });
        }

        // Insert the event into the database
        const [result] = await db.query(
            `INSERT INTO events (
                event_name, description, category, event_date,
                max_participants, venue_id, registration_fee, organizer_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [event_name, description, category, event_date, max_participants, venue_id, registration_fee, organizer_id]
        );

        res.status(201).json({
            message: 'Event created successfully',
            event_id: result.insertId
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            // Handle duplicate entry error
            return res.status(400).json({
                error: 'An event is already scheduled at this venue on the same date.'
            });
        }

        console.error('Error creating event:', error);
        res.status(500).json({
            error: 'Failed to create event'
        });
    }
});

// Update event
router.put('/:id', async (req, res) => {
    try {
        const {
            event_name,
            description,
            category,
            event_date,
            max_participants,
            venue_id,
            registration_fee
        } = req.body;

        // Validate category
        if (category && !eventCategories[category]) {
            return res.status(400).json({
                error: 'Invalid category'
            });
        }

        const [result] = await db.query(
            `UPDATE events SET
                event_name = COALESCE(?, event_name),
                description = COALESCE(?, description),
                category = COALESCE(?, category),
                event_date = COALESCE(?, event_date),
                max_participants = COALESCE(?, max_participants),
                venue_id = COALESCE(?, venue_id),
                registration_fee = COALESCE(?, registration_fee)
            WHERE event_id = ?`,
            [event_name, description, category, event_date, max_participants, venue_id, registration_fee, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: 'Event not found'
            });
        }

        res.json({
            message: 'Event updated successfully'
        });
    } catch (error) {
        console.error('Error updating event:', error);
        res.status(500).json({
            error: error.message
        });
    }
});

// Delete event
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await db.query(
            'DELETE FROM events WHERE event_id = ?',
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: 'Event not found'
            });
        }

        res.json({
            message: 'Event deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({
            error: error.message
        });
    }
});

// Get event participants
router.get('/:id/participants', async (req, res) => {
    try {
        const [participants] = await db.query(`
            SELECT u.user_id, u.name, u.email, p.registration_date
            FROM participants p
            JOIN users u ON p.user_id = u.user_id
            WHERE p.event_id = ?
            ORDER BY p.registration_date ASC
        `, [req.params.id]);

        res.json(participants);
    } catch (error) {
        console.error('Error fetching event participants:', error);
        res.status(500).json({ error: 'Failed to fetch event participants' });
    }
});

// Get event rounds
router.get('/:id/rounds', async (req, res) => {
    try {
        const [rounds] = await db.query(`
            SELECT er.*, v.venue_name
            FROM event_rounds er
            LEFT JOIN venues v ON er.venue_id = v.venue_id
            WHERE er.event_id = ?
            ORDER BY er.round_date ASC, er.start_time ASC
        `, [req.params.id]);

        res.json(rounds);
    } catch (error) {
        console.error('Error fetching event rounds:', error);
        res.status(500).json({ error: 'Failed to fetch event rounds' });
    }
});

// Schedule event rounds
router.post('/:id/rounds', async (req, res) => {
    try {
        const { prelims_date, semifinals_date, finals_date } = req.body;

        // Call the stored procedure to schedule rounds
        await db.query('CALL schedule_event_rounds(?, ?, ?, ?)', [
            req.params.id,
            prelims_date,
            semifinals_date,
            finals_date
        ]);

        res.json({ message: 'Event rounds scheduled successfully' });
    } catch (error) {
        console.error('Error scheduling event rounds:', error);
        res.status(500).json({ error: 'Failed to schedule event rounds' });
    }
});

// Get event statistics
router.get('/:id/stats', async (req, res) => {
    try {
        const [stats] = await db.query(`
            SELECT 
                COUNT(p.participant_id) as total_participants,
                COUNT(DISTINCT t.team_id) as total_teams,
                SUM(pay.amount) as total_revenue
            FROM events e
            LEFT JOIN participants p ON e.event_id = p.event_id
            LEFT JOIN teams t ON e.event_id = t.event_id
            LEFT JOIN payments pay ON e.event_id = pay.event_id
            WHERE e.event_id = ?
            GROUP BY e.event_id
        `, [req.params.id]);

        res.json(stats[0] || {
            total_participants: 0,
            total_teams: 0,
            total_revenue: 0
        });
    } catch (error) {
        console.error('Error fetching event statistics:', error);
        res.status(500).json({ error: 'Failed to fetch event statistics' });
    }
});

// Register for event
router.post('/:id/register', authenticateToken, async (req, res) => {
    const connection = await db.getConnection();
    try {
        const userId = req.user.user_id;
        const eventId = req.params.id;

        // Start transaction
        await connection.beginTransaction();

        // Check if event exists and has available slots
        const [events] = await connection.query(`
            SELECT e.*, COUNT(p.participant_id) as registered_count
            FROM events e
            LEFT JOIN participants p ON e.event_id = p.event_id
            WHERE e.event_id = ?
            GROUP BY e.event_id
        `, [eventId]);

        if (events.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Event not found' });
        }

        const event = events[0];
        if (event.registered_count >= event.max_participants) {
            await connection.rollback();
            return res.status(400).json({ error: 'Event is full' });
        }

        // Check if user is already registered
        const [existing] = await connection.query(
            'SELECT * FROM participants WHERE user_id = ? AND event_id = ?',
            [userId, eventId]
        );

        if (existing.length > 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'Already registered for this event' });
        }

        // Register user (no status column)
        const [result] = await connection.query(`
            INSERT INTO participants (user_id, event_id)
            VALUES (?, ?)
        `, [userId, eventId]);
        const participant_id = result.insertId;

        // If there's a registration fee, create a payment record if not already exists
        if (event.registration_fee > 0) {
            const [existingPayment] = await connection.query(
                'SELECT * FROM payments WHERE user_id = ? AND event_id = ? AND payment_type = "registration"',
                [userId, eventId]
            );
            if (existingPayment.length === 0) {
                await connection.query(`
                    INSERT INTO payments (user_id, event_id, amount, payment_type, status)
                    VALUES (?, ?, ?, 'registration', 'completed')
                `, [userId, eventId, event.registration_fee]);
            }
        }

        // Find the assigned judge for this event
        const [eventJudgeRows] = await connection.query(
            'SELECT judge_id FROM event_judges WHERE event_id = ?', [eventId]
        );
        if (!eventJudgeRows.length) {
            await connection.rollback();
            return res.status(400).json({ error: 'No judge assigned to this event.' });
        }
        const judge_id = eventJudgeRows[0].judge_id;

        // Insert into judging table with NULL score/comments
        await connection.query(
            'INSERT INTO judging (event_id, judge_id, participant_id, score, comments) VALUES (?, ?, ?, NULL, NULL)',
            [eventId, judge_id, participant_id]
        );

        await connection.commit();
        res.status(201).json({
            message: 'Successfully registered for event and judging record created',
            participant_id
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error registering for event:', error);
        res.status(500).json({ error: 'Failed to register for event' });
    } finally {
        connection.release();
    }
});

// List participants of a specific event
router.get('/:id/participants', async (req, res) => {
    try {
        const eventId = req.params.id;
        const [participants] = await db.query(`
            SELECT u.user_id, u.name, u.email, u.role
            FROM participants p
            INNER JOIN users u ON p.user_id = u.user_id
            WHERE p.event_id = ?
            ORDER BY u.name
        `, [eventId]);
        res.json(participants);
    } catch (error) {
        console.error('Error fetching event participants:', error);
        res.status(500).json({ error: 'Failed to fetch event participants' });
    }
});

// Get average scores for each event (AVG + HAVING)
router.get('/average-scores', async (req, res) => {
    try {
        const minAvg = parseFloat(req.query.min_avg) || 0;
        const [rows] = await db.query(`
            SELECT e.event_id, e.event_name, AVG(j.score) AS avg_score
            FROM judging j
            INNER JOIN events e ON j.event_id = e.event_id
            GROUP BY e.event_id
            HAVING avg_score > ?
            ORDER BY avg_score DESC
        `, [minAvg]);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching average scores:', error);
        res.status(500).json({ error: 'Failed to fetch average scores' });
    }
});

// Get participants and their assigned accommodations (INNER JOIN)
router.get('/participants-accommodations', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT u.user_id, u.name, u.email, a.room_type, a.capacity, a.price_per_night
            FROM participants p
            INNER JOIN users u ON p.user_id = u.user_id
            INNER JOIN accommodations a ON p.user_id = a.accommodation_id
            ORDER BY u.name
        `);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching participants with accommodations:', error);
        res.status(500).json({ error: 'Failed to fetch participants with accommodations' });
    }
});

module.exports = router;