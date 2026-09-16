const { getEmployees } = require('../models/employeeModel');
const { getLeaves } = require('../models/leaveModel');
const { getAttendance } = require('../models/attendanceModel');
const { getUsers } = require('../models/userModel');
const { getCandidates } = require('../models/recruitmentModel');
const { getPayrollConfigs } = require('../models/payrollConfigModel');

const buildDashboard = (req, res) => {
  const employees = getEmployees();
  const leaves = getLeaves();
  const attendance = getAttendance();
  const users = getUsers();
  const candidates = getCandidates ? getCandidates() : [];
  const payrolls = getPayrollConfigs ? getPayrollConfigs() : [];

  const activeEmployees = employees.filter((employee) => (employee.status || '').toLowerCase() === 'active');
  const inactiveEmployees = employees.filter((employee) => (employee.status || '').toLowerCase() !== 'active');

  const departmentBreakdown = employees.reduce((acc, employee) => {
    const department = employee.department || 'Unassigned';
    if (!acc[department]) acc[department] = 0;
    acc[department] += 1;
    return acc;
  }, {});

  const approvedLeaves = leaves.filter((leave) => leave.status === 'Approved');
  const pendingLeaves = leaves.filter((leave) => leave.status === 'Pending');
  const totalLeaveDays = approvedLeaves.reduce((sum, leave) => {
    const start = new Date(leave.startDate);
    const end = new Date(leave.endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    return sum + days;
  }, 0);

  const monthlyLeaveUsage = approvedLeaves.reduce((acc, leave) => {
    const monthKey = new Date(leave.startDate).toLocaleString('en', { month: 'short', year: 'numeric' });
    acc[monthKey] = (acc[monthKey] || 0) + (leave.days || 1);
    return acc;
  }, {});

  const attendanceSummary = attendance.reduce((acc, entry) => {
    acc[entry.status || 'Unknown'] = (acc[entry.status || 'Unknown'] || 0) + 1;
    return acc;
  }, {});
  
  // Calculate recruitment stats
  const recruitment = {
    applied: candidates.filter(c => c.status === 'Applied' || c.status === 'Sourced').length,
    screening: candidates.filter(c => c.status === 'Screening').length,
    interview: candidates.filter(c => c.status === 'Interview').length,
    offer: candidates.filter(c => c.status === 'Offer' || c.status === 'Hired').length
  };
  
  // Generate pending actions from leaves
  const actions = pendingLeaves.map(leave => {
    const emp = employees.find(e => e.id === leave.employeeId);
    return {
      type: 'Leave Request',
      employee: emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown Employee',
      date: new Date(leave.createdAt || leave.startDate).toLocaleDateString(),
      id: leave.id
    };
  });
  
  // Try to find upcoming birthdays or anniversaries for events
  const today = new Date();
  const events = employees
    .filter(emp => emp.dateOfBirth)
    .map(emp => {
      const dob = new Date(emp.dateOfBirth);
      const nextBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
      if (nextBirthday < today) {
        nextBirthday.setFullYear(today.getFullYear() + 1);
      }
      return {
        title: `${emp.firstName}'s Birthday`,
        date: nextBirthday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        emoji: '🎂',
        rawDate: nextBirthday
      };
    })
    .sort((a, b) => a.rawDate - b.rawDate)
    .slice(0, 3)
    .map(({rawDate, ...event}) => event);
    
  if (events.length === 0) {
    events.push(
      { title: 'Annual Team Building', date: 'Dec 15, 2025', emoji: '🎉' },
      { title: 'New Hire Orientation', date: 'Dec 10, 2025', emoji: '👋' }
    );
  }

  const payload = {
    headcount: employees.length,
    activeEmployees: activeEmployees.length,
    inactiveEmployees: inactiveEmployees.length,
    attritionRate: employees.length > 0 ? ((inactiveEmployees.length / employees.length) * 100).toFixed(1) : 0,
    newHires: employees.filter(e => {
       if (!e.dateJoined) return false;
       const joined = new Date(e.dateJoined);
       const now = new Date();
       return joined.getMonth() === now.getMonth() && joined.getFullYear() === now.getFullYear();
    }).length,
    departmentBreakdown,
    leaveUtilization: {
      approvedDays: totalLeaveDays,
      pendingRequests: pendingLeaves.length,
      totalRequests: leaves.length,
      onLeaveToday: approvedLeaves.filter(leave => {
        const start = new Date(leave.startDate);
        const end = new Date(leave.endDate);
        const now = new Date();
        return now >= start && now <= end;
      }).length
    },
    monthlyLeaveUsage,
    attendanceSummary,
    recentUsers: users.slice(-5).map((user) => ({ id: user.id, username: user.username || user.email, role: user.role })),
    recruitment,
    actions,
    events,
    nextPayrollDate: '2025-12-25',
    daysToPayroll: 21,
    openPositions: 6
  };

  res.json(payload);
};

module.exports = {
  buildDashboard,
};
