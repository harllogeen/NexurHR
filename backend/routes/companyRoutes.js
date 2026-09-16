const express = require("express");
const router = express.Router();
const companyController = require("../controllers/companyController");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");

router.get("/", verifyToken, companyController.getCompany);
router.put("/", verifyToken, isAdmin, companyController.updateCompany);

module.exports = router;
