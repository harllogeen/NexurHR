const express = require("express");
const router = express.Router();
const projectController = require("../controllers/projectController");
const { verifyToken, checkRole } = require("../middleware/authMiddleware");

// All project routes require authentication
router.use(verifyToken);

router.get("/", projectController.getProjects);
router.post("/", checkRole(["hr", "manager", "cto"]), projectController.createProject);
router.put("/:id", checkRole(["hr", "manager", "cto"]), projectController.updateProject);
router.delete("/:id", checkRole(["hr", "manager", "cto"]), projectController.deleteProject);

module.exports = router;
