import { supabase } from '../lib/supabase';
import { DispensationRequest, DispensationRequestInput } from '../types';

export const dispensationService = {
  async getAll() {
    let query = supabase
      .from('dispensation_requests')
      .select('*, account:accounts!inner(full_name, internal_nik, photo_google_id, location_id)');

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
      .select('*, account:accounts(full_name, internal_nik, photo_google_id, location_id)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as DispensationRequest;
  },

  async create(input: DispensationRequestInput) {
    const { data, error } = await supabase
      .from('dispensation_requests')
      .insert([input])
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
            check_in_validity: 'VALID',
            check_out_validity: 'VALID',
            check_in_type: 'MANUAL',
            check_out_type: 'MANUAL',
            schedule_name_snapshot: 'DISPENSASI ABSEN',
            late_minutes: 0,
            early_departure_minutes: 0
          }]);
        } else if (request.presence_id) {
          // UPDATE existing attendance record
          const updateData: any = {};
          if (issue.type === 'TERLAMBAT') {
            updateData.status_in = 'Tepat Waktu';
            updateData.late_minutes = 0;
          } else if (issue.type === 'PULANG_AWAL') {
            updateData.status_out = 'Tepat Waktu';
            updateData.early_departure_minutes = 0;
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
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 31);

    // 1. Get attendances in range
    const { data: attendances } = await supabase
      .from('attendances')
      .select('*')
      .eq('account_id', accountId)
      .gte('check_in', thirtyDaysAgo.toISOString())
      .lte('check_in', today.toISOString());

    // 2. Get existing requests to avoid duplicates
    const { data: existingRequests } = await supabase
      .from('dispensation_requests')
      .select('date, presence_id')
      .eq('account_id', accountId);

    const requestedDates = new Set(existingRequests?.map(r => r.date));
    const requestedPresenceIds = new Set(existingRequests?.filter(r => r.presence_id).map(r => r.presence_id));

    const eligible: any[] = [];

    // Check existing attendances for late/early
    attendances?.forEach(att => {
      if (requestedPresenceIds.has(att.id)) return;

      const issues: string[] = [];
      if (att.status_in === 'Terlambat') issues.push('TERLAMBAT');
      if (att.status_out === 'Pulang Awal') issues.push('PULANG_AWAL');

      if (issues.length > 0) {
        eligible.push({
          date: att.check_in.split('T')[0],
          presence_id: att.id,
          issues
        });
      }
    });

    // For "Absen Kerja", we would ideally compare with schedule
    // For now, let's allow manual input for dates without attendance in last 31 days
    // that are not in requestedDates
    for (let d = new Date(thirtyDaysAgo); d <= today; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      if (requestedDates.has(dateStr)) continue;
      
      const hasAttendance = attendances?.some(att => att.check_in.startsWith(dateStr));
      if (!hasAttendance) {
        eligible.push({
          date: dateStr,
          presence_id: null,
          issues: ['ABSEN_KERJA']
        });
      }
    }

    return eligible.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },
};
