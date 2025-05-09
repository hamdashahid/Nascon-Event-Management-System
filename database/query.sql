-- =========================
-- NASCON Event Management System: SQL Queries Reference
-- This file contains all SQL queries used in the backend, organized by feature/role.
-- Each query is preceded by a comment explaining its purpose and where it is used.
-- =========================

-- ========== ADMIN DASHBOARD & ANALYTICS ==========

-- [Admin Overview] Get total users and breakdown by role
-- Used in: /api/users/stats (admin dashboard overview)
SELECT COUNT(*) AS total FROM users;
SELECT role, COUNT(*) AS count FROM users GROUP BY role;

-- [Admin Overview] Get all events
-- Used in: /api/events (admin dashboard overview)
SELECT * FROM events;

-- [Admin Overview] Get total sponsorship revenue
-- Used in: /api/sponsorships/total (admin dashboard overview)
SELECT COALESCE(SUM(amount),0) AS total FROM sponsorships WHERE status = 'Confirmed';

-- [Admin Overview] Get accommodation occupancy (total/occupied)
-- Used in: /api/venues/accommodations/occupancy (admin dashboard overview)
SELECT SUM(capacity) as total, SUM(capacity - available_rooms) as occupied FROM accommodations;

-- [Reports] Event participation stats (event name, participant count)
-- Used in: /api/reports/event-participation
SELECT e.event_id, e.event_name, COUNT(p.participant_id) AS participant_count FROM events e LEFT JOIN participants p ON e.event_id = p.event_id GROUP BY e.event_id ORDER BY participant_count DESC;

-- [Reports] Venue utilization (venue name, capacity, events hosted)
-- Used in: /api/reports/venue-utilization
SELECT v.venue_id, v.venue_name, v.capacity, COUNT(e.event_id) AS events_hosted FROM venues v LEFT JOIN events e ON v.venue_id = e.venue_id GROUP BY v.venue_id ORDER BY events_hosted DESC;

-- [Reports] Financial reports (registration, accommodation, sponsorship revenue)
-- Used in: /api/reports/revenue
SELECT COALESCE(SUM(amount),0) as registration_revenue FROM payments WHERE payment_type = 'registration' AND status = 'completed';
SELECT COALESCE(SUM(amount),0) as accommodation_revenue FROM payments WHERE payment_type = 'accommodation' AND status = 'completed';
SELECT COALESCE(SUM(amount),0) as sponsorship_revenue FROM sponsorships;

-- [Reports] Accommodation occupancy by room type
-- Used in: /api/reports/accommodation-occupancy
SELECT accommodation_id, room_type, capacity, available_rooms, (capacity - available_rooms) as occupied FROM accommodations;

-- [Reports] Participant demographics (by role)
-- Used in: /api/reports/participant-demographics
SELECT role, COUNT(*) as count FROM users GROUP BY role;

-- [Reports] Room allocation (which participant is in which room type)
-- Used in: /api/reports/room-allocation
SELECT a.room_type, u.name, u.email FROM user_accommodations ua JOIN accommodations a ON ua.accommodation_id = a.accommodation_id JOIN users u ON ua.user_id = u.user_id;

-- [Reports] Sponsorship funds collected (by company)
-- Used in: /api/reports/sponsorship-funds
SELECT s.sponsor_id, sp.company_name, SUM(s.amount) as total_funds FROM sponsorships s JOIN sponsors sp ON s.sponsor_id = sp.sponsor_id GROUP BY s.sponsor_id ORDER BY total_funds DESC;

-- ========== EVENTS ==========

-- [Events] Get all events with optional filters (category, date)
-- Used in: /api/events
SELECT e.*, v.venue_name, v.location, v.capacity, COUNT(p.participant_id) as registered_participants, MAX(j.judge_id) as judge_id, MAX(j.name) AS judge_name, MAX(j.email) AS judge_email FROM events e LEFT JOIN venues v ON e.venue_id = v.venue_id LEFT JOIN participants p ON e.event_id = p.event_id LEFT JOIN event_judges ej ON e.event_id = ej.event_id LEFT JOIN judges j ON ej.judge_id = j.judge_id [WHERE e.category = ? AND/OR e.event_date = ?] GROUP BY e.event_id ORDER BY e.event_date ASC;

