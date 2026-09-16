const LeavePolicy = require("../models/leavePolicyModel");
const { hasPermission } = require("../utils/permissions");
const { recordAuditLog } = require("../models/auditLogModel");

/**
 * Leave Policy Management Controller
 * Handles CRUD operations for leave policies/types
 */

// Get all leave policies
const getAllPolicies = (req, res) => {
  try {
    const policies = LeavePolicy.getAll();
    res.status(200).json(policies);
  } catch (error) {
    console.error("Error fetching leave policies:", error);
    res.status(500).json({ message: "Failed to fetch leave policies" });
  }
};

// Get active leave policies only
const getActivePolicies = (req, res) => {
  try {
    const policies = LeavePolicy.getActive();
    res.status(200).json(policies);
  } catch (error) {
    console.error("Error fetching active leave policies:", error);
    res.status(500).json({ message: "Failed to fetch active leave policies" });
  }
};

// Get single policy by ID
const getPolicyById = (req, res) => {
  try {
    const { id } = req.params;
    const policy = LeavePolicy.findById(id);

    if (!policy) {
      return res.status(404).json({ message: "Leave policy not found" });
    }

    res.status(200).json(policy);
  } catch (error) {
    console.error("Error fetching leave policy:", error);
    res.status(500).json({ message: "Failed to fetch leave policy" });
  }
};

// Get policy by code
const getPolicyByCode = (req, res) => {
  try {
    const { code } = req.params;
    const policy = LeavePolicy.findByCode(code);

    if (!policy) {
      return res.status(404).json({ message: "Leave policy not found" });
    }

    res.status(200).json(policy);
  } catch (error) {
    console.error("Error fetching leave policy:", error);
    res.status(500).json({ message: "Failed to fetch leave policy" });
  }
};

// Create new leave policy
const createPolicy = (req, res) => {
  const actor = { id: req.userId, role: req.userRole || "employee" };

  // Check permission
  if (!hasPermission(actor, "manage-policies", "leave")) {
    return res.status(403).json({ message: "Permission denied. Only HR/Admin can manage leave policies" });
  }

  try {
    const policyData = req.body;

    // Validate required fields
    if (!policyData.code || !policyData.name) {
      return res.status(400).json({ message: "Policy code and name are required" });
    }

    // Check for duplicate code
    const existing = LeavePolicy.findByCode(policyData.code);
    if (existing) {
      return res.status(400).json({ message: "A policy with this code already exists" });
    }

    // Set defaults for required fields
    const newPolicyData = {
      code: policyData.code.toLowerCase(),
      name: policyData.name,
      description: policyData.description || "",
      isPaid: policyData.isPaid !== undefined ? policyData.isPaid : true,
      defaultDays: policyData.defaultDays || 0,
      maxConsecutiveDays: policyData.maxConsecutiveDays || null,
      minNoticedays: policyData.minNoticedays || 0,
      carryOverAllowed: policyData.carryOverAllowed || false,
      maxCarryOverDays: policyData.maxCarryOverDays || 0,
      requiresDocumentation: policyData.requiresDocumentation || false,
      documentationThreshold: policyData.documentationThreshold || null,
      countsWeekends: policyData.countsWeekends || false,
      countsPublicHolidays: policyData.countsPublicHolidays || false,
      eligibility: policyData.eligibility || {
        probationEligible: false,
        minTenureMonths: 0,
        roles: [],
        departments: [],
        grades: [],
        genderSpecific: null,
      },
      accrualType: policyData.accrualType || "annual",
      accrualRate: policyData.accrualRate || null,
      expiryMonths: policyData.expiryMonths || 12,
      approvalLevels: policyData.approvalLevels || 1,
      color: policyData.color || "#64748b",
      isActive: policyData.isActive !== undefined ? policyData.isActive : true,
    };

    const newPolicy = LeavePolicy.create(newPolicyData);

    recordAuditLog({
      actorId: actor.id,
      action: "create-leave-policy",
      targetId: newPolicy.id,
      details: `Created leave policy: ${newPolicy.name}`,
    });

    res.status(201).json({
      message: "Leave policy created successfully",
      policy: newPolicy,
    });
  } catch (error) {
    console.error("Error creating leave policy:", error);
    res.status(500).json({ message: "Failed to create leave policy" });
  }
};

