
import React, { useState } from 'react';
import { X, User, MapPin, UserCircle, Info, Loader2 } from 'lucide-react';
import { googleDriveService } from '../../services/googleDriveService';
import AccountDetail from '../../modules/account/AccountDetail';

interface DetailModulLayoutAdminProps {
  title: string;
  subtitle: string;
  accountData: {
    id: string;
    full_name: string;
    internal_nik: string;
    photo_google_id?: string | null;
    grade?: string;
    position?: string;
    location?: { name: string };
  } | null;
  onClose: () => void;
  footerActions?: React.ReactNode;
  children: React.ReactNode;
  isLoading?: boolean;
}

const DetailModulLayoutAdmin: React.FC<DetailModulLayoutAdminProps> = ({
  title,
  subtitle,
  accountData,
  onClose,
  footerActions,
  children,
  isLoading = false
}) => {
  const [showProfile, setShowProfile] = useState(false);

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
          <button onClick={onClose} className="w-10 h-10 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center active:scale-90 transition-all hover:bg-gray-200">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Employee Info Section (3 Columns Full Width) */}
          {accountData && (
            <div className="bg-[#006E62]/10 border border-[#006E62]/10 p-6 rounded-[32px] relative group backdrop-blur-sm">
              <div className="grid grid-cols-1 md:grid-cols-[auto_1.5fr_1fr] gap-8 items-start">
                {/* Col 1: Photo & Action */}
                <div className="flex flex-col items-center shrink-0 gap-3">
                  <div className="w-20 h-20 rounded-full bg-white shadow-md border-4 border-white overflow-hidden flex items-center justify-center text-gray-300">
                    {accountData.photo_google_id ? (
                      <img 
                        src={googleDriveService.getFileUrl(accountData.photo_google_id)} 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer"
                        alt={accountData.full_name}
                      />
                    ) : (
                      <User size={40} />
                    )}
                  </div>
                  <button 
                    onClick={() => setShowProfile(true)}
                    className="px-3 py-1.5 bg-[#006E62] text-[#FFFFFF] rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-[#004D45] hover:text-[#FFFFFF] transition-all active:scale-95 shadow-sm border border-[#006E62]/5"
                  >
                    Lihat Profil
                  </button>
                </div>

                {/* Col 2: Identity */}
                <div className="text-center md:text-left">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Karyawan</p>
                  <p className="text-base font-black text-gray-800 leading-tight">{accountData.full_name}</p>
                  <p className="text-xs text-gray-500 font-bold mt-1">{accountData.internal_nik}</p>
                </div>

                {/* Col 3: Career */}
                <div className="text-center md:text-left">
                  <div className="space-y-2">
                    <div>
                      <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Jabatan</p>
                      <p className="text-sm font-black text-gray-800 leading-tight">{accountData.position || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Departemen</p>
                      <p className="text-sm font-bold text-gray-600 leading-tight">{accountData.grade || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Penempatan</p>
                      <div className="flex items-center justify-center md:justify-start gap-1.5 text-gray-600">
                        <MapPin size={12} className="text-[#006E62] shrink-0" />
                        <p className="text-xs font-bold leading-tight">
                          {accountData.location?.name || 'Tidak diketahui'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Content Section (Children) */}
          <div className="animate-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl text-xs font-black text-gray-500 uppercase tracking-widest hover:bg-gray-200 transition-all"
          >
            Tutup
          </button>
          {footerActions}
        </div>
      </div>

      {/* Read-Only Profile Modal */}
      {showProfile && accountData && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in zoom-in-95 duration-300">
          <div className="bg-white rounded-[40px] w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="px-8 py-6 border-b flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#006E62]/10 flex items-center justify-center text-[#006E62]">
                  <UserCircle size={24} />
                </div>
                <div>
                  <h3 className="font-black text-gray-800 uppercase tracking-tight">Detail Profil Karyawan</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Informasi lengkap data karyawan (Read-Only)</p>
                </div>
              </div>
              <button 
                onClick={() => setShowProfile(false)}
                className="w-10 h-10 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center active:scale-90 transition-all hover:bg-gray-200"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8">
              <AccountDetail 
                id={accountData.id} 
                onClose={() => setShowProfile(false)}
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
