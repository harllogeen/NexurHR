const fs = require("fs");
const path = require("path");
const dataPath = path.join(__dirname, "../data/approvalWorkflows.json");

/**
 * Approval Workflow Model
 * Manages configurable multi-level approval chains for leave requests
 */

const ApprovalWorkflow = {
  getAll: () => {
    if (!fs.existsSync(dataPath)) {
      // Initialize with default workflows
      const defaultWorkflows = [
        {
          id: 1,
          name: "Standard Leave Approval",
          description: "Default workflow: Employee → Manager → HR",
          isDefault: true,
          leavePolicyCodes: [], // Empty means applies to all leave types
          conditions: {
            maxDays: null, // null means no limit
            minDays: null,
            departments: [],
            roles: [],
            grades: [],
          },
          steps: [
            {
              order: 1,
              approverRole: "manager",
              approverType: "line_manager", // line_manager, specific_role, specific_user, department_head
              specificUserId: null,
              canDelegate: true,
              required: true,
              autoApproveIfNoApprover: false,
            },
            {
              order: 2,
              approverRole: "hr",
              approverType: "specific_role",
              specificUserId: null,
              canDelegate: false,
              required: true,
              autoApproveIfNoApprover: false,
            },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isActive: true,
        },
        {
          id: 2,
          name: "Quick Approval - Casual Leave",
          description: "Single level approval for short casual leave",
          isDefault: false,
          leavePolicyCodes: ["casual"],
          conditions: {
            maxDays: 2,
            minDays: null,
            departments: [],
            roles: [],
            grades: [],
          },
          steps: [
            {
              order: 1,
              approverRole: "manager",
              approverType: "line_manager",
              specificUserId: null,
              canDelegate: true,
              required: true,
              autoApproveIfNoApprover: false,
            },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isActive: true,
        },
        {
          id: 3,
          name: "Extended Leave Approval",
          description: "Multi-level approval for long leaves: Manager → Dept Head → HR → Director",
          isDefault: false,
          leavePolicyCodes: ["annual", "unpaid"],
          conditions: {
            maxDays: null,
            minDays: 10, // Only for leaves >= 10 days
            departments: [],
            roles: [],
            grades: [],
          },
          steps: [
            {
              order: 1,
              approverRole: "manager",
              approverType: "line_manager",
              specificUserId: null,
              canDelegate: true,
              required: true,
              autoApproveIfNoApprover: false,
            },
            {
              order: 2,
              approverRole: "manager",
              approverType: "department_head",
              specificUserId: null,
              canDelegate: true,
              required: true,
              autoApproveIfNoApprover: false,
            },
            {
              order: 3,
              approverRole: "hr",
              approverType: "specific_role",
              specificUserId: null,
              canDelegate: false,
              required: true,
              autoApproveIfNoApprover: false,
            },
            {
              order: 4,
              approverRole: "cto",
              approverType: "specific_role",
              specificUserId: null,
              canDelegate: false,
              required: true,
              autoApproveIfNoApprover: false,
            },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isActive: true,
        },
        {
          id: 4,
          name: "Maternity/Paternity Leave Approval",
          description: "Specialized workflow for parental leave",
          isDefault: false,
          leavePolicyCodes: ["maternity", "paternity"],
          conditions: {
            maxDays: null,
            minDays: null,
            departments: [],
            roles: [],
            grades: [],
          },
          steps: [
            {
              order: 1,
              approverRole: "manager",
              approverType: "line_manager",
              specificUserId: null,
              canDelegate: true,
              required: true,
              autoApproveIfNoApprover: false,
            },
            {
              order: 2,
              approverRole: "hr",
              approverType: "specific_role",
              specificUserId: null,
              canDelegate: false,
              required: true,
              autoApproveIfNoApprover: false,
            },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isActive: true,
        },
      ];
      fs.writeFileSync(dataPath, JSON.stringify(defaultWorkflows, null, 2));
      return defaultWorkflows;
    }
    return JSON.parse(fs.readFileSync(dataPath, "utf8"));
  },

  saveAll: (workflows) => {
    const dir = path.dirname(dataPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(dataPath, JSON.stringify(workflows, null, 2));
  },

  findById: (id) => {
    const workflows = ApprovalWorkflow.getAll();
    const workflow = workflows.find((w) => w.id == id);
    
    // Normalize workflow to have consistent property names
    if (workflow) {
      workflow.name = workflow.name || workflow.workflowName;
      workflow.steps = (workflow.steps || workflow.stages || []).map(step => ({
        ...step,
        order: step.order || step.stage,
        approverType: step.approverType || (step.approverLevel === 'immediate' ? 'line_manager' : 'specific_role'),
        required: step.required !== undefined ? step.required : step.isRequired,
        autoApproveIfNoApprover: step.autoApproveIfNoApprover || false,
        canDelegate: step.canDelegate !== undefined ? step.canDelegate : true
      }));
      workflow.leavePolicyCodes = workflow.leavePolicyCodes || workflow.conditions?.leaveTypes || [];
    }
    
    return workflow;
  },

  getDefault: () => {
    const workflows = ApprovalWorkflow.getAll();
    const workflow = workflows.find((w) => w.isDefault);
    
    // Normalize workflow
    if (workflow) {
      workflow.name = workflow.name || workflow.workflowName;
      workflow.steps = (workflow.steps || workflow.stages || []).map(step => ({
        ...step,
        order: step.order || step.stage,
        approverType: step.approverType || (step.approverLevel === 'immediate' ? 'line_manager' : 'specific_role'),
        required: step.required !== undefined ? step.required : step.isRequired,
        autoApproveIfNoApprover: step.autoApproveIfNoApprover || false,
        canDelegate: step.canDelegate !== undefined ? step.canDelegate : true
      }));
      workflow.leavePolicyCodes = workflow.leavePolicyCodes || workflow.conditions?.leaveTypes || [];
    }
    
    return workflow;
  },

  getActive: () => {
    const workflows = ApprovalWorkflow.getAll();
    return workflows.filter((w) => w.isActive);
  },

  findMatchingWorkflow: (leaveRequest, employee) => {
    const workflows = ApprovalWorkflow.getActive();

    // Score each workflow based on how well it matches the request
    const scoredWorkflows = workflows.map((workflow) => {
      let score = 0;

      // Check leave policy code match (highest priority)
      // Handle both old (leavePolicyCodes) and new (conditions.leaveTypes) format
      const leavePolicyCodes = workflow.leavePolicyCodes || workflow.conditions?.leaveTypes || [];
      
      if (leavePolicyCodes.length > 0) {
        if (leavePolicyCodes.includes(leaveRequest.leaveType.toLowerCase())) {
          score += 100;
        } else {
          return null; // Doesn't match, skip this workflow
        }
      } else {
        score += 10; // Generic workflow
      }

      // Check conditions
      const conditions = workflow.conditions || {};

      // Days range check
      if (conditions.maxDays !== null && conditions.maxDays !== undefined && leaveRequest.days > conditions.maxDays) {
        return null; // Doesn't match
      }
      if (conditions.minDays !== null && conditions.minDays !== undefined && leaveRequest.days < conditions.minDays) {
        return null; // Doesn't match
      }
      if (conditions.maxDays !== null && conditions.maxDays !== undefined) score += 20;
      if (conditions.minDays !== null && conditions.minDays !== undefined) score += 20;

      // Department match
      const departments = conditions.departments || [];
      if (departments.length > 0) {
        if (departments.includes(employee.department)) {
          score += 30;
        } else {
          return null; // Doesn't match
        }
      }

      // Role match
      const roles = conditions.roles || [];
      if (roles.length > 0) {
        if (roles.includes(employee.role)) {
          score += 30;
        } else {
          return null; // Doesn't match
        }
      }

      // Grade match
      const grades = conditions.grades || [];
      if (grades.length > 0) {
        if (grades.includes(employee.grade)) {
          score += 30;
        } else {
          return null; // Doesn't match
        }
      }

      return { workflow, score };
    });

    // Filter out non-matches and sort by score (descending)
    const validWorkflows = scoredWorkflows.filter((sw) => sw !== null).sort((a, b) => b.score - a.score);

    // Return the best matching workflow, or default if none match
    let matchedWorkflow = validWorkflows.length > 0 ? validWorkflows[0].workflow : ApprovalWorkflow.getDefault();
    
    // Normalize workflow properties
    if (matchedWorkflow) {
      matchedWorkflow.name = matchedWorkflow.name || matchedWorkflow.workflowName;
      matchedWorkflow.steps = (matchedWorkflow.steps || matchedWorkflow.stages || []).map(step => ({
        ...step,
        order: step.order || step.stage,
        approverType: step.approverType || (step.approverLevel === 'immediate' ? 'line_manager' : 'specific_role'),
        required: step.required !== undefined ? step.required : step.isRequired,
        autoApproveIfNoApprover: step.autoApproveIfNoApprover || false,
        canDelegate: step.canDelegate !== undefined ? step.canDelegate : true
      }));
      matchedWorkflow.leavePolicyCodes = matchedWorkflow.leavePolicyCodes || matchedWorkflow.conditions?.leaveTypes || [];
    }
    
    return matchedWorkflow;
  },

  create: (workflowData) => {
    const workflows = ApprovalWorkflow.getAll();
    const newWorkflow = {
      id: Math.max(0, ...workflows.map((w) => w.id)) + 1,
      ...workflowData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    workflows.push(newWorkflow);
    ApprovalWorkflow.saveAll(workflows);
    return newWorkflow;
  },

  update: (id, updates) => {
    const workflows = ApprovalWorkflow.getAll();
    const index = workflows.findIndex((w) => w.id == id);
    if (index === -1) return null;

    workflows[index] = {
      ...workflows[index],
      ...updates,
      id: workflows[index].id,
      updatedAt: new Date().toISOString(),
    };
    ApprovalWorkflow.saveAll(workflows);
    return workflows[index];
  },

  delete: (id) => {
    const workflows = ApprovalWorkflow.getAll();
    const workflow = workflows.find((w) => w.id == id);

    // Prevent deletion of default workflow if it's the only one
    if (workflow && workflow.isDefault && workflows.length === 1) {
      return false;
    }

    const index = workflows.findIndex((w) => w.id == id);
    if (index === -1) return false;

    workflows.splice(index, 1);
    ApprovalWorkflow.saveAll(workflows);
    return true;
  },

  getNextApprover: (workflowId, currentStep) => {
    const workflow = ApprovalWorkflow.findById(workflowId);
    if (!workflow) return null;

    const nextStepOrder = currentStep + 1;
    const nextStep = workflow.steps.find((s) => s.order === nextStepOrder);

    return nextStep || null; // Returns null if no more steps
  },

  isWorkflowComplete: (workflowId, currentStep) => {
    const workflow = ApprovalWorkflow.findById(workflowId);
    if (!workflow) return true;

    const maxStep = Math.max(...workflow.steps.map((s) => s.order));
    return currentStep >= maxStep;
  },
};

module.exports = ApprovalWorkflow;
