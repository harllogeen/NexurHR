const fs = require("fs");
const path = require("path");
const dataPath = path.join(__dirname, "../data/leavePolicies.json");

/**
 * Leave Policy Model
 * Manages configurable leave types and their rules
 */

const LeavePolicy = {
  getAll: () => {
    if (!fs.existsSync(dataPath)) {
      // Initialize with default policies
      const defaultPolicies = [
        {
          id: 1,
          code: "annual",
          name: "Annual Leave",
          description: "Yearly vacation leave for rest and recreation",
          isPaid: true,
          defaultDays: 20,
          maxConsecutiveDays: null,
          minNoticedays: 3,
          carryOverAllowed: true,
          maxCarryOverDays: 5,
          requiresDocumentation: false,
          countsWeekends: false,
          countsPublicHolidays: false,
          eligibility: {
            probationEligible: false,
            minTenureMonths: 3,
            roles: [],
            departments: [],
            grades: [],
            genderSpecific: null,
          },
          accrualType: "annual", // annual, monthly, prorated
          accrualRate: null, // for monthly accrual: days per month
          expiryMonths: 12, // balance expires after X months if not used
          approvalLevels: 1,
          color: "#2563eb",
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 2,
          code: "sick",
          name: "Sick Leave",
          description: "Leave for medical reasons and illness",
          isPaid: true,
          defaultDays: 10,
          maxConsecutiveDays: 5,
          minNoticedays: 0,
          carryOverAllowed: false,
          maxCarryOverDays: 0,
          requiresDocumentation: true,
          documentationThreshold: 2, // Requires doc if more than 2 days
          countsWeekends: false,
          countsPublicHolidays: false,
          eligibility: {
            probationEligible: true,
            minTenureMonths: 0,
            roles: [],
            departments: [],
            grades: [],
            genderSpecific: null,
          },
          accrualType: "annual",
          accrualRate: null,
          expiryMonths: 12,
          approvalLevels: 1,
          color: "#dc2626",
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 3,
          code: "casual",
          name: "Casual Leave",
          description: "Short-term leave for personal matters",
          isPaid: true,
          defaultDays: 7,
          maxConsecutiveDays: 3,
          minNoticedays: 1,
          carryOverAllowed: false,
          maxCarryOverDays: 0,
          requiresDocumentation: false,
          countsWeekends: false,
          countsPublicHolidays: false,
          eligibility: {
            probationEligible: true,
            minTenureMonths: 0,
            roles: [],
            departments: [],
            grades: [],
            genderSpecific: null,
          },
          accrualType: "monthly",
          accrualRate: 0.583, // ~7 days per year
          expiryMonths: 3,
          approvalLevels: 1,
          color: "#16a34a",
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 4,
          code: "maternity",
          name: "Maternity Leave",
          description: "Leave for childbirth and post-natal care",
          isPaid: true,
          defaultDays: 90,
          maxConsecutiveDays: null,
          minNoticedays: 30,
          carryOverAllowed: false,
          maxCarryOverDays: 0,
          requiresDocumentation: true,
          documentationThreshold: 0,
          countsWeekends: true,
          countsPublicHolidays: true,
          eligibility: {
            probationEligible: false,
            minTenureMonths: 6,
            roles: [],
            departments: [],
            grades: [],
            genderSpecific: "female",
          },
          accrualType: "event-based", // Not accrued, granted on event
          accrualRate: null,
          expiryMonths: null,
          approvalLevels: 2,
          color: "#ec4899",
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 5,
          code: "paternity",
          name: "Paternity Leave",
          description: "Leave for fathers following childbirth",
          isPaid: true,
          defaultDays: 14,
          maxConsecutiveDays: null,
          minNoticedays: 14,
          carryOverAllowed: false,
          maxCarryOverDays: 0,
          requiresDocumentation: true,
          documentationThreshold: 0,
          countsWeekends: true,
          countsPublicHolidays: true,
          eligibility: {
            probationEligible: false,
            minTenureMonths: 6,
            roles: [],
            departments: [],
            grades: [],
            genderSpecific: "male",
          },
          accrualType: "event-based",
          accrualRate: null,
          expiryMonths: null,
          approvalLevels: 2,
          color: "#3b82f6",
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 6,
          code: "bereavement",
          name: "Bereavement Leave",
          description: "Compassionate leave for loss of family member",
          isPaid: true,
          defaultDays: 5,
          maxConsecutiveDays: null,
          minNoticedays: 0,
          carryOverAllowed: false,
          maxCarryOverDays: 0,
          requiresDocumentation: true,
          documentationThreshold: 0,
          countsWeekends: false,
          countsPublicHolidays: false,
          eligibility: {
            probationEligible: true,
            minTenureMonths: 0,
            roles: [],
            departments: [],
            grades: [],
            genderSpecific: null,
          },
          accrualType: "event-based",
          accrualRate: null,
          expiryMonths: null,
          approvalLevels: 1,
          color: "#64748b",
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 7,
          code: "unpaid",
          name: "Unpaid Leave",
          description: "Leave without pay for extended personal matters",
          isPaid: false,
          defaultDays: 30,
          maxConsecutiveDays: 30,
          minNoticedays: 14,
          carryOverAllowed: false,
          maxCarryOverDays: 0,
          requiresDocumentation: true,
          documentationThreshold: 0,
          countsWeekends: false,
          countsPublicHolidays: false,
          eligibility: {
            probationEligible: false,
            minTenureMonths: 12,
            roles: [],
            departments: [],
            grades: [],
            genderSpecific: null,
          },
          accrualType: "none",
          accrualRate: null,
          expiryMonths: null,
          approvalLevels: 3,
          color: "#94a3b8",
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      fs.writeFileSync(dataPath, JSON.stringify(defaultPolicies, null, 2));
      return defaultPolicies;
    }
    return JSON.parse(fs.readFileSync(dataPath, "utf8"));
  },

  saveAll: (policies) => {
    const dir = path.dirname(dataPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(dataPath, JSON.stringify(policies, null, 2));
  },

  findById: (id) => {
    const policies = LeavePolicy.getAll();
    return policies.find((p) => p.id == id);
  },

  findByCode: (code) => {
    const policies = LeavePolicy.getAll();
    return policies.find((p) => p.code === code.toLowerCase());
  },

  getActive: () => {
    const policies = LeavePolicy.getAll();
    return policies.filter((p) => p.isActive);
  },

  create: (policyData) => {
    const policies = LeavePolicy.getAll();
    const newPolicy = {
      id: Math.max(0, ...policies.map((p) => p.id)) + 1,
      ...policyData,
      code: policyData.code.toLowerCase(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    policies.push(newPolicy);
    LeavePolicy.saveAll(policies);
    return newPolicy;
  },

  update: (id, updates) => {
    const policies = LeavePolicy.getAll();
    const index = policies.findIndex((p) => p.id == id);
    if (index === -1) return null;

    policies[index] = {
      ...policies[index],
      ...updates,
      id: policies[index].id,
      code: updates.code ? updates.code.toLowerCase() : policies[index].code,
      updatedAt: new Date().toISOString(),
    };
    LeavePolicy.saveAll(policies);
    return policies[index];
  },

  delete: (id) => {
    const policies = LeavePolicy.getAll();
    const index = policies.findIndex((p) => p.id == id);
    if (index === -1) return false;

    policies.splice(index, 1);
    LeavePolicy.saveAll(policies);
    return true;
  },

  checkEligibility: (policy, employee) => {
    const { eligibility } = policy;
    const errors = [];

    // Check probation status
    if (!eligibility.probationEligible && employee.onProbation) {
      errors.push("Not eligible during probation period");
    }

    // Check tenure
    if (eligibility.minTenureMonths > 0) {
      const tenureMonths = calculateTenureMonths(employee.joiningDate);
      if (tenureMonths < eligibility.minTenureMonths) {
        errors.push(`Requires minimum ${eligibility.minTenureMonths} months tenure`);
      }
    }

    // Check role restrictions
    if (eligibility.roles.length > 0 && !eligibility.roles.includes(employee.role)) {
      errors.push("Not eligible for your role");
    }

    // Check department restrictions
    if (eligibility.departments.length > 0 && !eligibility.departments.includes(employee.department)) {
      errors.push("Not eligible for your department");
    }

    // Check grade restrictions
    if (eligibility.grades.length > 0 && !eligibility.grades.includes(employee.grade)) {
      errors.push("Not eligible for your grade level");
    }

    // Check gender-specific eligibility
    if (eligibility.genderSpecific && eligibility.genderSpecific !== employee.gender) {
      errors.push(`Only available for ${eligibility.genderSpecific} employees`);
    }

    return { eligible: errors.length === 0, errors };
  },
};

// Helper function to calculate tenure in months
function calculateTenureMonths(joiningDate) {
  const joining = new Date(joiningDate);
  const now = new Date();
  const months = (now.getFullYear() - joining.getFullYear()) * 12 + (now.getMonth() - joining.getMonth());
  return months;
}

module.exports = LeavePolicy;
