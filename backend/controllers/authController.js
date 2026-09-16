const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { getUsers, saveUsers } = require("../models/userModel");
const { getEmployees } = require("../models/employeeModel");
const { recordAuditLog } = require("../models/auditLogModel");
const { createSession, listSessionsForUser, revokeSession, findSessionByRefreshToken } = require("../models/sessionModel");

const SECRET_KEY = "supersecretkey";

const createToken = (user, expiresIn = 900) =>
  jwt.sign({ 
    id: user.id, 
    role: user.role,
    employeeId: user.employeeId // Include employeeId in token
  }, SECRET_KEY, { expiresIn });

const generateTOTP = (secret, time = Math.floor(Date.now() / 30000)) => {
  const counter = Buffer.alloc(8);
  counter.writeUInt32BE(0, 0);
  counter.writeUInt32BE(time, 4);
  const hmac = crypto.createHmac("sha1", secret);
  hmac.update(counter);
  const digest = hmac.digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = ((digest[offset] & 0x7f) << 24) | ((digest[offset + 1] & 0xff) << 16) | ((digest[offset + 2] & 0xff) << 8) | (digest[offset + 3] & 0xff);
  return String(binary % 1000000).padStart(6, "0");
};

const verifyTOTP = (secret, code) => {
  if (!secret || !code) return false;
  const normalizedCode = String(code).replace(/\s/g, "");
  const time = Math.floor(Date.now() / 30000);
  return [time - 1, time, time + 1].some((value) => generateTOTP(secret, value) === normalizedCode);
};

const getUserContext = (req) => ({
  id: req.userId,
  role: req.userRole || "employee",
});

const register = (req, res) => {
  const { username, password, role, email, firstName, lastName } = req.body;
  const users = getUsers();
  const identifier = username || email;

  if (!identifier || !password) {
    return res.status(400).json({ message: "Username/email and password are required" });
  }

  if (users.find((u) => u.username === identifier || u.email === identifier)) {
    return res.status(400).json({ message: "User already exists" });
  }

  const actor = getUserContext(req);
  const requestedRole = String(role || "employee").toLowerCase();
  const privilegedRoles = ["super-admin", "hr", "manager"];

  if (privilegedRoles.includes(requestedRole) && !(actor.role === "super-admin" || actor.role === "admin")) {
    return res.status(403).json({ message: "Only super administrators can create HR or manager accounts" });
  }

  const hashedPassword = bcrypt.hashSync(password, 8);
  const newUser = {
    id: Date.now(),
    username: identifier,
    email: email || identifier,
    password: hashedPassword,
    role: requestedRole === "superadmin" ? "super-admin" : requestedRole || "employee",
    firstName: firstName || "",
    lastName: lastName || "",
    createdAt: new Date().toISOString(),
    refreshToken: null,
    refreshTokenVersion: 0,
    twoFactorEnabled: false,
    twoFactorSecret: null,
    passwordResetToken: null,
    passwordResetExpiresAt: null,
  };

  users.push(newUser);
  saveUsers(users);
  recordAuditLog({ actorId: actor.id, action: "register", targetId: newUser.id, details: `Created ${newUser.role} account` });

  res.status(201).json({ message: "User registered successfully", user: { id: newUser.id, username: newUser.username, role: newUser.role } });
};

const login = (req, res) => {
  const { username, password, twoFactorCode } = req.body;
  const users = getUsers();
  const user = users.find((u) => u.username === username || u.email === username);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const passwordIsValid = bcrypt.compareSync(password, user.password);
  if (!passwordIsValid) {
    return res.status(401).json({ token: null, message: "Invalid password" });
  }

  if (user.twoFactorEnabled) {
    if (!twoFactorCode) {
      return res.status(401).json({ requires2FA: true, message: "Two-factor authentication code is required" });
    }
    if (!verifyTOTP(user.twoFactorSecret, twoFactorCode)) {
      return res.status(401).json({ message: "Invalid two-factor authentication code" });
    }
  }

  const accessToken = createToken(user, 900);
  const refreshToken = createToken(user, 604800);
  user.refreshToken = refreshToken;
  user.refreshTokenVersion = (user.refreshTokenVersion || 0) + 1;
  user.lastLoginAt = new Date().toISOString();
  saveUsers(users);

  const session = createSession({ userId: user.id, refreshToken, userAgent: req.headers["user-agent"] || "Unknown", ipAddress: req.ip || "Unknown" });
  recordAuditLog({ actorId: user.id, action: "login", targetId: user.id, details: "Signed in successfully" });

  res.status(200).json({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    accessToken,
    refreshToken,
    sessionId: session.id,
  });
};

