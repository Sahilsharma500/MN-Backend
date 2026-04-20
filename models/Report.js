import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  content: {
    type: String, // Generated Markdown
    required: true,
  },
  recommendations: {
    type: String,
  },
  status: {
    type: String,
    enum: ['draft', 'final'],
    default: 'draft',
  },
  images: [{
    type: String,
  }]
}, { timestamps: true });

const Report = mongoose.model('Report', reportSchema);

export default Report;
