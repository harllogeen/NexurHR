const fs = require("fs");
const path = require("path");
const dataPath = path.join(__dirname, "../data/leaveAdjustments.json");

/**
 * Leave Adjustment Model
 * Audit trail for manual leave balance adjustments
 */

const LeaveAdjustment = {
  getAll: () => {
    if (!fs.existsSync(dataPath)) {
      fs.writeFileSync(dataPath, JSON.stringify([]));
    }
    return JSON.parse(fs.readFileSync(dataPath, "utf8"));
  },

  saveAll: (adjustments) => {
    const dir = path.dirname(dataPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(dataPath, JSON.stringify(adjustments, null, 2));
  },

  create: (adjustmentData) => {
    const adjustments = LeaveAdjustment.getAll();
    const newAdjustment = {
      id: Math.max(0, ...adjustments.map((a) => a.id || 0)) + 1,
      ...adjustmentData,
      createdAt: new Date().toISOString(),
    };
    adjustments.push(newAdjustment);
    LeaveAdjustment.saveAll(adjustments);
    return newAdjustment;
  },

  getByUserId: (userId) => {
    const adjustments = LeaveAdjustment.getAll();
    return adjustments.filter((a) => a.userId == userId).sort((a, b) => new Date(b.adjustedAt) - new Date(a.adjustedAt));
  },

  getByDateRange: (startDate, endDate) => {
    const adjustments = LeaveAdjustment.getAll();
    return adjustments.filter((a) => {
      const adjustedDate = new Date(a.adjustedAt);
      return adjustedDate >= new Date(startDate) && adjustedDate <= new Date(endDate);
    });
  },

  getByAdjuster: (adjustedBy) => {
    const adjustments = LeaveAdjustment.getAll();
    return adjustments.filter((a) => a.adjustedBy == adjustedBy);
  },
};

module.exports = LeaveAdjustment;
