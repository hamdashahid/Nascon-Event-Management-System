# 📚 NASCON Event Management System – Backend

This is the backend for the NASCON Event Management System – a comprehensive solution to manage event registration, scheduling, sponsorships, accommodations, user roles, and evaluation processes for the National Student Convention.

---

## 📁 Project Structure

```
.
├── server.js               # Main server file
├── .env                    # Environment variables
├── package.json            # Node.js project metadata
├── /db
│   └── connection.js       # Database connection setup
├── /middleware
│   └── auth.js             # Authentication middleware
├── /database
│   ├── schema.sql          # Base schema
│   ├── cleaned_schema.sql  # Cleaned-up schema
│   └── query.sql           # SQL queries
```

---

## 🚀 Features

- ✅ User authentication & JWT-based security
- 🗓️ Event and venue scheduling
- 🧑‍⚖️ Judge and evaluation system
- 💰 Sponsorship and payment tracking
- 🛏️ Accommodation handling
- 📊 Reporting and analytics-ready structure

---

## ⚙️ Setup Instructions

Follow these steps to run the project locally:

### 1. 📦 Clone the Repository

```bash
git clone https://github.com/hamdashahid/Nascon-Event-Management-System.git
cd i230069_i230114_i221380-2
```

### 2. 📥 Install Dependencies

```bash
npm install
```

### 3. 🔐 Configure Environment Variables

Create a `.env` file in the project root with the following content:

```env
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
PORT=3000
JWT_SECRET=your_jwt_secret
```

Replace the placeholders with your actual database credentials.

### 4. 🧱 Initialize the Database

Run the schema script to create the required tables:

```bash
mysql -u root -p < database/cleaned_schema.sql
```

You can also inspect or modify `query.sql` for predefined data or queries.

### 5. ▶️ Run the Server

```bash
node server.js
```

The server should now be running on `http://localhost:3000`.

---

## 📬 Sample API Endpoints

> (Add more details here based on your `server.js` or route handlers.)

- `POST /login` – User login
- `POST /register` – New user registration
- `GET /events` – List of all events
- `POST /sponsor` – Add sponsor info
- `GET /judges` – Retrieve judge data

---

## 📝 License

This project is intended for academic use only and is part of the Semester Project 2 for the Database Systems course at FAST NUCES.