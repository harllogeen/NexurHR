const {
  getAllShifts,
  getShiftById,
  getShiftsByDepartment,
  getActiveShifts,
  createShift,
  updateShift,
  deleteShift
} = require('../models/shiftModel');

const { logActivity } = require('../models/activityModel');

// Get all shifts
const getShifts = (req, res) => {
  try {
    const { department, activeOnly } = req.query;

    let shifts;
    if (department) {
      shifts = getShiftsByDepartment(department);
    } else if (activeOnly === 'true') {
      shifts = getActiveShifts();
    } else {
      shifts = getAllShifts();
    }

    res.json({
      success: true,
      data: shifts
    });
  } catch (error) {
    console.error('Error getting shifts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve shifts'
    });
  }
};

// Get shift by ID
const getShift = (req, res) => {
  try {
    const { id } = req.params;
    const shift = getShiftById(id);

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }

    res.json({
      success: true,
      data: shift
    });
  } catch (error) {
    console.error('Error getting shift:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve shift'
    });
  }
};

// Create new shift
const addShift = (req, res) => {
  try {
    const { user } = req;
    const shiftData = req.body;

    // Validate required fields
    if (!shiftData.name || !shiftData.startTime || !shiftData.endTime) {
      return res.status(400).json({
        success: false,
        message: 'Name, start time, and end time are required'
      });
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(shiftData.startTime) || !timeRegex.test(shiftData.endTime)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid time format. Use HH:MM format'
      });
    }

    const newShift = createShift(shiftData, user.id);

    // Log activity
    logActivity({
      userId: user.id,
      action: 'shift_created',
      category: 'shift',
      description: `Created shift: ${newShift.name}`,
      metadata: { shiftId: newShift.id }
    });

    res.status(201).json({
      success: true,
      message: 'Shift created successfully',
      data: newShift
    });
  } catch (error) {
    console.error('Error creating shift:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create shift'
    });
  }
};

// Update shift
const modifyShift = (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;
    const updateData = req.body;

    const existingShift = getShiftById(id);
    if (!existingShift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }

    // Validate time format if provided
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (updateData.startTime && !timeRegex.test(updateData.startTime)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid start time format. Use HH:MM format'
      });
    }
    if (updateData.endTime && !timeRegex.test(updateData.endTime)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid end time format. Use HH:MM format'
      });
    }

    const updatedShift = updateShift(id, updateData);

    // Log activity
    logActivity({
      userId: user.id,
      action: 'shift_updated',
      category: 'shift',
      description: `Updated shift: ${updatedShift.name}`,
      metadata: { shiftId: id }
    });

    res.json({
      success: true,
      message: 'Shift updated successfully',
      data: updatedShift
    });
  } catch (error) {
    console.error('Error updating shift:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update shift'
    });
  }
};

// Delete shift
const removeShift = (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;

    const existingShift = getShiftById(id);
    if (!existingShift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }

    const deleted = deleteShift(id);

    if (!deleted) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete shift'
      });
    }

    // Log activity
    logActivity({
      userId: user.id,
      action: 'shift_deleted',
      category: 'shift',
      description: `Deleted shift: ${existingShift.name}`,
      metadata: { shiftId: id }
    });

    res.json({
      success: true,
      message: 'Shift deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting shift:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete shift'
    });
  }
};

module.exports = {
  getShifts,
  getShift,
  addShift,
  modifyShift,
  removeShift
};
