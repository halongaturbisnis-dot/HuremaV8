
import React from 'react';
import { X, Clock, User, MapPin, Calendar, AlertCircle, Check, AlertTriangle, CalendarClock, Timer } from 'lucide-react';
import { Attendance, Account } from '../../types';
import { googleDriveService } from '../../services/googleDriveService';
import PresenceMap from './PresenceMap';
import { formatDateID } from '../../utils/dateFormatter';

interface PresenceDetailMobileProps {
  attendance: Attendance;
  account: Account;
  onClose: () => void;
}

const PresenceDetailMobile: React.FC<PresenceDetailMobileProps> = ({ attendance, account, onClose }) => {
  const getPhotoUrl = (photoId: string | null) => {
    if (!photoId) return null;
    if (photoId.startsWith('http')) return photoId;
    return googleDriveService.getFileUrl(photoId);
  };

  const formatTimeOnly = (timeStr: string | null, forceTimeZone?: string | null) => {
    if (!timeStr) return '-';
    if (timeStr === '-') return '-';
    
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
    return timeStr.slice(0, 5);
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in duration-300">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#006E62]/10 flex items-center justify-center text-[#006E62]">
              <Clock size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-800">Detail Presensi Harian</h3>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">INFORMASI LENGKAP KEHADIRAN KARYAWAN</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-none">
          {/* Row 1: Employee & Schedule */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Employee Card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
                  {account.photo_google_id ? (
                    <img 
                      src={getPhotoUrl(account.photo_google_id) || ''} 
                      alt="" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <User size={32} />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-[9px] font-bold text-[#006E62] uppercase tracking-widest">Karyawan</p>
                  <h4 className="text-base font-bold text-gray-800">{account.full_name}</h4>
                  <p className="text-xs font-medium text-gray-500">{account.internal_nik}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-3 pt-2">
                <div>
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Departemen</p>
                  <p className="text-[11px] font-bold text-emerald-700">{account.grade || '-'}</p>
                </div>
                <div>
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Jabatan</p>
                  <p className="text-[11px] font-bold text-gray-700">{account.position || '-'}</p>
                </div>
                <div>
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Lokasi Penempatan</p>
                  <p className="text-[11px] font-bold text-gray-700">{account.location?.name || '-'}</p>
                </div>
              </div>
            </div>

            {/* Schedule Card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <CalendarClock size={16} className="text-blue-500" />
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Detail Jadwal</h4>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Nama Jadwal</p>
                  <p className="text-[11px] font-bold text-gray-700">{attendance.schedule_name_snapshot || '-'}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Jam Masuk</p>
                    <p className="text-[11px] font-bold text-emerald-600">{attendance.target_check_in ? attendance.target_check_in.slice(0, 5) : '-'}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Jam Pulang</p>
                    <p className="text-[11px] font-bold text-rose-600">{attendance.target_check_out ? attendance.target_check_out.slice(0, 5) : '-'}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Toleransi Masuk</p>
                    <p className="text-[11px] font-bold text-gray-700">{attendance.target_late_tolerance || 0} Menit</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Toleransi Pulang</p>
                    <p className="text-[11px] font-bold text-gray-700">{attendance.target_early_tolerance || 0} Menit</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Check-in Info */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Informasi Masuk (Check-in)</h4>
            </div>

            <div className="h-48 rounded-xl overflow-hidden border border-gray-100 relative">
              {attendance.in_latitude && attendance.in_longitude ? (
                <PresenceMap 
                  userLat={attendance.in_latitude}
                  userLng={attendance.in_longitude}
                  officeLat={attendance.target_latitude || account.location?.latitude}
                  officeLng={attendance.target_longitude || account.location?.longitude}
                  radius={attendance.target_radius || account.location?.radius || 100}
                />
              ) : (
                <div className="w-full h-full bg-gray-50 flex items-center justify-center text-gray-400 text-xs italic">Data lokasi tidak tersedia</div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <MapPin size={12} className="text-gray-400" />
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Alamat Presensi</p>
                </div>
                <p className="text-[10px] font-medium text-gray-600 leading-relaxed">{attendance.in_address || 'Alamat tidak terdeteksi'}</p>
              </div>

              <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                <div>
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Waktu Masuk</p>
                  <p className="text-sm font-bold text-gray-800">{formatTimeOnly(attendance.check_in, attendance.in_timezone)}</p>
                </div>
                <div>
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Jarak</p>
                  <p className="text-sm font-bold text-gray-800">
                    {attendance.in_latitude && (attendance.target_latitude || account.location?.latitude)
                      ? `${Math.round(calculateDistance(attendance.in_latitude, attendance.in_longitude!, attendance.target_latitude || account.location?.latitude, attendance.target_longitude || account.location?.longitude))} Meter`
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Status Masuk</p>
                  <p className={`text-sm font-bold ${
                    attendance.status_in === 'Terlambat' ? 'text-[#ef4444]' : 'text-[#10b981]'
                  }`}>
                    {attendance.status_in} {attendance.late_minutes > 0 ? `(${attendance.late_minutes} Menit)` : ''}
                  </p>
                </div>
                <div>
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Alasan</p>
                  <p className="text-sm font-medium text-gray-600 italic">
                    {attendance.late_reason 
                      ? attendance.late_reason 
                      : (attendance.late_minutes > 0 ? 'Tidak ada alasan' : (attendance.check_in ? 'Tepat Waktu' : '-'))}
                  </p>
                </div>
                <div>
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Jenis Presensi Luar</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${attendance.check_in_type === 'Reguler' ? 'bg-gray-100 text-gray-500' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                      {attendance.check_in_type || 'Reguler'}
                    </span>
                    {attendance.check_in_type !== 'Reguler' && <AlertTriangle size={12} className="text-amber-500" />}
                  </div>
                </div>
                <div>
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Alasan Presensi Luar</p>
                  <p className="text-sm font-medium text-gray-600 italic">{attendance.check_in_reason || '-'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Check-out Info */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-rose-500" />
              <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Informasi Pulang (Check-out)</h4>
            </div>

            <div className="h-48 rounded-xl overflow-hidden border border-gray-100 relative">
              {attendance.check_out ? (
                attendance.out_latitude && attendance.out_longitude ? (
                  <PresenceMap 
                    userLat={attendance.out_latitude}
                    userLng={attendance.out_longitude}
                    officeLat={attendance.target_latitude || account.location?.latitude}
                    officeLng={attendance.target_longitude || account.location?.longitude}
                    radius={attendance.target_radius || account.location?.radius || 100}
                  />
                ) : (
                  <div className="w-full h-full bg-gray-50 flex items-center justify-center text-gray-400 text-xs italic">Data lokasi tidak tersedia</div>
                )
              ) : (
                <div className="w-full h-full bg-gray-50 flex items-center justify-center text-gray-400 text-xs italic">Belum melakukan check-out</div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <MapPin size={12} className="text-gray-400" />
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Alamat Presensi</p>
                </div>
                <p className="text-[10px] font-medium text-gray-600 leading-relaxed">{attendance.out_address || 'Alamat tidak terdeteksi'}</p>
              </div>

              <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                <div>
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Waktu Pulang</p>
                  <p className="text-sm font-bold text-gray-800">{formatTimeOnly(attendance.check_out, attendance.out_timezone)}</p>
                </div>
                <div>
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Jarak</p>
                  <p className="text-sm font-bold text-gray-800">
                    {attendance.out_latitude && (attendance.target_latitude || account.location?.latitude)
                      ? `${Math.round(calculateDistance(attendance.out_latitude, attendance.out_longitude!, attendance.target_latitude || account.location?.latitude, attendance.target_longitude || account.location?.longitude))} Meter`
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Status Pulang</p>
                  <p className={`text-sm font-bold ${
                    (attendance.status_out === 'Pulang Cepat' || attendance.status_out === 'Pulang Awal') ? 'text-[#f59e0b]' : 
                    attendance.status_out === 'Terlambat Pulang' ? 'text-[#3b82f6]' :
                    'text-[#10b981]'
                  }`}>
                    {attendance.status_out || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Alasan</p>
                  <p className="text-sm font-medium text-gray-600 italic">
                    {attendance.early_departure_reason 
                      ? attendance.early_departure_reason 
                      : (attendance.late_checkout_reason 
                          ? attendance.late_checkout_reason 
                          : (attendance.early_departure_minutes > 0 || attendance.late_checkout_minutes > 0 
                              ? 'Tidak ada alasan' 
                              : (attendance.check_out ? 'Sesuai Jadwal' : '-')))}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Verification Photos */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-4">Foto Verifikasi Masuk</p>
              <div className="aspect-video rounded-xl overflow-hidden bg-gray-50 border border-gray-100 relative">
                {attendance.in_photo_id ? (
                  <img 
                    src={getPhotoUrl(attendance.in_photo_id) || ''} 
                    alt="Foto Masuk" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <User size={48} />
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-4">Foto Verifikasi Pulang</p>
              <div className="aspect-video rounded-xl overflow-hidden bg-gray-50 border border-gray-100 relative">
                {attendance.out_photo_id ? (
                  <img 
                    src={getPhotoUrl(attendance.out_photo_id) || ''} 
                    alt="Foto Pulang" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <User size={48} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center text-center">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 mb-1">
              <Calendar size={16} />
            </div>
            <p className="text-[7px] font-bold text-gray-400 uppercase tracking-widest">Tanggal Kerja</p>
            <p className="text-[9px] font-bold text-gray-800">{formatDateID(attendance.check_in || attendance.created_at)}</p>
          </div>
          <div className="flex flex-col items-center text-center border-x border-gray-200">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500 mb-1">
              <Timer size={16} />
            </div>
            <p className="text-[7px] font-bold text-gray-400 uppercase tracking-widest">Durasi Kerja</p>
            <p className="text-[9px] font-bold text-gray-800">{attendance.work_duration || '-'}</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500 mb-1">
              <AlertCircle size={16} />
            </div>
            <p className="text-[7px] font-bold text-gray-400 uppercase tracking-widest">Status Akhir</p>
            <p className="text-[9px] font-bold text-gray-800">{attendance.check_out ? 'Selesai' : 'Sedang Bekerja'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PresenceDetailMobile;
