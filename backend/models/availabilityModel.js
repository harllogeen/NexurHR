const fs = require('fs');
const path = require('path');

const availabilityFilePath = path.join(__dirname, '../data/availability.json');

class Availability {
  constructor(data) {
    this.id = data.id || Date.now().toString();
    this.employeeId = data.employeeId;
    this.dayOfWeek = data.dayOfWeek; // 0-6 (Sunday-Saturday)
    this.isAvailable = data.isAvailable !== undefined ? data.isAvailable : true;
    this.availableFrom = data.availableFrom || '09:00';
    this.availableTo = data.availableTo || '17:00';
    this.preferredShifts = data.preferredShifts || []; // Array of shift IDs
    this.notes = data.notes || '';
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }
}

class TimeOffRequest {
  constructor(data) {
    this.id = data.id || Date.now().toString();
    this.employeeId = data.employeeId;
    this.startDate = data.startDate;
    this.endDate = data.endDate;
    this.reason = data.reason || '';
    this.status = data.status || 'pending'; // pending, approved, rejected
    this.reviewedBy = data.reviewedBy || null;
    this.reviewedAt = data.reviewedAt || null;
    this.createdAt = data.createdAt || new Date().toISOString();
  }
}

// Read availability from file
const readAvailability = () => {
  try {
    if (fs.existsSync(availabilityFilePath)) {
      const data = fs.readFileSync(availabilityFilePath, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Error reading availability:', error);
    return [];
  }
};

// Write availability to file
const writeAvailability = (availability) => {
  try {
    fs.writeFileSync(availabilityFilePath, JSON.stringify(availability, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing availability:', error);
    return false;
  }
};

// Get all availability records
const getAllAvailability = () => {
  return readAvailability();
};

// Get availability by employee
const getAvailabilityByEmployee = (employeeId) => {
  const availability = readAvailability();
  const filtered = availability.filter(a => a.employeeId == employeeId);
  
  // If no availability found, create default availability (Available Mon-Fri, 9am-5pm)
  if (filtered.length === 0) {
    const defaultAvailability = createDefaultAvailability(employeeId);
    return defaultAvailability;
  }
  
  return filtered;
};

// Get availability by employee and day
const getAvailabilityByEmployeeAndDay = (employeeId, dayOfWeek) => {
  const availability = readAvailability();
  // Use loose equality to handle both string and number IDs
  return availability.find(a => a.employeeId == employeeId && a.dayOfWeek === dayOfWeek);
};

// Create or update availability
const setAvailability = (availabilityData) => {
  const availability = readAvailability();
  // Use loose equality to handle both string and number IDs
  const existing = availability.findIndex(a => 
    a.employeeId == availabilityData.employeeId && 
    a.dayOfWeek === availabilityData.dayOfWeek
  );

  if (existing !== -1) {
    // Update existing
    availability[existing] = {
      ...availability[existing],
      ...availabilityData,
      id: availability[existing].id,
      createdAt: availability[existing].createdAt,
      updatedAt: new Date().toISOString()
    };
  } else {
    // Create new
    const newAvailability = new Availability(availabilityData);
    availability.push(newAvailability);
  }

  writeAvailability(availability);
  return existing !== -1 ? availability[existing] : availability[availability.length - 1];
};

// Set weekly availability (bulk update for all days)
const setWeeklyAvailability = (employeeId, weeklyData) => {
  const availability = readAvailability();
  const results = [];

  // Patch existing records or create new ones
  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
    const dayData = weeklyData[dayOfWeek] || {};
    
    // Find existing record for this employee and day (use loose equality)
    const existingIndex = availability.findIndex(a => 
      a.employeeId == employeeId && a.dayOfWeek === dayOfWeek
    );

    if (existingIndex !== -1) {
      // Update existing record (patch)
      availability[existingIndex] = {
        ...availability[existingIndex],
        isAvailable: dayData.isAvailable !== undefined ? dayData.isAvailable : availability[existingIndex].isAvailable,
        availableFrom: dayData.availableFrom || availability[existingIndex].availableFrom,
        availableTo: dayData.availableTo || availability[existingIndex].availableTo,
        preferredShifts: dayData.preferredShifts || availability[existingIndex].preferredShifts,
        notes: dayData.notes !== undefined ? dayData.notes : availability[existingIndex].notes,
        updatedAt: new Date().toISOString()
      };
      results.push(availability[existingIndex]);
    } else {
      // Create new record
      const newAvailability = new Availability({
        employeeId,
        dayOfWeek,
        isAvailable: dayData.isAvailable !== undefined ? dayData.isAvailable : true,
        availableFrom: dayData.availableFrom || '09:00',
        availableTo: dayData.availableTo || '17:00',
        preferredShifts: dayData.preferredShifts || [],
        notes: dayData.notes || ''
      });
      availability.push(newAvailability);
      results.push(newAvailability);
    }
  }

  writeAvailability(availability);
  return results;
};

// Delete availability
const deleteAvailability = (id) => {
  const availability = readAvailability();
  const filtered = availability.filter(a => a.id !== id);
  
  if (availability.length === filtered.length) {
    return false;
  }

  writeAvailability(filtered);
  return true;
};

// Check if employee is available on specific date and time
const isEmployeeAvailable = (employeeId, date, startTime, endTime) => {
  const dateObj = new Date(date);
  const dayOfWeek = dateObj.getDay();
  
  const availability = getAvailabilityByEmployeeAndDay(employeeId, dayOfWeek);
  
  if (!availability || !availability.isAvailable) {
    return false;
  }

  // Convert time strings to minutes for proper comparison
  const timeToMinutes = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const shiftStart = timeToMinutes(startTime);
  const shiftEnd = timeToMinutes(endTime);
  const availStart = timeToMinutes(availability.availableFrom);
  const availEnd = timeToMinutes(availability.availableTo);

  // Handle overnight shifts (end time < start time means it crosses midnight)
  if (shiftEnd < shiftStart) {
    // Overnight shift - employee must be available for the entire overnight period
    // This is complex, so for now, reject overnight shifts if they don't fit within availability
    return false;
  }

  // Normal shift - check if it falls within availability window
  return shiftStart >= availStart && shiftEnd <= availEnd;
};

// Create default availability for new employees (Mon-Fri 9am-5pm, Available)
const createDefaultAvailability = (employeeId) => {
  const availability = readAvailability();
  const defaultPattern = [];
  
  // Create availability for all 7 days (0 = Sunday, 6 = Saturday)
  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
    // Monday-Friday: Available 9am-5pm
    // Saturday-Sunday: Not available
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    
    const newAvailability = new Availability({
      employeeId,
      dayOfWeek,
      isAvailable: isWeekday,
      availableFrom: '09:00',
      availableTo: '17:00',
      preferredShifts: [],
      notes: isWeekday ? 'Default availability' : ''
    });
    
    availability.push(newAvailability);
    defaultPattern.push(newAvailability);
  }
  
  writeAvailability(availability);
  
  return defaultPattern;
};

module.exports = {
  Availability,
  TimeOffRequest,
  getAllAvailability,
  getAvailabilityByEmployee,
  getAvailabilityByEmployeeAndDay,
  setAvailability,
  setWeeklyAvailability,
  deleteAvailability,
  isEmployeeAvailable,
  createDefaultAvailability
};
