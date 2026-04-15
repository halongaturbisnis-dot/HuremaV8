import React, { useState } from 'react';
import { X, CheckCircle, XCircle, Clock, User, FileText, Paperclip, ExternalLink, Calendar, MessageSquare, MapPin, Eye, Navigation, AlertCircle, Info, Search, Camera } from 'lucide-react';
import { Submission } from '../../types';
import { googleDriveService } from '../../services/googleDriveService';
import PresenceMap from '../presence/PresenceMap';

interface SubmissionDetailProps {
  submission: Submission;
  onClose: () => void;
  onVerify: (id: string, status: 'Disetujui' | 'Ditolak', notes?: string) => void;
  canVerify: boolean;
}

const SubmissionDetail: React.FC<SubmissionDetailProps> = ({ submission, onClose, onVerify, canVerify }) => {
  const [notes, setNotes] = useState('');

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTimeOnly = (timeStr: string | null, forceTimeZone?: string | null) => {
    if (!timeStr) return '-';
    if (timeStr === '-') return '-';
    
    // Check if it's a full ISO timestamp or just a time string
    if (timeStr.includes('T') || timeStr.includes('-')) {
      try {
        const date = new Date(timeStr);
        if (isNaN(date.getTime())) return timeStr.slice(0, 5);
        
        const tz = forceTimeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
        return new Intl.DateTimeFormat('id-ID', { 
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: false,
          timeZone: tz 
        }).format(date).replace(/\./g, ':');
      } catch (e) {
        return timeStr.slice(0, 5);
      }
    }
    
    // It's likely a HH:mm:ss string
    return timeStr.slice(0, 5);
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const d = R * c;
    return d; // distance in meters
  };

  const DataItem = ({ label, value }: { label: string, value: string }) => (
    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 h-full">
      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-xs font-bold text-gray-700">{value}</p>
    </div>
  );

  const ProfileItem = ({ label, name, photoId }: { label: string, name: string, photoId?: string | null }) => (
    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex items-center gap-3 h-full">
      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm bg-gray-200 flex items-center justify-center shrink-0">
        {photoId ? (
          <img 
            src={googleDriveService.getFileUrl(photoId)} 
            alt={name} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <User size={20} className="text-gray-400" />
        )}
      </div>
      <div>
        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
        <p className="text-xs font-bold text-gray-700">{name}</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div>
                <h3 className="text-base font-bold text-gray-800">Detail Pengajuan {submission.type}</h3>
             </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {submission.type === 'Presensi Luar' ? (
            <div className="space-y-6">
              {/* Header Info: Profile & Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-emerald-50 bg-gray-100 flex items-center justify-center shrink-0 shadow-inner">
                      {submission.account?.photo_google_id ? (
                        <img 
                          src={googleDriveService.getFileUrl(submission.account.photo_google_id)} 
                          alt={submission.account.full_name} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <User size={32} className="text-gray-300" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-0.5">Karyawan Pengaju</p>
                      <h4 className="text-base font-black text-gray-800 truncate leading-tight">{submission.account?.full_name}</h4>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-tighter">{submission.account?.internal_nik}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-3">
                  <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Departemen</p>
                    <p className="text-xs font-bold text-[#006E62]">{(submission.account as any)?.grade || '-'}</p>
                  </div>
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Jabatan</p>
                    <p className="text-xs font-medium text-gray-700">{submission.account?.position || '-'}</p>
                  </div>
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Lokasi Penempatan</p>
                    <p className="text-xs font-bold text-gray-700">{(submission.account as any)?.location?.name || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Map & Location Detail */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-3 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-emerald-600" />
                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Titik Presensi vs Lokasi Kantor</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-black rounded-full uppercase">
                      {submission.submission_data.presence_type === 'IN' ? 'Presensi Masuk' : 'Presensi Keluar'}
                    </span>
                    {submission.submission_data.presence_type === 'OUT' && submission.submission_data.full_attendance?.status_out === 'Terlambat Pulang' && (
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[9px] font-black rounded-full uppercase">
                        Terlambat Pulang
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  {(() => {
                    const att = submission.submission_data.full_attendance;
                    const office = (submission.account as any)?.location;
                    const isIN = submission.submission_data.presence_type === 'IN';
                    const userLat = isIN ? att?.in_latitude : att?.out_latitude;
                    const userLng = isIN ? att?.in_longitude : att?.out_longitude;
                    const address = isIN ? att?.in_address : att?.out_address;

                    // Snapshot target location
                    const targetLat = att?.target_latitude || office?.latitude;
                    const targetLng = att?.target_longitude || office?.longitude;
                    const targetRad = att?.target_radius || office?.radius || 100;

                    if (!userLat || !userLng || !targetLat) return (
                      <div className="py-8 text-center text-gray-400 text-xs italic">Data lokasi tidak tersedia</div>
                    );

                    return (
                      <>
                        <div className="h-48 rounded-xl overflow-hidden border border-gray-100 shadow-inner relative">
                          <PresenceMap 
                            userLat={userLat}
                            userLng={userLng}
                            officeLat={targetLat}
                            officeLng={targetLng!}
                            radius={targetRad}
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                              <Navigation size={16} className="text-emerald-600" />
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Alamat Presensi</p>
                              <p className="text-[11px] text-gray-600 leading-relaxed font-medium">{address || 'Alamat tidak terdeteksi'}</p>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                              <MapPin size={16} className="text-blue-600" />
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Jarak Titik Presensi</p>
                              <p className="text-[11px] font-bold text-gray-700">
                                {Math.round(calculateDistance(userLat, userLng, targetLat, targetLng!))} Meter
                              </p>
                              <p className="text-[9px] text-gray-400 font-medium italic">Radius: {targetRad}m</p>
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Schedule & Attendance Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
                    <Calendar size={14} className="text-blue-600" />
                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Informasi Jadwal</span>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Nama Jadwal</p>
                    <p className="text-xs font-bold text-gray-700">{submission.submission_data.full_attendance?.schedule_name_snapshot || (submission.account as any)?.schedule?.name || '-'}</p>
                  </div>
                  {(() => {
                    const att = submission.submission_data.full_attendance;
                    const date = new Date(att?.created_at || new Date());
                    const dayOfWeek = date.getDay();
                    const rule = (submission.account as any)?.schedule?.rules?.find((r: any) => r.day_of_week === dayOfWeek);
                    
                    // Snapshot target rules
                    const checkInTarget = att?.target_check_in || rule?.check_in_time || '-';
                    const checkOutTarget = att?.target_check_out || rule?.check_out_time || '-';
                    const lateTolerance = att?.target_late_tolerance !== undefined && att?.target_late_tolerance !== null
                      ? att.target_late_tolerance
                      : ((submission.account as any)?.schedule?.tolerance_checkin_minutes || 0);
                    const earlyTolerance = att?.target_early_tolerance !== undefined && att?.target_early_tolerance !== null
                      ? att.target_early_tolerance
                      : ((submission.account as any)?.schedule?.tolerance_checkout_minutes || 0);
                    
                    return (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <p className="text-[8px] font-bold text-gray-400 uppercase">Jam Masuk</p>
                          <p className="text-[11px] font-bold text-emerald-600">{formatTimeOnly(checkInTarget)}</p>
                        </div>
                        <div>
                          <p className="text-[8px] font-bold text-gray-400 uppercase">Jam Pulang</p>
                          <p className="text-[11px] font-bold text-red-600">{formatTimeOnly(checkOutTarget)}</p>
                        </div>
                        <div>
                          <p className="text-[8px] font-bold text-gray-400 uppercase">Toleransi Masuk</p>
                          <p className="text-[11px] font-bold text-gray-600">{lateTolerance} Menit</p>
                        </div>
                        <div>
                          <p className="text-[8px] font-bold text-gray-400 uppercase">Toleransi Pulang</p>
                          <p className="text-[11px] font-bold text-gray-600">{earlyTolerance} Menit</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
                    <Clock size={14} className="text-purple-600" />
                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Status Kehadiran</span>
                  </div>
                  {(() => {
                    const att = submission.submission_data.full_attendance;
                    const isIN = submission.submission_data.presence_type === 'IN';
                    const time = isIN ? att?.check_in : att?.check_out;
                    const lateEarly = isIN 
                      ? att?.late_minutes 
                      : (att?.status_out === 'Terlambat Pulang' ? att?.late_checkout_minutes : att?.early_departure_minutes);
                    const reason = isIN 
                      ? att?.late_reason 
                      : (att?.status_out === 'Terlambat Pulang' ? att?.late_checkout_reason : att?.early_departure_reason);
                    
                    return (
                      <>
                        <div>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Tanggal Presensi</p>
                          <p className="text-xs font-bold text-gray-700">{time ? new Date(time).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Waktu Presensi</p>
                          <p className="text-xs font-bold text-[#006E62]">{time ? formatTimeOnly(time, isIN ? att?.in_timezone : att?.out_timezone) : '-'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{isIN ? 'Terlambat' : (att?.status_out === 'Terlambat Pulang' ? 'Terlambat Pulang' : 'Pulang Awal')}</p>
                          <p className={`text-xs font-bold ${(isIN ? att?.late_minutes > 0 : (att?.status_out === 'Terlambat Pulang' || att?.early_departure_minutes > 0)) ? 'text-red-600' : 'text-emerald-600'}`}>
                            {lateEarly || 0} Menit
                          </p>
                        </div>
                        {(lateEarly > 0 || att?.status_out === 'Terlambat Pulang' || reason) && (
                          <div className="pt-1">
                            <p className="text-[8px] font-bold text-gray-400 uppercase">Alasan {isIN ? 'Terlambat' : (att?.status_out === 'Terlambat Pulang' ? 'Terlambat' : 'Pulang Awal')}</p>
                            <p className="text-[10px] text-gray-500 italic leading-tight">"{reason || '-'}"</p>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
                    <Info size={14} className="text-orange-600" />
                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Foto Verifikasi</span>
                  </div>
                  <div className="aspect-square rounded-xl overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center relative group">
                    {(() => {
                      const att = submission.submission_data.full_attendance;
                      const isIN = submission.submission_data.presence_type === 'IN';
                      const photoId = isIN ? att?.in_photo_id : att?.out_photo_id;
                      
                      if (!photoId) return <User size={24} className="text-gray-200" />;
                      
                      const [id] = photoId.split('|');
                      // Try multiple URL formats for better compatibility
                      const photoUrl = `https://drive.google.com/uc?id=${id}`;
                      
                      return (
                        <a 
                          href={googleDriveService.getViewerUrl(id)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block w-full h-full"
                        >
                          <img 
                            src={photoUrl} 
                            alt="Foto Presensi" 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 cursor-zoom-in"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              // Fallback to lh3 if uc fails
                              if (!target.src.includes('lh3')) {
                                target.src = `https://lh3.googleusercontent.com/d/${id}=s1600`;
                              } else {
                                target.src = 'https://via.placeholder.com/400?text=Foto+Tidak+Tersedia';
                              }
                            }}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <div className="bg-white/90 p-2 rounded-full shadow-lg">
                              <Eye size={20} className="text-[#006E62]" />
                            </div>
                          </div>
                        </a>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Tipe & Alasan Presensi Luar - Full Width at Bottom of Scroll Area */}
              {submission.submission_data.location_type && submission.submission_data.location_type !== 'Reguler' && (
                <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-amber-50">
                    <AlertCircle size={14} className="text-amber-600" />
                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Jenis & Alasan Presensi Luar</span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-800">
                      {submission.submission_data.location_type === 'Tugas Luar' || submission.submission_data.location_type === 'WFH' || submission.submission_data.location_type === 'Ketemu Client' ? 'Luar Lokasi' : submission.submission_data.location_type}
                    </p>
                    <p className="text-xs text-gray-600 italic leading-relaxed bg-amber-50/30 p-3 rounded-lg border border-amber-50/50">
                      "{submission.submission_data.reason || 'Tidak ada alasan yang diberikan'}"
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                 <ProfileItem 
                    label="Pengaju" 
                    name={submission.account?.full_name || '-'} 
                    photoId={submission.account?.photo_google_id} 
                 />
                 <DataItem label="NIK Internal" value={submission.account?.internal_nik || '-'} />
                 <DataItem label="Tanggal Pengajuan" value={formatDate(submission.created_at)} />
                 <DataItem label="Status Saat Ini" value={submission.status} />
              </div>

              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b pb-1">Data Spesifik Pengajuan</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                   {(() => {
                     const data = { ...submission.submission_data };
                     const keys = Object.keys(data).filter(k => !k.toLowerCase().endsWith('_id') && k !== 'full_attendance');
                     
                     // Find Start Date and End Date keys (case insensitive)
                     const startDateKey = keys.find(k => k.toLowerCase().replace(' ', '') === 'startdate');
                     const endDateKey = keys.find(k => k.toLowerCase().replace(' ', '') === 'enddate');

                     const otherKeys = keys.filter(k => k !== startDateKey && k !== endDateKey);

                     return (
                       <>
                         {startDateKey && (
                           <div key={startDateKey} className="flex justify-between items-center p-2 bg-emerald-50/20 rounded border border-emerald-100/30">
                              <span className="text-[10px] font-medium text-gray-500 capitalize">{startDateKey.replace('_', ' ')}</span>
                              <span className="text-[10px] font-bold text-[#006E62]">{data[startDateKey]}</span>
                           </div>
                         )}
                         {endDateKey && (
                           <div key={endDateKey} className="flex justify-between items-center p-2 bg-emerald-50/20 rounded border border-emerald-100/30">
                              <span className="text-[10px] font-medium text-gray-500 capitalize">{endDateKey.replace('_', ' ')}</span>
                              <span className="text-[10px] font-bold text-[#006E62]">{data[endDateKey]}</span>
                           </div>
                         )}
                         {otherKeys.map(key => (
                           <div key={key} className="flex justify-between items-center p-2 bg-emerald-50/20 rounded border border-emerald-100/30">
                              <span className="text-[10px] font-medium text-gray-500 capitalize">{key.replace('_', ' ')}</span>
                              <span className="text-[10px] font-bold text-[#006E62]">{data[key]}</span>
                           </div>
                         ))}
                       </>
                     );
                   })()}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b pb-1">Keterangan / Alasan</h4>
                <div className="p-4 bg-gray-50 rounded-xl italic text-xs text-gray-600 leading-relaxed border border-gray-100">
                   "{submission.description}"
                </div>
              </div>

              {submission.file_id && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b pb-1">Lampiran Dokumen</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {submission.file_id.split(',').map((fid, index) => (
                      <a 
                        key={index}
                        href={googleDriveService.getViewerUrl(fid)} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all group"
                      >
                         <div className="flex items-center gap-3">
                           <Paperclip size={18} className="text-[#006E62]" />
                           <span className="text-xs font-bold text-gray-700 truncate max-w-[200px]">
                             {fid.includes('|') ? fid.split('|')[1] : `Lihat Lampiran ${index + 1}`}
                           </span>
                         </div>
                         <ExternalLink size={14} className="text-gray-300 group-hover:text-[#006E62]" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {submission.status !== 'Pending' && (
             <div className="space-y-2 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                <h4 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <CheckCircle size={14} /> Informasi Verifikasi
                </h4>
                <div className="grid grid-cols-2 gap-4 text-[10px]">
                   <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full overflow-hidden border border-blue-200 bg-blue-100 flex items-center justify-center shrink-0">
                       {submission.verifier?.photo_google_id ? (
                         <img 
                           src={googleDriveService.getFileUrl(submission.verifier.photo_google_id)} 
                           alt={submission.verifier.full_name} 
                           className="w-full h-full object-cover"
                           referrerPolicy="no-referrer"
                         />
                       ) : (
                         <User size={16} className="text-blue-400" />
                       )}
                     </div>
                     <div>
                       <p className="text-gray-400 uppercase">Diverifikasi Oleh</p>
                       <p className="font-bold text-gray-700">{submission.verifier?.full_name || '-'}</p>
                     </div>
                   </div>
                   <div>
                     <p className="text-gray-400 uppercase">Waktu Verifikasi</p>
                     <p className="font-bold text-gray-700">{formatDate(submission.verified_at!)}</p>
                   </div>
                </div>
                {submission.verification_notes && (
                  <div className="mt-2 pt-2 border-t border-blue-100 flex gap-2">
                    <MessageSquare size={12} className="text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-blue-600 italic">"{submission.verification_notes}"</p>
                  </div>
                )}
             </div>
          )}
        </div>

        {canVerify && (
          <div className="p-6 border-t border-gray-100 bg-gray-50 space-y-4">
             {submission.type !== 'Presensi Luar' && (
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Catatan Verifikator (Opsional)</label>
                    <textarea 
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Berikan alasan penyetujuan atau penolakan..."
                      className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#006E62] outline-none resize-none bg-white"
                      rows={2}
                    />
                </div>
             )}
             <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => onVerify(submission.id, 'Ditolak', notes)}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 border-red-500 text-red-600 text-xs font-bold uppercase hover:bg-red-50 transition-all"
                >
                  <XCircle size={16} /> Tolak Pengajuan
                </button>
                <button 
                  onClick={() => onVerify(submission.id, 'Disetujui', notes)}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#006E62] text-white text-xs font-bold uppercase hover:bg-[#005a50] transition-all shadow-md"
                >
                  <CheckCircle size={16} /> Setujui (ACC)
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubmissionDetail;