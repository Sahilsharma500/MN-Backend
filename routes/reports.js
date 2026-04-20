import express from 'express';
import { GoogleGenAI } from '@google/genai';
import { format } from 'date-fns';
import Report from '../models/Report.js';
import Student from '../models/Student.js';
import Teacher from '../models/Teacher.js';
import Observation from '../models/Observation.js';

const router = express.Router();

// GET all reports, optionally filter by studentId
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.studentId) filter.studentId = req.query.studentId;
    
    // Sort by descending startDate so newest reports are first
    const reports = await Report.find(filter)
      .populate('studentId', 'name studentId class')
      .populate('teacherId', 'name')
      .sort({ startDate: -1 });
      
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST generate a new report using AI
router.post('/generate', async (req, res) => {
  const { studentId, startDate, endDate } = req.body;
  if (!studentId || !startDate || !endDate) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const student = await Student.findById(studentId).populate({
      path: 'section',
      populate: { path: 'teacher' }
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const teacher = student.section?.teacher || { name: 'Assigned Teacher', _id: studentId };

    const observations = await Observation.find({
      studentId: student._id,
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    });

    if (observations.length === 0) {
      return res.status(400).json({ message: 'No observations found for this period to generate a report.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: 'Backend GEMINI_API_KEY is not configured in .env' });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
      Generate a warm, simple, and narrative periodic report (fortnightly) for a parent about their child ${student.name}.
      
      IMPORTANT: 
      - DO NOT include any numerical scales (e.g., "4/5" or "80%"). 
      - Use warm, simple language that is easy for parents to read.
      - Focus on storytelling and growth.
      - The teacher's name is ${teacher.name}. Write as if the teacher is speaking directly to the parent.
      
      Student Details:
      - Name: ${student.name}
      - Class: ${student.section ? student.section.name : 'Unassigned'}
      - Teacher: ${teacher.name}
      - Period: ${format(new Date(startDate), 'MMM d')} to ${format(new Date(endDate), 'MMM d, yyyy')}

      Observation Data for the last 14 days:
      ${observations.map(d => `
        Date: ${format(new Date(d.date), 'MMM d')}
        Mood: ${d.mood}
        Dimensions (for your context only, do not show numbers): Emotional: ${d.dimensions?.emotional || 0}, Social: ${d.dimensions?.social || 0}, Cognitive: ${d.dimensions?.cognitive || 0}, Physical: ${d.dimensions?.physical || 0}, Creative: ${d.dimensions?.creative || 0}
        Tags: ${(d.tags || []).join(', ')}
        Daily Highlight/Special Note: ${d.highlight || ''}
      `).join('\n')}
      
      Requirements for the report:
      1. Executive Summary: A warm opening from ${teacher.name} summarizing the child's overall well-being.
      2. Our Journey Together (Dimension Analysis): Narrate the child's progress in the 5 dimensions (Emotional, Social, Cognitive, Physical, Creative). Use bullet points for specific observations within each dimension. Focus on what they enjoyed and how they grew. NO NUMBERS.
      3. Memorable Moments: A bulleted list summarizing the daily highlights and special moments.
      4. Looking Ahead: 3-4 simple, warm suggestions for parents to try at home to keep the momentum going, presented as a clear list.
      
      Tone: Warm, simple, encouraging, and personal.
      Length: Approximately 400-600 words.
      Format: Use clear headings and bullet points for readability. Avoid long, dense paragraphs.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    const reportImages = observations.filter(obs => obs.photo).map(obs => obs.photo);

    const reportData = {
      studentId: student._id,
      teacherId: teacher._id,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      content: response.text || "Failed to generate report content.",
      recommendations: "We look forward to seeing more of these wonderful moments in the coming weeks!",
      status: 'draft',
      images: reportImages
    };

    const report = new Report(reportData);
    const savedReport = await report.save();

    res.status(201).json(savedReport);
  } catch (error) {
    console.error("AI Generation Error:", error);
    res.status(500).json({ message: error.message });
  }
});

// POST a new report
router.post('/', async (req, res) => {
  try {
    const report = new Report(req.body);
    const savedReport = await report.save();
    res.status(201).json(savedReport);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT update a report (e.g., status to final, saving edited content)
router.put('/:id', async (req, res) => {
  try {
    const updatedReport = await Report.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );
    if (!updatedReport) {
      return res.status(404).json({ message: 'Report not found' });
    }
    res.json(updatedReport);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
