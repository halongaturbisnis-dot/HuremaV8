
import { supabase } from '../lib/supabase';
import { SpecialAssignment } from '../types';

export const specialAssignmentService = {
  async getAll(): Promise<SpecialAssignment[]> {
    const { data, error } = await supabase
      .from('special_assignments')
      .select(`
        *,
        accounts:special_assignment_accounts(
          account:accounts(id, full_name, internal_nik)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return (data || []).map(item => ({
      ...item,
      accounts: item.accounts?.map((a: any) => a.account).filter(Boolean) || []
    }));
  },

  async getActiveForAccount(accountId: string, date: string): Promise<SpecialAssignment | null> {
    const { data, error } = await supabase
      .from('special_assignments')
      .select(`
        *,
        special_assignment_accounts!inner(account_id)
      `)
      .eq('special_assignment_accounts.account_id', accountId)
      .lte('start_date', date)
      .gte('end_date', date)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getById(id: string): Promise<SpecialAssignment | null> {
    const { data, error } = await supabase
      .from('special_assignments')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getActiveForDate(date: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('special_assignments')
      .select(`
        *,
        accounts:special_assignment_accounts(account_id)
      `)
      .lte('start_date', date)
      .gte('end_date', date);

    if (error) throw error;
    return data || [];
  },

  async getAssignmentsByRange(startDate: string, endDate: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('special_assignments')
      .select(`
        *,
        accounts:special_assignment_accounts(account_id)
      `)
      .lte('start_date', endDate)
      .gte('end_date', startDate);

    if (error) throw error;
    return (data || []).map(item => ({
      ...item,
      accountIds: item.accounts?.map((a: any) => a.account_id) || []
    }));
  },

  async getLinkedAccounts(assignmentId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('special_assignment_accounts')
      .select('*')
      .eq('assignment_id', assignmentId);

    if (error) throw error;
    return data || [];
  },

  async create(assignment: Partial<SpecialAssignment>, accountIds: string[]) {
    const { data, error } = await supabase
      .from('special_assignments')
      .insert([assignment])
      .select()
      .single();

    if (error) throw error;

    if (accountIds.length > 0) {
      const junctionData = accountIds.map(accId => ({
        assignment_id: data.id,
        account_id: accId
      }));
      const { error: junctionError } = await supabase
        .from('special_assignment_accounts')
        .insert(junctionData);
      
      if (junctionError) throw junctionError;
    }

    return data;
  },

  async update(id: string, assignment: Partial<SpecialAssignment>, accountIds: string[]) {
    const { error } = await supabase
      .from('special_assignments')
      .update(assignment)
      .eq('id', id);

    if (error) throw error;

    // Update accounts
    const { error: deleteError } = await supabase
      .from('special_assignment_accounts')
      .delete()
      .eq('assignment_id', id);
    
    if (deleteError) throw deleteError;

    if (accountIds.length > 0) {
      const junctionData = accountIds.map(accId => ({
        assignment_id: id,
        account_id: accId
      }));
      const { error: junctionError } = await supabase
        .from('special_assignment_accounts')
        .insert(junctionData);
      
      if (junctionError) throw junctionError;
    }
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('special_assignments')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};
