import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Calendar, Clock, FileText, Upload, CheckCircle2, Loader2, Info, ClipboardList, MapPin, Camera } from 'lucide-react';
import { dispensationService } from '../../services/dispensationService';
import { googleDriveService } from '../../services/googleDriveService';
import { authService } from '../../services/authService';
import { accountService } from '../../services/accountService';
import { locationService } from '../../services/locationService';
import { DispensationRequest, DispensationIssueType, DispensationIssue, Account, Location } from '../../types';
import Swal from 'sweetalert2';

interface DispensationFormProps {
  onClose: () => void;
  onSuccess: () => void;
  editData: DispensationRequest | null;
}

interface EligibleDate {
  date: string;
  presence_id: string | null;
  issues: DispensationIssueType[];
}

const DispensationForm: React.FC<DispensationFormProps> = ({ onClose, onSuccess, editData }) => {
  const user = authService.getCurrentUser();
  const [isLoading, setIsLoading] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [eligibleDates, setEligibleDates] = useState<EligibleDate[]>([]);
  const [windowDays, setWindowDays] = useState<number>(7);
  const [selectedDate, setSelectedDate] = useState<EligibleDate | null>(null);
  const [selectedIssues, setSelectedIssues] = useState<DispensationIssueType[]>([]);
  const [reason, setReason] = useState(editData?.reason || '');
  const [account, setAccount] = useState<Account | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  
  // Manual Input for ABSEN_KERJA
  const [manualCheckIn, setManualCheckIn] = useState('');
  const [manualCheckOut, setManualCheckOut] = useState('');
  const [manualLocationId, setManualLocationId] = useState('');
  const [inPhoto, setInPhoto] = useState<File | null>(null);
  const [outPhoto, setOutPhoto] = useState<File | null>(null);
  const [inPhotoPreview, setInPhotoPreview] = useState<string | null>(null);
  const [outPhotoPreview, setOutPhotoPreview] = useState<string | null>(null);
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);

  useEffect(() => {
    if (inPhoto) {
      const url = URL.createObjectURL(inPhoto);
      setInPhotoPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setInPhotoPreview(null);
    }
  }, [inPhoto]);

  useEffect(() => {
    if (outPhoto) {
      const url = URL.createObjectURL(outPhoto);
      setOutPhotoPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setOutPhotoPreview(null);
    }
  }, [outPhoto]);

  useEffect(() => {
    fetchInitialData();
    if (!editData) {
      loadEligibleDates();
    } else {
      setSelectedDate({
        date: editData.date,
        presence_id: editData.presence_id,
        issues: editData.issues.map(i => i.type)
      });
      setSelectedIssues(editData.issues.map(i => i.type));
      const absentIssue = editData.issues.find(i => i.type === 'ABSEN_KERJA');
      if (absentIssue) {
        setManualCheckIn(absentIssue.manual_check_in || '');
        setManualCheckOut(absentIssue.manual_check_out || '');
        setManualLocationId(absentIssue.manual_location_id || '');
      }
    }
  }, [editData]);

  const fetchInitialData = async () => {
    try {
      const [acc, locs] = await Promise.all([
        accountService.getById(user!.id),
        locationService.getAll()
      ]);
      setAccount(acc as any);
      setLocations(locs);
    } catch (error) {
      console.error(error);
    }
  };

  const loadEligibleDates = async () => {
    try {
      setIsDetecting(true);
      const result = await dispensationService.getEligibleDates(user!.id);
      setEligibleDates(result.dates);
      setWindowDays(result.windowDays);
    } catch (error) {
      console.error(error);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleIssueToggle = (issue: DispensationIssueType) => {
    setSelectedIssues(prev => 
      prev.includes(issue) ? prev.filter(i => i !== issue) : [...prev, issue]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate || selectedIssues.length === 0 || !reason) {
      Swal.fire('Peringatan', 'Mohon lengkapi data pengajuan. Semua kolom wajib diisi.', 'warning');
      return;
    }

    const isAbsent = selectedIssues.includes('ABSEN_KERJA');
    if (isAbsent) {
      if (!manualCheckIn || !manualCheckOut) {
        Swal.fire('Peringatan', 'Mohon isi jam masuk dan jam pulang.', 'warning');
        return;
      }
      if (!account?.location_id && !manualLocationId) {
        Swal.fire('Peringatan', 'Mohon pilih lokasi kerja.', 'warning');
        return;
      }
      if (!editData && (!inPhoto || !outPhoto)) {
        Swal.fire('Peringatan', 'Mohon lampirkan foto verifikasi masuk dan pulang.', 'warning');
        return;
      }
    }

    try {
      setIsLoading(true);
      const folderId = (import.meta as any).env.VITE_DRIVE_FOLDER_DISPENSATION || '';
      
      let inPhotoId = null;
      let outPhotoId = null;
      const fileIds: string[] = editData?.file_ids || [];

      // Upload photos for ABSEN_KERJA
      if (inPhoto) inPhotoId = await googleDriveService.uploadFile(inPhoto, folderId);
      if (outPhoto) outPhotoId = await googleDriveService.uploadFile(outPhoto, folderId);

      // Upload additional files
      for (const f of additionalFiles) {
        const fid = await googleDriveService.uploadFile(f, folderId);
        fileIds.push(fid);
      }

      const issues: DispensationIssue[] = selectedIssues.map(type => {
        const issue: DispensationIssue = { type, status: 'PENDING' };
        if (type === 'ABSEN_KERJA') {
          issue.manual_check_in = manualCheckIn;
          issue.manual_check_out = manualCheckOut;
          issue.in_photo_id = inPhotoId;
          issue.out_photo_id = outPhotoId;
          issue.manual_location_id = manualLocationId || null;
        }
        return issue;
      });

      if (editData) {
        await dispensationService.update(editData.id, {
          issues,
          reason,
          file_ids: fileIds
        });
      } else {
        await dispensationService.create({
          account_id: user!.id,
          presence_id: selectedDate.presence_id,
          date: selectedDate.date,
          issues,
          reason,
          file_ids: fileIds,
          status: 'PENDING',
          is_read: false
        } as any);
      }

      Swal.fire({
        title: 'Berhasil!',
        text: 'Pengajuan dispensasi telah dikirim.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
      onSuccess();
    } catch (error) {
      console.error(error);
      Swal.fire('Gagal', 'Terjadi kesalahan saat menyimpan data.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-8 pt-8 pb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#006E62]/10 rounded-2xl flex items-center justify-center text-[#006E62]">
              <ClipboardList size={28} />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-800 tracking-tight">{editData ? 'Edit Pengajuan' : 'Buat Pengajuan'}</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Dispensasi Presensi</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center active:scale-90 transition-all">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-8 pb-8 space-y-8">
          {/* Step 1: Pilih Tanggal */}
          {!editData && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-[#006E62]" />
                <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">1. Pilih Tanggal</h4>
              </div>
              
              {isDetecting ? (
                <div className="py-10 flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                  <Loader2 className="animate-spin mb-3 text-[#006E62]" size={24} />
                  <p className="text-[10px] font-bold uppercase tracking-widest">Mencari tanggal bermasalah...</p>
                </div>
              ) : eligibleDates.length === 0 ? (
                <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100 flex items-center gap-4">
                  <CheckCircle2 className="text-emerald-500 shrink-0" size={24} />
                  <p className="text-xs text-emerald-700 font-bold">Tidak ditemukan masalah presensi dalam {windowDays} hari terakhir.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {eligibleDates.map((d, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedDate(d);
                        setSelectedIssues(d.issues);
                      }}
                      className={`p-3 rounded-[24px] border text-left transition-all flex flex-col gap-2 relative overflow-hidden ${
                        selectedDate?.date === d.date 
                        ? 'bg-[#006E62] border-[#006E62] text-white shadow-lg shadow-[#006E62]/20' 
                        : 'bg-white border-gray-100 text-gray-700 hover:border-red-200 hover:bg-red-50/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className={`px-2 py-1 rounded-lg ${selectedDate?.date === d.date ? 'bg-white/20' : 'bg-red-50'}`}>
                          <span className={`text-[10px] font-black ${selectedDate?.date === d.date ? 'text-white' : 'text-red-600'}`}>
                            {new Date(d.date).getDate()} {new Date(d.date).toLocaleDateString('id-ID', { month: 'short' })}
                          </span>
                        </div>
                        {selectedDate?.date === d.date && <CheckCircle2 size={14} className="text-white" />}
                      </div>
                      
                      <div>
                        <p className={`text-[9px] font-bold uppercase tracking-tight ${selectedDate?.date === d.date ? 'text-white/80' : 'text-gray-400'}`}>
                          {new Date(d.date).toLocaleDateString('id-ID', { weekday: 'long' })}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {d.issues.map((i, idx2) => (
                            <span key={idx2} className={`text-[8px] font-black uppercase ${
                              selectedDate?.date === d.date 
                              ? 'text-white' 
                              : 'text-red-600'
                            }`}>
                              {i.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Red Accent for Absen/Terlambat */}
                      {selectedDate?.date !== d.date && (
                        <div className="absolute top-0 right-0 w-1 h-full bg-red-500/20" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Detail Masalah */}
          {selectedDate && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-[#006E62]" />
                <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">2. Detail Dispensasi</h4>
              </div>

              {/* Manual Input for ABSEN_KERJA */}
              {selectedIssues.includes('ABSEN_KERJA') && (
                <div className="space-y-4 bg-gray-50 p-6 rounded-[32px] border border-gray-100">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Jam Masuk</label>
                      <input 
                        type="time"
                        value={manualCheckIn}
                        onChange={(e) => setManualCheckIn(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[#006E62] outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Jam Pulang</label>
                      <input 
                        type="time"
                        value={manualCheckOut}
                        onChange={(e) => setManualCheckOut(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[#006E62] outline-none"
                      />
                    </div>
                  </div>

                  {!account?.location_id && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Lokasi Kerja</label>
                      <select
                        value={manualLocationId}
                        onChange={(e) => setManualLocationId(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[#006E62] outline-none"
                      >
                        <option value="">Pilih Lokasi</option>
                        {locations.map(loc => (
                          <option key={loc.id} value={loc.id}>{loc.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Foto Masuk</label>
                      <label className={`relative flex flex-col items-center justify-center h-32 rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden ${inPhoto ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-gray-200'}`}>
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => setInPhoto(e.target.files?.[0] || null)} />
                        {inPhotoPreview ? (
                          <img src={inPhotoPreview} className="w-full h-full object-cover" />
                        ) : (
                          <>
                            <Camera className="text-gray-300" size={24} />
                            <span className="text-[8px] font-bold text-gray-400 uppercase mt-1">Ambil Foto</span>
                          </>
                        )}
                      </label>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Foto Pulang</label>
                      <label className={`relative flex flex-col items-center justify-center h-32 rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden ${outPhoto ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-gray-200'}`}>
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => setOutPhoto(e.target.files?.[0] || null)} />
                        {outPhotoPreview ? (
                          <img src={outPhotoPreview} className="w-full h-full object-cover" />
                        ) : (
                          <>
                            <Camera className="text-gray-300" size={24} />
                            <span className="text-[8px] font-bold text-gray-400 uppercase mt-1">Ambil Foto</span>
                          </>
                        )}
                      </label>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Alasan Pengajuan</label>
                <textarea
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Jelaskan alasan Anda..."
                  className="w-full px-5 py-4 rounded-3xl border border-gray-100 bg-gray-50 text-sm font-medium focus:ring-4 focus:ring-[#006E62]/5 focus:border-[#006E62] outline-none transition-all min-h-[100px] resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Lampiran Tambahan</label>
                <div className="flex flex-wrap gap-2">
                  {additionalFiles.map((f, i) => (
                    <div key={i} className="relative w-16 h-16 bg-gray-100 rounded-xl overflow-hidden group">
                      <img src={URL.createObjectURL(f)} className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => setAdditionalFiles(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  <label className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 hover:border-[#006E62] hover:text-[#006E62] transition-all cursor-pointer">
                    <input type="file" multiple className="hidden" onChange={(e) => {
                      if (e.target.files) setAdditionalFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                    }} />
                    <Upload size={20} />
                  </label>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-600">
            <Info size={14} />
            <p className="text-[9px] font-bold uppercase tracking-tighter italic">Verifikasi Admin Diperlukan</p>
          </div>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !selectedDate || selectedIssues.length === 0 || !reason}
            className="flex items-center gap-2 bg-[#006E62] text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#005c52] transition-all shadow-xl shadow-[#006E62]/20 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {editData ? 'Simpan' : 'Kirim'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DispensationForm;
