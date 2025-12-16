const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const sectionController = require('../controllers/sectionController');

/**
 * Section Routes
 * Base path: /api/v1/sections
 */

// Get instructor's sections (faculty)
router.get('/my-sections', authenticate, authorize('faculty', 'admin'), sectionController.getInstructorSections);

// Get all sections
router.get('/', authenticate, sectionController.getSections);

// Get section by ID
router.get('/:id', authenticate, sectionController.getSectionById);

// Create section (admin only)
router.post('/', authenticate, authorize('admin'), sectionController.createSection);

// Update section (admin only)
router.put('/:id', authenticate, authorize('admin'), sectionController.updateSection);

module.exports = router;



