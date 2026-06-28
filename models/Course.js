const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema({
  courseCode: {
    type: String,
    required: [true, 'Course code is required (e.g., CS101)'],
    unique: true,
    uppercase: true,
    trim: true
  },
  title: {
    type: String,
    required: [true, 'Course title is required'],
    trim: true
  },
  credits: {
    type: Number,
    required: [true, 'Number of credits is required'],
    min: [1, 'A course must be worth at least 1 credit'],
    max: [6, 'A course cannot exceed 6 credits']
  },
  instructor: {
    type: String,
    required: [true, 'Instructor name is required'],
    trim: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Course', CourseSchema);