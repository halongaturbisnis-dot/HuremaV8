
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Fingerprint, 
  ClipboardList, 
  Calendar, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Filter,
  ArrowLeft
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { authService } from '../../services/authService';
import { accountService } from '../../services/accountService';
import { presenceService } from '../../services/presenceService';
import { googleDriveService } from '../../services/googleDriveService';
import { Attendance, Account } from '../../types';
import PresenceDetailMobile from './PresenceDetailMobile';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import MobileDateRangeFilter from '../../components/Common/MobileDateRangeFilter';
import { formatDateID } from '../../utils/dateFormatter';

interface PresenceDashboardProps {
  onVerify: () => void;
  setActiveTab?: (tab: string) => void;
}

const PresenceDashboard: React.FC<PresenceDashboardProps> = ({ onVerify, setActiveTab }) => {
  const getPhotoUrl = (photoId: string | null) => {
    if (!photoId) return null;
    if (photoId.startsWith('http')) return photoId;
    return googleDriveService.getFileUrl(photoId);
  };

  const [account, setAccount] = useState<Account | null>(null);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState<Attendance | null>(null);
  
  // Date Filter State
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const currentUser = authService.getCurrentUser();

  useEffect(() => {
    if (currentUser) {
      fetchInitialData();
    }
  }, []);

  useEffect(() => {
    if (account) {
      fetchHistory();
    }
  }, [dateRange, account]);

  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      const acc = await accountService.getById(currentUser!.id);
      setAccount(acc as any);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setIsFetchingData(true);
      const data = await presenceService.getAttendanceByRange(dateRange.start, dateRange.end, account!.id);
      setAttendances(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsFetchingData(false);
    }
  };

  const handleDateChange = (type: 'start' | 'end', value: string) => {
    const newRange = { ...dateRange, [type]: value };
    
    // Protection: Max 31 days
    const start = new Date(newRange.start);
    const end = new Date(newRange.end);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 31) {
      alert("Rentang waktu maksimal adalah 31 hari.");
      return;
    }

    if (start > end) {
      alert("Tanggal mulai tidak boleh lebih besar dari tanggal selesai.");
      return;
    }

    setDateRange(newRange);
  };

  // Chart Data Aggregation
  const chartData = useMemo(() => {
    const inData = [
      { name: 'Tepat Waktu', value: 0, color: '#10b981' },
      { name: 'Terlambat', value: 0, color: '#ef4444' }
    ];

    const outData = [
      { name: 'Tepat Waktu', value: 0, color: '#10b981' },
      { name: 'Pulang Awal', value: 0, color: '#f59e0b' },
      { name: 'Terlambat Pulang', value: 0, color: '#3b82f6' }
    ];

    attendances.forEach(a => {
      // In Stats
      if (a.status_in === 'Terlambat') inData[1].value++;
      else if (a.check_in) inData[0].value++;

      // Out Stats
      if (a.status_out === 'Pulang Cepat' || a.status_out === 'Pulang Awal') outData[1].value++;
      else if (a.status_out === 'Terlambat Pulang') outData[2].value++;
      else if (a.check_out) outData[0].value++;
    });

    return { inData, outData };
  }, [attendances]);

  const todayAttendance = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return attendances.find(a => (a.check_in || a.created_at)?.startsWith(today));
  }, [attendances]);

  const isCheckOut = !!(todayAttendance?.check_in && !todayAttendance?.check_out);

  if (isLoading) return <LoadingSpinner message="Menyiapkan Dashboard..." />;

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header with Back Button */}
      <div className="px-6 pt-8 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-30 pb-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setActiveTab ? setActiveTab('dashboard') : null}
            className="w-10 h-10 bg-gray-50 text-gray-400 rounded-xl flex items-center justify-center active:scale-90 transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-lg font-bold text-gray-800 tracking-tight">Presensi</h2>
          </div>
        </div>
      </div>
      

      {/* Action Buttons */}
      <div className="px-6 pt-4 grid grid-cols-2 gap-4 relative z-20">
        <button 
          onClick={onVerify}
          className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100 flex flex-col items-center gap-3 group active:scale-95 transition-all"
        >
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-colors ${isCheckOut ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
            <Fingerprint size={32} />
          </div>
          <span className="text-xs font-bold text-gray-700">Presensi {isCheckOut ? 'Keluar' : 'Masuk'}</span>
        </button>

        <button 
          onClick={() => setActiveTab ? setActiveTab('dispensation') : null}
          className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100 flex flex-col items-center gap-3 group active:scale-95 transition-all"
        >
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-lg">
            <ClipboardList size={32} />
          </div>
          <span className="text-xs font-bold text-gray-700">Dispensasi Presensi</span>
        </button>
      </div>

      {/* Filter Section */}
      <div className="px-6 mt-8">
        <MobileDateRangeFilter 
          startDate={dateRange.start}
          endDate={dateRange.end}
          onStartDateChange={(val) => handleDateChange('start', val)}
          onEndDateChange={(val) => handleDateChange('end', val)}
        />
      </div>

      {/* Statistics Section */}
      <div className="px-6 mt-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp size={16} className="text-[#006E62]" />
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Statistik Kehadiran</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {/* In Chart */}
            <div className="flex flex-col items-center">
              <div className="h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData.inData}
                      innerRadius={35}
                      outerRadius={50}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.inData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] font-bold text-gray-500 uppercase mt-2">Presensi Masuk</p>
            </div>

            {/* Out Chart */}
            <div className="flex flex-col items-center">
              <div className="h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData.outData}
                      innerRadius={35}
                      outerRadius={50}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.outData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] font-bold text-gray-500 uppercase mt-2">Presensi Keluar</p>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-6 grid grid-cols-2 gap-y-2 gap-x-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#10b981]"></div>
              <span className="text-[10px] font-bold text-gray-600">Tepat Waktu</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#ef4444]"></div>
              <span className="text-[10px] font-bold text-gray-600">Terlambat</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#f59e0b]"></div>
              <span className="text-[10px] font-bold text-gray-600">Pulang Awal</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#3b82f6]"></div>
              <span className="text-[10px] font-bold text-gray-600">Terlambat Pulang</span>
            </div>
          </div>
        </div>
      </div>

      {/* History List */}
      <div className="px-6 mt-6 space-y-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-[#006E62]" />
            <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">RIWAYAT PRESENSI</h3>
          </div>
          <span className="text-[10px] font-bold text-gray-400">{attendances.length} Data</span>
        </div>

        {isFetchingData ? (
          <div className="py-10 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Memperbarui Data...</p>
          </div>
        ) : attendances.length === 0 ? (
          <div className="bg-white p-10 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center text-center">
            <Calendar size={48} className="text-gray-100 mb-4" />
            <p className="text-sm font-bold text-gray-400">Tidak ada riwayat pada periode ini.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {[...attendances].sort((a, b) => {
              const dateA = a.check_in || a.created_at || '';
              const dateB = b.check_in || b.created_at || '';
              return dateB.localeCompare(dateA);
            }).map((log) => (
              <button 
                key={log.id}
                onClick={() => setSelectedAttendance(log)}
                className="w-full bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="text-left">
                    <p className="text-xs font-bold text-gray-800">
                      {formatDateID(log.check_in || log.created_at)}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                        {log.check_in ? log.check_in.slice(11, 16) : '--:--'}
                      </span>
                      <span className="text-gray-300">•</span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                        {log.check_out ? log.check_out.slice(11, 16) : '--:--'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right mr-2 space-y-0.5">
                    <p className={`text-[10px] font-black uppercase tracking-tighter ${
                      log.status_in === 'Terlambat' ? 'text-[#ef4444]' : 'text-[#10b981]'
                    }`}>
                      {log.status_in}
                    </p>
                    {log.status_out && (
                      <p className={`text-[10px] font-black uppercase tracking-tighter ${
                        (log.status_out === 'Pulang Cepat' || log.status_out === 'Pulang Awal') ? 'text-[#f59e0b]' : 
                        log.status_out === 'Terlambat Pulang' ? 'text-[#3b82f6]' :
                        'text-[#10b981]'
                      }`}>
                        {(log.status_out === 'Pulang Cepat' || log.status_out === 'Pulang Awal') ? 'PULANG AWAL' : log.status_out}
                      </p>
                    )}
                  </div>
                  <ChevronRight size={18} className="text-gray-300 group-hover:text-[#006E62] transition-colors" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedAttendance && account && (
        <PresenceDetailMobile 
          attendance={selectedAttendance}
          account={account}
          onClose={() => setSelectedAttendance(null)}
        />
      )}
    </div>
  );
};

export default PresenceDashboard;

const MapPin = ({ size, className }: { size: number, className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);
