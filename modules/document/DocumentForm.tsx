import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Upload, FileText, ChevronDown, Check, Users, Search, FolderKanban, Target, User } from 'lucide-react';
import Swal from 'sweetalert2';
import { documentService } from '../../services/documentService';
import { accountService } from '../../services/accountService';
import { googleDriveService } from '../../services/googleDriveService';
import { DigitalDocument, Account } from '../../types';

interface DocumentFormProps {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: DigitalDocument;
}

const DocumentForm: React.FC<DocumentFormProps> = ({ onClose, onSuccess, initialData }) => {
  const [formData, setFormData] = useState<any>({
    name: initialData?.name || '',
    doc_type: initialData?.doc_type || 'SOP',
    file_id: initialData?.file_id || '',
    description: initialData?.description || '',
    target_type: initialData?.target_type || 'All',
    target_ids: initialData?.target_ids || []
  });

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [grades, setGrades] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [positions, setPositions] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>(['Tetap', 'Kontrak', 'Magang', 'Harian']);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const typeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const accs = await accountService.getAll();
      setAccounts(accs.filter(a => !a.end_date || new Date(a.end_date) > new Date()));
      
      const grds = Array.from(new Set(accs.map(a => a.grade).filter(Boolean))) as string[];
      setGrades(grds);
      
      const locs = Array.from(new Set(accs.map(a => a.location?.name).filter(Boolean))) as string[];
      setLocations(locs);

      const pos = Array.from(new Set(accs.map(a => a.position).filter(Boolean))) as string[];
      setPositions(pos);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const fileId = await googleDriveService.uploadFile(file);
      setFormData(prev => ({ 
        ...prev, 
        file_id: fileId,
        name: prev.name || file.name.split('.').slice(0, -1).join('.')
      }));
    } catch (error) {
      Swal.fire('Gagal', 'Gagal mengunggah file ke Google Drive.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const toggleTargetId = (id: string) => {
    setFormData((prev: any) => ({
      ...prev,
      target_ids: prev.target_ids.includes(id)
        ? prev.target_ids.filter((tid: string) => tid !== id)
        : [...prev.target_ids, id]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.file_id) return Swal.fire('Peringatan', 'Harap unggah file terlebih dahulu.', 'warning');
    
    try {
      setIsSaving(true);
      if (initialData?.id) {
        await documentService.update(initialData.id, formData);
      } else {
        await documentService.create(formData);
      }
      Swal.fire({ title: 'Berhasil!', text: 'Dokumen digital telah disimpan.', icon: 'success', timer: 1500, showConfirmButton: false });
      onSuccess();
    } catch (error) {
      Swal.fire('Gagal', 'Gagal menyimpan data.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
      <div className="bg-white rounded-md shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#006E62]">
              {initialData ? 'Ubah Dokumen' : 'Unggah Dokumen Baru'}
            </h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Digital Asset Management</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="space-y-4">
             <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">File Dokumen (G-Drive)</label>
                <div className={`p-4 border border-dashed rounded-md transition-all ${formData.file_id ? 'border-[#006E62] bg-emerald-50/20' : 'border-gray-200 bg-gray-50'}`}>
                  <label className="flex flex-col items-center justify-center cursor-pointer min-h-[80px]">
                    {uploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-6 h-6 border-2 border-[#006E62] border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-[10px] font-bold text-[#006E62] uppercase">Mengunggah...</span>
                      </div>
                    ) : (
                      <>
                        <Upload className={`mb-2 ${formData.file_id ? 'text-[#006E62]' : 'text-gray-300'}`} size={24} />
                        <span className={`text-[10px] font-bold uppercase ${formData.file_id ? 'text-[#006E62]' : 'text-gray-400'}`}>
                          {formData.file_id ? 'DOKUMEN SIAP DISIMPAN' : 'Pilih File untuk Diunggah'}
                        </span>
                        <p className="text-[8px] text-gray-400 mt-1 uppercase tracking-tighter">PDF, Image, atau Doc</p>
                      </>
                    )}
                    <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                  </label>
                  {formData.file_id && (
                    <div className="mt-2 text-center">
                       <p className="text-[9px] font-mono text-gray-400 truncate tracking-tighter">ID: {formData.file_id}</p>
                    </div>
                  )}
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Nama Dokumen</label>
                  <input 
                    required
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none"
                    placeholder="cth: SOP Keamanan Kantor"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Jenis Dokumen</label>
                  <input 
                    required
                    name="doc_type"
                    value={formData.doc_type}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none"
                    placeholder="cth: SOP"
                  />
                </div>
             </div>

             <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Keterangan Singkat</label>
                <textarea 
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none resize-none"
                  placeholder="Penjelasan isi dokumen..."
                />
             </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Target Akses</label>
                <select 
                  name="target_type"
                  value={formData.target_type}
                  onChange={(e) => {
                    setFormData((prev: any) => ({ ...prev, target_type: e.target.value, target_ids: [] }));
                  }}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none"
                >
                  <option value="All">Seluruh Karyawan</option>
                  <option value="Location">Lokasi Spesifik</option>
                  <option value="Department">Departemen Spesifik</option>
                  <option value="Position">Jabatan Spesifik</option>
                  <option value="Individual">Individu Spesifik</option>
                </select>
              </div>

              {formData.target_type !== 'All' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <Target size={12} className="text-[#00FFE4]" /> Pilih {formData.target_type === 'Location' ? 'Lokasi' : formData.target_type === 'Department' ? 'Departemen' : formData.target_type === 'Position' ? 'Jabatan' : 'Karyawan'}
                  </label>
                  <input 
                    type="text"
                    placeholder={`Cari ${formData.target_type === 'Location' ? 'Lokasi' : formData.target_type === 'Department' ? 'Departemen' : formData.target_type === 'Position' ? 'Jabatan' : 'Karyawan'}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none"
                  />
                  <div className="p-2 bg-gray-50 border border-gray-100 rounded max-h-40 overflow-y-auto space-y-1 mt-1">
                    {(() => {
                      const filteredAccounts = accounts.filter(a => a.full_name.toLowerCase().includes(searchTerm.toLowerCase()));
                      const filteredGrades = grades.filter(d => d?.toLowerCase().includes(searchTerm.toLowerCase()));
                      const filteredLocations = locations.filter(l => l?.toLowerCase().includes(searchTerm.toLowerCase()));
                      const filteredPositions = positions.filter(p => p?.toLowerCase().includes(searchTerm.toLowerCase()));

                      if (formData.target_type === 'Location') {
                        return filteredLocations.map(loc => (
                          <button 
                            key={loc}
                            type="button"
                            onClick={() => toggleTargetId(loc)}
                            className={`w-full flex items-center justify-between p-2 rounded text-xs ${formData.target_ids.includes(loc) ? 'bg-emerald-50 text-[#006E62] font-bold' : 'text-gray-600 hover:bg-gray-100'}`}
                          >
                            <span>{loc}</span>
                            {formData.target_ids.includes(loc) && <Check size={12} />}
                          </button>
                        ));
                      } else if (formData.target_type === 'Department') {
                        return filteredGrades.map(grd => (
                          <button 
                            key={grd}
                            type="button"
                            onClick={() => toggleTargetId(grd)}
                            className={`w-full flex items-center justify-between p-2 rounded text-xs ${formData.target_ids.includes(grd) ? 'bg-emerald-50 text-[#006E62] font-bold' : 'text-gray-600 hover:bg-gray-100'}`}
                          >
                            <span>{grd || 'Tanpa Departemen'}</span>
                            {formData.target_ids.includes(grd) && <Check size={12} />}
                          </button>
                        ));
                      } else if (formData.target_type === 'Position') {
                        return filteredPositions.map(pos => (
                          <button 
                            key={pos}
                            type="button"
                            onClick={() => toggleTargetId(pos)}
                            className={`w-full flex items-center justify-between p-2 rounded text-xs ${formData.target_ids.includes(pos) ? 'bg-emerald-50 text-[#006E62] font-bold' : 'text-gray-600 hover:bg-gray-100'}`}
                          >
                            <span>{pos}</span>
                            {formData.target_ids.includes(pos) && <Check size={12} />}
                          </button>
                        ));
                      } else {
                        return filteredAccounts.map(acc => (
                          <button 
                            key={acc.id}
                            type="button"
                            onClick={() => toggleTargetId(acc.id)}
                            className={`w-full flex items-center justify-between p-2 rounded text-xs ${formData.target_ids.includes(acc.id) ? 'bg-emerald-50 text-[#006E62] font-bold' : 'text-gray-600 hover:bg-gray-100'}`}
                          >
                            <div className="flex items-center gap-2">
                               <p className="truncate">{acc.full_name}</p>
                            </div>
                            {formData.target_ids.includes(acc.id) && <Check size={12} />}
                          </button>
                        ));
                      }
                    })()}
                  </div>
                </div>
              )}
          </div>
        </form>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-gray-500 uppercase">Batal</button>
          <button 
            onClick={handleSubmit}
            disabled={uploading || isSaving}
            className="flex items-center gap-2 bg-[#006E62] text-white px-8 py-2 rounded shadow-md hover:bg-[#005a50] transition-all text-xs font-bold uppercase disabled:opacity-50"
          >
            {isSaving ? <FolderKanban size={14} className="animate-spin" /> : <Save size={14} />}
            {isSaving ? 'Menyimpan...' : 'Simpan Dokumen'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentForm;
