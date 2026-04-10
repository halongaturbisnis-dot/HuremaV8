
import React from 'react';
import { X, Clock, User, MapPin, Calendar, AlertCircle, Check, TriangleAlert, Eye } from 'lucide-react';
import { Attendance, Account } from '../../types';
import { googleDriveService } from '../../services/googleDriveService';
import PresenceMap from './PresenceMap';

interface PresenceDetailMobileProps {
  attendance: Attendance;
  account: Account;
  onClose: () => void;
}

const PresenceDetailMobile: React.FC<PresenceDetailMobileProps> = ({ attendance, account, onClose }) => {
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

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'Disetujui':
      case 'TRUE':
        return <Check size={14} className="text-emerald-600" />;
      case 'Ditolak':
      case 'DENY':
        return <X size={14} className="text-red-600" />;
      default:
        return <TriangleAlert size={14} className="text-amber-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-t-[32px] shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[95vh] animate-in slide-in-from-bottom duration-300">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#006E62]/10 flex items-center justify-center text-[#006E62]">
              <Clock size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-800">Detail Presensi</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{formatDate(attendance.created_at)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-12">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
              <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Status Masuk</p>
              <p className={`text-sm font-bold ${attendance.late_minutes > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                {attendance.status_in}
              </p>
              <p className="text-[10px] font-medium text-emerald-600/70 mt-0.5">
                {formatTimeOnly(attendance.check_in, attendance.in_timezone)}
              </p>
            </div>
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
              <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest mb-1">Status Pulang</p>
              <p className={`text-sm font-bold ${attendance.early_departure_minutes > 0 ? 'text-red-600' : 'text-blue-700'}`}>
                {attendance.status_out || 'Belum Pulang'}
              </p>
              <p className="text-[10px] font-medium text-blue-600/70 mt-0.5">
                {formatTimeOnly(attendance.check_out, attendance.out_timezone)}
              </p>
            </div>
          </div>

          {/* Map Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-[#006E62]" />
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Lokasi Presensi</span>
              </div>
            </div>
            <div className="h-48 rounded-2xl overflow-hidden border border-gray-100 shadow-sm relative">
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
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <p className="text-[10px] font-medium text-gray-600 leading-relaxed">
                {attendance.in_address || 'Alamat tidak terdeteksi'}
              </p>
            </div>
          </div>

          {/* Photo Section */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Foto Masuk</p>
              <div className="aspect-square rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 relative group">
                {attendance.in_photo_id ? (
                  <img 
                    src={googleDriveService.getFileUrl(attendance.in_photo_id)} 
                    alt="Foto Masuk" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <User size={32} />
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Foto Pulang</p>
              <div className="aspect-square rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 relative group">
                {attendance.out_photo_id ? (
                  <img 
                    src={googleDriveService.getFileUrl(attendance.out_photo_id)} 
                    alt="Foto Pulang" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <User size={32} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Detail Info */}
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
            <div className="p-4 flex justify-between items-center">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Durasi Kerja</span>
              <span className="text-sm font-bold text-gray-700">{attendance.work_duration || '-'}</span>
            </div>
            <div className="p-4 flex justify-between items-center">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Jarak Masuk</span>
              <span className="text-sm font-bold text-gray-700">
                {(() => {
                  const targetLat = attendance.target_latitude || account.location?.latitude;
                  const targetLng = attendance.target_longitude || account.location?.longitude;
                  return attendance.in_latitude && targetLat 
                    ? `${Math.round(calculateDistance(attendance.in_latitude, attendance.in_longitude!, targetLat, targetLng!))} m`
                    : '-';
                })()}
              </span>
            </div>
            {attendance.check_in_type && attendance.check_in_type !== 'Reguler' && (
              <div className="p-4 flex justify-between items-center">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Tipe Presensi</span>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-50 text-amber-600">
                    {attendance.check_in_type}
                  </span>
                  {getStatusIcon(attendance.check_in_validity)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PresenceDetailMobile;
