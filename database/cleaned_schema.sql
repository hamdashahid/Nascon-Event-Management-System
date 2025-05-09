-- Create the SemesterProject Database
DROP DATABASE IF EXISTS SemesterProject;
CREATE DATABASE SemesterProject;
USE SemesterProject;

-- Table: users
CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    password VARCHAR(255),
    role ENUM('admin', 'participant', 'organizer', 'judge', 'sponsor'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('active', 'inactive') DEFAULT 'active',
    last_payment_date TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: venues
CREATE TABLE venues (
    venue_id INT PRIMARY KEY AUTO_INCREMENT,
    venue_name VARCHAR(100),
    capacity INT,
    facilities TEXT,
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: events
CREATE TABLE events (
    event_id INT PRIMARY KEY AUTO_INCREMENT,
    event_name VARCHAR(100),
    description TEXT,
    category ENUM(
        'Tech Events',
        'Business Competitions',
        'Gaming Tournaments',
        'General Events'
    ) NOT NULL ,
    event_date DATE,
    max_participants INT,
    registered_participants INT,
    venue_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    registration_fee DECIMAL(10,2),
    organizer_id INT,
    FOREIGN KEY (venue_id) REFERENCES venues(venue_id),
    FOREIGN KEY (organizer_id) REFERENCES users(user_id)
);

-- Table: participants
CREATE TABLE participants (
    participant_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    event_id INT,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (event_id) REFERENCES events(event_id)
);

-- Table: judges
CREATE TABLE judges (
    judge_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100),
    email VARCHAR(100),
    contact VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: judging
CREATE TABLE judging (
    judging_id INT PRIMARY KEY AUTO_INCREMENT,
    event_id INT,
    judge_id INT,
    participant_id INT,
    score DECIMAL(5,2),
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(event_id),
    FOREIGN KEY (judge_id) REFERENCES judges(judge_id),
    FOREIGN KEY (participant_id) REFERENCES participants(participant_id)
);

-- Table: accommodations
CREATE TABLE accommodations (
    accommodation_id INT PRIMARY KEY AUTO_INCREMENT,
    room_type VARCHAR(50),
    capacity INT,
    price_per_night DECIMAL(10,2),
    available_rooms INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table: user_accommodations
CREATE TABLE user_accommodations (
    user_id INT,
    accommodation_id INT,
    booked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, accommodation_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (accommodation_id) REFERENCES accommodations(accommodation_id)
);
-- Drop the old payments table if it exists
DROP TABLE IF EXISTS payments;

-- Create the improved payments table
CREATE TABLE payments (
    payment_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    event_id INT,
    amount DECIMAL(10,2),
    payment_type ENUM('registration', 'accommodation', 'sponsorship'),
    status ENUM('pending', 'completed', 'failed'),
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Unique constraint to prevent duplicate payments for the same user, event, and type
    UNIQUE KEY unique_payment (user_id, event_id, payment_type),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (event_id) REFERENCES events(event_id)
);
-- Table: reminders
CREATE TABLE reminders (
    reminder_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    event_id INT,
    reminder_date DATETIME,
    message TEXT,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (event_id) REFERENCES events(event_id)
);

-- Table: sponsors
CREATE TABLE sponsors (
    sponsor_id INT PRIMARY KEY AUTO_INCREMENT,
    company_name VARCHAR(100),
    contact_person VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    sponsorship_level ENUM('Gold', 'Silver', 'Bronze'),
    amount DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    user_id INT,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);
-- Table: sponsorships
CREATE TABLE sponsorships (
    sponsorship_id INT PRIMARY KEY AUTO_INCREMENT,
    sponsor_id INT,
    user_id INT,
    event_id INT,
    sponsorship_type ENUM('Gold', 'Silver', 'Title'),
    amount DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50),
    FOREIGN KEY (sponsor_id) REFERENCES sponsors(sponsor_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (event_id) REFERENCES events(event_id)
);


CREATE TABLE event_judges (
    event_judge_id INT PRIMARY KEY AUTO_INCREMENT,
    event_id INT,
    judge_id INT,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(event_id),
    FOREIGN KEY (judge_id) REFERENCES judges(judge_id)
);


-- Insert sample venues
INSERT INTO venues (venue_name, capacity, facilities, location)
VALUES
('Main Auditorium', 500, 'Stage, Sound System, Projector', 'Building A - Ground Floor'),
('Tech Lab 1', 30, 'Computers, Projector, High-speed Internet', 'Building B - Room 101'),
('Conference Hall', 100, 'Projector, Mic System, Air Conditioning', 'Building C - 2nd Floor'),
('Outdoor Lawn', 300, 'Open Space, Tent Area, Lighting', 'Campus Center Lawn'),
('Innovation Lab', 25, '3D Printer, IoT Kits, Workstations', 'Building D - Basement'),
('Multipurpose Hall', 200, 'Stage, Sound System, AC', 'Building E - 1st Floor'),
('Seminar Hall', 80, 'Projector, Chairs, Podium', 'Building F - Room 203'),
('Sports Ground', 1000, 'Cricket Pitch, Football Field, Bleachers', 'Back of Campus'),
('Computer Lab 2', 40, 'High-end PCs, Internet, Whiteboard', 'Building B - Room 102'),
('Open Courtyard', 150, 'Pavilion, Seating Area, Lights', 'Near Cafeteria'),
('Research Center', 50, 'Research Equipment, Meeting Rooms, Library', 'Building G - 3rd Floor'),
('Art Studio', 35, 'Art Supplies, Natural Lighting, Display Area', 'Building H - 1st Floor'),
('Music Room', 45, 'Piano, Sound System, Acoustic Panels', 'Building I - 2nd Floor'),
('Business Center', 120, 'Conference Rooms, Video Conferencing, Lounge', 'Building J - Ground Floor'),
('Science Lab', 40, 'Lab Equipment, Safety Gear, Storage', 'Building K - 1st Floor'),
('Media Center', 60, 'Recording Studio, Green Screen, Editing Suites', 'Building L - 2nd Floor'),
('Gymnasium', 200, 'Sports Equipment, Changing Rooms, First Aid', 'Building M - Ground Floor'),
('Cafeteria Hall', 250, 'Food Court, Seating Area, Stage', 'Building N - Ground Floor'),
('Exhibition Hall', 400, 'Display Areas, Lighting, Security', 'Building O - 1st Floor'),
-- ('Innovation Lab', 25, '3D Printer, IoT Kits, Workstations', 'Building D - Basement'),
-- ('Multipurpose Hall', 200, 'Stage, Sound System, AC', 'Building E - 1st Floor'),
-- ('Seminar Hall', 80, 'Projector, Chairs, Podium', 'Building F - Room 203'),
-- ('Sports Ground', 1000, 'Cricket Pitch, Football Field, Bleachers', 'Back of Campus'),
-- ('Computer Lab 2', 40, 'High-end PCs, Internet, Whiteboard', 'Building B - Room 102'),
('Open Courtyard', 150, 'Pavilion, Seating Area, Lights', 'Near Cafeteria');


-- Create indexes for better performance
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_events_dates ON events(event_date);
CREATE INDEX idx_venues_capacity ON venues(capacity);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_judging_event ON judging(event_id);

select * from payments;
SHOW TRIGGERS LIKE 'payments';

select * from sponsorships;

-- Drop existing unique constraint if it exists
-- DROP INDEX   unique_venue_date ON events;

-- Add unique constraint to prevent venue-date conflicts
ALTER TABLE events
ADD CONSTRAINT unique_venue_date UNIQUE (venue_id, event_date);

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS prevent_event_overlap;
DROP TRIGGER IF EXISTS prevent_event_overlap_update;

-- Create a trigger to prevent event overlaps and validate capacity
DELIMITER //
CREATE TRIGGER prevent_event_overlap
BEFORE INSERT ON events
FOR EACH ROW
BEGIN
    DECLARE venue_exists INT;
    DECLARE venue_booked INT;

    -- Check if venue exists
    SELECT COUNT(*) INTO venue_exists
    FROM venues 
    WHERE venue_id = NEW.venue_id;

    IF venue_exists = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid venue ID';
    END IF;

    -- Check if venue is already booked for this date
    SELECT COUNT(*) INTO venue_booked
    FROM events
    WHERE venue_id = NEW.venue_id
    AND event_date = NEW.event_date;

    IF venue_booked > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'This venue is already booked for the selected date';
    END IF;
END //
DELIMITER ;

-- Create a trigger to prevent updates that would create overlaps
DELIMITER //
CREATE TRIGGER prevent_event_overlap_update
BEFORE UPDATE ON events
FOR EACH ROW
BEGIN
    DECLARE venue_booked INT;
    
    -- Check if venue is already booked for this date (excluding current event)
    SELECT COUNT(*) INTO venue_booked
    FROM events
    WHERE venue_id = NEW.venue_id
    AND event_date = NEW.event_date
    AND event_id != NEW.event_id;
    
    IF venue_booked > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'This venue is already booked for the selected date';
    END IF;
END //
DELIMITER ;

-- Create a view for venue availability
CREATE VIEW venue_availability AS
SELECT 
    v.venue_id,
    v.venue_name,
    v.capacity,
    v.location,
    e.event_date,
    CASE 
        WHEN e.event_id IS NULL THEN 'Available'
        ELSE 'Booked'
    END as status,
    e.event_name as booked_event,
    e.max_participants as event_capacity,
    e.registered_participants as current_registrations
FROM venues v
LEFT JOIN events e ON v.venue_id = e.venue_id
ORDER BY v.venue_name, e.event_date;

-- Create a view for venue schedules
CREATE VIEW venue_schedules AS
SELECT 
    v.venue_name,
    e.event_name,
    e.event_date,
    e.category,
    e.max_participants,
    e.registered_participants,
    u.name as organizer_name,
    CASE 
        WHEN e.registered_participants >= e.max_participants THEN 'Fully Booked'
        WHEN e.registered_participants >= (e.max_participants * 0.8) THEN 'Almost Full'
        ELSE 'Available'
    END as registration_status
FROM venues v
LEFT JOIN events e ON v.venue_id = e.venue_id
LEFT JOIN users u ON e.organizer_id = u.user_id
ORDER BY v.venue_name, e.event_date;

-- Create a stored procedure to check venue availability
DELIMITER //
CREATE PROCEDURE check_venue_availability(
    IN p_venue_id INT,
    IN p_date DATE
)
BEGIN
    SELECT 
        v.venue_id,
        v.venue_name,
        v.capacity,
        v.location,
        CASE 
            WHEN e.event_id IS NULL THEN 'Available'
            ELSE 'Booked'
        END as status,
        e.event_name as booked_event
    FROM venues v
    LEFT JOIN events e ON v.venue_id = e.venue_id 
        AND e.event_date = p_date
    WHERE v.venue_id = p_venue_id;
END //
DELIMITER ;

-- Create a stored procedure to get venue schedule for a date range
DELIMITER //
CREATE PROCEDURE get_venue_schedule(
    IN p_start_date DATE,
    IN p_end_date DATE
)
BEGIN
    SELECT 
        v.venue_name,
        e.event_name,
        e.event_date,
        e.category,
        e.max_participants,
        e.registered_participants,
        u.name as organizer_name,
        CASE 
            WHEN e.event_id IS NULL THEN 'Available'
            ELSE 'Booked'
        END as status
    FROM venues v
    LEFT JOIN events e ON v.venue_id = e.venue_id 
        AND e.event_date BETWEEN p_start_date AND p_end_date
    LEFT JOIN users u ON e.organizer_id = u.user_id
    ORDER BY v.venue_name, e.event_date;
END //
DELIMITER ;

-- Create a view for venue utilization statistics
CREATE VIEW venue_utilization_stats AS
SELECT 
    v.venue_id,
    v.venue_name,
    v.capacity,
    COUNT(e.event_id) as total_events,
    SUM(e.max_participants) as total_participants,
    AVG(e.max_participants) as avg_participants,
    MAX(e.max_participants) as max_participants,
    MIN(e.max_participants) as min_participants,
    (COUNT(e.event_id) * 100.0 / 
        (SELECT COUNT(DISTINCT event_date) FROM events)) as utilization_percentage
FROM venues v
LEFT JOIN events e ON v.venue_id = e.venue_id
GROUP BY v.venue_id, v.venue_name, v.capacity;

-- Create a stored procedure to generate venue schedule report
DELIMITER //
CREATE PROCEDURE generate_venue_schedule_report(
    IN p_start_date DATE,
    IN p_end_date DATE
)
BEGIN
    -- Generate a report of venue schedules for the date range
    SELECT 
        v.venue_name,
        v.capacity,
        v.location,
        e.event_date,
        e.event_name,
        e.category,
        e.max_participants,
        e.registered_participants,
        u.name as organizer_name,
        CASE 
            WHEN e.event_id IS NULL THEN 'Available'
            ELSE 'Booked'
        END as status
    FROM venues v
    LEFT JOIN events e ON v.venue_id = e.venue_id 
        AND e.event_date BETWEEN p_start_date AND p_end_date
    LEFT JOIN users u ON e.organizer_id = u.user_id
    ORDER BY v.venue_name, e.event_date;
END //
DELIMITER ;

-- Table for event rounds
CREATE TABLE event_rounds (
    round_id INT PRIMARY KEY AUTO_INCREMENT,
    event_id INT,
    round_type ENUM('Prelims', 'Semi-Finals', 'Finals'),
    round_date DATE,
    start_time TIME,
    end_time TIME,
    venue_id INT,
    max_participants INT,
    status ENUM('Scheduled', 'In Progress', 'Completed') DEFAULT 'Scheduled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(event_id),
    FOREIGN KEY (venue_id) REFERENCES venues(venue_id)
);

-- Table for teams
CREATE TABLE teams (
    team_id INT PRIMARY KEY AUTO_INCREMENT,
    team_name VARCHAR(100),
    event_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(event_id)
);

-- Table for team members
CREATE TABLE team_members (
    team_id INT,
    user_id INT,
    role VARCHAR(50),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (team_id, user_id),
    FOREIGN KEY (team_id) REFERENCES teams(team_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Table for round participants (individuals and teams)
CREATE TABLE round_participants (
    participant_id INT PRIMARY KEY AUTO_INCREMENT,
    round_id INT,
    user_id INT NULL,
    team_id INT NULL,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('Registered', 'Confirmed', 'Cancelled') DEFAULT 'Registered',
    FOREIGN KEY (round_id) REFERENCES event_rounds(round_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (team_id) REFERENCES teams(team_id),
    CHECK (
        (user_id IS NOT NULL AND team_id IS NULL) OR
        (user_id IS NULL AND team_id IS NOT NULL)
    )
);

-- Stored procedure for team registration
DELIMITER //
CREATE PROCEDURE register_team(
    IN p_team_name VARCHAR(100),
    IN p_event_id INT,
    IN p_team_members JSON
)
BEGIN
    DECLARE v_team_id INT;
    DECLARE i INT DEFAULT 0;
    DECLARE v_member_id INT;
    
    -- Start transaction
    START TRANSACTION;
    
    -- Create team
    INSERT INTO teams (team_name, event_id)
    VALUES (p_team_name, p_event_id);
    
    SET v_team_id = LAST_INSERT_ID();
    
    -- Add team members
    WHILE i < JSON_LENGTH(p_team_members) DO
        SET v_member_id = JSON_EXTRACT(p_team_members, CONCAT('$[', i, ']'));
        
        -- Check if user is already in a team for this event
        IF EXISTS (
            SELECT 1 
            FROM team_members tm
            JOIN teams t ON tm.team_id = t.team_id
            WHERE tm.user_id = v_member_id
            AND t.event_id = p_event_id
        ) THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'User is already in a team for this event';
        END IF;
        
        INSERT INTO team_members (team_id, user_id, role)
        VALUES (v_team_id, v_member_id, 'member');
        
        SET i = i + 1;
    END WHILE;
    
    COMMIT;
END //
DELIMITER ;

-- Stored procedure for scheduling event rounds
DELIMITER //
CREATE PROCEDURE schedule_event_rounds(
    IN p_event_id INT,
    IN p_prelims_date DATE,
    IN p_semifinals_date DATE,
    IN p_finals_date DATE
)
BEGIN
    DECLARE v_venue_id INT;
    DECLARE v_max_participants INT;
    
    -- Get event details
    SELECT venue_id, max_participants 
    INTO v_venue_id, v_max_participants
    FROM events 
    WHERE event_id = p_event_id;
    
    -- Schedule Prelims
    INSERT INTO event_rounds (
        event_id, round_type, round_date, 
        venue_id, max_participants
    ) VALUES (
        p_event_id, 'Prelims', p_prelims_date,
        v_venue_id, v_max_participants
    );
    
    -- Schedule Semi-Finals (with reduced participants)
    INSERT INTO event_rounds (
        event_id, round_type, round_date,
        venue_id, max_participants
    ) VALUES (
        p_event_id, 'Semi-Finals', p_semifinals_date,
        v_venue_id, FLOOR(v_max_participants * 0.5)
    );
    
    -- Schedule Finals (with further reduced participants)
    INSERT INTO event_rounds (
        event_id, round_type, round_date,
        venue_id, max_participants
    ) VALUES (
        p_event_id, 'Finals', p_finals_date,
        v_venue_id, FLOOR(v_max_participants * 0.25)
    );
END //
DELIMITER ;

-- View for team registrations
CREATE VIEW team_registrations AS
SELECT 
    t.team_id,
    t.team_name,
    e.event_name,
    COUNT(tm.user_id) as team_size,
    GROUP_CONCAT(u.name) as team_members
FROM teams t
JOIN events e ON t.event_id = e.event_id
JOIN team_members tm ON t.team_id = tm.team_id
JOIN users u ON tm.user_id = u.user_id
GROUP BY t.team_id, t.team_name, e.event_name;

-- View for event rounds schedule
CREATE VIEW event_rounds_schedule AS
SELECT 
    e.event_name,
    er.round_type,
    er.round_date,
    er.start_time,
    er.end_time,
    v.venue_name,
    er.max_participants,
    COUNT(rp.participant_id) as registered_participants,
    er.status
FROM event_rounds er
JOIN events e ON er.event_id = e.event_id
JOIN venues v ON er.venue_id = v.venue_id
LEFT JOIN round_participants rp ON er.round_id = rp.round_id
GROUP BY er.round_id
ORDER BY e.event_name, er.round_date, er.start_time;

-- Create a view for event statistics
CREATE VIEW event_statistics AS
SELECT 
    e.event_id,
    e.event_name,
    e.category,
    e.event_date,
    COUNT(p.participant_id) as total_participants,
    COUNT(DISTINCT t.team_id) as total_teams,
    SUM(pay.amount) as total_revenue
FROM events e
LEFT JOIN participants p ON e.event_id = p.event_id
LEFT JOIN teams t ON e.event_id = t.event_id
LEFT JOIN payments pay ON e.event_id = pay.event_id
GROUP BY e.event_id, e.event_name, e.category, e.event_date;

-- View for participant lists
CREATE VIEW participant_lists AS
SELECT 
    e.event_id,
    e.event_name,
    u.user_id,
    u.name as participant_name,
    u.email,
    p.registration_date,
    t.team_name
FROM events e
JOIN participants p ON e.event_id = p.event_id
JOIN users u ON p.user_id = u.user_id
LEFT JOIN team_members tm ON u.user_id = tm.user_id
LEFT JOIN teams t ON tm.team_id = t.team_id
ORDER BY e.event_id, u.name;

-- Trigger to update payment status
DELIMITER //
CREATE TRIGGER update_payment_status
AFTER INSERT ON payments
FOR EACH ROW
BEGIN
    IF NEW.status = 'completed' THEN
        -- Update user's last payment date
        UPDATE users 
        SET last_payment_date = CURRENT_TIMESTAMP
        WHERE user_id = NEW.user_id;
        
        -- If it's a registration payment, update participant status
        IF NEW.payment_type = 'registration' THEN
            INSERT INTO participants (user_id, event_id)
            VALUES (NEW.user_id, NEW.event_id);
        END IF;
    END IF;
END //
DELIMITER ;

-- Event Scheduler for reminders
DELIMITER //
CREATE EVENT send_event_reminders
ON SCHEDULE EVERY 1 DAY
DO
BEGIN
    -- Insert reminders for events happening in the next 3 days
    INSERT INTO reminders (user_id, event_id, reminder_date, message)
    SELECT 
        p.user_id,
        e.event_id,
        CURRENT_TIMESTAMP,
        CONCAT('Reminder: Event "', e.event_name, '" is happening on ', e.event_date)
    FROM events e
    JOIN participants p ON e.event_id = p.event_id
    WHERE e.event_date BETWEEN CURRENT_DATE AND DATE_ADD(CURRENT_DATE, INTERVAL 3 DAY)
    AND NOT EXISTS (
        SELECT 1 FROM reminders r 
        WHERE r.user_id = p.user_id 
        AND r.event_id = e.event_id
        AND r.reminder_date > DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 1 DAY)
    );
END //
DELIMITER ;

-- Stored procedure for auto-generating event schedules
DELIMITER //
CREATE PROCEDURE generate_event_schedule(
    IN p_start_date DATE,
    IN p_end_date DATE
)
BEGIN
    DECLARE v_current_date DATE;
    DECLARE v_venue_id INT;
    DECLARE v_event_id INT;
    DECLARE done INT DEFAULT FALSE;
    
    -- Cursor for available venues
    DECLARE venue_cursor CURSOR FOR 
        SELECT v.venue_id 
        FROM venues v
        WHERE NOT EXISTS (
            SELECT 1 
            FROM events e 
            WHERE e.venue_id = v.venue_id 
            AND e.event_date = v_current_date
        );
    
    -- Handler for cursor
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    SET v_current_date = p_start_date;
    
    -- Loop through each date in the range
    WHILE v_current_date <= p_end_date DO
        -- Reset done flag for each date
        SET done = FALSE;
        
        -- Open cursor for available venues
        OPEN venue_cursor;
        
        -- Process each available venue
        venue_loop: LOOP
            FETCH venue_cursor INTO v_venue_id;
            
            IF done THEN
                LEAVE venue_loop;
            END IF;
            
            -- Find events that need scheduling
            SELECT event_id INTO v_event_id
            FROM events
            WHERE event_date IS NULL
            AND venue_id IS NULL
            LIMIT 1;
            
            -- If an event is found, schedule it
            IF v_event_id IS NOT NULL THEN
                UPDATE events
                SET 
                    event_date = v_current_date,
                    venue_id = v_venue_id
                WHERE event_id = v_event_id;
            END IF;
        END LOOP;
        
        -- Close cursor
        CLOSE venue_cursor;
        
        -- Move to next date
        SET v_current_date = DATE_ADD(v_current_date, INTERVAL 1 DAY);
    END WHILE;
END //
DELIMITER ;

-- Create roles for different user types
CREATE ROLE IF NOT EXISTS 'admin_role';
CREATE ROLE IF NOT EXISTS 'organizer_role';
CREATE ROLE IF NOT EXISTS 'judge_role';
CREATE ROLE IF NOT EXISTS 'participant_role';
CREATE ROLE IF NOT EXISTS 'sponsor_role';

-- Grant permissions to admin_role
GRANT ALL PRIVILEGES ON SemesterProject.* TO 'admin_role';

-- Grant permissions to organizer_role
GRANT SELECT, INSERT, UPDATE ON SemesterProject.events TO 'organizer_role';
GRANT SELECT ON SemesterProject.venues TO 'organizer_role';
GRANT SELECT, INSERT, UPDATE ON SemesterProject.participants TO 'organizer_role';
GRANT SELECT ON SemesterProject.users TO 'organizer_role';

-- Grant permissions to judge_role
GRANT SELECT ON SemesterProject.events TO 'judge_role';
GRANT SELECT, INSERT, UPDATE ON SemesterProject.judging TO 'judge_role';
GRANT SELECT ON SemesterProject.participants TO 'judge_role';

-- Grant permissions to participant_role
GRANT SELECT ON SemesterProject.events TO 'participant_role';
GRANT SELECT, INSERT ON SemesterProject.participants TO 'participant_role';
GRANT SELECT ON SemesterProject.teams TO 'participant_role';
GRANT SELECT, INSERT ON SemesterProject.team_members TO 'participant_role';

-- Grant permissions to sponsor_role
GRANT SELECT ON SemesterProject.events TO 'sponsor_role';
GRANT SELECT, INSERT, UPDATE ON SemesterProject.sponsors TO 'sponsor_role';
GRANT SELECT, INSERT, UPDATE ON SemesterProject.sponsorships TO 'sponsor_role';

-- Role permissions table
CREATE TABLE role_permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    role VARCHAR(20) NOT NULL,
    permissions JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default role permissions
INSERT INTO role_permissions (role, permissions) VALUES
    ('admin', JSON_ARRAY('all')),
    ('participant', JSON_ARRAY('view_events', 'register_events', 'view_teams', 'manage_teams', 'view_payments', 'make_payments')),
    ('organizer', JSON_ARRAY('manage_events', 'view_participants', 'manage_venues', 'view_payments')),
    ('judge', JSON_ARRAY('view_events', 'manage_scores', 'view_participants')),
    ('sponsor', JSON_ARRAY('view_events', 'manage_sponsorships', 'view_payments'));

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_role_permissions_role ON role_permissions(role);

-- Create trigger to update updated_at timestamp
DELIMITER //
CREATE TRIGGER update_role_permissions_updated_at
BEFORE UPDATE ON role_permissions
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END //
DELIMITER ;

select * from events;

-- ALTER TABLE events
-- ADD CONSTRAINT unique_venue_date UNIQUE (venue_id, event_date);