-- [Events] Get event by ID
-- Used in: /api/events/:id
SELECT e.*, v.venue_name, v.location, v.capacity, COUNT(p.participant_id) as registered_participants FROM events e LEFT JOIN venues v ON e.venue_id = v.venue_id LEFT JOIN participants p ON e.event_id = p.event_id WHERE e.event_id = ? GROUP BY e.event_id;

-- [Events] Get average scores for each event (with minimum average filter)
-- Used in: /api/events/average-scores
SELECT e.event_id, e.event_name, AVG(j.score) AS avg_score FROM judging j INNER JOIN events e ON j.event_id = e.event_id GROUP BY e.event_id HAVING avg_score > ? ORDER BY avg_score DESC;

-- ========== PAYMENTS ==========

-- [Payments] Get all payments (optionally for a sponsor)
-- Used in: /api/payments
SELECT s.sponsorship_type AS package, p.amount, p.payment_date, p.status FROM payments p JOIN sponsorships s ON p.user_id = s.user_id AND p.event_id = s.event_id AND p.payment_type = 'sponsorship' WHERE s.sponsor_id = ? ORDER BY p.payment_date DESC;
SELECT p.payment_id, u.name as user_name, u.email, p.amount, p.status, p.payment_date FROM payments p JOIN users u ON p.user_id = u.user_id ORDER BY p.payment_date DESC;

-- [Payments] Get total sum of completed payments
-- Used in: /api/payments/total
SELECT SUM(amount) AS total_payments FROM payments WHERE status = 'completed';

-- [Payments] Create a new payment (with duplicate check for registration)
-- Used in: /api/payments (POST)
SELECT * FROM payments WHERE user_id = ? AND event_id = ? AND payment_type = ?;
INSERT INTO payments (user_id, event_id, amount, payment_type, status) VALUES (?, ?, ?, ?, ?);

-- ========== USERS ==========

-- [Users] Get all users (with optional role filter and ordering)
-- Used in: /api/users
SELECT user_id, name, email, role, created_at FROM users [WHERE role = ?] ORDER BY name ASC|created_at DESC;

-- ========== ORGANIZER DASHBOARD ==========

-- [Organizer Overview] Number of events managed
-- Used in: /api/organizer/:organizer_id/stats
SELECT COUNT(*) AS events_managed FROM events WHERE organizer_id = ?;

-- [Organizer Overview] Total unique participants in all managed events
-- Used in: /api/organizer/:organizer_id/stats
SELECT COUNT(DISTINCT p.user_id) AS total_participants FROM participants p JOIN events e ON p.event_id = e.event_id WHERE e.organizer_id = ?;

-- [Organizer Overview] Number of unique venues booked
-- Used in: /api/organizer/:organizer_id/stats
SELECT COUNT(DISTINCT venue_id) AS venues_booked FROM events WHERE organizer_id = ? AND venue_id IS NOT NULL;

-- [Organizer Overview] Total payments received for managed events
-- Used in: /api/organizer/:organizer_id/stats
SELECT COALESCE(SUM(p.amount),0) AS total_payments FROM payments p JOIN participants part ON p.user_id = part.user_id JOIN events e ON part.event_id = e.event_id WHERE e.organizer_id = ? AND p.status = 'completed';

-- [Organizer Events] Get all events managed by this organizer (with venue, participants, judge info)
-- Used in: /api/organizer/:organizer_id/events
SELECT e.*, v.venue_name, v.location, v.capacity, COUNT(p.participant_id) as registered_participants, MAX(j.judge_id) as judge_id, MAX(j.name) AS judge_name, MAX(j.email) AS judge_email FROM events e LEFT JOIN venues v ON e.venue_id = v.venue_id LEFT JOIN participants p ON e.event_id = p.event_id LEFT JOIN event_judges ej ON e.event_id = ej.event_id LEFT JOIN judges j ON ej.judge_id = j.judge_id WHERE e.organizer_id = ? GROUP BY e.event_id ORDER BY e.event_date ASC;

