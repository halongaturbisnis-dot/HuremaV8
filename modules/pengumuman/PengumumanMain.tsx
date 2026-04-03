import React, { useState, useEffect } from 'react';
import { Megaphone, Plus, Search, Filter, Loader2, AlertCircle, Calendar, FileText, Info, History, Trash2, Edit2, Eye } from 'lucide-react';
import { Announcement, Account } from '../../types';
import { announcementService } from '../../services/announcementService';
import AnnouncementCard from './AnnouncementCard';
import AnnouncementDetail from './AnnouncementDetail';
import AnnouncementForm from './AnnouncementForm';
import Swal from 'sweetalert2';

interface PengumumanMainProps {
  user: Account;
}

const PengumumanMain: React.FC<PengumumanMainProps> = ({ user }) => {
  const [activeAnnouncements, setActiveAnnouncements] = useState<Announcement[]>([]);
  const [upcomingAnnouncements, setUpcomingAnnouncements] = useState<Announcement[]>([]);
  const [pastAnnouncements, setPastAnnouncements] = useState<Announcement[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [pastCount, setPastCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tempSearchQuery, setTempSearchQuery] = useState('');
  
  const [activePage, setActivePage] = useState(1);
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [pastPage, setPastPage] = useState(1);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | undefined>(undefined);
  const itemsPerPage = 10;

  const isAdmin = user?.role === 'admin' || user?.is_hr_admin || user?.is_performance_admin || user?.is_finance_admin;

  useEffect(() => {
    fetchData();
  }, [user.id, user.department, searchQuery, activePage, upcomingPage, pastPage]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      let active, upcoming, past;
      if (isAdmin) {
        [active, upcoming, past] = await Promise.all([
          announcementService.getAnnouncementsAdmin('Active', searchQuery, activePage, itemsPerPage),
          announcementService.getAnnouncementsAdmin('Upcoming', searchQuery, upcomingPage, itemsPerPage),
          announcementService.getAnnouncementsAdmin('Past', searchQuery, pastPage, itemsPerPage)
        ]);
      } else {
        [active, upcoming, past] = await Promise.all([
          announcementService.getFiltered(user, 'Active', searchQuery, activePage, itemsPerPage),
          announcementService.getFiltered(user, 'Upcoming', searchQuery, upcomingPage, itemsPerPage),
          announcementService.getFiltered(user, 'Past', searchQuery, pastPage, itemsPerPage)
        ]);
      }
      setActiveAnnouncements(active.data);
      setActiveCount(active.count);
      setUpcomingAnnouncements(upcoming.data);
      setUpcomingCount(upcoming.count);
      setPastAnnouncements(past.data);
      setPastCount(past.count);
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Hapus Pengumuman?',
      text: "Data pengumuman dan riwayat baca akan dihapus permanen.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Ya, Hapus!'
    });

    if (result.isConfirmed) {
      try {
        await announcementService.deleteAnnouncement(id);
        await fetchData();
        Swal.fire('Berhasil', 'Pengumuman telah dihapus.', 'success');
      } catch (error) {
        Swal.fire('Error', 'Gagal menghapus pengumuman.', 'error');
      }
    }
  };

  const handleSearch = () => {
    setSearchQuery(tempSearchQuery);
    setActivePage(1);
    setUpcomingPage(1);
    setPastPage(1);
  };

  const renderTable = (announcements: Announcement[], page: number, setPage: (p: number) => void, totalCount: number) => {
    if (announcements.length === 0) {
      return (
        <div className="p-8 text-center bg-white rounded-[40px] border border-gray-100 shadow-sm">
          <p className="text-sm font-bold text-gray-400">Tidak ada pengumuman</p>
        </div>
      );
    }

    const totalPages = Math.ceil(totalCount / itemsPerPage);
    const startItem = (page - 1) * itemsPerPage + 1;
    const endItem = Math.min(page * itemsPerPage, totalCount);

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-[40px] border border-gray-100 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pengumuman</th>
                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Kategori</th>
                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Periode Tayang</th>
                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {announcements.map(ann => (
                <tr key={ann.id} onClick={() => setSelectedAnnouncement(ann)} className="hover:bg-gray-50/50 transition-colors cursor-pointer">
                  <td className="px-8 py-5">
                    <div>
                      <p className="text-sm font-bold text-gray-800">{ann.title}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Oleh: {ann.creator?.full_name}</p>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg ${ann.category === 'Urgent' ? 'bg-rose-50 text-rose-600' : ann.category === 'Event' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                      {ann.category}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col gap-1">
                      <p className="text-[9px] font-bold text-gray-600 uppercase tracking-tight">Mulai: {new Date(ann.publish_start).toLocaleDateString('id-ID')}</p>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">Selesai: {new Date(ann.publish_end).toLocaleDateString('id-ID')}</p>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => {
                          setEditingAnnouncement(ann);
                          setIsFormOpen(true);
                        }}
                        className="p-2 text-[#006E62] hover:bg-[#006E62]/10 rounded-xl transition-all"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(ann.id)}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
            MENAMPILKAN {totalCount > 0 ? startItem : 0} HINGGA {endItem} DARI {totalCount} DATA
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage(Math.max(1, page - 1))} 
                disabled={page === 1}
                className="px-3 py-1 rounded-lg text-xs font-bold bg-white border border-gray-200 text-gray-600 disabled:opacity-50"
              >
                &lt;
              </button>
              
              {Array.from({ length: totalPages }).map((_, i) => (
                <button 
                  key={i} 
                  onClick={() => setPage(i + 1)} 
                  className={`px-3 py-1 rounded-lg text-xs font-bold ${page === i + 1 ? 'bg-[#006E62] text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
                >
                  {i + 1}
                </button>
              ))}

              <button 
                onClick={() => setPage(Math.min(totalPages, page + 1))} 
                disabled={page === totalPages}
                className="px-3 py-1 rounded-lg text-xs font-bold bg-white border border-gray-200 text-gray-600 disabled:opacity-50"
              >
                &gt;
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      {!selectedAnnouncement && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Pengumuman</h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pusat Informasi Perusahaan</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
              <input 
                type="text"
                placeholder="Cari pengumuman..."
                value={tempSearchQuery}
                onChange={(e) => setTempSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-12 pr-6 py-3 bg-white border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#006E62]/5 focus:border-[#006E62] transition-all text-sm font-medium w-64 shadow-sm"
              />
              <button onClick={handleSearch} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#006E62]">
                <Search size={18} />
              </button>
            </div>
            {isAdmin && (
              <button 
                onClick={() => {
                  setEditingAnnouncement(undefined);
                  setIsFormOpen(true);
                }}
                className="bg-[#006E62] text-white px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-[#005a50] transition-all shadow-lg shadow-[#006E62]/20 active:scale-95"
              >
                <Plus size={18} /> BARU
              </button>
            )}
          </div>
        </div>
      )}

      {selectedAnnouncement ? (
        <AnnouncementDetail 
          announcement={selectedAnnouncement}
          userId={user.id}
          isAdmin={isAdmin}
          onClose={() => setSelectedAnnouncement(null)}
          onRead={fetchData}
        />
      ) : isLoading ? (
        <div className="flex flex-col items-center justify-center py-32">
          <Loader2 size={48} className="animate-spin text-[#006E62] mb-4" />
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest animate-pulse">Memuat Pengumuman...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active */}
          <section>
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-4">Pengumuman Aktif</h3>
            {renderTable(activeAnnouncements, activePage, setActivePage, activeCount)}
          </section>

          {/* Upcoming */}
          <section>
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-4">Akan Datang</h3>
            {renderTable(upcomingAnnouncements, upcomingPage, setUpcomingPage, upcomingCount)}
          </section>
          
          {/* Past */}
          <section>
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-4">Riwayat</h3>
            {renderTable(pastAnnouncements, pastPage, setPastPage, pastCount)}
          </section>
        </div>
      )}

      {isFormOpen && (
        <AnnouncementForm 
          announcement={editingAnnouncement}
          userId={user.id}
          onClose={() => setIsFormOpen(false)}
          onSave={() => {
            setIsFormOpen(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
};

export default PengumumanMain;
