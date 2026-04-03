import React, { useState, useEffect } from 'react';
import { Search, Filter, Clock, CheckCircle2, XCircle, AlertCircle, Eye, Loader2, Calendar, User, ArrowRight, LucideIcon, Plus, Trash2, X } from 'lucide-react';
import { submissionService } from '../../services/submissionService';
import { accountService } from '../../services/accountService';
import { leaveService } from '../../services/leaveService';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeAccounts, setActiveAccounts] = useState<Account[]>([]);
  const [searchAccountTerm, setSearchAccountTerm] = useState('');
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newSubmission, setNewSubmission] = useState({
    account_id: '',
    start_date: '',
    end_date: '',
    description: ''
  });

  useEffect(() => {
    fetchSubmissions();
    if (type === 'Libur Mandiri') {
      fetchActiveAccounts();
    }
  }, [type]);

  const fetchActiveAccounts = async () => {
    try {
      const data = await accountService.getAll(undefined, undefined, '', 'aktif');
      setActiveAccounts(data);
    } catch (error) {
      console.error('Error fetching active accounts:', error);
    }
  };

  const fetchSubmissions = async () => {
    try {
      setIsLoading(true);
      const data = await submissionService.getByType(type);
      setSubmissions(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSubmissions = submissions.filter(sub => {
    const matchesSearch = 
      sub.account?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.account?.internal_nik.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || sub.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
        fetchSubmissions();
      }
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'Gagal memproses verifikasi', 'error');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubmission.account_id || !newSubmission.start_date || !newSubmission.end_date) {
      Swal.fire('Peringatan', 'Mohon lengkapi semua data wajib', 'warning');
      return;
    }

    try {
      setIsSubmitting(true);
      await leaveService.create({
        account_id: newSubmission.account_id,
        start_date: newSubmission.start_date,
        end_date: newSubmission.end_date,
        description: newSubmission.description || 'Dibuatkan oleh Admin'
      }, 'approved', user.id);

      await Swal.fire({
        title: 'Berhasil!',
        text: 'Pengajuan libur mandiri berhasil dibuat dan otomatis disetujui.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });

      setShowCreateModal(false);
      setSearchAccountTerm('');
      setShowAccountDropdown(false);
      setNewSubmission({ account_id: '', start_date: '', end_date: '', description: '' });
      fetchSubmissions();
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
        // Jika Libur Mandiri, hapus juga record di tabel libur mandiri
        if (subType === 'Libur Mandiri' && subData.leave_request_id) {
          await leaveService.delete(subData.leave_request_id);
        }

        await submissionService.delete(id);
        
        await Swal.fire({
          title: 'Terhapus!',
          text: 'Data pengajuan telah berhasil dihapus.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
        fetchSubmissions();
      }
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'Gagal menghapus data', 'error');
    }
  };

  const filteredActiveAccounts = activeAccounts.filter(acc => 
    acc.full_name.toLowerCase().includes(searchAccountTerm.toLowerCase()) ||
    acc.internal_nik.toLowerCase().includes(searchAccountTerm.toLowerCase())
  );

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
      <div className="w-12 h-12 border-4 border-gray-200 border-t-[#006E62] rounded-full animate-spin mb-4"></div>
      <p className="text-xs font-bold uppercase tracking-widest">Memuat Data {title}...</p>
    </div>
  );

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
          {type === 'Libur Mandiri' && (
            <button 
              onClick={() => setShowCreateModal(true)}
              className="flex items-center justify-center gap-2 bg-[#006E62] text-white px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#005a50] transition-all shadow-sm active:scale-95"
            >
              <Plus size={16} />
              Tambah
            </button>
          )}
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
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pegawai</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tanggal Pengajuan</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Keterangan</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic text-xs">Tidak ada data pengajuan yang ditemukan.</td>
                </tr>
              ) : (
                filteredSubmissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                          <User size={16} />
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
                        {type === 'Libur Mandiri' && (
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
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#006E62]/10 rounded-xl flex items-center justify-center text-[#006E62]">
                  <Plus size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 tracking-tight">Tambah Libur Mandiri</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Bantu Pengajuan Karyawan</p>
                </div>
              </div>
              <button onClick={() => {
                setShowCreateModal(false);
                setSearchAccountTerm('');
                setShowAccountDropdown(false);
              }} className="p-2 hover:bg-gray-200/50 rounded-xl transition-colors text-gray-400">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="space-y-1.5 relative">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Pilih Pegawai (*)</label>
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
              </div>

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
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Keterangan / Alasan</label>
                <textarea
                  placeholder="Contoh: Karyawan berhalangan input karena kendala teknis..."
                  value={newSubmission.description}
                  onChange={(e) => setNewSubmission({ ...newSubmission, description: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs focus:ring-2 focus:ring-[#006E62] outline-none transition-all min-h-[100px] resize-none"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setSearchAccountTerm('');
                    setShowAccountDropdown(false);
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
