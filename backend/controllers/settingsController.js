/**
 * Settings Controller
 * Handles organization-wide configuration settings
 */

const fs = require('fs');
const path = require('path');
const { hasPermission } = require('../utils/permissions');
const { recordAuditLog } = require('../models/auditLogModel');
const { 
  getOrganizationSettings, 
  getScheduleSettings, 
  getLeaveSettings,
  resolveAttendanceRules,
  resolveWorkingDays,
  resolveWorkingHours
} = require('../utils/configResolver');

const companyFilePath = path.join(__dirname, '../data/company.json');

/**
 * Get company information
 */
const getCompanyInfo = (req, res) => {
  try {
    if (fs.existsSync(companyFilePath)) {
      const company = JSON.parse(fs.readFileSync(companyFilePath, 'utf8'));
      res.json({
        success: true,
        data: company
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Company information not found'
      });
    }
  } catch (error) {
    console.error('Error reading company info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve company information'
    });
  }
};

/**
 * Update company information
 * Requires admin/hr permissions
 */
const updateCompanyInfo = (req, res) => {
  try {
    const { userId, userRole } = req;
    const actor = { id: userId, role: userRole || 'employee' };

    // Check permissions
    if (!hasPermission(actor, 'edit', 'company-settings')) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied'
      });
    }

    const updates = req.body;

    let company = {};
    if (fs.existsSync(companyFilePath)) {
      company = JSON.parse(fs.readFileSync(companyFilePath, 'utf8'));
    }

    // Merge updates
    const updatedCompany = {
      ...company,
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: userId
    };

    // Write to file
    fs.writeFileSync(companyFilePath, JSON.stringify(updatedCompany, null, 2));

    // Audit log
    recordAuditLog({
      actorId: userId,
      action: 'update-company-settings',
      targetId: 'company',
      details: 'Updated company configuration'
    });

    res.json({
      success: true,
      message: 'Company information updated successfully',
      data: updatedCompany
    });
  } catch (error) {
    console.error('Error updating company info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update company information'
    });
  }
};

/**
 * Get organization settings (read-only view)
 */
const getOrganizationSettingsAPI = (req, res) => {
  try {
    const settings = getOrganizationSettings();
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error getting organization settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve organization settings'
    });
  }
};

/**
 * Update organization settings
 * Requires admin permissions
 */
const updateOrganizationSettings = (req, res) => {
  try {
    const { userId, userRole } = req;
    const actor = { id: userId, role: userRole || 'employee' };

    if (!hasPermission(actor, 'edit', 'company-settings')) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied'
      });
    }

    const updates = req.body;

    let company = {};
    if (fs.existsSync(companyFilePath)) {
      company = JSON.parse(fs.readFileSync(companyFilePath, 'utf8'));
    }

    // Update organizationSettings section
    company.organizationSettings = {
      ...company.organizationSettings,
      ...updates
    };

    company.updatedAt = new Date().toISOString();
    company.updatedBy = userId;

    fs.writeFileSync(companyFilePath, JSON.stringify(company, null, 2));

    recordAuditLog({
      actorId: userId,
      action: 'update-organization-settings',
      targetId: 'organization-settings',
      details: JSON.stringify(updates)
    });

    res.json({
      success: true,
      message: 'Organization settings updated successfully',
      data: company.organizationSettings
    });
  } catch (error) {
    console.error('Error updating organization settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update organization settings'
    });
  }
};

/**
 * Get attendance settings (resolved with hierarchy)
 */
const getAttendanceSettings = (req, res) => {
  try {
    const { shiftId, departmentId } = req.query;
    const rules = resolveAttendanceRules(shiftId, departmentId);

    res.json({
      success: true,
      data: rules,
      context: {
        shiftId: shiftId || null,
        departmentId: departmentId || null,
        source: shiftId ? 'shift' : departmentId ? 'department' : 'organization'
      }
    });
  } catch (error) {
    console.error('Error getting attendance settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve attendance settings'
    });
  }
};

/**
 * Get working days (resolved with hierarchy)
 */
const getWorkingDays = (req, res) => {
  try {
    const { shiftId, departmentId } = req.query;
    const workingDays = resolveWorkingDays(shiftId, departmentId);

    // Convert to day names for display
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const workingDayNames = workingDays.map(day => dayNames[day]);

    res.json({
      success: true,
      data: {
        workingDays,
        workingDayNames
      },
      context: {
        shiftId: shiftId || null,
        departmentId: departmentId || null
      }
    });
  } catch (error) {
    console.error('Error getting working days:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve working days'
    });
  }
};

/**
 * Get working hours (resolved with hierarchy)
 */
const getWorkingHours = (req, res) => {
  try {
    const { shiftId, departmentId } = req.query;
    const hours = resolveWorkingHours(shiftId, departmentId);

    res.json({
      success: true,
      data: hours,
      context: {
        shiftId: shiftId || null,
        departmentId: departmentId || null
      }
    });
  } catch (error) {
    console.error('Error getting working hours:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve working hours'
    });
  }
};

/**
 * Get schedule settings
 */
const getScheduleSettingsAPI = (req, res) => {
  try {
    const settings = getScheduleSettings();
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error getting schedule settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve schedule settings'
    });
  }
};

/**
 * Get leave settings
 */
const getLeaveSettingsAPI = (req, res) => {
  try {
    const settings = getLeaveSettings();
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error getting leave settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve leave settings'
    });
  }
};

module.exports = {
  getCompanyInfo,
  updateCompanyInfo,
  getOrganizationSettingsAPI,
  updateOrganizationSettings,
  getAttendanceSettings,
  getWorkingDays,
  getWorkingHours,
  getScheduleSettingsAPI,
  getLeaveSettingsAPI
};
