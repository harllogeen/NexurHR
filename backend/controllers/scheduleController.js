const {
  getAllSchedules,
  getScheduleById,
  getSchedulesByEmployee,
  getSchedulesByDateRange,
  getSchedulesByDate,
  createSchedule,
  createSchedules,
  updateSchedule,
  deleteSchedule,
  deleteSchedulesByDateRange,
  checkScheduleConflict,
  isEmployeeOnLeave
} = require('../models/scheduleModel');

const { getShiftById, getActiveShifts } = require('../models/shiftModel');
const { getEmployees } = require('../models/employeeModel');
const { getAvailabilityByEmployee, getAvailabilityByEmployeeAndDay, isEmployeeAvailable } = require('../models/availabilityModel');
const { getLeavesByDateRange } = require('../models/leaveModel');
const { logActivity } = require('../models/activityModel');
const Notification = require('../models/notificationModel');
const { getUserByEmployeeId } = require('../models/userModel');

// Helper function to get employee by ID
const getEmployeeById = (employeeId) => {
  const employees = getEmployees();
  return employees.find(e => e.id == employeeId);
};

// Get schedules
const getSchedules = (req, res) => {
  try {
    const { employeeId, startDate, endDate, date, department } = req.query;

    let schedules;
    if (employeeId) {
      schedules = getSchedulesByEmployee(employeeId, startDate, endDate);
    } else if (startDate && endDate) {
      schedules = getSchedulesByDateRange(startDate, endDate, department);
    } else if (date) {
      schedules = getSchedulesByDate(date);
    } else {
      schedules = getAllSchedules();
    }

    // Populate shift and employee details
    schedules = schedules.map(schedule => {
      const shift = getShiftById(schedule.shiftId);
      const employee = getEmployeeById(schedule.employeeId);
      return {
        ...schedule,
        shift,
        employee: employee ? {
          id: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          employeeId: employee.employeeId,
          department: employee.department,
          position: employee.position
        } : null
      };
    });

    res.json({
      success: true,
      data: schedules
    });
  } catch (error) {
    console.error('Error getting schedules:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve schedules'
    });
  }
};

// Get schedule by ID
const getSchedule = (req, res) => {
  try {
    const { id } = req.params;
    const schedule = getScheduleById(id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    // Populate details
    const shift = getShiftById(schedule.shiftId);
    const employee = getEmployeeById(schedule.employeeId);

    res.json({
      success: true,
      data: {
        ...schedule,
        shift,
        employee
      }
    });
  } catch (error) {
    console.error('Error getting schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve schedule'
    });
  }
};

// Create single schedule
const addSchedule = (req, res) => {
  try {
    const { user } = req;
    const scheduleData = req.body;

    // Validate required fields
    if (!scheduleData.employeeId || !scheduleData.shiftId || !scheduleData.date) {
      return res.status(400).json({
        success: false,
        message: 'Employee, shift, and date are required'
      });
    }

    // Get shift details
    const shift = getShiftById(scheduleData.shiftId);
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }

    // Check if employee is on approved leave
    if (isEmployeeOnLeave(scheduleData.employeeId, scheduleData.date)) {
      return res.status(409).json({
        success: false,
        message: 'Employee is on approved leave for this date. Cannot schedule shifts during leave period.'
      });
    }

    // Check for conflicts
    const conflict = checkScheduleConflict(
      scheduleData.employeeId,
      scheduleData.date,
      scheduleData.startTime || shift.startTime,
      scheduleData.endTime || shift.endTime
    );

    if (conflict) {
      return res.status(409).json({
        success: false,
        message: 'Employee already has a shift scheduled at this time',
        conflict
      });
    }

    // Create schedule
    const newSchedule = createSchedule({
      ...scheduleData,
      startTime: scheduleData.startTime || shift.startTime,
      endTime: scheduleData.endTime || shift.endTime,
      department: scheduleData.department || shift.department,
      assignedBy: user.id,
      assignmentType: 'manual'
    });

    // Create notification for employee
    const employee = getEmployeeById(scheduleData.employeeId);
    if (employee) {
      const employeeUser = getUserByEmployeeId(employee.id);
      if (employeeUser) {
        const scheduleDate = new Date(scheduleData.date);
        const formattedDate = scheduleDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'long', 
          day: 'numeric' 
        });
        
        Notification.create({
          userId: employeeUser.id,
          type: 'schedule',
          title: 'New Shift Assignment',
          message: `You have been scheduled for ${shift.name} on ${formattedDate} from ${shift.startTime} to ${shift.endTime}`,
          data: {
            scheduleId: newSchedule.id,
            shiftName: shift.name,
            date: scheduleData.date,
            startTime: shift.startTime,
            endTime: shift.endTime
          }
        });
      }
    }

    // Log activity
    logActivity({
      userId: user.id,
      action: 'schedule_created',
      category: 'schedule',
      description: `Assigned ${employee?.firstName} ${employee?.lastName} to ${shift.name} on ${scheduleData.date}`,
      metadata: { scheduleId: newSchedule.id }
    });

    res.status(201).json({
      success: true,
      message: 'Schedule created successfully',
      data: newSchedule
    });
  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create schedule'
    });
  }
};

