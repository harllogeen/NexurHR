const { getEmployees, saveEmployees } = require("../models/employeeModel");
const { getUsers, saveUsers } = require("../models/userModel");
const bcrypt = require("bcryptjs");
const { hasPermission } = require("../utils/permissions");
const { recordAuditLog } = require("../models/auditLogModel");

const getUserContext = (req) => ({ id: req.userId, role: req.userRole || "employee" });

const parseCsv = (content) => {
  const rows = content.trim().split(/\r?\n/).filter(Boolean);
  if (rows.length < 2) return [];

  const headers = rows[0].split(",").map((header) => header.trim());
  return rows.slice(1).map((row) => {
    const values = row.split(",").map((value) => value.trim());
    return headers.reduce((acc, header, index) => {
      acc[header] = values[index] || "";
      return acc;
    }, {});
  });
};

const getAllEmployees = (req, res) => {
  const actor = getUserContext(req);
  if (!hasPermission(actor, "read", "employee")) {
    return res.status(403).json({ message: "Permission denied" });
  }

  const employees = getEmployees();
  const { q, department, designation, status } = req.query;
  let results = employees;

  // Department-level or direct assignment filtering for supervisors
  if (["supervisor"].includes(actor.role)) {
    const users = getUsers();
    const currentUser = users.find(u => u.id === actor.id);
    if (currentUser && currentUser.employeeId) {
      const currentEmployee = employees.find(e => e.id === currentUser.employeeId);
      if (currentEmployee) {
        // Filter out employees who are NOT in the manager's department
        // AND who are NOT explicitly reporting to this manager
        results = results.filter(e => {
          const inSameDepartment = e.department && currentEmployee.department && e.department === currentEmployee.department;
          const reportingToMe = String(e.reportingTo) === String(currentEmployee.id);
          return inSameDepartment || reportingToMe;
        });
      } else {
        results = [];
      }
    } else {
      results = [];
    }
  }

  if (q) {
    const searchTerm = q.toLowerCase();
    results = results.filter((employee) =>
      [employee.firstName, employee.lastName, employee.email, employee.department, employee.role, employee.status]
        .join(" ")
        .toLowerCase()
        .includes(searchTerm),
    );
  }

  if (department) {
    results = results.filter((employee) => (employee.department || "").toLowerCase() === department.toLowerCase());
  }

  if (designation) {
    results = results.filter((employee) => (employee.designation || employee.role || "").toLowerCase() === designation.toLowerCase());
  }

  if (status) {
    results = results.filter((employee) => (employee.status || "").toLowerCase() === status.toLowerCase());
  }

  res.status(200).json(results);
};

const searchEmployees = (req, res) => getAllEmployees(req, res);

const getOrgChart = (req, res) => {
  const actor = getUserContext(req);
  if (!hasPermission(actor, "read", "employee")) {
    return res.status(403).json({ message: "Permission denied" });
  }

  const employees = getEmployees();
  const nodes = employees.reduce((acc, employee) => {
    acc[employee.id] = {
      id: employee.id,
      name: `${employee.firstName || ""} ${employee.lastName || ""}`.trim(),
      title: employee.designation || employee.role || "Employee",
      managerId: employee.manager || null,
      department: employee.department || "Unassigned",
      children: [],
    };
    return acc;
  }, {});

  const tree = [];
  Object.values(nodes).forEach((node) => {
    if (node.managerId && nodes[node.managerId]) {
      nodes[node.managerId].children.push(node);
    } else {
      tree.push(node);
    }
  });

  res.status(200).json(tree);
};

