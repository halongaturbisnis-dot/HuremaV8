
import { supabase } from '../lib/supabase';
import { timeUtils } from '../lib/timeUtils';
import { Attendance, AttendanceInput, Account, Schedule, ScheduleRule } from '../types';

const sanitizePayload = (payload: any) => {
  const sanitized = { ...payload };
  Object.keys(sanitized).forEach(key => {
    if (sanitized[key] === '' || sanitized[key] === undefined) {
      sanitized[key] = null;
    }
  });
  return sanitized;
};

export const presenceService = {
  /**
   * Mengambil waktu server (Anti-Fake Time)
   */
  async getServerTime(): Promise<Date> {
    const { data, error } = await supabase.rpc('get_server_time');
    if (error) {
      try {
        const res = await fetch('https://worldtimeapi.org/api/timezone/Asia/Jakarta');
        const json = await res.json();
        return new Date(json.datetime);
      } catch (e) {
        return new Date();
      }
    }
    return new Date(data);
  },

  /**
   * Mendapatkan alamat dari koordinat (Nominatim API) dengan timeout
   */
  async getReverseGeocode(lat: number, lng: number): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500); // Timeout 3.5 detik

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const data = await response.json();
      return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch (err) {
      clearTimeout(timeoutId);
      console.error("Reverse Geotag Error (Using Fallback):", err);
      return `Koordinat: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  },

  /**
   * Menghitung keterlambatan atau pulang cepat berdasarkan jadwal (Timezone Aware)
   */
  calculateStatus(currentTime: Date, schedule: Schedule, type: 'IN' | 'OUT', timeZone?: string): { status: string, minutes: number, lateCheckoutMinutes?: number } {
    // Mode Fleksibel Bypass
    if (schedule.id === 'FLEKSIBEL') {
      return { status: 'Tepat Waktu', minutes: 0 };
    }

    const tz = timeZone || timeUtils.getLocalTimeZone();
    
    // Use Intl.DateTimeFormat for robust component extraction
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour12: false,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const parts = formatter.formatToParts(currentTime);
    const dayStr = parts.find(p => p.type === 'weekday')?.value;
    const hourStr = parts.find(p => p.type === 'hour')?.value;
    const minuteStr = parts.find(p => p.type === 'minute')?.value;

    const daysMap: { [key: string]: number } = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
    const dayOfWeek = dayStr ? daysMap[dayStr] : currentTime.getDay();
    
    // If schedule has exactly 1 rule, use it directly (fallback for special/dynamic)
    // Otherwise, find the rule for today
    const rule = (schedule.rules?.length === 1) 
      ? schedule.rules[0] 
      : schedule.rules?.find(r => r.day_of_week === dayOfWeek);

    if (!rule || rule.is_holiday) return { status: 'Tepat Waktu', minutes: 0 };

    const targetTime = (type === 'IN' ? rule.check_in_time : rule.check_out_time) || '00:00:00';
    
    // NEW LOGIC: Always use Wall Clock comparison if it's HH:mm:ss
    if (!targetTime.includes('T')) {
      const [targetH, targetM] = targetTime.split(':').map(Number);
      const targetTotalMins = targetH * 60 + targetM;
      const currentTotalMins = parseInt(hourStr || '0') * 60 + parseInt(minuteStr || '0');
      
      const diffMins = currentTotalMins - targetTotalMins;

      if (type === 'IN') {
        const tolerance = schedule.tolerance_checkin_minutes || 0;
        if (diffMins > tolerance) {
          return { status: 'Terlambat', minutes: diffMins - tolerance };
        }
      } else {
        const lateCheckoutTolerance = schedule.tolerance_checkout_minutes || 0;
        if (diffMins < 0) {
          return { status: 'Pulang Cepat', minutes: Math.abs(diffMins) };
        }
        if (diffMins > lateCheckoutTolerance) {
          return { status: 'Terlambat Pulang', minutes: 0, lateCheckoutMinutes: diffMins - lateCheckoutTolerance };
        }
      }
      return { status: 'Tepat Waktu', minutes: 0 };
    }

    // Fallback for ISO timestamps (if any still exist in old data)
    const targetDate = new Date(targetTime);
    const diffMs = currentTime.getTime() - targetDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (type === 'IN') {
      const tolerance = schedule.tolerance_checkin_minutes || 0;
      if (diffMins > tolerance) {
        return { status: 'Terlambat', minutes: diffMins - tolerance };
      }
    } else {
      const lateCheckoutTolerance = schedule.tolerance_checkout_minutes || 0;
      if (diffMins < 0) {
        return { status: 'Pulang Cepat', minutes: Math.abs(diffMins) };
      }
      if (diffMins > lateCheckoutTolerance) {
        return { status: 'Terlambat Pulang', minutes: 0, lateCheckoutMinutes: diffMins - lateCheckoutTolerance };
      }
    }
    return { status: 'Tepat Waktu', minutes: 0 };
  },

  /**
   * Menghitung jarak antara 2 koordinat (Haversine Formula)
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('attendances')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data as Attendance;
  },

  async getTodayAttendance(accountId: string, timeZone?: string) {
    const startOfToday = timeUtils.getStartOfLocalDayInUTC(timeZone);
    const { data, error } = await supabase
      .from('attendances')
      .select('*')
      .eq('account_id', accountId)
      .gte('created_at', startOfToday)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) throw error;
    return data as Attendance | null;
  },

  /**
   * Memastikan user tidak sedang dalam sesi kerja reguler (Mutual Exclusion)
   * Mengecek secara global apakah ada sesi yang belum di-checkout
   */
  async isRegularSessionActive(accountId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('attendances')
      .select('id')
      .eq('account_id', accountId)
      .is('check_out', null)
      .limit(1)
      .maybeSingle();
    
    if (error) return false;
    return !!data;
  },

  /**
   * Cek apakah hari ini Libur Khusus (Tipe 3) di lokasi user
   */
  async checkHolidayStatus(accountId: string, locationId: string, checkDate: Date, timeZone?: string) {
    const dateStr = timeUtils.getTodayLocalString(timeZone);
    
    const { data, error } = await supabase
      .from('schedules')
      .select('*, schedule_locations!inner(location_id)')
      .eq('type', 3) // Libur Khusus
      .eq('schedule_locations.location_id', locationId)
      .lte('start_date', dateStr)
      .gte('end_date', dateStr);

    if (error) return null;
    
    // Filter out if user is excluded
    const activeHoliday = data?.find(s => !s.excluded_account_ids?.includes(accountId));
    return activeHoliday || null;
  },

  /**
   * Cek apakah hari ini Hari Kerja Khusus (Tipe 4) di lokasi user
   */
  async checkSpecialScheduleStatus(accountId: string, locationId: string, checkDate: Date, timeZone?: string) {
    const dateStr = timeUtils.getTodayLocalString(timeZone);
    
    const { data, error } = await supabase
      .from('schedules')
      .select('*, schedule_rules(*), schedule_locations!inner(location_id)')
      .eq('type', 4) // Hari Kerja Khusus
      .eq('schedule_locations.location_id', locationId)
      .lte('start_date', dateStr)
      .gte('end_date', dateStr);

    if (error) return null;
    
    // Filter out if user is excluded
    const activeSpecial = data?.find(s => !s.excluded_account_ids?.includes(accountId));
    if (!activeSpecial) return null;

    return {
      ...activeSpecial,
      rules: activeSpecial.schedule_rules
    } as Schedule;
  },

  /**
   * Cek apakah hari ini user sedang Cuti/Izin/Libur Mandiri yang disetujui
   */
  async checkLeaveStatus(accountId: string, checkDate: Date, timeZone?: string) {
    const dateStr = timeUtils.getTodayLocalString(timeZone);
    
    // Cek Annual Leaves
    const { data: annual } = await supabase
      .from('account_annual_leaves')
      .select('*')
      .eq('account_id', accountId)
      .eq('status', 'approved')
      .lte('start_date', dateStr)
      .gte('end_date', dateStr)
      .maybeSingle();
    
    if (annual) return { type: 'Cuti Tahunan', data: annual };

    // Cek Leave Requests (Libur Mandiri)
    const { data: leave } = await supabase
      .from('account_leave_requests')
      .select('*')
      .eq('account_id', accountId)
      .eq('status', 'approved')
      .lte('start_date', dateStr)
      .gte('end_date', dateStr)
      .maybeSingle();
    
    if (leave) return { type: 'Libur Mandiri', data: leave };

    // Cek Permission Requests
    const { data: perm } = await supabase
      .from('account_permission_requests')
      .select('*')
      .eq('account_id', accountId)
      .eq('status', 'approved')
      .lte('start_date', dateStr)
      .gte('end_date', dateStr)
      .maybeSingle();
    
    if (perm) return { type: 'Izin', data: perm };

    // Cek Maternity Leaves
    const { data: mat } = await supabase
      .from('account_maternity_leaves')
      .select('*')
      .eq('account_id', accountId)
      .eq('status', 'approved')
      .lte('start_date', dateStr)
      .gte('end_date', dateStr)
      .maybeSingle();
    
    if (mat) return { type: 'Cuti Melahirkan', data: mat };

    return null;
  },

  async checkIn(input: Partial<AttendanceInput>) {
    const sanitized = sanitizePayload(input);
    const { data, error } = await supabase
      .from('attendances')
      .insert([sanitized])
      .select()
      .single();
    
    if (error) throw error;
    return data as Attendance;
  },

  async checkOut(id: string, input: Partial<AttendanceInput>) {
    if (!id) throw new Error("ID presensi tidak valid untuk proses check-out.");
    const sanitized = sanitizePayload(input);
    const { data, error } = await supabase
      .from('attendances')
      .update(sanitized)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Attendance;
  },

  async getActiveAttendance(accountId: string) {
    const { data, error } = await supabase
      .from('attendances')
      .select('*')
      .eq('account_id', accountId)
      .is('check_out', null)
      .limit(1)
      .maybeSingle();
    
    if (error) return null;
    return data as Attendance | null;
  },

  async getRecentHistory(accountId: string, limit = 31) {
    const { data, error } = await supabase
      .from('attendances')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data as Attendance[];
  },

  async getAttendanceByRange(startDate: string, endDate: string, accountId?: string) {
    let query = supabase
      .from('attendances')
      .select('*, account:accounts!account_id!inner(location_id)')
      .gte('created_at', `${startDate}T00:00:00Z`)
      .lte('created_at', `${endDate}T23:59:59Z`)
      .order('created_at', { ascending: true });
    
    // Apply Admin Location Scope
    const { authService } = await import('./authService');
    const user = authService.getCurrentUser();
    if (user && user.role !== 'admin') {
      const scopes = [user.hr_scope, user.performance_scope, user.finance_scope].filter(Boolean);
      const limitedScopes = scopes.filter(s => s?.mode === 'limited');
      
      if (limitedScopes.length > 0) {
        const allAllowedIds = Array.from(new Set(limitedScopes.flatMap(s => s?.location_ids || [])));
        if (allAllowedIds.length > 0) {
          query = query.in('account.location_id', allAllowedIds);
        }
      }
    }

    if (accountId) {
      query = query.eq('account_id', accountId);
    }

    const { data, error } = await query;
    
    if (error) throw error;
    return data as Attendance[];
  },

  /**
   * Menghitung durasi kerja dalam format HH:MM:SS
   */
  calculateWorkDuration(checkIn: string | Date, checkOut: string | Date): string {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffMs = end.getTime() - start.getTime();
    
    if (diffMs < 0) return "00:00:00";
    
    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
};
