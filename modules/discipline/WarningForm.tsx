
import React, { useState } from 'react';
import { X, Save, Upload, AlertTriangle, ShieldAlert, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { disciplineService } from '../../services/disciplineService';
import { googleDriveService } from '../../services/googleDriveService';
import { WarningLogInput } from '../../types';

interface WarningFormProps {
  accountId: string;
  initialData?: any;
  onClose: () => void;
  onSuccess: () => void;
}

const WarningForm: React.FC<WarningFormProps> = ({ accountId, initialData, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<WarningLogInput>(initialData ? {
    account_id: initialData.account_id || accountId,
    warning_type: initialData.warning_type || 'Teguran Lisan',
    reason: initialData.reason || '',
    issue_date: initialData.issue_date || new Date().toISOString().split('T')[0],
    file_id: initialData.file_id || ''
  } : {
    account_id: accountId,
    warning_type: 'Teguran Lisan',
    reason: '',
    issue_date: new Date().toISOString().split('T')[0],
    file_id: ''
  });

  const [uploading, setUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      
      // Clean payload to ensure only valid fields are sent to database
      const payload = {
        account_id: formData.account_id,
        warning_type: formData.warning_type,
        reason: formData.reason,
        issue_date: formData.issue_date,
        file_id: formData.file_id || null
      };

      if (initialData) {
        if (!initialData.id) {
          console.error('Update failed: initialData.id is missing', initialData);
          throw new Error('ID Peringatan tidak ditemukan untuk proses update');
        }
        await disciplineService.updateWarning(initialData.id, payload as any);
        Swal.fire({ title: 'Berhasil!', text: 'Surat Peringatan telah diperbarui.', icon: 'success', timer: 1500, showConfirmButton: false });
      } else {
        await disciplineService.createWarning(payload as any);
        Swal.fire({ title: 'Berhasil!', text: 'Surat Peringatan telah dicatat.', icon: 'success', timer: 1500, showConfirmButton: false });
      }
      onSuccess();
    } catch (error: any) {
      console.error('Save error:', error);
      Swal.fire('Gagal', 'Terjadi kesalahan saat menyimpan data.', 'error');
    } finally {
      setIsSaving(false);
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
      Swal.fire('Gagal', 'Gagal mengunggah surat.', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-40 p-4">
      <div className="bg-white rounded-md shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-orange-600">Catat Peringatan</h3>

          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Jenis Peringatan</label>
            <select 
              value={formData.warning_type}
              onChange={(e) => setFormData({...formData, warning_type: e.target.value as any})}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-orange-500 outline-none"
            >
              <option value="Teguran Lisan">Teguran Lisan</option>
              <option value="Surat Peringatan 1 (SP1)">Surat Peringatan 1 (SP1)</option>
              <option value="Surat Peringatan 2 (SP2)">Surat Peringatan 2 (SP2)</option>
              <option value="Surat Peringatan 3 (SP3)">Surat Peringatan 3 (SP3)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tanggal Penerbitan</label>
            <input 
              type="date"
              required
              value={formData.issue_date}
              onChange={(e) => setFormData({...formData, issue_date: e.target.value})}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-orange-500 outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Alasan / Pelanggaran</label>
            <textarea 
              required
              rows={3}
              value={formData.reason}
              onChange={(e) => setFormData({...formData, reason: e.target.value})}
              placeholder="Jelaskan alasan pemberian peringatan..."
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-orange-500 outline-none resize-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Upload Lampiran</label>
            <div className={`p-3 bg-gray-50 border border-dashed rounded-md ${formData.file_id ? 'border-orange-500 bg-orange-50/20' : 'border-gray-200'}`}>
              <label className="flex items-center gap-3 cursor-pointer">
                <Upload size={16} className={formData.file_id ? 'text-orange-600' : 'text-gray-300'} />
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-gray-600 uppercase">{uploading ? 'Mengunggah...' : formData.file_id ? 'FILE TERUNGGAH' : 'PILIH FILE'}</p>
                </div>
                <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileUpload} disabled={uploading} />
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-gray-500 uppercase">Batal</button>
            <button 
              disabled={isSaving || uploading}
              className="flex items-center gap-2 bg-orange-600 text-white px-8 py-2 rounded shadow-md hover:bg-orange-700 transition-all text-xs font-bold uppercase disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Simpan Log
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WarningForm;
