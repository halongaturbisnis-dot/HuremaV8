import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, Search, Filter, Clock, CheckCircle2, XCircle, AlertCircle, Eye, Loader2, Calendar, User, ArrowRight,
  Trash2
} from 'lucide-react';
import { authService } from '../../services/authService';
import { dispensationService } from '../../services/dispensationService';
import { googleDriveService } from '../../services/googleDriveService';
import { supabase } from '../../lib/supabase';
import { DispensationRequest, AuthUser } from '../../types';
import Swal from 'sweetalert2';
import DispensationDetail from './components/DispensationDetail';

interface AdminDispensationMainProps {
  user: AuthUser;
}

const AdminDispensationMain: React.FC<AdminDispensationMainProps> = ({ user }) => {
  const [requests, setRequests] = useState<DispensationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedRequest, setSelectedRequest] = useState<DispensationRequest | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    fetchRequests();

    // Realtime subscription for Admin
    const channel = supabase
      .channel('admin-dispensation-realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'dispensation_requests' 
      }, () => {
        fetchRequests(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRequests = async (isSilent = false) => {
    try {
      if (!isSilent) setIsLoading(true);
      const data = await dispensationService.getAll();
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
          title: 'Data Antrean Diperbarui'
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const result = await Swal.fire({
        title: 'Konfirmasi Hapus',
        text: 'Anda yakin ingin menghapus data dispensasi ini? Tindakan ini tidak dapat dibatalkan.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, Hapus!',
        cancelButtonText: 'Batal'
      });

      if (result.isConfirmed) {
        await dispensationService.delete(id);
        setRequests(prev => prev.filter(r => r.id !== id));
        
        Swal.fire({
          title: 'Terhapus!',
          text: 'Data dispensasi telah berhasil dihapus.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
      }
    } catch (error) {
      console.error(error);
      Swal.fire('Gagal', 'Sistem gagal menghapus data.', 'error');
    }
  };

  const filteredRequests = requests.filter(req => {
    const matchesSearch = 
      req.account?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.account?.internal_nik.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit"><CheckCircle2 size={10} /> Disetujui</span>;
      case 'REJECTED':
        return <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit"><XCircle size={10} /> Ditolak</span>;
      case 'PARTIAL':
        return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit"><AlertCircle size={10} /> Sebagian</span>;
      default:
        return <span className="px-2 py-1 bg-blue-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 w-fit animate-pulse shadow-lg shadow-blue-500/20"><Clock size={10} /> WAITING</span>;
    }
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
      <div className="w-12 h-12 border-4 border-gray-200 border-t-[#006E62] rounded-full animate-spin mb-4"></div>
      <p className="text-xs font-bold uppercase tracking-widest">Memuat Antrean Dispensasi...</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#006E62]/10 rounded-xl flex items-center justify-center text-[#006E62]">
            <ClipboardList size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800 tracking-tight">Manajemen Dispensasi</h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Verifikasi & Persetujuan Koreksi Presensi Pegawai</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text"
              placeholder="Cari nama atau NIK..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs focus:ring-2 focus:ring-[#006E62] outline-none w-full sm:w-64 transition-all"
            />
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-600 outline-none focus:ring-2 focus:ring-[#006E62] transition-all"
          >
            <option value="ALL">SEMUA STATUS</option>
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">DISETUJUI</option>
            <option value="PARTIAL">SEBAGIAN</option>
            <option value="REJECTED">DITOLAK</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">KARYAWAN</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tanggal</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Masalah</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic text-xs">Tidak ada data pengajuan yang ditemukan.</td>
                </tr>
              ) : (
                [...filteredRequests].sort((a, b) => b.date.localeCompare(a.date)).map((req) => (
                  <tr 
                    key={req.id} 
                    onClick={() => {
                      setSelectedRequest(req);
                      setShowDetail(true);
                      if (!req.is_read) {
                        dispensationService.markAsRead(req.id);
                        setRequests(prev => prev.map(r => r.id === req.id ? { ...r, is_read: true } : r));
                      }
                    }}
                    className={`hover:bg-gray-50 transition-all cursor-pointer group ${!req.is_read ? 'bg-blue-50/30' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-100 shrink-0 shadow-sm transition-transform group-hover:scale-105">
                          {req.account?.photo_google_id ? (
                            <img 
                              src={googleDriveService.getFileUrl(req.account.photo_google_id)} 
                              alt={req.account.full_name}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <User size={20} className="text-gray-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-800 flex items-center gap-2">
                            {req.account?.full_name}
                            {!req.is_read && (
                              <span className="px-1.5 py-0.5 bg-blue-500 text-white text-[8px] font-black uppercase rounded-full animate-pulse">NEW</span>
                            )}
                          </p>
                          <p className="text-[10px] text-gray-400 font-medium">{req.account?.internal_nik}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                        <Calendar size={14} className="text-gray-400" />
                        <span>{new Date(req.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {req.issues.map((issue, idx) => (
                          <span key={idx} className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            issue.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' :
                            issue.status === 'REJECTED' ? 'bg-rose-50 text-rose-600' :
                            'bg-blue-50 text-blue-600'
                          }`}>
                            {issue.type.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center">
                        {getStatusBadge(req.status)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center gap-3">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(req.id);
                          }}
                          className="p-2 text-gray-300 hover:text-rose-500 transition-colors active:scale-90 opacity-0 group-hover:opacity-100"
                          title="Hapus Pengajuan"
                        >
                          <Trash2 size={16} />
                        </button>
                        <div className="p-1 text-gray-300 group-hover:text-[#006E62] transition-colors">
                          <ArrowRight size={18} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showDetail && selectedRequest && (
        <DispensationDetail 
          request={selectedRequest}
          onClose={() => {
            setShowDetail(false);
            setSelectedRequest(null);
          }}
          onSuccess={() => {
            setShowDetail(false);
            setSelectedRequest(null);
            fetchRequests();
          }}
          isAdmin={true}
        />
      )}
    </div>
  );
};

export default AdminDispensationMain;
