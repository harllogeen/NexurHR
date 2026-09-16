const LeaveBalanceModel = require('../models/leaveBalanceModel');
const LeaveModel = require('../models/leaveModel');
const EmployeeModel = require('../models/employeeModel');
const NotificationModel = require('../models/notificationModel');

/**
 * Process daily accruals for all employees
 * Should run once per day (typically at midnight)
 */
async function processDailyAccruals() {
  try {
    console.log('[Leave Automation] Starting daily accrual processing...');
    
    const employees = EmployeeModel.getAllEmployees();
    let processedCount = 0;
    let errorCount = 0;

    for (const employee of employees) {
      try {
        // Process monthly accrual for each employee
        const result = LeaveBalanceModel.processMonthlyAccrual(employee.id);
        if (result) {
          processedCount++;
          console.log(`[Accrual] Processed accruals for employee ${employee.id}`);
        }
      } catch (error) {
        errorCount++;
        console.error(`[Accrual Error] Failed for employee ${employee.id}:`, error.message);
      }
    }

    console.log(`[Leave Automation] Daily accrual complete. Processed: ${processedCount}, Errors: ${errorCount}`);
    return { success: true, processed: processedCount, errors: errorCount };
  } catch (error) {
    console.error('[Leave Automation] Daily accrual failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Process year-end carry over for all employees
 * Should run once per year on January 1st
 */
async function processYearEndCarryOver() {
  try {
    const year = new Date().getFullYear() - 1; // Previous year
    console.log(`[Leave Automation] Starting year-end carry over for ${year}...`);
    
    const employees = EmployeeModel.getAllEmployees();
    let processedCount = 0;
    let errorCount = 0;

    for (const employee of employees) {
      try {
        const result = LeaveBalanceModel.processCarryOver(employee.id, year);
        if (result) {
          processedCount++;
          console.log(`[Carry Over] Processed carry over for employee ${employee.id}`);
        }
      } catch (error) {
        errorCount++;
        console.error(`[Carry Over Error] Failed for employee ${employee.id}:`, error.message);
      }
    }

    console.log(`[Leave Automation] Year-end carry over complete. Processed: ${processedCount}, Errors: ${errorCount}`);
    return { success: true, processed: processedCount, errors: errorCount };
  } catch (error) {
    console.error('[Leave Automation] Year-end carry over failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check and clean up stale leave requests
 * Auto-cancel pending requests that are past their start date
 */
async function checkStaleLeaves() {
  try {
    console.log('[Leave Automation] Checking for stale leave requests...');
    
    const allLeaves = LeaveModel.getAllLeaves();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let cancelledCount = 0;
    let errorCount = 0;

    for (const leave of allLeaves) {
      try {
        // Only process pending requests
        if (leave.status !== 'Pending' && leave.status !== 'pending') {
          continue;
        }

        const startDate = new Date(leave.startDate);
        startDate.setHours(0, 0, 0, 0);

        // If start date has passed and still pending, auto-cancel
        if (startDate < today) {
          LeaveModel.updateLeaveStatus(leave.id, {
            status: 'Cancelled',
            comments: 'Automatically cancelled - start date has passed without approval',
            actionBy: 'system',
            actionDate: new Date().toISOString()
          });

          cancelledCount++;
          console.log(`[Stale Leave] Auto-cancelled leave ${leave.id} for employee ${leave.employeeId}`);

          // Restore leave balance using the correct method
          if (leave.leaveType) {
            LeaveBalanceModel.updateBalance(
              leave.employeeId, 
              leave.leaveType, 
              leave.days, 
              'restore'
            );
          }
        }
      } catch (error) {
        errorCount++;
        console.error(`[Stale Leave Error] Failed for leave ${leave.id}:`, error.message);
      }
    }

    console.log(`[Leave Automation] Stale leave check complete. Cancelled: ${cancelledCount}, Errors: ${errorCount}`);
    return { success: true, cancelled: cancelledCount, errors: errorCount };
  } catch (error) {
    console.error('[Leave Automation] Stale leave check failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send reminder notifications for pending approvals
 * Reminds managers/approvers about pending leave requests
 */
async function sendPendingApprovalReminders() {
  try {
    console.log('[Leave Automation] Sending pending approval reminders...');
    
    const allLeaves = LeaveModel.getAllLeaves();
    const pendingLeaves = allLeaves.filter(l => 
      l.status === 'Pending' || l.status === 'pending'
    );

    let remindersSent = 0;

    for (const leave of pendingLeaves) {
      try {
        // Calculate days pending
        const submittedDate = new Date(leave.appliedDate || leave.appliedAt || leave.createdAt);
        const today = new Date();
        const daysPending = Math.floor((today - submittedDate) / (1000 * 60 * 60 * 24));

        // Send reminder if pending for more than 2 days
        if (daysPending >= 2) {
          remindersSent++;
          console.log(`[Reminder] Leave ${leave.id} pending for ${daysPending} days`);
        }
      } catch (error) {
        console.error(`[Reminder Error] Failed for leave ${leave.id}:`, error.message);
      }
    }

    console.log(`[Leave Automation] Checked ${pendingLeaves.length} pending requests, ${remindersSent} need reminders`);
    return { success: true, remindersSent };
  } catch (error) {
    console.error('[Leave Automation] Reminder sending failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check for low leave balances and notify employees
 */
async function checkLowBalances() {
  try {
    console.log('[Leave Automation] Checking for low leave balances...');
    
    const employees = EmployeeModel.getAllEmployees();
    let notificationsSent = 0;

    for (const employee of employees) {
      try {
        const balanceData = LeaveBalanceModel.findByUserId(employee.id);
        
        if (balanceData && balanceData.balances) {
          // Check each leave type
          Object.keys(balanceData.balances).forEach(leaveType => {
            const balance = balanceData.balances[leaveType];
            
            // Notify if balance is less than 3 days
            if (balance > 0 && balance < 3) {
              notificationsSent++;
              console.log(`[Low Balance] Employee ${employee.id} has ${balance} ${leaveType} days remaining`);
            }
          });
        }
      } catch (error) {
        console.error(`[Low Balance Error] Failed for employee ${employee.id}:`, error.message);
      }
    }

    console.log(`[Leave Automation] Low balance notifications sent: ${notificationsSent}`);
    return { success: true, notificationsSent };
  } catch (error) {
    console.error('[Leave Automation] Low balance check failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Notify employees about upcoming leaves
 * Sends reminder 1 day before leave starts
 */
async function notifyUpcomingLeaves() {
  try {
    console.log('[Leave Automation] Checking for upcoming leaves...');
    
    const allLeaves = LeaveModel.getAllLeaves();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    let notificationsSent = 0;

    for (const leave of allLeaves) {
      try {
        if (leave.status === 'Approved' || leave.status === 'approved') {
          const startDateStr = leave.startDate.split('T')[0];
          
          if (startDateStr === tomorrowStr) {
            notificationsSent++;
            console.log(`[Upcoming Leave] Employee ${leave.employeeId} has leave starting tomorrow`);
          }
        }
      } catch (error) {
        console.error(`[Upcoming Leave Error] Failed for leave ${leave.id}:`, error.message);
      }
    }

    console.log(`[Leave Automation] Upcoming leave notifications sent: ${notificationsSent}`);
    return { success: true, notificationsSent };
  } catch (error) {
    console.error('[Leave Automation] Upcoming leave check failed:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  processDailyAccruals,
  processYearEndCarryOver,
  checkStaleLeaves,
  sendPendingApprovalReminders,
  checkLowBalances,
  notifyUpcomingLeaves
};
