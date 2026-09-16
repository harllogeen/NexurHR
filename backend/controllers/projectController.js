const Project = require("../models/projectModel");
const Notification = require("../models/notificationModel");
const { getUsers } = require("../models/userModel");
const { getEmployees } = require("../models/employeeModel");

// Get projects based on user role and permissions
exports.getProjects = (req, res) => {
  try {
    const allProjects = Project.getProjects();
    const userRole = req.user.role;
    const userId = req.user.id;
    const view = req.query.view || 'all';

    // Protect "all" view from employees
    if (view === 'all' && userRole === 'employee') {
      return res.status(403).json({ message: "Employees cannot view all projects" });
    }

    // HR and CTO can see all projects in 'all' view
    if (view === 'all' && (userRole === "hr" || userRole === "cto")) {
      return res.status(200).json(allProjects);
    }

    const users = getUsers();
    const currentUser = users.find(u => String(u.id) === String(userId));
    const myEmpId = currentUser ? currentUser.employeeId : null;

    const employees = getEmployees();
    const myEmpRecord = employees.find(
      (e) => String(e.id) === String(myEmpId) || String(e.userId) === String(userId)
    );
    const myDept = myEmpRecord ? myEmpRecord.department : "";

    // Fetch user's assigned tasks to see which projects they are involved in
    const Task = require("../models/taskModel");
    const userTasks = Task.findByAssignedTo(userId);
    const userProjectIds = userTasks.filter(t => t.projectId).map(t => String(t.projectId));

    const visibleProjects = allProjects.filter((p) => {
      let isVisible = false;
      // Creator or Manager
      if (String(p.managerId) === String(userId)) isVisible = true;
      if (String(p.createdBy) === String(userId)) isVisible = true;
      // Member
      if (p.members && (p.members.includes(String(userId)) || (myEmpId && p.members.includes(String(myEmpId))))) isVisible = true;
      
      // Has assigned tasks in this project
      if (userProjectIds.includes(String(p.id))) isVisible = true;

      // Department level visibility for managers/supervisors in 'all' view
      if (view === 'all' && !isVisible && (userRole === "manager" || userRole === "supervisor")) {
        // We let them see all projects in their department, or maybe all projects globally?
        // Requirements say "can see all the entire project", let's let manager/supervisor see all projects if they click 'All Projects'
        // But to be safe, I will stick to department or let them see all? I'll let them see ALL projects in the company.
        isVisible = true; 
      }
      
      return isVisible;
    });

    const allTasks = Task.getAll();
    const enrichedProjects = visibleProjects.map((p) => {
      const projectTasks = allTasks.filter((t) => String(t.projectId) === String(p.id));
      let totalProgress = 0;
      projectTasks.forEach((t) => totalProgress += (t.progress || 0));
      const progress = projectTasks.length ? Math.round(totalProgress / projectTasks.length) : 0;
      return {
        ...p,
        taskCount: projectTasks.length,
        progress: progress
      };
    });

    res.status(200).json(enrichedProjects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new project
exports.createProject = (req, res) => {
  try {
    const { name, description, status, startDate, endDate, department, members } = req.body;
    
    // Validate role (Only HR, CTO, Manager can create)
    const allowedRoles = ["hr", "cto", "manager"];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "You do not have permission to create projects" });
    }

    const newProject = Project.create({
      name,
      description,
      status: status || "Planning",
      startDate,
      endDate,
      department: department || [],
      managerId: req.user.id,
      createdBy: req.user.id,
      members: members || [],
    });

    // Notify members
    if (newProject.members.length > 0) {
      newProject.members.forEach((memberId) => {
        if (String(memberId) !== String(req.user.id)) {
          Notification.create({
            userId: memberId,
            title: "Added to Project",
            message: `You have been added to the project: "${newProject.name}"`,
            type: "info",
          });
        }
      });
    }

    res.status(201).json(newProject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update an existing project
exports.updateProject = (req, res) => {
  try {
    const { id } = req.params;
    const project = Project.getProjects().find((p) => p.id === id);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Only allow update if user is creator, manager, or has high privileges
    const allowedRoles = ["hr", "cto"];
    if (
      !allowedRoles.includes(req.user.role) &&
      String(project.managerId) !== String(req.user.id) &&
      String(project.createdBy) !== String(req.user.id)
    ) {
      return res.status(403).json({ message: "You do not have permission to update this project" });
    }

    const oldMembers = project.members || [];
    const updatedProject = Project.update(id, req.body);

    // Notify newly added members
    const newMembers = updatedProject.members || [];
    newMembers.forEach((memberId) => {
      if (!oldMembers.includes(memberId) && String(memberId) !== String(req.user.id)) {
        Notification.create({
          userId: memberId,
          title: "Added to Project",
          message: `You have been added to the project: "${updatedProject.name}"`,
          type: "info",
        });
      }
    });

    res.status(200).json(updatedProject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a project
exports.deleteProject = (req, res) => {
  try {
    const { id } = req.params;
    const project = Project.getProjects().find((p) => p.id === id);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const allowedRoles = ["hr", "cto"];
    if (
      !allowedRoles.includes(req.user.role) &&
      String(project.managerId) !== String(req.user.id) &&
      String(project.createdBy) !== String(req.user.id)
    ) {
      return res.status(403).json({ message: "You do not have permission to delete this project" });
    }

    Project.delete(id);
    res.status(200).json({ message: "Project deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
