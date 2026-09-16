const {
  getAllAvailability,
  getAvailabilityByEmployee,
  getAvailabilityByEmployeeAndDay,
  setAvailability,
  setWeeklyAvailability,
  deleteAvailability
} = require('../models/availabilityModel');

const { logActivity } = require('../models/activityModel');

// Get availability
const getAvailability = (req, res) => {
  try {
    const { employeeId, dayOfWeek } = req.query;
    const { user } = req;

    let availability;
    if (employeeId && dayOfWeek !== undefined) {
      availability = getAvailabilityByEmployeeAndDay(employeeId, parseInt(dayOfWeek));
    } else if (employeeId) {
      availability = getAvailabilityByEmployee(employeeId);
    } else if (user.role === 'admin' || user.role === 'hr') {
      availability = getAllAvailability();
    } else {
      // Regular employees can only see their own
      availability = getAvailabilityByEmployee(user.employeeId);
    }

    res.json({
      success: true,
      data: availability
    });
  } catch (error) {
    console.error('Error getting availability:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve availability'
    });
  }
};

// Set single day availability
const updateAvailability = (req, res) => {
  try {
    const { user } = req;
    const availabilityData = req.body;

    // Validate required fields
    if (!availabilityData.employeeId || availabilityData.dayOfWeek === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID and day of week are required'
      });
    }

    // Employees can only update their own availability
    if (user.role !== 'admin' && user.role !== 'hr' && user.employeeId !== availabilityData.employeeId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own availability'
      });
    }

    // Validate day of week (0-6)
    const dayOfWeek = parseInt(availabilityData.dayOfWeek);
    if (dayOfWeek < 0 || dayOfWeek > 6) {
      return res.status(400).json({
        success: false,
        message: 'Day of week must be between 0 (Sunday) and 6 (Saturday)'
      });
    }

    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (availabilityData.availableFrom && !timeRegex.test(availabilityData.availableFrom)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid availableFrom time format. Use HH:MM format'
      });
    }
    if (availabilityData.availableTo && !timeRegex.test(availabilityData.availableTo)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid availableTo time format. Use HH:MM format'
      });
    }

    const updatedAvailability = setAvailability(availabilityData);

    // Log activity
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    logActivity({
      userId: user.id,
      action: 'availability_updated',
      category: 'availability',
      description: `Updated availability for ${dayNames[dayOfWeek]}`,
      metadata: { availabilityId: updatedAvailability.id }
    });

    res.json({
      success: true,
      message: 'Availability updated successfully',
      data: updatedAvailability
    });
  } catch (error) {
    console.error('Error updating availability:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update availability'
    });
  }
};

// Set weekly availability (all days at once)
const updateWeeklyAvailability = (req, res) => {
  try {
    const { user } = req;
    let weeklyData;
    let employeeId;

    // Handle two possible request formats:
    // 1. Array directly in body (from frontend)
    // 2. { employeeId, weeklyData } structure
    if (Array.isArray(req.body)) {
      weeklyData = req.body;
      // Get employeeId from first item or from user
      employeeId = weeklyData[0]?.employeeId || user.employeeId || user.id;
    } else {
      employeeId = req.body.employeeId;
      weeklyData = req.body.weeklyData;
    }

    if (!employeeId || !weeklyData) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID and weekly data are required'
      });
    }

    // Convert to string for comparison to handle both number and string IDs
    // Get employeeId from user object (could be user.employeeId or user.id)
    const userEmployeeId = String(user.employeeId || user.id);
    const requestEmployeeId = String(employeeId);

    console.log('Availability update authorization check:', {
      userRole: user.role,
      userId: user.id,
      userEmployeeId: user.employeeId,
      requestEmployeeId,
      match: userEmployeeId === requestEmployeeId
    });

    // Employees can only update their own availability
    // HR and admin can update anyone's availability
    if (user.role !== 'admin' && user.role !== 'hr') {
      // For employees, check if they're updating their own record
      // Match against either user.employeeId or user.id (for backward compatibility)
      const isOwnRecord = (
        userEmployeeId === requestEmployeeId ||
        String(user.id) === requestEmployeeId
      );
      
      if (!isOwnRecord) {
        console.log('Authorization DENIED - employee trying to update another employee');
        return res.status(403).json({
          success: false,
          message: 'You can only update your own availability'
        });
      }
    }

    // Validate weeklyData structure
    if (!Array.isArray(weeklyData) || weeklyData.length !== 7) {
      return res.status(400).json({
        success: false,
        message: 'weeklyData must be an array of 7 objects (one for each day)'
      });
    }

    const results = setWeeklyAvailability(employeeId, weeklyData);

    // Log activity
    logActivity({
      userId: user.id,
      action: 'weekly_availability_updated',
      category: 'availability',
      description: 'Updated weekly availability preferences',
      metadata: { employeeId, count: results.length }
    });

    res.json({
      success: true,
      message: 'Weekly availability updated successfully',
      data: results
    });
  } catch (error) {
    console.error('Error updating weekly availability:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to update weekly availability',
      error: error.message
    });
  }
};

// Delete availability
const removeAvailability = (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;

    const deleted = deleteAvailability(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Availability record not found'
      });
    }

    // Log activity
    logActivity({
      userId: user.id,
      action: 'availability_deleted',
      category: 'availability',
      description: 'Deleted availability record',
      metadata: { availabilityId: id }
    });

    res.json({
      success: true,
      message: 'Availability deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting availability:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete availability'
    });
  }
};

module.exports = {
  getAvailability,
  updateAvailability,
  updateWeeklyAvailability,
  removeAvailability
};
