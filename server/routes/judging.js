const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Middleware to check if user is a judge
const isJudge = (req, res, next) => {
    if (req.user && (req.user.role === 'judge' || req.user.role === 'admin')) {
        next();
    } else {
        res.status(403).json({ error: 'Access denied. Judges only.' });
    }
};

// Get all judging entries
router.get('/', async (req, res) => {
    try {
        const [judgings] = await db.query(`
            SELECT j.*, 
                   e.event_name,
                   u.name as participant_name,
                   jd.name as judge_name
            FROM judging j
            LEFT JOIN events e ON j.event_id = e.event_id
            LEFT JOIN participants p ON j.participant_id = p.participant_id
            LEFT JOIN users u ON p.user_id = u.user_id
            LEFT JOIN judges jd ON j.judge_id = jd.judge_id
            ORDER BY j.created_at DESC
        `);
        res.json(judgings);
    } catch (error) {
        console.error('Error fetching judging entries:', error);
        res.status(500).json({ error: 'Failed to fetch judging entries' });
    }
});

// Get judging entry by ID
router.get('/:id', async (req, res) => {
    try {
        const [judgings] = await db.query(`
            SELECT j.*, 
                   e.event_name,
                   u.name as participant_name,
                   jd.name as judge_name
            FROM judging j
            LEFT JOIN events e ON j.event_id = e.event_id
            LEFT JOIN participants p ON j.participant_id = p.participant_id
            LEFT JOIN users u ON p.user_id = u.user_id
            LEFT JOIN judges jd ON j.judge_id = jd.judge_id
            WHERE j.judging_id = ?
        `, [req.params.id]);

        if (judgings.length === 0) {
            return res.status(404).json({ error: 'Judging entry not found' });
        }

        res.json(judgings[0]);
    } catch (error) {
        console.error('Error fetching judging entry:', error);
        res.status(500).json({ error: 'Failed to fetch judging entry' });
    }
});

// Create new judging entry
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { event_id, judge_id, participant_id, score, comments } = req.body;

        // Validate score range
        if (score < 0 || score > 100) {
            return res.status(400).json({ error: 'Score must be between 0 and 100' });
        }

        const [result] = await db.query(`
            INSERT INTO judging (event_id, judge_id, participant_id, score, comments)
            VALUES (?, ?, ?, ?, ?)
        `, [event_id, judge_id, participant_id, score, comments]);

        res.status(201).json({
            message: 'Judging entry created successfully',
            judging_id: result.insertId
        });
    } catch (error) {
        console.error('Error creating judging entry:', error);
        res.status(500).json({ error: 'Failed to create judging entry' });
    }
});

// Update judging entry
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { score, comments } = req.body;

        // Validate score range
        if (score < 0 || score > 100) {
            return res.status(400).json({ error: 'Score must be between 0 and 100' });
        }

        await db.query(`
            UPDATE judging SET
                score = ?,
                comments = ?
            WHERE judging_id = ?
        `, [score, comments, req.params.id]);

        res.json({ message: 'Judging entry updated successfully' });
    } catch (error) {
        console.error('Error updating judging entry:', error);
        res.status(500).json({ error: 'Failed to update judging entry' });
    }
});

// Delete judging entry
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        await db.query('DELETE FROM judging WHERE judging_id = ?', [req.params.id]);
        res.json({ message: 'Judging entry deleted successfully' });
    } catch (error) {
        console.error('Error deleting judging entry:', error);
        res.status(500).json({ error: 'Failed to delete judging entry' });
    }
});

// Get judging entries by event
router.get('/event/:event_id', async (req, res) => {
    try {
        const [judgings] = await db.query(`
            SELECT j.*, 
                   u.name as participant_name,
                   jd.name as judge_name
            FROM judging j
            LEFT JOIN participants p ON j.participant_id = p.participant_id
            LEFT JOIN users u ON p.user_id = u.user_id
            LEFT JOIN judges jd ON j.judge_id = jd.judge_id
            WHERE j.event_id = ?
            ORDER BY j.created_at DESC
        `, [req.params.event_id]);

        res.json(judgings);
    } catch (error) {
        console.error('Error fetching event judging entries:', error);
        res.status(500).json({ error: 'Failed to fetch event judging entries' });
    }
});

