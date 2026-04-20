import express from 'express';
import Section from '../models/Section.js';
import Teacher from '../models/Teacher.js';

const router = express.Router();

// GET all sections
router.get('/', async (req, res) => {
  try {
    const sections = await Section.find().populate('teacher');
    res.json(sections);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET single section
router.get('/:id', async (req, res) => {
  try {
    const section = await Section.findById(req.params.id).populate('teacher');
    if (!section) return res.status(404).json({ message: 'Section not found' });
    res.json(section);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST to create a new section and optionally allot a teacher
router.post('/', async (req, res) => {
  const { name, teacherId } = req.body;
  try {
    const newSection = new Section({ name });
    
    // If a teacher ID is provided, map it to the Section
    if (teacherId) {
      const teacher = await Teacher.findById(teacherId);
      if (teacher) {
        newSection.teacher = teacher._id;
      }
    }
    
    const savedSection = await newSection.save();

    // If teacher was allocated, we also update the teacher's sections array
    if (newSection.teacher) {
      await Teacher.findByIdAndUpdate(
        newSection.teacher,
        { $addToSet: { sections: savedSection._id } }
      );
    }

    res.status(201).json(savedSection);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PATCH to allocate a teacher to a section later
router.patch('/:id/allocate-teacher', async (req, res) => {
  const { teacherId } = req.body;
  try {
    const section = await Section.findById(req.params.id);
    if (!section) return res.status(404).json({ message: 'Section not found' });

    // Remove old teacher relation if exists
    if (section.teacher) {
      await Teacher.findByIdAndUpdate(
        section.teacher,
        { $pull: { sections: section._id } }
      );
    }

    // Allocate new teacher
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

    section.teacher = teacher._id;
    await section.save();

    await Teacher.findByIdAndUpdate(
      teacher._id,
      { $addToSet: { sections: section._id } }
    );

    res.json(section);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE a section
router.delete('/:id', async (req, res) => {
  try {
    const section = await Section.findById(req.params.id);
    if (!section) return res.status(404).json({ message: 'Section not found' });

    // Optional: remove section reference from teacher
    if (section.teacher) {
      await Teacher.findByIdAndUpdate(section.teacher, { $pull: { sections: section._id } });
    }

    await Section.findByIdAndDelete(req.params.id);
    res.json({ message: 'Section deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
