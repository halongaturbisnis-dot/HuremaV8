import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Eye, 
  Edit2, 
  Trash2, 
  FileText, 
  Calendar,
  ArrowLeft
} from 'lucide-react';
import { dispensationService } from '../../services/dispensationService';
import { DispensationRequest, AuthUser } from '../../types';
import { authService } from '../../services/authService';
import { supabase } from '../../lib/supabase';
import Swal from 'sweetalert2';
import DispensationForm from './DispensationForm';
import DispensationDetail from './components/DispensationDetail';
import { formatDateID } from '../../utils/dateFormatter';

interface DispensationMainProps {
  user: AuthUser;
  setActiveTab?: (tab: string) => void;
}

const DispensationMain: React.FC<DispensationMainProps> = ({ user, setActiveTab }) => {
  const [requests, setRequests] = useState<DispensationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<DispensationRequest | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [editingRequest, setEditingRequest] = useState<DispensationRequest | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchRequests();

      // Realtime subscription for User
      const channel = supabase
        .channel(`user-dispensation-${user.id}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'dispensation_requests',
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
      const data = await dispensationService.getByAccountId(user!.id);
      setRequests(data);

      if (isSilent) {
        const Toast = Swal.mixin({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer);
            toast.addEventListener('mouseleave', Swal.resumeTimer);
          }
        });

        Toast.fire({
          icon: 'info',
          title: 'Status Pengajuan Diperbarui'
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Apakah Anda yakin?',
      text: "Data pengajuan akan dihapus permanen!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      try {
        await dispensationService.delete(id);
        setRequests(prev => prev.filter(r => r.id !== id));
        Swal.fire('Terhapus!', 'Pengajuan telah dihapus.', 'success');
      } catch (error) {
        Swal.fire('Gagal', 'Terjadi kesalahan saat menghapus data.', 'error');
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit"><CheckCircle2 size={10} /> Disetujui</span>;
      case 'REJECTED':
        return <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit"><XCircle size={10} /> Ditolak</span>;
      case 'PARTIAL':
        return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit"><AlertCircle size={10} /> Sebagian</span>;
      default:
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit"><Clock size={10} /> Pending</span>;
    }
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
      <div className="w-12 h-12 border-4 border-gray-200 border-t-[#006E62] rounded-full animate-spin mb-4"></div>
      <p className="text-xs font-bold uppercase tracking-widest">Memuat Data Dispensasi...</p>
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
            <h2 className="text-lg font-bold text-gray-800 tracking-tight">Dispensasi</h2>
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Koreksi Data Kehadiran</p>
          </div>
        </div>
        <button 
          onClick={() => {
            setEditingRequest(null);
            setShowForm(true);
          }}
          className="w-10 h-10 bg-[#006E62] text-white rounded-xl flex items-center justify-center shadow-lg shadow-[#006E62]/20 active:scale-90 transition-all shrink-0"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* Stats Summary - Mobile Optimized */}
      <div className="px-6 grid grid-cols-4 gap-2 mb-6">
        {[
          { label: 'Total', value: requests.length, color: 'text-gray-500', bg: 'bg-gray-50' },
          { label: 'Pending', value: requests.filter(r => r.status === 'PENDING').length, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Setuju', value: requests.filter(r => r.status === 'APPROVED' || r.status === 'PARTIAL').length, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Tolak', value: requests.filter(r => r.status === 'REJECTED').length, color: 'text-rose-500', bg: 'bg-rose-50' },
        ].map((stat, i) => (
          <div key={i} className={`${stat.bg} p-2 rounded-2xl flex flex-col items-center justify-center border border-white shadow-sm`}>
            <span className={`text-sm font-black ${stat.color}`}>{stat.value}</span>
            <span className="text-[7px] font-bold text-gray-400 uppercase tracking-widest">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* List - Mobile Optimized Card View */}
      <div className="px-6 space-y-3">
        {requests.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-gray-300">
            <ClipboardList size={48} className="mb-4 opacity-20" />
            <p className="text-xs font-bold uppercase tracking-widest">Belum ada pengajuan</p>
          </div>
        ) : (
          [...requests].sort((a, b) => b.date.localeCompare(a.date)).map((req) => (
            <div 
              key={req.id} 
              onClick={() => {
                setSelectedRequest(req);
                setShowDetail(true);
              }}
              className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-3 active:scale-[0.98] transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-gray-400" />
                  <span className="text-xs font-bold text-gray-700">
                    {formatDateID(req.date)}
                  </span>
                </div>
                {getStatusBadge(req.status)}
              </div>

              <div className="flex flex-wrap gap-1">
                {req.issues.map((issue, idx) => (
                  <span key={idx} className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${
                    issue.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' :
                    issue.status === 'REJECTED' ? 'bg-rose-50 text-rose-600' :
                    'bg-blue-50 text-blue-600'
                  }`}>
                    {issue.type.replace('_', ' ')}
                  </span>
                ))}
              </div>

              <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed italic">"{req.reason}"</p>

              <div className="pt-3 border-t border-gray-50 flex items-center justify-between">
                <span className="text-[8px] text-gray-300 font-bold uppercase tracking-widest">
                  Dibuat {formatDateID(req.created_at)}
                </span>
                <div className="flex items-center gap-2">
                  <div className="p-2 text-gray-400 hover:text-[#006E62] active:scale-90 transition-all">
                    <Eye size={18} />
                  </div>
                  {req.status === 'PENDING' && (
                    <>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingRequest(req);
                          setShowForm(true);
                        }}
                        className="p-2 text-gray-400 hover:text-amber-600 active:scale-90 transition-all"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(req.id);
                        }}
                        className="p-2 text-gray-400 hover:text-rose-600 active:scale-90 transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modals */}
      {showForm && (
        <DispensationForm 
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
        />
      )}

      {showDetail && selectedRequest && (
        <DispensationDetail 
          request={selectedRequest}
          onClose={() => {
            setShowDetail(false);
            setSelectedRequest(null);
          }}
          isAdmin={false}
        />
      )}
    </div>
  );
};

export default DispensationMain;