const bulkImportEmployees = (req, res) => {
  const actor = getUserContext(req);
  if (!hasPermission(actor, "import", "employee")) {
    return res.status(403).json({ message: "Permission denied" });
  }

  const { csv } = req.body;
  if (!csv) return res.status(400).json({ message: "CSV content is required" });

  const rows = parseCsv(csv);
  const employees = getEmployees();
  const users = getUsers();
  const imported = [];

  rows.forEach((row) => {
    const email = row.email || row.Email;
    if (!email) return;
    if (employees.find((employee) => employee.email === email)) return;

    const tempPassword = "Welcome123!";
    const hashedPassword = bcrypt.hashSync(tempPassword, 10);
    const employeeId = Date.now() + Math.floor(Math.random() * 1000);
    const employee = {
      id: employeeId,
      firstName: row.firstName || row.FirstName || "",
      lastName: row.lastName || row.LastName || "",
      email,
      phone: row.phone || row.Phone || "",
      department: row.department || row.Department || "Unassigned",
      designation: row.designation || row.Designation || row.role || row.Role || "Employee",
      role: row.role || row.Role || "employee",
      manager: row.manager || row.Manager || "",
      dateOfJoining: row.dateOfJoining || row.dateOfJoining || new Date().toISOString(),
      employmentType: row.employmentType || row.EmploymentType || "Full-time",
      status: row.status || row.Status || "Active",
      documents: [],
      joinedDate: new Date().toISOString(),
    };

    const user = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      email,
      username: email,
      password: hashedPassword,
      role: row.systemRole || row.SystemRole || "employee",
      employeeId,
      requirePasswordChange: true,
    };

    employees.push(employee);
    users.push(user);
    imported.push(employee);
  });

  saveEmployees(employees);
  saveUsers(users);
  recordAuditLog({ actorId: actor.id, action: "bulk-import-employees", details: `Imported ${imported.length} employees` });

  res.status(200).json({ message: "Employees imported successfully", imported });
};

const createEmployee = (req, res) => {
  const actor = getUserContext(req);
  if (!hasPermission(actor, "create", "employee")) {
    return res.status(403).json({ message: "Permission denied" });
  }

  const {
    firstName,
    lastName,
    email,
    department,
    role,
    systemRole,
    status,
    employmentType,
    salary,
    documents,
    assets,
    emergencyContact,
    manager,
    designation,
    dateOfJoining,
  } = req.body;

  if (!firstName || !lastName || !email) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const employees = getEmployees();
  const users = getUsers();

  if (employees.find((e) => e.email === email)) {
    return res.status(400).json({ message: "Employee with this email already exists" });
  }

  if (users.find((u) => u.email === email || u.username === email)) {
    return res.status(400).json({ message: "User account with this email or username already exists" });
  }

  const tempPassword = "Welcome123!";
  const hashedPassword = bcrypt.hashSync(tempPassword, 10);

  const employeeId = Date.now();
  const newEmployee = {
    id: employeeId,
    firstName,
    lastName,
    email,
    department: department || "Unassigned",
    designation: designation || role || "Employee",
    role: role || "employee",
    manager: manager || "",
    reportingTo: req.body.reportingTo || "",
    status: status || "Active",
    employmentType: employmentType || "Full-time",
    salary: salary || 0,
    documents: documents || [],
    emergencyContact: emergencyContact || { name: "", relationship: "", phone: "" },
    assets: assets || [],
    dateOfJoining: dateOfJoining || new Date().toISOString(),
    joinedDate: new Date().toISOString(),
  };

  const newUser = {
    id: Date.now() + 1,
    email,
    password: hashedPassword,
    role: systemRole || "employee",
    username: email,
    employeeId,
    requirePasswordChange: true,
  };

  employees.push(newEmployee);
  users.push(newUser);
  saveEmployees(employees);
  saveUsers(users);
  recordAuditLog({ actorId: actor.id, action: "create-employee", targetId: employeeId, details: `Created ${newEmployee.firstName} ${newEmployee.lastName}` });

  res.status(201).json({ message: "Employee and user account created successfully", employee: newEmployee, credentials: { email, temporaryPassword: tempPassword, note: "Employee must change password on first login" } });
};

