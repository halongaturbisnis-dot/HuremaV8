import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { submissionService } from '../services/submissionService';

interface PendingSubmissionsContextType {
  pendingSubmissions: Record<string, number>;
  refresh: () => void;
}

const PendingSubmissionsContext = createContext<PendingSubmissionsContextType | undefined>(undefined);

export const PendingSubmissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pendingSubmissions, setPendingSubmissions] = useState<Record<string, number>>({});

  const fetchCounts = async () => {
    try {
      const counts = await submissionService.getPendingCounts();
      setPendingSubmissions(counts);
    } catch (error) {
      console.error('Error fetching pending counts:', error);
    }
  };

  useEffect(() => {
    fetchCounts();
    
    // Listen for changes on submissions and attendances (for Presensi Luar)
    const channel = supabase
      .channel('pending-counts-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'account_submissions' }, fetchCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendances' }, fetchCounts)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Realtime: Subscribed to pending counts');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Realtime: Error subscribing to pending counts');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <PendingSubmissionsContext.Provider value={{ pendingSubmissions, refresh: fetchCounts }}>
      {children}
    </PendingSubmissionsContext.Provider>
  );
};

export const usePendingSubmissions = () => {
  const context = useContext(PendingSubmissionsContext);
  if (!context) throw new Error('usePendingSubmissions must be used within PendingSubmissionsProvider');
  return context;
};
