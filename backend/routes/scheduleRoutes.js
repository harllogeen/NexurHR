const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const {
  getSchedules,
  getSchedule,
  addSchedule,
  modifySchedule,
  removeSchedule,
  autoGenerateSchedules,
  clearSchedules
} = require('../controllers/scheduleController');

// All schedule routes require authentication
router.use(verifyToken);

// Get schedules (employees can view their own, HR/Admin can view all)
router.get('/', getSchedules);

// Get single schedule
router.get('/:id', getSchedule);

// Create schedule (HR/Admin only)
router.post('/', checkRole(['admin', 'hr']), addSchedule);

// Update schedule (HR/Admin only)
router.put('/:id', checkRole(['admin', 'hr']), modifySchedule);

// Delete schedule (HR/Admin only)
router.delete('/:id', checkRole(['admin', 'hr']), removeSchedule);

// Auto-generate schedules (HR/Admin only)
router.post('/auto-generate', checkRole(['admin', 'hr']), autoGenerateSchedules);

// Clear schedules for date range (HR/Admin only)
router.post('/clear', checkRole(['admin', 'hr']), clearSchedules);

module.exports = router;
