const roundCurrency = (value) => Math.round(value);

const calculateProratedSalary = ({ baseSalary, workingDays, daysWorked, rate = 1 }) => {
  if (!workingDays || workingDays <= 0) return roundCurrency(baseSalary * rate);
  const proportion = Math.min(1, Math.max(0, daysWorked / workingDays));
  return roundCurrency(baseSalary * proportion * rate);
};

const calculateNetPay = ({
  baseSalary,
  allowances = 0,
  deductions = 0,
  loans = 0,
  latePenalty = 0,
  unpaidLeaveDays = 0,
  workingDays = 22,
}) => {
  const grossPay = roundCurrency(baseSalary + allowances);
  const unpaidLeaveDeduction = roundCurrency((baseSalary / workingDays) * unpaidLeaveDays);
  const netPay = roundCurrency(grossPay - deductions - loans - latePenalty - unpaidLeaveDeduction);

  return {
    grossPay,
    unpaidLeaveDeduction,
    netPay,
  };
};

module.exports = {
  calculateProratedSalary,
  calculateNetPay,
};
