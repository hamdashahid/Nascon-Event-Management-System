const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Get available accommodations
router.get('/available', async (req, res) => {
    try {
        const [accommodations] = await pool.query(`
            SELECT 
                a.accommodation_id,
                a.room_type,
                a.capacity,
                a.price_per_night,
                a.available_rooms,
                COUNT(ua.user_id) as current_bookings,
                (a.capacity - COUNT(ua.user_id)) as remaining_rooms
            FROM accommodations a
            LEFT JOIN user_accommodations ua ON a.accommodation_id = ua.accommodation_id
            GROUP BY a.accommodation_id
            HAVING remaining_rooms > 0
            ORDER BY a.price_per_night ASC
        `);
        res.json(accommodations);
    } catch (error) {
        console.error('Error fetching available accommodations:', error);
        res.status(500).json({ error: 'Failed to fetch available accommodations' });
    }
});

// Get all accommodations
router.get('/', async (req, res) => {
    try {
        const [accommodations] = await pool.query(`
            SELECT 
                a.*,
                COUNT(ua.user_id) as current_bookings,
                (a.capacity - COUNT(ua.user_id)) as remaining_rooms
            FROM accommodations a
            LEFT JOIN user_accommodations ua ON a.accommodation_id = ua.accommodation_id
            GROUP BY a.accommodation_id
            ORDER BY a.room_type
        `);
        res.json(accommodations);
    } catch (error) {
        console.error('Error fetching accommodations:', error);
        res.status(500).json({ error: 'Failed to fetch accommodations' });
    }
});

// Get accommodation by ID
router.get('/:id', async (req, res) => {
    try {
        const [accommodations] = await pool.query(`
            SELECT 
                a.*,
                COUNT(ua.user_id) as current_bookings,
                (a.capacity - COUNT(ua.user_id)) as remaining_rooms,
                GROUP_CONCAT(DISTINCT u.name) as booked_users
            FROM accommodations a
            LEFT JOIN user_accommodations ua ON a.accommodation_id = ua.accommodation_id
            LEFT JOIN users u ON ua.user_id = u.user_id
            WHERE a.accommodation_id = ?
            GROUP BY a.accommodation_id
        `, [req.params.id]);

        if (accommodations.length === 0) {
            return res.status(404).json({ error: 'Accommodation not found' });
        }

        res.json(accommodations[0]);
    } catch (error) {
        console.error('Error fetching accommodation:', error);
        res.status(500).json({ error: 'Failed to fetch accommodation' });
    }
});

// Create new accommodation
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { room_type, capacity, price_per_night, available_rooms } = req.body;

        // Validate required fields
        if (!room_type || !capacity || !price_per_night || !available_rooms) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const [result] = await pool.query(`
            INSERT INTO accommodations (room_type, capacity, price_per_night, available_rooms)
            VALUES (?, ?, ?, ?)
        `, [room_type, capacity, price_per_night, available_rooms]);

        res.status(201).json({
            message: 'Accommodation created successfully',
            accommodation_id: result.insertId
        });
    } catch (error) {
        console.error('Error creating accommodation:', error);
        res.status(500).json({ error: 'Failed to create accommodation' });
    }
});

// Update accommodation
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { room_type, capacity, price_per_night, available_rooms } = req.body;

        await pool.query(`
            UPDATE accommodations SET
                room_type = COALESCE(?, room_type),
                capacity = COALESCE(?, capacity),
                price_per_night = COALESCE(?, price_per_night),
                available_rooms = COALESCE(?, available_rooms)
            WHERE accommodation_id = ?
        `, [room_type, capacity, price_per_night, available_rooms, req.params.id]);

        res.json({ message: 'Accommodation updated successfully' });
    } catch (error) {
        console.error('Error updating accommodation:', error);
        res.status(500).json({ error: 'Failed to update accommodation' });
    }
});

// Delete accommodation
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        // Check if accommodation has any bookings
        const [bookings] = await pool.query(
            'SELECT COUNT(*) as count FROM user_accommodations WHERE accommodation_id = ?',
            [req.params.id]
        );

        if (bookings[0].count > 0) {
            return res.status(400).json({
                error: 'Cannot delete accommodation with existing bookings'
            });
        }

        await pool.query('DELETE FROM accommodations WHERE accommodation_id = ?', [req.params.id]);
        res.json({ message: 'Accommodation deleted successfully' });
    } catch (error) {
        console.error('Error deleting accommodation:', error);
        res.status(500).json({ error: 'Failed to delete accommodation' });
    }
});

