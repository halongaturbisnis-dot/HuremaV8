import React, { useState, useEffect } from 'react';
import { Plus, Search, FileText, ExternalLink, Trash2, FolderOpen, ChevronLeft, ChevronRight, Eye, Edit2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { documentService } from '../../services/documentService';
import { accountService } from '../../services/accountService';
import { DigitalDocument, AuthUser, Account } from '../../types';
import { googleDriveService } from '../../services/googleDriveService';
import DocumentForm from './DocumentForm';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

interface DocumentMainProps {
  user?: AuthUser;
}

const DocumentMain: React.FC<DocumentMainProps> = ({ user }) => {
  const [documents, setDocuments] = useState<DigitalDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DigitalDocument | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const isAdmin = user?.role === 'admin' || user?.is_hr_admin || user?.is_performance_admin || user?.is_finance_admin;

  useEffect(() => {
    if (user) {
      fetchDocuments();
    }
  }, [user]);

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      if (isAdmin) {
        const data = await documentService.getAllAdmin();
        setDocuments(data);
      } else {
        const account = await accountService.getById(user!.id);
        const data = await documentService.getFiltered(account);
        setDocuments(data);
      }
    } catch (error) {
      Swal.fire('Gagal', 'Gagal memuat data dokumen', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Hapus Dokumen?',
      text: "Metadata dan pengaturan akses akan dihapus dari sistem.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#006E62',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Ya, hapus!',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      setIsSaving(true);
      try {
        await documentService.delete(id);
        setDocuments(prev => prev.filter(d => d.id !== id));
        Swal.fire('Terhapus!', 'Dokumen telah dihapus.', 'success');
      } catch (error) {
        Swal.fire('Gagal', 'Gagal menghapus data', 'error');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const filteredDocs = documents.filter(doc => 
    `${doc.name} ${doc.doc_type} ${doc.description}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedDocs = filteredDocs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredDocs.length / itemsPerPage);

  const openDocument = (fileId: string) => {
    window.open(googleDriveService.getFileUrl(fileId).replace('=s1600', '=s0'), '_blank');
  };

  return (
    <div className="space-y-6">
      {isSaving && <LoadingSpinner />}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Cari Dokumen..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#006E62] focus:border-transparent transition-all text-sm"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
        </div>
        
        {isAdmin && (
          <button 
            onClick={() => { setEditingDoc(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-[#006E62] text-white px-4 py-2 rounded-md hover:bg-[#005a50] transition-colors shadow-sm"
          >
            <Plus size={18} />
            <span className="font-medium text-sm">Unggah Dokumen</span>
          </button>
        )}
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : filteredDocs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-gray-50 rounded-md border border-dashed border-gray-200">
          <FolderOpen size={48} strokeWidth={1} className="mb-4" />
          <p className="text-lg font-medium">Belum ada dokumen digital.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-md shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-widest">
              <tr>
                <th className="px-6 py-4">Jenis Dokumen</th>
                <th className="px-6 py-4">Nama Dokumen</th>
                <th className="px-6 py-4">Pembuat</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedDocs.map(doc => (
                <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-[#006E62]">{doc.doc_type}</td>
                  <td className="px-6 py-4 font-medium text-gray-800">{doc.name}</td>
                  <td className="px-6 py-4 text-gray-500">{doc.created_by || '-'}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openDocument(doc.file_id)} className="p-1.5 text-gray-400 hover:text-[#006E62] transition-colors">
                        <Eye size={16} />
                      </button>
                      {isAdmin && (
                        <>
                          <button onClick={() => { setEditingDoc(doc); setShowForm(true); }} className="p-1.5 text-gray-400 hover:text-[#006E62] transition-colors">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete(doc.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Menampilkan {(currentPage - 1) * itemsPerPage + 1} hingga {Math.min(currentPage * itemsPerPage, filteredDocs.length)} dari {filteredDocs.length} dokumen</span>
            <div className="flex items-center gap-2">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="p-1.5 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="font-bold text-[#006E62]">{currentPage} / {totalPages}</span>
              <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="p-1.5 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <DocumentForm 
          onClose={() => { setShowForm(false); setEditingDoc(null); }}
          onSuccess={() => { setShowForm(false); fetchDocuments(); }}
          initialData={editingDoc || undefined}
        />
      )}
    </div>
  );
};

export default DocumentMain;
