import express from 'express';
import Teacher from '../models/Teacher.js';
import Section from '../models/Section.js';

const router = express.Router();

// GET all teachers
router.get('/', async (req, res) => {
  try {
    const teachers = await Teacher.find().populate('sections');
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST to create a new teacher (can receive multiple sections mapping)
router.post('/', async (req, res) => {
  const { name, employeeId, department, designation, sectionIds } = req.body;
  try {
    const newTeacher = new Teacher({
      name,
      employeeId,
      department,
      designation,
      sections: sectionIds || []
    });

    const savedTeacher = await newTeacher.save();

    // If sectionIds were provided, also make sure Section records point back correctly 
    // depending on architecture rules, but here we keep the relationship as requested.
    if (sectionIds && sectionIds.length > 0) {
      await Section.updateMany(
        { _id: { $in: sectionIds } },
        { teacher: savedTeacher._id }
      );
    }

    res.status(201).json(savedTeacher);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE a teacher
router.delete('/:id', async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

    // Unassign this teacher from all sections they were linked to
    await Section.updateMany({ teacher: teacher._id }, { $unset: { teacher: "" } });

    await Teacher.findByIdAndDelete(req.params.id);
    res.json({ message: 'Teacher deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
