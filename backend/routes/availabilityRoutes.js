const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const {
  getAvailability,
  updateAvailability,
  updateWeeklyAvailability,
  removeAvailability
} = require('../controllers/availabilityController');

// All availability routes require authentication
router.use(verifyToken);

// Get availability (employees can view their own, HR/Admin can view all)
router.get('/', getAvailability);

// Update single day availability (employees can update their own, HR/Admin can update any)
router.post('/', updateAvailability);

// Update weekly availability (employees can update their own, HR/Admin can update any)
router.post('/weekly', updateWeeklyAvailability);

// Delete availability (HR/Admin only)
router.delete('/:id', checkRole(['admin', 'hr']), removeAvailability);

module.exports = router;
