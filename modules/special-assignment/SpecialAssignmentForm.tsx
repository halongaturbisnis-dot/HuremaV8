import React, { useState, useEffect } from 'react';
import { X, Save, MapPin, Users, Calendar, Clock, ShieldCheck, Search, Check, Loader2, AlertCircle, Info, User } from 'lucide-react';
import Swal from 'sweetalert2';
import { specialAssignmentService } from '../../services/specialAssignmentService';
import { accountService } from '../../services/accountService';
import { scheduleService } from '../../services/scheduleService';
import { locationService } from '../../services/locationService';
import { presenceService } from '../../services/presenceService';
import { authService } from '../../services/authService';
import { Account, Schedule, SpecialAssignment, Location } from '../../types';
import AssignmentMap from './AssignmentMap';
import AccountListItem from '../../components/Common/AccountListItem';

interface SpecialAssignmentFormProps {
  assignment?: SpecialAssignment;
  onClose: () => void;
  onSuccess: () => void;
}

const SpecialAssignmentForm: React.FC<SpecialAssignmentFormProps> = ({ assignment, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<Partial<SpecialAssignment>>({
    title: assignment?.title || '',
    description: assignment?.description || '',
    start_date: assignment?.start_date || new Date().toISOString().split('T')[0],
    end_date: assignment?.end_date || new Date().toISOString().split('T')[0],
    location_name: assignment?.location_name || '',
    latitude: assignment?.latitude || -6.200000,
    longitude: assignment?.longitude || 106.816666,
    radius: assignment?.radius || 100,
    schedule_id: assignment?.schedule_id || null,
    custom_check_in: assignment?.custom_check_in || null,
    custom_check_out: assignment?.custom_check_out || null,
    custom_late_tolerance: assignment?.custom_late_tolerance || 0,
    custom_early_tolerance: assignment?.custom_early_tolerance || 0
  });

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchAccount, setSearchAccount] = useState('');
  const [useCustomSchedule, setUseCustomSchedule] = useState(!!assignment?.custom_check_in);
  const [locationMode, setLocationMode] = useState<'master' | 'custom'>(assignment?.location_name ? 'custom' : 'master');
  const [coordinateInput, setCoordinateInput] = useState(`${assignment?.latitude || -6.200000}, ${assignment?.longitude || 106.816666}`);
  const [currentAddress, setCurrentAddress] = useState<string>('');
  const [isFetchingAddress, setIsFetchingAddress] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (formData.latitude && formData.longitude) {
      fetchAddress(formData.latitude, formData.longitude);
    }
  }, [formData.latitude, formData.longitude]);

  const fetchAddress = async (lat: number, lng: number) => {
    try {
      setIsFetchingAddress(true);
      const addr = await presenceService.getReverseGeocode(lat, lng);
      setCurrentAddress(addr);
    } catch (error) {
      console.error('Error fetching address:', error);
      setCurrentAddress('Gagal mengambil alamat');
    } finally {
      setIsFetchingAddress(false);
    }
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const currentUser = authService.getCurrentUser();
      
      const [accs, schs, locs] = await Promise.all([
        accountService.getAll(undefined, undefined, '', 'aktif'),
        scheduleService.getAll(),
        locationService.getAll()
      ]);

      // Filter accounts based on HR Admin scope
      let filteredAccs = accs;
      if (currentUser?.is_hr_admin && currentUser.hr_scope?.mode === 'limited') {
        const allowedLocationIds = currentUser.hr_scope.location_ids || [];
        filteredAccs = accs.filter(acc => 
          acc.location_id && allowedLocationIds.includes(acc.location_id)
        );
      }

      setAccounts(filteredAccs);
      setSchedules(schs.filter(s => s.type === 1 || s.type === 2));
      setLocations(locs);

      if (assignment?.id) {
        const linkedAccounts = await specialAssignmentService.getLinkedAccounts(assignment.id);
        setSelectedAccountIds(linkedAccounts.map(a => a.account_id));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCoordinateChange = (val: string) => {
    setCoordinateInput(val);
    const parts = val.split(',').map(p => p.trim());
    if (parts.length === 2) {
      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lng)) {
        setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
      }
    }
  };

  const handleLocationChange = (lat: number, lng: number) => {
    setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
    setCoordinateInput(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
  };

  const handleMasterLocationSelect = (locId: string) => {
    if (!locId) return;
    const loc = locations.find(l => l.id === locId);
    if (loc) {
      setFormData(prev => ({
        ...prev,
        location_name: loc.name,
        latitude: loc.latitude,
        longitude: loc.longitude,
        radius: loc.radius
      }));
      setCoordinateInput(`${loc.latitude}, ${loc.longitude}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentUser = authService.getCurrentUser();
    
    // Validasi Judul
    if (!formData.title?.trim()) {
      return Swal.fire('Peringatan', 'Judul Penugasan wajib diisi.', 'warning');
    }

    // Validasi Tanggal
    if (!formData.start_date || !formData.end_date) {
      return Swal.fire('Peringatan', 'Tanggal Mulai dan Tanggal Selesai wajib diisi.', 'warning');
    }

    // Validasi Jadwal
    if (!useCustomSchedule && !formData.schedule_id) {
      return Swal.fire('Peringatan', 'Harap pilih Master Jadwal atau gunakan Jadwal Kustom.', 'warning');
    }
    if (useCustomSchedule && (!formData.custom_check_in || !formData.custom_check_out)) {
      return Swal.fire('Peringatan', 'Jam Masuk dan Jam Pulang pada Jadwal Kustom wajib diisi.', 'warning');
    }

    // Validasi Lokasi
    if (locationMode === 'master' && !formData.location_name) {
      return Swal.fire('Peringatan', 'Harap pilih Lokasi dari daftar master.', 'warning');
    }
    if (locationMode === 'custom' && !formData.location_name?.trim()) {
      return Swal.fire('Peringatan', 'Nama Lokasi Baru wajib diisi.', 'warning');
    }

    // Validasi Akun
    if (selectedAccountIds.length === 0) {
      return Swal.fire('Peringatan', 'Minimal pilih 1 Karyawan untuk penugasan ini.', 'warning');
    }

    try {
      setIsSaving(true);
      const payload = {
        ...formData,
        schedule_id: useCustomSchedule ? null : formData.schedule_id,
        custom_check_in: useCustomSchedule ? formData.custom_check_in : null,
        custom_check_out: useCustomSchedule ? formData.custom_check_out : null,
        custom_late_tolerance: useCustomSchedule ? formData.custom_late_tolerance : null,
        custom_early_tolerance: useCustomSchedule ? formData.custom_early_tolerance : null,
        created_by: currentUser?.id
      } as any;

      if (assignment?.id) {
        await specialAssignmentService.update(assignment.id, payload, selectedAccountIds);
      } else {
        await specialAssignmentService.create(payload, selectedAccountIds);
      }

      Swal.fire('Berhasil', 'Penugasan khusus telah disimpan.', 'success');
      onSuccess();
    } catch (error) {
      console.error('Error saving assignment:', error);
      Swal.fire('Gagal', 'Terjadi kesalahan saat menyimpan penugasan.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleAccount = (id: string) => {
    setSelectedAccountIds(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleMapClick = (e: any) => {
    // In a real scenario, we'd get lat/lng from map click
    // For now, let's simulate with a prompt or just let user type
  };

  const filteredAccounts = accounts.filter(a => 
    a.full_name.toLowerCase().includes(searchAccount.toLowerCase()) || 
    a.internal_nik.toLowerCase().includes(searchAccount.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-5xl h-full max-h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 shadow-inner">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-800 tracking-tight">
                {assignment ? 'Edit Penugasan' : 'Penugasan Baru'}
              </h2>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-1">Konfigurasi Penugasan Khusus</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-gray-50 rounded-2xl text-gray-400 transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-8 scrollbar-none">
          <form id="assignment-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Left Column: Basic Info & Schedule */}
            <div className="space-y-10">
              <section className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-[#006E62]/10 rounded-lg flex items-center justify-center text-[#006E62]">
                    <Info size={16} />
                  </div>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Informasi Dasar</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 ml-1">Judul Penugasan *</label>
                    <input 
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      placeholder="Contoh: Penugasan Proyek X"
                      className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-[#006E62] focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 ml-1">Deskripsi</label>
                    <textarea 
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Detail penugasan..."
                      className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-[#006E62] focus:border-transparent transition-all h-24 resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 ml-1">Tanggal Mulai</label>
                      <input 
                        type="date"
                        required
                        value={formData.start_date}
                        onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-[#006E62] focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 ml-1">Tanggal Selesai</label>
                      <input 
                        type="date"
                        required
                        value={formData.end_date}
                        onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-[#006E62] focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-[#006E62]/10 rounded-lg flex items-center justify-center text-[#006E62]">
                    <Clock size={16} />
                  </div>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Konfigurasi Jadwal</h3>
                </div>

                <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1">Tipe Jadwal</label>
                    <div className="flex p-1 bg-white rounded-2xl border border-gray-100">
                      <button
                        type="button"
                        onClick={() => setUseCustomSchedule(false)}
                        className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          !useCustomSchedule ? 'bg-[#006E62] text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'
                        }`}
                      >
                        Daftar Jadwal
                      </button>
                      <button
                        type="button"
                        onClick={() => setUseCustomSchedule(true)}
                        className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          useCustomSchedule ? 'bg-[#006E62] text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'
                        }`}
                      >
                        Jadwal Baru
                      </button>
                    </div>
                  </div>

                  {!useCustomSchedule ? (
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 ml-1">Pilih Master Jadwal</label>
                      <select 
                        value={formData.schedule_id || ''}
                        onChange={(e) => setFormData({...formData, schedule_id: e.target.value || null})}
                        className="w-full p-4 bg-white border border-gray-100 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-[#006E62] focus:border-transparent transition-all"
                      >
                        <option value="">-- Gunakan Jadwal Default Akun --</option>
                        {schedules.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top duration-300">
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 ml-1">Jam Masuk</label>
                        <input 
                          type="time"
                          value={formData.custom_check_in || ''}
                          onChange={(e) => setFormData({...formData, custom_check_in: e.target.value})}
                          className="w-full p-4 bg-white border border-gray-100 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-[#006E62] focus:border-transparent transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 ml-1">Jam Pulang</label>
                        <input 
                          type="time"
                          value={formData.custom_check_out || ''}
                          onChange={(e) => setFormData({...formData, custom_check_out: e.target.value})}
                          className="w-full p-4 bg-white border border-gray-100 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-[#006E62] focus:border-transparent transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 ml-1">Toleransi Terlambat (Menit)</label>
                        <input 
                          type="number"
                          min="0"
                          value={formData.custom_late_tolerance || 0}
                          onChange={(e) => setFormData({...formData, custom_late_tolerance: parseInt(e.target.value) || 0})}
                          className="w-full p-4 bg-white border border-gray-100 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-[#006E62] focus:border-transparent transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 ml-1">Toleransi Pulang (Menit)</label>
                        <input 
                          type="number"
                          min="0"
                          value={formData.custom_early_tolerance || 0}
                          onChange={(e) => setFormData({...formData, custom_early_tolerance: parseInt(e.target.value) || 0})}
                          className="w-full p-4 bg-white border border-gray-100 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-[#006E62] focus:border-transparent transition-all"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Right Column: Location & Accounts */}
            <div className="space-y-10">
              <section className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-[#006E62]/10 rounded-lg flex items-center justify-center text-[#006E62]">
                    <MapPin size={16} />
                  </div>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Lokasi Penugasan</h3>
                </div>

                <div className="space-y-4">
                  <div className="flex p-1 bg-gray-50 rounded-2xl border border-gray-100">
                    <button
                      type="button"
                      onClick={() => setLocationMode('master')}
                      className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        locationMode === 'master' ? 'bg-white text-[#006E62] shadow-sm' : 'text-gray-400'
                      }`}
                    >
                      Daftar Lokasi
                    </button>
                    <button
                      type="button"
                      onClick={() => setLocationMode('custom')}
                      className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        locationMode === 'custom' ? 'bg-white text-[#006E62] shadow-sm' : 'text-gray-400'
                      }`}
                    >
                      Lokasi Baru
                    </button>
                  </div>

                  {locationMode === 'master' ? (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 ml-1">Pilih Lokasi Master *</label>
                      <select 
                        required={locationMode === 'master'}
                        onChange={(e) => handleMasterLocationSelect(e.target.value)}
                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-[#006E62] focus:border-transparent transition-all"
                      >
                        <option value="">-- Pilih Lokasi --</option>
                        {locations.map(loc => (
                          <option key={loc.id} value={loc.id}>{loc.name}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 ml-1">Nama Lokasi Baru *</label>
                      <input 
                        type="text"
                        required={locationMode === 'custom'}
                        value={formData.location_name}
                        onChange={(e) => setFormData({...formData, location_name: e.target.value})}
                        placeholder="Contoh: Kantor Cabang Bandung"
                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-[#006E62] focus:border-transparent transition-all"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 ml-1">Koordinat (Lat, Lng)</label>
                      <input 
                        type="text"
                        readOnly={locationMode === 'master'}
                        value={coordinateInput}
                        onChange={(e) => handleCoordinateChange(e.target.value)}
                        placeholder="-6.200000, 106.816666"
                        className={`w-full p-4 rounded-2xl text-xs font-medium transition-all border ${
                          locationMode === 'master' 
                            ? 'bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed' 
                            : 'bg-gray-50 border-gray-100 focus:ring-2 focus:ring-[#006E62] focus:border-transparent'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 ml-1">Radius (m)</label>
                      <input 
                        type="number"
                        value={formData.radius}
                        readOnly={locationMode === 'master'}
                        onChange={(e) => setFormData({...formData, radius: parseInt(e.target.value) || 0})}
                        className={`w-full p-4 rounded-2xl text-xs font-medium transition-all border ${
                          locationMode === 'master' 
                            ? 'bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed' 
                            : 'bg-gray-50 border-gray-100 focus:ring-2 focus:ring-[#006E62] focus:border-transparent'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="h-48 rounded-2xl overflow-hidden border border-gray-100">
                    <AssignmentMap 
                      lat={formData.latitude!} 
                      lng={formData.longitude!} 
                      radius={formData.radius!}
                      isDraggable={locationMode === 'custom'}
                      onLocationChange={handleLocationChange}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 ml-1">Alamat Terdeteksi</label>
                    <div className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-medium text-gray-500 min-h-[3.5rem] flex items-center">
                      {isFetchingAddress ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="animate-spin" size={12} />
                          <span>Mencari alamat...</span>
                        </div>
                      ) : (
                        currentAddress || 'Koordinat belum ditentukan'
                      )}
                    </div>
                  </div>
                  <p className="text-[9px] text-gray-400 font-medium italic">* Lokasi ini akan menjadi titik presensi utama selama periode penugasan.</p>
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-[#006E62]/10 rounded-lg flex items-center justify-center text-[#006E62]">
                    <Users size={16} />
                  </div>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Penerima Penugasan ({selectedAccountIds.length})</h3>
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input 
                      type="text"
                      placeholder="Cari karyawan..."
                      value={searchAccount}
                      onChange={(e) => setSearchAccount(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-medium focus:ring-2 focus:ring-[#006E62] transition-all"
                    />
                  </div>

                  <div className="max-h-60 overflow-y-auto pr-2 space-y-2 scrollbar-thin scrollbar-thumb-gray-200">
                    {filteredAccounts.map(acc => (
                      <AccountListItem 
                        key={acc.id}
                        account={acc}
                        isSelected={selectedAccountIds.includes(acc.id)}
                        onClick={() => toggleAccount(acc.id)}
                      />
                    ))}
                  </div>
                </div>
              </section>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-gray-50 bg-gray-50/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 text-amber-600">
            <AlertCircle size={16} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Penugasan ini akan mempengaruhi skema presensi karyawan</span>
          </div>
          
          <div className="flex gap-4">
            <button 
              type="button"
              onClick={onClose}
              className="px-8 py-4 bg-white border-2 border-gray-100 text-gray-400 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-gray-50 transition-all"
            >
              Batal
            </button>
            <button 
              form="assignment-form"
              type="submit"
              disabled={isSaving}
              className="px-10 py-4 bg-[#006E62] text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-[#005a50] shadow-lg shadow-[#006E62]/20 transition-all disabled:opacity-50 flex items-center gap-3"
            >
              {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {isSaving ? 'MENYIMPAN...' : 'SIMPAN PENUGASAN'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpecialAssignmentForm;