-- [Organizer Payments] Get all payments for events managed by this organizer
-- Used in: /api/organizer/:organizer_id/payments
SELECT p.payment_id, p.amount, p.status, p.payment_date, p.payment_type, e.event_name, u.name AS participant_name FROM payments p JOIN participants part ON p.user_id = part.user_id JOIN events e ON part.event_id = e.event_id JOIN users u ON part.user_id = u.user_id WHERE e.organizer_id = ? ORDER BY p.payment_date DESC;

-- [Organizer Participants] Get all participants for events managed by this organizer (with email, payment, accommodation)
-- Used in: /api/organizer/:organizer_id/participants
SELECT u.name AS participant_name, u.email AS participant_email, e.event_name, e.event_id, 'Registered' AS registration_status, COALESCE(pay.status, 'Unpaid') AS payment_status, COALESCE(a.room_type, 'Not Booked') AS accommodation FROM participants p JOIN users u ON p.user_id = u.user_id JOIN events e ON p.event_id = e.event_id LEFT JOIN payments pay ON pay.user_id = u.user_id AND pay.event_id = e.event_id AND pay.payment_type = 'registration' LEFT JOIN user_accommodations ua ON ua.user_id = u.user_id LEFT JOIN accommodations a ON ua.accommodation_id = a.accommodation_id WHERE e.organizer_id = ? ORDER BY e.event_date DESC, u.name ASC;

-- ========== JUDGE DASHBOARD ==========

-- [Judge Events] Get events assigned to a judge
-- Used in: /api/judges/:judge_id/events
SELECT e.* FROM event_judges ej JOIN events e ON ej.event_id = e.event_id WHERE ej.judge_id = ?;

-- [Judge Participants] Get participants for an event (for judging)
-- Used in: /api/judging/event/:event_id/participants
SELECT u.user_id, u.name, u.email FROM participants p JOIN users u ON p.user_id = u.user_id WHERE p.event_id = ?;

-- [Judge Scores] Get scores for an event by a judge
-- Used in: /api/judging/event/:event_id/scores
SELECT * FROM judging WHERE event_id = ? AND judge_id = ?;

-- [Submit Score] Insert or update a score for a participant
-- Used in: /api/judging/score (POST)
INSERT INTO judging (event_id, participant_id, judge_id, score) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE score = VALUES(score);

-- [Leaderboard] Get average scores and ranks for participants in an event
-- Used in: /api/judging/event/:event_id/leaderboard
SELECT p.user_id, u.name, AVG(jg.score) as avg_score, COUNT(jg.score) as times_judged FROM participants p JOIN users u ON p.user_id = u.user_id LEFT JOIN judging jg ON p.user_id = jg.participant_id AND p.event_id = jg.event_id WHERE p.event_id = ? GROUP BY p.user_id ORDER BY avg_score DESC;

-- ========== SPONSOR DASHBOARD ==========

-- [Sponsor Package] Get sponsorship package for a sponsor
-- Used in: /api/sponsors/:sponsor_id/package
SELECT sponsorship_type AS package FROM sponsorships WHERE sponsor_id = ? ORDER BY FIELD(sponsorship_type, 'Gold', 'Silver', 'Title') ASC LIMIT 1;

-- [Sponsor Events] Get events sponsored by a sponsor
-- Used in: /api/sponsors/:sponsor_id/events
SELECT COUNT(DISTINCT event_id) AS events_sponsored FROM sponsorships WHERE sponsor_id = ? AND status = 'Confirmed';

