
import React from 'react';
import { X, Clock, User, MapPin, Navigation, Eye, Calendar, Info, AlertCircle } from 'lucide-react';
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

  const formatTimeOnly = (isoString: string | null) => {
    if (!isoString) return '-';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch (e) {
      return '-';
    }
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
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
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

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm grid grid-cols-2 gap-4">
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Departemen</p>
                <p className="text-xs font-bold text-[#006E62]">{account.department || '-'}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Jabatan</p>
                <p className="text-xs font-medium text-gray-700">{account.position || '-'}</p>
              </div>
              <div className="col-span-2 pt-2 border-t border-gray-50">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Lokasi Penempatan</p>
                <p className="text-xs font-bold text-gray-700">{account.location?.name || '-'}</p>
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
                  <div className="h-48 rounded-xl overflow-hidden border border-gray-100 shadow-inner relative">
                    {attendance.in_latitude && attendance.in_longitude && account.location?.latitude ? (
                      <PresenceMap 
                        userLat={attendance.in_latitude}
                        userLng={attendance.in_longitude}
                        officeLat={account.location.latitude}
                        officeLng={account.location.longitude}
                        radius={account.location.radius || 100}
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-50 flex items-center justify-center text-gray-400 text-xs italic">Data lokasi tidak tersedia</div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Waktu Masuk</p>
                        <p className="text-sm font-bold text-[#006E62]">{formatTimeOnly(attendance.check_in)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Status</p>
                        <p className={`text-xs font-bold ${attendance.late_minutes > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {attendance.status_in} {attendance.late_minutes > 0 ? `(${attendance.late_minutes}m)` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Jarak</p>
                        <p className="text-sm font-bold text-gray-700">
                          {attendance.in_latitude && account.location?.latitude 
                            ? `${Math.round(calculateDistance(attendance.in_latitude, attendance.in_longitude!, account.location.latitude, account.location.longitude))} Meter`
                            : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Tipe</p>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${attendance.check_in_type === 'Reguler' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                          {attendance.check_in_type || 'Reguler'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-50">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                      <MapPin size={10} /> Alamat Presensi
                    </p>
                    <p className="text-[11px] text-gray-600 leading-relaxed font-medium">{attendance.in_address || 'Alamat tidak terdeteksi'}</p>
                  </div>

                  <div className="pt-3 border-t border-gray-50 flex gap-4">
                    <div className="flex-1">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Foto Verifikasi</p>
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
                    {attendance.late_reason && (
                      <div className="flex-1">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Alasan Terlambat</p>
                        <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100/50 italic text-[11px] text-amber-700">
                          "{attendance.late_reason}"
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
                  <div className="h-48 rounded-xl overflow-hidden border border-gray-100 shadow-inner relative">
                    {attendance.out_latitude && attendance.out_longitude && account.location?.latitude ? (
                      <PresenceMap 
                        userLat={attendance.out_latitude}
                        userLng={attendance.out_longitude}
                        officeLat={account.location.latitude}
                        officeLng={account.location.longitude}
                        radius={account.location.radius || 100}
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-50 flex items-center justify-center text-gray-400 text-xs italic">
                        {attendance.check_out ? 'Data lokasi tidak tersedia' : 'Belum melakukan check-out'}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Waktu Pulang</p>
                        <p className="text-sm font-bold text-red-600">{formatTimeOnly(attendance.check_out)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Status</p>
                        <p className={`text-xs font-bold ${attendance.early_departure_minutes > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {attendance.status_out || '-'} {attendance.early_departure_minutes > 0 ? `(${attendance.early_departure_minutes}m)` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Jarak</p>
                        <p className="text-sm font-bold text-gray-700">
                          {attendance.out_latitude && account.location?.latitude 
                            ? `${Math.round(calculateDistance(attendance.out_latitude, attendance.out_longitude!, account.location.latitude, account.location.longitude))} Meter`
                            : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Tipe</p>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${attendance.check_out_type === 'Reguler' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                          {attendance.check_out_type || 'Reguler'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-50">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                      <MapPin size={10} /> Alamat Presensi
                    </p>
                    <p className="text-[11px] text-gray-600 leading-relaxed font-medium">{attendance.out_address || 'Alamat tidak terdeteksi'}</p>
                  </div>

                  <div className="pt-3 border-t border-gray-50 flex gap-4">
                    <div className="flex-1">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Foto Verifikasi</p>
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
                    {attendance.early_departure_reason && (
                      <div className="flex-1">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Alasan Pulang Awal</p>
                        <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100/50 italic text-[11px] text-amber-700">
                          "{attendance.early_departure_reason}"
                        </div>
                      </div>
                    )}
                  </div>
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
