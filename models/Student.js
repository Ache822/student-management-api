const mongoose = require('mongoose');

// Define the blueprint for a Student document
const StudentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Student name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email address is required'],
    unique: true,
    trim: true,
    lowercase: true
  },
  age: {
    type: Number,
    required: [true, 'Age is required']
  },
  isEnrolled: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true // Automatically creates 'createdAt' and 'updatedAt' fields
});

// Export the model so we can use it to perform CRUD operations in our routes
module.exports = mongoose.model('Student', StudentSchema);