const fs = require('fs');
const path = require('path');

const rulesFilePath = path.join(__dirname, '../data/attendanceRules.json');

class AttendanceRule {
  constructor(data) {
    this.id = data.id || Date.now().toString();
    this.name = data.name;
    this.ruleType = data.ruleType; // 'late', 'early_close', 'grace_period', 'overtime'
    this.department = data.department || 'all'; // Department ID or "all"
    this.lateThreshold = data.lateThreshold || 15; // Minutes after scheduled start
    this.earlyCloseThreshold = data.earlyCloseThreshold || 15; // Minutes before scheduled end
    this.gracePeriod = data.gracePeriod || 5; // Minutes grace period
    this.overtimeThreshold = data.overtimeThreshold || 30; // Minutes after scheduled end
    this.autoApproveOvertime = data.autoApproveOvertime || false;
    this.requireApproval = data.requireApproval || false;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.priority = data.priority || 1; // Lower number = higher priority
    this.description = data.description || '';
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.createdBy = data.createdBy;
  }
}

// Read rules from file
const readRules = () => {
  try {
    if (fs.existsSync(rulesFilePath)) {
      const data = fs.readFileSync(rulesFilePath, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Error reading attendance rules:', error);
    return [];
  }
};

// Write rules to file
const writeRules = (rules) => {
  try {
    fs.writeFileSync(rulesFilePath, JSON.stringify(rules, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing attendance rules:', error);
    return false;
  }
};

// Get all rules
const getAllRules = () => {
  return readRules().sort((a, b) => a.priority - b.priority);
};

// Get active rules
const getActiveRules = () => {
  return readRules().filter(r => r.isActive === true).sort((a, b) => a.priority - b.priority);
};

// Get rule by ID
const getRuleById = (id) => {
  const rules = readRules();
  return rules.find(r => r.id === id);
};

// Get rules by department
const getRulesByDepartment = (departmentId) => {
  const rules = readRules();
  return rules.filter(r => 
    (r.department === departmentId || r.department === 'all') && r.isActive === true
  ).sort((a, b) => a.priority - b.priority);
};

// Create rule
const createRule = (ruleData, userId) => {
  const rules = readRules();
  const newRule = new AttendanceRule({ ...ruleData, createdBy: userId });
  rules.push(newRule);
  writeRules(rules);
  return newRule;
};

// Update rule
const updateRule = (id, updateData) => {
  const rules = readRules();
  const index = rules.findIndex(r => r.id === id);
  
  if (index === -1) {
    return null;
  }

  rules[index] = {
    ...rules[index],
    ...updateData,
    id: rules[index].id,
    createdAt: rules[index].createdAt,
    updatedAt: new Date().toISOString()
  };

  writeRules(rules);
  return rules[index];
};

// Delete rule
const deleteRule = (id) => {
  const rules = readRules();
  const filtered = rules.filter(r => r.id !== id);
  
  if (rules.length === filtered.length) {
    return false;
  }

  writeRules(filtered);
  return true;
};

// Calculate attendance status based on rules
const calculateAttendanceStatus = (scheduled, actual, departmentId = null) => {
  const rules = departmentId ? getRulesByDepartment(departmentId) : getActiveRules();
  
  if (!scheduled || !actual) {
    return { status: 'absent', details: 'No clock-in record' };
  }

  const scheduledStart = new Date(`2000-01-01T${scheduled.startTime}`);
  const scheduledEnd = new Date(`2000-01-01T${scheduled.endTime}`);
  const actualStart = new Date(`2000-01-01T${actual.clockIn}`);
  const actualEnd = actual.clockOut ? new Date(`2000-01-01T${actual.clockOut}`) : null;

  // Get thresholds from rules (use first matching rule)
  let lateThreshold = 15;
  let gracePeriod = 5;
  let earlyCloseThreshold = 15;

  if (rules.length > 0) {
    const rule = rules[0];
    lateThreshold = rule.lateThreshold;
    gracePeriod = rule.gracePeriod;
    earlyCloseThreshold = rule.earlyCloseThreshold;
  }

  // Calculate minutes difference
  const startDiffMinutes = (actualStart - scheduledStart) / (1000 * 60);
  const endDiffMinutes = actualEnd ? (scheduledEnd - actualEnd) / (1000 * 60) : null;

  // Determine status
  let status = 'on_time';
  let details = '';

  // Check late arrival
  if (startDiffMinutes > gracePeriod) {
    if (startDiffMinutes > lateThreshold) {
      status = 'late';
      details = `Late by ${Math.floor(startDiffMinutes)} minutes`;
    } else {
      status = 'on_time';
      details = `Arrived ${Math.floor(startDiffMinutes)} minutes after scheduled time (within grace period)`;
    }
  } else if (startDiffMinutes < -gracePeriod) {
    status = 'early';
    details = `Arrived ${Math.floor(Math.abs(startDiffMinutes))} minutes early`;
  } else {
    status = 'on_time';
    details = 'On time';
  }

  // Check early departure if clocked out
  if (actualEnd && endDiffMinutes > earlyCloseThreshold) {
    status = 'early_close';
    details = `Left ${Math.floor(endDiffMinutes)} minutes early`;
  }

  // Check if still working (no clock out)
  if (!actualEnd) {
    const now = new Date();
    const currentTime = new Date(`2000-01-01T${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
    
    if (currentTime > scheduledEnd) {
      status = 'overtime';
      details = 'Working overtime';
    } else {
      details += ' (Currently working)';
    }
  }

  return { status, details, startDiffMinutes, endDiffMinutes };
};

module.exports = {
  AttendanceRule,
  getAllRules,
  getActiveRules,
  getRuleById,
  getRulesByDepartment,
  createRule,
  updateRule,
  deleteRule,
  calculateAttendanceStatus
};
