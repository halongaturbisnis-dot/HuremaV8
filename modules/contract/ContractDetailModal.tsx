
import React from 'react';
import { X, FileBadge, FileText, Paperclip, ExternalLink, Edit2, Info } from 'lucide-react';
import { AccountContractExtended } from '../../types';
import { googleDriveService } from '../../services/googleDriveService';
import DetailModulLayoutAdmin from '../../components/ui/DetailModulLayoutAdmin';

interface ContractDetailModalProps {
  contract: AccountContractExtended;
  onClose: () => void;
  onEdit?: () => void;
}

const ContractDetailModal: React.FC<ContractDetailModalProps> = ({ contract, onClose, onEdit }) => {
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const isImage = (fileId: string) => {
    if (!fileId.includes('|')) return true; // Default to true for old data
    const [, name] = fileId.split('|');
    return /\.(jpg|jpeg|png|webp|gif|svg|bmp)$/i.test(name);
  };

  const isImg = contract.file_id ? isImage(contract.file_id) : false;
  const fileUrl = contract.file_id ? googleDriveService.getFileUrl(contract.file_id, isImg) : null;
  const viewerUrl = contract.file_id ? googleDriveService.getViewerUrl(contract.file_id) : null;

  const renderContent = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Nomor Kontrak</p>
            <p className="text-sm font-black text-[#006E62]">{contract.contract_number}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Jenis Kontrak</p>
            <p className="text-sm font-black text-gray-700">{contract.contract_type}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Tanggal Mulai</p>
                <p className="text-xs font-black text-gray-700">{formatDate(contract.start_date)}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Tanggal Berakhir</p>
                <p className="text-xs font-black text-gray-700">{contract.end_date ? formatDate(contract.end_date) : 'TETAP'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Keterangan</p>
          <p className="text-xs text-gray-600 font-medium leading-relaxed italic flex-1">
            {contract.notes || 'Tidak ada catatan tambahan.'}
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#006E62]/10 rounded-xl text-[#006E62]">
              <Paperclip size={16} />
            </div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Lampiran Kontrak</h4>
          </div>
          {viewerUrl && (
            <a 
              href={viewerUrl} 
              target="_blank" 
              rel="noreferrer"
              className="text-[10px] font-black text-[#006E62] hover:underline flex items-center gap-1"
            >
              <ExternalLink size={12} /> BUKA DI TAB BARU
            </a>
          )}
        </div>

        <div className="aspect-video bg-gray-50 rounded-[24px] border border-dashed border-gray-200 flex items-center justify-center overflow-hidden relative group">
          {contract.file_id ? (
            isImg ? (
              <img 
                src={fileUrl!} 
                alt="Preview Kontrak" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-gray-400">
                <FileText size={48} strokeWidth={1} />
                <p className="text-[10px] font-black uppercase tracking-widest">Tidak ada preview Dokumen</p>
                <a 
                  href={viewerUrl!} 
                  target="_blank" 
                  rel="noreferrer"
                  className="px-8 py-3 bg-[#006E62] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#005a50] transition-all shadow-lg shadow-[#006E62]/20"
                >
                  Lihat Dokumen Lengkap
                </a>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center gap-2 text-gray-300">
              <FileBadge size={48} strokeWidth={1} />
              <p className="text-[10px] font-black uppercase tracking-widest">Belum ada lampiran file</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderFooter = () => (
    <>
      {onEdit && (
        <button 
          onClick={onEdit} 
          className="px-8 py-3 bg-[#006E62] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#005a50] transition-all flex items-center gap-2 shadow-lg shadow-[#006E62]/20"
        >
          <Edit2 size={14} /> Edit Kontrak
        </button>
      )}
    </>
  );

  // If account info is available, use the standardized admin layout
  if (contract.account) {
    return (
      <DetailModulLayoutAdmin
        title="Detail Kontrak Kerja"
        subtitle="Informasi Lengkap Perjanjian"
        account={{
          id: contract.account_id,
          full_name: contract.account.full_name,
          internal_nik: contract.account.internal_nik,
          photo_google_id: contract.account.photo_google_id,
          grade: contract.account.department, // Using department as grade for consistency
          position: contract.account.position,
          location: contract.account.location
        }}
        date={contract.start_date}
        createdAt={contract.created_at}
        onClose={onClose}
        footerActions={renderFooter()}
      >
        {renderContent()}
      </DetailModulLayoutAdmin>
    );
  }

  // Fallback for when account info is not directly available in the contract object
  return (
    <div className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in duration-200">
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#006E62]/10 rounded-xl flex items-center justify-center text-[#006E62]">
              <FileBadge size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-800 tracking-tight">Detail Kontrak Kerja</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Informasi Lengkap Perjanjian</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center active:scale-90 transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-gray-50/30">
          {renderContent()}
        </div>

        <div className="px-8 py-6 border-t border-gray-100 flex justify-end gap-3 bg-white shrink-0">
          <button 
            onClick={onClose} 
            className="px-8 py-3 bg-gray-100 text-gray-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
          >
            Tutup
          </button>
          {renderFooter()}
        </div>
      </div>
    </div>
  );
};

export default ContractDetailModal;
