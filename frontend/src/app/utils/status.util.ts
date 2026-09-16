/**
 * Status Utility Functions
 * Centralized status badge variant mapping for consistent UI across the application
 */

export type StatusBadgeVariant = 'success' | 'danger' | 'warning' | 'cancelled' | 'info' | 'primary' | 'purple' | 'default';

/**
 * Get the appropriate badge variant for a leave status
 * @param status - The status string (case-insensitive)
 * @returns The corresponding badge variant
 */
export function getLeaveStatusVariant(status: string): StatusBadgeVariant {
  const statusLower = (status || '').toLowerCase();
  
  switch (statusLower) {
    case 'approved':
      return 'success';
    case 'rejected':
      return 'danger';
    case 'cancelled':
    case 'canceled': // Support both spellings
      return 'cancelled';
    case 'pending':
      return 'warning';
    default:
      return 'default';
  }
}

/**
 * Get the appropriate badge variant for an attendance status
 * @param status - The status string (case-insensitive)
 * @returns The corresponding badge variant
 */
export function getAttendanceStatusVariant(status: string): StatusBadgeVariant {
  const statusLower = (status || '').toLowerCase();
  
  switch (statusLower) {
    case 'present':
    case 'checked-in':
      return 'success';
    case 'absent':
      return 'danger';
    case 'late':
      return 'warning';
    case 'on-leave':
    case 'leave':
      return 'info';
    case 'half-day':
      return 'purple';
    default:
      return 'default';
  }
}

/**
 * Get the appropriate badge variant for a task/project status
 * @param status - The status string (case-insensitive)
 * @returns The corresponding badge variant
 */
export function getTaskStatusVariant(status: string): StatusBadgeVariant {
  const statusLower = (status || '').toLowerCase();
  
  switch (statusLower) {
    case 'completed':
    case 'done':
      return 'success';
    case 'cancelled':
    case 'canceled':
      return 'cancelled';
    case 'in-progress':
    case 'in progress':
    case 'active':
      return 'primary';
    case 'pending':
    case 'todo':
    case 'not-started':
      return 'warning';
    case 'blocked':
    case 'failed':
      return 'danger';
    default:
      return 'default';
  }
}

/**
 * Get the appropriate badge variant for a general status
 * @param status - The status string (case-insensitive)
 * @returns The corresponding badge variant
 */
export function getGeneralStatusVariant(status: string): StatusBadgeVariant {
  const statusLower = (status || '').toLowerCase();
  
  switch (statusLower) {
    case 'active':
    case 'approved':
    case 'success':
    case 'completed':
      return 'success';
    case 'inactive':
    case 'rejected':
    case 'failed':
    case 'error':
      return 'danger';
    case 'cancelled':
    case 'canceled':
      return 'cancelled';
    case 'pending':
    case 'waiting':
    case 'in-progress':
      return 'warning';
    case 'draft':
    case 'info':
      return 'info';
    default:
      return 'default';
  }
}
