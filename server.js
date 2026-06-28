require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const Student = require('./models/Student');

const app = express();
const PORT = process.env.PORT || 5000;

// MIDDLEWARE STACK
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(helmet());

mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000
})
.then(() => console.log('MongoDB connected successfully! '))
.catch(err => console.error('Database connection error but server is still running:', err.message));

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


// ROUTES
app.post('/students', async (req, res) => {
    try {
        // Mongoose automatically validates required fields based on our Student Schema
        const newStudent = new Student(req.body);
        const savedStudent = await newStudent.save();

        res.status(201).json(savedStudent);
    } catch (err) {
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

app.get('/students', async (req, res) => {
    try {
        const allStudents = await Student.find();
        res.json(allStudents);
    } catch (err) {
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
});

// GET a single student by ID
app.get('/students/:id', async (req, res, next) => {
    try {
        const student = await Student.findById(req.params.id);
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }
        res.json(student);
    } catch (err) {
        next(err); // Passes error straight to our global error handler!
    }
    
app.put('/students/:id', async (req, res) => {
    try {
        const updatedStudent = await Student.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true, runValidators: true }
        );
        if (!updatedStudent) return res.status(404).json({ error: 'Student not found' });
        res.json(updatedStudent);
    } catch (err) {
        res.status(400).json({ error: 'Bad Request', details: err.message });
    }
});

app.delete('/students/:id', async (req, res) => {
    try {
        const deletedStudent = await Student.findByIdAndDelete(req.params.id);
        if (!deletedStudent) return res.status(404).json({ error: 'Student not found' });
        res.json({ message: 'Student deleted successfully', deletedStudent });
    } catch (err) {
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
});

app.get('/admin/dashboard', adminOnly, (req, res) => {
    res.json({ message: "Welcome, Admin." });
});

// This catches any error not caught by a try/catch block
app.use((err, req, res, next) => {
    console.error('⚠️ Global Error Caught:', err.stack);
    
    // Never expose raw internal server errors/stacks to clients
    res.status(err.status || 500).json({
        error: 'Internal Server Error',
        message: err.message || 'Something went wrong on our end.'
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});