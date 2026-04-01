
import React, { useState, useEffect } from 'react';
import { Plus, Search, MapPin, Grid, List as ListIcon, Filter, ArrowLeft, AlertCircle } from 'lucide-react';
import Swal from 'sweetalert2';
import { supabase } from '../../lib/supabase';
import { locationService } from '../../services/locationService';
import { Location, LocationInput, LocationAdministration } from '../../types';
import LocationForm from './LocationForm';
import LocationDetail from './LocationDetail';
import { CardSkeleton } from '../../components/Common/Skeleton';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

const LocationMain: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [administrations, setAdministrations] = useState<Record<string, LocationAdministration[]>>({});

  useEffect(() => {
    fetchLocations();
    fetchAllAdministrations();
  }, []);

  const fetchLocations = async () => {
    try {
      setIsLoading(true);
      const data = await locationService.getAll();
      setLocations(data);
    } catch (error) {
      Swal.fire('Gagal', 'Gagal memuat data lokasi', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllAdministrations = async () => {
    try {
      const { data, error } = await supabase
        .from('location_administrations')
        .select('*')
        .order('admin_date', { ascending: false });
      
      if (error) throw error;
      
      const grouped = (data as LocationAdministration[]).reduce((acc, admin) => {
        if (!acc[admin.location_id]) acc[admin.location_id] = [];
        acc[admin.location_id].push(admin);
        return acc;
      }, {} as Record<string, LocationAdministration[]>);
      
      setAdministrations(grouped);
    } catch (error) {
      console.error("Gagal memuat data administrasi:", error);
    }
  };

  const checkIsExpired = (locationId: string) => {
    const locAdmins = administrations[locationId] || [];
    if (locAdmins.length === 0) return false;
    
    // Ambil data terbaru (sudah diurutkan berdasarkan admin_date desc)
    const latest = locAdmins[0];
    if (!latest.due_date) return false;
    
    const today = new Date().toISOString().split('T')[0];
    return latest.due_date < today;
  };

  const handleCreate = async (input: LocationInput) => {
    setIsSaving(true);
    // Optimistic UI update
    const tempId = `temp-${Math.random().toString(36).substring(7)}`;
    const optimisticLocation: Location = { 
      ...input, 
      id: tempId, 
      created_at: new Date().toISOString(),
      search_all: `${input.name} ${input.location_type} ${input.address} ${input.city}`.toLowerCase()
    };
    
    setLocations(prev => [optimisticLocation, ...prev]);
    setShowForm(false);

    try {
      const created = await locationService.create(input);
      setLocations(prev => prev.map(loc => loc.id === tempId ? created : loc));
      Swal.fire({
        title: 'Berhasil!',
        text: 'Lokasi baru telah ditambahkan.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error) {
      setLocations(prev => prev.filter(loc => loc.id !== tempId));
      Swal.fire('Gagal', 'Terjadi kesalahan saat menyimpan data', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (id: string, input: Partial<LocationInput>) => {
    setIsSaving(true);
    try {
      const updated = await locationService.update(id, input);
      setLocations(prev => prev.map(loc => loc.id === id ? updated : loc));
      setRefreshTrigger(prev => prev + 1);
      setEditingLocation(null);
      setShowForm(false);
      Swal.fire({
        title: 'Terupdate!',
        text: 'Data lokasi berhasil diperbarui.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error) {
      Swal.fire('Gagal', 'Gagal memperbarui data', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Apakah Anda yakin?',
      text: "Data ini akan dihapus permanen dari sistem.",
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
        await locationService.delete(id);
        setLocations(prev => prev.filter(loc => loc.id !== id));
        setSelectedLocationId(null);
        Swal.fire('Terhapus!', 'Data lokasi telah dihapus.', 'success');
      } catch (error) {
        Swal.fire('Gagal', 'Gagal menghapus data', 'error');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const filteredLocations = locations.filter(loc => {
    const searchStr = (loc.search_all || `${loc.name} ${loc.address} ${loc.city} ${loc.location_type}`).toLowerCase();
    return searchStr.includes(searchTerm.toLowerCase());
  });

  // Render Halaman Detail jika ada lokasi terpilih
  if (selectedLocationId) {
    return (
      <div className="animate-in fade-in slide-in-from-right duration-300">
        <button 
          onClick={() => setSelectedLocationId(null)}
          className="mb-4 flex items-center gap-2 text-gray-500 hover:text-[#006E62] transition-colors font-bold text-xs uppercase"
        >
          <ArrowLeft size={16} /> Kembali ke Daftar
        </button>
        <LocationDetail
          id={selectedLocationId}
          onClose={() => setSelectedLocationId(null)}
          onEdit={(loc) => { setEditingLocation(loc); setShowForm(true); }}
          onDelete={(id) => handleDelete(id)}
          onRefresh={fetchAllAdministrations}
          refreshTrigger={refreshTrigger}
        />
        
        {/* Modals - Dipindahkan ke sini juga agar muncul saat di Detail View */}
        {showForm && (
          <LocationForm 
            onClose={() => { setShowForm(false); setEditingLocation(null); }}
            onSubmit={editingLocation ? (data) => handleUpdate(editingLocation.id, data) : handleCreate}
            initialData={editingLocation || undefined}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isSaving && <LoadingSpinner />}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Cari (Nama, Alamat, Jenis, Kota)..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#006E62] focus:border-transparent transition-all text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex border border-gray-200 rounded-md overflow-hidden bg-white">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-gray-100 text-[#006E62]' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Grid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-gray-100 text-[#006E62]' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <ListIcon size={18} />
            </button>
          </div>
          <button 
            onClick={() => { setEditingLocation(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-[#006E62] text-white px-4 py-2 rounded-md hover:bg-[#005a50] transition-colors shadow-sm"
          >
            <Plus size={18} />
            <span className="font-medium text-sm">Tambah</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <CardSkeleton key={i} />)}
        </div>
      ) : filteredLocations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <MapPin size={48} strokeWidth={1} className="mb-4" />
          <p className="text-lg">Data tidak ditemukan.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLocations.map(location => {
            const isExpired = checkIsExpired(location.id);
            return (
              <div 
                key={location.id} 
                onClick={() => setSelectedLocationId(location.id)}
                className={`group border p-4 rounded-md shadow-sm hover:shadow-md transition-all cursor-pointer border-l-4 hover:border-l-[#006E62] relative ${
                  isExpired ? 'bg-red-50 border-red-200 border-l-red-500' : 'bg-white border-gray-100 border-l-transparent'
                }`}
              >
                {isExpired && (
                  <div className="absolute top-2 right-2 text-red-500 animate-pulse">
                    <AlertCircle size={16} />
                  </div>
                )}
                <div className="flex justify-between items-start mb-2">
                  <h3 className={`font-bold line-clamp-1 text-sm ${isExpired ? 'text-red-700' : 'text-[#006E62] group-hover:text-[#005a50]'}`}>{location.name}</h3>
                  <span className={`text-[9px] font-bold border px-1.5 py-0.5 rounded uppercase ${isExpired ? 'text-red-400 border-red-100' : 'text-gray-400 border-gray-100'}`}>{location.location_type || 'Lokasi'}</span>
                </div>
                <p className={`text-[11px] mb-3 line-clamp-1 ${isExpired ? 'text-red-600/70' : 'text-gray-500'}`}>{location.address}</p>
                <div className="flex items-center justify-between">
                  <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider ${isExpired ? 'text-red-400' : 'text-gray-400'}`}>
                    <MapPin size={10} /> {location.city}
                  </div>
                  <div className={`text-[10px] ${isExpired ? 'text-red-300' : 'text-gray-300'}`}>R: {location.radius}m</div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-md overflow-hidden shadow-sm overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase">
              <tr>
                <th className="px-6 py-3">Nama & Jenis</th>
                <th className="px-6 py-3">Alamat & Kota</th>
                <th className="px-6 py-3">Telepon</th>
                <th className="px-6 py-3 text-right">Radius</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLocations.map(location => {
                const isExpired = checkIsExpired(location.id);
                return (
                  <tr 
                    key={location.id} 
                    onClick={() => setSelectedLocationId(location.id)}
                    className={`cursor-pointer transition-colors ${isExpired ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`font-bold text-xs ${isExpired ? 'text-red-700' : 'text-[#006E62]'}`}>{location.name}</div>
                        {isExpired && <AlertCircle size={12} className="text-red-500 animate-pulse" />}
                      </div>
                      <div className={`text-[9px] uppercase font-bold ${isExpired ? 'text-red-400' : 'text-gray-400'}`}>{location.location_type}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`text-[11px] truncate max-w-xs ${isExpired ? 'text-red-600/70' : 'text-gray-600'}`}>{location.address}</div>
                      <div className={`text-[10px] font-bold uppercase ${isExpired ? 'text-red-400' : 'text-gray-400'}`}>{location.city}</div>
                    </td>
                    <td className={`px-6 py-4 text-xs ${isExpired ? 'text-red-500' : 'text-gray-500'}`}>{location.phone || '-'}</td>
                    <td className={`px-6 py-4 text-xs text-right font-bold ${isExpired ? 'text-red-400' : 'text-gray-400'}`}>{location.radius}m</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <LocationForm 
          onClose={() => { setShowForm(false); setEditingLocation(null); }}
          onSubmit={editingLocation ? (data) => handleUpdate(editingLocation.id, data) : handleCreate}
          initialData={editingLocation || undefined}
        />
      )}
    </div>
  );
};

export default LocationMain;
