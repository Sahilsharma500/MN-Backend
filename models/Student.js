import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
  studentId: {
    type: String,
    unique: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  rollNumber: {
    type: String,
    trim: true,
  },
  guardianName: {
    type: String,
    trim: true,
  },
  section: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section',
  }
}, { timestamps: true });

// Pre-save hook to generate a unique studentId if one isn't provided
studentSchema.pre('save', function () {
  if (!this.studentId) {
    // Generate a simple unique ID (e.g., MG-<timestamp>-<random>)
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.studentId = `MG-${Date.now().toString().slice(-6)}-${randomStr}`;
  }
});

const Student = mongoose.model('Student', studentSchema);

export default Student;
