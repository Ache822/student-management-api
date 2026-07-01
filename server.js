require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const User = require('./models/Users');
const Student = require('./models/Student');
const Course = require('./models/Course'); 
const { signToken } = require('./utils/jwt');
const { protect } = require('./middleware/authMiddleware');

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
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to my API', version: '1.0' });
});

app.get('/about', (req, res) => {
    res.json({ 
        name: 'Ache Bradley', 
        course: 'Web Programming 2' 
    });
});

// AUTHENTICATION: User Registration
app.post('/api/auth/register', async (req, res, next) => {
    try {
        const { name, email, password, role } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Please provide name, email, and password' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }

        // Check if user already exists in the school system
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email is already registered' });
        }

        // Create the new user account (the pre-save hook handles hashing!)
        const newUser = await User.create({
            name,
            email,
            password,
            role
        });

        // Send back the profile, explicitly wiping the password out of the response
        const userResponse = newUser.toObject();
        delete userResponse.password;

        res.status(201).json(userResponse);
    } catch (err) {
        next(err); // Hands off to global error handler if something breaks
    }
});

// User Login
app.post('/api/auth/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Check if email and password were provided
        if (!email || !password) {
            return res.status(400).json({ error: 'Please provide email and password' });
        }

        // Find user and explicitly request the hidden password field (+password)
        const user = await User.findOne({ email }).select('+password');
        
        // Check if user exists and password matches
        if (!user || !(await user.correctPassword(password, user.password))) {
            // Use a generic message for security so hackers don't know which one was wrong
            return res.status(401).json({ error: 'Incorrect email or password' });
        }

        // Wiping password out of response data for security
        const userResponse = user.toObject();
        delete userResponse.password;

        // Generate the JWT Token (Requirement check!)
        const token = signToken(user._id, user.role);

        // Send back response with token included
        res.status(200).json({
            status: 'success',
            message: 'Logged in successfully!',
            token, // <--- This sends the digital badge to the client!
            user: userResponse
        });
    } catch (err) {
        next(err);
    }
});

app.post('/students', protect, async (req, res) => {
    try {
        // Mongoose automatically validates required fields based on our Student Schema
        const newStudent = new Student(req.body);
        const savedStudent = await newStudent.save();

        res.status(201).json(savedStudent);
    } catch (err) {
        res.status(400).json({ error: 'Bad Request', details: err.message });
    }
});

app.get('/students', protect, async (req, res) => {
    try {
        const allStudents = await Student.find();
        res.json(allStudents);
    } catch (err) {
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
});

// GET a single student by ID
app.get('/students/:id', protect, async (req, res, next) => {
    try {
        const student = await Student.findById(req.params.id);
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }
        res.json(student);
    } catch (err) {
        next(err); 
    }
});

app.put('/students/:id', protect, async (req, res) => {
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

app.delete('/students/:id', protect, async (req, res) => {
    try {
        const deletedStudent = await Student.findByIdAndDelete(req.params.id);
        if (!deletedStudent) return res.status(404).json({ error: 'Student not found' });
        res.json({ message: 'Student deleted successfully', deletedStudent });
    } catch (err) {
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
});

// CREATE a new course
app.post('/courses', async (req, res, next) => {
    try {
        const newCourse = new Course(req.body);
        const savedCourse = await newCourse.save();
        res.status(201).json(savedCourse);
    } catch (err) {
        next(err); // Triggers your Requirement 5 Global Error Handler automatically!
    }
});

// GET all courses
app.get('/courses', async (req, res, next) => {
    try {
        const courses = await Course.find();
        res.json(courses);
    } catch (err) {
        next(err);
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