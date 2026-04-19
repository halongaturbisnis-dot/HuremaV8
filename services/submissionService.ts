import { supabase } from '../lib/supabase';
import { Submission, SubmissionInput, SubmissionStatus, Attendance } from '../types';

const sanitizePayload = (payload: any) => {
  const sanitized = { ...payload };
  Object.keys(sanitized).forEach(key => {
    if (sanitized[key] === '' || sanitized[key] === undefined) {
      sanitized[key] = null;
    }
  });
  return sanitized;
};

export const submissionService = {
  async getAll() {
    const { data, error } = await supabase
      .from('account_submissions')
      .select(`
        *,
        account:accounts!account_id(
          full_name, 
          internal_nik, 
          photo_google_id, 
          grade, 
          position, 
          location_id,
          location:locations(name)
        )
      `, { count: 'exact' }) // Tambahkan opsi untuk memastikan hasil fresh
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Submission[];
  },

  async getByType(type: string) {
    const { data, error } = await supabase
      .from('account_submissions')
      .select(`
        *,
        account:accounts!account_id(
          full_name, 
          internal_nik, 
          photo_google_id, 
          grade, 
          position, 
          location_id,
          location:locations(name)
        )
      `)
      .eq('type', type)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Submission[];
  },

  async getByTypePaged(type: string, page: number = 1, limit: number = 50, status: string = 'ALL', search: string = '') {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Use !inner to force an inner join for location filtering and searching
    const selectStr = `*, account:accounts!account_id!inner(full_name, internal_nik, photo_google_id, grade, position, location_id, location:locations(name)), verifier:accounts!verifier_id(full_name, photo_google_id)`;

    let query = supabase
      .from('account_submissions')
      .select(selectStr, { count: 'exact' })
      .eq('type', type);

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

    if (status !== 'ALL') {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,internal_nik.ilike.%${search}%`, { foreignTable: 'accounts' });
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;
    return {
      data: data as Submission[],
      totalCount: count || 0
    };
  },

  async getSubmissionsByRange(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('account_submissions')
      .select('*')
      .gte('created_at', `${startDate}T00:00:00Z`)
      .lte('created_at', `${endDate}T23:59:59Z`)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data as Submission[];
  },

  async getByAccountId(accountId: string) {
    const { data, error } = await supabase
      .from('account_submissions')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Submission[];
  },

  async create(input: SubmissionInput) {
    const sanitized = sanitizePayload(input);
    const { data, error } = await supabase
      .from('account_submissions')
      .insert([sanitized])
      .select()
      .single();
    
    if (error) throw error;
    return data as Submission;
  },

  async verify(id: string, status: SubmissionStatus, verifierId: string, notes?: string) {
    const { data: submission, error: fetchError } = await supabase
      .from('account_submissions')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const { data, error } = await supabase
      .from('account_submissions')
      .update({
        status,
        verifier_id: verifierId,
        verified_at: new Date().toISOString(),
        verification_notes: notes
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;

    // Logic khusus setelah disetujui (Post-Approval Automation)
    if (status === 'Disetujui') {
      if (submission.type === 'Cuti') {
        const { duration_days } = submission.submission_data;
        if (duration_days) {
          // Potong kuota cuti di profil akun
          const { data: account } = await supabase.from('accounts').select('leave_quota').eq('id', submission.account_id).single();
          if (account) {
            await supabase.from('accounts').update({ 
              leave_quota: Math.max(0, account.leave_quota - duration_days) 
            }).eq('id', submission.account_id);
          }
        }
      } else if (submission.type === 'Libur Mandiri') {
        const { leave_request_id } = submission.submission_data;
        if (leave_request_id) {
          // Sinkronisasi status ke tabel libur mandiri
          await supabase.from('account_leave_requests')
            .update({ status: 'approved', updated_at: new Date().toISOString() })
            .eq('id', leave_request_id);
        }
      } else if (submission.type === 'Cuti Tahunan') {
        const { annual_leave_id, start_date, end_date } = submission.submission_data;
        if (annual_leave_id) {
          // Sinkronisasi status ke tabel cuti tahunan
          const { data: current } = await supabase.from('account_annual_leaves').select('negotiation_data').eq('id', annual_leave_id).single();
          const newHistory = [...(current?.negotiation_data || []), {
            role: 'admin',
            start_date: submission.submission_data.start_date,
            end_date: submission.submission_data.end_date,
            reason: notes || 'Disetujui via Modul Pengajuan',
            timestamp: new Date().toISOString()
          }];
          await supabase.from('account_annual_leaves')
            .update({ 
              status: 'approved', 
              negotiation_data: newHistory,
              updated_at: new Date().toISOString() 
            })
            .eq('id', annual_leave_id);

          // Potong kuota dengan logika FIFO
          const start = new Date(start_date);
          const end = new Date(end_date);
          const diffTime = Math.abs(end.getTime() - start.getTime());
          const duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

          const { data: account } = await supabase
            .from('accounts')
            .select('leave_quota, carry_over_quota')
            .eq('id', submission.account_id)
            .single();

          if (account) {
            let remainingDuration = duration;
            let newCarryOver = account.carry_over_quota || 0;
            let newLeaveQuota = account.leave_quota || 0;

            if (newCarryOver > 0) {
              const deductFromCarry = Math.min(newCarryOver, remainingDuration);
              newCarryOver -= deductFromCarry;
              remainingDuration -= deductFromCarry;
            }

            if (remainingDuration > 0) {
              newLeaveQuota = Math.max(0, newLeaveQuota - remainingDuration);
            }

            await supabase.from('accounts').update({
              leave_quota: newLeaveQuota,
              carry_over_quota: newCarryOver
            }).eq('id', submission.account_id);
          }
        }
      } else if (submission.type === 'Izin') {
        const { permission_request_id } = submission.submission_data;
        if (permission_request_id) {
          // Sinkronisasi status ke tabel izin
          const { data: current } = await supabase.from('account_permission_requests').select('negotiation_data').eq('id', permission_request_id).single();
          const newHistory = [...(current?.negotiation_data || []), {
            role: 'admin',
            start_date: submission.submission_data.start_date,
            end_date: submission.submission_data.end_date,
            reason: notes || 'Disetujui via Modul Pengajuan',
            timestamp: new Date().toISOString()
          }];
          await supabase.from('account_permission_requests')
            .update({ 
              status: 'approved', 
              negotiation_data: newHistory,
              updated_at: new Date().toISOString() 
            })
            .eq('id', permission_request_id);
        }
      } else if (submission.type === 'Cuti Melahirkan') {
        const { maternity_leave_id, start_date, end_date } = submission.submission_data;
        if (maternity_leave_id) {
          // Sinkronisasi status ke tabel cuti melahirkan
          const { data: current } = await supabase.from('account_maternity_leaves').select('negotiation_data').eq('id', maternity_leave_id).single();
          const newHistory = [...(current?.negotiation_data || []), {
            role: 'admin',
            start_date: submission.submission_data.start_date,
            end_date: submission.submission_data.end_date,
            reason: notes || 'Disetujui via Modul Pengajuan',
            timestamp: new Date().toISOString()
          }];
          await supabase.from('account_maternity_leaves')
            .update({ 
              status: 'approved', 
              negotiation_data: newHistory,
              updated_at: new Date().toISOString() 
            })
            .eq('id', maternity_leave_id);

          // Potong kuota melahirkan
          const start = new Date(start_date);
          const end = new Date(end_date);
          const diffTime = Math.abs(end.getTime() - start.getTime());
          const duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

          const { data: account } = await supabase
            .from('accounts')
            .select('maternity_leave_quota')
            .eq('id', submission.account_id)
            .single();

          if (account) {
            const newQuota = Math.max(0, (account.maternity_leave_quota || 0) - duration);
            await supabase.from('accounts').update({
              maternity_leave_quota: newQuota
            }).eq('id', submission.account_id);
          }
        }
      }
      // Tambahkan logic otomatisasi lain di sini (misal: insert log lembur otomatis)
    } else if (status === 'Ditolak') {
      if (submission.type === 'Libur Mandiri') {
        const { leave_request_id } = submission.submission_data;
        if (leave_request_id) {
          // Sinkronisasi status ke tabel libur mandiri
          await supabase.from('account_leave_requests')
            .update({ status: 'rejected', updated_at: new Date().toISOString() })
            .eq('id', leave_request_id);
        }
      } else if (submission.type === 'Cuti Tahunan') {
        const { annual_leave_id } = submission.submission_data;
        if (annual_leave_id) {
          const { data: current } = await supabase.from('account_annual_leaves').select('negotiation_data').eq('id', annual_leave_id).single();
          const newHistory = [...(current?.negotiation_data || []), {
            role: 'admin',
            start_date: submission.submission_data.start_date,
            end_date: submission.submission_data.end_date,
            reason: notes || 'Ditolak via Modul Pengajuan',
            timestamp: new Date().toISOString()
          }];
          await supabase.from('account_annual_leaves')
            .update({ 
              status: 'rejected', 
              negotiation_data: newHistory,
              updated_at: new Date().toISOString() 
            })
            .eq('id', annual_leave_id);
        }
      } else if (submission.type === 'Izin') {
        const { permission_request_id } = submission.submission_data;
        if (permission_request_id) {
          const { data: current } = await supabase.from('account_permission_requests').select('negotiation_data').eq('id', permission_request_id).single();
          const newHistory = [...(current?.negotiation_data || []), {
            role: 'admin',
            start_date: submission.submission_data.start_date,
            end_date: submission.submission_data.end_date,
            reason: notes || 'Ditolak via Modul Pengajuan',
            timestamp: new Date().toISOString()
          }];
          await supabase.from('account_permission_requests')
            .update({ 
              status: 'rejected', 
              negotiation_data: newHistory,
              updated_at: new Date().toISOString() 
            })
            .eq('id', permission_request_id);
        }
      } else if (submission.type === 'Cuti Melahirkan') {
        const { maternity_leave_id } = submission.submission_data;
        if (maternity_leave_id) {
          const { data: current } = await supabase.from('account_maternity_leaves').select('negotiation_data').eq('id', maternity_leave_id).single();
          const newHistory = [...(current?.negotiation_data || []), {
            role: 'admin',
            start_date: submission.submission_data.start_date,
            end_date: submission.submission_data.end_date,
            reason: notes || 'Ditolak via Modul Pengajuan',
            timestamp: new Date().toISOString()
          }];
          await supabase.from('account_maternity_leaves')
            .update({ 
              status: 'rejected', 
              negotiation_data: newHistory,
              updated_at: new Date().toISOString() 
            })
            .eq('id', maternity_leave_id);
        }
      }
    }

    return data as Submission;
  },

  async verifyAttendance(id: string, type: 'IN' | 'OUT', status: 'TRUE' | 'DENY', verifierId: string, notes?: string) {
    const updatePayload: any = {};
    if (type === 'IN') {
      updatePayload.check_in_validity = status;
    } else {
      updatePayload.check_out_validity = status;
    }
    
    const { data, error } = await supabase
      .from('attendances')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Attendance;
  },

  async delete(id: string) {
    // 1. Ambil data submission untuk pengecekan sinkronisasi
    const { data: submission } = await supabase
      .from('account_submissions')
      .select('type, submission_data')
      .eq('id', id)
      .single();

    // 2. Jika Libur Mandiri, hapus juga record aslinya
    if (submission?.type === 'Libur Mandiri' && submission.submission_data?.leave_request_id) {
      try {
        await supabase
          .from('account_leave_requests')
          .delete()
          .eq('id', submission.submission_data.leave_request_id);
      } catch (leaveError) {
        console.warn('Failed to cleanup associated leave request:', leaveError);
      }
    }

    // 3. Hapus record submission
    const { error } = await supabase
      .from('account_submissions')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  async getPendingCounts() {
    let query = supabase
      .from('account_submissions')
      .select('type, account:accounts!account_id!inner(location_id)')
      .ilike('status', 'pending');
    
    // Apply Admin Location Scope
    const { authService } = await import('./authService');
    const user = authService.getCurrentUser();
    
    // Scoping for submissions
    if (user) {
      const scopes = [user.hr_scope, user.performance_scope, user.finance_scope].filter(Boolean);
      const limitedScopes = scopes.filter(s => s?.mode === 'limited');
      
      console.log('Diagnostic - User Scopes:', { 
        userId: user.id,
        hr_scope: user.hr_scope, 
        performance_scope: user.performance_scope, 
        limitedScopes: limitedScopes 
      });
      
      if (limitedScopes.length > 0) {
        const allAllowedIds = Array.from(new Set(limitedScopes.flatMap(s => s?.location_ids || [])));
        if (allAllowedIds.length > 0) {
          console.log('Diagnostic - Applying ID filter:', allAllowedIds);
          query = query.in('account.location_id', allAllowedIds);
        } else {
          console.warn('Diagnostic - Scopes are limited but no location_ids found!');
        }
      }
    }

    const { data: submissionsData, error: submissionsError } = await query;
    
    if (submissionsError) throw submissionsError;                
    
    const counts: Record<string, number> = {
      'Libur Mandiri': 0,
      'Lembur': 0,
      'Izin': 0,
      'Cuti Tahunan': 0,
      'Cuti Melahirkan': 0,
      'Presensi Luar': 0
    };

    submissionsData?.forEach(item => {
      counts[item.type] = (counts[item.type] || 0) + 1;
    });

    // Fetch Pending "Presensi Luar" from attendances table
    let attendanceQuery = supabase
      .from('attendances')
      .select('check_in_validity, check_out_validity, account:accounts!account_id!inner(location_id)')
      .or('check_in_validity.eq.FALSE,check_out_validity.eq.FALSE');

    if (user) {
      const scopes = [user.hr_scope, user.performance_scope, user.finance_scope].filter(Boolean);
      const limitedScopes = scopes.filter(s => s?.mode === 'limited');
      
      if (limitedScopes.length > 0) {
        const allAllowedIds = Array.from(new Set(limitedScopes.flatMap(s => s?.location_ids || [])));
        if (allAllowedIds.length > 0) {
          attendanceQuery = attendanceQuery.in('account.location_id', allAllowedIds);
        }
      }
    }

    const { data: attendanceData, error: attendanceError } = await attendanceQuery;
    if (!attendanceError && attendanceData) {
      let totalPendingLuar = 0;
      attendanceData.forEach(att => {
        if (att.check_in_validity === 'FALSE') totalPendingLuar++;
        if (att.check_out_validity === 'FALSE') totalPendingLuar++;
      });
      counts['Presensi Luar'] = totalPendingLuar;
    }

    return counts;
  }
};