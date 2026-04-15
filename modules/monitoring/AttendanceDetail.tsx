
import React from 'react';
import { X, Clock, User, MapPin, Navigation, Eye, Calendar, Info, AlertCircle, Check, TriangleAlert } from 'lucide-react';
import { Attendance, Account } from '../../types';
import { googleDriveService } from '../../services/googleDriveService';
import PresenceMap from '../presence/PresenceMap';

interface AttendanceDetailProps {
  attendance: Attendance;
  account: Account;
  onClose: () => void;
}

const AttendanceDetail: React.FC<AttendanceDetailProps> = ({ attendance, account, onClose }) => {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
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

    return R * c; // distance in meters
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'Disetujui':
        return <Check size={14} className="text-emerald-600" />;
      case 'Ditolak':
        return <X size={14} className="text-red-600" />;
      default:
        return <TriangleAlert size={14} className="text-amber-600" />;
    }
  };

  const getStatusTooltip = (status?: string) => {
    switch (status) {
      case 'Disetujui':
        return 'Disetujui';
      case 'Ditolak':
        return 'Ditolak';
      default:
        return 'Perlu Verifikasi';
    }
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#006E62]/10 flex items-center justify-center text-[#006E62]">
              <Clock size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-800">Detail Presensi Harian</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Informasi lengkap kehadiran karyawan</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Header Info: Profile & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-emerald-50 bg-gray-100 flex items-center justify-center shrink-0 shadow-inner">
                  {account.photo_google_id ? (
                    <img 
                      src={googleDriveService.getFileUrl(account.photo_google_id)} 
                      alt={account.full_name} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <User size={32} className="text-gray-300" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-0.5">Karyawan</p>
                  <h4 className="text-base font-black text-gray-800 truncate leading-tight">{account.full_name}</h4>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-tighter">{account.internal_nik}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 pt-2 border-t border-gray-50">
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Departemen</p>
                  <p className="text-xs font-bold text-[#006E62]">{account.grade || '-'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Jabatan</p>
                  <p className="text-xs font-medium text-gray-700">{account.position || '-'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Lokasi Penempatan</p>
                  <p className="text-xs font-bold text-gray-700">{account.location?.name || '-'}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
                <Calendar size={14} className="text-blue-600" />
                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Detail Jadwal</span>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Nama Jadwal</p>
                  <p className="text-xs font-bold text-gray-700">{attendance.schedule_name_snapshot || account.schedule?.name || '-'}</p>
                </div>
                {(() => {
                  const date = new Date(attendance.created_at || new Date());
                  const dayOfWeek = date.getDay();
                  const rule = account.schedule?.rules?.find((r: any) => r.day_of_week === dayOfWeek);
                  
                  // Gunakan snapshot jika tersedia, jika tidak fallback ke data master
                  const checkInTarget = attendance.target_check_in || rule?.check_in_time || '-';
                  const checkOutTarget = attendance.target_check_out || rule?.check_out_time || '-';
                  const lateTolerance = attendance.target_late_tolerance !== undefined && attendance.target_late_tolerance !== null 
                    ? attendance.target_late_tolerance 
                    : (account.schedule?.tolerance_checkin_minutes || 0);
                  const earlyTolerance = attendance.target_early_tolerance !== undefined && attendance.target_early_tolerance !== null
                    ? attendance.target_early_tolerance
                    : (account.schedule?.tolerance_checkout_minutes || 0);
                  
                  return (
                    <div className="grid grid-cols-2 gap-4 pt-1">
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
            </div>
          </div>

          {/* Attendance Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Check In Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <h5 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Informasi Masuk (Check-In)</h5>
              </div>
              
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 space-y-4">
                  {/* 1. Maps */}
                  <div className="h-48 rounded-xl overflow-hidden border border-gray-100 shadow-inner relative">
                    {(() => {
                      const targetLat = attendance.target_latitude || account.location?.latitude;
                      const targetLng = attendance.target_longitude || account.location?.longitude;
                      const targetRad = attendance.target_radius || account.location?.radius || 100;

                      if (attendance.in_latitude && attendance.in_longitude && targetLat) {
                        return (
                          <PresenceMap 
                            userLat={attendance.in_latitude}
                            userLng={attendance.in_longitude}
                            officeLat={targetLat}
                            officeLng={targetLng!}
                            radius={targetRad}
                          />
                        );
                      }
                      return <div className="w-full h-full bg-gray-50 flex items-center justify-center text-gray-400 text-xs italic">Data lokasi tidak tersedia</div>;
                    })()}
                  </div>

                  {/* 2. Alamat Presensi */}
                  <div className="pt-1">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                      <MapPin size={10} /> Alamat Presensi
                    </p>
                    <p className="text-[11px] text-gray-600 leading-relaxed font-medium">{attendance.in_address || 'Alamat tidak terdeteksi'}</p>
                  </div>

                  <div className="space-y-3 pt-2 border-t border-gray-50">
                    {/* 3. Waktu Masuk / Pulang | Jarak */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Waktu Masuk</p>
                        <p className="text-sm font-bold text-[#006E62]">{formatTimeOnly(attendance.check_in, attendance.in_timezone)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Jarak</p>
                        <p className="text-sm font-bold text-gray-700">
                          {(() => {
                            const targetLat = attendance.target_latitude || account.location?.latitude;
                            const targetLng = attendance.target_longitude || account.location?.longitude;
                            return attendance.in_latitude && targetLat 
                              ? `${Math.round(calculateDistance(attendance.in_latitude, attendance.in_longitude!, targetLat, targetLng!))} Meter`
                              : '-';
                          })()}
                        </p>
                      </div>
                    </div>

                    {/* 4. Status Masuk / Pulang | Alasan */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Status Masuk</p>
                        <p className={`text-xs font-bold ${attendance.late_minutes > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {attendance.status_in} {attendance.late_minutes > 0 ? `(${attendance.late_minutes} Menit)` : ''}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Alasan</p>
                        <p className="text-[11px] text-gray-600 italic leading-tight">
                          {attendance.late_reason 
                            ? attendance.late_reason 
                            : (attendance.late_minutes > 0 ? 'Tidak ada alasan' : (attendance.check_in ? 'Tepat Waktu' : '-'))}
                        </p>
                      </div>
                    </div>

                    {/* 5. Jenis Presensi Luar | Alasan Presensi Luar */}
                    {attendance.check_in_type && attendance.check_in_type !== 'Reguler' && (
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-50">
                        <div>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Jenis Presensi Luar</p>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-50 text-amber-600">
                              {attendance.check_in_type === 'Tugas Luar' || attendance.check_in_type === 'WFH' || attendance.check_in_type === 'Ketemu Client' ? 'Luar Lokasi' : attendance.check_in_type}
                            </span>
                            <div className="group relative">
                              {getStatusIcon(attendance.check_in_validity)}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                {getStatusTooltip(attendance.check_in_validity)}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Alasan Presensi Luar</p>
                          <p className="text-[11px] text-gray-600 italic leading-tight">
                            {attendance.check_in_reason || 'Tidak ada alasan'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Check Out Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <h5 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Informasi Pulang (Check-Out)</h5>
              </div>
              
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 space-y-4">
                  {/* 1. Maps */}
                  <div className="h-48 rounded-xl overflow-hidden border border-gray-100 shadow-inner relative">
                    {(() => {
                      const targetLat = attendance.target_latitude || account.location?.latitude;
                      const targetLng = attendance.target_longitude || account.location?.longitude;
                      const targetRad = attendance.target_radius || account.location?.radius || 100;

                      if (attendance.out_latitude && attendance.out_longitude && targetLat) {
                        return (
                          <PresenceMap 
                            userLat={attendance.out_latitude}
                            userLng={attendance.out_longitude}
                            officeLat={targetLat}
                            officeLng={targetLng!}
                            radius={targetRad}
                          />
                        );
                      }
                      return (
                        <div className="w-full h-full bg-gray-50 flex items-center justify-center text-gray-400 text-xs italic">
                          {attendance.check_out ? 'Data lokasi tidak tersedia' : 'Belum melakukan check-out'}
                        </div>
                      );
                    })()}
                  </div>

                  {/* 2. Alamat Presensi */}
                  <div className="pt-1">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                      <MapPin size={10} /> Alamat Presensi
                    </p>
                    <p className="text-[11px] text-gray-600 leading-relaxed font-medium">{attendance.out_address || 'Alamat tidak terdeteksi'}</p>
                  </div>

                  <div className="space-y-3 pt-2 border-t border-gray-50">
                    {/* 3. Waktu Masuk / Pulang | Jarak */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Waktu Pulang</p>
                        <p className="text-sm font-bold text-red-600">{formatTimeOnly(attendance.check_out, attendance.out_timezone)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Jarak</p>
                        <p className="text-sm font-bold text-gray-700">
                          {(() => {
                            const targetLat = attendance.target_latitude || account.location?.latitude;
                            const targetLng = attendance.target_longitude || account.location?.longitude;
                            return attendance.out_latitude && targetLat 
                              ? `${Math.round(calculateDistance(attendance.out_latitude, attendance.out_longitude!, targetLat, targetLng!))} Meter`
                              : '-';
                          })()}
                        </p>
                      </div>
                    </div>

                    {/* 4. Status Pulang | Alasan */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Status Pulang</p>
                        <p className={`text-xs font-bold ${attendance.early_departure_minutes > 0 || attendance.status_out === 'Terlambat Pulang' ? 'text-red-600' : 'text-emerald-600'}`}>
                          {attendance.status_out || '-'} {attendance.early_departure_minutes > 0 ? `(${attendance.early_departure_minutes} Menit)` : (attendance.status_out === 'Terlambat Pulang' ? `(${attendance.late_checkout_minutes || 0} Menit)` : '')}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Alasan</p>
                        <p className="text-[11px] text-gray-600 italic leading-tight">
                          {attendance.status_out === 'Terlambat Pulang'
                            ? (attendance.late_checkout_reason || 'Tidak ada alasan')
                            : (attendance.early_departure_reason 
                                ? attendance.early_departure_reason 
                                : (attendance.early_departure_minutes > 0 
                                    ? 'Tidak ada alasan' 
                                    : (attendance.check_out ? 'Sesuai Jadwal' : '-')))}
                        </p>
                      </div>
                    </div>

                    {/* 5. Jenis Presensi Luar | Alasan Presensi Luar */}
                    {attendance.check_out_type && attendance.check_out_type !== 'Reguler' ? (
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-50">
                        <div>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Jenis Presensi Luar</p>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-50 text-amber-600">
                              {attendance.check_out_type === 'Tugas Luar' || attendance.check_out_type === 'WFH' || attendance.check_out_type === 'Ketemu Client' ? 'Luar Lokasi' : attendance.check_out_type}
                            </span>
                            <div className="group relative">
                              {getStatusIcon(attendance.check_out_validity)}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                {getStatusTooltip(attendance.check_out_validity)}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Alasan Presensi Luar</p>
                          <p className="text-[11px] text-gray-600 italic leading-tight">
                            {attendance.check_out_reason || 'Tidak ada alasan'}
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Photo Verification Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Photo Check In */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Foto Verifikasi Masuk</p>
                <div className="aspect-video rounded-xl overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center relative group">
                  {attendance.in_photo_id ? (
                    <a 
                      href={googleDriveService.getViewerUrl(attendance.in_photo_id.split('|')[0])} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block w-full h-full"
                    >
                      <img 
                        src={googleDriveService.getFileUrl(attendance.in_photo_id)} 
                        alt="Foto Masuk" 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          const id = attendance.in_photo_id?.split('|')[0];
                          if (id && !target.src.includes('lh3')) {
                            target.src = `https://lh3.googleusercontent.com/d/${id}=s1600`;
                          }
                        }}
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Eye size={20} className="text-white" />
                      </div>
                    </a>
                  ) : (
                    <User size={24} className="text-gray-200" />
                  )}
                </div>
              </div>
            </div>

            {/* Photo Check Out */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Foto Verifikasi Pulang</p>
                <div className="aspect-video rounded-xl overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center relative group">
                  {attendance.out_photo_id ? (
                    <a 
                      href={googleDriveService.getViewerUrl(attendance.out_photo_id.split('|')[0])} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block w-full h-full"
                    >
                      <img 
                        src={googleDriveService.getFileUrl(attendance.out_photo_id)} 
                        alt="Foto Pulang" 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          const id = attendance.out_photo_id?.split('|')[0];
                          if (id && !target.src.includes('lh3')) {
                            target.src = `https://lh3.googleusercontent.com/d/${id}=s1600`;
                          }
                        }}
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Eye size={20} className="text-white" />
                      </div>
                    </a>
                  ) : (
                    <User size={24} className="text-gray-200" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Summary Section */}
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-blue-600">
                <Calendar size={20} />
              </div>
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Tanggal Kerja</p>
                <p className="text-xs font-bold text-gray-700">{formatDate(attendance.created_at)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-purple-600">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Durasi Kerja</p>
                <p className="text-xs font-bold text-gray-700">{attendance.work_duration || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-orange-600">
                <AlertCircle size={20} />
              </div>
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Status Akhir</p>
                <p className="text-xs font-bold text-gray-700">{attendance.check_out ? 'Selesai' : 'Sedang Bekerja'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceDetail;