// Get judging entries by participant
router.get('/participant/:participant_id', async (req, res) => {
    try {
        const [judgings] = await db.query(`
            SELECT j.*, 
                   e.event_name,
                   jd.name as judge_name
            FROM judging j
            LEFT JOIN events e ON j.event_id = e.event_id
            LEFT JOIN judges jd ON j.judge_id = jd.judge_id
            WHERE j.participant_id = ?
            ORDER BY j.created_at DESC
        `, [req.params.participant_id]);

        res.json(judgings);
    } catch (error) {
        console.error('Error fetching participant judging entries:', error);
        res.status(500).json({ error: 'Failed to fetch participant judging entries' });
    }
});

// Get judging statistics for an event
router.get('/event/:event_id/stats', async (req, res) => {
    try {
        const [stats] = await db.query(`
            SELECT 
                COUNT(judging_id) as total_judgings,
                AVG(score) as average_score,
                MAX(score) as highest_score,
                MIN(score) as lowest_score,
                COUNT(DISTINCT judge_id) as total_judges,
                COUNT(DISTINCT participant_id) as total_participants
            FROM judging
            WHERE event_id = ?
        `, [req.params.event_id]);

        res.json(stats[0] || {
            total_judgings: 0,
            average_score: 0,
            highest_score: 0,
            lowest_score: 0,
            total_judges: 0,
            total_participants: 0
        });
    } catch (error) {
        console.error('Error fetching event judging statistics:', error);
        res.status(500).json({ error: 'Failed to fetch event judging statistics' });
    }
});

// Get judge's assignments
router.get('/judge/:judge_id/assignments', async (req, res) => {
    try {
        const [assignments] = await db.query(`
            SELECT 
                e.event_name,
                COUNT(j.judging_id) as total_judgings,
                AVG(j.score) as average_score
            FROM event_judges ej
            LEFT JOIN events e ON ej.event_id = e.event_id
            LEFT JOIN judging j ON ej.event_id = j.event_id AND ej.judge_id = j.judge_id
            WHERE ej.judge_id = ?
            GROUP BY e.event_id, e.event_name
        `, [req.params.judge_id]);

        res.json(assignments);
    } catch (error) {
        console.error('Error fetching judge assignments:', error);
        res.status(500).json({ error: 'Failed to fetch judge assignments' });
    }
});

// Get all judging scores
router.get('/', authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT j.*, e.event_name, u.name as participant_name, j2.name as judge_name
            FROM judging j
            JOIN events e ON j.event_id = e.event_id
            JOIN participants p ON j.participant_id = p.participant_id
            JOIN users u ON p.user_id = u.user_id
            JOIN judges j2 ON j.judge_id = j2.judge_id
            ORDER BY j.event_id, j.participant_id
        `);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching judging data:', error);
        res.status(500).json({ error: 'Failed to fetch judging data' });
    }
});

// Get scores for a specific event
router.get('/event/:event_id', authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT j.*, e.event_name, u.name as participant_name, j2.name as judge_name
            FROM judging j
            JOIN events e ON j.event_id = e.event_id
            JOIN participants p ON j.participant_id = p.participant_id
            JOIN users u ON p.user_id = u.user_id
            JOIN judges j2 ON j.judge_id = j2.judge_id
            WHERE j.event_id = ?
            ORDER BY j.score DESC
        `, [req.params.event_id]);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching event judging data:', error);
        res.status(500).json({ error: 'Failed to fetch event judging data' });
    }
});

