const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const mealController = require('../controllers/mealController');

/**
 * Meal Routes
 * Base path: /api/v1/meals
 */

// Cafeteria routes
router.get('/cafeterias', authenticate, mealController.getCafeterias);

// Menu routes
router.get('/menus', authenticate, mealController.getMenus);
router.get('/menus/:id', authenticate, mealController.getMenuById);
router.post('/menus', authenticate, authorize('admin', 'cafeteria_staff'), mealController.createMenu);
router.put('/menus/:id', authenticate, authorize('admin', 'cafeteria_staff'), mealController.updateMenu);
router.delete('/menus/:id', authenticate, authorize('admin', 'cafeteria_staff'), mealController.deleteMenu);

// Reservation routes
router.post('/reservations', authenticate, mealController.createReservation);
router.delete('/reservations/:id', authenticate, mealController.cancelReservation);
router.get('/reservations/my-reservations', authenticate, mealController.getMyReservations);
router.get('/reservations/qr/:qrCode', authenticate, authorize('admin', 'cafeteria_staff'), mealController.getReservationByQR);
router.post('/reservations/:id/use', authenticate, authorize('admin', 'cafeteria_staff'), mealController.useReservation);
router.post('/reservations/:id/transfer', authenticate, mealController.transferReservation);
router.post('/reservations/:id/accept-transfer', authenticate, mealController.acceptTransfer);
router.get('/reservations/pending-transfers', authenticate, mealController.getPendingTransfers);

module.exports = router;

