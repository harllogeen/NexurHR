const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const {
  getShifts,
  getShift,
  addShift,
  modifyShift,
  removeShift
} = require('../controllers/shiftController');

// All shift routes require authentication
router.use(verifyToken);

// Get all shifts (HR/Admin only for management, but employees can view)
router.get('/', getShifts);

// Get single shift
router.get('/:id', getShift);

// Create shift (HR/Admin only)
router.post('/', checkRole(['admin', 'hr']), addShift);

// Update shift (HR/Admin only)
router.put('/:id', checkRole(['admin', 'hr']), modifyShift);

// Delete shift (HR/Admin only)
router.delete('/:id', checkRole(['admin', 'hr']), removeShift);

module.exports = router;
