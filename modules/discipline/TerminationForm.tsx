
import React, { useState } from 'react';
import { X, Save, Upload, LogOut, Loader2, AlertCircle } from 'lucide-react';
import Swal from 'sweetalert2';
import { disciplineService } from '../../services/disciplineService';
import { googleDriveService } from '../../services/googleDriveService';
import { TerminationLogInput } from '../../types';

interface TerminationFormProps {
  accountId: string;
  initialData?: any;
  onClose: () => void;
  onSuccess: () => void;
}

const TerminationForm: React.FC<TerminationFormProps> = ({ accountId, initialData, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<TerminationLogInput>(initialData ? {
    account_id: initialData.account_id || accountId,
    termination_type: initialData.termination_type || 'Resign',
    termination_date: initialData.termination_date || new Date().toISOString().split('T')[0],
    reason: initialData.reason || '',
    severance_amount: initialData.severance_amount || 0,
    penalty_amount: initialData.penalty_amount || 0,
    file_id: initialData.file_id || ''
  } : {
    account_id: accountId,
    termination_type: 'Resign',
    termination_date: new Date().toISOString().split('T')[0],
    reason: '',
    severance_amount: 0,
    penalty_amount: 0,
    file_id: ''
  });

  const [uploading, setUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await Swal.fire({
      title: initialData ? 'Simpan Perubahan?' : 'Proses Karyawan Keluar?',
      text: initialData ? "Data pengakhiran akan diperbarui." : "Akun karyawan ini akan dinonaktifkan secara otomatis.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: initialData ? '#006E62' : '#ef4444',
      confirmButtonText: initialData ? 'Ya, Simpan' : 'Ya, Proses Exit'
    });

    if (result.isConfirmed) {
      try {
        setIsSaving(true);

        // Clean payload to ensure only valid fields are sent to database
        const payload = {
          account_id: formData.account_id,
          termination_type: formData.termination_type,
          termination_date: formData.termination_date,
          reason: formData.reason,
          severance_amount: formData.severance_amount,
          penalty_amount: formData.penalty_amount,
          file_id: formData.file_id || null
        };

        if (initialData) {
          if (!initialData.id) {
            console.error('Update failed: initialData.id is missing', initialData);
            throw new Error('ID Pengakhiran tidak ditemukan untuk proses update');
          }
          await disciplineService.updateTermination(initialData.id, payload as any);
          Swal.fire({ title: 'Berhasil!', text: 'Data pengakhiran telah diperbarui.', icon: 'success', timer: 1500, showConfirmButton: false });
        } else {
          await disciplineService.createTermination(payload as any);
          Swal.fire({ title: 'Berhasil!', text: 'Proses exit telah diselesaikan.', icon: 'success', timer: 1500, showConfirmButton: false });
        }
        onSuccess();
      } catch (error: any) {
        console.error('Save error:', error);
        Swal.fire('Gagal', 'Terjadi kesalahan.', 'error');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const fileId = await googleDriveService.uploadFile(file);
      setFormData(prev => ({ ...prev, file_id: fileId }));
    } catch (e) {
      Swal.fire('Gagal', 'Gagal mengunggah dokumen.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const formatCurrencyInput = (value: number | string) => {
    const stringValue = String(value).replace(/[^0-9]/g, '');
    if (!stringValue) return '';
    const numberValue = parseInt(stringValue, 10);
    return `Rp ${numberValue.toLocaleString('id-ID')}`;
  };

  const parseCurrencyInput = (value: string) => {
    return parseInt(value.replace(/[^0-9]/g, ''), 10) || 0;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-40 p-4">
      <div className="bg-white rounded-md shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#006E62]">Pemberhentian Karyawan</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-red-50 p-3 rounded border border-red-100 flex gap-2 items-start mb-2">
            <AlertCircle className="text-red-500 shrink-0" size={16} />
            <p className="text-[10px] text-red-700 font-medium italic">Peringatan: Proses ini akan menutup akses login dan mengubah status karyawan menjadi Non-Aktif secara permanen.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Jenis Pemberhentian</label>
              <select 
                value={formData.termination_type}
                onChange={(e) => setFormData({...formData, termination_type: e.target.value as any})}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-red-500 outline-none"
              >
                <option value="Resign">Resign</option>
                <option value="Pemecatan / PHK">Pemecatan / PHK</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tanggal Pemberhetian</label>
              <input 
                type="date"
                required
                value={formData.termination_date}
                onChange={(e) => setFormData({...formData, termination_date: e.target.value})}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-red-500 outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Alasan Keluar</label>
            <textarea 
              required
              rows={2}
              value={formData.reason}
              onChange={(e) => setFormData({...formData, reason: e.target.value})}
              placeholder="Jelaskan alasan pengunduran diri atau pemecatan..."
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-red-500 outline-none resize-none"
            />
          </div>

          {formData.termination_type === 'Pemecatan / PHK' ? (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Uang Pesangon (IDR)</label>
              <input 
                type="text"
                value={formatCurrencyInput(formData.severance_amount)}
                onChange={(e) => setFormData({...formData, severance_amount: parseCurrencyInput(e.target.value), penalty_amount: 0})}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-red-500 outline-none bg-emerald-50/10 font-bold"
              />
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Biaya Penalti / Ganti Rugi (IDR)</label>
              <input 
                type="text"
                value={formatCurrencyInput(formData.penalty_amount)}
                onChange={(e) => setFormData({...formData, penalty_amount: parseCurrencyInput(e.target.value), severance_amount: 0})}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-red-500 outline-none bg-orange-50/10 font-bold"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Dokumen Exit / Paklaring</label>
            <div className={`p-3 bg-gray-50 border border-dashed rounded-md ${formData.file_id ? 'border-red-500 bg-red-50/20' : 'border-gray-200'}`}>
              <label className="flex items-center gap-3 cursor-pointer">
                <Upload size={16} className={formData.file_id ? 'text-red-600' : 'text-gray-300'} />
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-gray-600 uppercase">{uploading ? 'Mengunggah...' : formData.file_id ? 'FILE TERUNGGAH' : 'PILIH FILE'}</p>
                </div>
                <input type="file" className="hidden" accept="application/pdf" onChange={handleFileUpload} disabled={uploading} />
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-gray-500 uppercase">Batal</button>
            <button 
              disabled={isSaving || uploading}
              className="flex items-center gap-2 bg-red-600 text-white px-8 py-2 rounded shadow-md hover:bg-red-700 transition-all text-xs font-bold uppercase disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />} Proses Keluar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TerminationForm;
