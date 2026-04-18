
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
}

const LeaveMandiriDashboard: React.FC<LeaveMandiriDashboardProps> = ({ user, setActiveTab }) => {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
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
            onClick={() => setActiveTab ? setActiveTab('presence') : null}
            className="w-10 h-10 bg-gray-50 text-gray-400 rounded-xl flex items-center justify-center active:scale-90 transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-lg font-bold text-gray-800 tracking-tight">Libur Mandiri</h2>
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Riwayat & Pengajuan</p>
          </div>
        </div>
        <button 
          onClick={() => {
            setEditingRequest(null);
            setShowForm(true);
          }}
          className="bg-[#006E62] text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#006E62]/20 active:scale-90 transition-all shrink-0 text-xs font-black uppercase tracking-widest"
        >
          <Plus size={18} /> Ajukan
        </button>
      </div>

      {/* List View - Like Presence History */}
      <div className="px-6 space-y-4 mt-6">
        {requests.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-gray-300">
            <Coffee size={48} className="mb-4 opacity-20" />
            <p className="text-xs font-bold uppercase tracking-widest">Belum ada pengajuan</p>
          </div>
        ) : (
          [...requests].sort((a, b) => b.start_date.localeCompare(a.start_date)).map((req) => (
            <div 
              key={req.id} 
              className="bg-white rounded-3xl border border-gray-100 p-4 shadow-sm border-l-4 border-l-[#006E62] space-y-4 hover:bg-gray-50/50 transition-all"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-50 text-[#006E62] rounded-xl flex items-center justify-center">
                    <Calendar size={14} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-gray-800 leading-none">
                      {formatDateID(req.start_date)}
                    </p>
                    <span className="text-[8px] text-gray-400 font-bold uppercase tracking-widest mt-1 inline-block">
                      Dibuat {formatDateID(req.created_at)}
                    </span>
                  </div>
                </div>
                {getStatusBadge(req.status)}
              </div>

              <div className="bg-gray-50/80 p-3 rounded-2xl border border-gray-50">
                <p className="text-[11px] text-gray-500 leading-relaxed italic line-clamp-2">
                  "{req.description || 'Tidak ada keterangan.'}"
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                {req.status === 'rejected' && (
                  <button 
                    onClick={() => {
                      setEditingRequest(req);
                      setShowForm(true);
                    }}
                    className="px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-[9px] font-black uppercase tracking-widest active:scale-90 transition-all flex items-center gap-1 shadow-sm"
                  >
                    <RefreshCcw size={10} /> Ajukan Ulang
                  </button>
                )}
                {req.status === 'pending' || req.status === 'rejected' ? (
                  <button 
                    onClick={() => handleDelete(req.id)}
                    className="w-8 h-8 bg-rose-50 text-rose-500 rounded-lg flex items-center justify-center active:scale-90 transition-all shadow-sm"
                  >
                    <Trash2 size={14} />
                  </button>
                ) : (
                  <div className="w-8 h-8 bg-gray-50 text-gray-300 rounded-lg flex items-center justify-center">
                    <Eye size={14} />
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <LeaveMandiriForm 
          accountId={user.id}
          onClose={() => {
            setShowForm(false);
            setEditingRequest(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setEditingRequest(null);
            fetchRequests();
          }}
          editData={editingRequest}
          existingRequests={requests}
        />
      )}
    </div>
  );
};

export default LeaveMandiriDashboard;
