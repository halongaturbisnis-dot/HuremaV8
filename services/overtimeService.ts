
import { supabase } from '../lib/supabase';
import { timeUtils } from '../lib/timeUtils';
import { Overtime, OvertimeInput } from '../types';

const sanitizePayload = (payload: any) => {
  const sanitized = { ...payload };
  Object.keys(sanitized).forEach(key => {
    if (sanitized[key] === '' || sanitized[key] === undefined) {
      sanitized[key] = null;
    }
  });
  return sanitized;
};

export const overtimeService = {
  async getTodayOvertime(accountId: string, timeZone?: string) {
    const startOfToday = timeUtils.getStartOfLocalDayInUTC(timeZone);
    const { data, error } = await supabase
      .from('overtimes')
      .select('*')
      .eq('account_id', accountId)
      .gte('created_at', startOfToday)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) throw error;
    return data as Overtime | null;
  },

  /**
   * Memastikan user tidak sedang dalam sesi lembur (Mutual Exclusion)
   * Mengecek secara global apakah ada sesi yang belum di-checkout
   */
  async isOvertimeSessionActive(accountId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('overtimes')
      .select('id')
      .eq('account_id', accountId)
      .is('check_out', null)
      .limit(1)
      .maybeSingle();
    
    if (error) return false;
    return !!data;
  },

  async checkIn(input: Partial<OvertimeInput>) {
    const sanitized = sanitizePayload(input);
    const { data, error } = await supabase
      .from('overtimes')
      .insert([sanitized])
      .select()
      .single();
    
    if (error) throw error;
    return data as Overtime;
  },

  async checkOut(id: string, input: Partial<OvertimeInput>) {
    if (!id) throw new Error("ID lembur tidak valid untuk proses check-out.");
    const sanitized = sanitizePayload(input);
    const { data, error } = await supabase
      .from('overtimes')
      .update(sanitized)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Overtime;
  },

  async getActiveOvertime(accountId: string) {
    const { data, error } = await supabase
      .from('overtimes')
      .select('*')
      .eq('account_id', accountId)
      .is('check_out', null)
      .limit(1)
      .maybeSingle();
    
    if (error) return null;
    return data as Overtime | null;
  },

  async getRecentHistory(accountId: string, limit = 31) {
    const { data, error } = await supabase
      .from('overtimes')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data as Overtime[];
  },
  
  async getOvertimeByRange(startDate: string, endDate: string) {
    let query = supabase
      .from('overtimes')
      .select('*, account:accounts!account_id!inner(location_id, photo_google_id)')
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

    const { data, error } = await query;
    
    if (error) throw error;
    return data as Overtime[];
  }
};
