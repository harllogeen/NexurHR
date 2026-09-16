const { getAllAvailability } = require('../models/availabilityModel');
const { getAllEmployees } = require('../models/employeeModel');
const { createNotification } = require('../models/notificationModel');

// Check for employees without availability set and send reminders
const checkAndNotifyMissingAvailability = () => {
  try {
    const allAvailability = getAllAvailability();
    const allEmployees = getAllEmployees();
    
    // Get list of employee IDs who have set availability
    const employeesWithAvailability = new Set(
      allAvailability.map(a => String(a.employeeId))
    );
    
    // Find employees without availability
    const employeesWithoutAvailability = allEmployees.filter(emp => 
      emp.status === 'active' && !employeesWithAvailability.has(String(emp.id))
    );
    
    // Send notification to each employee
    employeesWithoutAvailability.forEach(employee => {
      // Check if they already have a recent notification (within last 7 days)
      const recentNotificationExists = checkRecentAvailabilityNotification(employee.userId);
      
      if (!recentNotificationExists) {
        createNotification({
          userId: employee.userId,
          title: 'Set Your Weekly Availability',
          message: 'Please set your weekly availability so HR can schedule you for shifts. Go to My Schedule → Set Availability.',
          type: 'reminder',
          priority: 'medium',
          relatedId: null
        });
      }
    });
    
    return employeesWithoutAvailability.length;
  } catch (error) {
    console.error('[Availability Reminder] Error:', error);
    return 0;
  }
};

// Check if employee already has a recent availability notification
const checkRecentAvailabilityNotification = (userId) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const notificationsPath = path.join(__dirname, '../data/notifications.json');
    
    if (!fs.existsSync(notificationsPath)) {
      return false;
    }
    
    const notifications = JSON.parse(fs.readFileSync(notificationsPath, 'utf8'));
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // Check for recent availability reminder
    const recentNotification = notifications.find(n => 
      n.userId === userId && 
      n.type === 'reminder' && 
      n.title === 'Set Your Weekly Availability' &&
      new Date(n.createdAt) > sevenDaysAgo
    );
    
    return !!recentNotification;
  } catch (error) {
    console.error('Error checking recent notifications:', error);
    return false;
  }
};

module.exports = {
  checkAndNotifyMissingAvailability
};
