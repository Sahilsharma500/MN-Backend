import express from 'express';
import Observation from '../models/Observation.js';

const router = express.Router();

// GET all observations, optionally filter by studentId
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.studentId) filter.studentId = req.query.studentId;
    
    // You might also want to filter by date ranges if required
    if (req.query.startDate && req.query.endDate) {
      filter.date = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }
    
    const observations = await Observation.find(filter).populate('studentId', 'name studentId');
    res.json(observations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST a new observation or UPDATE existing one for the same day
router.post('/', async (req, res) => {
  const { studentId, date, mood, dimensions, tags, highlight, photo } = req.body;
  try {
    // We expect date to be standardized from frontend to midnight (e.g. 2026-04-10T00:00:00.000Z)
    // Update if exists for that student + date, otherwise insert (upsert)
    const observation = await Observation.findOneAndUpdate(
      { studentId, date: new Date(date) },
      { mood, dimensions, tags, highlight, photo },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.status(201).json(observation);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
