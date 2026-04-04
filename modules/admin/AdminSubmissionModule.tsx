import React, { useState, useEffect } from 'react';
import { Search, Filter, Clock, CheckCircle2, XCircle, AlertCircle, Eye, Loader2, Calendar, User, ArrowLeft, ArrowRight, LucideIcon, Plus, Trash2, X, Paperclip, FileText } from 'lucide-react';
import { submissionService } from '../../services/submissionService';
import { accountService } from '../../services/accountService';
import { leaveService } from '../../services/leaveService';
import { permissionService } from '../../services/permissionService';
import { maternityLeaveService } from '../../services/maternityLeaveService';
import { googleDriveService } from '../../services/googleDriveService';
import { Submission, AuthUser, SubmissionStatus, Account } from '../../types';
import Swal from 'sweetalert2';
import SubmissionDetail from '../submission/SubmissionDetail';

interface AdminSubmissionModuleProps {
  user: AuthUser;
  type: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
}


const AdminSubmissionModule: React.FC<AdminSubmissionModuleProps> = ({ user, type, title, subtitle, icon: Icon }) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchInputValue, setSearchInputValue] = useState('');
  const [activeSearchQuery, setActiveSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 50;

  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeAccounts, setActiveAccounts] = useState<Account[]>([]);
  const [searchAccountTerm, setSearchAccountTerm] = useState('');
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [newSubmission, setNewSubmission] = useState({
    account_id: '',
    start_date: '',
    end_date: '',
    description: '',
    permission_type: 'Izin Sakit'
  });

  const resetForm = () => {
    setNewSubmission({
      account_id: '',
      start_date: '',
      end_date: '',
      description: '',
      permission_type: 'Izin Sakit'
    });
    setSearchAccountTerm('');
    setShowAccountDropdown(false);
    setSelectedFiles([]);
  };

  useEffect(() => {
    // Reset when type changes
    setSearchInputValue('');
    setActiveSearchQuery('');
    setCurrentPage(1);
    if (type === 'Libur Mandiri' || type === 'Izin' || type === 'Cuti Tahunan' || type === 'Cuti Melahirkan') {
      fetchActiveAccounts();
    }
  }, [type]);

  useEffect(() => {
    fetchSubmissions(currentPage, statusFilter, activeSearchQuery);
  }, [type, currentPage, statusFilter, activeSearchQuery]);

  const fetchActiveAccounts = async () => {
    try {
      const data = await accountService.getAll(undefined, undefined, '', 'aktif');
      setActiveAccounts(data);
    } catch (error) {
      console.error('Error fetching active accounts:', error);
    }
  };

  const fetchSubmissions = async (page: number, status: string, search: string) => {
    try {
      setIsLoading(true);
      const { data, totalCount } = await submissionService.getByTypePaged(type, page, itemsPerPage, status, search);
      setSubmissions(data);
      setTotalCount(totalCount);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    setSearchInputValue('');
    setActiveSearchQuery('');
    setCurrentPage(1);
  };

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setActiveSearchQuery(searchInputValue);
    setCurrentPage(1);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Disetujui':
        return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit"><CheckCircle2 size={10} /> Disetujui</span>;
      case 'Ditolak':
        return <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit"><XCircle size={10} /> Ditolak</span>;
      default:
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit"><Clock size={10} /> Pending</span>;
    }
  };

  const handleVerify = async (id: string, status: SubmissionStatus, notes?: string) => {
    try {
      const result = await Swal.fire({
        title: `Konfirmasi ${status}`,
        text: `Apakah Anda yakin ingin ${status.toLowerCase()} pengajuan ini?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: status === 'Disetujui' ? '#006E62' : '#ef4444',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Ya, Lanjutkan',
        cancelButtonText: 'Batal'
      });

      if (result.isConfirmed) {
        await submissionService.verify(id, status, user.id, notes);
        await Swal.fire({
          title: 'Berhasil!',
          text: `Pengajuan telah ${status.toLowerCase()}.`,
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
        setShowDetail(false);
        setSelectedSubmission(null);
        fetchSubmissions(currentPage, statusFilter, activeSearchQuery);
      }
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'Gagal memproses verifikasi', 'error');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubmission.account_id || !newSubmission.start_date || !newSubmission.end_date || !newSubmission.description) {
      Swal.fire('Peringatan', 'Mohon lengkapi semua data wajib (Karyawan, Tanggal, dan Keterangan)', 'warning');
      return;
    }

    // Validasi Lampiran Wajib
    if ((type === 'Izin' || type === 'Cuti Melahirkan') && selectedFiles.length === 0) {
      Swal.fire('Peringatan', 'Lampiran wajib diunggah untuk pengajuan ini', 'warning');
      return;
    }

    // Validasi Kuota untuk Cuti Tahunan dan Cuti Melahirkan
    if (type === 'Cuti Tahunan' || type === 'Cuti Melahirkan') {
      const start = new Date(newSubmission.start_date);
      const end = new Date(newSubmission.end_date);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      const selectedAcc = activeAccounts.find(a => a.id === newSubmission.account_id);
      if (selectedAcc) {
        if (type === 'Cuti Tahunan') {
          const totalQuota = (selectedAcc.leave_quota || 0) + (selectedAcc.carry_over_quota || 0);
          if (duration > totalQuota) {
            Swal.fire('Kuota Tidak Mencukupi', `Jumlah hari (${duration}) melebihi total kuota cuti (${totalQuota} hari).`, 'error');
            return;
          }
        } else if (type === 'Cuti Melahirkan') {
          const totalQuota = selectedAcc.maternity_leave_quota || 0;
          if (duration > totalQuota) {
            Swal.fire('Kuota Tidak Mencukupi', `Jumlah hari (${duration}) melebihi kuota cuti melahirkan (${totalQuota} hari).`, 'error');
            return;
          }
        }
      }
    }

    try {
      setIsSubmitting(true);

      // Upload files if any
      let fileIdsString = '';
      if (selectedFiles.length > 0) {
        try {
          const uploadPromises = selectedFiles.map(file => googleDriveService.uploadFile(file));
          const results = await Promise.all(uploadPromises);
          fileIdsString = results.join(',');
        } catch (error) {
          Swal.fire('Error', 'Gagal mengunggah lampiran. Periksa koneksi atau kredensial Google Drive.', 'error');
          setIsSubmitting(false);
          return;
        }
      }
      
      if (type === 'Libur Mandiri') {
        await leaveService.create({
          account_id: newSubmission.account_id,
          start_date: newSubmission.start_date,
          end_date: newSubmission.end_date,
          description: newSubmission.description,
          file_id: fileIdsString || null
        }, 'approved', user.id);
      } else if (type === 'Izin') {
        await permissionService.create({
          account_id: newSubmission.account_id,
          permission_type: newSubmission.permission_type,
          start_date: newSubmission.start_date,
          end_date: newSubmission.end_date,
          description: newSubmission.description,
          file_id: fileIdsString || null
        }, 'approved', user.id);
      } else if (type === 'Cuti Tahunan') {
        await leaveService.createAnnual({
          account_id: newSubmission.account_id,
          start_date: newSubmission.start_date,
          end_date: newSubmission.end_date,
          description: newSubmission.description,
          file_id: fileIdsString || null
        }, 'approved', user.id);
      } else if (type === 'Cuti Melahirkan') {
        await maternityLeaveService.create({
          account_id: newSubmission.account_id,
          start_date: newSubmission.start_date,
          end_date: newSubmission.end_date,
          description: newSubmission.description,
          file_id: fileIdsString || null
        }, 'approved', user.id);
      }

      await Swal.fire({
        title: 'Berhasil!',
        text: `Pengajuan ${type.toLowerCase()} berhasil dibuat dan otomatis disetujui.`,
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });

      setShowCreateModal(false);
      resetForm();
      setCurrentPage(1);
      fetchSubmissions(1, statusFilter, activeSearchQuery);
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'Gagal membuat pengajuan', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, subType: string, subData: any) => {
    try {
      const result = await Swal.fire({
        title: 'Hapus Pengajuan',
        text: 'Apakah Anda yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Ya, Hapus',
        cancelButtonText: 'Batal'
      });

      if (result.isConfirmed) {
        // Jika Libur Mandiri atau Izin, hapus juga record di tabel terkait
        if (subType === 'Libur Mandiri' && subData.leave_request_id) {
          await leaveService.delete(subData.leave_request_id);
        } else if (subType === 'Izin' && subData.permission_request_id) {
          await permissionService.delete(subData.permission_request_id);
        } else if (subType === 'Cuti Tahunan' && subData.annual_leave_id) {
          await leaveService.deleteAnnual(subData.annual_leave_id);
        } else if (subType === 'Cuti Melahirkan' && subData.maternity_leave_id) {
          await maternityLeaveService.delete(subData.maternity_leave_id);
        }

        await submissionService.delete(id);
        
        await Swal.fire({
          title: 'Terhapus!',
          text: 'Data pengajuan telah berhasil dihapus.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
        fetchSubmissions(currentPage, statusFilter, activeSearchQuery);
      }
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'Gagal menghapus data', 'error');
    }
  };

  const filteredActiveAccounts = activeAccounts.filter(acc => {
    const matchesSearch = acc.full_name.toLowerCase().includes(searchAccountTerm.toLowerCase()) ||
                         acc.internal_nik.toLowerCase().includes(searchAccountTerm.toLowerCase());
    
    // Filter gender untuk Cuti Melahirkan
    if (type === 'Cuti Melahirkan') {
      return matchesSearch && acc.gender === 'Perempuan';
    }
    
    return matchesSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#006E62]/10 rounded-xl flex items-center justify-center text-[#006E62]">
            <Icon size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800 tracking-tight">{title}</h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{subtitle}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {(type === 'Libur Mandiri' || type === 'Izin' || type === 'Cuti Tahunan' || type === 'Cuti Melahirkan') && (
            <button 
              onClick={() => setShowCreateModal(true)}
              className="flex items-center justify-center gap-2 bg-[#006E62] text-white px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#005a50] transition-all shadow-sm active:scale-95"
            >
              <Plus size={16} />
              Tambah
            </button>
          )}
          <form 
            onSubmit={handleSearch}
            className="relative flex gap-2"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text"
                placeholder="Cari nama atau NIK..."
                value={searchInputValue}
                onChange={(e) => setSearchInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch();
                }}
                className="pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs focus:ring-2 focus:ring-[#006E62] outline-none w-full sm:w-64 transition-all"
              />
            </div>
            <button 
              type="submit"
              className="p-2.5 bg-[#006E62] text-white rounded-xl hover:bg-[#005a50] transition-all shadow-sm active:scale-95"
            >
              <Search size={16} />
            </button>
          </form>
          <select 
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-600 outline-none focus:ring-2 focus:ring-[#006E62] transition-all"
          >
            <option value="ALL">SEMUA STATUS</option>
            <option value="Pending">PENDING</option>
            <option value="Disetujui">DISETUJUI</option>
            <option value="Ditolak">DITOLAK</option>
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
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tanggal Pengajuan</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Keterangan</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <div className="w-8 h-8 border-4 border-gray-200 border-t-[#006E62] rounded-full animate-spin mb-2"></div>
                      <p className="text-[10px] font-bold uppercase tracking-widest">Memuat...</p>
                    </div>
                  </td>
                </tr>
              ) : submissions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic text-xs">Tidak ada data pengajuan yang ditemukan.</td>
                </tr>
              ) : (
                submissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-100 shrink-0 shadow-sm">
                          {sub.account?.photo_google_id ? (
                            <img 
                              src={googleDriveService.getFileUrl(sub.account.photo_google_id)} 
                              alt={sub.account.full_name}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const parent = e.currentTarget.parentElement;
                                if (parent) {
                                  const placeholder = document.createElement('div');
                                  placeholder.className = 'text-gray-400 flex items-center justify-center w-full h-full';
                                  placeholder.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
                                  parent.appendChild(placeholder);
                                }
                              }}
                            />
                          ) : (
                            <User size={20} className="text-gray-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-800">{sub.account?.full_name}</p>
                          <p className="text-[10px] text-gray-400 font-medium">{sub.account?.internal_nik}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-gray-400" />
                        <span className="text-xs font-bold text-gray-700">{new Date(sub.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-gray-600 line-clamp-1">{sub.submission_data.reason || sub.submission_data.notes || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        {getStatusBadge(sub.status)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => {
                            setSelectedSubmission(sub);
                            setShowDetail(true);
                          }}
                          className="flex items-center gap-2 bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm active:scale-95"
                        >
                          <Eye size={14} />
                          Detail
                        </button>
                        {(type === 'Libur Mandiri' || type === 'Izin' || type === 'Cuti Tahunan' || type === 'Cuti Melahirkan') && (
                          <button 
                            onClick={() => handleDelete(sub.id, sub.type, sub.submission_data)}
                            className="flex items-center gap-2 bg-rose-50 border border-rose-100 text-rose-600 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-rose-100 hover:border-rose-200 transition-all shadow-sm active:scale-95"
                          >
                            <Trash2 size={14} />
                            Hapus
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
        <div className="bg-white px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Menampilkan {totalCount === 0 ? 0 : Math.min((currentPage - 1) * itemsPerPage + 1, totalCount)} - {Math.min(currentPage * itemsPerPage, totalCount)} dari {totalCount} data
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-gray-100 rounded-xl text-gray-400 hover:bg-gray-50 disabled:opacity-50 transition-all"
            >
              <ArrowLeft size={16} />
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, Math.ceil(totalCount / itemsPerPage)) }, (_, i) => {
                const totalPages = Math.ceil(totalCount / itemsPerPage);
                let pageNum = i + 1;
                
                // Logic to show pages around current page if many pages exist
                if (totalPages > 5) {
                  if (currentPage > 3) {
                    pageNum = currentPage - 3 + i + 1;
                    if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                  }
                }

                if (pageNum > totalPages) return null;

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-xl text-[10px] font-bold transition-all ${
                      currentPage === pageNum 
                        ? 'bg-[#006E62] text-white' 
                        : 'text-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalCount / itemsPerPage), prev + 1))}
              disabled={currentPage === Math.ceil(totalCount / itemsPerPage) || totalCount === 0}
              className="p-2 border border-gray-100 rounded-xl text-gray-400 hover:bg-gray-50 disabled:opacity-50 transition-all"
            >
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {showDetail && selectedSubmission && (
        <SubmissionDetail 
          submission={selectedSubmission}
          onClose={() => {
            setShowDetail(false);
            setSelectedSubmission(null);
          }}
          onVerify={handleVerify}
          canVerify={selectedSubmission.status === 'Pending'}
        />
      )}

      {/* Modal Tambah Libur Mandiri */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#006E62]/10 rounded-xl flex items-center justify-center text-[#006E62]">
                  <Plus size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 tracking-tight">Tambah {type}</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Bantu Pengajuan Karyawan</p>
                </div>
              </div>
              <button onClick={() => {
                setShowCreateModal(false);
                resetForm();
              }} className="p-2 hover:bg-gray-200/50 rounded-xl transition-colors text-gray-400">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div className="space-y-1.5 relative">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Pilih Karyawan (*)</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input 
                    type="text"
                    placeholder="Cari nama atau NIK..."
                    value={searchAccountTerm}
                    onFocus={() => setShowAccountDropdown(true)}
                    onChange={(e) => {
                      setSearchAccountTerm(e.target.value);
                      setShowAccountDropdown(true);
                      if (newSubmission.account_id) {
                        setNewSubmission({ ...newSubmission, account_id: '' });
                      }
                    }}
                    className="w-full pl-11 pr-10 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-xs focus:ring-2 focus:ring-[#006E62] outline-none transition-all font-medium"
                  />
                  {newSubmission.account_id && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <CheckCircle2 size={16} className="text-emerald-500" />
                    </div>
                  )}
                </div>

                {/* Dropdown Search Results */}
                {showAccountDropdown && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowAccountDropdown(false)}
                    />
                    <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-20 max-h-60 overflow-y-auto animate-in slide-in-from-top-2 duration-200">
                      {filteredActiveAccounts.length > 0 ? (
                        <div className="p-2 space-y-1">
                          {filteredActiveAccounts.map(acc => (
                            <button
                              key={acc.id}
                              type="button"
                              onClick={() => {
                                setNewSubmission({ ...newSubmission, account_id: acc.id });
                                setSearchAccountTerm(`${acc.full_name} (${acc.internal_nik})`);
                                setShowAccountDropdown(false);
                              }}
                              className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between group ${
                                newSubmission.account_id === acc.id 
                                  ? 'bg-[#006E62] text-white' 
                                  : 'hover:bg-gray-50 text-gray-700'
                              }`}
                            >
                              <div>
                                <p className={`text-xs font-bold ${newSubmission.account_id === acc.id ? 'text-white' : 'text-gray-800'}`}>
                                  {acc.full_name}
                                </p>
                                <p className={`text-[10px] ${newSubmission.account_id === acc.id ? 'text-emerald-100' : 'text-gray-400'}`}>
                                  {acc.internal_nik}
                                </p>
                              </div>
                              {newSubmission.account_id === acc.id && <CheckCircle2 size={14} />}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center">
                          <AlertCircle size={24} className="mx-auto text-gray-300 mb-2" />
                          <p className="text-xs text-gray-400 font-medium">Tidak ada hasil ditemukan</p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Quota Info Display */}
                {newSubmission.account_id && (type === 'Cuti Tahunan' || type === 'Cuti Melahirkan') && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-xl animate-in slide-in-from-top-1 duration-300">
                    <div className="flex items-center gap-2 text-[#006E62] mb-1">
                      <AlertCircle size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Informasi Kuota</span>
                    </div>
                    {type === 'Cuti Tahunan' ? (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white/50 p-2 rounded-lg">
                          <p className="text-[9px] text-gray-400 font-bold uppercase">Tahunan</p>
                          <p className="text-xs font-bold text-gray-700">
                            {activeAccounts.find(a => a.id === newSubmission.account_id)?.leave_quota || 0} Hari
                          </p>
                        </div>
                        <div className="bg-white/50 p-2 rounded-lg">
                          <p className="text-[9px] text-gray-400 font-bold uppercase">Carry Over</p>
                          <p className="text-xs font-bold text-gray-700">
                            {activeAccounts.find(a => a.id === newSubmission.account_id)?.carry_over_quota || 0} Hari
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white/50 p-2 rounded-lg">
                        <p className="text-[9px] text-gray-400 font-bold uppercase">Sisa Kuota Melahirkan</p>
                        <p className="text-xs font-bold text-gray-700">
                          {activeAccounts.find(a => a.id === newSubmission.account_id)?.maternity_leave_quota || 0} Hari
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {type === 'Izin' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Jenis Izin (*)</label>
                  <select
                    required
                    value={newSubmission.permission_type}
                    onChange={(e) => setNewSubmission({ ...newSubmission, permission_type: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs focus:ring-2 focus:ring-[#006E62] outline-none transition-all font-medium"
                  >
                    <option value="Izin Sakit">Izin Sakit</option>
                    <option value="Izin Keperluan Mendesak">Izin Keperluan Mendesak</option>
                    <option value="Izin Tugas Luar">Izin Tugas Luar</option>
                    <option value="Izin Lainnya">Izin Lainnya</option>
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 text-emerald-600">Mulai (*)</label>
                  <input
                    type="date"
                    required
                    value={newSubmission.start_date}
                    onChange={(e) => setNewSubmission({ ...newSubmission, start_date: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs focus:ring-2 focus:ring-[#006E62] outline-none transition-all font-bold text-gray-700"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 text-rose-600">Selesai (*)</label>
                  <input
                    type="date"
                    required
                    value={newSubmission.end_date}
                    onChange={(e) => setNewSubmission({ ...newSubmission, end_date: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs focus:ring-2 focus:ring-[#006E62] outline-none transition-all font-bold text-gray-700"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Keterangan / Alasan (*)</label>
                <textarea
                  required
                  placeholder="Alasan pengajuan karyawan..."
                  value={newSubmission.description}
                  onChange={(e) => setNewSubmission({ ...newSubmission, description: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs focus:ring-2 focus:ring-[#006E62] outline-none transition-all min-h-[100px] resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                  Lampiran Dokumen {(type === 'Izin' || type === 'Cuti Melahirkan') && '(*)'}
                </label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 hover:bg-gray-100 hover:border-[#006E62]/30 transition-all cursor-pointer group">
                      <Paperclip size={16} className="group-hover:text-[#006E62]" />
                      <span className="text-[10px] font-bold uppercase tracking-wider group-hover:text-gray-600">Pilih File</span>
                      <input 
                        type="file" 
                        multiple 
                        className="hidden" 
                        onChange={(e) => {
                          if (e.target.files) {
                            setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                          }
                        }}
                      />
                    </label>
                  </div>

                  {selectedFiles.length > 0 && (
                    <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                      {selectedFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-emerald-50/30 border border-emerald-100/50 rounded-xl group animate-in slide-in-from-left-2 duration-200">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText size={14} className="text-[#006E62] shrink-0" />
                            <span className="text-[10px] font-medium text-gray-600 truncate">{file.name}</span>
                          </div>
                          <button 
                            type="button"
                            onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                            className="p-1 text-gray-300 hover:text-rose-500 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              </div>

              <div className="p-6 pt-4 border-t border-gray-100 bg-gray-50/50 flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-6 py-3 border border-gray-100 text-gray-400 text-xs font-bold uppercase tracking-widest rounded-2xl hover:bg-gray-50 transition-all active:scale-95"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 bg-[#006E62] text-white text-xs font-bold uppercase tracking-widest rounded-2xl hover:bg-[#005a50] transition-all shadow-lg shadow-[#006E62]/20 active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    'Simpan & Setujui'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSubmissionModule;
