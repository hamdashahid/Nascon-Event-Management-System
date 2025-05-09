const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Import routes
const usersRouter = require('./server/routes/users');
const eventsRouter = require('./server/routes/events');
const venuesRouter = require('./server/routes/venues');
const sponsorsRouter = require('./server/routes/sponsors');
const judgingRouter = require('./server/routes/judging');
const sponsorshipsRouter = require('./server/routes/sponsorships');
const paymentsRouter = require('./server/routes/payments');
const accommodationsRouter = require('./server/routes/accommodations');
const organizerRouter = require('./server/routes/organizer');
const sponsorRouter = require('./server/routes/sponsor');
const reportsRouter = require('./server/routes/reports');
const participantsRouter = require('./server/routes/participants');

// Mount routes
app.use('/api/users', usersRouter);
app.use('/api/events', eventsRouter);
app.use('/api/venues', venuesRouter);
app.use('/api/sponsors', sponsorsRouter);
app.use('/api/judging', judgingRouter);
app.use('/api/sponsorships', sponsorshipsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/accommodations', accommodationsRouter);
app.use('/api/organizer', organizerRouter);
app.use('/api/sponsor', sponsorRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/participants', participantsRouter);

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

