/**
 * Utility for handling time boundaries and UTC offsets based on the user's local timezone
 */
export const timeUtils = {
  /**
   * Returns the current local timezone string (e.g., 'Asia/Jakarta', 'Asia/Jayapura')
   */
  getLocalTimeZone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  },

  /**
   * Returns today's date string in YYYY-MM-DD format based on local timezone
   */
  getTodayLocalString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * Returns the start of today (00:00:00) in local time, converted to UTC ISO string
   * This is useful for querying Supabase created_at columns
   */
  getStartOfLocalDayInUTC(): string {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now.toISOString();
  },

  /**
   * Converts a date to a local Date object (standard JS Date handles this)
   */
  toLocalDate(date: string | Date): Date {
    return new Date(date);
  },

  /**
   * Checks if a given date string (YYYY-MM-DD) is today in local time
   */
  isTodayLocal(dateStr: string): boolean {
    return dateStr === this.getTodayLocalString();
  }
};
