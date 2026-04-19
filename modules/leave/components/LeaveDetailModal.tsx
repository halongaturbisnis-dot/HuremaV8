
import React from 'react';
import { LeaveRequestExtended } from '../../../types';
import DetailModulLayoutAdmin from '../../../components/ui/DetailModulLayoutAdmin';
import { formatDateID } from '../../../utils/dateFormatter';
import { googleDriveService } from '../../../services/googleDriveService';
import { FileText, Calendar, CheckCircle2, XCircle, Clock, Trash2, CheckCircle, FileUp, Eye } from 'lucide-react';

interface LeaveDetailModalProps {
  leave: LeaveRequestExtended;
  onClose: () => void;
  onVerify: (id: string, status: 'approved' | 'rejected', notes?: string) => void;
  onDelete?: (id: string) => void;
  canDelete?: boolean;
}

const LeaveDetailModal: React.FC<LeaveDetailModalProps> = ({
  leave,
  onClose,
  onVerify,
  onDelete,
  canDelete = false
}) => {
  const accountData = leave.account ? {
    id: leave.account_id,
    full_name: leave.account.full_name,
    internal_nik: leave.account.internal_nik,
    photo_google_id: leave.account.photo_google_id,
    grade: leave.account.grade,
    position: leave.account.position,
    location: leave.account.location
  } : null;

  return (
    <DetailModulLayoutAdmin
      title="Detail Pengajuan Libur"
      accountData={accountData}
      onClose={onClose}
      footerActions={
        <div className="flex gap-3">
          {leave.status === 'pending' && (
            <>
              <button
                onClick={() => onVerify(leave.id, 'rejected')}
                className="px-6 py-3 bg-rose-50 text-rose-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-100 transition-all flex items-center gap-2"
              >
                <XCircle size={16} /> Tolak
              </button>
              <button
                onClick={() => onVerify(leave.id, 'approved')}
                className="px-6 py-3 bg-[#006E62] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#004D45] transition-all flex items-center gap-2 shadow-lg shadow-[#006E62]/20"
              >
                <CheckCircle size={16} /> Setujui
              </button>
            </>
          )}
          {canDelete && (
            <button
              onClick={() => onDelete?.(leave.id)}
              className="px-6 py-3 bg-gray-100 text-gray-400 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-50 hover:text-rose-600 transition-all flex items-center gap-2"
            >
              <Trash2 size={16} /> Hapus
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-8">
        {/* Info Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 flex items-center justify-center gap-4">
            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
              <Calendar size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 text-center uppercase tracking-widest">Waktu Pengajuan</p>
              <p className="text-sm font-bold text-center text-gray-700">{formatDateID(leave.created_at)}</p>
            </div>
          </div>
          <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 flex items-center justify-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center ${
              leave.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' :
              leave.status === 'rejected' ? 'bg-rose-500/10 text-rose-500' :
              'bg-amber-500/10 text-amber-500'
            }`}>
              {leave.status === 'approved' ? <CheckCircle2 size={20} /> : leave.status === 'rejected' ? <XCircle size={20} /> : <Clock size={20} />}
            </div>
            <div>
              <p className="text-[10px] font-black text-center text-gray-400 uppercase tracking-widest">Status Saat Ini</p>
              <p className={`text-sm font-black text-center uppercase tracking-wide ${
                leave.status === 'approved' ? 'text-emerald-600' :
                leave.status === 'rejected' ? 'text-rose-600' :
                'text-amber-600'
              }`}>
                {leave.status === 'approved' ? 'Disetujui' : leave.status === 'rejected' ? 'Ditolak' : 'Pending'}
              </p>
            </div>
          </div>
        </div>

        {/* Specific Data Section - Compact Row */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-4 bg-[#006E62] rounded-full"></div>
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Data Spesifik Pengajuan</h4>
          </div>
          
          <div className="bg-[#006E62]/5 border border-[#006E62]/10 p-4 rounded-2xl grid grid-cols-3 gap-6">
            <div>
              <p className="text-[9px] font-bold text-center text-gray-400 uppercase mb-1">Tanggal Mulai</p>
              <p className="text-sm font-black text-center text-[#006E62]">{formatDateID(leave.start_date)}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-center text-gray-400 uppercase mb-1">Tanggal Selesai</p>
              <p className="text-sm font-black text-center text-[#006E62]">{formatDateID(leave.end_date)}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-center text-gray-400 uppercase mb-1">Jenis Pengajuan</p>
              <p className="text-sm font-black text-center text-[#006E62]">Libur Mandiri</p>
            </div>
          </div>
        </div>

        {/* Reason */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-4 bg-[#006E62] rounded-full"></div>
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Keterangan / Alasan</h4>
          </div>
          <div className="bg-gray-50 p-6 rounded-[32px] border border-gray-100">
            <p className="text-sm text-gray-600 leading-relaxed">
              {leave.description || 'Tidak ada keterangan tambahan.'}
            </p>
          </div>
        </div>

        {/* Attachment Section */}
        {leave.file_id && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-4 bg-[#006E62] rounded-full"></div>
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Lampiran Pendukung</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {googleDriveService.parseFileIds(leave.file_id).map((file, idx) => (
                <a 
                  key={idx}
                  href={googleDriveService.getFileUrl(`${file.id}|${file.name}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl hover:bg-gray-100 transition-all group"
                >
                  <div className="w-10 h-10 bg-white shadow-sm border border-gray-100 rounded-xl flex items-center justify-center text-[#006E62] shrink-0">
                    <FileUp size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-black text-gray-800 tracking-tight truncate">{file.name || 'Lihat Lampiran'}</p>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Google Drive</p>
                  </div>
                  <div className="p-2 text-gray-300 group-hover:text-[#006E62] transition-colors">
                    <Eye size={16} />
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </DetailModulLayoutAdmin>
  );
};

export default LeaveDetailModal;