const updateEmployee = (req, res) => {
  const actor = getUserContext(req);
  if (!hasPermission(actor, "update", "employee")) {
    return res.status(403).json({ message: "Permission denied" });
  }

  const { id } = req.params;
  const updates = req.body;
  const employees = getEmployees();
  const index = employees.findIndex((e) => e.id == id);

  if (index === -1) {
    return res.status(404).json({ message: "Employee not found" });
  }

  employees[index] = { ...employees[index], ...updates };
  saveEmployees(employees);
  recordAuditLog({ actorId: actor.id, action: "update-employee", targetId: id, details: "Updated employee record" });

  res.status(200).json({ message: "Employee updated successfully", employee: employees[index] });
};

const deleteEmployee = (req, res) => {
  const actor = getUserContext(req);
  if (!hasPermission(actor, "delete", "employee")) {
    return res.status(403).json({ message: "Permission denied" });
  }

  const { id } = req.params;
  const employees = getEmployees();
  const users = getUsers();

  const employeeToDelete = employees.find((e) => e.id == id);
  if (!employeeToDelete) {
    return res.status(404).json({ message: "Employee not found" });
  }

  const filteredEmployees = employees.filter((e) => e.id != id);
  const filteredUsers = users.filter((u) => u.employeeId != id && u.email !== employeeToDelete.email);

  saveEmployees(filteredEmployees);
  saveUsers(filteredUsers);
  recordAuditLog({ actorId: actor.id, action: "delete-employee", targetId: id, details: "Deleted employee record" });

  res.status(200).json({ message: "Employee and associated user account deleted successfully" });
};

const getMyProfile = (req, res) => {
  const users = getUsers();
  const user = users.find((u) => u.id == req.userId);
  const employees = getEmployees();

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  let employee;
  if (user.employeeId) {
    employee = employees.find((e) => e.id == user.employeeId);
  } else {
    employee = employees.find((e) => e.id == req.userId);
  }

  if (employee) {
    return res.status(200).json(employee);
  }

  // Fallback if the user does not have a formal employee record (e.g. initial super admin or CTO)
  const fallbackProfile = {
    id: user.id,
    firstName: user.username,
    lastName: "",
    email: user.email,
    personalEmail: user.email,
    phone: "",
    role: user.role,
    department: "Management",
    designation: user.role.toUpperCase(),
    status: "Active",
    dateOfJoining: user.createdAt || new Date().toISOString(),
  };

  res.status(200).json(fallbackProfile);
};

const updateMyProfile = (req, res) => {
  const { emergencyContact, phone, personalEmail } = req.body;
  const users = getUsers();
  const user = users.find((u) => u.id == req.userId);
  const employees = getEmployees();

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  let index = -1;
  if (user.employeeId) {
    index = employees.findIndex((e) => e.id == user.employeeId);
  } else {
    index = employees.findIndex((e) => e.id == req.userId);
  }

  if (index === -1) {
    // Create a new employee record for this management/admin user so they can save data
    const newEmployee = {
      id: user.id,
      firstName: user.username,
      lastName: "",
      email: user.email,
      personalEmail: personalEmail || user.email,
      phone: phone || "",
      role: user.role,
      department: "Management",
      designation: user.role.toUpperCase(),
      status: "Active",
      dateOfJoining: user.createdAt || new Date().toISOString(),
      emergencyContact: emergencyContact || { name: "", relationship: "", phone: "" },
    };
    employees.push(newEmployee);
    saveEmployees(employees);
    
    // update user reference
    user.employeeId = user.id;
    saveUsers(users);

    return res.status(200).json(newEmployee);
  }

  const allowedUpdates = {
    emergencyContact: emergencyContact || employees[index].emergencyContact,
    phone: phone !== undefined ? phone : employees[index].phone,
    personalEmail: personalEmail !== undefined ? personalEmail : employees[index].personalEmail,
  };

  employees[index] = { ...employees[index], ...allowedUpdates };
  saveEmployees(employees);

  res.status(200).json({ message: "Profile updated successfully", employee: employees[index] });
};

