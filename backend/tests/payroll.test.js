const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateNetPay, calculateProratedSalary } = require('../utils/payrollCalculator');

test('deducts net pay when unpaid leave days are present', () => {
  const result = calculateNetPay({
    baseSalary: 100000,
    allowances: 10000,
    deductions: 5000,
    loans: 2000,
    latePenalty: 1000,
    unpaidLeaveDays: 2,
    workingDays: 22,
  });

  assert.equal(result.grossPay, 110000);
  assert.equal(result.netPay, 92909);
  assert.equal(result.unpaidLeaveDeduction, 9091);
});

test('prorates salary based on working days and configured rate', () => {
  const result = calculateProratedSalary({
    baseSalary: 120000,
    workingDays: 22,
    daysWorked: 16,
    rate: 1,
  });

  assert.equal(result, 87273);
});
