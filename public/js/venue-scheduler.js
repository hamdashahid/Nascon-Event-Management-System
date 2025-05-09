// Venue Scheduler Component
class VenueScheduler {
    constructor() {
        this.venues = [];
        this.selectedVenue = null;
        this.selectedDate = null;
        this.selectedTimeSlot = null;
    }

    // Initialize the scheduler
    async init() {
        await this.loadVenues();
        this.setupEventListeners();
        this.renderVenueList();
    }

    // Load all venues
    async loadVenues() {
        try {
            const response = await fetch('/api/venues');
            this.venues = await response.json();
        } catch (error) {
            console.error('Error loading venues:', error);
            showError('Failed to load venues');
        }
    }

    // Setup event listeners
    setupEventListeners() {
        // Date picker
        document.getElementById('event-date').addEventListener('change', (e) => {
            this.selectedDate = e.target.value;
            this.checkAvailability();
        });

        // Time slot selection
        document.getElementById('start-time').addEventListener('change', (e) => {
            this.selectedTimeSlot = {
                start: e.target.value,
                end: document.getElementById('end-time').value
            };
            this.checkAvailability();
        });

        document.getElementById('end-time').addEventListener('change', (e) => {
            if (this.selectedTimeSlot) {
                this.selectedTimeSlot.end = e.target.value;
                this.checkAvailability();
            }
        });

        // Venue selection
        document.getElementById('venue-list').addEventListener('change', (e) => {
            this.selectedVenue = e.target.value;
            this.loadVenueSchedule();
        });
    }

    // Render venue list
    renderVenueList() {
        const venueList = document.getElementById('venue-list');
        venueList.innerHTML = this.venues.map(venue => `
            <option value="${venue.venue_id}">
                ${venue.venue_name} (Capacity: ${venue.capacity})
            </option>
        `).join('');
    }

    // Check venue availability
    async checkAvailability() {
        if (!this.selectedVenue || !this.selectedDate || !this.selectedTimeSlot) {
            return;
        }

        try {
            const response = await fetch(`/api/venues/${this.selectedVenue}/availability?date=${this.selectedDate}&start_time=${this.selectedTimeSlot.start}&end_time=${this.selectedTimeSlot.end}`);
            const data = await response.json();

            this.updateAvailabilityDisplay(data);
        } catch (error) {
            console.error('Error checking availability:', error);
            showError('Failed to check venue availability');
        }
    }

    // Update availability display
    updateAvailabilityDisplay(data) {
        const availabilityDiv = document.getElementById('availability-status');
        if (data.is_available) {
            availabilityDiv.innerHTML = `
                <div class="alert alert-success">
                    Venue is available for the selected time slot!
                </div>
            `;
        } else {
            availabilityDiv.innerHTML = `
                <div class="alert alert-danger">
                    Venue is not available. Conflicting events:
                    <ul>
                        ${data.conflicting_events.map(event => `
                            <li>${event.event_name} (${event.start_time} - ${event.end_time})</li>
                        `).join('')}
                    </ul>
                </div>
            `;
        }
    }

    // Load venue schedule
    async loadVenueSchedule() {
        if (!this.selectedVenue) return;

        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);

        try {
            const response = await fetch(`/api/venues/${this.selectedVenue}/schedule?start_date=${startDate.toISOString().split('T')[0]}&end_date=${endDate.toISOString().split('T')[0]}`);
            const schedule = await response.json();
            this.renderSchedule(schedule);
        } catch (error) {
            console.error('Error loading venue schedule:', error);
            showError('Failed to load venue schedule');
        }
    }

    // Render schedule
    renderSchedule(schedule) {
        const scheduleDiv = document.getElementById('venue-schedule');
        if (schedule.length === 0) {
            scheduleDiv.innerHTML = '<p>No events scheduled for this venue.</p>';
            return;
        }

        scheduleDiv.innerHTML = `
            <h3>Upcoming Events</h3>
            <table class="table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Event</th>
                        <th>Time</th>
                        <th>Participants</th>
                    </tr>
                </thead>
                <tbody>
                    ${schedule.map(event => `
                        <tr>
                            <td>${new Date(event.event_date).toLocaleDateString()}</td>
                            <td>${event.event_name}</td>
                            <td>${event.start_time} - ${event.end_time}</td>
                            <td>${event.registered_participants}/${event.venue_capacity}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    // Show scheduling conflicts
    async showSchedulingConflicts() {
        try {
            const response = await fetch('/api/venues/scheduling-conflicts');
            const conflicts = await response.json();
            this.renderConflicts(conflicts);
        } catch (error) {
            console.error('Error loading scheduling conflicts:', error);
            showError('Failed to load scheduling conflicts');
        }
    }

    // Render conflicts
    renderConflicts(conflicts) {
        const conflictsDiv = document.getElementById('scheduling-conflicts');
        if (conflicts.length === 0) {
            conflictsDiv.innerHTML = '<p>No scheduling conflicts found.</p>';
            return;
        }

        conflictsDiv.innerHTML = `
            <h3>Scheduling Conflicts</h3>
            <table class="table">
                <thead>
                    <tr>
                        <th>Venue</th>
                        <th>Date</th>
                        <th>Conflict Type</th>
                        <th>Event 1</th>
                        <th>Event 2</th>
                    </tr>
                </thead>
                <tbody>
                    ${conflicts.map(conflict => `
                        <tr>
                            <td>${conflict.venue_name}</td>
                            <td>${new Date(conflict.event1_date).toLocaleDateString()}</td>
                            <td>${conflict.conflict_type}</td>
                            <td>${conflict.event1_name} (${conflict.event1_start} - ${conflict.event1_end})</td>
                            <td>${conflict.event2_name} (${conflict.event2_start} - ${conflict.event2_end})</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
}

// Helper function to show errors
function showError(message) {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.innerHTML = `
            <div class="alert alert-danger">
                ${message}
            </div>
        `;
    }
}

// Initialize the scheduler when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const scheduler = new VenueScheduler();
    scheduler.init();
}); 