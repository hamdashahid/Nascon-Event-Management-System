const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Get event participation report
router.get('/event-participation', async (req, res) => {
    try {
        const [report] = await pool.query(`
            SELECT 
                e.event_id,
                e.event_name,
                e.category,
                e.event_date,
                COUNT(p.participant_id) as total_participants,
                e.max_participants,
                ROUND((COUNT(p.participant_id) * 100.0 / e.max_participants), 2) as participation_rate,
                SUM(pay.amount) as total_revenue
            FROM events e
            LEFT JOIN participants p ON e.event_id = p.event_id
            LEFT JOIN payments pay ON e.event_id = pay.event_id AND pay.status = 'completed'
            GROUP BY e.event_id
            ORDER BY e.event_date DESC
        `);
        res.json(report);
    } catch (error) {
        console.error('Error generating event participation report:', error);
        res.status(500).json({ error: 'Failed to generate event participation report' });
    }
});

// Get venue utilization report
router.get('/venue-utilization', async (req, res) => {
    try {
        const [report] = await pool.query(`
            SELECT 
                v.venue_id,
                v.venue_name,
                v.capacity,
                COUNT(e.event_id) as total_events,
                SUM(e.registered_participants) as total_participants,
                ROUND((SUM(e.registered_participants) * 100.0 / (v.capacity * COUNT(e.event_id))), 2) as utilization_rate,
                MAX(e.event_date) as last_used
            FROM venues v
            LEFT JOIN events e ON v.venue_id = e.venue_id
            GROUP BY v.venue_id
            ORDER BY total_events DESC
        `);
        res.json(report);
    } catch (error) {
        console.error('Error generating venue utilization report:', error);
        res.status(500).json({ error: 'Failed to generate venue utilization report' });
    }
});

// Get financial report
router.get('/financial', async (req, res) => {
    try {
        const [report] = await pool.query(`
            SELECT 
                payment_type,
                COUNT(*) as total_transactions,
                SUM(amount) as total_amount,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_transactions,
                COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_transactions,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_transactions,
                ROUND(AVG(amount), 2) as average_amount
            FROM payments
            GROUP BY payment_type
            ORDER BY total_amount DESC
        `);
        res.json(report);
    } catch (error) {
        console.error('Error generating financial report:', error);
        res.status(500).json({ error: 'Failed to generate financial report' });
    }
});

// Get sponsorship report
router.get('/sponsorship', async (req, res) => {
    try {
        const [report] = await pool.query(`
            SELECT 
                s.sponsorship_level,
                COUNT(DISTINCT s.sponsor_id) as total_sponsors,
                COUNT(DISTINCT sp.sponsorship_id) as total_sponsorships,
                SUM(sp.amount) as total_amount,
                COUNT(DISTINCT sp.event_id) as total_events,
                ROUND(AVG(sp.amount), 2) as average_sponsorship
            FROM sponsors s
            LEFT JOIN sponsorships sp ON s.sponsor_id = sp.sponsor_id
            GROUP BY s.sponsorship_level
            ORDER BY total_amount DESC
        `);
        res.json(report);
    } catch (error) {
        console.error('Error generating sponsorship report:', error);
        res.status(500).json({ error: 'Failed to generate sponsorship report' });
    }
});

// Get user activity report
router.get('/user-activity', async (req, res) => {
    try {
        const [report] = await pool.query(`
            SELECT 
                u.role,
                COUNT(DISTINCT u.user_id) as total_users,
                COUNT(DISTINCT p.participant_id) as total_participations,
                COUNT(DISTINCT CASE 
                    WHEN e.event_date >= CURRENT_DATE THEN p.participant_id 
                END) as upcoming_participations,
                COUNT(DISTINCT CASE 
                    WHEN pay.status = 'completed' THEN pay.payment_id 
                END) as total_payments,
                SUM(CASE 
                    WHEN pay.status = 'completed' THEN pay.amount 
                    ELSE 0 
                END) as total_spent
            FROM users u
            LEFT JOIN participants p ON u.user_id = p.user_id
            LEFT JOIN events e ON p.event_id = e.event_id
            LEFT JOIN payments pay ON u.user_id = pay.user_id
            GROUP BY u.role
            ORDER BY total_users DESC
        `);
        res.json(report);
    } catch (error) {
        console.error('Error generating user activity report:', error);
        res.status(500).json({ error: 'Failed to generate user activity report' });
    }
});

// Get accommodation report
router.get('/accommodation', async (req, res) => {
    try {
        const [report] = await pool.query(`
            SELECT 
                a.room_type,
                a.capacity,
                COUNT(DISTINCT ua.user_id) as total_bookings,
                a.available_rooms,
                ROUND((COUNT(DISTINCT ua.user_id) * 100.0 / a.capacity), 2) as occupancy_rate,
                SUM(a.price_per_night) as total_revenue
            FROM accommodations a
            LEFT JOIN user_accommodations ua ON a.accommodation_id = ua.accommodation_id
            GROUP BY a.accommodation_id
            ORDER BY total_bookings DESC
        `);
        res.json(report);
    } catch (error) {
        console.error('Error generating accommodation report:', error);
        res.status(500).json({ error: 'Failed to generate accommodation report' });
    }
});

// Get event category report
router.get('/event-categories', async (req, res) => {
    try {
        const [report] = await pool.query(`
            SELECT 
                category,
                COUNT(event_id) as total_events,
                COUNT(DISTINCT organizer_id) as total_organizers,
                SUM(registered_participants) as total_participants,
                ROUND(AVG(registration_fee), 2) as average_fee,
                SUM(registration_fee * registered_participants) as total_revenue
            FROM events
            GROUP BY category
            ORDER BY total_events DESC
        `);
        res.json(report);
    } catch (error) {
        console.error('Error generating event category report:', error);
        res.status(500).json({ error: 'Failed to generate event category report' });
    }
});

// Get payment status report
router.get('/payment-status', async (req, res) => {
    try {
        const [report] = await pool.query(`
            SELECT 
                status,
                payment_type,
                COUNT(*) as total_transactions,
                SUM(amount) as total_amount,
                ROUND(AVG(amount), 2) as average_amount,
                COUNT(DISTINCT user_id) as unique_users,
                COUNT(DISTINCT event_id) as unique_events
            FROM payments
            GROUP BY status, payment_type
            ORDER BY status, payment_type
        `);
        res.json(report);
    } catch (error) {
        console.error('Error generating payment status report:', error);
        res.status(500).json({ error: 'Failed to generate payment status report' });
    }
});

module.exports = router; 