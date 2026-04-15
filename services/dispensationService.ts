import { supabase } from '../lib/supabase';
import { DispensationRequest, DispensationRequestInput } from '../types';

export const dispensationService = {
  async getAll() {
    let query = supabase
      .from('dispensation_requests')
      .select('*, account:accounts!inner(full_name, internal_nik, photo_google_id, location_id, grade, position, location:locations(name))');

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

    const { data, error } = await query;
    if (error) throw error;

    // Sorting 2 layer: Status (PENDING first) then Date (newest first)
    const sortedData = (data as DispensationRequest[]).sort((a, b) => {
      const statusOrder: Record<string, number> = { 'PENDING': 0, 'PARTIAL': 1, 'APPROVED': 2, 'REJECTED': 3 };
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    return sortedData;
  },

  async getByAccountId(accountId: string) {
    const { data, error } = await supabase
      .from('dispensation_requests')
      .select('*')
      .eq('account_id', accountId);
    
    if (error) throw error;

    // Sorting 2 layer: Status (PENDING first) then Date (newest first)
    const sortedData = (data as DispensationRequest[]).sort((a, b) => {
      const statusOrder: Record<string, number> = { 'PENDING': 0, 'PARTIAL': 1, 'APPROVED': 2, 'REJECTED': 3 };
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    return sortedData;
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('dispensation_requests')
      .select('*, account:accounts(full_name, internal_nik, photo_google_id, location_id, grade, position, location:locations(name))')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as DispensationRequest;
  },

  async create(input: DispensationRequestInput) {
    // Ensure presence_id is null if not provided or empty
    const cleanInput = {
      ...input,
      presence_id: input.presence_id || null
    };

    const { data, error } = await supabase
      .from('dispensation_requests')
      .insert([cleanInput])
      .select();
    if (error) throw error;
    return data[0] as DispensationRequest;
  },

  async update(id: string, input: Partial<DispensationRequest>) {
    const { data, error } = await supabase
      .from('dispensation_requests')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();
    if (error) throw error;
    return data[0] as DispensationRequest;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('dispensation_requests')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async verify(id: string, status: DispensationRequest['status'], issues: DispensationRequest['issues'], verifierId: string) {
    const { data: request, error: fetchError } = await supabase
      .from('dispensation_requests')
      .select('*, account:accounts(*)')
      .eq('id', id)
      .single();
    
    if (fetchError) throw fetchError;

    // Process each issue
    for (const issue of issues) {
      if (issue.status === 'APPROVED') {
        if (issue.type === 'ABSEN_KERJA') {
          // INSERT new attendance record
          const { locationService } = await import('./locationService');
          const locationId = issue.manual_location_id || request.account.location_id;
          
          if (!locationId) throw new Error('Lokasi tidak ditemukan untuk pengajuan absen.');
          
          const location = await locationService.getById(locationId);
          
          const checkInDate = new Date(`${request.date}T${issue.manual_check_in}:00`);
          const checkOutDate = new Date(`${request.date}T${issue.manual_check_out}:00`);

          const { timeUtils } = await import('../lib/timeUtils');
          const { presenceService } = await import('./presenceService');
          const timezone = timeUtils.getTimeZoneFromCoords(location.latitude, location.longitude);
          const workDuration = presenceService.calculateWorkDuration(checkInDate, checkOutDate);

          await supabase.from('attendances').insert([{
            account_id: request.account_id,
            check_in: checkInDate.toISOString(),
            check_out: checkOutDate.toISOString(),
            in_latitude: location.latitude,
            in_longitude: location.longitude,
            out_latitude: location.latitude,
            out_longitude: location.longitude,
            target_latitude: location.latitude,
            target_longitude: location.longitude,
            target_radius: location.radius,
            in_photo_id: issue.in_photo_id,
            out_photo_id: issue.out_photo_id,
            status_in: 'Tepat Waktu',
            status_out: 'Tepat Waktu',
            check_in_validity: 'TRUE',
            check_out_validity: 'TRUE',
            check_in_type: 'Reguler',
            check_out_type: 'Reguler',
            target_check_in: issue.manual_check_in,
            target_check_out: issue.manual_check_out,
            in_timezone: timezone,
            out_timezone: timezone,
            schedule_name_snapshot: 'DISPENSASI ABSEN',
            late_minutes: 0,
            early_departure_minutes: 0,
            work_duration: workDuration,
            check_in_reason: 'TERDISPENSASI',
            check_out_reason: 'TERDISPENSASI'
          }]);
        } else if (request.presence_id) {
          // UPDATE existing attendance record
          const updateData: any = {};
          const issueReason = issue.reason || request.reason;

          if (issue.type === 'TERLAMBAT') {
            updateData.status_in = 'Tepat Waktu';
            updateData.late_minutes = 0;
            updateData.late_reason = `(TERDISPENSASI) ${issueReason}`;
          } else if (issue.type === 'PULANG_AWAL') {
            updateData.status_out = 'Tepat Waktu';
            updateData.early_departure_minutes = 0;
            updateData.early_departure_reason = `(TERDISPENSASI) ${issueReason}`;
          }
          
          await supabase.from('attendances')
            .update(updateData)
            .eq('id', request.presence_id);
        }
      }
    }

    // Update request status
    const { data, error } = await supabase
      .from('dispensation_requests')
      .update({ 
        status, 
        issues, 
        updated_at: new Date().toISOString(),
        is_read: true 
      })
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data[0] as DispensationRequest;
  },

  async markAsRead(id: string) {
    const { error } = await supabase
      .from('dispensation_requests')
      .update({ is_read: true })
      .eq('id', id);
    if (error) throw error;
  },

  async getUnreadCount() {
    const { count, error } = await supabase
      .from('dispensation_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PENDING'); // Count unverified requests as per requirement
    if (error) throw error;
    return count || 0;
  },

  /**
   * Mendapatkan tanggal yang layak diajukan dispensasi
   */
  async getEligibleDates(accountId: string) {
    const { settingsService } = await import('./settingsService');
    const windowDays = await settingsService.getSetting('dispensation_window_days', 7);
    
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - Number(windowDays));

    // Helper to convert UTC to Local Date String based on timezone
    const toLocalDate = (date: Date | string, tz: string = 'Asia/Jakarta') => {
      try {
        return new Intl.DateTimeFormat('en-CA', {
          timeZone: tz,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(new Date(date));
      } catch (e) {
        return new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Jakarta',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(new Date(date));
      }
    };

    const startDateStr = toLocalDate(startDate);
    const todayStr = toLocalDate(today);

    // 1. Get user account info (Removed locations(timezone) as it doesn't exist)
    const { data: account } = await supabase
      .from('accounts')
      .select('location_id, schedule_id, schedule_type')
      .eq('id', accountId)
      .single();

    if (!account) return { dates: [], windowDays: Number(windowDays) };

    // 2. Get attendances in range
    const { data: attendances } = await supabase
      .from('attendances')
      .select('*')
      .eq('account_id', accountId)
      .gte('check_in', startDate.toISOString())
      .lte('check_in', today.toISOString());

    // 3. Get existing requests
    const { data: existingRequests } = await supabase
      .from('dispensation_requests')
      .select('date, presence_id')
      .eq('account_id', accountId);

    const requestedDates = new Set(existingRequests?.map(r => r.date));
    const requestedPresenceIds = new Set(existingRequests?.filter(r => r.presence_id).map(r => r.presence_id));

    // 4. Get all types of leaves/permissions (Fix dates, not timezone dependent)
    const [
      { data: annualLeaves },
      { data: leaveRequests },
      { data: maternityLeaves },
      { data: permissionRequests },
      { data: submissions }
    ] = await Promise.all([
      supabase.from('account_annual_leaves').select('*').eq('account_id', accountId).eq('status', 'approved').gte('end_date', startDateStr).lte('start_date', todayStr),
      supabase.from('account_leave_requests').select('*').eq('account_id', accountId).eq('status', 'approved').gte('end_date', startDateStr).lte('start_date', todayStr),
      supabase.from('account_maternity_leaves').select('*').eq('account_id', accountId).eq('status', 'approved').gte('end_date', startDateStr).lte('start_date', todayStr),
      supabase.from('account_permission_requests').select('*').eq('account_id', accountId).eq('status', 'approved').gte('end_date', startDateStr).lte('start_date', todayStr),
      supabase.from('account_submissions').select('*').eq('account_id', accountId).eq('status', 'Disetujui').gte('updated_at', startDate.toISOString())
    ]);

    // 5. Get Special Assignments for this user
    const { data: assignmentLinks } = await supabase
      .from('special_assignment_accounts')
      .select('assignment_id')
      .eq('account_id', accountId);
    
    const assignmentIds = assignmentLinks?.map(al => al.assignment_id) || [];
    
    const { data: assignments } = assignmentIds.length > 0 
      ? await supabase
          .from('special_assignments')
          .select('*')
          .in('id', assignmentIds)
          .gte('end_date', startDateStr)
          .lte('start_date', todayStr)
      : { data: [] };

    // 6. Get Schedules (Type 3 & 4)
    const { data: specialSchedules } = await supabase
      .from('schedules')
      .select('*, schedule_locations!inner(location_id)')
      .in('type', [3, 4])
      .eq('schedule_locations.location_id', account.location_id)
      .gte('end_date', startDateStr)
      .lte('start_date', todayStr);
    
    const filteredSpecialSchedules = specialSchedules?.filter(s => 
      !s.excluded_account_ids?.includes(accountId)
    );

    // 7. Get User's Schedule Rules
    let schedule = null;
    if (account.schedule_id) {
      const { data } = await supabase
        .from('schedules')
        .select('*, schedule_rules(*)')
        .eq('id', account.schedule_id)
        .single();
      schedule = data;
    }

    const eligible: any[] = [];

    // Step 1: Check existing attendances for late/early
    attendances?.forEach(att => {
      if (requestedPresenceIds.has(att.id)) return;

      const issues: string[] = [];
      if (att.status_in === 'Terlambat') issues.push('TERLAMBAT');
      if (att.status_out === 'Pulang Awal') issues.push('PULANG_AWAL');

      if (issues.length > 0) {
        eligible.push({
          date: toLocalDate(att.check_in, att.in_timezone || 'Asia/Jakarta'),
          presence_id: att.id,
          issues,
          scheduleName: att.schedule_name_snapshot || schedule?.name || 'Jadwal Reguler'
        });
      }
    });

    // Step 2-5: Check for "Absen Kerja"
    for (let i = 0; i <= Number(windowDays); i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      
      const dateStr = toLocalDate(d);
      if (requestedDates.has(dateStr)) continue;
      
      const hasAttendance = attendances?.some(att => toLocalDate(att.check_in, att.in_timezone || 'Asia/Jakarta') === dateStr);
      if (hasAttendance) continue;

      // a. Cek Penugasan Khusus
      const assignment = assignments?.find(a => dateStr >= a.start_date && dateStr <= a.end_date);
      if (assignment) {
        eligible.push({ 
          date: dateStr, 
          presence_id: null, 
          issues: ['ABSEN_KERJA'],
          scheduleName: assignment.title
        });
        continue;
      }

      // b. Cek Jadwal Kerja Khusus (Tipe 4)
      const specialWorkDay = filteredSpecialSchedules?.find(s => s.type === 4 && dateStr >= s.start_date && dateStr <= s.end_date);
      if (specialWorkDay) {
        eligible.push({ 
          date: dateStr, 
          presence_id: null, 
          issues: ['ABSEN_KERJA'],
          scheduleName: specialWorkDay.name
        });
        continue;
      }

      // c. Cek Jadwal Libur Khusus (Tipe 3)
      const specialHoliday = filteredSpecialSchedules?.find(s => s.type === 3 && dateStr >= s.start_date && dateStr <= s.end_date);
      if (specialHoliday) continue;

      // d. Cek Izin/Cuti
      const isOffByLeave = [
        ...(annualLeaves || []),
        ...(leaveRequests || []),
        ...(maternityLeaves || []),
        ...(permissionRequests || [])
      ].some(l => dateStr >= l.start_date && dateStr <= l.end_date);
      if (isOffByLeave) continue;

      const isOffBySubmission = submissions?.some(s => {
        const data = s.submission_data;
        if (!data?.start_date || !data?.end_date) return false;
        return dateStr >= data.start_date && dateStr <= data.end_date;
      });
      if (isOffBySubmission) continue;

      // e. Cek Jenis Jadwal
      if (schedule?.type === 1) {
        // Jadwal Reguler (Tipe 1): Cek aturan libur rutin (Senin-Minggu)
        // Fix: Get day of week from date string (YYYY-MM-DD) safely to avoid timezone shift
        const [y, m, d_num] = dateStr.split('-').map(Number);
        const dayOfWeek = new Date(y, m - 1, d_num).getDay();
        
        const rule = schedule.schedule_rules?.find((r: any) => r.day_of_week === dayOfWeek);
        
        // Jika diatur sebagai hari libur (is_holiday: true), maka BUKAN ABSEN
        if (!rule || rule.is_holiday) continue;
        
        eligible.push({ 
          date: dateStr, 
          presence_id: null, 
          issues: ['ABSEN_KERJA'],
          scheduleName: schedule.name
        });
      } else {
        // Jadwal Non-Reguler (Shift, Shift Dinamis, Fleksibel)
        // Semuanya dianggap hari kerja jika tidak ada presensi (kecuali ada Izin/Penugasan di atas)
        eligible.push({ 
          date: dateStr, 
          presence_id: null, 
          issues: ['ABSEN_KERJA'],
          scheduleName: schedule?.name || account.schedule_type || 'Jadwal Non-Reguler'
        });
      }
    }

    return { 
      dates: eligible.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      windowDays: Number(windowDays)
    };
  },
};
