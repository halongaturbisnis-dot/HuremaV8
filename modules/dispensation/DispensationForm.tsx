import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Calendar, Clock, FileText, Upload, CheckCircle2, Loader2, Info, ClipboardList, MapPin, Camera, FileCheck } from 'lucide-react';
import { dispensationService } from '../../services/dispensationService';
import { googleDriveService } from '../../services/googleDriveService';
import { authService } from '../../services/authService';
import { accountService } from '../../services/accountService';
import { locationService } from '../../services/locationService';
import { DispensationRequest, DispensationIssueType, DispensationIssue, Account, Location } from '../../types';
import Swal from 'sweetalert2';
import { formatDateID } from '../../utils/dateFormatter';

interface DispensationFormProps {
  onClose: () => void;
  onSuccess: () => void;
  editData: DispensationRequest | null;
}

interface EligibleDate {
  date: string;
  presence_id: string | null;
  issues: DispensationIssueType[];
  scheduleName?: string;
}

const DispensationForm: React.FC<DispensationFormProps> = ({ onClose, onSuccess, editData }) => {
  const user = authService.getCurrentUser();
  const [isLoading, setIsLoading] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [eligibleDates, setEligibleDates] = useState<EligibleDate[]>([]);
  const [windowDays, setWindowDays] = useState<number>(7);
  const [selectedDate, setSelectedDate] = useState<EligibleDate | null>(null);
  const [selectedIssues, setSelectedIssues] = useState<DispensationIssueType[]>([]);
  const [issueReasons, setIssueReasons] = useState<Record<string, string>>({});
  const [issueFiles, setIssueFiles] = useState<Record<string, File[]>>({});
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
      
      const reasons: Record<string, string> = {};
      editData.issues.forEach(i => {
        if (i.reason) reasons[i.type] = i.reason;
      });
      setIssueReasons(reasons);

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
    
    if (!selectedDate || selectedIssues.length === 0) {
      Swal.fire('Peringatan', 'Mohon lengkapi data pengajuan.', 'warning');
      return;
    }

    // Validate each issue has reason and files
    for (const type of selectedIssues) {
      if (!issueReasons[type] || (!editData && (!issueFiles[type] || issueFiles[type].length === 0))) {
        Swal.fire('Peringatan', `Mohon isi alasan dan lampiran untuk ${type.replace('_', ' ')}.`, 'warning');
        return;
      }
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

      const issues: DispensationIssue[] = [];
      
      for (const type of selectedIssues) {
        const issueFileIds: string[] = [];
        if (issueFiles[type]) {
          for (const f of issueFiles[type]) {
            const fid = await googleDriveService.uploadFile(f, folderId);
            issueFileIds.push(fid);
          }
        }

        const issue: DispensationIssue = { 
          type, 
          status: 'PENDING',
          reason: issueReasons[type],
          file_ids: issueFileIds
        };

        if (type === 'ABSEN_KERJA') {
          issue.manual_check_in = manualCheckIn;
          issue.manual_check_out = manualCheckOut;
          issue.in_photo_id = inPhotoId;
          issue.out_photo_id = outPhotoId;
          issue.manual_location_id = manualLocationId || null;
        }
        issues.push(issue);
      }

      if (editData) {
        await dispensationService.update(editData.id, {
          issues,
          reason: Object.values(issueReasons).join('; '), // Fallback global reason
          file_ids: [] // Global file_ids can be empty now as we use per-issue
        });
      } else {
        // Clean up input to avoid RLS issues with default columns
        const input = {
          account_id: user!.id,
          presence_id: selectedDate.presence_id || null,
          date: selectedDate.date,
          issues,
          reason: Object.values(issueReasons).join('; '),
          file_ids: []
        };
        
        await dispensationService.create(input as any);
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
                <div className="max-h-[320px] overflow-y-auto pr-2 space-y-3 scrollbar-hide">
                  <div className="grid grid-cols-1 gap-3">
                    {eligibleDates.map((d, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedDate(d);
                          setSelectedIssues(d.issues);
                        }}
                        className={`p-4 rounded-[28px] border text-left transition-all flex items-center justify-between relative overflow-hidden ${
                          selectedDate?.date === d.date 
                          ? 'bg-[#006E62] border-[#006E62] text-white shadow-lg shadow-[#006E62]/20' 
                          : 'bg-white border-gray-100 text-gray-700 hover:border-red-200 hover:bg-red-50/30'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center border ${selectedDate?.date === d.date ? 'bg-white/20 border-white/30' : 'bg-red-50 border-red-100'}`}>
                            <span className={`text-[10px] font-black uppercase ${selectedDate?.date === d.date ? 'text-white/70' : 'text-red-400'}`}>
                              {formatDateID(d.date).split(' ')[1]}
                            </span>
                            <span className={`text-lg font-black leading-none ${selectedDate?.date === d.date ? 'text-white' : 'text-red-600'}`}>
                              {formatDateID(d.date).split(' ')[0]}
                            </span>
                          </div>
                          
                          <div>
                            <p className={`text-[10px] font-black uppercase tracking-widest ${selectedDate?.date === d.date ? 'text-white' : 'text-gray-800'}`}>
                              {new Date(d.date).toLocaleDateString('id-ID', { weekday: 'long' })}
                            </p>
                            <p className={`text-[9px] font-bold uppercase tracking-[0.2em] mt-0.5 ${selectedDate?.date === d.date ? 'text-white/60' : 'text-gray-400'}`}>
                              {d.scheduleName || 'Jadwal Reguler'}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {d.issues.map((i, idx2) => (
                                <span key={idx2} className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-lg ${
                                  selectedDate?.date === d.date 
                                  ? 'bg-white/20 text-white' 
                                  : 'bg-red-50 text-red-600'
                                }`}>
                                  {i.replace('_', ' ')}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {selectedDate?.date === d.date && <CheckCircle2 size={24} className="text-white" />}
                          <div className={`w-1 h-12 rounded-full ${selectedDate?.date === d.date ? 'bg-white/20' : 'bg-red-500/20'}`} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Pilih Masalah */}
          {selectedDate && selectedDate.issues.length > 1 && (
            <div className="space-y-4 animate-in fade-in duration-500">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-[#006E62]" />
                <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">2. Pilih Masalah</h4>
              </div>
              <div className="flex gap-3">
                {selectedDate.issues.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleIssueToggle(type)}
                    className={`flex-1 py-4 px-4 rounded-3xl border-2 font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                      selectedIssues.includes(type)
                      ? 'bg-[#006E62] border-[#006E62] text-white shadow-lg shadow-[#006E62]/20'
                      : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                    }`}
                  >
                    {selectedIssues.includes(type) ? <CheckCircle2 size={16} /> : <div className="w-4 h-4 rounded-full border-2 border-gray-200" />}
                    {type.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Detail Masalah */}
          {selectedDate && selectedIssues.length > 0 && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-[#006E62]" />
                <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{selectedDate.issues.length > 1 ? '3' : '2'}. Detail Dispensasi</h4>
              </div>

              {selectedIssues.map((type) => (
                <div key={type} className="space-y-6 p-6 bg-gray-50 rounded-[32px] border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#006E62] text-white rounded-lg flex items-center justify-center text-[10px] font-black">
                      {type === 'TERLAMBAT' ? 'IN' : type === 'PULANG_AWAL' ? 'OUT' : 'ABS'}
                    </div>
                    <h5 className="text-xs font-black text-gray-800 uppercase tracking-wider">{type.replace('_', ' ')}</h5>
                  </div>

                  {/* Manual Input for ABSEN_KERJA */}
                  {type === 'ABSEN_KERJA' && (
                    <div className="space-y-4">
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
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Alasan {type.replace('_', ' ')}</label>
                    <textarea
                      required
                      value={issueReasons[type] || ''}
                      onChange={(e) => setIssueReasons(prev => ({ ...prev, [type]: e.target.value }))}
                      placeholder={`Jelaskan alasan ${type.replace('_', ' ')} Anda...`}
                      className="w-full px-5 py-4 rounded-3xl border border-gray-100 bg-white text-sm font-medium focus:ring-4 focus:ring-[#006E62]/5 focus:border-[#006E62] outline-none transition-all min-h-[80px] resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Lampiran {type.replace('_', ' ')}</label>
                    <div className="flex flex-wrap gap-2">
                      {issueFiles[type]?.map((f, i) => (
                        <div key={i} className="relative w-16 h-16 bg-gray-100 rounded-xl overflow-hidden group flex items-center justify-center">
                          {f.type.startsWith('image/') ? (
                            <img src={URL.createObjectURL(f)} className="w-full h-full object-cover" />
                          ) : (
                            <FileCheck className="text-[#006E62]" size={24} />
                          )}
                          <button 
                            type="button"
                            onClick={() => setIssueFiles(prev => ({ ...prev, [type]: prev[type].filter((_, idx) => idx !== i) }))}
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                      <label className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 hover:border-[#006E62] hover:text-[#006E62] transition-all cursor-pointer bg-white">
                        <input type="file" multiple className="hidden" onChange={(e) => {
                          if (e.target.files) {
                            const files = Array.from(e.target.files);
                            setIssueFiles(prev => ({ ...prev, [type]: [...(prev[type] || []), ...files] }));
                          }
                        }} />
                        <Upload size={20} />
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          
          <button
            onClick={handleSubmit}
            disabled={isLoading || !selectedDate || selectedIssues.length === 0 || selectedIssues.some(type => !issueReasons[type] || (!editData && (!issueFiles[type] || issueFiles[type].length === 0)))}
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
