
import React, { useState, useEffect } from 'react';
import { FileBadge, Search, FileUp, Paperclip, UserCircle, Upload, FileText, AlertCircle, Calendar, Trash2, Edit2, X, Info, Filter, ChevronDown } from 'lucide-react';
import Swal from 'sweetalert2';
import { contractService } from '../../services/contractService';
import { googleDriveService } from '../../services/googleDriveService';
import { AccountContractExtended } from '../../types';
import ContractImportModal from './ContractImportModal';
import ContractDetailModal from './ContractDetailModal';
import ContractFormModal from './ContractFormModal';
import Pagination from '../../components/Common/Pagination';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

const ContractMain: React.FC = () => {
  const [contracts, setContracts] = useState<AccountContractExtended[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedContract, setSelectedContract] = useState<AccountContractExtended | null>(null);
  const [editingContract, setEditingContract] = useState<AccountContractExtended | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'active' | 'ending_soon' | 'expired'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 25;

  useEffect(() => {
    fetchContracts();
  }, [currentPage, filterType]);

  const fetchContracts = async (search: string = searchTerm) => {
    try {
      setIsLoading(true);
      const { data, count } = await contractService.getAllGlobal(currentPage, PAGE_SIZE, search, filterType);
      setContracts(data);
      setTotalCount(count);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      Swal.fire('Gagal', 'Gagal memuat data kontrak', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusBadge = (endDate?: string | null, contractType?: string | null) => {
    if (contractType === 'PKWTT' || !endDate) return <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">AKTIF</span>;
    
    const end = new Date(endDate);
    const now = new Date();
    const diff = (end.getTime() - now.getTime()) / (1000 * 3600 * 24);

    if (diff < 0) return <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">KADALUARSA</span>;
    if (diff < 30) return <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">AKAN HABIS</span>;
    return <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">AKTIF</span>;
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Hapus Kontrak?',
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
        await contractService.delete(id);
        setContracts(prev => prev.filter(c => c.id !== id));
        setSelectedIds(prev => prev.filter(sid => sid !== id));
        Swal.fire('Terhapus!', 'Kontrak telah dihapus.', 'success');
      } catch (error) {
        Swal.fire('Gagal', 'Gagal menghapus kontrak', 'error');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    const result = await Swal.fire({
      title: 'Hapus Masal?',
      text: `Apakah Anda yakin ingin menghapus ${selectedIds.length} kontrak terpilih secara permanen?`,
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
        await contractService.bulkDelete(selectedIds);
        setContracts(prev => prev.filter(c => !selectedIds.includes(c.id)));
        setSelectedIds([]);
        Swal.fire('Berhasil!', 'Data terpilih telah dihapus.', 'success');
      } catch (error) {
        Swal.fire('Gagal', 'Beberapa data mungkin gagal dihapus.', 'error');
        fetchContracts();
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
    if (selectedIds.length === contracts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(contracts.map(c => c.id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Cari kontrak (Nama, NIK, No Kontrak)..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#006E62] text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setCurrentPage(1);
                  fetchContracts(searchTerm);
                }
              }}
            />
          </div>
          <button
            onClick={() => {
              setCurrentPage(1);
              fetchContracts(searchTerm);
            }}
            className="bg-[#006E62] text-white p-2 rounded-md hover:bg-[#005a50] transition-colors"
            title="Cari"
          >
            <Search size={18} />
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <button 
              onClick={handleBulkDelete}
              className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-md border border-red-100 hover:bg-red-100 transition-all text-sm font-medium mr-2"
            >
              <Trash2 size={18} /> Hapus ({selectedIds.length})
            </button>
          )}

          <div className="relative group">
            <button className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium">
              <Filter size={18} />
              <span>{filterType === 'all' ? 'Semua' : filterType === 'active' ? 'Aktif' : filterType === 'ending_soon' ? 'Akan Habis' : 'Kadaluarsa'}</span>
              <ChevronDown size={16} />
            </button>
            <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-100 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <div className="py-1">
                <button onClick={() => { setFilterType('all'); setSearchTerm(''); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Semua</button>
                <button onClick={() => { setFilterType('active'); setSearchTerm(''); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-[#006E62]">Aktif</button>
                <button onClick={() => { setFilterType('ending_soon'); setSearchTerm(''); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-orange-600">Akan Habis</button>
                <button onClick={() => { setFilterType('expired'); setSearchTerm(''); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-red-600">Kadaluarsa</button>
              </div>
            </div>
          </div>

          <button 
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 bg-[#006E62] text-white px-4 py-2 rounded-md hover:bg-[#005a50] transition-colors shadow-sm text-sm font-bold"
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
                  checked={selectedIds.length === contracts.length && contracts.length > 0}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="px-6 py-4">Karyawan</th>
              <th className="px-6 py-4">Nomor & Jenis Kontrak</th>
              <th className="px-6 py-4">Masa Berlaku</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-20 text-gray-400">Memuat data kontrak...</td></tr>
            ) : contracts.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-20 text-gray-400">Tidak ada data kontrak ditemukan.</td></tr>
            ) : (
              contracts.map(c => {
                const isSelected = selectedIds.includes(c.id);
                return (
                  <tr 
                    key={c.id} 
                    className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${isSelected ? 'bg-emerald-50/20' : ''}`}
                    onClick={() => setSelectedContract(c)}
                  >
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 text-[#006E62] focus:ring-[#006E62]"
                        checked={isSelected}
                        onChange={() => toggleSelect(c.id)}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center border border-gray-200 overflow-hidden">
                          {c.account?.photo_google_id ? (
                            <img 
                              src={googleDriveService.getFileUrl(c.account.photo_google_id)} 
                              alt="" 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <UserCircle size={20} />
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-gray-800">{c.account?.full_name}</div>
                          <div className="text-[10px] text-gray-400 font-mono uppercase">{c.account?.internal_nik}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-bold text-[#006E62]">{c.contract_number}</div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{c.contract_type}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-gray-600 font-medium">{formatDate(c.start_date)} - {formatDate(c.end_date)}</div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(c.end_date, c.contract_type)}
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setEditingContract(c)}
                          className="p-1.5 text-[#006E62] hover:bg-emerald-50 rounded transition-colors"
                          title="Edit Kontrak"
                        >
                          <Edit2 size={14} className="text-[#006E62]" />
                        </button>
                        <button 
                          onClick={() => handleDelete(c.id)}
                          className="p-1.5 text-[#ef4444] hover:bg-red-50 rounded transition-colors"
                          title="Hapus Kontrak"
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

      <div className="mt-6 flex justify-between items-center bg-white p-4 rounded-md border border-gray-100 shadow-sm">
        <div className="text-xs text-gray-500 font-medium">
          Menampilkan <span className="text-[#006E62]">{contracts.length}</span> dari <span className="text-[#006E62]">{totalCount}</span> data kontrak
        </div>
        <Pagination 
          currentPage={currentPage}
          totalCount={totalCount}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>

      {showImportModal && (
        <ContractImportModal 
          onClose={() => setShowImportModal(false)} 
          onSuccess={() => { setShowImportModal(false); fetchContracts(); }} 
        />
      )}

      {/* Detail Modal */}
      {selectedContract && (
        <ContractDetailModal 
          contract={selectedContract} 
          onClose={() => setSelectedContract(null)} 
          onEdit={() => {
            const contractToEdit = selectedContract;
            setSelectedContract(null);
            setEditingContract(contractToEdit);
          }}
        />
      )}

      {/* Edit Modal */}
      {editingContract && (
        <ContractFormModal 
          initialData={editingContract}
          onClose={() => setEditingContract(null)}
          onSuccess={() => {
            setEditingContract(null);
            fetchContracts();
          }}
        />
      )}
    </div>
  );
};

export default ContractMain;