// Get scores by a specific judge
router.get('/judge/:judge_id', authenticateToken, isJudge, async (req, res) => {
    try {
        // Make sure the judge can only see their own scores unless they are an admin
        if (req.user.role !== 'admin' && req.user.judge_id !== parseInt(req.params.judge_id)) {
            return res.status(403).json({ error: 'Access denied. You can only view your own scores.' });
        }

        const [rows] = await db.query(`
            SELECT j.*, e.event_name, u.name as participant_name
            FROM judging j
            JOIN events e ON j.event_id = e.event_id
            JOIN participants p ON j.participant_id = p.participant_id
            JOIN users u ON p.user_id = u.user_id
            WHERE j.judge_id = ?
            ORDER BY j.event_id, j.score DESC
        `, [req.params.judge_id]);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching judge scores:', error);
        res.status(500).json({ error: 'Failed to fetch judge scores' });
    }
});

// Get summary of scores for all events
router.get('/summary', authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                e.event_id, 
                e.event_name,
                COUNT(DISTINCT j.participant_id) as participants_judged,
                COUNT(DISTINCT j.judge_id) as judges_participated,
                AVG(j.score) as average_score,
                MAX(j.score) as highest_score,
                MIN(j.score) as lowest_score
            FROM judging j
            JOIN events e ON j.event_id = e.event_id
            GROUP BY e.event_id
            ORDER BY e.event_name
        `);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching judging summary:', error);
        res.status(500).json({ error: 'Failed to fetch judging summary' });
    }
});

// Get top participants based on average scores
router.get('/top-participants/:event_id', authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                p.participant_id,
                u.name as participant_name,
                u.email as participant_email,
                AVG(j.score) as average_score,
                COUNT(j.judging_id) as times_judged
            FROM judging j
            JOIN participants p ON j.participant_id = p.participant_id
            JOIN users u ON p.user_id = u.user_id
            WHERE j.event_id = ?
            GROUP BY p.participant_id
            ORDER BY average_score DESC
            LIMIT 10
        `, [req.params.event_id]);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching top participants:', error);
        res.status(500).json({ error: 'Failed to fetch top participants' });
    }
});