// Update schedule
const modifySchedule = (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;
    const updateData = req.body;

    const existingSchedule = getScheduleById(id);
    if (!existingSchedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    // Check for conflicts if times are being changed
    if (updateData.startTime || updateData.endTime) {
      const conflict = checkScheduleConflict(
        existingSchedule.employeeId,
        existingSchedule.date,
        updateData.startTime || existingSchedule.startTime,
        updateData.endTime || existingSchedule.endTime,
        id
      );

      if (conflict) {
        return res.status(409).json({
          success: false,
          message: 'Schedule conflict detected',
          conflict
        });
      }
    }

    const updatedSchedule = updateSchedule(id, updateData);

    // Log activity
    logActivity({
      userId: user.id,
      action: 'schedule_updated',
      category: 'schedule',
      description: `Updated schedule for ${existingSchedule.date}`,
      metadata: { scheduleId: id }
    });

    res.json({
      success: true,
      message: 'Schedule updated successfully',
      data: updatedSchedule
    });
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update schedule'
    });
  }
};

// Delete schedule
const removeSchedule = (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;

    const existingSchedule = getScheduleById(id);
    if (!existingSchedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    const deleted = deleteSchedule(id);

    if (!deleted) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete schedule'
      });
    }

    // Log activity
    logActivity({
      userId: user.id,
      action: 'schedule_deleted',
      category: 'schedule',
      description: `Deleted schedule for ${existingSchedule.date}`,
      metadata: { scheduleId: id }
    });

    res.json({
      success: true,
      message: 'Schedule deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete schedule'
    });
  }
};