// Book accommodation
router.post('/:id/book', authenticateToken, async (req, res) => {
    try {
        const { user_id } = req.body;
        const accommodation_id = req.params.id;

        // Start transaction
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Check if accommodation is available
            const [accommodations] = await connection.query(`
                SELECT 
                    a.*,
                    COUNT(ua.user_id) as current_bookings
                FROM accommodations a
                LEFT JOIN user_accommodations ua ON a.accommodation_id = ua.accommodation_id
                WHERE a.accommodation_id = ?
                GROUP BY a.accommodation_id
                HAVING (a.capacity - current_bookings) > 0
            `, [accommodation_id]);

            if (accommodations.length === 0) {
                await connection.rollback();
                return res.status(400).json({ error: 'Accommodation is not available' });
            }

            // Check if user already has a booking
            const [existingBookings] = await connection.query(
                'SELECT * FROM user_accommodations WHERE user_id = ?',
                [user_id]
            );

            if (existingBookings.length > 0) {
                await connection.rollback();
                return res.status(400).json({ error: 'User already has a booking' });
            }

            // Create booking
            await connection.query(
                'INSERT INTO user_accommodations (user_id, accommodation_id) VALUES (?, ?)',
                [user_id, accommodation_id]
            );

            // Create payment record
            await connection.query(
                `INSERT INTO payments (user_id, amount, payment_type, status)
                 VALUES (?, ?, 'accommodation', 'pending')`,
                [user_id, accommodations[0].price_per_night]
            );

            await connection.commit();
            res.json({ message: 'Accommodation booked successfully' });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error booking accommodation:', error);
        res.status(500).json({ error: 'Failed to book accommodation' });
    }
});

// Cancel booking
router.delete('/:id/book', authenticateToken, async (req, res) => {
    try {
        const { user_id } = req.body;
        const accommodation_id = req.params.id;

        // Start transaction
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Check if booking exists
            const [bookings] = await connection.query(
                'SELECT * FROM user_accommodations WHERE user_id = ? AND accommodation_id = ?',
                [user_id, accommodation_id]
            );

            if (bookings.length === 0) {
                await connection.rollback();
                return res.status(404).json({ error: 'Booking not found' });
            }

            // Delete booking
            await connection.query(
                'DELETE FROM user_accommodations WHERE user_id = ? AND accommodation_id = ?',
                [user_id, accommodation_id]
            );

            // Update payment status
            await connection.query(
                `UPDATE payments 
                 SET status = 'failed'
                 WHERE user_id = ? 
                 AND payment_type = 'accommodation'
                 AND status = 'pending'`,
                [user_id]
            );

            await connection.commit();
            res.json({ message: 'Booking cancelled successfully' });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error cancelling booking:', error);
        res.status(500).json({ error: 'Failed to cancel booking' });
    }
});

// Get user's bookings
router.get('/user/:user_id', authenticateToken, async (req, res) => {
    try {
        const [bookings] = await pool.query(`
            SELECT 
                a.*,
                ua.booked_at
            FROM accommodations a
            JOIN user_accommodations ua ON a.accommodation_id = ua.accommodation_id
            WHERE ua.user_id = ?
            ORDER BY ua.booked_at DESC
        `, [req.params.user_id]);

        res.json(bookings);
    } catch (error) {
        console.error('Error fetching user bookings:', error);
        res.status(500).json({ error: 'Failed to fetch user bookings' });
    }
});

// Get accommodation statistics
router.get('/stats', async (req, res) => {
    try {
        const [stats] = await pool.query(`
            SELECT 
                COUNT(accommodation_id) as total_rooms,
                SUM(capacity) as total_capacity,
                SUM(available_rooms) as total_available,
                AVG(price_per_night) as average_price,
                COUNT(DISTINCT room_type) as room_types,
                (
                    SELECT COUNT(DISTINCT user_id) 
                    FROM user_accommodations
                ) as total_bookings
            FROM accommodations
        `);

        res.json(stats[0] || {
            total_rooms: 0,
            total_capacity: 0,
            total_available: 0,
            average_price: 0,
            room_types: 0,
            total_bookings: 0
        });
    } catch (error) {
        console.error('Error fetching accommodation statistics:', error);
        res.status(500).json({ error: 'Failed to fetch accommodation statistics' });
    }
});

module.exports = router; 