// Leaderboard for an event: average scores and ranks
router.get('/event/:event_id/leaderboard', authenticateToken, async (req, res) => {
    try {
        const event_id = req.params.event_id;
        const [rows] = await db.query(`
            SELECT 
                p.participant_id,
                u.name AS participant_name,
                AVG(j.score) AS avg_score
            FROM judging j
            JOIN participants p ON j.participant_id = p.participant_id
            JOIN users u ON p.user_id = u.user_id
            WHERE j.event_id = ?
            GROUP BY p.participant_id
            ORDER BY avg_score DESC
        `, [event_id]);
        // Add rank
        rows.forEach((row, idx) => row.rank = idx + 1);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// --- Judge Dashboard Endpoints ---

// 1. Overview stats for judge dashboard
router.get('/overview', authenticateToken, isJudge, async (req, res) => {
    try {
        // Get judge_id from user's email
        const [judges] = await db.query('SELECT judge_id FROM judges WHERE email = ?', [req.user.email]);
        if (judges.length === 0) return res.status(400).json({ error: 'Judge not found for this user' });
        const judge_id = judges[0].judge_id;
        // Events assigned (distinct events judged by this judge)
        const [[eventsAssigned]] = await db.query('SELECT COUNT(DISTINCT event_id) AS events_assigned FROM judging WHERE judge_id = ?', [judge_id]);
        // Rounds (distinct events judged)
        const [[rounds]] = await db.query('SELECT COUNT(DISTINCT event_id) AS rounds FROM judging WHERE judge_id = ?', [judge_id]);
        // Pending scores (participants in assigned events not yet scored by this judge)
        const [[pendingScores]] = await db.query(`
            SELECT COUNT(*) AS pending_scores
            FROM participants p
            JOIN events e ON p.event_id = e.event_id
            WHERE e.event_id IN (SELECT DISTINCT event_id FROM judging WHERE judge_id = ?)
            AND p.participant_id NOT IN (SELECT participant_id FROM judging WHERE judge_id = ?)
        `, [judge_id, judge_id]);
        // Results (distinct events where this judge has scored all participants)
        const [[results]] = await db.query(`
            SELECT COUNT(DISTINCT e.event_id) AS results
            FROM events e
            WHERE e.event_id IN (SELECT DISTINCT event_id FROM judging WHERE judge_id = ?)
        `, [judge_id]);
        res.json({
            events_assigned: eventsAssigned.events_assigned || 0,
            rounds: rounds.rounds || 0,
            pending_scores: pendingScores.pending_scores || 0,
            results: results.results || 0
        });
    } catch (error) {
        console.error('Error fetching judge overview:', error);
        res.status(500).json({ error: 'Failed to fetch judge overview' });
    }
});

// 2. Assigned events for this judge
router.get('/assigned-events', authenticateToken, isJudge, async (req, res) => {
    try {
        const [judges] = await db.query('SELECT judge_id FROM judges WHERE email = ?', [req.user.email]);
        if (judges.length === 0) return res.status(400).json({ error: 'Judge not found for this user' });
        const judge_id = judges[0].judge_id;
        const [rows] = await db.query(`
            SELECT DISTINCT e.event_id, e.event_name, e.event_date, v.venue_name
            FROM judging j
            JOIN events e ON j.event_id = e.event_id
            LEFT JOIN venues v ON e.venue_id = v.venue_id
            WHERE j.judge_id = ?
            ORDER BY e.event_date ASC
        `, [judge_id]);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching assigned events:', error);
        res.status(500).json({ error: 'Failed to fetch assigned events' });
    }
});

// 3. Participants for an event
router.get('/event/:event_id/participants', authenticateToken, isJudge, async (req, res) => {
    try {
        const event_id = req.params.event_id;
        const [rows] = await db.query(`
            SELECT p.participant_id, u.name
            FROM participants p
            JOIN users u ON p.user_id = u.user_id
            WHERE p.event_id = ?
        `, [event_id]);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching event participants:', error);
        res.status(500).json({ error: 'Failed to fetch event participants' });
    }
});

// 4. Scores for an event by this judge
router.get('/event/:event_id/scores', authenticateToken, isJudge, async (req, res) => {
    try {
        const event_id = req.params.event_id;
        const [judges] = await db.query('SELECT judge_id FROM judges WHERE email = ?', [req.user.email]);
        if (judges.length === 0) return res.status(400).json({ error: 'Judge not found for this user' });
        const judge_id = judges[0].judge_id;
        const [rows] = await db.query(`
            SELECT participant_id, score, comments
            FROM judging
            WHERE event_id = ? AND judge_id = ?
        `, [event_id, judge_id]);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching event scores:', error);
        res.status(500).json({ error: 'Failed to fetch event scores' });
    }
});

// 5. Results for judged events
router.get('/results', authenticateToken, isJudge, async (req, res) => {
    try {
        const [judges] = await db.query('SELECT judge_id FROM judges WHERE email = ?', [req.user.email]);
        if (judges.length === 0) return res.status(400).json({ error: 'Judge not found for this user' });
        const judge_id = judges[0].judge_id;
        // For each event assigned to this judge, get the participant with the highest average score
        const [rows] = await db.query(`
            SELECT e.event_id, e.event_name, NULL as round, u.name as winner
            FROM events e
            JOIN judging j ON e.event_id = j.event_id
            JOIN participants p ON j.participant_id = p.participant_id
            JOIN users u ON p.user_id = u.user_id
            WHERE j.judge_id = ?
            AND j.score = (
                SELECT MAX(j2.score) FROM judging j2 WHERE j2.event_id = e.event_id AND j2.judge_id = ?
            )
            GROUP BY e.event_id
        `, [judge_id, judge_id]);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching judge results:', error);
        res.status(500).json({ error: 'Failed to fetch judge results' });
    }
});

// Judge profile endpoint
router.get('/profile', authenticateToken, isJudge, async (req, res) => {
    try {
        const [judges] = await db.query('SELECT name, email, contact FROM judges WHERE email = ?', [req.user.email]);
        if (judges.length === 0) return res.status(404).json({ error: 'Judge not found' });
        const judge = judges[0];
        res.json(judge);
    } catch (error) {
        console.error('Error fetching judge profile:', error);
        res.status(500).json({ error: 'Failed to fetch judge profile' });
    }
});

module.exports = router; 