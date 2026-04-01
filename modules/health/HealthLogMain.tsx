
import React, { useState, useEffect } from 'react';
import { Activity, Search, FileUp, Paperclip, UserCircle, Upload, Trash2, Edit2, X, Info, Eye, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { healthService } from '../../services/healthService';
import { googleDriveService } from '../../services/googleDriveService';
import { accountService } from '../../services/accountService';
import { HealthLogExtended } from '../../types';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import HealthImportModal from './HealthImportModal';
import HealthDetailModal from '../account/HealthDetailModal';
import LogForm from '../account/LogForm';
import Pagination from '../../components/Common/Pagination';

const HealthLogMain: React.FC = () => {
  const [logs, setLogs] = useState<HealthLogExtended[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedLog, setSelectedLog] = useState<HealthLogExtended | null>(null);
  const [editingLog, setEditingLog] = useState<HealthLogExtended | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 25;

  useEffect(() => {
    fetchLogs();
  }, [currentPage]);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const { data, count } = await healthService.getAllGlobal(currentPage, PAGE_SIZE, searchTerm);
      setLogs(data);
      setTotalCount(count);
    } catch (error) {
      Swal.fire('Gagal', 'Gagal memuat log kesehatan', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchLogs();
  };

  const handleManualUploadMCU = async (e: React.ChangeEvent<HTMLInputElement>, log: HealthLogExtended) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingId(log.id);
      const fileId = await googleDriveService.uploadFile(file);
      await accountService.updateHealthLog(log.id, { file_mcu_id: fileId });
      
      setLogs(prev => prev.map(l => l.id === log.id ? { ...l, file_mcu_id: fileId } : l));
      Swal.fire({ title: 'Berhasil!', text: 'Dokumen MCU telah dilampirkan.', icon: 'success', timer: 1500, showConfirmButton: false });
    } catch (error) {
      Swal.fire('Gagal', 'Gagal mengunggah dokumen', 'error');
    } finally {
      setUploadingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Hapus Log Kesehatan?',
      text: "Data ini akan dihapus permanen dari sistem.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      try {
        setIsLoading(true);
        await healthService.delete(id);
        setLogs(prev => prev.filter(l => l.id !== id));
        setSelectedIds(prev => prev.filter(sid => sid !== id));
        Swal.fire('Terhapus!', 'Log kesehatan telah dihapus.', 'success');
      } catch (error) {
        Swal.fire('Gagal', 'Gagal menghapus log', 'error');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    const result = await Swal.fire({
      title: 'Hapus Masal?',
      text: `Apakah Anda yakin ingin menghapus ${selectedIds.length} log terpilih secara permanen?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Hapus Semua',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      try {
        setIsLoading(true);
        await healthService.bulkDelete(selectedIds);
        setLogs(prev => prev.filter(l => !selectedIds.includes(l.id)));
        setSelectedIds([]);
        Swal.fire('Berhasil!', 'Data terpilih telah dihapus.', 'success');
      } catch (error) {
        Swal.fire('Gagal', 'Beberapa data mungkin gagal dihapus.', 'error');
        fetchLogs();
      } finally {
        setIsLoading(false);
      }
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === logs.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(logs.map(l => l.id));
    }
  };

  return (
    <div className="space-y-6">
      {uploadingId && <LoadingSpinner message="Mengunggah Dokumen..." />}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Cari log (Nama, NIK, Status Medis)..."
            className="w-full pl-10 pr-12 py-2 bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#006E62] text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setCurrentPage(1);
                fetchLogs();
              }
            }}
          />
          <button 
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-[#006E62] transition-colors"
          >
            <Search size={16} />
          </button>
        </form>
        
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <button 
              onClick={handleBulkDelete}
              className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-md border border-red-100 hover:bg-red-100 transition-all text-sm font-medium mr-2"
            >
              <Trash2 size={18} /> Hapus ({selectedIds.length})
            </button>
          )}
          <button 
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 bg-[#006E62] text-white px-4 py-2 rounded-md hover:bg-[#005a50] transition-colors shadow-sm text-sm font-bold uppercase tracking-tighter"
          >
            <FileUp size={18} /> IMPOR MASSAL
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-md overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 w-10">
                <input 
                  type="checkbox" 
                  className="rounded border-gray-300 text-[#006E62] focus:ring-[#006E62]"
                  checked={selectedIds.length === logs.length && logs.length > 0}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="px-6 py-4">Karyawan</th>
              <th className="px-6 py-4">Status Medis</th>
              <th className="px-6 py-4">Risiko Kesehatan</th>
              <th className="px-6 py-4">Tgl Periksa</th>
              <th className="px-6 py-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-20 text-gray-400">Memuat data log kesehatan...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-20 text-gray-400">Tidak ada log kesehatan ditemukan.</td></tr>
            ) : (
              logs.map(log => {
                const isSelected = selectedIds.includes(log.id);
                return (
                  <tr 
                    key={log.id} 
                    className={`hover:bg-gray-50/50 transition-colors cursor-pointer group ${isSelected ? 'bg-emerald-50/20' : ''}`}
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 text-[#006E62] focus:ring-[#006E62]"
                        checked={isSelected}
                        onChange={() => toggleSelect(log.id)}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-[#006E62] font-bold text-xs overflow-hidden">
                          {log.account?.photo_google_id ? (
                            <img src={googleDriveService.getFileUrl(log.account.photo_google_id)} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <UserCircle size={20} className="text-gray-300" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-700">{log.account?.full_name}</p>
                          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">{log.account?.internal_nik}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-[#006E62]">{log.mcu_status}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        log.health_risk?.toLowerCase().includes('tinggi') ? 'bg-red-50 text-red-600' : 
                        log.health_risk?.toLowerCase().includes('sedang') ? 'bg-orange-50 text-orange-600' :
                        'bg-green-50 text-green-600'
                      }`}>
                        {log.health_risk}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-gray-500 font-medium">{formatDate(log.change_date)}</p>
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setEditingLog(log)}
                          className="p-1.5 text-[#006E62] hover:bg-emerald-50 rounded transition-all"
                          title="Edit"
                        >
                          <Edit2 size={14} className="text-[#006E62]" />
                        </button>
                        <button 
                          onClick={() => handleDelete(log.id)}
                          className="p-1.5 text-[#ef4444] hover:bg-red-50 rounded transition-all"
                          title="Hapus"
                        >
                          <Trash2 size={14} className="text-[#ef4444]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination 
        currentPage={currentPage}
        totalCount={totalCount}
        pageSize={PAGE_SIZE}
        onPageChange={setCurrentPage}
      />

      {showImportModal && (
        <HealthImportModal 
          onClose={() => setShowImportModal(false)} 
          onSuccess={() => { setShowImportModal(false); fetchLogs(); }} 
        />
      )}

      {/* Detail Modal */}
      {selectedLog && (
        <HealthDetailModal 
          log={selectedLog} 
          onClose={() => setSelectedLog(null)} 
          onEdit={() => {
            const logToEdit = selectedLog;
            setSelectedLog(null);
            setEditingLog(logToEdit);
          }}
        />
      )}

      {/* Edit Modal */}
      {editingLog && (
        <LogForm 
          type="health"
          accountId={editingLog.account_id}
          initialData={editingLog}
          isEdit={true}
          onClose={() => setEditingLog(null)}
          onSubmit={async (data) => {
            try {
              setIsLoading(true);
              await healthService.update(editingLog.id, data);
              setEditingLog(null);
              fetchLogs();
              Swal.fire({ title: 'Berhasil!', text: 'Log kesehatan telah diperbarui.', icon: 'success', timer: 1000, showConfirmButton: false });
            } catch (error) {
              Swal.fire('Gagal', 'Gagal memperbarui log', 'error');
            } finally {
              setIsLoading(false);
            }
          }}
        />
      )}
    </div>
  );
};

export default HealthLogMain;
