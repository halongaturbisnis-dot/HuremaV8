import React, { useState, useEffect } from 'react';
import { Settings, Save, ShieldCheck, Timer, Info, Loader2, Database, AlertCircle } from 'lucide-react';
import Swal from 'sweetalert2';
import { settingsService } from '../../services/settingsService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

const MasterMain: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, any>>({
    ot_approval_policy: 'manual',
    leave_approval_policy: 'manual'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const data = await settingsService.getAll();
      
      const mapped = data.reduce((acc: any, curr) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {});
      
      setSettings(prev => ({ ...prev, ...mapped }));
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (key: string, value: any) => {
    try {
      setIsSaving(true);
      await settingsService.updateSetting(key, value);
      setSettings(prev => ({ ...prev, [key]: value }));
      
      Swal.fire({
        title: 'Berhasil!',
        text: 'Konfigurasi aplikasi telah diperbarui.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    } catch (error) {
      Swal.fire('Gagal', 'Terjadi kesalahan saat menyimpan pengaturan.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
      <Loader2 className="animate-spin mb-4" size={32} />
      <p className="text-xs font-bold uppercase tracking-widest">Memuat Konfigurasi Master...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex items-center gap-4">
        <div className="w-12 h-12 bg-[#006E62]/10 rounded-xl flex items-center justify-center text-[#006E62]">
          <Settings size={28} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800 tracking-tight">Master Aplikasi</h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Pusat Kontrol Kebijakan</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kebijakan Dispensasi */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/30 flex items-center gap-3">
            <Timer size={18} className="text-blue-500" />
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Kebijakan Dispensasi Presensi</h3>
          </div>
          
          <div className="p-6 space-y-6 flex-1 flex flex-col">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-gray-800">Batas Hari Pengajuan (X Hari)</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                Tentukan berapa hari kebelakang pegawai diperbolehkan mengajukan dispensasi untuk data presensi yang bermasalah.
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <input 
                type="number"
                min="1"
                max="31"
                value={settings.dispensation_window_days || 7}
                onChange={(e) => setSettings(prev => ({ ...prev, dispensation_window_days: parseInt(e.target.value) }))}
                className="w-20 px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold text-center focus:ring-2 focus:ring-[#006E62] focus:border-transparent outline-none"
              />
              <button 
                onClick={() => handleUpdate('dispensation_window_days', settings.dispensation_window_days || 7)}
                className="bg-[#006E62] text-white p-2.5 rounded-xl shadow-md hover:bg-[#005c52] transition-all"
              >
                <Save size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Kebijakan Lembur */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/30 flex items-center gap-3">
            <Timer size={18} className="text-amber-500" />
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Workflow Presensi Lembur</h3>
          </div>
          
          <div className="p-6 space-y-6 flex-1 flex flex-col">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-gray-800">Kebijakan Persetujuan Lembur</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                Tentukan bagaimana sistem menangani data presensi lembur yang masuk setelah karyawan melakukan Check-Out Lembur.
              </p>
            </div>
            
            <div className="flex bg-gray-100 p-1 rounded-xl w-full">
              <button 
                onClick={() => handleUpdate('ot_approval_policy', 'manual')}
                className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${settings.ot_approval_policy === 'manual' ? 'bg-rose-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
              >
                MANUAL
              </button>
              <button 
                onClick={() => handleUpdate('ot_approval_policy', 'auto')}
                className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${settings.ot_approval_policy === 'auto' ? 'bg-[#006E62] text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
              >
                OTOMATIS
              </button>
            </div>

            <div className={`p-4 rounded-xl border transition-all ${settings.ot_approval_policy === 'manual' ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
              <p className="text-[10px] font-bold leading-relaxed italic text-center">
                {settings.ot_approval_policy === 'manual' 
                  ? 'Pengajuan Lembur akan diproses verifikasi secara manual oleh Admin' 
                  : 'Pengajuan Lembur akan otomatis disetujui tanpa perlu verifikasi Admin'}
              </p>
            </div>
          </div>
        </div>

        {/* Kebijakan Libur Mandiri */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/30 flex items-center gap-3">
            <Settings size={18} className="text-emerald-500" />
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Workflow Libur Mandiri</h3>
          </div>
          
          <div className="p-6 space-y-6 flex-1 flex flex-col">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-gray-800">Kebijakan Persetujuan Libur</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                Tentukan apakah pengajuan libur mandiri (untuk jadwal Fleksibel/Shift Dinamis/Shift Kerja) harus diverifikasi admin atau langsung disetujui sistem.
              </p>
            </div>
            
            <div className="flex bg-gray-100 p-1 rounded-xl w-full">
              <button 
                onClick={() => handleUpdate('leave_approval_policy', 'manual')}
                className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${settings.leave_approval_policy === 'manual' ? 'bg-rose-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
              >
                MANUAL
              </button>
              <button 
                onClick={() => handleUpdate('leave_approval_policy', 'auto')}
                className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${settings.leave_approval_policy === 'auto' ? 'bg-[#006E62] text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
              >
                OTOMATIS
              </button>
            </div>

            <div className={`p-4 rounded-xl border transition-all ${settings.leave_approval_policy === 'manual' ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
              <p className="text-[10px] font-bold leading-relaxed italic text-center">
                {settings.leave_approval_policy === 'manual' 
                  ? 'Pengajuan Libur akan diproses verifikasi secara manual oleh Admin' 
                  : 'Pengajuan Libur akan otomatis disetujui tanpa perlu verifikasi Admin'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MasterMain;