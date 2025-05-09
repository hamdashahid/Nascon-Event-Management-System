const mysql = require('mysql2/promise');
require('dotenv').config();

// Validate environment variables
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error('Missing required environment variables:', missingVars.join(', '));
    process.exit(1);
}

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test the connection and verify schema
async function testConnection() {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log(' successfully!');

        // Verify database exists and check tables
        const [rows] = await connection.query('SHOW TABLES');
        const tables = rows.map(row => Object.values(row)[0]);
        console.log('Available tables:', tables);

        // Verify required tables exist
        const requiredTables = [
            'users', 'venues', 'events', 'sponsors',
            'sponsorships', 'participants', 'payments',
            'accommodations', 'judges', 'judging'
        ];

        const missingTables = requiredTables.filter(table => !tables.includes(table));
        if (missingTables.length > 0) {
            console.error('Missing required tables:', missingTables.join(', '));
            console.error('Please run the database schema script to create these tables.');
            process.exit(1);
        }

    } catch (error) {
        console.error('Database connection failed:', error);
        if (error.code === 'ER_BAD_DB_ERROR') {
            console.error('Database does not exist. Please create the database first.');
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('Access denied. Please check your username and password.');
        }
        process.exit(1);
    } finally {
        if (connection) connection.release();
    }
}

testConnection();

module.exports = pool; 