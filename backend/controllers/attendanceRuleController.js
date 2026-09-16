const {
  getAllRules,
  getActiveRules,
  getRuleById,
  getRulesByDepartment,
  createRule,
  updateRule,
  deleteRule
} = require('../models/attendanceRuleModel');

const { logActivity } = require('../models/activityModel');

// Get all attendance rules
const getRules = (req, res) => {
  try {
    const { department, activeOnly } = req.query;

    let rules;
    if (department) {
      rules = getRulesByDepartment(department);
    } else if (activeOnly === 'true') {
      rules = getActiveRules();
    } else {
      rules = getAllRules();
    }

    res.json({
      success: true,
      data: rules
    });
  } catch (error) {
    console.error('Error getting attendance rules:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve attendance rules'
    });
  }
};

// Get rule by ID
const getRule = (req, res) => {
  try {
    const { id } = req.params;
    const rule = getRuleById(id);

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Attendance rule not found'
      });
    }

    res.json({
      success: true,
      data: rule
    });
  } catch (error) {
    console.error('Error getting attendance rule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve attendance rule'
    });
  }
};

// Create attendance rule
const addRule = (req, res) => {
  try {
    const { user } = req;
    const ruleData = req.body;

    // Validate required fields
    if (!ruleData.name || !ruleData.ruleType) {
      return res.status(400).json({
        success: false,
        message: 'Name and rule type are required'
      });
    }

    const newRule = createRule(ruleData, user.id);

    // Log activity
    logActivity({
      userId: user.id,
      action: 'attendance_rule_created',
      category: 'attendance',
      description: `Created attendance rule: ${newRule.name}`,
      metadata: { ruleId: newRule.id }
    });

    res.status(201).json({
      success: true,
      message: 'Attendance rule created successfully',
      data: newRule
    });
  } catch (error) {
    console.error('Error creating attendance rule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create attendance rule'
    });
  }
};

// Update attendance rule
const modifyRule = (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;
    const updateData = req.body;

    const existingRule = getRuleById(id);
    if (!existingRule) {
      return res.status(404).json({
        success: false,
        message: 'Attendance rule not found'
      });
    }

    const updatedRule = updateRule(id, updateData);

    // Log activity
    logActivity({
      userId: user.id,
      action: 'attendance_rule_updated',
      category: 'attendance',
      description: `Updated attendance rule: ${updatedRule.name}`,
      metadata: { ruleId: id }
    });

    res.json({
      success: true,
      message: 'Attendance rule updated successfully',
      data: updatedRule
    });
  } catch (error) {
    console.error('Error updating attendance rule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update attendance rule'
    });
  }
};

// Delete attendance rule
const removeRule = (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;

    const existingRule = getRuleById(id);
    if (!existingRule) {
      return res.status(404).json({
        success: false,
        message: 'Attendance rule not found'
      });
    }

    const deleted = deleteRule(id);

    if (!deleted) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete attendance rule'
      });
    }

    // Log activity
    logActivity({
      userId: user.id,
      action: 'attendance_rule_deleted',
      category: 'attendance',
      description: `Deleted attendance rule: ${existingRule.name}`,
      metadata: { ruleId: id }
    });

    res.json({
      success: true,
      message: 'Attendance rule deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting attendance rule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete attendance rule'
    });
  }
};

module.exports = {
  getRules,
  getRule,
  addRule,
  modifyRule,
  removeRule
};