const refreshToken = (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: "Refresh token is required" });

  const users = getUsers();
  const user = users.find((entry) => entry.refreshToken === refreshToken);
  if (!user) {
    return res.status(401).json({ message: "Invalid refresh token" });
  }

  const session = findSessionByRefreshToken(refreshToken);
  if (!session || session.revoked) {
    return res.status(401).json({ message: "Session has been revoked" });
  }

  const accessToken = createToken(user, 900);
  const nextRefreshToken = createToken(user, 604800);
  user.refreshToken = nextRefreshToken;
  user.refreshTokenVersion = (user.refreshTokenVersion || 0) + 1;
  saveUsers(users);

  const updatedSession = createSession({ userId: user.id, refreshToken: nextRefreshToken, userAgent: req.headers["user-agent"] || "Unknown", ipAddress: req.ip || "Unknown" });
  recordAuditLog({ actorId: user.id, action: "refresh-token", targetId: user.id, details: "Refresh token rotated" });

  res.status(200).json({ accessToken, refreshToken: nextRefreshToken, sessionId: updatedSession.id });
};

const logout = (req, res) => {
  const users = getUsers();
  const user = users.find((entry) => entry.id === req.userId);
  if (!user) return res.status(404).json({ message: "User not found" });

  user.refreshToken = null;
  saveUsers(users);

  const sessionId = req.body.sessionId;
  if (sessionId) {
    revokeSession(sessionId);
  }
  recordAuditLog({ actorId: req.userId, action: "logout", targetId: req.userId, details: "Signed out" });
  res.status(200).json({ message: "Logged out successfully" });
};

const changePassword = (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const users = getUsers();
  const user = users.find((u) => u.id == req.userId);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const passwordIsValid = bcrypt.compareSync(currentPassword, user.password);
  if (!passwordIsValid) {
    return res.status(401).json({ message: "Invalid current password" });
  }

  const hashedPassword = bcrypt.hashSync(newPassword, 8);
  const index = users.findIndex((u) => u.id == user.id);
  users[index].password = hashedPassword;
  saveUsers(users);
  recordAuditLog({ actorId: req.userId, action: "change-password", targetId: user.id, details: "Password changed" });

  res.status(200).json({ message: "Password changed successfully" });
};

const forgotPassword = (req, res) => {
  const { email } = req.body;
  const users = getUsers();
  const user = users.find((entry) => entry.email === email || entry.username === email);

  if (!user) return res.status(404).json({ message: "User not found" });

  const resetToken = crypto.randomBytes(20).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString();
  user.passwordResetToken = resetToken;
  user.passwordResetExpiresAt = expiresAt;
  saveUsers(users);

  res.status(200).json({ message: "Password reset token generated", resetToken });
};

const resetPassword = (req, res) => {
  const { resetToken, newPassword } = req.body;
  const users = getUsers();
  const user = users.find((entry) => entry.passwordResetToken === resetToken);

  if (!user) return res.status(404).json({ message: "Invalid reset token" });
  if (new Date(user.passwordResetExpiresAt) < new Date()) return res.status(400).json({ message: "Reset token has expired" });

  user.password = bcrypt.hashSync(newPassword, 8);
  user.passwordResetToken = null;
  user.passwordResetExpiresAt = null;
  saveUsers(users);
  recordAuditLog({ actorId: user.id, action: "reset-password", targetId: user.id, details: "Password reset via token" });

  res.status(200).json({ message: "Password reset successfully" });
};

const setup2FA = (req, res) => {
  const users = getUsers();
  const user = users.find((entry) => entry.id === req.userId);
  if (!user) return res.status(404).json({ message: "User not found" });

  const secret = crypto.randomBytes(20).toString("hex");
  user.twoFactorSecret = secret;
  user.twoFactorEnabled = true;
  saveUsers(users);
  res.status(200).json({ message: "Two-factor authentication enabled", secret, backupCode: "123456" });
};

const verify2FA = (req, res) => {
  const { code } = req.body;
  const users = getUsers();
  const user = users.find((entry) => entry.id === req.userId);
  if (!user || !user.twoFactorSecret) return res.status(400).json({ message: "Two-factor authentication is not configured" });

  if (!verifyTOTP(user.twoFactorSecret, code)) {
    return res.status(401).json({ message: "Invalid two-factor authentication code" });
  }

  user.twoFactorEnabled = true;
  saveUsers(users);
  res.status(200).json({ message: "Two-factor authentication verified" });
};

const getSessions = (req, res) => {
  const sessions = listSessionsForUser(req.userId);
  res.status(200).json(sessions);
};

const revokeSessionById = (req, res) => {
  const updated = revokeSession(req.params.sessionId);
  if (!updated) return res.status(404).json({ message: "Session not found" });
  res.status(200).json({ message: "Session revoked", session: updated });
};

const getAuditLogs = (req, res) => {
  const { getAuditLogs: getAuditLogsModel } = require("../models/auditLogModel");
  const logs = getAuditLogsModel();
  res.status(200).json(logs);
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  changePassword,
  forgotPassword,
  resetPassword,
  setup2FA,
  verify2FA,
  getSessions,
  revokeSessionById,
  getAuditLogs,
};
