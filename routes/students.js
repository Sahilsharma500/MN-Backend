import express from 'express';
import Student from '../models/Student.js';
import Section from '../models/Section.js';

const router = express.Router();

// GET all students
router.get('/', async (req, res) => {
  try {
    const students = await Student.find().populate('section');
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST to create a new student
router.post('/', async (req, res) => {
  const { name, rollNumber, guardianName, sectionId } = req.body;
  try {
    const newStudent = new Student({
      name,
      rollNumber,
      guardianName,
      section: sectionId
    });

    const savedStudent = await newStudent.save();
    
    // Populate the section before sending back
    await savedStudent.populate('section');
    
    res.status(201).json(savedStudent);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// POST bulk students
router.post('/bulk', async (req, res) => {
  const { students } = req.body;
  
  if (!Array.isArray(students)) {
    return res.status(400).json({ message: 'Expected an array of students' });
  }

  try {
    // Generate IDs for those that lack them to bypass mongoose insertMany pre-hook missing
    const preparedStudents = students.map(s => {
      if (!s.studentId) {
        const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
        s.studentId = `MG-${Date.now().toString().slice(-6)}-${randomStr}`;
      }
      return {
        name: s.name,
        rollNumber: s.rollNumber || undefined,
        guardianName: s.guardianName || undefined,
        section: s.sectionId,
        studentId: s.studentId
      };
    });

    const inserted = await Student.insertMany(preparedStudents);
    // Populate sections after insert is difficult on multiple docs simultaneously in older mongoose,
    // but we can query them immediately
    const populated = await Student.find({ _id: { $in: inserted.map(i => i._id) } }).populate('section');
    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// POST auto-assign students from import
router.post('/auto-assign', async (req, res) => {
  const { students } = req.body;
  if (!Array.isArray(students)) {
    return res.status(400).json({ message: 'Expected an array of students' });
  }

  try {
    const allSections = await Section.find();
    
    const validStudents = [];
    const skippedStudents = [];

    students.forEach((s, index) => {
      const rowId = s.originalRow || (index + 2);
      const sectionName = s.grade || s.Grade || s.sectionName;
      if (!sectionName) {
        skippedStudents.push(`Row ${rowId}: Missing Grade`);
        return;
      }
      
      const matchedSection = allSections.find(sec => sec.name.toLowerCase() === sectionName.toString().toLowerCase());
      
      if (!matchedSection) {
        skippedStudents.push(`Row ${rowId}: Section "${sectionName}" doesn't exist`);
        return;
      }

      let studentId = s.studentId;
      if (!studentId) {
        const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
        studentId = `MG-${Date.now().toString().slice(-6)}-${randomStr}`;
      }

      validStudents.push({
        name: s.name,
        rollNumber: s.rollNumber || undefined,
        guardianName: s.guardianName || undefined,
        section: matchedSection._id,
        studentId: studentId
      });
    });

    if (validStudents.length > 0) {
      await Student.insertMany(validStudents);
    }

    res.status(201).json({
      insertedCount: validStudents.length,
      skippedCount: skippedStudents.length,
      skippedDetails: skippedStudents
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE a student
router.delete('/:id', async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json({ message: 'Student deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
