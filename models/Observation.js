import mongoose from 'mongoose';

const observationSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  mood: {
    type: String,
  },
  dimensions: {
    emotional: { type: Number, default: 0 },
    social: { type: Number, default: 0 },
    cognitive: { type: Number, default: 0 },
    physical: { type: Number, default: 0 },
    creative: { type: Number, default: 0 },
  },
  tags: [{
    type: String,
  }],
  highlight: {
    type: String,
  },
  photo: {
    type: String, // URL/path
  }
}, { timestamps: true });

// Ensure one observation per student per day
// We will manage 'date' at midnight boundaries (startOfDay) from frontend.
observationSchema.index({ studentId: 1, date: 1 }, { unique: true });

const Observation = mongoose.model('Observation', observationSchema);

export default Observation;
