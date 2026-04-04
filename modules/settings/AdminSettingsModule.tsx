import React, { useState, useEffect } from 'react';
import { Shield, Users, Search, Save, Check, X, UserCheck, ShieldAlert, Wallet, Target, Settings, MapPin, Globe } from 'lucide-react';
import { accountService } from '../../services/accountService';
import { settingsService } from '../../services/settingsService';
import { locationService } from '../../services/locationService';
import { Account, AdminScope, Location } from '../../types';
import Swal from 'sweetalert2';

const AdminSettingsModule: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Admin Role States (Objects: { [userId]: AdminScope })
  const [hrAdmins, setHrAdmins] = useState<Record<string, AdminScope>>({});
  const [performanceAdmins, setPerformanceAdmins] = useState<Record<string, AdminScope>>({});
  const [financeAdmins, setFinanceAdmins] = useState<Record<string, AdminScope>>({});

  // Modal State
  const [scopeModal, setScopeModal] = useState<{
    isOpen: boolean;
    userId: string;
    role: 'hr' | 'performance' | 'finance';
    scope: AdminScope;
  }>({
    isOpen: false,
    userId: '',
    role: 'hr',
    scope: { mode: 'all', location_ids: [] }
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [accData, locData, hrData, perfData, finData] = await Promise.all([
        accountService.getAll(),
        locationService.getAll(),
        settingsService.getSetting('admin_hr_ids', {}),
        settingsService.getSetting('admin_performance_ids', {}),
        settingsService.getSetting('admin_finance_ids', {})
      ]);
      
      // Filter out inactive accounts from admin lists immediately upon loading
      const activeAccountIds = accData
        .filter(acc => !acc.end_date || new Date(acc.end_date) > new Date())
        .map(acc => acc.id);

      // Helper to migrate old array format to new object format
      const migrateToObj = (data: any): Record<string, AdminScope> => {
        if (Array.isArray(data)) {
          const obj: Record<string, AdminScope> = {};
          data.forEach(id => {
            if (activeAccountIds.includes(id)) {
              obj[id] = { mode: 'all', location_ids: [] };
            }
          });
          return obj;
        }
        if (data && typeof data === 'object') {
          const obj: Record<string, AdminScope> = {};
          Object.entries(data).forEach(([id, scope]: [string, any]) => {
            if (activeAccountIds.includes(id)) {
              obj[id] = scope;
            }
          });
          return obj;
        }
        return {};
      };

      setAccounts(accData);
      setLocations(locData);
      setHrAdmins(migrateToObj(hrData));
      setPerformanceAdmins(migrateToObj(perfData));
      setFinanceAdmins(migrateToObj(finData));
    } catch (error) {
      console.error('Error fetching admin settings:', error);
      Swal.fire('Error', 'Gagal memuat data pengaturan admin', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        settingsService.updateSetting('admin_hr_ids', hrAdmins, 'Daftar ID Pegawai dengan akses Admin Kepegawaian'),
        settingsService.updateSetting('admin_performance_ids', performanceAdmins, 'Daftar ID Pegawai dengan akses Admin Performa'),
        settingsService.updateSetting('admin_finance_ids', financeAdmins, 'Daftar ID Pegawai dengan akses Admin Finance')
      ]);
      
      Swal.fire({
        title: 'Berhasil',
        text: 'Pengaturan admin telah diperbarui',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error saving admin settings:', error);
      Swal.fire('Error', 'Gagal menyimpan pengaturan admin', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleAdmin = (accountId: string, role: 'hr' | 'performance' | 'finance') => {
    const setters = {
      hr: setHrAdmins,
      performance: setPerformanceAdmins,
      finance: setFinanceAdmins
    };
    
    setters[role](prev => {
      const next = { ...prev };
      if (next[accountId]) {
        delete next[accountId];
      } else {
        next[accountId] = { mode: 'all', location_ids: [] };
      }
      return next;
    });
  };

  const openScopeSettings = (accountId: string, role: 'hr' | 'performance' | 'finance', e: React.MouseEvent) => {
    e.stopPropagation();
    const currentAdmins = role === 'hr' ? hrAdmins : role === 'performance' ? performanceAdmins : financeAdmins;
    setScopeModal({
      isOpen: true,
      userId: accountId,
      role,
      scope: currentAdmins[accountId] || { mode: 'all', location_ids: [] }
    });
  };

  const saveScopeSettings = () => {
    const setters = {
      hr: setHrAdmins,
      performance: setPerformanceAdmins,
      finance: setFinanceAdmins
    };
    
    setters[scopeModal.role](prev => ({
      ...prev,
      [scopeModal.userId]: scopeModal.scope
    }));
    
    setScopeModal(prev => ({ ...prev, isOpen: false }));
  };

  const getSortedAccounts = (adminMap: Record<string, AdminScope>) => {
    const adminIds = Object.keys(adminMap);
    return accounts
      .filter(acc => acc.full_name !== 'Superadmin')
      .filter(acc => !acc.end_date || new Date(acc.end_date) > new Date()) // Hanya akun aktif
      .filter(acc => 
        acc.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.internal_nik.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        const aSelected = adminIds.includes(a.id);
        const bSelected = adminIds.includes(b.id);
        if (aSelected && !bSelected) return -1;
        if (!aSelected && bSelected) return 1;
        return 0;
      });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-[#006E62] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Memuat Pengaturan...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Pengaturan Admin</h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">KELOLA HAK AKSES ADMIN KHUSUS UNTUK PEGAWAI</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-[#006E62] text-white px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-[#005a50] transition-all shadow-lg shadow-[#006E62]/20 active:scale-95 disabled:opacity-50"
        >
          {saving ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save size={14} />}
          Simpan Pengaturan
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Admin Kepegawaian */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-50 bg-emerald-50/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                <UserCheck size={20} />
              </div>
              <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider">Admin Kepegawaian</h3>
            </div>
            <p className="text-[10px] text-gray-500 leading-relaxed">Akses untuk mengelola data karyawan, absensi, dan dokumen digital.</p>
          </div>
          <div className="p-4 border-b border-gray-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Cari Pegawai..."
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border-none rounded-lg text-xs focus:ring-2 focus:ring-emerald-500/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[400px] p-2 space-y-1 scrollbar-thin">
            {getSortedAccounts(hrAdmins).map(acc => (
              <button
                key={acc.id}
                onClick={() => toggleAdmin(acc.id, 'hr')}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                  hrAdmins[acc.id] ? 'bg-emerald-50 border-emerald-100' : 'hover:bg-gray-50 border-transparent'
                } border group`}
              >
                <div className="flex items-center gap-3 text-left">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    hrAdmins[acc.id] ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {acc.full_name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-700">{acc.full_name}</p>
                    <p className="text-[10px] text-gray-400">{acc.internal_nik}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {hrAdmins[acc.id] && (
                    <button
                      onClick={(e) => openScopeSettings(acc.id, 'hr', e)}
                      className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                      title="Pengaturan Cakupan Lokasi"
                    >
                      <Settings size={14} />
                    </button>
                  )}
                  {hrAdmins[acc.id] && <Check size={16} className="text-emerald-600" />}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Admin Performa */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-50 bg-orange-50/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                <Target size={20} />
              </div>
              <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider">Admin Performa</h3>
            </div>
            <p className="text-[10px] text-gray-500 leading-relaxed">Akses untuk mengelola KPI, Key Activities, dan Laporan Sales.</p>
          </div>
          <div className="p-4 border-b border-gray-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Cari Pegawai..."
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border-none rounded-lg text-xs focus:ring-2 focus:ring-orange-500/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[400px] p-2 space-y-1 scrollbar-thin">
            {getSortedAccounts(performanceAdmins).map(acc => (
              <button
                key={acc.id}
                onClick={() => toggleAdmin(acc.id, 'performance')}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                  performanceAdmins[acc.id] ? 'bg-orange-50 border-orange-100' : 'hover:bg-gray-50 border-transparent'
                } border group`}
              >
                <div className="flex items-center gap-3 text-left">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    performanceAdmins[acc.id] ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {acc.full_name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-700">{acc.full_name}</p>
                    <p className="text-[10px] text-gray-400">{acc.internal_nik}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {performanceAdmins[acc.id] && (
                    <button
                      onClick={(e) => openScopeSettings(acc.id, 'performance', e)}
                      className="p-1.5 text-orange-600 hover:bg-orange-100 rounded-lg transition-colors"
                      title="Pengaturan Cakupan Lokasi"
                    >
                      <Settings size={14} />
                    </button>
                  )}
                  {performanceAdmins[acc.id] && <Check size={16} className="text-orange-600" />}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Admin Finance */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-50 bg-indigo-50/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                <Wallet size={20} />
              </div>
              <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider">Admin Finansial</h3>
            </div>
            <p className="text-[10px] text-gray-500 leading-relaxed">Akses untuk mengelola Payroll, Reimburse, dan Skema Gaji.</p>
          </div>
          <div className="p-4 border-b border-gray-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Cari Pegawai..."
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border-none rounded-lg text-xs focus:ring-2 focus:ring-indigo-500/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[400px] p-2 space-y-1 scrollbar-thin">
            {getSortedAccounts(financeAdmins).map(acc => (
              <button
                key={acc.id}
                onClick={() => toggleAdmin(acc.id, 'finance')}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                  financeAdmins[acc.id] ? 'bg-indigo-50 border-indigo-100' : 'hover:bg-gray-50 border-transparent'
                } border group`}
              >
                <div className="flex items-center gap-3 text-left">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    financeAdmins[acc.id] ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {acc.full_name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-700">{acc.full_name}</p>
                    <p className="text-[10px] text-gray-400">{acc.internal_nik}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {financeAdmins[acc.id] && (
                    <button
                      onClick={(e) => openScopeSettings(acc.id, 'finance', e)}
                      className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                      title="Pengaturan Cakupan Lokasi"
                    >
                      <Settings size={14} />
                    </button>
                  )}
                  {financeAdmins[acc.id] && <Check size={16} className="text-indigo-600" />}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scope Settings Modal */}
      {scopeModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <Settings size={18} className="text-[#006E62]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800">Cakupan Lokasi Admin</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    {accounts.find(a => a.id === scopeModal.userId)?.full_name}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setScopeModal(prev => ({ ...prev, isOpen: false }))}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pilih Mode Akses</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setScopeModal(prev => ({ ...prev, scope: { ...prev.scope, mode: 'all' } }))}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      scopeModal.scope.mode === 'all' 
                        ? 'border-[#006E62] bg-emerald-50 text-[#006E62]' 
                        : 'border-gray-100 hover:border-gray-200 text-gray-400'
                    }`}
                  >
                    <Globe size={20} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Semua Lokasi</span>
                  </button>
                  <button
                    onClick={() => setScopeModal(prev => ({ ...prev, scope: { ...prev.scope, mode: 'limited' } }))}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      scopeModal.scope.mode === 'limited' 
                        ? 'border-[#006E62] bg-emerald-50 text-[#006E62]' 
                        : 'border-gray-100 hover:border-gray-200 text-gray-400'
                    }`}
                  >
                    <MapPin size={20} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Lokasi Tertentu</span>
                  </button>
                </div>
              </div>

              {scopeModal.scope.mode === 'limited' && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pilih Lokasi yang Diizinkan</label>
                  <div className="max-h-[200px] overflow-y-auto border border-gray-100 rounded-xl p-2 space-y-1 scrollbar-thin">
                    {locations.map(loc => (
                      <button
                        key={loc.id}
                        onClick={() => {
                          const current = scopeModal.scope.location_ids;
                          const next = current.includes(loc.id)
                            ? current.filter(id => id !== loc.id)
                            : [...current, loc.id];
                          setScopeModal(prev => ({ ...prev, scope: { ...prev.scope, location_ids: next } }));
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-all ${
                          scopeModal.scope.location_ids.includes(loc.id)
                            ? 'bg-emerald-50 text-[#006E62]'
                            : 'hover:bg-gray-50 text-gray-600'
                        }`}
                      >
                        <span className="text-xs font-medium">{loc.name}</span>
                        {scopeModal.scope.location_ids.includes(loc.id) && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                  {scopeModal.scope.location_ids.length === 0 && (
                    <p className="text-[10px] text-red-400 italic">Pilih minimal satu lokasi untuk mode terbatas.</p>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100">
              <button
                onClick={saveScopeSettings}
                disabled={scopeModal.scope.mode === 'limited' && scopeModal.scope.location_ids.length === 0}
                className="w-full bg-[#006E62] text-white py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-[#005a50] transition-all shadow-lg shadow-[#006E62]/20 active:scale-95 disabled:opacity-50"
              >
                Terapkan Konfigurasi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettingsModule;
