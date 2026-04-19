
import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Calendar, AlertCircle, Upload, Trash2, Loader2, FileUp, ArrowLeft } from 'lucide-react';
import { LeaveRequestInput, Account, LeaveRequest, AuthUser } from '../../types';
import { accountService } from '../../services/accountService';
import { leaveService } from '../../services/leaveService';
import { googleDriveService } from '../../services/googleDriveService';
import { formatDateID } from '../../utils/dateFormatter';
import { MainButtonStyle } from '../../utils/mainButtonStyle';
import { CancelButtonStyle } from '../../utils/cancelButtonStyle';
import { validateMaxUploadSize } from '../../utils/maxUploadSize';
import Swal from 'sweetalert2';

interface LeaveMandiriFormPageProps {
  user: AuthUser;
  isAdmin?: boolean;
  onBack: () => void;
  onSuccess: () => void;
  editData?: LeaveRequest | null;
  existingRequests?: LeaveRequest[];
}

const LeaveMandiriFormPage: React.FC<LeaveMandiriFormPageProps> = ({ 
  user, 
  isAdmin = false, 
  onBack, 
  onSuccess,
  editData,
  existingRequests = []
}) => {
  const accountId = user.id;
  const [formData, setFormData] = useState<LeaveRequestInput>({
    account_id: accountId,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    description: ''
  });

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // File upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (editData) {
      setFormData({
        account_id: editData.account_id,
        start_date: editData.start_date,
        end_date: editData.end_date,
        description: editData.description || ''
      });
    }
  }, [editData]);

  useEffect(() => {
    if (isAdmin) {
      setLoadingAccounts(true);
      accountService.getAll()
        .then(data => {
          const today = new Date().toISOString().split('T')[0];
          const active = (data as Account[]).filter(acc => !acc.end_date || acc.end_date > today);
          setAccounts(active);
        })
        .finally(() => setLoadingAccounts(false));
    }
  }, [isAdmin]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateConflict = () => {
    const conflict = existingRequests.find(req => 
      req.start_date === formData.start_date && 
      (req.status === 'pending' || req.status === 'approved') &&
      req.id !== editData?.id
    );

    if (conflict) {
      Swal.fire({
        title: 'Tanggal Berkonflik',
        text: `Anda sudah memiliki pengajuan pada tanggal ${formatDateID(formData.start_date)} dengan status ${conflict.status === 'approved' ? 'Disetujui' : 'Pending'}.`,
        icon: 'warning',
        confirmButtonColor: '#006E62'
      });
      return true;
    }
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateConflict()) return;

    setIsSubmitting(true);
    try {
      let finalFileId = editData?.file_id || null;

      if (selectedFile) {
        setIsUploading(true);
        try {
          finalFileId = await googleDriveService.uploadFile(selectedFile);
        } catch (uploadError) {
          console.error('File Upload Error:', uploadError);
          Swal.fire('Gagal Upload', 'Gagal mengunggah lampiran. Silakan coba lagi.', 'error');
          setIsSubmitting(false);
          setIsUploading(false);
          return;
        }
        setIsUploading(false);
      }

      const submissionData = {
        ...formData,
        file_id: finalFileId
      };

      if (isAdmin) {
        await leaveService.create(submissionData, 'approved', accountId);
      } else {
        await leaveService.create(submissionData);
      }
      onSuccess();
      Swal.fire({
        title: 'Berhasil',
        text: isAdmin ? 'Data berhasil ditambahkan.' : 'Pengajuan Anda telah dikirim.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error(error);
      Swal.fire('Gagal', 'Terjadi kesalahan saat memproses data.', 'error');
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!validateMaxUploadSize(file)) {
        return;
      }
      setSelectedFile(file);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="px-6 pt-8 pb-5 border-b border-gray-50 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-30 shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="w-10 h-10 bg-gray-50 text-gray-400 rounded-xl flex items-center justify-center active:scale-90 transition-all font-bold"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-lg font-bold text-gray-800 tracking-tight">
              {editData ? 'Ajukan Ulang Libur' : 'Form Libur Mandiri'}
            </h2>
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-tight">
              {isAdmin ? 'Manual Input oleh Admin' : 'Pengajuan Jadwal Mandiri'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {isAdmin && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Pilih Karyawan (*)</label>
              <select 
                required 
                name="account_id" 
                value={formData.account_id} 
                onChange={handleChange} 
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-[#006E62] transition-all"
              >
                <option value="">-- Pilih Karyawan --</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.full_name} ({acc.internal_nik})</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tanggal Libur</label>
              <div className="relative">
                <input 
                  type="date"
                  required 
                  name="start_date" 
                  value={formData.start_date} 
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData(prev => ({ ...prev, start_date: val, end_date: val }));
                  }} 
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-base text-center font-black text-gray-800 outline-none focus:ring-2 focus:ring-[#006E62] transition-all"
                />
              </div>
              <p className="text-[10px] text-amber-600 font-bold uppercase flex items-center gap-1.5 mt-1.5 ml-1">
                <AlertCircle size={12} /> Berlaku untuk 1 hari kerja
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Keterangan / Alasan</label>
              <textarea 
                required
                name="description" 
                value={formData.description} 
                onChange={handleChange} 
                rows={4} 
                placeholder="Berikan alasan yang jelas..."
                className="w-full px-5 py-5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-[#006E62] transition-all resize-none" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Lampiran (Opsional)</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-3 px-5 py-4 bg-gray-50 border border-gray-100 border-dashed rounded-2xl text-xs font-bold text-gray-400 hover:bg-gray-100 transition-all group"
                >
                  {selectedFile ? (
                    <>
                      <FileUp size={18} className="text-[#006E62]" />
                      <span className="text-gray-700 truncate max-w-[200px]">{selectedFile.name}</span>
                    </>
                  ) : (
                    <>
                      <Upload size={18} className="group-hover:text-[#006E62] transition-colors" />
                      <span>Unggah Bukti</span>
                    </>
                  )}
                </button>
                {selectedFile && (
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center active:scale-95 transition-all outline-none"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
              <input 
                type="file"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png"
              />
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-gray-50 bg-white space-y-4 shrink-0">
          <button 
            type="submit" 
            disabled={isSubmitting || isUploading}
            className={MainButtonStyle}
          >
            {isUploading ? <Loader2 className="animate-spin" size={20} /> : isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            {isUploading ? 'Mengunggah...' : isSubmitting ? 'Memproses...' : editData ? 'Kirim Ulang' : 'Kirim Pengajuan'}
          </button>
          <button 
            type="button" 
            onClick={onBack}
            className={CancelButtonStyle}
          >
            Batal
          </button>
        </div>
      </form>
    </div>
  );
};

export default LeaveMandiriFormPage;
