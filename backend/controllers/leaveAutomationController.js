const {
  processDailyAccruals,
  processYearEndCarryOver,
  checkStaleLeaves,
  sendPendingApprovalReminders,
  checkLowBalances,
  notifyUpcomingLeaves
} = require('../utils/leaveAutomation');

/**
 * Manual trigger for daily accrual processing
 */
const triggerDailyAccruals = async (req, res) => {
  try {
    console.log(`[Manual Trigger] Daily accruals triggered by user ${req.user.id}`);
    const result = await processDailyAccruals();
    
    res.json({
      success: true,
      message: 'Daily accrual processing completed',
      result
    });
  } catch (error) {
    console.error('[Automation Error] Daily accruals failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process daily accruals',
      error: error.message
    });
  }
};

/**
 * Manual trigger for year-end carry over
 */
const triggerYearEndCarryOver = async (req, res) => {
  try {
    console.log(`[Manual Trigger] Year-end carry over triggered by user ${req.user.id}`);
    const result = await processYearEndCarryOver();
    
    res.json({
      success: true,
      message: 'Year-end carry over processing completed',
      result
    });
  } catch (error) {
    console.error('[Automation Error] Year-end carry over failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process year-end carry over',
      error: error.message
    });
  }
};

/**
 * Manual trigger for stale leave cleanup
 */
const triggerStaleLeaveCleanup = async (req, res) => {
  try {
    console.log(`[Manual Trigger] Stale leave cleanup triggered by user ${req.user.id}`);
    const result = await checkStaleLeaves();
    
    res.json({
      success: true,
      message: 'Stale leave cleanup completed',
      result
    });
  } catch (error) {
    console.error('[Automation Error] Stale leave cleanup failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clean up stale leaves',
      error: error.message
    });
  }
};

/**
 * Manual trigger for pending approval reminders
 */
const triggerApprovalReminders = async (req, res) => {
  try {
    console.log(`[Manual Trigger] Approval reminders triggered by user ${req.user.id}`);
    const result = await sendPendingApprovalReminders();
    
    res.json({
      success: true,
      message: 'Approval reminders sent',
      result
    });
  } catch (error) {
    console.error('[Automation Error] Approval reminders failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send approval reminders',
      error: error.message
    });
  }
};

/**
 * Manual trigger for low balance notifications
 */
const triggerLowBalanceCheck = async (req, res) => {
  try {
    console.log(`[Manual Trigger] Low balance check triggered by user ${req.user.id}`);
    const result = await checkLowBalances();
    
    res.json({
      success: true,
      message: 'Low balance notifications sent',
      result
    });
  } catch (error) {
    console.error('[Automation Error] Low balance check failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check low balances',
      error: error.message
    });
  }
};

/**
 * Manual trigger for upcoming leave notifications
 */
const triggerUpcomingLeaveNotifications = async (req, res) => {
  try {
    console.log(`[Manual Trigger] Upcoming leave notifications triggered by user ${req.user.id}`);
    const result = await notifyUpcomingLeaves();
    
    res.json({
      success: true,
      message: 'Upcoming leave notifications sent',
      result
    });
  } catch (error) {
    console.error('[Automation Error] Upcoming leave notifications failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send upcoming leave notifications',
      error: error.message
    });
  }
};

/**
 * Run all automation tasks (for testing or manual full run)
 */
const triggerAllAutomation = async (req, res) => {
  try {
    console.log(`[Manual Trigger] Full automation suite triggered by user ${req.user.id}`);
    
    const results = {
      accruals: await processDailyAccruals(),
      staleCleanup: await checkStaleLeaves(),
      reminders: await sendPendingApprovalReminders(),
      lowBalance: await checkLowBalances(),
      upcomingLeaves: await notifyUpcomingLeaves()
    };
    
    res.json({
      success: true,
      message: 'All automation tasks completed',
      results
    });
  } catch (error) {
    console.error('[Automation Error] Full automation failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to run all automation tasks',
      error: error.message
    });
  }
};

/**
 * Get automation status and last run times
 */
const getAutomationStatus = async (req, res) => {
  try {
    // This would typically pull from a database table tracking automation runs
    // For now, return a simple status
    res.json({
      success: true,
      automationTasks: [
        {
          name: 'Daily Accruals',
          schedule: 'Daily at 00:00',
          enabled: true,
          lastRun: null // Would be tracked in database
        },
        {
          name: 'Stale Leave Cleanup',
          schedule: 'Daily at 06:00',
          enabled: true,
          lastRun: null
        },
        {
          name: 'Pending Approval Reminders',
          schedule: 'Daily at 09:00',
          enabled: true,
          lastRun: null
        },
        {
          name: 'Low Balance Check',
          schedule: 'Daily at 09:00',
          enabled: true,
          lastRun: null
        },
        {
          name: 'Upcoming Leave Notifications',
          schedule: 'Daily at 09:00',
          enabled: true,
          lastRun: null
        },
        {
          name: 'Year-End Carry Over',
          schedule: 'Annually on Jan 1st at 00:00',
          enabled: true,
          lastRun: null
        }
      ]
    });
  } catch (error) {
    console.error('[Automation Error] Status check failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get automation status',
      error: error.message
    });
  }
};

module.exports = {
  triggerDailyAccruals,
  triggerYearEndCarryOver,
  triggerStaleLeaveCleanup,
  triggerApprovalReminders,
  triggerLowBalanceCheck,
  triggerUpcomingLeaveNotifications,
  triggerAllAutomation,
  getAutomationStatus
};
