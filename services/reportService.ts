import { supabase } from '../lib/supabase';
import { timeUtils } from '../lib/timeUtils';
import { EmployeeReportData, AttendanceSummary, LeaveSummary, OvertimeSummary, PayrollSummary } from '../types';
import { specialAssignmentService } from './specialAssignmentService';
import { scheduleService } from './scheduleService';

export const reportService = {
  async getEmployeeReportData(): Promise<EmployeeReportData> {
    // Fetch all accounts
    const today = new Date().toISOString().split('T')[0];
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('*, location:locations(name)')
      .not('access_code', 'ilike', '%SPADMIN%')
      .or(`end_date.is.null,end_date.gt.${today}`);

    if (accountsError) throw new Error(accountsError.message);

    // Fetch terminations for exit employees (e.g., in the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Fetch terminations
    const { data: terminations } = await supabase
      .from('account_termination_logs')
      .select('account_id')
      .gte('termination_date', thirtyDaysAgo.toISOString());

    // Fetch contracts ending in the last 30 days
    const { data: endingContracts } = await supabase
      .from('account_contracts')
      .select('account_id')
      .gte('end_date', thirtyDaysAgo.toISOString())
      .lte('end_date', today);

    // Combine unique account IDs for exit employees
    const activeAccountIds = new Set(accounts?.map(a => a.id) || []);
    const exitAccountIds = new Set([
        ...(terminations?.map(t => t.account_id) || []),
        ...(endingContracts?.map(c => c.account_id) || [])
    ].filter(id => !activeAccountIds.has(id)));

    const exitEmployees = exitAccountIds.size;

    const totalEmployees = accounts.length;
    
    // New employees in last 30 days
    const newEmployees = accounts.filter(a => {
      if (!a.start_date) return false;
      return new Date(a.start_date) >= thirtyDaysAgo;
    }).length;

    // Religion Distribution
    const religionMap = accounts.reduce((acc: any, curr) => {
      const rel = curr.religion || 'Tidak Diketahui';
      acc[rel] = (acc[rel] || 0) + 1;
      return acc;
    }, {});
    const religionDistribution = Object.entries(religionMap).map(([name, value]) => ({ name, value: value as number }));

    // Department Distribution
    const deptMap = accounts.reduce((acc: any, curr) => {
      const dept = curr.grade || 'Tidak Diketahui';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {});
    const departmentDistribution = Object.entries(deptMap).map(([name, value]) => ({ name: (name as string) || 'Tidak Diketahui', value: value as number }));

    // Gender Ratio
    const genderMap = accounts.reduce((acc: any, curr) => {
      const g = curr.gender || 'Lainnya';
      acc[g] = (acc[g] || 0) + 1;
      return acc;
    }, {});
    const genderRatio = Object.entries(genderMap).map(([name, value]) => ({ name, value: value as number }));

    // Age Distribution
    const ageDistribution = [
      { name: '< 20', value: 0 },
      { name: '20-30', value: 0 },
      { name: '31-40', value: 0 },
      { name: '41-50', value: 0 },
      { name: '> 50', value: 0 },
    ];
    accounts.forEach(a => {
      if (!a.dob) return;
      const age = new Date().getFullYear() - new Date(a.dob).getFullYear();
      if (age < 20) ageDistribution[0].value++;
      else if (age <= 30) ageDistribution[1].value++;
      else if (age <= 40) ageDistribution[2].value++;
      else if (age <= 50) ageDistribution[3].value++;
      else ageDistribution[4].value++;
    });

    // Education Distribution
    const eduMap = accounts.reduce((acc: any, curr) => {
      const edu = curr.last_education || 'Tidak Diketahui';
      acc[edu] = (acc[edu] || 0) + 1;
      return acc;
    }, {});
    const educationDistribution = Object.entries(eduMap).map(([name, value]) => ({ name, value: value as number }));

    // Location Distribution
    const locMap = accounts.reduce((acc: any, curr) => {
      const loc = curr.location?.name || 'Tidak Diketahui';
      acc[loc] = (acc[loc] || 0) + 1;
      return acc;
    }, {});
    const locationDistribution = Object.entries(locMap).map(([name, value]) => ({ name, value: value as number }));

    // Position Distribution
    const posMap = accounts.reduce((acc: any, curr) => {
      const pos = curr.position || 'Tidak Diketahui';
      acc[pos] = (acc[pos] || 0) + 1;
      return acc;
    }, {});
    const positionDistribution = Object.entries(posMap).map(([name, value]) => ({ name, value: value as number }));

    // Contract Type Distribution
    const contractMap = accounts.reduce((acc: any, curr) => {
      const type = curr.employee_type || 'Tidak Diketahui';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    const contractTypeDistribution = Object.entries(contractMap).map(([name, value]) => ({ name, value: value as number }));

    // Tenure Distribution
    const tenureDistribution = [
      { name: '< 1 Thn', value: 0 },
      { name: '1-3 Thn', value: 0 },
      { name: '3-5 Thn', value: 0 },
      { name: '> 5 Thn', value: 0 },
    ];
    accounts.forEach(a => {
      if (!a.start_date) return;
      const years = (new Date().getTime() - new Date(a.start_date).getTime()) / (1000 * 60 * 60 * 24 * 365);
      if (years < 1) tenureDistribution[0].value++;
      else if (years <= 3) tenureDistribution[1].value++;
      else if (years <= 5) tenureDistribution[2].value++;
      else tenureDistribution[3].value++;
    });

    // Health Risk Profile
    const healthMap = accounts.reduce((acc: any, curr) => {
      const risk = curr.health_risk || 'Tidak Diketahui';
      acc[risk] = (acc[risk] || 0) + 1;
      return acc;
    }, {});
    const healthRiskProfile = Object.entries(healthMap).map(([name, value]) => ({ name, value: value as number }));

    return {
      totalEmployees,
      newEmployees,
      exitEmployees,
      genderRatio,
      ageDistribution,
      educationDistribution,
      locationDistribution,
      positionDistribution,
      contractTypeDistribution,
      tenureDistribution,
      healthRiskProfile,
      religionDistribution,
      departmentDistribution,
    };
  },

  async getEmployeesByType(type: 'total' | 'new' | 'exit'): Promise<any[]> {
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (type === 'exit') {
        const { data: activeAccounts } = await supabase
            .from('accounts')
            .select('id')
            .or(`end_date.is.null,end_date.gt.${today}`);
        const activeIds = new Set(activeAccounts?.map(a => a.id) || []);

        const { data: terminations } = await supabase
            .from('account_termination_logs')
            .select('account_id, account:accounts(*)')
            .gte('termination_date', thirtyDaysAgo.toISOString());
        
        const { data: endingContracts } = await supabase
            .from('account_contracts')
            .select('account_id, account:accounts(*)')
            .gte('end_date', thirtyDaysAgo.toISOString())
            .lte('end_date', today);

        const exitAccounts = [
            ...(terminations?.map((t: any) => t.account) || []),
            ...(endingContracts?.map((c: any) => c.account) || [])
        ].filter(a => a && !activeIds.has(a.id));
        
        // Remove duplicates based on ID
        const uniqueExitAccounts = Array.from(new Map(exitAccounts.map((a: any) => [a.id, a])).values());
        
        return uniqueExitAccounts;
    }

    let query = supabase
      .from('accounts')
      .select('*, location:locations(name)')
      .not('access_code', 'ilike', '%SPADMIN%')
      .or(`end_date.is.null,end_date.gt.${today}`);

    if (type === 'new') {
        query = query.gte('start_date', thirtyDaysAgo.toISOString());
    }

    const { data: accounts } = await query;
    return accounts || [];
  },

  async getAttendanceReportSummary(startDate: string, endDate: string): Promise<AttendanceSummary[]> {
    const [
      { data: accounts },
      { data: attendances },
      { data: leaves },
      { data: annualLeaves },
      { data: permissions },
      { data: maternityLeaves },
      { data: overtimes },
      { data: dispensations },
      { data: holidays },
      schedules,
      specialAssignments
    ] = await Promise.all([
      supabase.from('accounts').select('id, full_name, internal_nik, schedule_id, location_id, schedule_type'),
      supabase.from('attendances').select('*').gte('check_in', `${startDate}T00:00:00Z`).lte('check_in', `${endDate}T23:59:59Z`),
      supabase.from('account_leave_requests').select('*').eq('status', 'approved').gte('start_date', startDate).lte('end_date', endDate),
      supabase.from('account_annual_leaves').select('*').eq('status', 'approved').gte('start_date', startDate).lte('end_date', endDate),
      supabase.from('account_permission_requests').select('*').eq('status', 'approved').gte('start_date', startDate).lte('end_date', endDate),
      supabase.from('account_maternity_leaves').select('*').eq('status', 'approved').gte('start_date', startDate).lte('end_date', endDate),
      supabase.from('overtimes').select('*').gte('check_in', `${startDate}T00:00:00Z`).lte('check_in', `${endDate}T23:59:59Z`),
      supabase.from('dispensation_requests').select('*').eq('status', 'APPROVED').gte('date', startDate).lte('date', endDate),
      supabase.from('holidays').select('*').gte('date', startDate).lte('date', endDate),
      scheduleService.getAll(),
      specialAssignmentService.getAssignmentsByRange(startDate, endDate)
    ]);

    if (!accounts) return [];

    // Generate list of dates in range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dateList: string[] = [];
    let curr = new Date(start);
    while (curr <= end) {
      dateList.push(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
    }

    const scheduleMap = new Map(schedules.map(s => [s.id, s]));
    const holidaySchedules = (schedules || []).filter(s => s.type === 3);

    return accounts.map(acc => {
      let present = 0;
      let late = 0;
      let lateMinutes = 0;
      let earlyDeparture = 0;
      let earlyDepartureMinutes = 0;
      let absent = 0;
      let leave = 0;
      let maternityLeave = 0;
      let permission = 0;
      let holiday = 0;
      let specialHoliday = 0;
      let noClockOut = 0;
      let dispensationCount = 0;
      const dailyDetails: any[] = [];

      dateList.forEach(dateStr => {
        const dateObj = new Date(dateStr);
        // Use Local day of week
        const dayOfWeek = new Date(dateObj.toLocaleString('en-US', { timeZone: timeUtils.getLocalTimeZone() })).getDay();

        // 1. Check Attendance
        const att = (attendances || []).find(a => a.account_id === acc.id && a.check_in.startsWith(dateStr));
        
        // 2. Check Special Assignment
        const sa = (specialAssignments || []).find(s => s.accountIds.includes(acc.id) && dateStr >= s.start_date && dateStr <= s.end_date);

        // 3. Check Leave/Permission
        const hasLeave = (leaves || []).some(l => l.account_id === acc.id && dateStr >= l.start_date && dateStr <= l.end_date);
        const hasAnnualLeave = (annualLeaves || []).some(l => l.account_id === acc.id && dateStr >= l.start_date && dateStr <= l.end_date);
        const hasPermission = (permissions || []).some(p => p.account_id === acc.id && dateStr >= p.start_date && dateStr <= p.end_date);
        const hasMaternity = (maternityLeaves || []).some(m => m.account_id === acc.id && dateStr >= m.start_date && dateStr <= m.end_date);
        const hasDispensation = (dispensations || []).some(d => d.account_id === acc.id && d.date === dateStr);

        // 4. Check Holiday
        const schedule = scheduleMap.get(acc.schedule_id);
        const rule = schedule?.rules?.find(r => r.day_of_week === dayOfWeek);
        
        let isWeekendOrHolidayRule = false;
        if (acc.schedule_type === 'Tetap') {
          isWeekendOrHolidayRule = !rule || rule.is_holiday;
        } else {
          isWeekendOrHolidayRule = rule?.is_holiday || false;
        }

        const isSpecHoliday = holidaySchedules.some(hs => 
          dateStr >= (hs.start_date || '') && dateStr <= (hs.end_date || '') &&
          hs.location_ids?.includes(acc.location_id) && 
          !(hs.excluded_account_ids || []).includes(acc.id)
        );

        const isGlobalHoliday = (holidays || []).some(h => h.date === dateStr);
        
        // Special Assignment overrides holidays
        const isHoliday = (isWeekendOrHolidayRule || isSpecHoliday || isGlobalHoliday) && !sa;

        // Determine Status
        let status: 'PRESENT' | 'ABSENT' | 'LEAVE' | 'MATERNITY' | 'PERMISSION' | 'HOLIDAY' | 'SPECIAL_HOLIDAY' | 'WEEKEND' = 'ABSENT';
        if (att && att.check_in_validity === 'TRUE') {
          present++;
          status = 'PRESENT';
          if (att.late_minutes > 0) late++;
          lateMinutes += (att.late_minutes || 0);
          if (att.early_leave_minutes > 0) earlyDeparture++;
          earlyDepartureMinutes += (att.early_leave_minutes || 0);
          if (!att.check_out || att.check_out_validity === 'FALSE' || att.check_out_validity === 'DENY') noClockOut++;
        } else if (hasAnnualLeave || hasLeave) {
          leave++;
          status = 'LEAVE';
        } else if (hasMaternity) {
          maternityLeave++;
          status = 'MATERNITY';
        } else if (hasPermission) {
          permission++;
          status = 'PERMISSION';
        } else if (sa) {
          // If assigned but no attendance, it's absent (Mangkir)
          absent++;
          status = 'ABSENT';
        } else if (isHoliday) {
          holiday++;
          status = 'HOLIDAY';
        } else {
          // If no attendance and not holiday/leave, it's absent
          absent++;
          status = 'ABSENT';
        }

        if (hasDispensation) dispensationCount++;

        dailyDetails.push({
          date: dateStr,
          status,
          isLate: att ? att.late_minutes > 0 : false,
          isEarlyDeparture: att ? att.early_leave_minutes > 0 : false,
          isNoClockOut: att ? (!att.check_out || att.check_out_validity === 'FALSE' || att.check_out_validity === 'DENY') : false
        });
      });

      const totalDays = dateList.length;
      // Attendance Rate: (Hadir + Cuti + Izin) / (Total Hari - Libur)
      const workDays = totalDays - holiday;
      const attendanceRate = workDays > 0 ? ((present + leave + maternityLeave + permission) / workDays) * 100 : 0;

      return {
        accountId: acc.id,
        fullName: acc.full_name,
        nik: acc.internal_nik,
        totalDays,
        present,
        late,
        lateMinutes,
        earlyDeparture,
        earlyDepartureMinutes,
        absent,
        leave,
        maternityLeave,
        permission,
        holiday,
        specialHoliday: 0, // We can refine this if needed
        noClockOut,
        dispensationCount,
        attendanceRate,
        dailyDetails
      };
    });
  },

  async getAttendanceReport(startDate?: string, endDate?: string) {
    let accQuery = supabase.from('accounts').select('*, location:locations(name)');
    let attQuery = supabase.from('attendances').select('*');
    let otQuery = supabase.from('overtimes').select('*');
    let lQuery = supabase.from('account_leave_requests').select('*').eq('status', 'approved');
    let alQuery = supabase.from('account_annual_leaves').select('*').eq('status', 'approved');
    let pQuery = supabase.from('account_permission_requests').select('*').eq('status', 'approved');
    let mlQuery = supabase.from('account_maternity_leaves').select('*').eq('status', 'approved');

    if (startDate) {
      const startIso = `${startDate}T00:00:00Z`;
      attQuery = attQuery.gte('check_in', startIso);
      otQuery = otQuery.gte('check_in', startIso);
      lQuery = lQuery.gte('start_date', startDate);
      alQuery = alQuery.gte('start_date', startDate);
      pQuery = pQuery.gte('start_date', startDate);
      mlQuery = mlQuery.gte('start_date', startDate);
    }
    if (endDate) {
      const endIso = `${endDate}T23:59:59Z`;
      attQuery = attQuery.lte('check_in', endIso);
      otQuery = otQuery.lte('check_in', endIso);
      lQuery = lQuery.lte('end_date', endDate);
      alQuery = alQuery.lte('end_date', endDate);
      pQuery = pQuery.lte('end_date', endDate);
      mlQuery = mlQuery.lte('end_date', endDate);
    }

    const [accounts, attendances, overtimes, leaves, annualLeaves, permissions, maternityLeaves] = await Promise.all([
      accQuery,
      attQuery,
      otQuery,
      lQuery,
      alQuery,
      pQuery,
      mlQuery,
    ]);

    return {
      accounts: accounts.data || [],
      attendances: attendances.data || [],
      overtimes: overtimes.data || [],
      leaves: leaves.data || [],
      annualLeaves: annualLeaves.data || [],
      permissions: permissions.data || [],
      maternityLeaves: maternityLeaves.data || []
    };
  },

  async getFinanceReport(startDate?: string, endDate?: string) {
    let pQuery = supabase.from('payroll_items').select('*, account:accounts(full_name, internal_nik)');
    let otQuery = supabase.from('overtimes').select('*, account:accounts(full_name, internal_nik)');
    let rQuery = supabase.from('reimbursements').select('*, account:accounts(full_name, internal_nik)');
    let cQuery = supabase.from('compensations').select('*, account:accounts(full_name, internal_nik)');

    if (startDate) {
      pQuery = pQuery.gte('created_at', startDate);
      otQuery = otQuery.gte('check_in', startDate);
      rQuery = rQuery.gte('created_at', startDate);
      cQuery = cQuery.gte('created_at', startDate);
    }
    if (endDate) {
      pQuery = pQuery.lte('created_at', endDate);
      otQuery = otQuery.lte('check_in', endDate);
      rQuery = rQuery.lte('created_at', endDate);
      cQuery = cQuery.lte('created_at', endDate);
    }

    const [payrollItems, overtimes, reimbursements, compensations] = await Promise.all([
      pQuery,
      otQuery,
      rQuery,
      cQuery,
    ]);

    return {
      payrollItems: payrollItems.data || [],
      overtimes: overtimes.data || [],
      reimbursements: reimbursements.data || [],
      compensations: compensations.data || []
    };
  },

  async getLeaveReport(startDate?: string, endDate?: string): Promise<LeaveSummary[]> {
    const [
      { data: accounts },
      { data: leaves },
      { data: annualLeaves },
      { data: maternityLeaves },
      { data: permissions }
    ] = await Promise.all([
      supabase.from('accounts').select('id, full_name, internal_nik, leave_quota'),
      supabase.from('account_leave_requests').select('*').eq('status', 'approved'),
      supabase.from('account_annual_leaves').select('*').eq('status', 'approved'),
      supabase.from('account_maternity_leaves').select('*').eq('status', 'approved'),
      supabase.from('account_permission_requests').select('*').eq('status', 'approved')
    ]);

    if (!accounts) return [];
    
    return accounts.map(acc => {
      const usedQuota = (leaves || []).filter(l => l.account_id === acc.id).length + 
                        (annualLeaves || []).filter(l => l.account_id === acc.id).length;
      const maternityUsed = (maternityLeaves || []).filter(m => m.account_id === acc.id).length;
      const permissionCount = (permissions || []).filter(p => p.account_id === acc.id).length;

      return {
        accountId: acc.id,
        fullName: acc.full_name,
        nik: acc.internal_nik,
        totalQuota: acc.leave_quota || 12,
        usedQuota,
        remainingQuota: (acc.leave_quota || 12) - usedQuota,
        carryOverQuota: 0,
        maternityQuota: 90,
        maternityUsed,
        permissionCount
      };
    });
  },

  async getOvertimeReport(startDate?: string, endDate?: string): Promise<OvertimeSummary[]> {
    const [
      { data: accounts },
      { data: overtimes }
    ] = await Promise.all([
      supabase.from('accounts').select('id, full_name, internal_nik'),
      supabase.from('overtimes').select('*').gte('check_in', startDate || '2000-01-01').lte('check_in', endDate || '2100-01-01')
    ]);

    if (!accounts) return [];

    return accounts.map(acc => {
      const accOvertimes = (overtimes || []).filter(o => o.account_id === acc.id);
      const totalMinutes = accOvertimes.reduce((sum, o) => {
        if (!o.check_in || !o.check_out) return sum;
        const diff = new Date(o.check_out).getTime() - new Date(o.check_in).getTime();
        return sum + Math.floor(diff / (1000 * 60));
      }, 0);

      return {
        accountId: acc.id,
        fullName: acc.full_name,
        nik: acc.internal_nik,
        totalOvertimeMinutes: totalMinutes,
        totalOvertimeHours: Number((totalMinutes / 60).toFixed(2)),
        overtimeCount: accOvertimes.length,
        estimatedCost: 0 // Cost calculation would need payroll settings
      };
    });
  }
};
