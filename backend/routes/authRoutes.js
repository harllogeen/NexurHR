const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

const { verifyToken, isAdmin } = require("../middleware/authMiddleware");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/refresh-token", authController.refreshToken);
router.post("/logout", verifyToken, authController.logout);
router.post("/change-password", verifyToken, authController.changePassword);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.post("/2fa/setup", verifyToken, authController.setup2FA);
router.post("/2fa/verify", verifyToken, authController.verify2FA);
router.get("/sessions", verifyToken, authController.getSessions);
router.post("/sessions/:sessionId/revoke", verifyToken, authController.revokeSessionById);
router.get("/audit-logs", [verifyToken, isAdmin], authController.getAuditLogs);

module.exports = router;