-- [Sponsor Payment Status] Get payment status for a sponsor
-- Used in: /api/sponsors/:sponsor_id/payment-status
SELECT status AS payment_status FROM payments WHERE user_id = ? AND payment_type = 'sponsorship' ORDER BY payment_date DESC LIMIT 1;

-- [Sponsor Event Reach] Get number of unique participants reached by a sponsor's events
-- Used in: /api/sponsors/:sponsor_id/event-reach
SELECT COUNT(DISTINCT p.user_id) AS event_reach FROM participants p JOIN events e ON p.event_id = e.event_id JOIN sponsorships s ON s.event_id = e.event_id WHERE s.sponsor_id = ?;

-- ========== GENERAL QUERIES ==========

-- [All Users]
SELECT * FROM users;

-- [All Events]
SELECT * FROM events;

-- [All Venues]
SELECT * FROM venues;

-- [All Payments]
SELECT * FROM payments;

-- [All Accommodations]
SELECT * FROM accommodations;

-- [All Sponsorships]
SELECT * FROM sponsorships;

-- =============================
-- NASCON Event Management System
-- All SQL Queries Used in Backend
-- =============================

-- ===== Venues =====
SELECT v.*, COUNT(e.event_id) as upcoming_events FROM venues v LEFT JOIN events e ON v.venue_id = e.venue_id WHERE e.event_date > NOW() OR e.event_id IS NULL GROUP BY v.venue_id ORDER BY v.venue_name ASC;
SELECT v.*, COUNT(e.event_id) as upcoming_events, GROUP_CONCAT(DISTINCT e.event_name) as upcoming_event_names FROM venues v LEFT JOIN events e ON v.venue_id = e.venue_id WHERE v.venue_id = ? AND (e.event_date > NOW() OR e.event_id IS NULL) GROUP BY v.venue_id;
INSERT INTO venues (venue_name, capacity, location) VALUES (?, ?, ?);
UPDATE venues SET venue_name = ?, capacity = ?, location = ? WHERE venue_id = ?;
SELECT COUNT(*) as event_count FROM events WHERE venue_id = ? AND event_date > NOW();
DELETE FROM venues WHERE venue_id = ?;
SELECT e.*, COUNT(p.participant_id) as registered_participants FROM events e LEFT JOIN participants p ON e.event_id = p.event_id WHERE e.venue_id = ? AND DATE(e.event_date) = ? GROUP BY e.event_id;
SELECT * FROM venues WHERE venue_id = ?;
SELECT v.venue_id, v.venue_name, e1.event_id AS event1_id, e1.event_name AS event1_name, e1.event_date AS event1_date, e2.event_id AS event2_id, e2.event_name AS event2_name, e2.event_date AS event2_date FROM venues v JOIN events e1 ON v.venue_id = e1.venue_id JOIN events e2 ON v.venue_id = e2.venue_id AND e1.event_id < e2.event_id WHERE e1.event_date = e2.event_date ORDER BY v.venue_name, e1.event_date;

-- ===== Users =====
SELECT * FROM users WHERE email = ?;
INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?);
INSERT INTO sponsors (company_name, contact_person, email, sponsorship_level, amount, user_id) VALUES (?, ?, ?, ?, ?, ?);
INSERT INTO judges (name, email) VALUES (?, ?);
SELECT * FROM users WHERE email = ?;
SELECT user_id, name, email, role FROM users WHERE user_id = ?;
SELECT * FROM users WHERE user_id = ?;
UPDATE users SET name = ?, email = ?, password = ? WHERE user_id = ?;
UPDATE users SET name = ?, email = ? WHERE user_id = ?;
SELECT user_id, name, email, role, created_at FROM users;
UPDATE users SET role = ? WHERE user_id = ?;
SELECT SUM(amount) as total FROM sponsorships WHERE status = "Confirmed";
SELECT COUNT(*) as occupied, (SELECT COUNT(*) FROM accommodations) as total FROM accommodations WHERE status = "Occupied";
DELETE FROM users WHERE user_id = ?;

