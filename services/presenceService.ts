
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
  calculateStatus(currentTime: Date, schedule: Schedule, type: 'IN' | 'OUT', timeZone?: string): { status: string, minutes: number } {
    // Mode Fleksibel Bypass
    if (schedule.id === 'FLEKSIBEL') {
      return { status: 'Tepat Waktu', minutes: 0 };
    }

    const tz = timeZone || timeUtils.getLocalTimeZone();
    
    // Get current time components in the target timezone
    const localTimeStr = currentTime.toLocaleString('en-US', { 
      timeZone: tz, 
      hour12: false,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // localTimeStr format: "Mon, 08:30"
    const [dayStr, timePart] = localTimeStr.split(', ');
    const daysMap: { [key: string]: number } = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
    const dayOfWeek = daysMap[dayStr];
    
    const rule = schedule.rules?.find(r => r.day_of_week === dayOfWeek);
    if (!rule || rule.is_holiday) return { status: 'Tepat Waktu', minutes: 0 };

    const [h, m] = timePart.split(':').map(Number);
    const currentTotalMins = h * 60 + m;
    
    const [targetH, targetM] = (type === 'IN' ? rule.check_in_time : rule.check_out_time || '00:00:00').split(':').map(Number);
    const targetTotalMins = targetH * 60 + targetM;

    const diffMins = currentTotalMins - targetTotalMins;

    if (type === 'IN') {
      const tolerance = schedule.tolerance_checkin_minutes || 0;
      if (diffMins > tolerance) {
        return { status: 'Terlambat', minutes: diffMins };
      }
    } else {
      const tolerance = schedule.tolerance_minutes || 0;
      // Jika pulang sebelum waktu seharusnya (diffMins negatif) diluar toleransi
      if (diffMins < -tolerance) {
        return { status: 'Pulang Cepat', minutes: Math.abs(diffMins) };
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
  async checkHolidayStatus(accountId: string, locationId: string, checkDate: Date) {
    const dateStr = checkDate.toISOString().split('T')[0];
    
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
  }
};
