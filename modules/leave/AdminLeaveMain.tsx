
import React, { useState, useEffect } from 'react';
import { 
  Coffee, 
  Search, 
  Plus, 
  Filter, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  Calendar, 
  XCircle, 
  AlertCircle,
  User,
  LayoutList,
  ArrowRight
} from 'lucide-react';
import { submissionService } from '../../services/submissionService';
import { authService } from '../../services/authService';
import { googleDriveService } from '../../services/googleDriveService';
import { supabase } from '../../lib/supabase';
import { Submission, AuthUser } from '../../types';
import { AdminMadeDeletion } from '../../lib/adminAuthHelper';
import { MainButtonStyle } from '../../utils/mainButtonStyle';
import Swal from 'sweetalert2';
import LeaveDetailModal from './components/LeaveDetailModal';
import LeaveMandiriForm from './components/LeaveMandiriForm';

interface AdminLeaveMainProps {
  user: AuthUser;
}

const AdminLeaveMain: React.FC<AdminLeaveMainProps> = ({ user }) => {
  const [requests, setRequests] = useState<Submission[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Pending');
  const [selectedRequest, setSelectedRequest] = useState<Submission | null>(null);
  const [showForm, setShowForm] = useState(false);
  const limit = 25;

  useEffect(() => {
    fetchRequests();

    // Realtime subscription for Admin
    const channel = supabase
      .channel('admin-leave-mandiri-realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'account_submissions'
      }, (payload) => {
        console.log('Realtime update received:', payload);
        fetchRequests(true);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Realtime: Subscribed to AdminLeaveMain');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Realtime: Error subscribing to AdminLeaveMain');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [page, statusFilter, activeQuery]);

  const fetchRequests = async (isSilent = false) => {
    try {
      if (!isSilent) setIsLoading(true);
      console.log('Fetching requests...');
      const { data, totalCount } = await submissionService.getByTypePaged(
        'Libur Mandiri', 
        page, 
        limit, 
        statusFilter === 'SEMUA STATUS' ? 'ALL' : statusFilter,
        activeQuery
      );
      
      console.log('Requests fetched:', data);
      setRequests(data);
      setTotalCount(totalCount);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setActiveQuery(searchTerm);
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setPage(1);
    setSearchTerm('');
    setActiveQuery('');
  };

  const handleVerify = async (id: string, status: 'approved' | 'rejected') => {
    const dbStatus = status === 'approved' ? 'Disetujui' : 'Ditolak';
    try {
      await submissionService.verify(id, dbStatus, user.id);
      fetchRequests(true);
      setSelectedRequest(null);
      Swal.fire('Berhasil', `Pengajuan telah ${dbStatus.toLowerCase()}.`, 'success');
    } catch (error) {
      Swal.fire('Gagal', 'Gagal memproses verifikasi.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Hapus data?',
      text: "Aksi ini tidak dapat dibatalkan.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Ya, Hapus!'
    });

    if (result.isConfirmed) {
      try {
        await submissionService.delete(id);
        setRequests(prev => prev.filter(r => r.id !== id));
        Swal.fire('Berhasil', 'Data telah dihapus.', 'success');
      } catch (error) {
        Swal.fire('Gagal', 'Gagal menghapus data.', 'error');
      }
    }
  };

  const filteredRequests = requests.filter(req => {
    const matchesSearch = 
      req.account?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.account?.internal_nik?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'SEMUA STATUS' || req.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    const dateA = a.submission_data?.start_date || '';
    const dateB = b.submission_data?.start_date || '';
    return dateB.localeCompare(dateA);
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Disetujui':
        return <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit"><CheckCircle2 size={10} /> Disetujui</span>;
      case 'Ditolak':
        return <span className="px-2 py-1 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit"><XCircle size={10} /> Ditolak</span>;
      default:
        return <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit"><Clock size={10} /> Pending</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Modal Form Tambah (Admin) */}
      <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-xl font-black text-gray-800 tracking-tight">Manajemen Libur Mandiri</h2>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer" size={18} onClick={handleSearch} />
            <input 
              type="text"
              placeholder="Cari nama atau NIK..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-[#006E62] w-full sm:w-64 transition-all"
            />
          </form>
          <select 
            value={statusFilter}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            className="px-6 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-black text-gray-600 outline-none focus:ring-2 focus:ring-[#006E62] transition-all uppercase tracking-widest"
          >
            <option value="SEMUA STATUS">Semua Status</option>
            <option value="Pending">Pending</option>
            <option value="Disetujui">Disetujui</option>
            <option value="Ditolak">Ditolak</option>
          </select>
          <button 
            onClick={() => setShowForm(true)}
            className={`${MainButtonStyle} !w-fit !px-6 !py-3 !text-xs !shadow-none`}
          >
             TAMBAH
          </button>
        </div>
      </div>

      {/* Table - Optimized like Dispensation */}
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Karyawan</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Tanggal Pengajuan</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Keterangan</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 border-4 border-[#006E62]/20 border-t-[#006E62] rounded-full animate-spin"></div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Memuat Data...</span>
                    </div>
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-gray-400 italic text-xs font-medium">Tidak ada data yang ditemukan.</td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr 
                    key={req.id} 
                    onClick={() => setSelectedRequest(req)}
                    className="hover:bg-gray-50/80 transition-all cursor-pointer group"
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl overflow-hidden bg-white shadow-sm border border-gray-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          {req.account?.photo_google_id ? (
                            <img 
                              src={googleDriveService.getFileUrl(req.account.photo_google_id)} 
                              alt={req.account.full_name}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <User size={20} className="text-gray-300" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-black text-gray-800 leading-tight">{req.account?.full_name}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{req.account?.internal_nik}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400">
                          <Calendar size={14} />
                        </div>
                        <span className="text-xs font-bold text-gray-700">
                          {req.submission_data?.start_date ? new Date(req.submission_data.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-xs text-gray-600 line-clamp-1 italic max-w-xs leading-relaxed">
                        {req.description || '-'}
                      </p>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <div className="flex justify-center">
                        {getStatusBadge(req.status)}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end items-center gap-3">
                        {AdminMadeDeletion(req) && (
                          <button 
                            onClick={(e) => {
                              console.log('Delete button clicked for:', req.id);
                              e.stopPropagation();
                              e.preventDefault();
                              handleDelete(req.id);
                            }}
                            className="p-2 text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-colors active:scale-90"
                            title="Hapus Data Admin"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalCount > limit && (
          <div className="px-8 py-4 border-t border-gray-100 flex items-center justify-between">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-[#006E62] disabled:opacity-50"
            >
              Sebelumnya
            </button>
            <span className="text-xs font-bold text-gray-400">Halaman {page} dari {Math.ceil(totalCount / limit)}</span>
            <button
              disabled={page >= Math.ceil(totalCount / limit)}
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-[#006E62] disabled:opacity-50"
            >
              Selanjutnya
            </button>
          </div>
        )}
      </div>

      {/* Modal Detail */}
      {selectedRequest && (
        <LeaveDetailModal 
          leave={{
            id: selectedRequest.id,
            account_id: selectedRequest.account_id,
            start_date: selectedRequest.submission_data?.start_date,
            end_date: selectedRequest.submission_data?.end_date || selectedRequest.submission_data?.start_date,
            description: selectedRequest.description,
            status: selectedRequest.status === 'Disetujui' ? 'approved' : selectedRequest.status === 'Ditolak' ? 'rejected' : 'pending',
            file_id: selectedRequest.file_id || (selectedRequest as any).submission_data?.file_id,
            created_at: selectedRequest.created_at,
            account: selectedRequest.account
          } as any}
          onClose={() => setSelectedRequest(null)}
          onVerify={(id, status) => handleVerify(id, status)}
          onDelete={(id) => handleDelete(id)}
          canDelete={AdminMadeDeletion(selectedRequest)}
        />
      )}

      {/* Modal Form Tambah (Admin) */}
      {showForm && (
        <LeaveMandiriForm 
          accountId={user.id}
          isAdmin={true}
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            fetchRequests();
          }}
        />
      )}
    </div>
  );
};

export default AdminLeaveMain;
