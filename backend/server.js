const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3000;
const path = require("path");

// Static files for uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(cors());
// Request logger BEFORE body-parser to see raw headers
app.use((req, res, next) => {
  if (req.method === "PUT" || req.method === "POST") {
    const contentLength = req.headers["content-length"];
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.url} - Content-Length: ${contentLength} (${(contentLength / 1024 / 1024).toFixed(2)} MB)`,
    );
  }
  next();
});

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

const authRoutes = require("./routes/authRoutes");
const activityRoutes = require("./routes/activityRoutes");
const performanceRoutes = require("./routes/performanceRoutes");
const companyRoutes = require("./routes/companyRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const integrationController = require("./controllers/integrationController");
const { verifyToken } = require("./middleware/authMiddleware");
const projectRoutes = require("./routes/projectRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/employees", require("./routes/employeeRoutes"));
app.use("/api/departments", require("./routes/departmentRoutes"));
app.use("/api/designations", require("./routes/designationRoutes"));
app.use("/api/recruitment", require("./routes/recruitmentRoutes"));
app.use("/api/attendance", require("./routes/attendanceRoutes"));
app.use("/api/leaves", require("./routes/leaveRoutes"));
app.use("/api/leave-policies", require("./routes/leavePolicyRoutes"));
app.use("/api/leave-balances", require("./routes/leaveBalanceRoutes"));
app.use("/api/leave-analytics", require("./routes/leaveAnalyticsRoutes"));
app.use("/api/work-calendar", require("./routes/workCalendarRoutes"));
app.use("/api/approval-workflows", require("./routes/approvalWorkflowRoutes"));
app.use("/api/payroll", require("./routes/payrollRoutes"));
app.use("/api/payroll-config", require("./routes/payrollConfigRoutes"));
app.use("/api/performance", performanceRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/tasks", require("./routes/taskRoutes"));
app.use("/api/projects", projectRoutes);
app.use("/api/shifts", require("./routes/shiftRoutes"));
app.use("/api/schedules", require("./routes/scheduleRoutes"));
app.use("/api/availability", require("./routes/availabilityRoutes"));
app.use("/api/attendance-rules", require("./routes/attendanceRuleRoutes"));
app.use("/api/settings", require("./routes/settingsRoutes"));
app.use("/api/leave-automation", require("./routes/leaveAutomationRoutes"));
console.log("Registering integration routes");
app.get("/api/debug", (req, res) => res.send("debug ok"));
app.get("/api/integrations", verifyToken, integrationController.getWebhooks);
app.get("/api/integrations/webhooks", verifyToken, integrationController.getWebhooks);
app.post("/api/integrations", verifyToken, integrationController.createWebhook);
app.post("/api/integrations/webhooks", verifyToken, integrationController.createWebhook);
app.post("/api/integrations/events", verifyToken, integrationController.dispatchIntegrationEvent);
app.post("/api/integrations/dispatch", verifyToken, integrationController.dispatchIntegrationEvent);
app.use("/api/integrations", require("./routes/integrationRoutes"));

app.get("/", (req, res) => {
  res.send("HR System Backend is running");
});

const cron = require("node-cron");
const {
  checkScheduledInterviews,
} = require("./controllers/recruitmentController");
const { checkOverdueTasks } = require("./controllers/taskController");
const { checkAndNotifyMissingAvailability } = require("./utils/availabilityReminders");

// Import leave automation utilities
const {
  processDailyAccruals,
  processYearEndCarryOver,
  checkStaleLeaves,
  sendPendingApprovalReminders,
  checkLowBalances,
  notifyUpcomingLeaves
} = require("./utils/leaveAutomation");

// ============================================
// CRON JOBS - Automated Background Tasks
// ============================================

// Every minute: Check interviews and overdue tasks
cron.schedule("* * * * *", () => {
  console.log("[Cron] Checking for completed interviews...");
  checkScheduledInterviews();
  console.log("[Cron] Checking for overdue tasks...");
  checkOverdueTasks();
});

// Daily at midnight (00:00): Process leave accruals
cron.schedule("0 0 * * *", () => {
  console.log("[Cron] Processing daily leave accruals...");
  processDailyAccruals();
});

// Daily at 6:00 AM: Check and clean stale leave requests
cron.schedule("0 6 * * *", () => {
  console.log("[Cron] Checking for stale leave requests...");
  checkStaleLeaves();
});

// Daily at 9:00 AM: Multiple checks
cron.schedule("0 9 * * *", () => {
  console.log("[Cron] Checking employees without availability...");
  checkAndNotifyMissingAvailability();
  
  console.log("[Cron] Sending pending approval reminders...");
  sendPendingApprovalReminders();
  
  console.log("[Cron] Checking for low leave balances...");
  checkLowBalances();
  
  console.log("[Cron] Notifying employees about upcoming leaves...");
  notifyUpcomingLeaves();
});

// January 1st at 00:00: Process year-end carry over
cron.schedule("0 0 1 1 *", () => {
  console.log("[Cron] Processing year-end leave carry over...");
  processYearEndCarryOver();
});

// Check for employees without availability (runs daily at 9 AM)
cron.schedule("0 9 * * *", () => {
  console.log("[Cron] Checking employees without availability...");
  checkAndNotifyMissingAvailability();
});

// Enhanced error handler to catch body-parser limits
app.use((err, req, res, next) => {
  console.error("[SERVER ERROR ALERT]:", {
    message: err.message,
    stack: err.stack,
    type: err.type,
  });

  if (err.type === "entity.too.large") {
    return res
      .status(413)
      .json({ message: "Payload too large. Please upload smaller files." });
  }

  res
    .status(500)
    .json({ message: "Internal Server Error", error: err.message });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
