require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5000;

// MIDDLEWARE STACK
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected successfully! 🎉'))
  .catch(err => console.error('Database connection error ❌:', err));

// Request Timer
const requestTimer = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.url} took ${duration}ms`);
    });
    next();
};
app.use(requestTimer);

// ROUTE GUARD
const adminOnly = (req, res, next) => {
    try {
        const adminToken = req.headers['admin-token'] || req.query.token;
       
        if (!adminToken) {
            throw new Error("No token provided");
        }

        if (adminToken === '12345') {
            next();
        } else {
            res.status(403).json({ error: 'Access Denied: Invalid Token' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Server Authorization Error', message: err.message });
    }
};

// 
const students = [
    { id: 1, name: 'Alice', major: 'Data Science' },
    { id: 2, name: 'Brandon', major: 'Software Engineering' },
    { id: 3, name: 'Charles', major: 'Cybersecurity'}
];

// ROUTES
app.post('/students', (req, res) => {
    try {
        const { name, major } = req.body;

        // Manual validation: If data is missing, "throw" an error
        if (!name || !major) {
            throw new Error("Incomplete student data. Name and Major are required.");
        }

        const newStudent = { id: students.length + 1, name, major };
        students.push(newStudent);

        res.status(201).json(newStudent);
    } catch (err) {
        // This catches the "throw" from above or any unexpected system crashes
        res.status(400).json({ error: 'Bad Request', details: err.message });
    }
});

app.get('/', (req, res) => {
    res.json({ message: 'Welcome to my API', version: '1.0' });
});

app.get('/about', (req, res) => {
    res.json({ 
        name: 'Ache Bradley', 
        course: 'Web Programming 2' 
    });
});

app.get('/students', (req, res) => {
    res.json(students);
});

app.get('/admin/dashboard', adminOnly, (req, res) => {
    res.json({ message: "Welcome, Admin." });
});

// This catches any error not caught by a try/catch block
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke on our end!');
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});