// Update existing leave policy
const updatePolicy = (req, res) => {
  const actor = { id: req.userId, role: req.userRole || "employee" };

  // Check permission
  if (!hasPermission(actor, "manage-policies", "leave")) {
    return res.status(403).json({ message: "Permission denied. Only HR/Admin can manage leave policies" });
  }

  try {
    const { id } = req.params;
    const updates = req.body;

    const existingPolicy = LeavePolicy.findById(id);
    if (!existingPolicy) {
      return res.status(404).json({ message: "Leave policy not found" });
    }

    // If code is being changed, check for duplicates
    if (updates.code && updates.code.toLowerCase() !== existingPolicy.code) {
      const duplicate = LeavePolicy.findByCode(updates.code);
      if (duplicate) {
        return res.status(400).json({ message: "A policy with this code already exists" });
      }
    }

    const updatedPolicy = LeavePolicy.update(id, updates);

    if (!updatedPolicy) {
      return res.status(404).json({ message: "Leave policy not found" });
    }

    recordAuditLog({
      actorId: actor.id,
      action: "update-leave-policy",
      targetId: id,
      details: `Updated leave policy: ${updatedPolicy.name}`,
    });

    res.status(200).json({
      message: "Leave policy updated successfully",
      policy: updatedPolicy,
    });
  } catch (error) {
    console.error("Error updating leave policy:", error);
    res.status(500).json({ message: "Failed to update leave policy" });
  }
};

// Delete leave policy
const deletePolicy = (req, res) => {
  const actor = { id: req.userId, role: req.userRole || "employee" };

  // Check permission
  if (!hasPermission(actor, "manage-policies", "leave")) {
    return res.status(403).json({ message: "Permission denied. Only HR/Admin can manage leave policies" });
  }

  try {
    const { id } = req.params;

    const policy = LeavePolicy.findById(id);
    if (!policy) {
      return res.status(404).json({ message: "Leave policy not found" });
    }

    const success = LeavePolicy.delete(id);

    if (!success) {
      return res.status(400).json({ message: "Failed to delete leave policy" });
    }

    recordAuditLog({
      actorId: actor.id,
      action: "delete-leave-policy",
      targetId: id,
      details: `Deleted leave policy: ${policy.name}`,
    });

    res.status(200).json({ message: "Leave policy deleted successfully" });
  } catch (error) {
    console.error("Error deleting leave policy:", error);
    res.status(500).json({ message: "Failed to delete leave policy" });
  }
};

// Check employee eligibility for a policy
const checkEligibility = (req, res) => {
  try {
    const { policyId } = req.params;
    const { userId } = req;

    const policy = LeavePolicy.findById(policyId);
    if (!policy) {
      return res.status(404).json({ message: "Leave policy not found" });
    }

    // Get employee details
    const { getUsers } = require("../models/userModel");
    const { getEmployees } = require("../models/employeeModel");

    const users = getUsers();
    const employees = getEmployees();

    const user = users.find((u) => u.id == userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const employee = employees.find((e) => e.id === user.employeeId);
    if (!employee) {
      return res.status(404).json({ message: "Employee profile not found" });
    }

    const eligibilityResult = LeavePolicy.checkEligibility(policy, {
      ...employee,
      role: user.role,
    });

    res.status(200).json({
      policy: {
        id: policy.id,
        code: policy.code,
        name: policy.name,
      },
      ...eligibilityResult,
    });
  } catch (error) {
    console.error("Error checking eligibility:", error);
    res.status(500).json({ message: "Failed to check eligibility" });
  }
};

// Get eligible policies for current user
const getEligiblePolicies = (req, res) => {
  try {
    const { userId } = req;

    // Get employee details
    const { getUsers } = require("../models/userModel");
    const { getEmployees } = require("../models/employeeModel");

    const users = getUsers();
    const employees = getEmployees();

    const user = users.find((u) => u.id == userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const employee = employees.find((e) => e.id === user.employeeId);
    if (!employee) {
      return res.status(404).json({ message: "Employee profile not found" });
    }

    const policies = LeavePolicy.getActive();
    const eligiblePolicies = [];

    policies.forEach((policy) => {
      const eligibilityResult = LeavePolicy.checkEligibility(policy, {
        ...employee,
        role: user.role,
      });

      eligiblePolicies.push({
        ...policy,
        eligible: eligibilityResult.eligible,
        eligibilityErrors: eligibilityResult.errors,
      });
    });

    res.status(200).json(eligiblePolicies);
  } catch (error) {
    console.error("Error fetching eligible policies:", error);
    res.status(500).json({ message: "Failed to fetch eligible policies" });
  }
};

module.exports = {
  getAllPolicies,
  getActivePolicies,
  getPolicyById,
  getPolicyByCode,
  createPolicy,
  updatePolicy,
  deletePolicy,
  checkEligibility,
  getEligiblePolicies,
};
