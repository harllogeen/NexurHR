const express = require("express");
const router = express.Router();
const employeeController = require("../controllers/employeeController");
const { verifyToken } = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, `profile-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only images (jpeg, jpg, png) are allowed"));
  },
});

router.get("/", verifyToken, employeeController.getAllEmployees);
router.get("/search", verifyToken, employeeController.searchEmployees);
router.get("/org-chart", verifyToken, employeeController.getOrgChart);
router.post("/bulk-import", verifyToken, employeeController.bulkImportEmployees);
router.post("/", verifyToken, employeeController.createEmployee);
router.put("/:id", verifyToken, employeeController.updateEmployee);
router.delete("/:id", verifyToken, employeeController.deleteEmployee);

router.get("/my-profile", verifyToken, employeeController.getMyProfile);
router.patch("/my-profile", verifyToken, employeeController.updateMyProfile);
router.get("/dashboard-stats", verifyToken, employeeController.getDashboardStats);
router.patch("/upload-profile-picture", verifyToken, upload.single("image"), employeeController.uploadProfilePicture);

module.exports = router;
