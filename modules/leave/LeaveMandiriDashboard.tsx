
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
import { formatDateID } from '../../utils/dateFormatter';

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
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-tight">Riwayat & Pengajuan</p>
          </div>
        </div>
        <button 
          onClick={() => {
            if (onAjukan) onAjukan();
          }}
          className="bg-[#006E62] text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#006E62]/20 active:scale-90 transition-all shrink-0 text-xs font-black uppercase tracking-widest"
        >
          <Plus size={18} /> Ajukan
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
            <div 
              key={req.id} 
              className="bg-white border-b border-gray-50 p-4 flex items-center justify-between gap-4 active:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  req.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                  req.status === 'rejected' ? 'bg-rose-50 text-rose-600' :
                  'bg-blue-50 text-blue-600'
                }`}>
                  <Calendar size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-gray-800 truncate leading-tight">
                    {formatDateID(req.start_date)}
                  </p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5 truncate">
                    {req.description || 'Tanpa keterangan'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="flex flex-col items-end">
                  {getStatusBadge(req.status)}
                </div>
                
                <div className="flex items-center gap-1 border-l border-gray-100 pl-3">
                  {req.status === 'rejected' && (
                    <button 
                      onClick={() => {
                        if (onAjukan) onAjukan(req);
                      }}
                      className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center active:scale-90 transition-all shadow-sm"
                      title="Ajukan Ulang"
                    >
                      <RefreshCcw size={14} />
                    </button>
                  )}
                  {req.status === 'pending' || req.status === 'rejected' ? (
                    <button 
                      onClick={() => handleDelete(req.id)}
                      className="w-8 h-8 bg-rose-50 text-rose-500 rounded-lg flex items-center justify-center active:scale-90 transition-all shadow-sm"
                      title="Hapus"
                    >
                      <Trash2 size={14} />
                    </button>
                  ) : (
                    <div className="w-8 h-8 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center opacity-40">
                      <CheckCircle2 size={14} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
};

export default LeaveMandiriDashboard;
