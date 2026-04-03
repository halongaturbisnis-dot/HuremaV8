import React, { useState, useRef, useEffect } from 'react';
import { X, Save, Paperclip, Plus, Trash2, Loader2, Megaphone, Calendar, Users, Target, AlertCircle, Info, FileText, User, Check } from 'lucide-react';
import { Announcement, Account } from '../../types';
import { googleDriveService } from '../../services/googleDriveService';
import { announcementService } from '../../services/announcementService';
import { accountService } from '../../services/accountService';
import Swal from 'sweetalert2';

interface AnnouncementFormProps {
  announcement?: Announcement;
  userId: string;
  onClose: () => void;
  onSave: () => void;
}

const AnnouncementForm: React.FC<AnnouncementFormProps> = ({ announcement, userId, onClose, onSave }) => {
  const [title, setTitle] = useState(announcement?.title || '');
  const [content, setContent] = useState(announcement?.content || '');
  const [category, setCategory] = useState<Announcement['category']>(announcement?.category || 'Info');
  const [targetType, setTargetType] = useState<Announcement['target_type']>(announcement?.target_type || 'All');
  const [targetIds, setTargetIds] = useState<string[]>(announcement?.target_ids || []);
  const [publishStart, setPublishStart] = useState(announcement?.publish_start ? new Date(announcement.publish_start).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16));
  const [publishEnd, setPublishEnd] = useState(announcement?.publish_end ? new Date(announcement.publish_end).toISOString().slice(0, 16) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16));
  const [attachments, setAttachments] = useState<string[]>(announcement?.attachments || []);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [grades, setGrades] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [positions, setPositions] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>(['Tetap', 'Kontrak', 'Magang', 'Harian']);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsUploading(true);
      for (let i = 0; i < files.length; i++) {
        const fileId = await googleDriveService.uploadFile(files[i]);
        setAttachments(prev => [...prev, fileId]);
      }
    } catch (error) {
      alert('Gagal mengunggah file.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (index: number) => setAttachments(attachments.filter((_, i) => i !== index));

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      Swal.fire('Error', 'Judul dan isi pengumuman wajib diisi.', 'error');
      return;
    }

    try {
      setIsSaving(true);
      const data = {
        title,
        content,
        category,
        target_type: targetType,
        target_ids: targetIds,
        publish_start: new Date(publishStart).toISOString(),
        publish_end: new Date(publishEnd).toISOString(),
        attachments,
        created_by: userId
      };

      if (announcement) {
        await announcementService.updateAnnouncement(announcement.id, data);
      } else {
        await announcementService.createAnnouncement(data);
      }

      Swal.fire('Berhasil', 'Pengumuman berhasil disimpan.', 'success');
      onSave();
    } catch (error) {
      Swal.fire('Error', 'Gagal menyimpan pengumuman.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleTargetId = (id: string) => {
    setTargetIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in duration-300 max-h-[95vh]">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0 bg-[#006E62]/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#006E62]/10 text-[#006E62] flex items-center justify-center">
              <Megaphone size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800 tracking-tight">{announcement ? 'Edit Pengumuman' : 'Buat Pengumuman Baru'}</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Kelola Informasi Perusahaan</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 scrollbar-none">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Judul Pengumuman</label>
                <input 
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Libur Bersama Idul Fitri"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006E62]/20 focus:border-[#006E62] transition-all text-sm font-bold text-gray-700"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Isi Pengumuman</label>
                <textarea 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Tuliskan detail pengumuman di sini..."
                  className="w-full h-48 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006E62]/20 focus:border-[#006E62] transition-all text-sm font-medium text-gray-700 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Kategori</label>
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006E62]/20 text-sm font-bold text-gray-700"
                  >
                    <option value="Info">Informasi Umum</option>
                    <option value="Urgent">Mendesak (Urgent)</option>
                    <option value="Event">Acara (Event)</option>
                    <option value="Policy">Kebijakan (Policy)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Target Audiens</label>
                  <select 
                    value={targetType}
                    onChange={(e) => {
                      setTargetType(e.target.value as any);
                      setTargetIds([]);
                    }}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006E62]/20 text-sm font-bold text-gray-700"
                  >
                    <option value="All">Seluruh Karyawan</option>
                    <option value="Location">Lokasi Spesifik</option>
                    <option value="Department">Departemen Spesifik</option>
                    <option value="Position">Jabatan Spesifik</option>
                    <option value="Individual">Individu Spesifik</option>
                    <option value="Status">Status Karyawan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Mulai Tayang</label>
                  <input 
                    type="datetime-local"
                    value={publishStart}
                    onChange={(e) => setPublishStart(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006E62]/20 text-sm font-bold text-gray-700"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Berakhir Tayang</label>
                  <input 
                    type="datetime-local"
                    value={publishEnd}
                    onChange={(e) => setPublishEnd(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006E62]/20 text-sm font-bold text-gray-700"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {targetType !== 'All' && (
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 flex items-center gap-2">
                    <Target size={14} /> Pilih {targetType === 'Location' ? 'Lokasi' : targetType === 'Department' ? 'Departemen' : targetType === 'Position' ? 'Jabatan' : targetType === 'Individual' ? 'Karyawan' : 'Status'}
                  </label>
                  <input 
                    type="text"
                    placeholder={`Cari ${targetType === 'Location' ? 'Lokasi' : targetType === 'Department' ? 'Departemen' : targetType === 'Position' ? 'Jabatan' : targetType === 'Individual' ? 'Karyawan' : 'Status'}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 mb-2 bg-white border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#006E62]/20"
                  />
                  <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl max-h-[250px] overflow-y-auto scrollbar-thin space-y-2">
                    {(() => {
                      const filteredAccounts = accounts.filter(a => a.full_name.toLowerCase().includes(searchTerm.toLowerCase()));
                      const filteredGrades = grades.filter(d => d?.toLowerCase().includes(searchTerm.toLowerCase()));
                      const filteredLocations = locations.filter(l => l?.toLowerCase().includes(searchTerm.toLowerCase()));
                      const filteredPositions = positions.filter(p => p?.toLowerCase().includes(searchTerm.toLowerCase()));
                      const filteredStatuses = statuses.filter(s => s?.toLowerCase().includes(searchTerm.toLowerCase()));

                      if (targetType === 'Location') {
                        return filteredLocations.map(loc => (
                          <button 
                            key={loc}
                            onClick={() => toggleTargetId(loc)}
                            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${targetIds.includes(loc) ? 'bg-[#006E62]/10 border-[#006E62]/20 text-[#006E62]' : 'bg-white border-gray-100 text-gray-600 hover:border-[#006E62]/20'}`}
                          >
                            <span className="text-xs font-bold uppercase">{loc}</span>
                            {targetIds.includes(loc) && <Check size={14} />}
                          </button>
                        ));
                      } else if (targetType === 'Department') {
                        return filteredGrades.map(grd => (
                          <button 
                            key={grd}
                            onClick={() => toggleTargetId(grd)}
                            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${targetIds.includes(grd) ? 'bg-[#006E62]/10 border-[#006E62]/20 text-[#006E62]' : 'bg-white border-gray-100 text-gray-600 hover:border-[#006E62]/20'}`}
                          >
                            <span className="text-xs font-bold uppercase">{grd || 'Tanpa Departemen'}</span>
                            {targetIds.includes(grd) && <Check size={14} />}
                          </button>
                        ));
                      } else if (targetType === 'Position') {
                        return filteredPositions.map(pos => (
                          <button 
                            key={pos}
                            onClick={() => toggleTargetId(pos)}
                            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${targetIds.includes(pos) ? 'bg-[#006E62]/10 border-[#006E62]/20 text-[#006E62]' : 'bg-white border-gray-100 text-gray-600 hover:border-[#006E62]/20'}`}
                          >
                            <span className="text-xs font-bold uppercase">{pos}</span>
                            {targetIds.includes(pos) && <Check size={14} />}
                          </button>
                        ));
                      } else if (targetType === 'Status') {
                        return filteredStatuses.map(stat => (
                          <button 
                            key={stat}
                            onClick={() => toggleTargetId(stat)}
                            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${targetIds.includes(stat) ? 'bg-[#006E62]/10 border-[#006E62]/20 text-[#006E62]' : 'bg-white border-gray-100 text-gray-600 hover:border-[#006E62]/20'}`}
                          >
                            <span className="text-xs font-bold uppercase">{stat}</span>
                            {targetIds.includes(stat) && <Check size={14} />}
                          </button>
                        ));
                      } else {
                        return filteredAccounts.map(acc => (
                          <button 
                            key={acc.id}
                            onClick={() => toggleTargetId(acc.id)}
                            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${targetIds.includes(acc.id) ? 'bg-[#006E62]/10 border-[#006E62]/20 text-[#006E62]' : 'bg-white border-gray-100 text-gray-600 hover:border-[#006E62]/20'}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                                {acc.photo_google_id ? (
                                  <img src={googleDriveService.getFileUrl(acc.photo_google_id)} alt={acc.full_name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <User size={16} className="text-gray-400" />
                                )}
                              </div>
                              <div className="text-left">
                                <p className="text-[10px] font-bold">{acc.full_name}</p>
                                <p className="text-[8px] font-bold opacity-60 uppercase">{acc.grade} • {acc.internal_nik}</p>
                              </div>
                            </div>
                            {targetIds.includes(acc.id) && <Check size={14} />}
                          </button>
                        ));
                      }
                    })()}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Lampiran Resmi</label>
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()} 
                    disabled={isUploading}
                    className="text-[10px] font-bold text-[#006E62] uppercase flex items-center gap-1 hover:underline disabled:opacity-50"
                  >
                    <Plus size={12} /> Tambah File
                  </button>
                  <input 
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {isUploading && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-[#006E62]/10 text-[#006E62] rounded-xl animate-pulse">
                    <Loader2 size={14} className="animate-spin" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Mengunggah...</span>
                  </div>
                )}

                <div className="space-y-2">
                  {attachments.map((fileId, idx) => (
                    <div key={idx} className="flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl group">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Paperclip size={12} className="text-gray-400 shrink-0" />
                        <span className="text-[10px] text-gray-600 truncate">Dokumen_{idx + 1}</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveAttachment(idx)} 
                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {attachments.length === 0 && (
                    <p className="text-[10px] text-gray-400 italic text-center py-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">Tidak ada lampiran file</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex gap-3 shrink-0">
          <button 
            type="button"
            onClick={onClose}
            className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-white transition-all"
          >
            Batal
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving || isUploading}
            className="flex-[2] py-3 bg-[#006E62] text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-[#005a50] transition-all shadow-lg shadow-[#006E62]/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {announcement ? 'Perbarui Pengumuman' : 'Publikasikan Sekarang'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementForm;
