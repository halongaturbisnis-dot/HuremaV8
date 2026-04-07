import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Calendar, MapPin, Users, Edit2, Trash2, ShieldCheck, Clock, AlertCircle, Loader2, ChevronRight } from 'lucide-react';
import Swal from 'sweetalert2';
import { specialAssignmentService } from '../../services/specialAssignmentService';
import { SpecialAssignment } from '../../types';
import { timeUtils } from '../../lib/timeUtils';
import SpecialAssignmentForm from './SpecialAssignmentForm';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

const SpecialAssignmentMain: React.FC = () => {
  const [assignments, setAssignments] = useState<SpecialAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<SpecialAssignment | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'upcoming' | 'expired'>('all');

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      setIsLoading(true);
      const data = await specialAssignmentService.getAll();
      setAssignments(data);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      Swal.fire('Gagal', 'Terjadi kesalahan saat mengambil data penugasan.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Hapus Penugasan?',
      text: "Data penugasan dan daftar akun terkait akan dihapus permanen.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      try {
        await specialAssignmentService.delete(id);
        Swal.fire('Berhasil', 'Penugasan telah dihapus.', 'success');
        fetchAssignments();
      } catch (error) {
        console.error('Error deleting assignment:', error);
        Swal.fire('Gagal', 'Terjadi kesalahan saat menghapus penugasan.', 'error');
      }
    }
  };

  const handleEdit = (assignment: SpecialAssignment) => {
    setSelectedAssignment(assignment);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setSelectedAssignment(undefined);
    setIsFormOpen(true);
  };

  const getStatus = (start: string, end: string) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    // Convert start/end strings to local date objects for comparison
    const startDate = new Date(start);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(end);
    endDate.setHours(0, 0, 0, 0);
    
    if (now < startDate) return 'upcoming';
    if (now > endDate) return 'expired';
    return 'active';
  };

  const filteredAssignments = assignments.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         item.location_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const status = getStatus(item.start_date, item.end_date);
    const matchesFilter = filterStatus === 'all' || filterStatus === status;
    
    return matchesSearch && matchesFilter;
  });

  if (isLoading) return <LoadingSpinner message="Sinkronisasi Data Penugasan..." />;

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 shadow-inner">
            <ShieldCheck size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">Penugasan Khusus</h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-[0.2em] mt-1">Manajemen Jadwal & Lokasi Prioritas</p>
          </div>
        </div>
        
        <button 
          onClick={handleCreate}
          className="flex items-center gap-3 px-8 py-4 bg-[#006E62] text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-[#005a50] shadow-lg shadow-[#006E62]/20 transition-all active:scale-95"
        >
          <Plus size={18} /> Tambah Penugasan
        </button>
      </div>

      {/* Filter & Search Section */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text"
            placeholder="Cari judul penugasan atau lokasi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-[#006E62] focus:border-transparent transition-all"
          />
        </div>
        
        <div className="flex gap-2 p-1 bg-gray-50 rounded-2xl border border-gray-100">
          {(['all', 'active', 'upcoming', 'expired'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                filterStatus === status 
                  ? 'bg-white text-[#006E62] shadow-sm' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {status === 'all' ? 'Semua' : status === 'active' ? 'Aktif' : status === 'upcoming' ? 'Mendatang' : 'Selesai'}
            </button>
          ))}
        </div>
      </div>

      {/* Assignment List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredAssignments.length > 0 ? (
          filteredAssignments.map((item) => {
            const status = getStatus(item.start_date, item.end_date);
            return (
              <div key={item.id} className="group bg-white rounded-3xl border border-gray-100 p-6 shadow-sm hover:shadow-xl hover:border-[#006E62]/20 transition-all duration-500 relative overflow-hidden">
                {/* Status Badge */}
                <div className="absolute top-6 right-6">
                  <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                    status === 'active' ? 'bg-emerald-50 text-emerald-600' :
                    status === 'upcoming' ? 'bg-amber-50 text-amber-600' :
                    'bg-gray-100 text-gray-400'
                  }`}>
                    {status === 'active' ? 'Sedang Berjalan' : status === 'upcoming' ? 'Mendatang' : 'Sudah Selesai'}
                  </span>
                </div>

                <div className="flex flex-col h-full">
                  <div className="mb-6">
                    <h3 className="text-lg font-black text-gray-800 leading-tight mb-2 group-hover:text-[#006E62] transition-colors">{item.title}</h3>
                    <p className="text-[10px] text-gray-400 font-medium line-clamp-2 leading-relaxed">{item.description || 'Tidak ada deskripsi.'}</p>
                  </div>

                  <div className="space-y-3 mb-8">
                    <div className="flex items-center gap-3 text-gray-500">
                      <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
                        <Calendar size={14} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Periode</span>
                        <span className="text-[10px] font-bold text-gray-700">{new Date(item.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - {new Date(item.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-gray-500">
                      <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
                        <MapPin size={14} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Lokasi Khusus</span>
                        <span className="text-[10px] font-bold text-gray-700">{item.location_name}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-gray-500">
                      <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
                        <Clock size={14} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Jadwal</span>
                        <span className="text-[10px] font-bold text-gray-700">
                          {item.custom_check_in ? `${item.custom_check_in.substring(0, 5)} - ${item.custom_check_out?.substring(0, 5)}` : 'Gunakan Master Jadwal'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-gray-500">
                      <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
                        <Users size={14} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Penerima Tugas</span>
                        <span className="text-[10px] font-bold text-gray-700">{(item as any).accounts?.length || 0} Karyawan</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto pt-6 border-t border-gray-50 flex items-center justify-between">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleEdit(item)}
                        className="p-2.5 bg-gray-50 text-gray-400 hover:bg-[#006E62]/10 hover:text-[#006E62] rounded-xl transition-all"
                        title="Edit Penugasan"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="p-2.5 bg-gray-50 text-gray-400 hover:bg-rose-50 hover:text-rose-500 rounded-xl transition-all"
                        title="Hapus Penugasan"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                    <button 
                      onClick={() => handleEdit(item)}
                      className="flex items-center gap-2 text-[10px] font-black text-[#006E62] uppercase tracking-widest hover:gap-3 transition-all"
                    >
                      Detail <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-20 bg-white rounded-3xl border border-gray-100 border-dashed flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-6">
              <ShieldCheck size={40} />
            </div>
            <h3 className="text-xl font-black text-gray-800 tracking-tight">Belum Ada Penugasan</h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-2">Mulai buat penugasan khusus untuk karyawan Anda</p>
            <button 
              onClick={handleCreate}
              className="mt-8 px-8 py-3.5 bg-[#006E62] text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[#006E62]/20"
            >
              Buat Sekarang
            </button>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {isFormOpen && (
        <SpecialAssignmentForm 
          assignment={selectedAssignment}
          onClose={() => setIsFormOpen(false)}
          onSuccess={() => {
            setIsFormOpen(false);
            fetchAssignments();
          }}
        />
      )}
    </div>
  );
};

export default SpecialAssignmentMain;