// Auto-generate schedules for a date range
const autoGenerateSchedules = (req, res) => {
  try {
    const { user } = req;
    const { startDate, endDate, departmentId, shiftIds } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    // Get employees to schedule
    let employees = getEmployees();
    if (departmentId) {
      employees = employees.filter(e => e.department === departmentId);
    }

    // Get shifts to use
    let shifts = shiftIds ? shiftIds.map(id => getShiftById(id)).filter(Boolean) : getActiveShifts();
    if (departmentId) {
      shifts = shifts.filter(s => s.department === departmentId || s.department === 'all');
    }

    if (shifts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No shifts available for scheduling'
      });
    }

    // Get approved leaves in this period
    const leaves = getLeavesByDateRange(startDate, endDate).filter(l => l.status === 'approved');

    const generatedSchedules = [];
    const errors = [];
    const conflicts = [];

    // Get today's date (without time)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Generate schedules for each date
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();

      // Skip past dates - only generate schedules for today and future
      if (date < today) {
        continue;
      }

      // Collect all possible assignments for this date
      const possibleAssignments = [];

      // Process each shift for this date
      for (const shift of shifts) {
        // Check if shift applies to this day of week
        if (!shift.workingDays.includes(dayOfWeek)) {
          console.log(`[Auto-Generate] Skipping ${shift.name} on ${dateStr} (day ${dayOfWeek}) - not in workingDays [${shift.workingDays}]`);
          continue;
        }

        console.log(`[Auto-Generate] Processing ${shift.name} on ${dateStr} (day ${dayOfWeek})`);

        // Find available employees for this shift
        const availableEmployees = employees.filter(employee => {
          // Check if employee is on leave (match both userId and employeeId)
          const onLeave = leaves.some(leave => {
            const matchesUserId = leave.userId == employee.userId || leave.userId == employee.id;
            const matchesEmployeeId = leave.employeeId == employee.id;
            const isInDateRange = dateStr >= leave.startDate && dateStr <= leave.endDate;
            return (matchesUserId || matchesEmployeeId) && isInDateRange;
          });

          if (onLeave) {
            console.log(`  - ${employee.firstName} ${employee.lastName}: ON LEAVE`);
            return false;
          }

          // Check availability
          const available = isEmployeeAvailable(employee.id, dateStr, shift.startTime, shift.endTime);
          if (!available) {
            console.log(`  - ${employee.firstName} ${employee.lastName}: NOT AVAILABLE (time: ${shift.startTime}-${shift.endTime})`);
            return false;
          }

          // Check for conflicts with existing schedules
          const conflict = checkScheduleConflict(employee.id, dateStr, shift.startTime, shift.endTime);
          if (conflict) {
            console.log(`  - ${employee.firstName} ${employee.lastName}: CONFLICT with existing schedule`);
            return false;
          }

          console.log(`  - ${employee.firstName} ${employee.lastName}: AVAILABLE`);
          return true;
        });

        console.log(`  Available employees for ${shift.name}: ${availableEmployees.length}`);

        // For each available employee, check if they prefer this shift
        availableEmployees.forEach(employee => {
          const availability = getAvailabilityByEmployeeAndDay(employee.id, dayOfWeek);
          const prefersShift = availability?.preferredShifts?.includes(shift.id);
          
          possibleAssignments.push({
            employee,
            shift,
            prefersShift,
            priority: prefersShift ? 1 : 0
          });

          if (prefersShift) {
            console.log(`    * ${employee.firstName} ${employee.lastName} PREFERS ${shift.id}`);
          }
        });
      }

      // Sort assignments: preferred employees first
      possibleAssignments.sort((a, b) => b.priority - a.priority);

      // Assign employees to shifts, ensuring one shift per employee per day
      const assignedEmployees = new Set();
      const shiftAssignments = {};

      for (const assignment of possibleAssignments) {
        const { employee, shift } = assignment;

        // Skip if employee already assigned for this day
        if (assignedEmployees.has(employee.id)) {
          continue;
        }

        // Initialize shift assignment tracking
        if (!shiftAssignments[shift.id]) {
          shiftAssignments[shift.id] = [];
        }

        // Check if shift still needs more employees
        const required = shift.requiredEmployees || 1;
        if (shiftAssignments[shift.id].length < required) {
          shiftAssignments[shift.id].push(employee);
          assignedEmployees.add(employee.id);
          console.log(`  Assigned ${employee.firstName} ${employee.lastName} to ${shift.name}${assignment.prefersShift ? ' (PREFERRED)' : ''}`);
        }
      }

      // Create schedules and track errors
      for (const [shiftId, assignedEmps] of Object.entries(shiftAssignments)) {
        const shift = shifts.find(s => s.id === shiftId);
        const required = shift.requiredEmployees || 1;

        if (assignedEmps.length < required) {
          errors.push({
            date: dateStr,
            shift: shift.name,
            required,
            available: assignedEmps.length,
            message: `Insufficient employees available for ${shift.name} on ${dateStr}`
          });
        }

        // Create schedules for assigned employees
        for (const employee of assignedEmps) {
          try {
            const schedule = createSchedule({
              employeeId: employee.id,
              shiftId: shift.id,
              date: dateStr,
              startTime: shift.startTime,
              endTime: shift.endTime,
              department: shift.department,
              assignedBy: user.id,
              assignmentType: 'auto'
            });
            generatedSchedules.push(schedule);

            // Create notification for employee
            const employeeUser = getUserByEmployeeId(employee.id);
            if (employeeUser) {
              const scheduleDate = new Date(dateStr);
              const formattedDate = scheduleDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              });
              
              Notification.create({
                userId: employeeUser.id,
                type: 'schedule',
                title: 'New Shift Assignment',
                message: `You have been scheduled for ${shift.name} on ${formattedDate} from ${shift.startTime} to ${shift.endTime}`,
                data: {
                  scheduleId: schedule.id,
                  shiftName: shift.name,
                  date: dateStr,
                  startTime: shift.startTime,
                  endTime: shift.endTime
                }
              });
            }
          } catch (error) {
            conflicts.push({
              employee: `${employee.firstName} ${employee.lastName}`,
              date: dateStr,
              shift: shift.name,
              error: error.message
            });
          }
        }
      }
    }

    // Log activity
    logActivity({
      userId: user.id,
      action: 'schedules_auto_generated',
      category: 'schedule',
      description: `Auto-generated ${generatedSchedules.length} schedules from ${startDate} to ${endDate}`,
      metadata: {
        count: generatedSchedules.length,
        startDate,
        endDate,
        errors: errors.length,
        conflicts: conflicts.length
      }
    });

    res.json({
      success: true,
      message: `Generated ${generatedSchedules.length} schedules`,
      data: {
        schedules: generatedSchedules,
        errors,
        conflicts,
        summary: {
          total: generatedSchedules.length,
          errors: errors.length,
          conflicts: conflicts.length
        }
      }
    });
  } catch (error) {
    console.error('Error auto-generating schedules:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to auto-generate schedules'
    });
  }
};

// Clear schedules for a date range
const clearSchedules = (req, res) => {
  try {
    const { user } = req;
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const deletedCount = deleteSchedulesByDateRange(startDate, endDate);

    // Log activity
    logActivity({
      userId: user.id,
      action: 'schedules_cleared',
      category: 'schedule',
      description: `Cleared ${deletedCount} schedules from ${startDate} to ${endDate}`,
      metadata: { deletedCount, startDate, endDate }
    });

    res.json({
      success: true,
      message: `Cleared ${deletedCount} schedules`,
      data: { deletedCount }
    });
  } catch (error) {
    console.error('Error clearing schedules:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear schedules'
    });
  }
};

module.exports = {
  getSchedules,
  getSchedule,
  addSchedule,
  modifySchedule,
  removeSchedule,
  autoGenerateSchedules,
  clearSchedules
};
