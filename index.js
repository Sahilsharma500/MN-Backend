import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './db.js';

// Route imports
import sectionsRoutes from './routes/sections.js';
import teachersRoutes from './routes/teachers.js';
import studentsRoutes from './routes/students.js';
import observationsRoutes from './routes/observations.js';
import reportsRoutes from './routes/reports.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
connectDB();

// API Routes
app.use('/api/sections', sectionsRoutes);
app.use('/api/teachers', teachersRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/observations', observationsRoutes);
app.use('/api/reports', reportsRoutes);

// Root Endpoint
app.get('/', (req, res) => {
  res.send('Mind Garden API is running');
});

// Start Server conditionally (for Vercel serverless support)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
