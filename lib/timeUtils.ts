/**
 * Utility for handling time boundaries and UTC offsets based on the user's local timezone or GPS coordinates
 */
export const timeUtils = {
  /**
   * Returns the current local timezone string (e.g., 'Asia/Jakarta', 'Asia/Jayapura')
   */
  getLocalTimeZone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  },

  /**
   * Determines the timezone based on GPS coordinates (Anti-Manipulation)
   * Specifically optimized for Indonesia (WIB, WITA, WIT)
   */
  getTimeZoneFromCoords(lat: number, lng: number): string {
    // Indonesia boundaries approx: Longitude 95 to 141
    if (lng >= 94.1 && lng <= 141.1) {
      if (lng < 120) return 'Asia/Jakarta'; // WIB (UTC+7)
      if (lng < 135) return 'Asia/Makassar'; // WITA (UTC+8)
      return 'Asia/Jayapura'; // WIT (UTC+9)
    }
    
    // Fallback for international: use device timezone
    // In a production environment, a library like 'tz-lookup' or an API would be used for 100% accuracy
    return this.getLocalTimeZone();
  },

  /**
   * Returns today's date string in YYYY-MM-DD format based on a specific timezone
   */
  getTodayLocalString(timeZone?: string): string {
    const tz = timeZone || this.getLocalTimeZone();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(new Date());
  },

  /**
   * Returns the start of today (00:00:00) in a specific timezone, converted to UTC ISO string
   */
  getStartOfLocalDayInUTC(timeZone?: string): string {
    const tz = timeZone || this.getLocalTimeZone();
    const dateStr = this.getTodayLocalString(tz);
    
    // To get the exact UTC start of day for a specific timezone:
    // 1. Create a date string representing 00:00 in that timezone
    // 2. Parse it with the timezone offset
    // Since we don't have a library, we'll use a trick with Intl to find the offset
    const now = new Date();
    const tzDate = new Date(now.toLocaleString('en-US', { timeZone: tz }));
    const offset = Math.round((tzDate.getTime() - now.getTime()) / 60000); // offset in minutes
    
    // Start of day in local time
    const localStart = new Date(`${dateStr}T00:00:00`);
    // Adjust by the detected offset to get UTC
    const utcStart = new Date(localStart.getTime() - (offset * 60000));
    
    return utcStart.toISOString();
  },

  /**
   * Converts a date to a local Date object
   */
  toLocalDate(date: string | Date): Date {
    return new Date(date);
  },

  /**
   * Checks if a given date string (YYYY-MM-DD) is today in a specific timezone
   */
  isTodayLocal(dateStr: string, timeZone?: string): boolean {
    return dateStr === this.getTodayLocalString(timeZone);
  },

  /**
   * Returns the day of the week index (0-6) for a specific date and timezone
   */
  getDayIndexInTimeZone(date: Date, timeZone?: string): number {
    const tz = timeZone || this.getLocalTimeZone();
    const dayStr = date.toLocaleString('en-US', { 
      timeZone: tz, 
      weekday: 'short' 
    });
    const daysMap: { [key: string]: number } = { 
      'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 
    };
    return daysMap[dayStr];
  }
};
