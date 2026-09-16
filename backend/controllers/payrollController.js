const { getPayroll, savePayroll } = require("../models/payrollModel");
const { getAttendance } = require("../models/attendanceModel");
const { getEmployees } = require("../models/employeeModel");
const { getLeaves } = require("../models/leaveModel");
const {
  getEmployeeConfig,
  upsertEmployeeConfig,
} = require("../models/payrollConfigModel");
const { calculateNetPay, calculateProratedSalary } = require("../utils/payrollCalculator");

// Helper to calculate hours from attendance records
const calculateHours = (attendanceRecords) => {
  let totalMinutes = 0;
  attendanceRecords.forEach((record) => {
    if (record.clockIn && record.clockOut) {
      const inTime = new Date(record.clockIn).getTime();
      const outTime = new Date(record.clockOut).getTime();
      totalMinutes += (outTime - inTime) / (1000 * 60);
    }
  });
  return Math.round((totalMinutes / 60) * 10) / 10; // Round to 1 decimal
};

// Helper to calculate late minutes from attendance
const calculateLateMinutes = (attendanceRecords, standardStartHour = 9) => {
  let totalLateMinutes = 0;
  attendanceRecords.forEach((record) => {
    if (record.clockIn) {
      const clockInTime = new Date(record.clockIn);
      const clockInHour = clockInTime.getHours();
      const clockInMinute = clockInTime.getMinutes();

      // If clocked in after standard start hour
      if (
        clockInHour > standardStartHour ||
        (clockInHour === standardStartHour && clockInMinute > 0)
      ) {
        const lateMinutes =
          (clockInHour - standardStartHour) * 60 + clockInMinute;
        totalLateMinutes += lateMinutes;
      }
    }
  });
  return totalLateMinutes;
};

const getUnpaidLeaveDays = (employeeId, month, year, leaves = []) => {
  return leaves.reduce((total, leaveItem) => {
    if (leaveItem.employeeId !== employeeId) return total;
    if (leaveItem.status !== "Approved") return total;

    const leaveStart = new Date(leaveItem.startDate || leaveItem.fromDate || leaveItem.date);
    const leaveEnd = new Date(leaveItem.endDate || leaveItem.toDate || leaveItem.date);
    const sameMonth = leaveStart.getMonth() + 1 === month && leaveStart.getFullYear() === year;
    const sameRange = leaveStart.getMonth() + 1 === month && leaveEnd.getFullYear() === year;

    if (!sameMonth && !sameRange) return total;

    const daysRequested = Math.max(1, Math.round((leaveEnd - leaveStart) / (1000 * 60 * 60 * 24)) + 1);
    return total + daysRequested;
  }, 0);
};

const generatePayroll = (req, res) => {
  const employees = getEmployees();
  const attendance = getAttendance();
  const leaves = getLeaves();
  const existingPayroll = getPayroll();

  const targetMonth = req.query.month
    ? parseInt(req.query.month) - 1
    : new Date().getMonth();
  const targetYear = req.query.year
    ? parseInt(req.query.year)
    : new Date().getFullYear();

  const newPayrollRecords = employees.map((emp) => {
    const empAttendance = attendance.filter(
      (a) =>
        a.userId == emp.id &&
        new Date(a.date).getMonth() === targetMonth &&
        new Date(a.date).getFullYear() === targetYear,
    );

    // Get employee payroll config
    const config = getEmployeeConfig(emp.id) || {
      loans: [],
      allowances: [],
      deductions: [],
      bonus: 0,
      overtimeRate: 1.5,
      latePenaltyPerMinute: 0,
    };

    const daysWorked = empAttendance.length;
    const hoursWorked = calculateHours(empAttendance);
    const lateMinutes = calculateLateMinutes(empAttendance);
    const baseSalary = emp.salary || 50000;
    const standardDays = 22;
    const standardHours = standardDays * 8;
    const unpaidLeaveDays = getUnpaidLeaveDays(emp.id, targetMonth + 1, targetYear, leaves);

    // Calculate pro-rated salary based on days or hours worked
    const proratedSalary = calculateProratedSalary({
      baseSalary,
      workingDays: standardDays,
      daysWorked,
      rate: 1,
    });

    // Calculate total allowances
    const totalAllowances = (config.allowances || [])
      .filter((a) => a.isActive !== false)
      .reduce((sum, a) => sum + (a.amount || 0), 0);

    // Calculate bonus
    const bonus = config.bonus || 0;

    // Calculate total deductions (fixed + percentage-based)
    let totalDeductions = (config.deductions || [])
      .filter((d) => d.isActive !== false)
      .reduce((sum, d) => {
        if (d.isPercentage) {
          return sum + baseSalary * (d.amount / 100);
        }
        return sum + (d.amount || 0);
      }, 0);

    // Calculate loan deductions (only active loans)
    const loanDeduction = (config.loans || [])
      .filter((l) => l.status === "Active" && l.balance > 0)
      .reduce(
        (sum, l) => sum + Math.min(l.monthlyDeduction || 0, l.balance),
        0,
      );

    // Calculate late penalty
    const latePenalty = lateMinutes * (config.latePenaltyPerMinute || 0);

    // Calculate gross and net pay
    const grossPay = Math.round(proratedSalary + totalAllowances + bonus);
    const netBreakdown = calculateNetPay({
      baseSalary: grossPay,
      allowances: 0,
      deductions: totalDeductions,
      loans: loanDeduction,
      latePenalty,
      unpaidLeaveDays,
      workingDays: standardDays,
    });
    const netPay = Math.max(0, netBreakdown.netPay);

    // Check if already exists for this period
    const existingRecord = existingPayroll.find(
      (p) =>
        p.employeeId == emp.id &&
        p.month == targetMonth + 1 &&
        p.year == targetYear,
    );

    return {
      id: existingRecord?.id || Date.now() + Math.random(),
      employeeId: emp.id,
      name: `${emp.firstName} ${emp.lastName}`,
      email: emp.email,
      department: emp.department,
      month: targetMonth + 1,
      year: targetYear,
      daysWorked,
      hoursWorked,
      lateMinutes,
      baseSalary,
      allowances: totalAllowances,
      bonus,
      grossPay,
      loan: loanDeduction,
      deductions: totalDeductions,
      latePenalty,
      unpaidLeaveDays,
      salaryComponents: {
        basic: proratedSalary,
        allowances: totalAllowances,
        bonus,
        deductions: totalDeductions,
        loans: loanDeduction,
        latePenalty,
        unpaidLeaveDeduction: netBreakdown.unpaidLeaveDeduction,
      },
      netPay,
      datePaid: existingRecord?.datePaid || null,
      status: existingRecord?.status || "Pending",
      currency: "NGN",
      taxConfig: "Country configurable",
    };
  });

  // Update loan balances after generating payroll
  newPayrollRecords.forEach((record) => {
    const config = getEmployeeConfig(record.employeeId);
    if (config && config.loans) {
      config.loans.forEach((loan) => {
        if (loan.status === "Active" && loan.balance > 0) {
          const deducted = Math.min(loan.monthlyDeduction || 0, loan.balance);
          loan.balance -= deducted;
          if (loan.balance <= 0) {
            loan.balance = 0;
            loan.status = "Paid";
          }
        }
      });
      // Save updated loan balances
      upsertEmployeeConfig(record.employeeId, config);
    }
  });

  // Merge with existing records (keep other months)
  const otherMonthsRecords = existingPayroll.filter(
    (p) => !(p.month == targetMonth + 1 && p.year == targetYear),
  );
  const updatedPayroll = [...otherMonthsRecords, ...newPayrollRecords];

  savePayroll(updatedPayroll);
  res.status(200).json(newPayrollRecords);
};

