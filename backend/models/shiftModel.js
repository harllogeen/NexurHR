const fs = require('fs');
const path = require('path');

const shiftsFilePath = path.join(__dirname, '../data/shifts.json');

class Shift {
  constructor(data) {
    this.id = data.id || Date.now().toString();
    this.name = data.name; // "Morning Shift", "Afternoon Shift", etc.
    this.shiftType = data.shiftType; // "morning", "afternoon", "night", "custom"
    this.startTime = data.startTime; // "08:00"
    this.endTime = data.endTime; // "17:00"
    this.breakDuration = data.breakDuration || 60; // minutes
    this.department = data.department; // Department ID or "all"
    this.workingDays = data.workingDays || [1, 2, 3, 4, 5]; // 0=Sunday, 1=Monday, etc.
    this.requiredEmployees = data.requiredEmployees || 1;
    this.color = data.color || '#3b82f6'; // For calendar display
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.description = data.description || '';
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.createdBy = data.createdBy; // User ID
  }
}

// Read shifts from file
const readShifts = () => {
  try {
    if (fs.existsSync(shiftsFilePath)) {
      const data = fs.readFileSync(shiftsFilePath, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Error reading shifts:', error);
    return [];
  }
};

// Write shifts to file
const writeShifts = (shifts) => {
  try {
    fs.writeFileSync(shiftsFilePath, JSON.stringify(shifts, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing shifts:', error);
    return false;
  }
};

// Get all shifts
const getAllShifts = () => {
  return readShifts();
};

// Get shift by ID
const getShiftById = (id) => {
  const shifts = readShifts();
  return shifts.find(s => s.id === id);
};

// Get shifts by department
const getShiftsByDepartment = (departmentId) => {
  const shifts = readShifts();
  return shifts.filter(s => s.department === departmentId || s.department === 'all');
};

// Get active shifts
const getActiveShifts = () => {
  const shifts = readShifts();
  return shifts.filter(s => s.isActive === true);
};

// Create shift
const createShift = (shiftData, userId) => {
  const shifts = readShifts();
  const newShift = new Shift({ ...shiftData, createdBy: userId });
  shifts.push(newShift);
  writeShifts(shifts);
  return newShift;
};

// Update shift
const updateShift = (id, updateData) => {
  const shifts = readShifts();
  const index = shifts.findIndex(s => s.id === id);
  
  if (index === -1) {
    return null;
  }

  shifts[index] = {
    ...shifts[index],
    ...updateData,
    id: shifts[index].id,
    createdAt: shifts[index].createdAt,
    updatedAt: new Date().toISOString()
  };

  writeShifts(shifts);
  return shifts[index];
};

// Delete shift
const deleteShift = (id) => {
  const shifts = readShifts();
  const filteredShifts = shifts.filter(s => s.id !== id);
  
  if (shifts.length === filteredShifts.length) {
    return false;
  }

  writeShifts(filteredShifts);
  return true;
};

module.exports = {
  Shift,
  getAllShifts,
  getShiftById,
  getShiftsByDepartment,
  getActiveShifts,
  createShift,
  updateShift,
  deleteShift
};
