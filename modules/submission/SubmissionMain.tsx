import React, { useState, useEffect } from 'react';
import { ClipboardCheck, Search, Filter, Plus, Clock, CheckCircle2, XCircle, ListFilter, LayoutGrid } from 'lucide-react';
import Swal from 'sweetalert2';
import { submissionService } from '../../services/submissionService';
import { authService } from '../../services/authService';
import { supabase } from '../../lib/supabase';
import { Submission, Attendance } from '../../types';
import SubmissionForm from './SubmissionForm';
import SubmissionDetail from './SubmissionDetail';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import { CardSkeleton } from '../../components/Common/Skeleton';

interface SubmissionMainProps {
  type?: string;
}

const SubmissionMain: React.FC<SubmissionMainProps> = ({ type }) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'verification' | 'monitoring' | 'history'>('verification');
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);


  const currentUser = authService.getCurrentUser();

  useEffect(() => {
    fetchSubmissions();
  }, [type]);

  const fetchSubmissions = async () => {
    try {
      setIsLoading(true);
      if (type === 'Presensi Luar') {
        const { data, error } = await supabase
          .from('attendances')
          .select('*, account:accounts!account_id(full_name, internal_nik)')
          .neq('presence_type', 'Reguler')
          .order('created_at', { ascending: false });
        if (error) throw error;
        // Map attendances to Submission-like structure
        const mapped = (data as any[]).map(a => ({
          id: a.id,
          type: 'Presensi Luar',
          account_id: a.account_id,
          account: a.account,
          status: (a.check_in_validity === 'FALSE' || a.check_out_validity === 'FALSE') ? 'Pending' : (a.check_in_validity === 'TRUE' || a.check_out_validity === 'TRUE' ? 'Disetujui' : 'Ditolak'),
          description: (a.check_in_reason || a.check_out_reason) || 'Presensi Luar Lokasi',
          created_at: a.created_at,
          submission_data: { 
            attendance_id: a.id, 
            check_in_type: a.check_in_type,
            check_out_type: a.check_out_type,
            check_in_reason: a.check_in_reason,
            check_out_reason: a.check_out_reason
          }
        }));
        setSubmissions(mapped as any);
      } else {
        const data = await submissionService.getAll();
        const filtered = type ? data.filter(s => s.type === type) : data;
        setSubmissions(filtered);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (id: string, status: 'Disetujui' | 'Ditolak', notes?: string) => {
    if (!currentUser) return;
    
    const confirm = await Swal.fire({
      title: `Konfirmasi ${status}?`,
      text: notes ? `Catatan: ${notes}` : "Aksi ini akan memperbarui status pengajuan karyawan.",
      icon: status === 'Disetujui' ? 'success' : 'warning',
      showCancelButton: true,
      confirmButtonColor: status === 'Disetujui' ? '#006E62' : '#ef4444',
      confirmButtonText: 'Ya, Proses'
    });

    if (confirm.isConfirmed) {
      try {
        setIsSaving(true);
        if (type === 'Presensi Luar') {
          const sub = submissions.find(s => s.id === id);
          await submissionService.verifyAttendance(id, sub?.submission_data.presence_type === 'IN' ? 'IN' : 'OUT', status === 'Disetujui' ? 'TRUE' : 'DENY', currentUser.id, notes);
        } else {
          await submissionService.verify(id, status, currentUser.id, notes);
        }
        await fetchSubmissions();
        setSelectedSubmission(null);
        Swal.fire('Berhasil', `Pengajuan telah ${status.toLowerCase()}.`, 'success');
      } catch (error) {
        Swal.fire('Gagal', 'Terjadi kesalahan saat memproses verifikasi.', 'error');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const filteredSubmissions = submissions.filter(s => {
    const searchStr = `${s.account?.full_name} ${s.type} ${s.description}`.toLowerCase();
    const matchesSearch = searchStr.includes(searchTerm.toLowerCase());
    
    if (activeTab === 'verification') return matchesSearch && s.status === 'Pending';
    if (activeTab === 'history') return matchesSearch && (s.status === 'Disetujui' || s.status === 'Ditolak');
    return matchesSearch; // Monitoring Tab
  });

  const TabButton = ({ id, label, icon: Icon, count }: { id: any, label: string, icon: any, count?: number }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-6 py-4 text-[11px] font-bold uppercase tracking-widest border-b-2 transition-all ${
        activeTab === id ? 'border-[#006E62] text-[#006E62] bg-emerald-50/30' : 'border-transparent text-gray-400 hover:text-gray-600'
      }`}
    >
      <Icon size={14} />
      {label}
      {count !== undefined && count > 0 && (
        <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] ${activeTab === id ? 'bg-[#006E62] text-white' : 'bg-gray-100 text-gray-400'}`}>
          {count}
        </span>
      )}
    </button>
  );

  return (
    <div className="space-y-6">
      {isSaving && <LoadingSpinner message="Memproses Verifikasi..." />}

      {type !== 'Presensi Luar' && (
        <div className="flex border-b border-gray-100 bg-white -mt-4 mb-6 sticky top-16 z-20 overflow-x-auto scrollbar-none">
          <TabButton 
            id="verification" 
            label="Verifikasi" 
            icon={Clock} 
            count={submissions.filter(s => s.status === 'Pending').length} 
          />
          <TabButton id="monitoring" label="Daftar Masuk" icon={ListFilter} />
          <TabButton id="history" label="Riwayat" icon={CheckCircle2} />
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Cari pengajuan (Nama, Jenis, Alasan)..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#006E62] text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {type !== 'Presensi Luar' && (
          <button 
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-[#006E62] text-white px-4 py-2 rounded-md hover:bg-[#005a50] transition-colors shadow-sm text-sm font-medium"
          >
            <Plus size={18} />
            <span>Buat Pengajuan</span>
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <ClipboardCheck size={48} strokeWidth={1} className="mb-4" />
          <p className="text-lg font-medium">Tidak ada data pengajuan.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-400 font-bold uppercase text-[10px] tracking-widest">
              <tr>
                <th className="px-6 py-4">Nama</th>
                <th className="px-6 py-4">Jenis</th>
                <th className="px-6 py-4">Alasan</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Tanggal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSubmissions.map(submission => (
                <tr 
                  key={submission.id}
                  onClick={() => setSelectedSubmission(submission)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 font-bold text-gray-800">{submission.account?.full_name}</td>
                  <td className="px-6 py-4 text-gray-500">{submission.type}</td>
                  <td className="px-6 py-4 text-gray-500 line-clamp-1">{submission.description}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                      submission.status === 'Pending' ? 'bg-orange-50 text-orange-600' :
                      submission.status === 'Disetujui' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                    }`}>
                      {submission.status === 'Pending' && <span className="mr-1 text-[8px] bg-orange-200 px-1 rounded">NEW</span>}
                      {submission.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{new Date(submission.created_at!).toLocaleDateString('id-ID')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <SubmissionForm 
          onClose={() => setShowForm(false)} 
          onSuccess={() => { setShowForm(false); fetchSubmissions(); }} 
        />
      )}

      {selectedSubmission && (
        <SubmissionDetail 
          submission={selectedSubmission} 
          onClose={() => setSelectedSubmission(null)} 
          onVerify={handleVerify}
          canVerify={(currentUser?.role === 'admin' || currentUser?.is_hr_admin) && currentUser?.id !== selectedSubmission.account_id && selectedSubmission.status === 'Pending'}
        />
      )}
    </div>
  );
};

export default SubmissionMain;