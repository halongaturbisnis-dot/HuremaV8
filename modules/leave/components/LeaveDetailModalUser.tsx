
import React from 'react';
import { LeaveRequest } from '../../../types';
import { formatDateID } from '../../../utils/dateFormatter';
import { googleDriveService } from '../../../services/googleDriveService';
import { mobilePopUpSizeGuide } from '../../../utils/mobilePopUpSizeGuide';
import { 
  X, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileUp, 
  Eye,
  Info
} from 'lucide-react';

interface LeaveDetailModalUserProps {
  leave: LeaveRequest;
  onClose: () => void;
}

const LeaveDetailModalUser: React.FC<LeaveDetailModalUserProps> = ({
  leave,
  onClose
}) => {
  return (
    <div className={mobilePopUpSizeGuide.overlay}>
      <div className={mobilePopUpSizeGuide.container}>
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 text-[#006E62] rounded-xl flex items-center justify-center">
              <Info size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-gray-800 tracking-tight leading-tight">Detail Pengajuan</h2>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Informasi Libur Mandiri</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 bg-gray-50 text-gray-400 rounded-xl flex items-center justify-center active:scale-90 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar max-h-[70vh]">
          {/* Status Capsule */}
          <div className="flex items-center justify-between bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
             <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  leave.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' :
                  leave.status === 'rejected' ? 'bg-rose-500/10 text-rose-500' :
                  'bg-amber-500/10 text-amber-500'
                }`}>
                  {leave.status === 'approved' ? <CheckCircle2 size={20} /> : leave.status === 'rejected' ? <XCircle size={20} /> : <Clock size={20} />}
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</p>
                  <p className={`text-sm font-black uppercase tracking-wide ${
                    leave.status === 'approved' ? 'text-emerald-600' :
                    leave.status === 'rejected' ? 'text-rose-600' :
                    'text-amber-600'
                  }`}>
                    {leave.status === 'approved' ? 'Disetujui' : leave.status === 'rejected' ? 'Ditolak' : 'Pending'}
                  </p>
                </div>
             </div>
             <div className="text-right">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Diajukan Pada</p>
                <p className="text-xs font-bold text-gray-700">{formatDateID(leave.created_at)}</p>
             </div>
          </div>

          {/* Date Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-4 bg-[#006E62] rounded-full"></div>
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Waktu Libur</h4>
            </div>
            
            <div className="bg-[#006E62]/5 border border-[#006E62]/10 p-5 rounded-2xl flex items-center justify-around text-center">
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Mulai</p>
                <p className="text-sm font-black text-[#006E62]">{formatDateID(leave.start_date)}</p>
              </div>
              <div className="w-px h-8 bg-[#006E62]/10 mx-4"></div>
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Sampai</p>
                <p className="text-sm font-black text-[#006E62]">{formatDateID(leave.end_date)}</p>
              </div>
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-4 bg-[#006E62] rounded-full"></div>
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Keterangan / Alasan</h4>
            </div>
            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
              <p className="text-sm text-gray-600 leading-relaxed">
                {leave.description || 'Tidak ada keterangan tambahan.'}
              </p>
            </div>
          </div>

          {/* Attachment */}
          {leave.file_id && (
            <div className="space-y-4 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-4 bg-[#006E62] rounded-full"></div>
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Lampiran Pendukung</h4>
              </div>
              <div className="space-y-3">
                {googleDriveService.parseFileIds(leave.file_id).map((file, idx) => (
                  <a 
                    key={idx}
                    href={googleDriveService.getFileUrl(`${file.id}|${file.name}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl active:bg-gray-100 transition-all group"
                  >
                    <div className="w-10 h-10 bg-white shadow-sm border border-gray-100 rounded-xl flex items-center justify-center text-[#006E62] shrink-0">
                      <FileUp size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-gray-800 tracking-tight truncate">{file.name || 'Lihat Lampiran'}</p>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest truncate">Google Drive</p>
                    </div>
                    <div className="p-2 text-emerald-600">
                      <Eye size={18} />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-50 bg-gray-50/50">
          <button
            onClick={onClose}
            className="w-full py-4 bg-[#006E62] text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-[#006E62]/20 active:scale-95 transition-all"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeaveDetailModalUser;
