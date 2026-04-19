import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { authService } from '../services/authService';

interface PendingLeaveContextType {
  pendingCount: number;
  incrementCount: () => void;
  decrementCount: () => void;
  setCount: (count: number) => void;
}

const PendingLeaveContext = createContext<PendingLeaveContextType | undefined>(undefined);

export const PendingLeaveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    const fetchInitialCount = async () => {
      const user = authService.getCurrentUser();
      
      let query = supabase
        .from('account_submissions')
        .select('account:accounts!account_id(location_id)', { count: 'exact', head: true })
        .eq('type', 'Libur Mandiri')
        .eq('status', 'Pending');
      
      // Apply Admin Location Scope, matching logic in submissionService.ts
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

      const { count } = await query;
      setPendingCount(count || 0);
    };

    fetchInitialCount();

    const channel = supabase
      .channel('pending-count-channel')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'account_submissions' 
      }, () => {
        fetchInitialCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <PendingLeaveContext.Provider value={{ 
      pendingCount, 
      incrementCount: () => setPendingCount(c => c + 1),
      decrementCount: () => setPendingCount(c => Math.max(0, c - 1)),
      setCount: setPendingCount
    }}>
      {children}
    </PendingLeaveContext.Provider>
  );
};

export const usePendingLeave = () => {
  const context = useContext(PendingLeaveContext);
  if (!context) throw new Error('usePendingLeave must be used within PendingLeaveProvider');
  return context;
};
