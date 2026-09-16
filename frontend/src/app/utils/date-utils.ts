/**
 * Date Utility Functions
 * Handles date formatting with proper timezone handling for WAT (UTC+1)
 */

/**
 * Format a Date object to YYYY-MM-DD string using LOCAL timezone
 * This avoids timezone shift issues when using toISOString()
 * 
 * @param date - The date to format
 * @returns Date string in YYYY-MM-DD format
 */
export function formatDateToString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a YYYY-MM-DD string to Date object in local timezone
 * 
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Date object at midnight local time
 */
export function parseDateToLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Get today's date as YYYY-MM-DD string in local timezone
 * 
 * @returns Today's date string
 */
export function getTodayString(): string {
  return formatDateToString(new Date());
}

/**
 * Check if a date string is today
 * 
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns True if the date is today
 */
export function isToday(dateStr: string): boolean {
  return dateStr === getTodayString();
}

/**
 * Check if a date string is tomorrow
 * 
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns True if the date is tomorrow
 */
export function isTomorrow(dateStr: string): boolean {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return dateStr === formatDateToString(tomorrow);
}

/**
 * Add days to a date
 * 
 * @param date - The starting date
 * @param days - Number of days to add (can be negative)
 * @returns New date object
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Get the Monday of the week containing the given date
 * 
 * @param date - Any date in the week
 * @returns Date object for Monday of that week
 */
export function getWeekStart(date: Date): Date {
  const dayOfWeek = date.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(date);
  monday.setDate(date.getDate() - daysToMonday);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * Get an array of dates for the week starting from Monday
 * 
 * @param weekStart - Monday of the week
 * @returns Array of 7 dates (Mon-Sun)
 */
export function getWeekDays(weekStart: Date): Date[] {
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    days.push(day);
  }
  return days;
}

/**
 * Format time string to 12-hour format with AM/PM
 * 
 * @param time - Time string in HH:MM format (24-hour)
 * @returns Time string in 12-hour format with AM/PM
 */
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}
