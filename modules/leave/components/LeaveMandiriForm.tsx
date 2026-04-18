
import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, AlertCircle } from 'lucide-react';
import { LeaveRequestInput, Account, LeaveRequest } from '../../../types';
import { accountService } from '../../../services/accountService';
import { leaveService } from '../../../services/leaveService';
import { formatDateID } from '../../../utils/dateFormatter';
import Swal from 'sweetalert2';

interface LeaveMandiriFormProps {
  accountId: string;
  isAdmin?: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: LeaveRequest | null;
  existingRequests?: LeaveRequest[];
}

const LeaveMandiriForm: React.FC<LeaveMandiriFormProps> = ({ 
  accountId, 
  isAdmin = false, 
  onClose, 
  onSuccess,
  editData,
  existingRequests = []
}) => {
  const [formData, setFormData] = useState<LeaveRequestInput>({
    account_id: accountId,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    description: ''
  });

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    // Check if the selected date already exists and is pending or approved
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
      if (isAdmin) {
        await leaveService.create(formData, 'approved', accountId); // Admin creates pre-approved
      } else {
        await leaveService.create(formData);
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
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 duration-500">
        <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#006E62]/10 rounded-xl flex items-center justify-center text-[#006E62]">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-gray-800 tracking-tight">
                {editData ? 'Ajukan Ulang Libur' : 'Form Libur Mandiri'}
              </h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-tight">
                {isAdmin ? 'Manual Input oleh Admin' : 'Pengajuan Jadwal Mandiri'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center active:scale-90 transition-all">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {isAdmin && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Karyawan</label>
              <select 
                required 
                name="account_id" 
                value={formData.account_id} 
                onChange={handleChange} 
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-[#006E62] transition-all"
              >
                <option value="">-- Pilih Karyawan --</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.full_name} ({acc.internal_nik})</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tanggal Libur</label>
              <input 
                type="date"
                required 
                name="start_date" 
                value={formData.start_date} 
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData(prev => ({ ...prev, start_date: val, end_date: val }));
                }} 
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-[#006E62] transition-all"
              />
              <p className="text-[9px] text-amber-600 font-bold uppercase flex items-center gap-1 mt-1 ml-1">
                <AlertCircle size={10} /> Berlaku untuk 1 hari kerja
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
                className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-[#006E62] transition-all resize-none" 
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full h-14 bg-[#006E62] text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-[#006E62]/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save size={18} />
              {isSubmitting ? 'Memproses...' : editData ? 'Kirim Ulang' : 'Kirim Pengajuan'}
            </button>
            <button 
              type="button" 
              onClick={onClose}
              className="w-full h-12 bg-gray-50 text-gray-400 rounded-2xl text-xs font-bold uppercase tracking-widest active:scale-[0.98] transition-all"
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeaveMandiriForm;
