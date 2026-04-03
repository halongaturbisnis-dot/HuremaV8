
import React, { useState, useEffect } from 'react';
import { Trophy, Star, Calendar, Users, Plus, Trash2, Award, Quote, ChevronRight, User, UserCircle, History } from 'lucide-react';
import { awardService } from '../../../services/awardService';
import { authService } from '../../../services/authService';
import { googleDriveService } from '../../../services/googleDriveService';
import { EmployeeOfThePeriod } from '../../../types';
import EmployeeOfThePeriodForm from './EmployeeOfThePeriodForm';
import Swal from 'sweetalert2';

const EmployeeOfThePeriodMain: React.FC = () => {
  const [awards, setAwards] = useState<EmployeeOfThePeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const user = authService.getCurrentUser();
  const isAdmin = user?.role === 'admin' || user?.is_performance_admin;

  const fetchAwards = async () => {
    setLoading(true);
    try {
      const data = await awardService.getEmployeeOfThePeriodAll();
      setAwards(data);
    } catch (error) {
      console.error('Error fetching awards:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAwards();
  }, []);

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Hapus Data?',
      text: "Data penghargaan ini akan dihapus permanen.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Ya, Hapus'
    });

    if (result.isConfirmed) {
      try {
        await awardService.deleteEmployeeOfThePeriod(id);
        Swal.fire('Berhasil', 'Data telah dihapus.', 'success');
        fetchAwards();
      } catch (error) {
        Swal.fire('Gagal', 'Terjadi kesalahan.', 'error');
      }
    }
  };

  const latestAward = awards[0];
  const historyAwards = awards.slice(1);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-[#006E62] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Memuat...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">
            Best Employee
          </h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Daftar Karyawan Teladan</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#006E62] text-white rounded-lg hover:bg-[#005a50] transition-all text-sm font-bold shadow-md uppercase tracking-wider"
          >
            <Plus size={18} />
            Tambah
          </button>
        )}
      </div>

      {/* Hero Section - Latest Winner */}
      {latestAward ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {latestAward.accounts?.map((acc) => (
            <div key={acc.id} className="group bg-white rounded-xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col items-center text-center relative">
              {/* Photo Circle */}
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#006E62]/10 mb-4">
                {acc.photo_google_id ? (
                  <img 
                    src={googleDriveService.getFileUrl(acc.photo_google_id)} 
                    alt={acc.full_name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-200"><User size={48} /></div>
                )}
              </div>
              
              {/* Label */}
              <div className="absolute top-4 left-4 bg-[#006E62] text-white px-2 py-1 rounded text-[9px] font-bold uppercase tracking-widest shadow-lg flex items-center gap-1">
                <Star size={10} fill="white" />
                Best Employee
              </div>

              {/* Info */}
              <div className="space-y-1 mb-4">
                <p className="text-[#006E62] text-[9px] font-bold uppercase tracking-widest">
                  {new Date(0, latestAward.month - 1).toLocaleString('id-ID', { month: 'long' })} {latestAward.year}
                </p>
                <h4 className="font-bold text-gray-800 text-sm truncate">{acc.full_name}</h4>
                <p className="text-gray-400 text-[10px] truncate">{acc.position}</p>
              </div>

              {/* Reason */}
              <div className="w-full pt-4 border-t border-gray-50">
                <p className="text-xs text-gray-500 line-clamp-2 italic">"{latestAward.reason || 'Tanpa keterangan.'}"</p>
              </div>

              {/* Delete Button */}
              {isAdmin && (
                <button 
                  onClick={() => handleDelete(latestAward.id)}
                  className="absolute top-2 right-2 p-2 text-gray-300 hover:text-[#006E62] transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Trophy size={40} className="text-gray-200" />
          </div>
          <p className="text-gray-500 font-medium">Belum ada data</p>
        </div>
      )}

      {/* History Section */}
      {historyAwards.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-800 uppercase tracking-widest flex items-center gap-2">
              <History className="text-gray-400" size={20} />
              Riwayat Penghargaan
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {historyAwards.map((award) => (
              <div key={award.id} className="group bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                <div className="aspect-video relative bg-gray-100 overflow-hidden">
                  <div className="flex h-full">
                    {award.accounts?.map((acc) => (
                      <div key={acc.id} className="flex-1 relative">
                        {acc.photo_google_id ? (
                          <img 
                            src={googleDriveService.getFileUrl(acc.photo_google_id)} 
                            alt="" 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-200"><User size={32} /></div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="text-[#006E62] text-[10px] font-bold uppercase tracking-widest mb-1">
                      {new Date(0, award.month - 1).toLocaleString('id-ID', { month: 'long' })} {award.year}
                    </p>
                    <h4 className="text-white font-bold truncate">
                      {award.accounts?.map(a => a.full_name).join(' & ')}
                    </h4>
                  </div>
                  {isAdmin && (
                    <button 
                      onClick={() => handleDelete(award.id)}
                      className="absolute top-2 right-2 p-2 bg-white/10 hover:bg-[#005a50] text-white rounded-lg backdrop-blur-md transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-xs text-gray-500 line-clamp-2 italic">"{award.reason || 'Tanpa keterangan.'}"</p>
                  <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {award.accounts?.map((acc) => (
                        <div key={acc.id} className="w-6 h-6 rounded-full border border-white bg-gray-200 overflow-hidden shadow-sm">
                          {acc.photo_google_id ? (
                            <img src={googleDriveService.getFileUrl(acc.photo_google_id)} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-[8px]"><User size={10} /></div>
                          )}
                        </div>
                      ))}
                    </div>
                    <span className="text-[10px] font-bold text-gray-300 uppercase tracking-tighter">Hall of Fame</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isFormOpen && (
        <EmployeeOfThePeriodForm 
          awards={awards}
          onClose={() => setIsFormOpen(false)}
          onSuccess={() => {
            setIsFormOpen(false);
            fetchAwards();
          }}
        />
      )}
    </div>
  );
};

export default EmployeeOfThePeriodMain;