const getPayrollData = (req, res) => {
  const payroll = getPayroll();
  const { month, year } = req.query;

  let filtered = payroll;
  if (month && year) {
    filtered = payroll.filter((p) => p.month == month && p.year == year);
  }

  res.status(200).json(filtered);
};

const updatePayrollStatus = (req, res) => {
  const { id } = req.params;
  const { status, datePaid } = req.body;

  const payroll = getPayroll();
  const index = payroll.findIndex((p) => p.id == id);

  if (index === -1) {
    return res.status(404).json({ message: "Payroll record not found" });
  }

  payroll[index].status = status || payroll[index].status;
  payroll[index].datePaid = datePaid || payroll[index].datePaid;

  savePayroll(payroll);
  res.status(200).json(payroll[index]);
};

const exportPayrollCSV = (req, res) => {
  const payroll = getPayroll();
  const { month, year } = req.query;

  let dataToExport = payroll;
  if (month && year) {
    dataToExport = payroll.filter((p) => p.month == month && p.year == year);
  }

  if (dataToExport.length === 0) {
    return res
      .status(404)
      .json({ message: "No payroll data available to export" });
  }

  const header = [
    "Employee ID",
    "Name",
    "Department",
    "Month",
    "Year",
    "Days Worked",
    "Hours Worked",
    "Base Salary",
    "Allowances",
    "Bonus",
    "Gross Pay",
    "Loan",
    "Deductions",
    "Late Penalty",
    "Net Pay",
    "Date Paid",
    "Status",
  ];
  const rows = dataToExport.map((p) => [
    p.employeeId,
    p.name,
    p.department || "",
    p.month,
    p.year,
    p.daysWorked,
    p.hoursWorked || 0,
    p.baseSalary || 0,
    p.allowances || 0,
    p.bonus || 0,
    p.grossPay || 0,
    p.loan || 0,
    p.deductions || 0,
    p.latePenalty || 0,
    p.netPay || 0,
    p.datePaid || "",
    p.status || "Pending",
  ]);

  let csvContent = header.join(",") + "\n";
  rows.forEach((row) => {
    csvContent += row.join(",") + "\n";
  });

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=payroll.csv");
  res.status(200).send(csvContent);
};

const getMyPayslip = (req, res) => {
  const { month, year } = req.query;
  const payroll = getPayroll();
  const payslip = payroll.find(
    (p) =>
      p.employeeId == req.userId &&
      p.month == (month || new Date().getMonth() + 1) &&
      p.year == (year || new Date().getFullYear()),
  );

  if (!payslip) {
    return res
      .status(404)
      .json({ message: "Payslip not found for this period" });
  }

  res.status(200).json(payslip);
};

module.exports = {
  generatePayroll,
  getPayrollData,
  updatePayrollStatus,
  exportPayrollCSV,
  getMyPayslip,
};
