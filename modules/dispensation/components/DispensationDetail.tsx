import React, { useState } from 'react';
import { X, CheckCircle2, XCircle, AlertCircle, Calendar, User, FileText, Download, Clock, Save, Loader2, Info, MessageSquare, ClipboardList, MapPin, Camera, Eye, FileCheck } from 'lucide-react';
import { DispensationRequest, DispensationIssue, DispensationIssueStatus } from '../../../types';
import { dispensationService } from '../../../services/dispensationService';
import { googleDriveService } from '../../../services/googleDriveService';
import { authService } from '../../../services/authService';
import DetailModulLayoutAdmin from '../../../components/ui/DetailModulLayoutAdmin';
import AttendanceDetail from '../../monitoring/AttendanceDetail';
import { locationService } from '../../../services/locationService';
import { presenceService } from '../../../services/presenceService';
import { Location, Account } from '../../../types';
import Swal from 'sweetalert2';
import { formatDateID, formatFullDateID } from '../../../utils/dateFormatter';

interface DispensationDetailProps {
  request: DispensationRequest;
  onClose: () => void;
  onSuccess?: () => void;
  isAdmin: boolean;
}

const DispensationDetail: React.FC<DispensationDetailProps> = ({ request, onClose, onSuccess, isAdmin }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [issues, setIssues] = useState<DispensationIssue[]>([...request.issues]);
  const isAllVerified = issues.every(issue => issue.status !== 'PENDING');
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [showAttendanceDetail, setShowAttendanceDetail] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState<any>(null);
  const [isFetchingAttendance, setIsFetchingAttendance] = useState(false);

  React.useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const data = await locationService.getAll();
      setLocations(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleShowAttendance = async (presenceId: string) => {
    try {
      setIsFetchingAttendance(true);
      const attendance = await presenceService.getById(presenceId);
      setSelectedAttendance(attendance);
      setShowAttendanceDetail(true);
    } catch (error) {
      console.error(error);
      Swal.fire('Gagal', 'Gagal mengambil data presensi.', 'error');
    } finally {
      setIsFetchingAttendance(false);
    }
  };

  const handleIssueStatusChange = (index: number, status: DispensationIssueStatus) => {
    const newIssues = [...issues];
    newIssues[index].status = status;
    setIssues(newIssues);
  };

  const handleAdminNotesChange = (index: number, notes: string) => {
    const newIssues = [...issues];
    newIssues[index].admin_notes = notes;
    setIssues(newIssues);
  };

  const handleProcess = async () => {
    try {
      setIsLoading(true);
      
      const allApproved = issues.every(i => i.status === 'APPROVED');
      const allRejected = issues.every(i => i.status === 'REJECTED');
      const anyApproved = issues.some(i => i.status === 'APPROVED');
      
      let finalStatus: DispensationRequest['status'] = 'PENDING';
      if (allApproved) finalStatus = 'APPROVED';
      else if (allRejected) finalStatus = 'REJECTED';
      else if (anyApproved) finalStatus = 'PARTIAL';

      const verifier = authService.getCurrentUser();
      await dispensationService.verify(request.id, finalStatus, issues, verifier!.id);

      Swal.fire({
        title: 'Berhasil!',
        text: 'Keputusan dispensasi telah disimpan.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
      
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error(error);
      Swal.fire('Gagal', 'Terjadi kesalahan saat memproses data.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const getPhotoUrl = (id: string | null) => {
    if (!id) return null;
    return googleDriveService.getFileUrl(id);
  };

  if (isAdmin) {
    return (
      <DetailModulLayoutAdmin
        title="Detail Pengajuan"
        subtitle="Verifikasi Dispensasi Presensi"
        accountData={request.account ? {
          id: request.account_id,
          full_name: request.account.full_name,
          internal_nik: request.account.internal_nik,
          photo_google_id: request.account.photo_google_id,
          grade: request.account.grade,
          position: request.account.position,
          location: request.account.location
        } : null}
        onClose={onClose}
        footerActions={
          isAdmin && request.status === 'PENDING' && (
            <button
              onClick={handleProcess}
              disabled={isLoading || !isAllVerified}
              className="flex items-center gap-2 bg-[#006E62] text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#005c52] transition-all shadow-xl shadow-[#006E62]/20 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Simpan
            </button>
          )
        }
      >
        <div className="space-y-8">
          {/* Admin View: Date Info */}
          <div className="bg-gray-50 p-5 rounded-3xl border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-gray-400">
              <Calendar size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tanggal</p>
              <p className="text-sm font-black text-gray-800">
                {formatFullDateID(request.date)}
              </p>
              <p className="text-[11px] text-gray-500 font-bold">Diajukan: {formatDateID(request.created_at)}</p>
            </div>
          </div>

          {/* Alasan & Bukti Global (Optional fallback) */}
          {(request.reason && !request.issues.some(i => i.reason)) && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-[#006E62]" />
                <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Alasan & Lampiran</h4>
              </div>
              <div className="p-6 bg-white border border-gray-100 rounded-3xl shadow-sm italic text-sm text-gray-600 leading-relaxed">
                "{request.reason}"
              </div>

              {request.file_ids && request.file_ids.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {request.file_ids.map((fid, i) => {
                    const isImage = !fid.includes('|') || /\.(jpg|jpeg|png|webp|gif|svg|bmp)$/i.test(fid.split('|')[1]);
                    return (
                      <a 
                        key={i}
                        href={googleDriveService.getViewerUrl(fid)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-blue-100 transition-all border border-blue-100"
                      >
                        {isImage ? <Download size={14} /> : <FileCheck size={14} />}
                        Lampiran {i + 1}
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Daftar Masalah & Verifikasi */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-[#006E62]" />
              <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Daftar Masalah & Keputusan</h4>
            </div>

            <div className="space-y-4">
              {issues.map((issue, idx) => (
                <div key={idx} className={`p-6 rounded-[32px] border transition-all ${
                  issue.status === 'APPROVED' ? 'bg-emerald-50/50 border-emerald-100' :
                  issue.status === 'REJECTED' ? 'bg-rose-50/50 border-rose-100' :
                  'bg-white border-gray-100'
                }`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        issue.status === 'APPROVED' ? 'bg-emerald-500 text-white' :
                        issue.status === 'REJECTED' ? 'bg-rose-500 text-white' :
                        'bg-blue-500 text-white'
                      }`}>
                        <AlertCircle size={20} />
                      </div>
                      <div>
                        <span className="text-xs font-black text-gray-800 uppercase tracking-wider">{issue.type.replace('_', ' ')}</span>
                        {issue.type === 'ABSEN_KERJA' && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter flex items-center gap-1">
                              <Clock size={10} /> {issue.manual_check_in} - {issue.manual_check_out}
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter flex items-center gap-1">
                              <MapPin size={10} /> {issue.manual_location_id 
                                ? (locations.find(l => l.id === issue.manual_location_id)?.name || 'Lokasi Khusus')
                                : (request.account?.location?.name || 'Lokasi Penempatan')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Admin Action for TERLAMBAT / PULANG_AWAL */}
                    {isAdmin && (issue.type === 'TERLAMBAT' || issue.type === 'PULANG_AWAL') && request.presence_id && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleShowAttendance(request.presence_id!)}
                          disabled={isFetchingAttendance}
                          className="flex items-center gap-2 px-4 py-2 bg-[#006E62] text-[#FFFFFF] rounded-xl text-[10px] font-white uppercase tracking-widest hover:bg-[#004D45] transition-all active:scale-95"
                        >
                          {isFetchingAttendance ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                          Lihat Detail Presensi
                        </button>
                      </div>
                    )}

                    {isAdmin && request.status === 'PENDING' ? (
                      <div className="flex bg-gray-100 p-1 rounded-2xl w-fit">
                        <button 
                          onClick={() => handleIssueStatusChange(idx, 'APPROVED')}
                          className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${issue.status === 'APPROVED' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-gray-400'}`}
                        >
                          <CheckCircle2 size={14} /> Setuju
                        </button>
                        <button 
                          onClick={() => handleIssueStatusChange(idx, 'REJECTED')}
                          className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${issue.status === 'REJECTED' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'text-gray-400'}`}
                        >
                          <XCircle size={14} /> Tolak
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {issue.status === 'APPROVED' ? (
                          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><CheckCircle2 size={12} /> Disetujui</span>
                        ) : issue.status === 'REJECTED' ? (
                          <span className="px-3 py-1 bg-rose-100 text-rose-700 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><XCircle size={12} /> Ditolak</span>
                        ) : (
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><Clock size={12} /> Pending</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Per-Issue Reason & Files */}
                  {issue.reason && (
                    <div className="mt-4 p-4 bg-white/50 rounded-2xl border border-gray-100 italic text-xs text-gray-600 leading-relaxed">
                      "{issue.reason}"
                    </div>
                  )}

                  {issue.file_ids && issue.file_ids.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {issue.file_ids.map((fid, i) => {
                        const isImage = !fid.includes('|') || /\.(jpg|jpeg|png|webp|gif|svg|bmp)$/i.test(fid.split('|')[1]);
                        return (
                          <a 
                            key={i}
                            href={googleDriveService.getViewerUrl(fid)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white text-blue-600 rounded-lg text-[9px] font-bold uppercase tracking-wider hover:bg-blue-50 transition-all border border-blue-50"
                          >
                            {isImage ? <Download size={12} /> : <FileCheck size={12} />}
                            Bukti {i + 1}
                          </a>
                        );
                      })}
                    </div>
                  )}

                  {/* Manual Photos for ABSEN_KERJA */}
                  {issue.type === 'ABSEN_KERJA' && (issue.in_photo_id || issue.out_photo_id) && (
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      {issue.in_photo_id && (
                        <div className="space-y-2">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Foto Masuk</p>
                          <div className="aspect-video rounded-2xl overflow-hidden border border-gray-100 shadow-sm relative group">
                            <img src={getPhotoUrl(issue.in_photo_id)!} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            <a href={getPhotoUrl(issue.in_photo_id)!} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                              <Eye size={20} />
                            </a>
                          </div>
                        </div>
                      )}
                      {issue.out_photo_id && (
                        <div className="space-y-2">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Foto Pulang</p>
                          <div className="aspect-video rounded-2xl overflow-hidden border border-gray-100 shadow-sm relative group">
                            <img src={getPhotoUrl(issue.out_photo_id)!} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            <a href={getPhotoUrl(issue.out_photo_id)!} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                              <Eye size={20} />
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Admin Notes */}
                  {(isAdmin && request.status === 'PENDING') ? (
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center gap-2 text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">
                        <MessageSquare size={12} />
                        <span>Catatan Admin</span>
                      </div>
                      <input 
                        type="text"
                        value={issue.admin_notes || ''}
                        onChange={(e) => handleAdminNotesChange(idx, e.target.value)}
                        placeholder="Tambahkan catatan..."
                        className="w-full px-5 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-[#006E62] outline-none transition-all"
                      />
                    </div>
                  ) : issue.admin_notes && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Catatan Admin:</p>
                      <p className="text-xs text-gray-600 font-medium italic">"{issue.admin_notes}"</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Attendance Detail Modal */}
      {showAttendanceDetail && selectedAttendance && (
        <AttendanceDetail 
          attendance={selectedAttendance}
          account={request.account as any}
          onClose={() => setShowAttendanceDetail(false)}
        />
      )}
    </DetailModulLayoutAdmin>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-3xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-8 py-6 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#006E62]/10 rounded-2xl flex items-center justify-center text-[#006E62]">
              <ClipboardList size={28} />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-800 tracking-tight">Detail Pengajuan</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Verifikasi Dispensasi Presensi</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center active:scale-90 transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Info Pegawai & Tanggal */}
          <div className="bg-gray-50 p-6 rounded-[32px] border border-gray-100 flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-gray-400">
              <Calendar size={28} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tanggal</p>
              <p className="text-base font-black text-gray-800">
                {formatFullDateID(request.date)}
              </p>
              <p className="text-xs text-gray-500 font-bold">Diajukan: {formatDateID(request.created_at)}</p>
            </div>
          </div>

          {/* Alasan & Bukti Global (Optional fallback) */}
          {(request.reason && !request.issues.some(i => i.reason)) && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-[#006E62]" />
                <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Alasan & Lampiran</h4>
              </div>
              <div className="p-6 bg-white border border-gray-100 rounded-3xl shadow-sm italic text-sm text-gray-600 leading-relaxed">
                "{request.reason}"
              </div>

              {request.file_ids && request.file_ids.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {request.file_ids.map((fid, i) => {
                    const isImage = !fid.includes('|') || /\.(jpg|jpeg|png|webp|gif|svg|bmp)$/i.test(fid.split('|')[1]);
                    return (
                      <a 
                        key={i}
                        href={googleDriveService.getViewerUrl(fid)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-blue-100 transition-all border border-blue-100"
                      >
                        {isImage ? <Download size={14} /> : <FileCheck size={14} />}
                        Lampiran {i + 1}
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Daftar Masalah & Verifikasi */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-[#006E62]" />
              <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Daftar Masalah & Keputusan</h4>
            </div>

            <div className="space-y-4">
              {issues.map((issue, idx) => (
                <div key={idx} className={`p-6 rounded-[32px] border transition-all ${
                  issue.status === 'APPROVED' ? 'bg-emerald-50/50 border-emerald-100' :
                  issue.status === 'REJECTED' ? 'bg-rose-50/50 border-rose-100' :
                  'bg-white border-gray-100'
                }`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        issue.status === 'APPROVED' ? 'bg-emerald-500 text-white' :
                        issue.status === 'REJECTED' ? 'bg-rose-500 text-white' :
                        'bg-blue-500 text-white'
                      }`}>
                        <AlertCircle size={20} />
                      </div>
                      <div>
                        <span className="text-xs font-black text-gray-800 uppercase tracking-wider">{issue.type.replace('_', ' ')}</span>
                        {issue.type === 'ABSEN_KERJA' && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter flex items-center gap-1">
                              <Clock size={10} /> {issue.manual_check_in} - {issue.manual_check_out}
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter flex items-center gap-1">
                              <MapPin size={10} /> {issue.manual_location_id 
                                ? (locations.find(l => l.id === issue.manual_location_id)?.name || 'Lokasi Khusus')
                                : (request.account?.location?.name || 'Lokasi Penempatan')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {isAdmin && request.status === 'PENDING' ? (
                      <div className="flex bg-gray-100 p-1 rounded-2xl w-fit">
                        <button 
                          onClick={() => handleIssueStatusChange(idx, 'APPROVED')}
                          className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${issue.status === 'APPROVED' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-gray-400'}`}
                        >
                          <CheckCircle2 size={14} /> Setuju
                        </button>
                        <button 
                          onClick={() => handleIssueStatusChange(idx, 'REJECTED')}
                          className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${issue.status === 'REJECTED' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'text-gray-400'}`}
                        >
                          <XCircle size={14} /> Tolak
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {issue.status === 'APPROVED' ? (
                          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><CheckCircle2 size={12} /> Disetujui</span>
                        ) : issue.status === 'REJECTED' ? (
                          <span className="px-3 py-1 bg-rose-100 text-rose-700 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><XCircle size={12} /> Ditolak</span>
                        ) : (
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><Clock size={12} /> Pending</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Per-Issue Reason & Files */}
                  {issue.reason && (
                    <div className="mt-4 p-4 bg-white/50 rounded-2xl border border-gray-100 italic text-xs text-gray-600 leading-relaxed">
                      "{issue.reason}"
                    </div>
                  )}

                  {issue.file_ids && issue.file_ids.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {issue.file_ids.map((fid, i) => {
                        const isImage = !fid.includes('|') || /\.(jpg|jpeg|png|webp|gif|svg|bmp)$/i.test(fid.split('|')[1]);
                        return (
                          <a 
                            key={i}
                            href={googleDriveService.getViewerUrl(fid)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white text-blue-600 rounded-lg text-[9px] font-bold uppercase tracking-wider hover:bg-blue-50 transition-all border border-blue-50"
                          >
                            {isImage ? <Download size={12} /> : <FileCheck size={12} />}
                            Bukti {i + 1}
                          </a>
                        );
                      })}
                    </div>
                  )}

                  {/* Manual Photos for ABSEN_KERJA */}
                  {issue.type === 'ABSEN_KERJA' && (issue.in_photo_id || issue.out_photo_id) && (
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      {issue.in_photo_id && (
                        <div className="space-y-2">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Foto Masuk</p>
                          <div className="aspect-video rounded-2xl overflow-hidden border border-gray-100 shadow-sm relative group">
                            <img src={getPhotoUrl(issue.in_photo_id)!} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            <a href={getPhotoUrl(issue.in_photo_id)!} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                              <Eye size={20} />
                            </a>
                          </div>
                        </div>
                      )}
                      {issue.out_photo_id && (
                        <div className="space-y-2">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Foto Pulang</p>
                          <div className="aspect-video rounded-2xl overflow-hidden border border-gray-100 shadow-sm relative group">
                            <img src={getPhotoUrl(issue.out_photo_id)!} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            <a href={getPhotoUrl(issue.out_photo_id)!} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                              <Eye size={20} />
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Admin Notes */}
                  {(isAdmin && request.status === 'PENDING') ? (
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center gap-2 text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">
                        <MessageSquare size={12} />
                        <span>Catatan Admin</span>
                      </div>
                      <input 
                        type="text"
                        value={issue.admin_notes || ''}
                        onChange={(e) => handleAdminNotesChange(idx, e.target.value)}
                        placeholder="Tambahkan catatan..."
                        className="w-full px-5 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-[#006E62] outline-none transition-all"
                      />
                    </div>
                  ) : issue.admin_notes && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Catatan Admin:</p>
                      <p className="text-xs text-gray-600 font-medium italic">"{issue.admin_notes}"</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-xl text-xs font-black text-gray-500 uppercase tracking-widest hover:bg-gray-200 transition-all"
            >
              Tutup
            </button>
            {isAdmin && request.status === 'PENDING' && (
              <button
                onClick={handleProcess}
                disabled={isLoading || !isAllVerified}
                className="flex items-center gap-2 bg-[#006E62] text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#005c52] transition-all shadow-xl shadow-[#006E62]/20 disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                Simpan
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DispensationDetail;
