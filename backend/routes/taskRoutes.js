const express = require("express");
const router = express.Router();
const taskController = require("../controllers/taskController");
const { verifyToken, checkRole } = require("../middleware/authMiddleware");

// Create a task (supervisor, manager, hr, cto)
router.post(
  "/",
  verifyToken,
  checkRole(["hr", "manager", "supervisor", "cto"]),
  taskController.createTask,
);

// Get tasks assigned TO me (any authenticated user)
router.get("/my", verifyToken, taskController.getMyTasks);

// Get tasks assigned BY me (supervisor, manager, hr, cto)
router.get(
  "/assigned",
  verifyToken,
  checkRole(["hr", "manager", "supervisor", "cto"]),
  taskController.getAssignedTasks,
);

// Get ALL tasks (hr, cto)
router.get(
  "/all",
  verifyToken,
  checkRole(["hr", "cto"]),
  taskController.getAllTasks,
);

// Get single task
router.get("/:id", verifyToken, taskController.getTaskById);

// Update task details (supervisor, manager, hr, cto)
router.put(
  "/:id",
  verifyToken,
  checkRole(["hr", "manager", "supervisor", "cto"]),
  taskController.updateTask,
);

// Update progress (any authenticated user - employees update their own)
router.patch("/:id/progress", verifyToken, taskController.updateProgress);

// Update status (any authenticated user)
router.patch("/:id/status", verifyToken, taskController.updateStatus);

// Add comment (any authenticated user)
router.post("/:id/comments", verifyToken, taskController.addComment);

// Delete task (supervisor, manager, hr, cto)
router.delete(
  "/:id",
  verifyToken,
  checkRole(["hr", "manager", "supervisor", "cto"]),
  taskController.deleteTask,
);

module.exports = router;
