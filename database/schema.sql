DROP DATABASE SemesterProject2;
-- Create database
CREATE DATABASE IF NOT EXISTS SemesterProject2;
USE SemesterProject2;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('participant', 'organizer', 'sponsor', 'admin', 'judge') NOT NULL DEFAULT 'participant',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Venues table
CREATE TABLE IF NOT EXISTS venues (
    venue_id INT AUTO_INCREMENT PRIMARY KEY,
    venue_name VARCHAR(100) NOT NULL,
    capacity INT NOT NULL,
    facilities TEXT,
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
    event_id INT AUTO_INCREMENT PRIMARY KEY,
    event_name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    event_date DATE,
    max_participants INT,
    registered_participants INT DEFAULT 0,
    venue_id INT,
    organizer_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (venue_id) REFERENCES venues(venue_id),
    FOREIGN KEY (organizer_id) REFERENCES users(user_id)
);

-- Sponsors table
CREATE TABLE IF NOT EXISTS sponsors (
    sponsor_id INT AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(100) NOT NULL,
    contact_person VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    sponsorship_level ENUM('title', 'gold', 'silver') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    user_id INT,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Sponsorships table (relates users and sponsors)
CREATE TABLE IF NOT EXISTS sponsorships (
    sponsorship_id INT AUTO_INCREMENT PRIMARY KEY,
    sponsor_id INT NOT NULL,
    user_id INT NOT NULL,
    event_id INT NOT NULL,
    sponsorship_type ENUM('title', 'gold', 'silver') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sponsor_id) REFERENCES sponsors(sponsor_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (event_id) REFERENCES events(event_id)
);

-- Participants table (for tracking participants in events)
CREATE TABLE IF NOT EXISTS participants (
    participant_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    event_id INT NOT NULL,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_participant_event (user_id, event_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (event_id) REFERENCES events(event_id)
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_type ENUM('registration', 'sponsorship', 'accommodation') NOT NULL,
    status ENUM('pending', 'completed', 'failed') NOT NULL,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Accommodations table
CREATE TABLE IF NOT EXISTS accommodations (
    accommodation_id INT AUTO_INCREMENT PRIMARY KEY,
    room_type VARCHAR(50) NOT NULL,
    capacity INT NOT NULL,
    price_per_night DECIMAL(10,2) NOT NULL,
    available_rooms INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Judges table
CREATE TABLE IF NOT EXISTS judges (
    judge_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Judging table (for scoring participants)
CREATE TABLE IF NOT EXISTS judging (
    judging_id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    judge_id INT NOT NULL,
    participant_id INT NOT NULL,
    score DECIMAL(5,2) NOT NULL,
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(event_id),
    FOREIGN KEY (judge_id) REFERENCES judges(judge_id),
    FOREIGN KEY (participant_id) REFERENCES participants(participant_id)
);

-- Reminders table (for event scheduler)
CREATE TABLE IF NOT EXISTS reminders (
    reminder_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    event_id INT NOT NULL,
    reminder_date DATETIME NOT NULL,
    message TEXT,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (event_id) REFERENCES events(event_id)
);

-- Views
CREATE OR REPLACE VIEW event_participants AS
SELECT e.event_id, e.event_name, u.user_id, u.name AS participant_name, u.email AS participant_email
FROM participants p
JOIN users u ON p.user_id = u.user_id
JOIN events e ON p.event_id = e.event_id;

CREATE OR REPLACE VIEW event_schedules AS
SELECT e.event_id, e.event_name, e.event_date, v.venue_name, v.location
FROM events e
JOIN venues v ON e.venue_id = v.venue_id;

-- Stored Procedure: Auto-generate event schedule
DELIMITER $$
CREATE PROCEDURE AutoScheduleEvent(IN in_event_id INT, IN in_venue_id INT, IN in_event_date DATE)
BEGIN
    -- Only schedule if event is not already scheduled
    IF (SELECT event_date FROM events WHERE event_id = in_event_id) IS NULL THEN
        UPDATE events SET venue_id = in_venue_id, event_date = in_event_date WHERE event_id = in_event_id;
    END IF;
END $$
DELIMITER ;

-- Trigger: Automatically mark payment as 'completed' after fee submission
DELIMITER $$
CREATE TRIGGER after_payment_insert
AFTER INSERT ON payments
FOR EACH ROW
BEGIN
    IF NEW.status = 'pending' THEN
        UPDATE payments SET status = 'completed' WHERE payment_id = NEW.payment_id;
    END IF;
END $$
DELIMITER ;

-- Event Scheduler: Send reminders for event participation (example, updates a reminders table)
DELIMITER $$
CREATE EVENT IF NOT EXISTS send_event_reminders
ON SCHEDULE EVERY 1 DAY
DO
BEGIN
    INSERT INTO reminders (user_id, event_id, reminder_date, message)
    SELECT p.user_id, p.event_id, NOW(), CONCAT('Reminder: Your event is on ', e.event_date)
    FROM participants p
    JOIN events e ON p.event_id = e.event_id;
END $$
DELIMITER ;

-- Create indexes for better performance
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_events_dates ON events(event_date);
CREATE INDEX idx_venues_capacity ON venues(capacity);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_judging_event ON judging(event_id);

-- DCL: Grant and Revoke permissions for user roles
-- (These statemen-- ts are for the DBA to run as needed)
-- DESCRIBE sponsorships;
-- DESCRIBE sponsors;
-- Example: Create MySQL users for each role
-- CREATE USER 'admin_user'@'localhost' IDENTIFIED BY 'admin_pass';
-- CREATE USER 'organizer_user'@'localhost' IDENTIFIED BY 'organizer_pass';
-- CREATE USER 'participant_user'@'localhost' IDENTIFIED BY 'participant_pass';
-- CREATE USER 'sponsor_user'@'localhost' IDENTIFIED BY 'sponsor_pass';
-- CREATE USER 'judge_user'@'localhost' IDENTIFIED BY 'judge_pass';

-- Grant permissions
-- GRANT ALL PRIVILEGES ON SemesterProject2.* TO 'admin_user'@'localhost';
-- GRANT SELECT, INSERT, UPDATE ON SemesterProject2.events TO 'organizer_user'@'localhost';
-- GRANT SELECT ON SemesterProject2.events TO 'participant_user'@'localhost';
-- GRANT SELECT, INSERT ON SemesterProject2.sponsorships TO 'sponsor_user'@'localhost';
-- GRANT SELECT, INSERT, UPDATE ON SemesterProject2.judging TO 'judge_user'@'localhost';

-- Revoke example
-- REVOKE INSERT, UPDATE ON SemesterProject2.events FROM 'participant_user'@'localhost';

-- To apply changes
-- FLUSH PRIVILEGES;
-- For sponsorships table
-- ALTER TA-- BLE -- sponsorships
--     -- ADD COLUMN sponsorship_type ENUM('title','gold','silver','bronze') NOT NULL DEFAULT 'silver',
--     ADD COLUMN status ENUM('Confirmed','Pending','Under Review') DEFAULT 'Pending';
-- INSERT INTO users (name, email, password, role)
-- VALUES ('Admin', 'admin@gmail.com', '$2b$10$CwTycUXWue0Thq9StjUM0uJ8i6z5FQxQ4NEEraPFc.CB6V4D4h3eK', 'admin');
-- -- For sponsors table
-- ALTER TABLE sponsors
--     ADD COLUMN email VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN status ENUM('active','inactive') DEFAULT 'active';

INSERT INTO users (name, email, password, role)
VALUES
  -- ('Admin User', 'admin@gmail.com', 'admin_hashed_pass', 'admin'),
  ('Ali Organizer', 'ali.organizer@example.com', 'org_hashed_pass', 'organizer'),
  ('Sara Sponsor', 'sara.sponsor@example.com', 'sponsor_hashed_pass', 'sponsor'),
  ('Bilal Participant', 'bilal.participant@example.com', 'participant_hashed_pass', 'participant'),
  ('Judge John', 'judge.john@example.com', 'judge_hashed_pass', 'judge');

INSERT INTO venues (venue_name, capacity, facilities, location)
VALUES
  ('Main Hall', 200, 'Projector, WiFi, AC', 'Block A'),
  ('Conference Room', 100, 'Microphones, AC', 'Block B');

INSERT INTO events (event_name, description, category, event_date, max_participants, venue_id, organizer_id)
VALUES
  ('Tech Talk', 'A session with industry experts', 'Technical', '2025-06-20', 100, 1, 1),
  ('Startup Pitch', 'Business pitching event', 'Business', '2025-06-21', 50, 2, 1);

INSERT INTO sponsors (company_name, contact_person, email, phone, sponsorship_level, amount)
VALUES
  ('TechCorp Ltd.', 'Ayesha Khan', 'ayesha@techcorp.com', '03001234567', 'gold', 150000),
  ('InnoSoft', 'Ahmed Raza', 'ahmed@innosoft.com', '03007654321', 'silver', 100000);

INSERT INTO sponsorships (sponsor_id, user_id, event_id, sponsorship_type, amount)
VALUES
  (1, 8, 1, 'gold', 150000);   -- TechCorp sponsoring Tech Talk
--   (2, 3, 2, 'silver', 100000); -- InnoSoft sponsoring Startup Pitch

INSERT INTO participants (user_id, event_id)
VALUES
  (9, 1);  -- Bilal participating in Tech Talk


INSERT INTO payments (user_id, amount, payment_type, status)
VALUES
  (7, 500.00, 'registration', 'completed'),
  (9, 100000.00, 'sponsorship', 'completed');


INSERT INTO accommodations (room_type, capacity, price_per_night, available_rooms)
VALUES
  ('Single', 1, 3000.00, 10),
  ('Double', 2, 5000.00, 5);

INSERT INTO judges (name, email)
VALUES
  ('Judge John', 'judge.john@example.com');

INSERT INTO judging (event_id, judge_id, participant_id, score, comments)
VALUES
  (1, 1, 3, 8.5, 'Great presentation');
  -- (2, 1, 2, 9.0, 'Innovative idea');

INSERT INTO reminders (user_id, event_id, reminder_date, message)
VALUES
  (7, 1, '2025-06-19 10:00:00', 'Reminder: Tech Talk is tomorrow!'),
  (10, 2, '2025-06-20 10:00:00', 'Reminder: Startup Pitch is tomorrow!');


ALTER TABLE sponsorships ADD COLUMN status VARCHAR(50) DEFAULT 'pending';

ALTER TABLE participants
DROP FOREIGN KEY participants_ibfk_1;

ALTER TABLE participants
ADD CONSTRAINT participants_ibfk_1
FOREIGN KEY (user_id) REFERENCES users(user_id)
ON DELETE CASCADE;

ALTER TABLE participants
DROP FOREIGN KEY participants_ibfk_2;

ALTER TABLE participants
ADD CONSTRAINT participants_ibfk_2
FOREIGN KEY (event_id) REFERENCES events(event_id)
ON DELETE CASCADE;

ALTER TABLE sponsorships
DROP FOREIGN KEY sponsorships_ibfk_2;

ALTER TABLE sponsorships
ADD CONSTRAINT sponsorships_ibfk_2
FOREIGN KEY (user_id) REFERENCES users(user_id)
ON DELETE CASCADE;

ALTER TABLE sponsorships
DROP FOREIGN KEY sponsorships_ibfk_1;

ALTER TABLE sponsorships
ADD CONSTRAINT sponsorships_ibfk_1
FOREIGN KEY (sponsor_id) REFERENCES sponsors(sponsor_id)
ON DELETE CASCADE;

ALTER TABLE sponsorships
DROP FOREIGN KEY sponsorships_ibfk_3;

ALTER TABLE sponsorships
ADD CONSTRAINT sponsorships_ibfk_3
FOREIGN KEY (event_id) REFERENCES events(event_id)
ON DELETE CASCADE;

ALTER TABLE payments
DROP FOREIGN KEY payments_ibfk_1;

ALTER TABLE payments
ADD CONSTRAINT payments_ibfk_1
FOREIGN KEY (user_id) REFERENCES users(user_id)
ON DELETE CASCADE;

ALTER TABLE judging
DROP FOREIGN KEY judging_ibfk_1;

ALTER TABLE judging
ADD CONSTRAINT judging_ibfk_1
FOREIGN KEY (event_id) REFERENCES events(event_id)
ON DELETE CASCADE;

ALTER TABLE judging
DROP FOREIGN KEY judging_ibfk_2;

ALTER TABLE judging
ADD CONSTRAINT judging_ibfk_2
FOREIGN KEY (judge_id) REFERENCES judges(judge_id)
ON DELETE CASCADE;

ALTER TABLE judging
DROP FOREIGN KEY judging_ibfk_3;

ALTER TABLE judging
ADD CONSTRAINT judging_ibfk_3
FOREIGN KEY (participant_id) REFERENCES participants(participant_id)
ON DELETE CASCADE;

ALTER TABLE reminders
DROP FOREIGN KEY reminders_ibfk_1;

ALTER TABLE reminders
ADD CONSTRAINT reminders_ibfk_1
FOREIGN KEY (user_id) REFERENCES users(user_id)
ON DELETE CASCADE;

ALTER TABLE reminders
DROP FOREIGN KEY reminders_ibfk_2;

ALTER TABLE reminders
ADD CONSTRAINT reminders_ibfk_2
FOREIGN KEY (event_id) REFERENCES events(event_id)
ON DELETE CASCADE;


-- INSERT INTO sponsorships (sponsor_id, user_id, event_id, sponsorship_type, amount, status)
-- VALUES (1, 8, 1, 'gold', 150000, 'Confirmed');
-- INSERT INTO sponsors (company_name, contact_person, email, phone, sponsorship_level, amount, user_id)
-- VALUES ('Test Company', 'Test Person', 'test@example.com', '1234567890', 'gold', 100000, 15);
--   INSERT INTO sponsorships (sponsor_id, user_id, event_id, sponsorship_type, amount, status)
--   VALUES (3, 15, 1, 'gold', 100000, 'Confirmed');
--   
-- -- Judging records that match existing participant-event combinations
-- INSERT INTO judging (event_id, judge_id, participant_id, score, comments)
-- VALUES
--   (3, 1, 4, 8.5, 'Excellent technical demonstration'),  -- participant_id 4 (user_id 11) in event 3
--   (1, 1, 5, 7.8, 'Good presentation but needs more depth'),  -- participant_id 5 (user_id 11) in event 1
--   (2, 1, 6, 9.2, 'Outstanding performance'),  -- participant_id 6 (user_id 11) in event 2
--   (3, 1, 7, 8.0, 'Solid technical skills'),  -- participant_id 7 (user_id 17) in event 3
--   (1, 1, 8, 8.7, 'Very knowledgeable'),  -- participant_id 8 (user_id 17) in event 1
--   (2, 1, 9, 7.5, 'Good but needs improvement'),  -- participant_id 9 (user_id 17) in event 2
--   (3, 1, 10, 9.5, 'Exceptional work'),  -- participant_id 10 (user_id 18) in event 3
--   (6, 1, 11, 8.8, 'Innovative approach'),  -- participant_id 11 (user_id 18) in event 6
--   (1, 1, 12, 7.0, 'Average performance'),  -- participant_id 12 (user_id 18) in event 1
--   (2, 1, 13, 8.3, 'Good potential');  -- participant_id 13 (user_id 18) in event 2
--   
--   INSERT INTO judging (event_id, judge_id, participant_id, score, comments)
-- VALUES
--   (3, 3, 4, 8.5, 'Excellent technical demonstration');
--     INSERT INTO judging (event_id, judge_id, participant_id, score, comments)
-- VALUES
--   (3, 3, 9, 0, 'Excellent technical demonstration');
-- DELETE FROM participants
-- WHERE user_id = 18    ;

select * from users;
select * from judges;
select * from participants;
select * from sponsorships;
SELECT * FROM accommodations;
select * from events;
select * from sponsors;
select * from judging;
select * from payments;





--   SELECT * FROM sponsors WHERE user_id = 15;
--   UPDATE sponsors SET user_id = 12 WHERE sponsor_id = 1; -- set to the correct user_id
-- UPDATE sponsors SET user_id = 13 WHERE sponsor_id = 2;
-- ALTER TABLE events ADD COLUMN registration_fee DECIMAL(10,2) DEFAULT NULL;
-- ALTER TABLE events
--     ADD COLUMN organizer_id INT NULL,
--     ADD CONSTRAINT fk_events_organizer
--         FOREIGN KEY (organizer_id) REFERENCES users(user_id);
-- -- UPDATE events SET organizer_id = 1; -- or the correct user_id for each event

-- SELECT e.event_name, e.event_date, v.venue_name
-- FROM sponsorships s
-- JOIN events e ON s.event_id = e.event_id
-- LEFT JOIN venues v ON e.venue_id = v.venue_id
-- WHERE s.sponsor_id = 3
-- ORDER BY e.event_date ASC;

-- ALTER TABLE judges ADD COLUMN contact VARCHAR(100);
-- UPDATE judges SET contact = '0300-1234567' WHERE email = 'check@gmail.com';
-- SELECT 
--     e.event_id, 
--     e.event_name, 
--     NULL as round, 
--     ANY_VALUE(u.name) as winner
-- FROM events e
-- JOIN judging j ON e.event_id = j.event_id
-- JOIN participants p ON j.participant_id = p.participant_id
-- JOIN users u ON p.user_id = u.user_id
-- WHERE j.judge_id = 3
--   AND j.score = (
--       SELECT MAX(j2.score) FROM judging j2 WHERE j2.event_id = e.event_id AND j2.judge_id = 3
--   )
-- GROUP BY e.event_id, e.event_name;

-- SELECT * FROM judging WHERE judge_id = 3;

-- describe payments;
--   ALTER TABLE judging MODIFY score DECIMAL(5,2) NULL;
--   
--     SELECT * FROM judging WHERE event_id = 7;
--     
--       SELECT 
--       p.participant_id,
--       u.name AS participant_name,
--       AVG(j.score) AS avg_score
--   FROM judging j
--   JOIN participants p ON j.participant_id = p.participant_id
--   JOIN users u ON p.user_id = u.user_id
--   WHERE j.event_id = 7
--   GROUP BY p.participant_id
--   ORDER BY avg_score DESC