const getDashboardStats = (req, res) => {
  const { getAttendance } = require("../models/attendanceModel");
  const { getLeaves } = require("../models/leaveModel");
  const { getPayroll } = require("../models/payrollModel");

  const users = getUsers();
  const user = users.find((u) => u.id == req.userId);
  const employees = getEmployees();

  let employee;
  if (user && user.employeeId) {
    employee = employees.find((e) => e.id == user.employeeId);
  } else {
    employee = employees.find((e) => e.id == req.userId);
  }

  if (!employee) {
    return res.status(404).json({ message: "Employee not found" });
  }

  const attendance = getAttendance();
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthAttendance = attendance.filter(
    (a) => a.userId == req.userId && new Date(a.date).getMonth() === currentMonth && new Date(a.date).getFullYear() === currentYear,
  );

  const attendanceStats = {
    present: monthAttendance.filter((a) => a.status === "Present").length,
    late: monthAttendance.filter((a) => a.status === "Late").length,
    absent: monthAttendance.filter((a) => a.status === "Absent").length,
    total: monthAttendance.length,
  };

  const leaves = getLeaves();
  const myLeaves = leaves.filter((l) => l.userId == req.userId);
  const approvedLeaves = myLeaves.filter((l) => l.status === "Approved");
  const totalLeaveDays = approvedLeaves.reduce((sum, l) => {
    const start = new Date(l.startDate);
    const end = new Date(l.endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    return sum + days;
  }, 0);

  const leaveStats = {
    totalUsed: totalLeaveDays,
    totalAllowed: 20,
    remaining: 20 - totalLeaveDays,
  };

  const payroll = getPayroll();
  const myPayslips = payroll.filter((p) => p.employeeId == employee.id).sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return b.month - a.month;
  });

  const latestPayslip = myPayslips[0] || null;

  res.status(200).json({ 
    employee: { 
      id: employee.id,
      employeeId: employee.employeeId || employee.id,
      name: `${employee.firstName} ${employee.lastName}`, 
      firstName: employee.firstName,
      lastName: employee.lastName,
      department: employee.department, 
      role: employee.role,
      profilePicture: employee.profilePicture
    }, 
    attendance: attendanceStats, 
    leave: leaveStats, 
    latestPayslip 
  });
};

const uploadProfilePicture = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No image file uploaded" });
  }

  const users = getUsers();
  const user = users.find((u) => u.id == req.userId);
  const employees = getEmployees();

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  let index = -1;
  if (user.employeeId) {
    index = employees.findIndex((e) => e.id == user.employeeId);
  } else {
    index = employees.findIndex((e) => e.id == req.userId);
  }

  if (index === -1) {
    // Create dummy employee record to store the profile picture
    const newEmployee = {
      id: user.id,
      firstName: user.username,
      lastName: "",
      email: user.email,
      personalEmail: user.email,
      phone: "",
      role: user.role,
      department: "Management",
      designation: user.role.toUpperCase(),
      status: "Active",
      dateOfJoining: user.createdAt || new Date().toISOString(),
      profilePicture: req.file.path.replace(/\\/g, "/"),
    };
    employees.push(newEmployee);
    saveEmployees(employees);
    
    user.employeeId = user.id;
    saveUsers(users);

    return res.status(200).json({
      message: "Profile picture uploaded successfully",
      profilePicture: newEmployee.profilePicture,
    });
  }

  // Delete old picture if it exists
  const oldPicture = employees[index].profilePicture;
  if (oldPicture) {
    const fs = require("fs");
    const path = require("path");
    const oldPath = path.join(__dirname, "..", oldPicture);
    if (fs.existsSync(oldPath)) {
      fs.unlinkSync(oldPath);
    }
  }

  employees[index].profilePicture = req.file.path.replace(/\\/g, "/");
  saveEmployees(employees);

  res.status(200).json({
    message: "Profile picture uploaded successfully",
    profilePicture: employees[index].profilePicture,
  });
};

module.exports = {
  getAllEmployees,
  searchEmployees,
  getOrgChart,
  bulkImportEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getMyProfile,
  updateMyProfile,
  getDashboardStats,
  uploadProfilePicture,
};
