
import { supabase } from '../lib/supabase';
import { timeUtils } from '../lib/timeUtils';
import { accountService } from './accountService';
import { scheduleService } from './scheduleService';
import { specialAssignmentService } from './specialAssignmentService';

export const monitoringService = {
  async getDailyMonitoringData(date: Date = new Date()) {
    // Use Local Timezone for calculations
    const localDateFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timeUtils.getLocalTimeZone(),
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    const localDayFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timeUtils.getLocalTimeZone(),
      weekday: 'short'
    });

    const dateStr = localDateFormatter.format(date);
    const dayStr = localDayFormatter.format(date);
    const daysMap: { [key: string]: number } = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
    const dayOfWeek = daysMap[dayStr];

    // 1. Fetch all active accounts
    const accounts = await accountService.getAll(undefined, undefined, '', 'aktif');

    // 2. Fetch all schedules and their rules
    const schedules = await scheduleService.getAll();

    // 3. Fetch today's attendances (using Local date range)
    // We use gte/lte on created_at which is UTC, so we need to be careful.
    // However, the app usually stores date-only fields or we can query by date string if available.
    // Given the previous code used created_at with T00:00:00Z, let's stick to a more robust approach:
    // Querying by the date part if possible, or calculating the UTC range for Local's day.
    const startOfDay = timeUtils.getStartOfLocalDayInUTC();
    const endOfDay = new Date(new Date(startOfDay).getTime() + 24 * 60 * 60 * 1000 - 1000).toISOString();

    const { data: attendances } = await supabase
      .from('attendances')
      .select('*')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay);

    // 4. Fetch today's overtimes
    const { data: overtimes } = await supabase
      .from('overtimes')
      .select('*')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay);

    // 5. Fetch approved leaves (Cuti Tahunan)
    const { data: annualLeaves } = await supabase
      .from('account_annual_leaves')
      .select('*')
      .eq('status', 'approved')
      .lte('start_date', dateStr)
      .gte('end_date', dateStr);

    // 6. Fetch approved Libur Mandiri
    const { data: leaveRequests } = await supabase
      .from('account_leave_requests')
      .select('*')
      .eq('status', 'approved')
      .lte('start_date', dateStr)
      .gte('end_date', dateStr);

    // 7. Fetch approved Permissions
    const { data: permissions } = await supabase
      .from('account_permission_requests')
      .select('*')
      .eq('status', 'approved')
      .lte('start_date', dateStr)
      .gte('end_date', dateStr);

    // 8. Fetch approved Maternity Leaves
    const { data: maternityLeaves } = await supabase
      .from('account_maternity_leaves')
      .select('*')
      .eq('status', 'approved')
      .lte('start_date', dateStr)
      .gte('end_date', dateStr);

    // 9. Fetch active Special Assignments
    const specialAssignments = await specialAssignmentService.getActiveForDate(dateStr);

    // 10. Fetch Libur Khusus (Holiday - Type 3) and Hari Kerja Khusus (Type 4) from schedules
    const holidaySchedules = schedules.filter(s => s.type === 3 && dateStr >= (s.start_date || '') && dateStr <= (s.end_date || ''));
    const specialWorkSchedules = schedules.filter(s => s.type === 4 && dateStr >= (s.start_date || '') && dateStr <= (s.end_date || ''));

    // Map data for easy lookup
    const attendanceMap = new Map(attendances?.map(a => [a.account_id, a]));
    const overtimeMap = new Map(overtimes?.map(o => [o.account_id, o]));
    const annualLeaveMap = new Map(annualLeaves?.map(l => [l.account_id, l]));
    const leaveRequestMap = new Map(leaveRequests?.map(l => [l.account_id, l]));
    const permissionMap = new Map(permissions?.map(p => [p.account_id, p]));
    const maternityLeaveMap = new Map(maternityLeaves?.map(m => [m.account_id, m]));
    const scheduleMap = new Map(schedules.map(s => [s.id, s]));

    // Map special assignments to accounts
    const accountSpecialAssignmentMap = new Map();
    specialAssignments.forEach(sa => {
      sa.accounts?.forEach((acc: any) => {
        accountSpecialAssignmentMap.set(acc.account_id, sa);
      });
    });

    const results = {
      present: [] as any[],
      notPresentYet: [] as any[],
      onHoliday: [] as any[],
      onLeaveMandiri: [] as any[],
      onOvertime: [] as any[],
      onAnnualLeave: [] as any[],
      onMaternityLeave: [] as any[],
      onPermission: [] as any[]
    };

    accounts.forEach((acc: any) => {
      const attendance = attendanceMap.get(acc.id);
      const overtime = overtimeMap.get(acc.id);
      const annualLeave = annualLeaveMap.get(acc.id);
      const leaveRequest = leaveRequestMap.get(acc.id);
      const permission = permissionMap.get(acc.id);
      const maternityLeave = maternityLeaveMap.get(acc.id);
      const specialAssignment = accountSpecialAssignmentMap.get(acc.id);

      // Check if it's a holiday for this user
      const schedule = scheduleMap.get(acc.schedule_id);
      let rule = schedule?.rules?.find(r => r.day_of_week === dayOfWeek);
      
      // FIX: For Fleksibel/Dinamis, if no rule is found, it's NOT a holiday by default.
      // It's only a holiday if explicitly marked as is_holiday.
      let isWeekendOrHolidayRule = false;
      if (acc.schedule_type === 'Tetap') {
        isWeekendOrHolidayRule = !rule || rule.is_holiday;
      } else {
        // Fleksibel/Dinamis: Only holiday if rule exists and is_holiday is true
        isWeekendOrHolidayRule = rule?.is_holiday || false;
      }
      
      const isSpecialHoliday = holidaySchedules.some(hs => 
        hs.location_ids?.includes(acc.location_id) && 
        !(hs.excluded_account_ids || []).includes(acc.id)
      );

      const specialWorkSchedule = specialWorkSchedules.find(sws => 
        sws.location_ids?.includes(acc.location_id) && 
        !(sws.excluded_account_ids || []).includes(acc.id)
      );

      let isHoliday = isWeekendOrHolidayRule || isSpecialHoliday;
      
      // Hari Kerja Khusus (Type 4) overrides holiday status
      if (specialWorkSchedule) {
        isHoliday = false;
      }

      // Attach schedule info for UI
      let scheduleName = schedule?.name || acc.schedule_type;
      let isSpecial = false;

      // HIERARCHY OVERRIDE
      // 1. Penugasan Khusus (Highest)
      if (specialAssignment) {
        isHoliday = false; 
        isSpecial = true;
        scheduleName = specialAssignment.title;
        if (specialAssignment.custom_check_in || specialAssignment.custom_check_out) {
          rule = {
            check_in_time: specialAssignment.custom_check_in,
            check_out_time: specialAssignment.custom_check_out,
            is_holiday: false
          } as any;
        }
      } 
      // 2. Hari Kerja Khusus (Type 4)
      else if (specialWorkSchedule) {
        isSpecial = true;
        scheduleName = specialWorkSchedule.name;
        // Use rule from special work schedule for today
        const swsRule = specialWorkSchedule.rules?.find((r: any) => r.day_of_week === dayOfWeek);
        if (swsRule) {
          rule = swsRule;
        }
      }

      const accWithInfo = { 
        ...acc, 
        schedule_name: scheduleName,
        today_rule: rule,
        schedule: schedule,
        is_special_assignment: isSpecial
      };

      // PRIORITY HIERARCHY: One user = One primary category
      // 1. Present (Check-in) - Always highest priority for monitoring
      if (attendance) {
        // Use snapshot data if available to ensure consistency
        const snapshotRule = attendance.target_check_in ? {
          check_in_time: attendance.target_check_in,
          check_out_time: attendance.target_check_out,
          is_holiday: false
        } : rule;

        results.present.push({ 
          ...accWithInfo, 
          today_rule: snapshotRule,
          schedule_name: attendance.schedule_name_snapshot || accWithInfo.schedule_name,
          attendance 
        });
      } 
      // 2. Mandatory Work (Penugasan / Hari Kerja Khusus)
      else if (specialAssignment || specialWorkSchedule) {
        results.notPresentYet.push(accWithInfo);
      }
      // 3. Approved Leave (Annual / Maternity / Permission)
      else if (annualLeave) {
        results.onAnnualLeave.push({ ...accWithInfo, annualLeave });
      } else if (maternityLeave) {
        results.onMaternityLeave.push({ ...accWithInfo, maternityLeave });
      } else if (permission) {
        results.onPermission.push({ ...accWithInfo, permission });
      } 
      // 4. Holiday (Mandiri / Special / Weekend)
      else if (leaveRequest) {
        results.onLeaveMandiri.push({ ...accWithInfo, leaveRequest });
      } else if (isHoliday) {
        results.onHoliday.push(accWithInfo);
      } 
      // 5. Not Present Yet (Regular Work Day)
      else {
        results.notPresentYet.push(accWithInfo);
      }

      // Overtime is a secondary status (can be present AND on overtime)
      if (overtime) {
        results.onOvertime.push({ ...accWithInfo, overtime });
      }
    });

    return results;
  }
};
