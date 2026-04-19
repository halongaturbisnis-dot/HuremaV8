import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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
    // Initial fetch for pending count
    const fetchInitialCount = async () => {
      const { count } = await supabase
        .from('account_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'Libur Mandiri')
        .eq('status', 'Pending');
      setPendingCount(count || 0);
    };

    fetchInitialCount();

    // Listen for changes
    const channel = supabase
      .channel('pending-count-channel')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'account_submissions' 
      }, (payload) => {
        // Simple logic: if record is Libur Mandiri, update count
        // Note: This is an approximation. For absolute accuracy, consider a more complex event processor.
        if (payload.new?.type === 'Libur Mandiri' || payload.old?.type === 'Libur Mandiri') {
          fetchInitialCount();
        }
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
