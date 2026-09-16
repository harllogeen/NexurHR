const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const {
  getRules,
  getRule,
  addRule,
  modifyRule,
  removeRule
} = require('../controllers/attendanceRuleController');

// All attendance rule routes require authentication
router.use(verifyToken);

// Get all rules (all authenticated users can view)
router.get('/', getRules);

// Get single rule
router.get('/:id', getRule);

// Create rule (HR/Admin only)
router.post('/', checkRole(['admin', 'hr']), addRule);

// Update rule (HR/Admin only)
router.put('/:id', checkRole(['admin', 'hr']), modifyRule);

// Delete rule (HR/Admin only)
router.delete('/:id', checkRole(['admin', 'hr']), removeRule);

module.exports = router;
