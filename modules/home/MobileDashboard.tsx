
import React, { useState, useEffect } from 'react';
import { 
  Fingerprint, Clock, Calendar, ClipboardList, BarChart3, 
  CheckSquare, FileText, Users, Wallet, CreditCard, 
  MessageSquare, AlertTriangle, ShieldCheck, ChevronRight, 
  ArrowLeft, User, MapPin, ExternalLink, Info, Plus, Building,
  Plane, Heart, FileCheck, History, LogIn, LogOut, Target, Video, Files, Database, Star, Trophy, Bell,
  Timer, Coffee, CalendarOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { authService } from '../../services/authService';
import { accountService } from '../../services/accountService';
import { scheduleService } from '../../services/scheduleService';
import { presenceService } from '../../services/presenceService';
import { overtimeService } from '../../services/overtimeService';
import { awardService } from '../../services/awardService';
import { googleDriveService } from '../../services/googleDriveService';
import { announcementService } from '../../services/announcementService';
import { Client_Name } from '../../assets';
import { AuthUser, Account, Schedule, Attendance, Overtime, EmployeeOfThePeriod, Announcement } from '../../types';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import Swal from 'sweetalert2';

interface MobileDashboardProps {
  user: AuthUser;
  setActiveTab: (tab: string) => void;
}

type ViewMode = 'main' | 'presence_sub' | 'overtime_sub' | 'presence_history' | 'overtime_history' | 'admin';

const MobileDashboard: React.FC<MobileDashboardProps> = ({ user, setActiveTab }) => {
  const [account, setAccount] = useState<Account | null>(null);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<Attendance[]>([]);
  const [overtimeHistory, setOvertimeHistory] = useState<Overtime[]>([]);
  const [bestEmployee, setBestEmployee] = useState<EmployeeOfThePeriod | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('main');
  const [elapsedTime, setElapsedTime] = useState<string>('');

  const unreadCount = announcements.filter(a => !a.is_read).length;
  const latestAnnouncement = announcements[0];

  const getPhotoUrl = (photoId: string | null) => {
    if (!photoId) return null;
    if (photoId.startsWith('http')) return photoId;
    return googleDriveService.getFileUrl(photoId);
  };

  const isAdmin = user?.role === 'admin' || user?.is_hr_admin || user?.is_performance_admin || user?.is_finance_admin;

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        if (user?.id) {
          const [acc, attendance, history, otHistory, awards] = await Promise.all([
            accountService.getById(user.id),
            presenceService.getTodayAttendance(user.id),
            presenceService.getRecentHistory(user.id, 10),
            overtimeService.getRecentHistory(user.id, 10),
            awardService.getEmployeeOfThePeriodAll()
          ]);

          setAccount(acc);
          setTodayAttendance(attendance);
          setAttendanceHistory(history);
          setOvertimeHistory(otHistory);
          if (awards && awards.length > 0) {
            setBestEmployee(awards[0]);
          }

          if (acc) {
            const anns = await announcementService.getAnnouncements(acc);
            setAnnouncements(anns);
          }

          if (acc?.schedule_id) {
            const sched = await scheduleService.getById(acc.schedule_id);
            setSchedule(sched);
          }
        }
      } catch (error) {
        console.error('Error loading mobile dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user.id]);

  // Timer logic for active attendance
  useEffect(() => {
    const activeSession = todayAttendance && !todayAttendance.check_out 
      ? todayAttendance.check_in 
      : overtimeHistory.find(ot => !ot.check_out)?.check_in;

    if (!activeSession) {
      setElapsedTime('');
      return;
    }

    const updateTimer = () => {
      const start = new Date(activeSession).getTime();
      const now = new Date().getTime();
      const diff = now - start;

      if (diff < 0) {
        setElapsedTime('00:00:00');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setElapsedTime(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [todayAttendance, overtimeHistory]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 11) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 19) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '--:--';
    return new Date(dateStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const menuItems = [
    { id: 'presence', label: 'Presensi Reguler', icon: Fingerprint, color: 'bg-emerald-500', onClick: () => setActiveTab('presence') },
    { id: 'overtime', label: 'Presensi Lembur', icon: Timer, color: 'bg-orange-500', onClick: () => setViewMode('overtime_sub') },
    { 
      id: 'leave', 
      label: 'Libur Mandiri', 
      icon: Coffee, 
      color: 'bg-emerald-500', 
      onClick: () => setActiveTab('leave'),
      isFrozen: account?.schedule_type === 'Hari Kerja'
    },
    { id: 'permission', label: 'Izin', icon: CalendarOff, color: 'bg-blue-500', onClick: () => setActiveTab('permission') },
    { id: 'annual_leave', label: 'Cuti', icon: Plane, color: 'bg-indigo-500', onClick: () => setActiveTab('annual_leave') },
    { 
      id: 'maternity_leave', 
      label: 'Cuti Melahirkan', 
      icon: Heart, 
      color: 'bg-rose-500', 
      onClick: () => setActiveTab('maternity_leave'),
      isFrozen: !account?.gender || account?.gender !== 'Perempuan'
    },
    { id: 'kpi', label: 'KPI', icon: Target, color: 'bg-indigo-500', onClick: () => setActiveTab('kpi') },
    { id: 'key_activity', label: 'Key Activities', icon: CheckSquare, color: 'bg-rose-500', onClick: () => setActiveTab('key_activity') },
    { id: 'sales_report', label: 'Sales Report', icon: MapPin, color: 'bg-amber-500', onClick: () => setActiveTab('sales_report') },
    { id: 'rapat', label: 'Rapat', icon: Video, color: 'bg-cyan-500', onClick: () => setActiveTab('rapat') },
    { id: 'my_payslip', label: 'Slip Gaji', icon: Wallet, color: 'bg-emerald-600', onClick: () => setActiveTab('my_payslip') },
    { id: 'early_salary', label: 'Ambil gaji awal', icon: CreditCard, color: 'bg-purple-500', onClick: () => setActiveTab('early_salary') },
    { id: 'reimbursement', label: 'Reimburse', icon: FileCheck, color: 'bg-pink-500', onClick: () => setActiveTab('reimbursement') },
    { id: 'feedback', label: 'Feedback', icon: MessageSquare, color: 'bg-blue-600', onClick: () => setActiveTab('feedback') },
    { id: 'lapor', label: 'Lapor', icon: AlertTriangle, color: 'bg-red-500', onClick: () => setActiveTab('lapor') },
    { id: 'document', label: 'Dokumen', icon: Files, color: 'bg-slate-600', onClick: () => setActiveTab('document') },
    ...(isAdmin ? [{ id: 'admin', label: 'Menu Admin', icon: Database, color: 'bg-gray-800', onClick: () => setViewMode('admin'), isFrozen: false }] : [])
  ];

  const adminMenuItems = [
    { id: 'accounts', label: 'Karyawan', icon: Users, color: 'bg-blue-600', onClick: () => setActiveTab('accounts') },
    { id: 'schedules', label: 'Jadwal', icon: Calendar, color: 'bg-emerald-600', onClick: () => setActiveTab('schedules') },
    { id: 'presence_admin', label: 'Presensi', icon: Fingerprint, color: 'bg-orange-600', onClick: () => setActiveTab('presence') },
    { id: 'overtime_admin', label: 'Lembur', icon: Timer, color: 'bg-amber-600', onClick: () => setActiveTab('overtime') },
    { id: 'leave_admin', label: 'Libur', icon: Plane, color: 'bg-indigo-600', onClick: () => setActiveTab('leave') },
    { id: 'permission_admin', label: 'Izin', icon: FileText, color: 'bg-rose-600', onClick: () => setActiveTab('permission') },
    { id: 'payroll_admin', label: 'Payroll', icon: Wallet, color: 'bg-emerald-700', onClick: () => setActiveTab('payroll') },
    { id: 'kpi_admin', label: 'KPI', icon: Target, color: 'bg-indigo-700', onClick: () => setActiveTab('kpi') }
  ];

  if (isLoading) return <LoadingSpinner />;

  const renderMainGrid = () => (
    <div className="grid grid-cols-3 gap-4 p-4">
      {menuItems.map((item: any) => (
        <button
          key={item.id}
          onClick={() => !item.isFrozen && item.onClick()}
          disabled={item.isFrozen}
          className={`flex flex-col items-center gap-2 group active:scale-95 transition-all ${item.isFrozen ? 'opacity-40 grayscale pointer-events-none' : ''}`}
        >
          <div className={`w-14 h-14 ${item.color} rounded-2xl flex items-center justify-center text-white shadow-lg shadow-${item.color.split('-')[1]}-500/20 group-hover:scale-110 transition-transform`}>
            <item.icon size={28} />
          </div>
          <span className="text-[10px] font-bold text-gray-600 text-center leading-tight uppercase tracking-tighter">
            {item.label}
          </span>
        </button>
      ))}
    </div>
  );

  const renderPresenceSub = () => (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <button onClick={() => setViewMode('main')} className="p-2 bg-gray-100 rounded-full text-gray-600">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-lg font-bold text-gray-800">Presensi Reguler</h2>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <button
          onClick={() => setActiveTab('presence')}
          className="flex flex-col items-center gap-2 group active:scale-95 transition-transform"
        >
          <div className={`w-14 h-14 ${todayAttendance && !todayAttendance.check_out ? 'bg-orange-500' : 'bg-emerald-500'} rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform`}>
            {todayAttendance && !todayAttendance.check_out ? <LogOut size={28} /> : <LogIn size={28} />}
          </div>
          <span className="text-[10px] font-bold text-gray-600 text-center leading-tight uppercase tracking-tighter">
            {todayAttendance && !todayAttendance.check_out ? 'Presensi Pulang' : 'Presensi Masuk'}
          </span>
        </button>
        <button
          onClick={() => setViewMode('presence_history')}
          className="flex flex-col items-center gap-2 group active:scale-95 transition-transform"
        >
          <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform">
            <History size={28} />
          </div>
          <span className="text-[10px] font-bold text-gray-600 text-center leading-tight uppercase tracking-tighter">
            Riwayat Presensi
          </span>
        </button>
        <button
          onClick={() => setActiveTab('dispensation')}
          className="flex flex-col items-center gap-2 group active:scale-95 transition-transform"
        >
          <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform">
            <ClipboardList size={28} />
          </div>
          <span className="text-[10px] font-bold text-gray-600 text-center leading-tight uppercase tracking-tighter">
            Dispensasi Presensi
          </span>
        </button>
      </div>
    </div>
  );

  const renderOvertimeSub = () => (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <button onClick={() => setViewMode('main')} className="p-2 bg-gray-100 rounded-full text-gray-600">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-lg font-bold text-gray-800">Presensi Lembur</h2>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <button
          onClick={() => setActiveTab('overtime')}
          className="flex flex-col items-center gap-2 group active:scale-95 transition-transform"
        >
          <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform">
            <Timer size={28} />
          </div>
          <span className="text-[10px] font-bold text-gray-600 text-center leading-tight uppercase tracking-tighter">
            Presensi In/Out
          </span>
        </button>
        <button
          onClick={() => setViewMode('overtime_history')}
          className="flex flex-col items-center gap-2 group active:scale-95 transition-transform"
        >
          <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform">
            <History size={28} />
          </div>
          <span className="text-[10px] font-bold text-gray-600 text-center leading-tight uppercase tracking-tighter">
            Riwayat Lembur
          </span>
        </button>
      </div>
    </div>
  );

  const renderPresenceHistory = () => (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex items-center gap-4 mb-2">
        <button onClick={() => setViewMode('presence_sub')} className="p-2 bg-gray-100 rounded-full text-gray-600">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-lg font-bold text-gray-800">Riwayat Presensi</h2>
      </div>
      {attendanceHistory.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Calendar size={48} strokeWidth={1} />
          <p className="text-sm font-bold uppercase mt-4">Belum Ada Riwayat</p>
        </div>
      ) : (
        attendanceHistory.map((log) => {
          const isProblematic = log.status_in !== 'Tepat Waktu' || (log.check_out && log.status_out !== 'Tepat Waktu');
          return (
            <div key={log.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm border-l-4 border-l-[#006E62]">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <Calendar size={12} className="text-gray-400" />
                  <span className="text-xs font-bold text-gray-700">{formatDate(log.created_at!)}</span>
                </div>
                {isProblematic && (
                  <button 
                    onClick={() => setActiveTab('dispensation')}
                    className="flex items-center gap-1 px-2 py-1 bg-rose-50 text-rose-600 rounded-lg text-[9px] font-bold uppercase tracking-wider"
                  >
                    <AlertTriangle size={10} /> Dispensasi
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2 bg-emerald-50/50 rounded-xl border border-emerald-100">
                  <p className="text-[8px] font-bold text-emerald-600 uppercase mb-1">Masuk</p>
                  <p className="text-sm font-sans font-bold text-gray-800">{formatTime(log.check_in)}</p>
                  <p className="text-[9px] font-bold text-[#006E62] uppercase">{log.status_in}</p>
                </div>
                <div className="p-2 bg-blue-50/50 rounded-xl border border-blue-100">
                  <p className="text-[8px] font-bold text-blue-600 uppercase mb-1">Pulang</p>
                  <p className="text-sm font-sans font-bold text-gray-800">{formatTime(log.check_out)}</p>
                  <p className={`text-[9px] font-bold uppercase ${log.status_out === 'Pulang Cepat' ? 'text-rose-500' : 'text-blue-500'}`}>
                    {log.status_out || '-'}
                  </p>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  const renderOvertimeHistory = () => (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex items-center gap-4 mb-2">
        <button onClick={() => setViewMode('overtime_sub')} className="p-2 bg-gray-100 rounded-full text-gray-600">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-lg font-bold text-gray-800">Riwayat Lembur</h2>
      </div>
      
      <div className="space-y-6">
        <div>
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Menunggu Verifikasi</h3>
          <div className="space-y-3">
            {overtimeHistory.filter(ot => !ot.is_verified).length === 0 ? (
              <p className="text-xs text-gray-400 italic text-center py-4">Tidak ada data</p>
            ) : (
              overtimeHistory.filter(ot => !ot.is_verified).map(ot => (
                <div key={ot.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm border-l-4 border-l-orange-500">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-gray-700">{formatDate(ot.created_at!)}</span>
                    <span className="px-2 py-0.5 bg-orange-50 text-orange-600 rounded text-[9px] font-bold uppercase">Pending</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <p className="text-[8px] font-bold text-gray-400 uppercase">Mulai</p>
                      <p className="text-xs font-sans font-bold">{formatTime(ot.check_in)}</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-[8px] font-bold text-gray-400 uppercase">Selesai</p>
                      <p className="text-xs font-sans font-bold">{formatTime(ot.check_out)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Selesai / Terverifikasi</h3>
          <div className="space-y-3">
            {overtimeHistory.filter(ot => ot.is_verified).length === 0 ? (
              <p className="text-xs text-gray-400 italic text-center py-4">Tidak ada data</p>
            ) : (
              overtimeHistory.filter(ot => ot.is_verified).map(ot => (
                <div key={ot.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm border-l-4 border-l-emerald-500">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-gray-700">{formatDate(ot.created_at!)}</span>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[9px] font-bold uppercase">Verified</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <p className="text-[8px] font-bold text-gray-400 uppercase">Mulai</p>
                      <p className="text-xs font-sans font-bold">{formatTime(ot.check_in)}</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-[8px] font-bold text-gray-400 uppercase">Selesai</p>
                      <p className="text-xs font-sans font-bold">{formatTime(ot.check_out)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderAdminMenu = () => (
    <div className="p-4 space-y-6 pb-24">
      <div className="flex items-center gap-4 mb-2">
        <button onClick={() => setViewMode('main')} className="p-2 bg-gray-100 rounded-full text-gray-600">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-lg font-bold text-gray-800">Menu Admin</h2>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {adminMenuItems.map((item) => (
          <button
            key={item.id}
            onClick={item.onClick}
            className="flex flex-col items-center gap-2 group active:scale-95 transition-transform"
          >
            <div className={`w-14 h-14 ${item.color} rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform`}>
              <item.icon size={28} />
            </div>
            <span className="text-[10px] font-bold text-gray-600 text-center leading-tight uppercase tracking-tighter">
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );

  const activeSessionType = (todayAttendance && !todayAttendance.check_out) 
    ? 'REGULER' 
    : (overtimeHistory.find(ot => !ot.check_out) ? 'LEMBUR' : null);

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Top Banner & Duration Capsule Wrapper */}
      <div className="relative mx-4 mt-4 mb-10">
        <div className="bg-gradient-to-br from-[#006E62] to-[#005a50] backdrop-blur-xl text-white px-6 py-8 rounded-[40px] shadow-2xl relative overflow-hidden border border-white/20">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full -ml-12 -mb-12 blur-xl"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
          
          {/* Shimmer Effect */}
          <div className="absolute inset-0 z-0 opacity-30">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer"></div>
          </div>
          
          <div className="relative z-10 flex flex-col gap-6">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-white whitespace-normal">
                {Client_Name}
              </p>
            </div>
            
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">{getGreeting().toUpperCase()}!</p>
                <h1 className="text-2xl font-black tracking-tight leading-tight text-[#F5C31D] whitespace-normal">{account?.full_name}</h1>
                <p className="text-[11px] font-bold text-white mt-1">
                  {account?.position || 'Staff'} • {account?.grade || account?.department || 'Operasional'}
                </p>
                
                <div className="flex items-center gap-1.5 mt-3 bg-white/10 w-fit px-3 py-1.5 rounded-full backdrop-blur-md">
                  <Building size={12} className="text-white" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white">{account?.location?.name || 'Lokasi Belum Diatur'}</span>
                </div>
              </div>

              <div className="flex-shrink-0 flex flex-col items-center gap-2">
                <div className="w-24 h-24 rounded-full p-0.5 bg-white/10 backdrop-blur-md shadow-2xl overflow-hidden">
                  {account?.photo_google_id ? (
                    <img 
                      src={getPhotoUrl(account.photo_google_id) || ''} 
                      className="w-full h-full object-cover rounded-full" 
                      alt="Profile" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full bg-emerald-700 rounded-full flex items-center justify-center font-black text-2xl">
                      {account?.full_name?.charAt(0)}
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-bold text-white/80 tracking-widest">{account?.internal_nik || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Intersection Duration Capsule */}
        {elapsedTime && activeSessionType && (
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-20 w-full max-w-[200px]">
            <div className={`flex flex-col items-center px-6 py-2 rounded-full shadow-xl border border-white/20 animate-in fade-in zoom-in duration-500 ${
              activeSessionType === 'LEMBUR' ? 'bg-amber-500 shadow-amber-900/40' : 'bg-rose-600 shadow-red-900/40'
            }`}>
              <span className="text-lg font-black font-sans text-white tracking-widest leading-none">{elapsedTime}</span>
              <span className="text-[8px] font-black text-white mt-1 tracking-[0.2em] uppercase opacity-90">
                {activeSessionType === 'LEMBUR' ? 'DURASI LEMBUR' : 'DURASI KERJA'}
              </span>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={viewMode}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {viewMode === 'main' && (
            <>
              {/* Announcement Card */}
              {announcements.length > 0 && (
                <div className="mx-4 mt-8 mb-6 relative">
                  <div className="bg-white rounded-[32px] p-5 shadow-sm border border-gray-100 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                          <Bell size={16} className="text-emerald-600" />
                        </div>
                        <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">Pengumuman</span>
                      </div>
                      <button 
                        className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1"
                      >
                        View All <ChevronRight size={12} />
                      </button>
                    </div>
                    
                    {latestAnnouncement && (
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-gray-900 line-clamp-1">{latestAnnouncement.title}</h3>
                        <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                          {latestAnnouncement.content.replace(/<[^>]*>/g, '')}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {unreadCount > 0 && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center border-2 border-white shadow-lg z-10">
                      <span className="text-[10px] font-bold text-white">{unreadCount}</span>
                    </div>
                  )}
                </div>
              )}

              {renderMainGrid()}
              
              {/* Best Employee Section */}
              {bestEmployee && (
                <div className="px-4 mt-6 space-y-4">
                  <div className="text-center mb-2">
                    <h3 className="text-[11px] font-black text-[#006E62] uppercase tracking-[0.2em]">
                      BEST EMPLOYEE | {new Date(0, bestEmployee.month - 1).toLocaleString('id-ID', { month: 'long' })} {bestEmployee.year}
                    </h3>
                  </div>
                  
                  {bestEmployee.accounts?.map((acc) => (
                    <div key={acc.id} className="bg-white rounded-3xl border border-gray-100 p-5 flex items-center gap-5 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50/50 rounded-full -mr-12 -mt-12 blur-2xl"></div>
                      
                      <div className="relative">
                        <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-emerald-100 shadow-inner">
                          {acc.photo_google_id ? (
                            <img 
                              src={getPhotoUrl(acc.photo_google_id) || ''} 
                              alt="" 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-50 flex items-center justify-center text-gray-300">
                              <User size={32} />
                            </div>
                          )}
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#006E62] rounded-xl flex items-center justify-center text-white shadow-lg border-2 border-white">
                          <Trophy size={16} />
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0 relative z-10">
                        <h4 className="font-black text-gray-800 text-base tracking-tight truncate">{acc.full_name}</h4>
                        <p className="text-[11px] font-bold text-[#006E62] uppercase tracking-wider truncate mb-2">{acc.position}</p>
                        <div className="flex items-start gap-1.5 bg-emerald-50/50 p-2 rounded-xl border border-emerald-100/50">
                          <Star size={12} className="text-amber-400 fill-amber-400 shrink-0 mt-0.5" />
                          <p className="text-[10px] text-gray-600 font-medium italic leading-relaxed">
                            "{bestEmployee.reason || 'Karyawan Teladan'}"
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {viewMode === 'presence_sub' && renderPresenceSub()}
          {viewMode === 'overtime_sub' && renderOvertimeSub()}
          {viewMode === 'presence_history' && renderPresenceHistory()}
          {viewMode === 'overtime_history' && renderOvertimeHistory()}
          {viewMode === 'admin' && renderAdminMenu()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default MobileDashboard;

