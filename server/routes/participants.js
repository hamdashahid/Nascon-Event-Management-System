const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all participants
router.get('/', async (req, res) => {
    try {
        const [participants] = await db.query('SELECT * FROM participants');
        res.json(participants);
    } catch (error) {
        console.error('Error fetching participants:', error);
        res.status(500).json({ error: 'Failed to fetch participants' });
    }
});

// Get participant by ID
router.get('/:id', async (req, res) => {
    try {
        const [participant] = await db.query('SELECT * FROM participants WHERE id = ?', [req.params.id]);
        if (participant.length === 0) {
            return res.status(404).json({ error: 'Participant not found' });
        }
        res.json(participant[0]);
    } catch (error) {
        console.error('Error fetching participant:', error);
        res.status(500).json({ error: 'Failed to fetch participant' });
    }
});

// Register new participant
router.post('/', async (req, res) => {
    const { name, email, event_id, team_id } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO participants (name, email, event_id, team_id) VALUES (?, ?, ?, ?)',
            [name, email, event_id, team_id]
        );
        res.status(201).json({ id: result.insertId, name, email, event_id, team_id });
    } catch (error) {
        console.error('Error registering participant:', error);
        res.status(500).json({ error: 'Failed to register participant' });
    }
});

// Update participant
router.put('/:id', async (req, res) => {
    const { name, email, event_id, team_id } = req.body;
    try {
        await db.query(
            'UPDATE participants SET name = ?, email = ?, event_id = ?, team_id = ? WHERE id = ?',
            [name, email, event_id, team_id, req.params.id]
        );
        res.json({ id: req.params.id, name, email, event_id, team_id });
    } catch (error) {
        console.error('Error updating participant:', error);
        res.status(500).json({ error: 'Failed to update participant' });
    }
});

// Delete participant
router.delete('/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM participants WHERE id = ?', [req.params.id]);
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting participant:', error);
        res.status(500).json({ error: 'Failed to delete participant' });
    }
});

module.exports = router;
