// server.js - uses sqlite3 (no compilation needed)
const express = require("express");
const cors = require("cors");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const PORT = process.env.PORT || 4000;
const DB_FILE = path.join(__dirname, "alumni.db");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// open db
const db = new sqlite3.Database(DB_FILE);

// create tables if not exist
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT,
    current_role TEXT,
    company TEXT,
    skills TEXT,
    bio TEXT,
    available_for_mentorship INTEGER DEFAULT 0
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS mentors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT,
    title TEXT,
    institution TEXT,
    experience_years INTEGER,
    skills TEXT,
    bio TEXT,
    availability INTEGER DEFAULT 1
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    company TEXT,
    location TEXT,
    salary_range TEXT,
    type TEXT,
    description TEXT,
    required_skills TEXT,
    poster TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    message TEXT,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// seed user + mentors + jobs if empty
db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
  if (row.count === 0) {
    db.run(
      `INSERT INTO users (full_name,current_role,company,skills,bio,available_for_mentorship)
       VALUES (?,?,?,?,?,?)`,
      [
        "Priya Sharma",
        "Software Engineer",
        "TCS",
        "JavaScript, React, Node.js, Python",
        "Passionate software engineer with 3 years of experience...",
        1,
      ]
    );
  }
});

db.get("SELECT COUNT(*) as count FROM mentors", (err, row) => {
  if (row.count === 0) {
    const mentors = [
      [
        "Rajesh Kumar",
        "Senior Product Manager @ Google",
        "IIT Delhi",
        12,
        "Product Management, AI/ML, Strategy",
        "Product leader with strong AI background.",
      ],
      [
        "Anita Sharma",
        "Tech Lead @ Microsoft",
        "BITS Pilani",
        10,
        "Software Engineering, Cloud, Leadership",
        "Engineering leader focusing on cloud platforms.",
      ],
    ];
    mentors.forEach((m) =>
      db.run(
        `INSERT INTO mentors (full_name,title,institution,experience_years,skills,bio)
         VALUES (?,?,?,?,?,?)`,
        m
      )
    );
  }
});

db.get("SELECT COUNT(*) as count FROM jobs", (err, row) => {
  if (row.count === 0) {
    const jobs = [
      [
        "Product Manager - AI Products",
        "Google",
        "Vijayawada",
        "25-35 LPA",
        "Full-time",
        "Lead AI Product initiatives...",
        "Product Management, ML, Strategy",
        "Company HR",
      ],
      [
        "Senior Software Engineer",
        "Microsoft",
        "Hyderabad",
        "30-40 LPA",
        "Full-time",
        "Work on large-scale cloud services...",
        "C#, Distributed Systems",
        "Team Lead",
      ],
    ];
    jobs.forEach((j) =>
      db.run(
        `INSERT INTO jobs (title,company,location,salary_range,type,description,required_skills,poster)
         VALUES (?,?,?,?,?,?,?,?)`,
        j
      )
    );
  }
});

// ---------- API endpoints ----------

// test
app.get("/api/ping", (req, res) => res.json({ ok: true }));

// get user profile
app.get("/api/user", (req, res) => {
  db.get("SELECT * FROM users WHERE id=1", (err, row) => {
    res.json({ user: row });
  });
});

// update profile
app.post("/api/user", (req, res) => {
  const { full_name, current_role, company, skills, bio, available_for_mentorship } = req.body;
  db.run(
    `UPDATE users SET full_name=?,current_role=?,company=?,skills=?,bio=?,available_for_mentorship=? WHERE id=1`,
    [full_name, current_role, company, skills, bio, available_for_mentorship ? 1 : 0],
    (err) => {
      db.run(`INSERT INTO notifications (user_id,message) VALUES (1,'Profile updated successfully.')`);
      db.get("SELECT * FROM users WHERE id=1", (err2, row) => res.json({ ok: true, user: row }));
    }
  );
});

// get mentors
app.get("/api/mentors", (req, res) => {
  const q = `%${(req.query.q || "").toLowerCase()}%`;
  db.all(
    `SELECT * FROM mentors WHERE lower(full_name) LIKE ? OR lower(skills) LIKE ? OR lower(title) LIKE ?`,
    [q, q, q],
    (err, rows) => res.json({ mentors: rows })
  );
});

// connect to mentor
app.post("/api/connect", (req, res) => {
  const name = req.body.mentorName;
  db.run(`INSERT INTO notifications (user_id,message) VALUES (1,?)`, [`Connection request sent to ${name}`]);
  res.json({ ok: true, message: `Connection request sent to ${name}` });
});

// get jobs
app.get("/api/jobs", (req, res) => {
  const q = `%${(req.query.q || "").toLowerCase()}%`;
  db.all(
    `SELECT * FROM jobs WHERE lower(title) LIKE ? OR lower(company) LIKE ? OR lower(required_skills) LIKE ?`,
    [q, q, q],
    (err, rows) => res.json({ jobs: rows })
  );
});

// apply to job
app.post("/api/jobs/:id/apply", (req, res) => {
  const id = req.params.id;
  db.run(`INSERT INTO notifications (user_id,message) VALUES (1,?)`, [`Applied to job ID ${id}`]);
  res.json({ ok: true });
});

// notifications
app.get("/api/notifications", (req, res) => {
  db.all("SELECT * FROM notifications WHERE user_id=1 ORDER BY created_at DESC", (err, rows) =>
    res.json({ notifications: rows })
  );
});

// fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => console.log(`✅ Backend running at http://localhost:${PORT}`));