-- ===== Events =====
SELECT e.*, v.venue_name, v.location, v.capacity, COUNT(p.participant_id) as registered_participants FROM events e LEFT JOIN venues v ON e.venue_id = v.venue_id LEFT JOIN participants p ON e.event_id = p.event_id GROUP BY e.event_id ORDER BY e.event_date ASC;
SELECT e.*, v.venue_name, v.location, v.capacity, COUNT(p.participant_id) as registered_participants FROM events e LEFT JOIN venues v ON e.venue_id = v.venue_id LEFT JOIN participants p ON e.event_id = p.event_id WHERE e.event_id = ? GROUP BY e.event_id;
INSERT INTO events (event_name, description, category, max_participants, registration_fee, event_date, venue_id, organizer_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
UPDATE events SET event_name = ?, description = ?, category = ?, max_participants = ?, registration_fee = ?, event_date = ?, venue_id = ? WHERE event_id = ?;
DELETE FROM events WHERE event_id = ?;
SELECT e.*, COUNT(p.participant_id) as registered_count FROM events e LEFT JOIN participants p ON e.event_id = p.event_id WHERE e.event_id = ? GROUP BY e.event_id;
SELECT * FROM participants WHERE user_id = ? AND event_id = ?;
INSERT INTO participants (user_id, event_id) VALUES (?, ?);
INSERT INTO payments (participant_id, amount, payment_method, status) VALUES (?, ?, 'Pending', 'Pending');
SELECT u.user_id, u.name, u.email, u.role FROM participants p INNER JOIN users u ON p.user_id = u.user_id WHERE p.event_id = ? ORDER BY u.name;
SELECT e.event_id, e.event_name, AVG(j.score) AS avg_score FROM judging j INNER JOIN events e ON j.event_id = e.event_id GROUP BY e.event_id HAVING avg_score > ? ORDER BY avg_score DESC;
SELECT u.user_id, u.name, u.email, a.room_type, a.capacity, a.price_per_night FROM participants p INNER JOIN users u ON p.user_id = u.user_id INNER JOIN accommodations a ON p.user_id = a.accommodation_id ORDER BY u.name;

-- ===== Sponsorships =====
SELECT e.event_name, e.event_date, v.venue_name FROM sponsorships s JOIN events e ON s.event_id = e.event_id LEFT JOIN venues v ON e.venue_id = v.venue_id WHERE s.sponsor_id = ? ORDER BY e.event_date ASC;
SELECT sp.sponsorship_id, s.company_name AS sponsor, sp.sponsorship_type AS package, sp.amount, sp.status, s.email FROM sponsorships sp JOIN sponsors s ON sp.sponsor_id = s.sponsor_id WHERE sp.sponsor_id = ?;
SELECT sp.sponsorship_id, s.company_name AS sponsor, sp.sponsorship_type AS package, sp.amount, sp.status, s.email FROM sponsorships sp JOIN sponsors s ON sp.sponsor_id = s.sponsor_id;
SELECT SUM(amount) as total FROM sponsorships WHERE status = 'Confirmed';
SELECT sp.sponsorship_id, s.company_name AS sponsor, sp.sponsorship_type AS package, sp.amount, sp.status, s.email FROM sponsorships sp JOIN sponsors s ON sp.sponsor_id = s.sponsor_id WHERE sp.sponsorship_id = ?;
SELECT sponsor_id FROM sponsors WHERE company_name = ?;
SELECT * FROM sponsorships WHERE sponsor_id = ? AND user_id = ? AND event_id = ?;
INSERT INTO sponsorships (sponsor_id, user_id, event_id, sponsorship_type, amount, status) VALUES (?, ?, ?, ?, ?, ?);
UPDATE sponsorships SET sponsor_id = ?, sponsorship_type = ?, amount = ?, status = ? WHERE sponsorship_id = ?;
DELETE FROM sponsorships WHERE sponsorship_id = ?;

-- ===== Sponsors =====
SELECT s.sponsor_id, s.company_name, s.contact_person, s.email, s.phone, s.sponsorship_level, s.amount, s.user_id, COUNT(sp.sponsorship_id) as total_sponsorships, SUM(sp.amount) as total_contribution FROM sponsors s LEFT JOIN sponsorships sp ON s.sponsor_id = sp.sponsor_id GROUP BY s.sponsor_id ORDER BY FIELD(s.sponsorship_level, 'title', 'gold', 'silver', 'bronze') DESC, s.company_name ASC;
SELECT s.*, COUNT(sp.sponsorship_id) as total_sponsorships, SUM(sp.amount) as total_contribution, GROUP_CONCAT(DISTINCT e.event_name) as sponsored_events FROM sponsors s LEFT JOIN sponsorships sp ON s.sponsor_id = sp.sponsor_id LEFT JOIN events e ON sp.event_id = e.event_id WHERE s.sponsor_id = ? GROUP BY s.sponsor_id;
INSERT INTO sponsors (company_name, contact_person, email, phone, sponsorship_level, amount, user_id) VALUES (?, ?, ?, ?, ?, ?, ?);
UPDATE sponsors SET company_name = ?, contact_person = ?, email = ?, phone = ?, sponsorship_level = ?, amount = ? WHERE sponsor_id = ?;
SELECT COUNT(*) as sponsorship_count FROM sponsorships WHERE sponsor_id = ?;
DELETE FROM sponsors WHERE sponsor_id = ?;
SELECT * FROM events WHERE event_id = ?;
SELECT * FROM sponsorships WHERE sponsor_id = ? AND event_id = ?;
INSERT INTO sponsorships (sponsor_id, event_id, amount) VALUES (?, ?, ?);
SELECT SUM(amount) AS total_funds FROM sponsorships;
SELECT s.company_name, sp.amount AS sponsorship_amount, p.amount AS payment_amount, p.status AS payment_status FROM sponsors s LEFT JOIN sponsorships sp ON s.sponsor_id = sp.sponsor_id LEFT JOIN payments p ON s.sponsor_id = p.user_id;
SELECT * FROM sponsors WHERE user_id = ?;

-- ===== Judging =====
SELECT j.*, e.event_name, u.name as participant_name, j2.name as judge_name FROM judging j JOIN events e ON j.event_id = e.event_id JOIN participants p ON j.participant_id = p.participant_id JOIN users u ON p.user_id = u.user_id JOIN judges j2 ON j.judge_id = j2.judge_id ORDER BY j.event_id, j.participant_id;
SELECT j.*, e.event_name, u.name as participant_name, j2.name as judge_name FROM judging j JOIN events e ON j.event_id = e.event_id JOIN participants p ON j.participant_id = p.participant_id JOIN users u ON p.user_id = u.user_id JOIN judges j2 ON j.judge_id = j2.judge_id WHERE j.event_id = ? ORDER BY j.score DESC;
SELECT j.*, e.event_name, u.name as participant_name FROM judging j JOIN events e ON j.event_id = e.event_id JOIN participants p ON j.participant_id = p.participant_id JOIN users u ON p.user_id = u.user_id WHERE j.judge_id = ? ORDER BY j.event_id, j.score DESC;
SELECT judge_id FROM judges WHERE email = ?;
SELECT * FROM judging WHERE event_id = ? AND judge_id = ? AND participant_id = ?;
UPDATE judging SET score = ?, comments = ? WHERE event_id = ? AND judge_id = ? AND participant_id = ?;
INSERT INTO judging (event_id, judge_id, participant_id, score, comments) VALUES (?, ?, ?, ?, ?);
SELECT * FROM judging WHERE judging_id = ?;
UPDATE judging SET score = ?, comments = ? WHERE judging_id = ?;
DELETE FROM judging WHERE judging_id = ?;
SELECT e.event_id, e.event_name, COUNT(DISTINCT j.participant_id) as participants_judged, COUNT(DISTINCT j.judge_id) as judges_participated, AVG(j.score) as average_score, MAX(j.score) as highest_score, MIN(j.score) as lowest_score FROM judging j JOIN events e ON j.event_id = e.event_id GROUP BY e.event_id ORDER BY e.event_name;
SELECT p.participant_id, u.name as participant_name, u.email as participant_email, AVG(j.score) as average_score, COUNT(j.judging_id) as times_judged FROM judging j JOIN participants p ON j.participant_id = p.participant_id JOIN users u ON p.user_id = u.user_id WHERE j.event_id = ? GROUP BY p.participant_id ORDER BY average_score DESC LIMIT 10;

-- ===== Payments =====
SELECT s.sponsorship_type AS package, p.amount, p.payment_date, p.status FROM payments p JOIN sponsorships s ON p.user_id = s.user_id AND p.payment_type = 'sponsorship' WHERE s.sponsor_id = ? ORDER BY p.payment_date DESC;
SELECT p.payment_id, u.name as user_name, u.email, p.amount, p.status, p.payment_date FROM payments p JOIN users u ON p.user_id = u.user_id ORDER BY p.payment_date DESC;
SELECT SUM(amount) AS total_payments FROM payments WHERE status = 'completed';
INSERT INTO payments (user_id, amount, payment_type, status) VALUES (?, ?, ?, ?);

-- ===== Organizer =====
SELECT p.payment_id, p.amount, p.status, p.payment_date, p.payment_type, e.event_name, u.name AS participant_name FROM payments p JOIN participants part ON p.user_id = part.user_id JOIN events e ON part.event_id = e.event_id JOIN users u ON part.user_id = u.user_id WHERE e.organizer_id = ? ORDER BY p.payment_date DESC;
SELECT e.*, v.venue_name, v.location, v.capacity, COUNT(p.participant_id) as registered_participants FROM events e LEFT JOIN venues v ON e.venue_id = v.venue_id LEFT JOIN participants p ON e.event_id = p.event_id WHERE e.organizer_id = ? GROUP BY e.event_id ORDER BY e.event_date ASC;
SELECT u.name AS participant_name, e.event_name, e.event_id FROM participants p JOIN users u ON p.user_id = u.user_id JOIN events e ON p.event_id = e.event_id WHERE e.organizer_id = ? ORDER BY e.event_date DESC, u.name ASC;
SELECT COUNT(*) AS events_managed FROM events WHERE organizer_id = ?;
SELECT COUNT(DISTINCT p.user_id) AS total_participants FROM participants p JOIN events e ON p.event_id = e.event_id WHERE e.organizer_id = ?;
SELECT COUNT(DISTINCT venue_id) AS venues_booked FROM events WHERE organizer_id = ? AND venue_id IS NOT NULL;
SELECT COALESCE(SUM(p.amount),0) AS total_payments FROM payments p JOIN participants part ON p.user_id = part.user_id JOIN events e ON part.event_id = e.event_id WHERE e.organizer_id = ? AND p.status = 'completed';

-- ===== Sponsor Dashboard =====
SELECT MAX(sponsorship_type) AS package FROM sponsorships WHERE sponsor_id = ?;
SELECT COUNT(DISTINCT event_id) AS events_sponsored FROM sponsorships WHERE sponsor_id = ?;
SELECT status AS payment_status FROM payments WHERE user_id = ? AND payment_type = 'sponsorship' ORDER BY payment_date DESC LIMIT 1;
SELECT COUNT(DISTINCT p.user_id) AS event_reach FROM participants p JOIN events e ON p.event_id = e.event_id JOIN sponsorships s ON s.event_id = e.event_id WHERE s.sponsor_id = ?;

-- ===== Accommodations =====
SELECT * FROM accommodations;
SELECT * FROM user_accommodations WHERE user_id = ?;
INSERT INTO user_accommodations (user_id, accommodation_id) VALUES (?, ?);
SELECT a.* FROM user_accommodations ua JOIN accommodations a ON ua.accommodation_id = a.accommodation_id WHERE ua.user_id = ?; 