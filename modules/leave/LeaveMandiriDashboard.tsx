
import React, { useState, useEffect } from 'react';
import { 
  Coffee, 
  Plus, 
  ArrowLeft, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  RefreshCcw,
  Eye
} from 'lucide-react';
import { leaveService } from '../../services/leaveService';
import { LeaveRequest, AuthUser } from '../../types';
import { supabase } from '../../lib/supabase';
import Swal from 'sweetalert2';
import LeaveMandiriForm from './components/LeaveMandiriForm';
import LeaveDetailModalUser from './components/LeaveDetailModalUser';
import { formatDateID } from '../../utils/dateFormatter';
import { listCardStyleGuide } from '../../utils/listCardStyleGuide';
import { MainButtonStyle } from '../../utils/mainButtonStyle';

interface LeaveMandiriDashboardProps {
  user: AuthUser;
  setActiveTab?: (tab: string) => void;
  onAjukan?: (request?: LeaveRequest) => void;
  onRequestsLoaded?: (requests: LeaveRequest[]) => void;
}

const LeaveMandiriDashboard: React.FC<LeaveMandiriDashboardProps> = ({ 
  user, 
  setActiveTab,
  onAjukan,
  onRequestsLoaded
}) => {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingRequest, setEditingRequest] = useState<LeaveRequest | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchRequests();

      // Realtime subscription for User - Silent updates
      const channel = supabase
        .channel(`user-leave-mandiri-${user.id}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'account_leave_requests',
          filter: `account_id=eq.${user.id}`
        }, () => {
          fetchRequests(true);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id]);

  const fetchRequests = async (isSilent = false) => {
    try {
      if (!isSilent) setIsLoading(true);
      const data = await leaveService.getByAccountId(user!.id);
      setRequests(data);
      if (onRequestsLoaded) onRequestsLoaded(data);
    } catch (error) {
      console.error(error);
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Hapus pengajuan?',
      text: "Data akan dihapus permanen.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      try {
        await leaveService.delete(id);
        setRequests(prev => prev.filter(r => r.id !== id));
        Swal.fire({
          title: 'Terhapus',
          text: 'Pengajuan telah dihapus.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
      } catch (error) {
        Swal.fire('Gagal', 'Gagal menghapus data.', 'error');
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit"><CheckCircle2 size={10} /> Disetujui</span>;
      case 'rejected':
        return <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit"><XCircle size={10} /> Ditolak</span>;
      default:
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit"><Clock size={10} /> Pending</span>;
    }
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
      <div className="w-12 h-12 border-4 border-gray-200 border-t-[#006E62] rounded-full animate-spin mb-4"></div>
      <p className="text-xs font-bold uppercase tracking-widest">Memuat Data Libur...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-white pb-24 animate-in fade-in duration-500">
      {/* Header */}
      <div className="px-6 pt-8 pb-4 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-30">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (setActiveTab) {
                setActiveTab('dashboard');
              } else {
                // Fallback for standalone mode or directly mounted
                window.history.back();
              }
            }}
            className="w-10 h-10 bg-gray-50 text-gray-400 rounded-xl flex items-center justify-center active:scale-90 transition-all font-bold"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-lg font-bold text-gray-800 tracking-tight">Libur Mandiri</h2>
          </div>
        </div>
        <button 
          onClick={() => {
            if (onAjukan) onAjukan();
          }}
          className={`${MainButtonStyle} !w-fit !h-10 px-5 !rounded-xl !text-xs shrink-0`}
        >
         Ajukan
        </button>
      </div>

      {/* List View - Compact List like Presence History */}
      <div className="px-5 space-y-1 mt-6">
        {requests.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-gray-300">
            <Coffee size={48} className="mb-4 opacity-20" />
            <p className="text-xs font-bold uppercase tracking-widest">Belum ada pengajuan</p>
          </div>
        ) : (
          [...requests].sort((a, b) => b.start_date.localeCompare(a.start_date)).map((req) => (
            <button 
              key={req.id} 
              onClick={() => setSelectedRequest(req)}
              className={`${listCardStyleGuide.container} flex-col items-stretch gap-3`}
            >
              {/* Line 1: Date (Left) | Status (Right) */}
              <div className="flex items-center justify-between w-full">
                <p className={listCardStyleGuide.title}>
                  {formatDateID(req.start_date)}
                </p>
                {getStatusBadge(req.status)}
              </div>

              {/* Line 2: Description (Left) */}
              <p className={`${listCardStyleGuide.subtitle} text-left opacity-80 !normal-case font-normal`}>
                {req.description || 'Tidak ada keterangan'}
              </p>

              {/* Line 3: Actions (Right) */}
              <div className="flex items-center justify-end w-full gap-2 mt-1">
                {req.status === 'rejected' && (
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onAjukan) onAjukan(req);
                    }}
                    className={`${listCardStyleGuide.actionButton} !bg-transparent !border-none !shadow-none text-[#006E62] px-0`}
                    title="Ajukan Ulang"
                  >
                    <RefreshCcw size={16} />
                  </div>
                )}
                {(req.status === 'pending' || req.status === 'rejected') && (
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(req.id);
                    }}
                    className={`${listCardStyleGuide.actionButton} !bg-transparent !border-none !shadow-none text-rose-500 px-0`}
                    title="Hapus"
                  >
                    <Trash2 size={16} />
                  </div>
                )}
              </div>
            </button>
          ))
        )}
      </div>

      {/* Detail Modal */}
      {selectedRequest && (
        <LeaveDetailModalUser 
          leave={selectedRequest}
          onClose={() => setSelectedRequest(null)}
        />
      )}
    </div>
  );
};

export default LeaveMandiriDashboard;
