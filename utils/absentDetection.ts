import { supabase } from '../lib/supabase';

/**
 * Helper untuk mendeteksi masalah presensi (Absen, Terlambat, Pulang Awal)
 * Berfungsi sebagai blueprint logika deteksi untuk berbagai modul.
 * 
 * @param accountId ID Akun Pegawai
 * @param startDate Tanggal Mulai (Objek Date)
 * @param endDate Tanggal Akhir (Objek Date)
 */
export const detectAttendanceIssues = async (accountId: string, startDate: Date, endDate: Date) => {
  
  // Helper: Konversi UTC ke String Tanggal Lokal (YYYY-MM-DD)
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
  const endDateStr = toLocalDate(endDate);

  // 1. Ambil Data Akun
  const { data: account } = await supabase
    .from('accounts')
    .select('location_id, schedule_id, schedule_type')
    .eq('id', accountId)
    .single();

  if (!account) return [];

  // 2. Ambil Data Presensi dalam rentang waktu
  const { data: attendances } = await supabase
    .from('attendances')
    .select('*')
    .eq('account_id', accountId)
    .gte('check_in', startDate.toISOString())
    .lte('check_in', endDate.toISOString());

  // 3. Ambil Data Izin/Cuti/Sakit
  const [
    { data: annualLeaves },
    { data: leaveRequests },
    { data: maternityLeaves },
    { data: permissionRequests },
    { data: submissions }
  ] = await Promise.all([
    supabase.from('account_annual_leaves').select('*').eq('account_id', accountId).eq('status', 'approved').gte('end_date', startDateStr).lte('start_date', endDateStr),
    supabase.from('account_leave_requests').select('*').eq('account_id', accountId).eq('status', 'approved').gte('end_date', startDateStr).lte('start_date', endDateStr),
    supabase.from('account_maternity_leaves').select('*').eq('account_id', accountId).eq('status', 'approved').gte('end_date', startDateStr).lte('start_date', endDateStr),
    supabase.from('account_permission_requests').select('*').eq('account_id', accountId).eq('status', 'approved').gte('end_date', startDateStr).lte('start_date', endDateStr),
    supabase.from('account_submissions').select('*').eq('account_id', accountId).eq('status', 'Disetujui').gte('updated_at', startDate.toISOString())
  ]);

  // 4. Ambil Penugasan Khusus
  const { data: assignmentLinks } = await supabase
    .from('special_assignment_accounts')
    .select('assignment_id')
    .eq('account_id', accountId);
  
  const assignmentIds = assignmentLinks?.map(al => al.assignment_id) || [];
  const { data: assignments } = assignmentIds.length > 0 
    ? await supabase.from('special_assignments').select('*').in('id', assignmentIds).gte('end_date', startDateStr).lte('start_date', endDateStr)
    : { data: [] };

  // 5. Ambil Jadwal Khusus (Tipe 3: Libur, Tipe 4: Kerja)
  const { data: specialSchedules } = await supabase
    .from('schedules')
    .select('*, schedule_locations!inner(location_id)')
    .in('type', [3, 4])
    .eq('schedule_locations.location_id', account.location_id)
    .gte('end_date', startDateStr)
    .lte('start_date', endDateStr);
  
  const filteredSpecialSchedules = specialSchedules?.filter(s => !s.excluded_account_ids?.includes(accountId));

  // 6. Ambil Aturan Jadwal Rutin (Tipe 1)
  let schedule = null;
  if (account.schedule_id) {
    const { data } = await supabase.from('schedules').select('*, schedule_rules(*)').eq('id', account.schedule_id).single();
    schedule = data;
  }

  const results: any[] = [];

  // --- PROSES DETEKSI ---

  // Tahap 1: Cek Presensi yang Ada (Terlambat / Pulang Awal)
  attendances?.forEach(att => {
    const issues: string[] = [];
    if (att.status_in === 'Terlambat') issues.push('TERLAMBAT');
    if (att.status_out === 'Pulang Awal') issues.push('PULANG_AWAL');

    if (issues.length > 0) {
      results.push({
        date: toLocalDate(att.check_in, att.in_timezone || 'Asia/Jakarta'),
        presence_id: att.id,
        issues,
        scheduleName: att.schedule_name_snapshot || schedule?.name || 'Jadwal Reguler'
      });
    }
  });

  // Tahap 2: Cek Absen Kerja (Iterasi Tanggal)
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  for (let i = 0; i <= diffDays; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    const dateStr = toLocalDate(d);

    // Jika sudah ada presensi di tanggal ini, lewati pengecekan absen
    const hasAttendance = attendances?.some(att => toLocalDate(att.check_in, att.in_timezone || 'Asia/Jakarta') === dateStr);
    if (hasAttendance) continue;

    // a. Cek Penugasan Khusus
    const assignment = assignments?.find(a => dateStr >= a.start_date && dateStr <= a.end_date);
    if (assignment) {
      results.push({ date: dateStr, presence_id: null, issues: ['ABSEN_KERJA'], scheduleName: assignment.title });
      continue;
    }

    // b. Cek Jadwal Kerja Khusus (Tipe 4)
    const specialWorkDay = filteredSpecialSchedules?.find(s => s.type === 4 && dateStr >= s.start_date && dateStr <= s.end_date);
    if (specialWorkDay) {
      results.push({ date: dateStr, presence_id: null, issues: ['ABSEN_KERJA'], scheduleName: specialWorkDay.name });
      continue;
    }

    // c. Cek Jadwal Libur Khusus (Tipe 3)
    const specialHoliday = filteredSpecialSchedules?.find(s => s.type === 3 && dateStr >= s.start_date && dateStr <= s.end_date);
    if (specialHoliday) continue;

    // d. Cek Izin/Cuti/Sakit
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

    // e. Cek Aturan Hari Kerja Rutin
    if (schedule?.type === 1) {
      // Jadwal Reguler: Cek is_holiday di schedule_rules
      const [y, m, d_num] = dateStr.split('-').map(Number);
      const dayOfWeek = new Date(y, m - 1, d_num).getDay();
      const rule = schedule.schedule_rules?.find((r: any) => r.day_of_week === dayOfWeek);
      
      if (!rule || rule.is_holiday) continue;
      
      results.push({ date: dateStr, presence_id: null, issues: ['ABSEN_KERJA'], scheduleName: schedule.name });
    } else {
      // Shift / Fleksibel / Dinamis: Dianggap hari kerja jika tidak ada presensi
      results.push({ 
        date: dateStr, 
        presence_id: null, 
        issues: ['ABSEN_KERJA'], 
        scheduleName: schedule?.name || account.schedule_type || 'Jadwal Non-Reguler' 
      });
    }
  }

  // Urutkan berdasarkan tanggal terbaru
  return results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};
