const Task = require("../models/taskModel");
const Notification = require("../models/notificationModel");
const { getUsers } = require("../models/userModel");
const { getEmployees } = require("../models/employeeModel");

// Create and assign a task
exports.createTask = (req, res) => {
  try {
    const users = getUsers();
    const employees = getEmployees();
    
    // req.body.assignedTo is an array of employee.ids from the frontend dropdown
    let assigneeIds = Array.isArray(req.body.assignedTo) ? req.body.assignedTo : [req.body.assignedTo];
    if (assigneeIds.length === 0) {
       return res.status(400).json({ message: "At least one assignee is required" });
    }

    const assignedUserIds = [];
    const assignedUserNames = [];
    const assignerUser = users.find((u) => String(u.id) === String(req.user.id));
    const assignerEmployee = employees.find(e => String(e.id) === String(assignerUser?.employeeId) || e.email === assignerUser?.email);
    const assignerTitle = (assignerEmployee?.designation || assignerEmployee?.role || '').toLowerCase();

    for (const empId of assigneeIds) {
      const assigneeEmployee = employees.find(e => String(e.id) === String(empId));
      const assigneeUser = users.find((u) => String(u.employeeId) === String(empId) || u.email === assigneeEmployee?.email);
      
      if (!assigneeUser) {
        return res.status(404).json({ message: `Assigned employee ${empId} does not have a user account` });
      }

      // Role-based department validation
      if (req.user.role === 'supervisor') {
        if (assignerEmployee && assigneeEmployee) {
          const assigneeTitle = (assigneeEmployee.designation || assigneeEmployee.role || '').toLowerCase();
          
          if (assignerTitle.match(/\bcto\b/) || assignerTitle.includes('chief technology officer')) {
             if (assigneeEmployee.role === 'manager' || assigneeTitle.includes('manager')) {
                 return res.status(403).json({ message: "CTOs cannot assign tasks to managers." });
             }
          } else {
            let assignerSubTeam = '';
            if (assignerTitle.includes('frontend')) assignerSubTeam = 'frontend';
            else if (assignerTitle.includes('backend')) assignerSubTeam = 'backend';
            
            let assigneeSubTeam = '';
            if (assigneeTitle.includes('frontend')) assigneeSubTeam = 'frontend';
            else if (assigneeTitle.includes('backend')) assigneeSubTeam = 'backend';
            else if (assigneeTitle.includes('full stack') || assigneeTitle.includes('fullstack')) assigneeSubTeam = 'fullstack';

            if (assignerSubTeam) {
              if (assigneeSubTeam !== 'fullstack' && assignerSubTeam !== assigneeSubTeam) {
                return res.status(403).json({ message: `Supervisors in the ${assignerSubTeam} team can only assign tasks to their own team members or Full Stack developers.` });
              }
            } else if (assignerEmployee.department !== assigneeEmployee.department) {
               return res.status(403).json({ message: "Supervisors can only assign tasks to employees in their own department" });
            }
          }
        }
      }

      // CTO cannot assign tasks to managers
      if (req.user.role === 'cto') {
        if (assigneeEmployee) {
          const assigneeRole = (assigneeEmployee.role || '').toLowerCase();
          const assigneeDesignation = (assigneeEmployee.designation || '').toLowerCase();
          if (assigneeRole === 'manager' || assigneeDesignation.includes('manager')) {
            return res.status(403).json({ message: "CTOs cannot assign tasks to managers." });
          }
        }
      }
      
      assignedUserIds.push(assigneeUser.id);
      assignedUserNames.push(assigneeEmployee ? `${assigneeEmployee.firstName} ${assigneeEmployee.lastName}` : (assigneeUser.username || "Unknown"));
    }

    const task = Task.create({
      title: req.body.title,
      description: req.body.description || "",
      assignedTo: assignedUserIds,
      assignedToName: assignedUserNames.join(", "),
      assignedBy: req.user.id,
      assignedByName: assignerEmployee ? `${assignerEmployee.firstName} ${assignerEmployee.lastName}` : (assignerUser?.username || "Unknown"),
      department: req.body.department || "",
      projectId: req.body.projectId || null,
      projectName: req.body.projectName || "",
      priority: req.body.priority || "medium",
      category: req.body.category || "General",
      dueDate: req.body.dueDate || null,
      subtasks: (req.body.subtasks || []).map((st, i) => ({
        id: `sub-${Date.now()}-${i}`,
        title: st.title || st,
        completed: false,
      })),
    });

    // Notify all assigned employees in a single batch to prevent JSON race conditions
    const newNotifications = assignedUserIds.map((uid) => ({
      userId: uid,
      title: "New Task Assigned",
      message: `You have been assigned a new task: "${task.title}" by ${task.assignedByName}`,
      type: "info",
    }));
    Notification.createMany(newNotifications);

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get tasks assigned TO the logged-in user (employee view)
exports.getMyTasks = (req, res) => {
  try {
    const tasks = Task.findByAssignedTo(req.user.id);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get tasks assigned BY the logged-in user (supervisor view)
exports.getAssignedTasks = (req, res) => {
  try {
    const tasks = Task.findByAssignedBy(req.user.id);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get ALL tasks (HR view)
exports.getAllTasks = (req, res) => {
  try {
    const tasks = Task.getAll();
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single task by ID
exports.getTaskById = (req, res) => {
  try {
    const task = Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update task (general - title, description, priority, dueDate, category, reassign)
exports.updateTask = (req, res) => {
  try {
    const task = Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const updates = {};
    const allowedFields = [
      "title",
      "description",
      "priority",
      "dueDate",
      "category",
      "department",
    ];
    allowedFields.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    // Handle reassignment
    if (req.body.assignedTo) {
      const users = getUsers();
      const employees = getEmployees();
      let newAssigneeIds = Array.isArray(req.body.assignedTo) ? req.body.assignedTo : [req.body.assignedTo];
      
      const assignerUser = users.find((u) => String(u.id) === String(req.user.id));
      const assignerEmployee = employees.find(e => String(e.id) === String(assignerUser?.employeeId) || e.email === assignerUser?.email);
      const assignerTitle = (assignerEmployee?.designation || assignerEmployee?.role || '').toLowerCase();

      const assignedUserIds = [];
      const assignedUserNames = [];

      for (const empId of newAssigneeIds) {
        const assigneeEmployee = employees.find(e => String(e.id) === String(empId));
        const assigneeUser = users.find((u) => String(u.employeeId) === String(empId) || u.email === assigneeEmployee?.email);
        
        if (!assigneeUser) continue;

        // Role-based validation
        if (req.user.role === 'supervisor') {
          if (assignerEmployee && assigneeEmployee) {
            const assigneeTitle = (assigneeEmployee.designation || assigneeEmployee.role || '').toLowerCase();
            
            if (assignerTitle.match(/\bcto\b/) || assignerTitle.includes('chief technology officer')) {
               if (assigneeEmployee.role === 'manager' || assigneeTitle.includes('manager')) {
                   return res.status(403).json({ message: "CTOs cannot assign tasks to managers." });
               }
            } else {
              let assignerSubTeam = '';
              if (assignerTitle.includes('frontend')) assignerSubTeam = 'frontend';
              else if (assignerTitle.includes('backend')) assignerSubTeam = 'backend';
              
              let assigneeSubTeam = '';
              if (assigneeTitle.includes('frontend')) assigneeSubTeam = 'frontend';
              else if (assigneeTitle.includes('backend')) assigneeSubTeam = 'backend';
              else if (assigneeTitle.includes('full stack') || assigneeTitle.includes('fullstack')) assigneeSubTeam = 'fullstack';

              if (assignerSubTeam) {
                if (assigneeSubTeam !== 'fullstack' && assignerSubTeam !== assigneeSubTeam) {
                  return res.status(403).json({ message: `Supervisors in the ${assignerSubTeam} team can only assign tasks to their own team members or Full Stack developers.` });
                }
              } else if (assignerEmployee.department !== assigneeEmployee.department) {
                 return res.status(403).json({ message: "Supervisors can only assign tasks to employees in their own department" });
              }
            }
          }
        }
        
        assignedUserIds.push(assigneeUser.id);
        assignedUserNames.push(assigneeEmployee ? `${assigneeEmployee.firstName} ${assigneeEmployee.lastName}` : (assigneeUser.username || "Unknown"));
      }

      if (assignedUserIds.length > 0) {
        updates.assignedTo = assignedUserIds;
        updates.assignedToName = assignedUserNames.join(", ");

        // Notify new assignees that were not previously assigned
        const oldAssignedTo = Array.isArray(task.assignedTo) ? task.assignedTo : [task.assignedTo];
        for (const newId of assignedUserIds) {
          if (!oldAssignedTo.includes(newId)) {
            Notification.create({
              userId: newId,
              title: "Task Assigned to You",
              message: `You have been assigned task: "${task.title}"`,
              type: "info",
            });
          }
        }
      }
    }

    const updated = Task.update(req.params.id, updates);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update task progress (employee updates subtasks / progress)
exports.updateProgress = (req, res) => {
  try {
    const task = Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const updates = {};

    // Update subtasks if provided
    if (req.body.subtasks) {
      updates.subtasks = req.body.subtasks;
      // Auto-calculate progress from subtasks
      const total = updates.subtasks.length;
      const completed = updates.subtasks.filter((s) => s.completed).length;
      updates.progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    }

    // Allow manual progress override
    if (
      req.body.progress !== undefined &&
      !req.body.subtasks
    ) {
      updates.progress = Math.min(100, Math.max(0, Number(req.body.progress)));
    }

    const updated = Task.update(req.params.id, updates);

    // Notify supervisor of progress update
    if (task.assignedBy && task.assignedBy !== req.user.id) {
      Notification.create({
        userId: task.assignedBy,
        title: "Task Progress Updated",
        message: `${task.assignedToName} updated progress on "${task.title}" to ${updated.progress}%`,
        type: "info",
      });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update task status
exports.updateStatus = (req, res) => {
  try {
    const task = Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const validStatuses = [
      "pending",
      "in-progress",
      "under-review",
      "completed",
      "overdue",
      "cancelled",
    ];
    if (!validStatuses.includes(req.body.status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const updates = { status: req.body.status };
    if (req.body.status === "completed") {
      updates.completedAt = new Date().toISOString();
      updates.progress = 100;
    }

    const updated = Task.update(req.params.id, updates);

    // Notify the other party
    const notifyUserId =
      req.user.id === task.assignedBy ? task.assignedTo : task.assignedBy;
    const statusLabels = {
      pending: "set back to Pending",
      "in-progress": "started working on",
      "under-review": "submitted for review",
      completed: "marked as Completed",
      cancelled: "cancelled",
    };
    if (notifyUserId) {
      const users = getUsers();
      const actor = users.find((u) => u.id === req.user.id);
      Notification.create({
        userId: notifyUserId,
        title: "Task Status Changed",
        message: `${actor?.username || "Someone"} ${statusLabels[req.body.status] || "updated"}: "${task.title}"`,
        type:
          req.body.status === "completed"
            ? "success"
            : req.body.status === "cancelled"
              ? "warning"
              : "info",
      });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add a comment to a task
exports.addComment = (req, res) => {
  try {
    const task = Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const users = getUsers();
    const commenter = users.find((u) => u.id === req.user.id);

    const comment = {
      id: `c-${Date.now()}`,
      userId: req.user.id,
      username: commenter?.username || commenter?.name || "Unknown",
      message: req.body.message,
      createdAt: new Date().toISOString(),
    };

    const comments = Array.isArray(task.comments) ? [...task.comments] : [];
    comments.push(comment);

    const updated = Task.update(req.params.id, { comments });

    // Notify the other party
    const notifyUserId =
      req.user.id === task.assignedBy ? task.assignedTo : task.assignedBy;
    if (notifyUserId) {
      Notification.create({
        userId: notifyUserId,
        title: "New Comment on Task",
        message: `${comment.username} commented on "${task.title}": "${req.body.message.substring(0, 80)}"`,
        type: "info",
      });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a task
exports.deleteTask = (req, res) => {
  try {
    const task = Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    // Notify assignee if the deleter is not the assignee
    if (task.assignedTo && task.assignedTo !== req.user.id) {
      Notification.create({
        userId: task.assignedTo,
        title: "Task Removed",
        message: `Task "${task.title}" has been removed by ${task.assignedByName}`,
        type: "warning",
      });
    }

    Task.delete(req.params.id);
    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Cron job: check for overdue tasks
exports.checkOverdueTasks = () => {
  try {
    const tasks = Task.getAll();
    const now = new Date();
    let updated = false;

    tasks.forEach((task) => {
      if (
        task.dueDate &&
        task.status !== "completed" &&
        task.status !== "cancelled" &&
        task.status !== "overdue"
      ) {
        const dueDate = new Date(task.dueDate);
        if (now > dueDate) {
          task.status = "overdue";
          task.updatedAt = now.toISOString();
          updated = true;

          // Notify both parties
          Notification.create({
            userId: task.assignedTo,
            title: "Task Overdue",
            message: `Your task "${task.title}" is now overdue!`,
            type: "warning",
          });
          if (task.assignedBy) {
            Notification.create({
              userId: task.assignedBy,
              title: "Assigned Task Overdue",
              message: `Task "${task.title}" assigned to ${task.assignedToName} is now overdue`,
              type: "warning",
            });
          }
        }
      }
    });

    if (updated) {
      Task.saveAll(tasks);
    }
  } catch (error) {
    console.error("[Cron] Error checking overdue tasks:", error.message);
  }
};
