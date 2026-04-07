/**
 * Utility for handling time boundaries and UTC offsets specifically for WIB (UTC+7)
 */
export const timeUtils = {
  /**
   * Returns the current date in WIB (Asia/Jakarta) as a Date object
   */
  getCurrentWIBDate(): Date {
    // Get current UTC time
    const now = new Date();
    // Offset for WIB is +7 hours
    const wibOffset = 7 * 60 * 60 * 1000;
    return new Date(now.getTime() + wibOffset);
  },

  /**
   * Returns today's date string in YYYY-MM-DD format based on WIB
   */
  getTodayWIBString(): string {
    const wibDate = this.getCurrentWIBDate();
    return wibDate.toISOString().split('T')[0];
  },

  /**
   * Converts a UTC date string or Date object to a WIB Date object
   */
  toWIBDate(date: string | Date): Date {
    const d = new Date(date);
    const wibOffset = 7 * 60 * 60 * 1000;
    return new Date(d.getTime() + wibOffset);
  },

  /**
   * Checks if a given date string (YYYY-MM-DD) is today in WIB
   */
  isTodayWIB(dateStr: string): boolean {
    return dateStr === this.getTodayWIBString();
  }
};
