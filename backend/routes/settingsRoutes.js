const express = require('express');
const router = express.Router();
const {
  getCompanyInfo,
  updateCompanyInfo,
  getOrganizationSettingsAPI,
  updateOrganizationSettings,
  getAttendanceSettings,
  getWorkingDays,
  getWorkingHours,
  getScheduleSettingsAPI,
  getLeaveSettingsAPI
} = require('../controllers/settingsController');
const { verifyToken } = require('../middleware/authMiddleware');

// Company information
router.get('/company', verifyToken, getCompanyInfo);
router.put('/company', verifyToken, updateCompanyInfo);

// Organization settings
router.get('/organization', verifyToken, getOrganizationSettingsAPI);
router.put('/organization', verifyToken, updateOrganizationSettings);

// Resolved settings (with hierarchy)
router.get('/attendance-rules', verifyToken, getAttendanceSettings);
router.get('/working-days', verifyToken, getWorkingDays);
router.get('/working-hours', verifyToken, getWorkingHours);

// Schedule and leave settings
router.get('/schedule', verifyToken, getScheduleSettingsAPI);
router.get('/leave', verifyToken, getLeaveSettingsAPI);

module.exports = router;
