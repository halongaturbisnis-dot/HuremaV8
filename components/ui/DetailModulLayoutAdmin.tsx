import React, { useState } from 'react';
import { X, User, Calendar, MapPin, UserCircle, ExternalLink, Info } from 'lucide-react';
import { googleDriveService } from '../../services/googleDriveService';
import AccountDetail from '../../modules/account/AccountDetail';

interface DetailModulLayoutAdminProps {
  title: string;
  subtitle: string;
  account: {
    id: string;
    full_name: string;
    internal_nik: string;
    photo_google_id?: string | null;
    grade?: string;
    position?: string;
    location?: { name: string };
  };
  date: string;
  createdAt?: string;
  onClose: () => void;
  footerActions?: React.ReactNode;
  children: React.ReactNode;
}

const DetailModulLayoutAdmin: React.FC<DetailModulLayoutAdminProps> = ({
  title,
  subtitle,
  account,
  date,
  createdAt,
  onClose,
  footerActions,
  children
}) => {
  const [showProfileModal, setShowProfileModal] = useState(false);

  const formatDateFull = (dateStr: string) => {
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date(dateStr));
  };

  const formatDateSimple = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date(dateStr));
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-8 py-6 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#006E62]/10 rounded-2xl flex items-center justify-center text-[#006E62]">
              <Info size={28} />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-800 tracking-tight">{title}</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{subtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center active:scale-90 transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Employee Info Section (4 Columns) */}
          <div className="bg-gray-50 p-6 rounded-[32px] border border-gray-100 relative">
            {/* Profile Detail Button */}
            <button 
              onClick={() => setShowProfileModal(true)}
              className="absolute top-4 right-4 p-2 text-[#006E62] hover:bg-[#006E62]/10 rounded-xl transition-all"
              title="Lihat Profil Lengkap"
            >
              <UserCircle size={24} />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
              {/* Col 1: Photo */}
              <div className="flex justify-center md:justify-start">
                <div className="w-20 h-20 rounded-full border-4 border-white shadow-sm overflow-hidden bg-gray-200 flex items-center justify-center text-gray-400 shrink-0">
                  {account.photo_google_id ? (
                    <img 
                      src={googleDriveService.getFileUrl(account.photo_google_id)} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <User size={32} />
                  )}
                </div>
              </div>

              {/* Col 2: Identity */}
              <div className="text-center md:text-left">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Karyawan</p>
                <p className="text-base font-black text-gray-800 leading-tight">{account.full_name}</p>
                <p className="text-xs text-gray-500 font-bold mt-1">{account.internal_nik}</p>
              </div>

              {/* Col 3: Organization */}
              <div className="text-center md:text-left">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Organisasi</p>
                <p className="text-sm font-black text-gray-800 leading-tight">{account.grade || '-'}</p>
                <p className="text-[11px] text-gray-500 font-bold mt-1">{account.position || '-'}</p>
              </div>

              {/* Col 4: Location & Date */}
              <div className="text-center md:text-left">
                <div className="mb-3">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Penempatan</p>
                  <div className="flex items-center justify-center md:justify-start gap-1 text-sm font-black text-gray-800">
                    <MapPin size={14} className="text-[#006E62]" />
                    <span>{account.location?.name || 'Lokasi tidak diketahui'}</span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tanggal Presensi</p>
                  <p className="text-xs font-black text-gray-800">{formatDateFull(date)}</p>
                  {createdAt && (
                    <p className="text-[10px] text-gray-500 font-bold">Diajukan: {formatDateSimple(createdAt)}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Module Specific Content */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-400">
            <Info size={14} />
            <p className="text-[9px] font-bold uppercase tracking-tighter italic">
              Verifikasi teliti sebelum menyimpan keputusan.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-xl text-xs font-black text-gray-500 uppercase tracking-widest hover:bg-gray-200 transition-all"
            >
              Tutup
            </button>
            {footerActions}
          </div>
        </div>
      </div>

      {/* Profile Detail Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="px-8 py-6 border-b flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#006E62]/10 flex items-center justify-center text-[#006E62]">
                  <UserCircle size={24} />
                </div>
                <div>
                  <h3 className="font-black text-gray-800 tracking-tight">Detail Profil Karyawan</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Informasi lengkap data karyawan</p>
                </div>
              </div>
              <button 
                onClick={() => setShowProfileModal(false)}
                className="w-10 h-10 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center active:scale-90 transition-all"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8">
              <AccountDetail 
                id={account.id} 
                onClose={() => setShowProfileModal(false)}
                onEdit={() => {}} 
                onDelete={() => {}} 
                isReadOnly={true}
                hideLogs={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailModulLayoutAdmin;
