const Notification = require("../models/notificationModel");

exports.getMyNotifications = (req, res) => {
  try {
    const data = Notification.findByUserId(req.user.id);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.markRead = (req, res) => {
  try {
    const updated = Notification.markAsRead(req.params.id);
    if (updated) res.json(updated);
    else res.status(404).json({ message: "Notification not found" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createInternal = (userId, title, message, type = "info") => {
  return Notification.create({ userId, title, message, type });
};
