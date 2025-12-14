const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const announcementController = require('../controllers/announcementController');

/**
 * Announcement Routes
 * Base path: /api/v1/announcements
 */

// Get all announcements (authenticated)
router.get('/', authenticate, announcementController.getAnnouncements);

// Create announcement (admin only)
router.post('/', authenticate, authorize('admin'), announcementController.createAnnouncement);

// Update announcement (admin only)
router.put('/:id', authenticate, authorize('admin'), announcementController.updateAnnouncement);

// Delete announcement (admin only)
router.delete('/:id', authenticate, authorize('admin'), announcementController.deleteAnnouncement);

module.exports = router;
