import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';

dayjs.extend(weekOfYear);

/**
 * Date utilities for consistent week calculation across the application
 */
export class DateUtils {
  
  /**
   * Get the next week dates (Monday to Sunday)
   * This ensures consistent week calculation across all components
   */
  static getNextWeekDates(): { start: Date; end: Date } {
    // Get next week's Monday
    const nextWeekMonday = dayjs().add(1, 'week').startOf('week').add(1, 'day');
    
    // Get next week's Sunday (from the same Monday reference)
    const nextWeekSunday = nextWeekMonday.add(6, 'day').endOf('day');
    
    return {
      start: nextWeekMonday.toDate(),
      end: nextWeekSunday.toDate()
    };
  }

  /**
   * Get week dates from a specific dayjs date
   */
  static getWeekDatesFromDate(weekDate: dayjs.Dayjs): { start: Date; end: Date } {
    // Get Monday of the week
    const monday = weekDate.startOf('week').add(1, 'day');
    
    // Get Sunday of the week (from the same Monday reference)
    const sunday = monday.add(6, 'day').endOf('day');
    
    return {
      start: monday.toDate(),
      end: sunday.toDate()
    };
  }

  /**
   * Check if two date ranges represent the same week
   */
  static isSameWeek(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
    return start1.getTime() === start2.getTime() && end1.getTime() === end2.getTime();
  }

  /**
   * Generate a unique week ID from start and end dates
   */
  static generateWeekId(start: Date, end: Date): string {
    const startStr = dayjs(start).format('YYYY-MM-DD');
    const endStr = dayjs(end).format('YYYY-MM-DD');
    return `week_${startStr}_to_${endStr}`;
  }

  /**
   * Format date range for display
   */
  static formatWeekRange(start: Date, end: Date): string {
    const startStr = dayjs(start).format('DD/MM/YYYY');
    const endStr = dayjs(end).format('DD/MM/YYYY');
    return `${startStr} - ${endStr}`;
  }

  /**
   * Get week number and year
   */
  static getWeekInfo(date: Date): { week: number; year: number } {
    const d = dayjs(date);
    return {
      week: d.week(),
      year: d.year()
    };
  }

  /**
   * Normalize date to start of day (remove time component)
   */
  static normalizeDate(date: Date): Date {
    return dayjs(date).startOf('day').toDate();
  }

  /**
   * Check if a date is within a week range
   */
  static isDateInWeek(date: Date, weekStart: Date, weekEnd: Date): boolean {
    const d = dayjs(date);
    const start = dayjs(weekStart);
    const end = dayjs(weekEnd);
    
    return d.isSameOrAfter(start, 'day') && d.isSameOrBefore(end, 'day');
  }
}
