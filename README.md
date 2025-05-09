# 🎉 NASCON Event Management System – Backend

Welcome to the **NASCON Event Management System Backend**!  
A robust, scalable solution for managing every aspect of the National Student Convention, from registrations and scheduling to sponsorships, accommodations, and evaluations.

---

## 🗂️ Project Structure

```text
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

## ✨ Key Features

- 🔒 **Secure Authentication:** JWT-based user login & role management
- 🗓️ **Event Scheduling:** Effortless event & venue management
- 🧑‍⚖️ **Judging System:** Streamlined judge assignment & evaluation
- 💸 **Sponsorships:** Track sponsors and payments with ease
- 🏨 **Accommodations:** Manage participant stays efficiently
- 📈 **Analytics-Ready:** Structured for insightful reporting

---

## ⚡ Quick Start

### 1. 🚀 Clone the Repository

```bash
git clone https://github.com/hamdashahid/Nascon-Event-Management-System.git
cd i230069_i230114_i221380-2
```

### 2. 📦 Install Dependencies

```bash
npm install
```

### 3. 🔑 Configure Environment

Create a `.env` file in the root directory:

```env
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
PORT=3000
JWT_SECRET=your_jwt_secret
```

> Replace placeholders with your actual credentials.

### 4. 🏗️ Initialize the Database

```bash
mysql -u root -p < database/cleaned_schema.sql
```
*You can also review `query.sql` for sample data and queries.*

### 5. ▶️ Start the Server

```bash
node server.js
```
Server runs at: [http://localhost:3000](http://localhost:3000)

---

## 📡 Sample API Endpoints

| Method | Endpoint         | Description                |
|--------|------------------|----------------------------|
| POST   | `/login`         | User login                 |
| POST   | `/register`      | New user registration      |
| GET    | `/events`        | List all events            |
| POST   | `/sponsor`       | Add sponsor information    |
| GET    | `/judges`        | Retrieve judge data        |

> _Expand this section with more endpoints as your API grows!_

---

## 📝 License

> **Academic Use Only**  
> This project is part of Semester Project 2 for the Database Systems course at FAST NUCES.

---

<p align="center">
    <img src="https://img.shields.io/badge/Node.js-Backend-green?style=for-the-badge&logo=node.js" alt="Node.js Backend" />
    <img src="https://img.shields.io/badge/MySQL-Database-blue?style=for-the-badge&logo=mysql" alt="MySQL Database" />
</p>