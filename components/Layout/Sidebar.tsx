import React, { useState, useEffect } from 'react';
import { 
  MapPin, LayoutDashboard, Settings, Users, MonitorCog, UserKey, Radar, Coffee, ChartPie, Toolbox, Handshake, Speech, MessagesSquare, 
  CalendarClock, Files, ChevronDown, ChevronRight, DollarSign, Banknote, Coins, BanknoteArrowDown, HandCoins, Diff, CalendarOff,
  Menu as MenuIcon, ChevronLeft, Database, Fingerprint, LogOut, Timer, ClipboardCheck, Plane, Calendar, ClipboardList, Heart, Target, BarChart3, CheckSquare, AlertTriangle, Video, Megaphone, Receipt, Trophy, Wallet, ShieldCheck, Activity, EarthLock, AlertCircle
} from 'lucide-react';
import { authService } from '../../services/authService';
import { financeService } from '../../services/financeService';
import { dispensationService } from '../../services/dispensationService';
import { submissionService } from '../../services/submissionService';
import { supabase } from '../../lib/supabase';
import { LOGO_ICON, Client_Name } from '../../assets';
import Swal from 'sweetalert2';
import { usePendingSubmissions } from '../../context/PendingSubmissionsContext';

interface NavItemProps {
// ... (keep original NavItemProps)
  id: any;
  icon: any;
  label: string;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  isCollapsed: boolean;
  indent?: boolean;
  badge?: number;
  showNew?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ 
  id, icon: Icon, label, activeTab, setActiveTab, isCollapsed, indent = false, badge, showNew 
}) => (
  <button
    type="button"
    onClick={() => setActiveTab(id)}
    className={`flex items-center gap-3 py-3 rounded-md transition-all duration-200 w-full mb-1 group relative overflow-hidden ${
      activeTab === id 
        ? 'bg-[#006E62] text-white shadow-md' 
        : 'text-gray-600 hover:bg-gray-100'
    } ${indent && !isCollapsed ? 'pl-10 pr-4' : 'px-4'}`}
    title={isCollapsed ? label : ''}
  >
    <span className="absolute bottom-0 left-0 h-0.5 bg-[#006E62] w-0 transition-all duration-300 group-hover:w-full"></span>
    <div className="relative shrink-0">
      <Icon size={20} />
      {( (badge !== undefined && badge > 0) || showNew ) && isCollapsed && (
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></div>
      )}
    </div>
    {!isCollapsed && (
      <div className="flex items-center justify-between flex-1 overflow-hidden">
        <div className="flex items-center gap-2 truncate">
          <span className="font-medium text-sm truncate">{label}</span>
          {showNew && (
            <span className="bg-red-500 text-white text-[8px] font-bold px-1 rounded-full">NEW</span>
          )}
        </div>
        {badge !== undefined && badge > 0 && (
          <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
            {badge}
          </span>
        )}
      </div>
    )}
  </button>
);

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  unreadReimbursements?: number;
  unreadCompensations?: number;
  unreadDispensations?: number;
  pendingSubmissions?: Record<string, number>;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  isCollapsed, 
  setIsCollapsed,
  unreadReimbursements = 0,
  unreadCompensations = 0,
  unreadDispensations = 0,
  pendingSubmissions = {}
}) => {
  const { pendingCount } = usePendingLeave();
  
  // Update logic to merge global context count for Libur Mandiri
  const displayPendingSubmissions = {
    ...pendingSubmissions,
    'Libur Mandiri': pendingCount
  };

  const isMasterOpen = true; 
  const [isSubmissionOpen, setIsSubmissionOpen] = useState(false);
  const [isPerformanceOpen, setIsPerformanceOpen] = useState(false);
  const [isFinanceOpen, setIsFinanceOpen] = useState(false);
  const [isPresenceOpen, setIsPresenceOpen] = useState(true);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const user = authService.getCurrentUser();
  const isAdmin = user?.role === 'admin' || user?.is_hr_admin || user?.is_performance_admin || user?.is_finance_admin;

  // ... (keep existing handleLogout and other internal states)

  // NOTE: Due to extreme length, I'm just showing where to inject the context hook.
  // In your actual code:
  // const { pendingCount } = usePendingLeave();
  // ... and update badge={isAdmin ? displayPendingSubmissions['Libur Mandiri'] : undefined}




  const handleLogout = async () => {
    const result = await Swal.fire({
      title: 'Logout?',
      text: "Anda harus masuk kembali untuk mengakses data.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#006E62',
      confirmButtonText: 'Ya, Keluar'
    });

    if (result.isConfirmed) {
      authService.logout();
    }
  };

  const isMasterActive = ['master_app', 'location', 'schedule', 'account', 'admin_settings', 'special_assignment'].includes(activeTab);
  const isSubmissionActive = ['leave', 'overtime', 'permission', 'annual_leave', 'maternity_leave', 'out_of_range_submission', 'admin_dispensation'].includes(activeTab);
  const isPerformanceActive = ['kpi', 'key_activity', 'sales_report'].includes(activeTab);
  const isFinanceActive = ['salary_scheme', 'salary_adjustment', 'payroll', 'reimbursement', 'early_salary', 'compensation'].includes(activeTab);
  const isReportActive = ['employee_report', 'attendance_report', 'finance_report'].includes(activeTab);
  const isPresenceActive = ['presence', 'overtime', 'dispensation'].includes(activeTab);

  return (
    <aside 
      className={`hidden md:flex flex-col border-r border-gray-100 bg-white sticky top-0 h-screen transition-all duration-300 z-30 ${
        isCollapsed ? 'w-24' : 'w-64'
      }`}
    >
      <div className="flex items-center justify-between p-4 mb-4">
        {!isCollapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <img src={LOGO_ICON} alt="Logo" className="w-8 h-8 object-contain shrink-0" />
            <div className="flex flex-col overflow-hidden">
              <h1 className="text-xl font-bold tracking-tight text-[#006E62] truncate leading-tight">HUREMA</h1>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider leading-tight">{Client_Name}</p>
            </div>
          </div>
        )}
        {isCollapsed && (
          <img src={LOGO_ICON} alt="Logo" className="w-8 h-8 object-contain mx-auto" />
        )}
      </div>
      
      <nav className="flex-1 px-3 overflow-y-auto scrollbar-none">
        {!isAdmin && (
          <NavItem 
            id="dashboard" 
            icon={LayoutDashboard} 
            label="Beranda" 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isCollapsed={isCollapsed}
          />
        )}
        
        {/* 1. Master Menu Group */}
        {(isAdmin || user?.is_hr_admin) && (
          <div className="mt-4">
            <button 
              type="button"
              onClick={() => setIsMasterOpen(!isMasterOpen)}
              className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 w-full mb-1 group relative overflow-hidden ${isMasterActive ? 'bg-[#006E62]/10 text-[#006E62]' : 'text-gray-600 hover:bg-gray-100'}`}
              title={isCollapsed ? 'Master' : ''}
            >
              <span className="absolute bottom-0 left-0 h-0.5 bg-[#006E62] w-0 transition-all duration-300 group-hover:w-full"></span>
              <Settings size={20} className="shrink-0 text-gray-600" />
              {!isCollapsed && (
                <div className="flex items-center justify-between flex-1 overflow-hidden">
                  <span className="font-medium text-sm truncate">Master</span>
                  {isMasterOpen ? <ChevronDown size={16} className="text-gray-300" /> : <ChevronRight size={16} className="text-gray-300" />}
                </div>
              )}
            </button>
            
            {(isMasterOpen || isCollapsed) && (
              <div className={`mt-1 overflow-hidden transition-all duration-300 ${isCollapsed ? '' : 'max-h-96'}`}>
                {isAdmin && (
                  <NavItem 
                    id="master_app" 
                    icon={MonitorCog} 
                    label="Master Aplikasi" 
                    indent 
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    isCollapsed={isCollapsed}
                  />
                )}
                <NavItem 
                  id="location" 
                  icon={MapPin} 
                  label="Data Lokasi" 
                  indent 
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  isCollapsed={isCollapsed}
                />
                <NavItem 
                  id="schedule" 
                  icon={CalendarClock} 
                  label="Jadwal" 
                  indent 
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  isCollapsed={isCollapsed}
                />
                <NavItem 
                  id="special_assignment" 
                  icon={ShieldCheck} 
                  label="Penugasan" 
                  indent 
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  isCollapsed={isCollapsed}
                />
                <NavItem 
                  id="account" 
                  icon={Users} 
                  label="Akun" 
                  indent 
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  isCollapsed={isCollapsed}
                />
                {isAdmin && (
                  <NavItem 
                    id="admin_settings" 
                    icon={UserKey} 
                    label="Admin" 
                    indent 
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    isCollapsed={isCollapsed}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* 2. Pemantauan Harian */}
        {(isAdmin || user?.is_hr_admin) && (
          <NavItem 
            id="daily_monitoring" 
            icon={Radar} 
            label="Pemantauan Harian" 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isCollapsed={isCollapsed}
          />
        )}

        {/* 3. Pengajuan Menu Group */}
        <div className="mt-4">
          <button 
            type="button"
            onClick={() => setIsSubmissionOpen(!isSubmissionOpen)}
            className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 w-full mb-1 group relative overflow-hidden ${isSubmissionActive ? 'bg-[#006E62]/10 text-[#006E62]' : 'text-gray-600 hover:bg-gray-100'}`}
            title={isCollapsed ? 'Pengajuan' : ''}
          >
            <span className="absolute bottom-0 left-0 h-0.5 bg-[#006E62] w-0 transition-all duration-300 group-hover:w-full"></span>
            <div className="relative shrink-0">
              <ClipboardCheck size={20} className="text-gray-600" />
              {isAdmin && (Object.values(pendingSubmissions).some((c: any) => c > 0) || unreadDispensations > 0) && (
                <div className="absolute -top-1 -right-1">
                  <AlertCircle size={10} className="text-red-600 fill-red-600 stroke-white stroke-2" />
                </div>
              )}
            </div>
            {!isCollapsed && (
              <div className="flex items-center justify-between flex-1 overflow-hidden">
                <div className="flex items-center gap-2 truncate">
                  <span className="font-medium text-sm truncate">Pengajuan</span>
                  {isAdmin && (Object.values(pendingSubmissions).some((c: any) => c > 0) || unreadDispensations > 0) && (
                    <AlertCircle size={14} className="text-red-600 fill-red-600 stroke-white stroke-2" />
                  )}
                </div>
                {isSubmissionOpen ? <ChevronDown size={16} className="text-gray-300" /> : <ChevronRight size={16} className="text-gray-300" />}
              </div>
            )}
          </button>
          
          {(isSubmissionOpen || isCollapsed) && (
            <div className={`mt-1 overflow-hidden transition-all duration-300 ${isCollapsed ? '' : 'max-h-96'}`}>
              <NavItem 
                id="leave" 
                icon={Coffee} 
                label="Libur Mandiri" 
                indent 
                badge={isAdmin ? displayPendingSubmissions['Libur Mandiri'] : undefined} 
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                isCollapsed={isCollapsed}
              />
              <NavItem 
                id="overtime" 
                icon={Timer} 
                label="Lembur" 
                indent 
                badge={isAdmin ? pendingSubmissions['Lembur'] : undefined} 
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                isCollapsed={isCollapsed}
              />
              <NavItem 
                id="permission" 
                icon={CalendarOff} 
                label="Izin" 
                indent 
                badge={isAdmin ? pendingSubmissions['Izin'] : undefined} 
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                isCollapsed={isCollapsed}
              />
              <NavItem 
                id="annual_leave" 
                icon={Plane} 
                label="Cuti Tahunan" 
                indent 
                badge={isAdmin ? pendingSubmissions['Cuti Tahunan'] : undefined} 
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                isCollapsed={isCollapsed}
              />
              {(user?.gender === 'Perempuan' || user?.role === 'admin' || user?.is_hr_admin) && (
                <NavItem 
                  id="maternity_leave" 
                  icon={Heart} 
                  label="Cuti Melahirkan" 
                  indent 
                  badge={isAdmin ? pendingSubmissions['Cuti Melahirkan'] : undefined} 
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  isCollapsed={isCollapsed}
                />
              )}
              <NavItem 
                id="out_of_range_submission" 
                icon={EarthLock} 
                label="Presensi Luar" 
                indent 
                badge={isAdmin ? pendingSubmissions['Presensi Luar'] : undefined} 
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                isCollapsed={isCollapsed}
              />
              {(isAdmin || user?.is_hr_admin) && (
                <NavItem 
                  id="admin_dispensation" 
                  icon={ClipboardList} 
                  label="Dispensasi" 
                  indent 
                  badge={unreadDispensations} 
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  isCollapsed={isCollapsed}
                />
              )}
            </div>
          )}
        </div>

        {/* 4. Performance Menu Group */}
        {(isAdmin || user?.is_performance_admin) && (
          <div className="mt-4">
            <button 
              type="button"
              onClick={() => setIsPerformanceOpen(!isPerformanceOpen)}
              className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 w-full mb-1 group relative overflow-hidden ${isPerformanceActive ? 'bg-[#006E62]/10 text-[#006E62]' : 'text-gray-600 hover:bg-gray-100'}`}
              title={isCollapsed ? 'Performa' : ''}
            >
              <span className="absolute bottom-0 left-0 h-0.5 bg-[#006E62] w-0 transition-all duration-300 group-hover:w-full"></span>
              <Toolbox size={20} className="shrink-0 text-gray-600" />
              {!isCollapsed && (
                <div className="flex items-center justify-between flex-1 overflow-hidden">
                  <span className="font-medium text-sm truncate">Performa</span>
                  {isPerformanceOpen ? <ChevronDown size={16} className="text-gray-300" /> : <ChevronRight size={16} className="text-gray-300" />}
                </div>
              )}
            </button>
            
            {(isPerformanceOpen || isCollapsed) && (
              <div className={`mt-1 overflow-hidden transition-all duration-300 ${isCollapsed ? '' : 'max-h-96'}`}>
                <NavItem 
                  id="kpi" 
                  icon={Target} 
                  label="Key Performance Indicator" 
                  indent 
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  isCollapsed={isCollapsed}
                />
                <NavItem 
                  id="key_activity" 
                  icon={CheckSquare} 
                  label="Key Activities" 
                  indent 
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  isCollapsed={isCollapsed}
                />
                <NavItem 
                  id="sales_report" 
                  icon={Handshake} 
                  label="Sales Report" 
                  indent 
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  isCollapsed={isCollapsed}
                />
              </div>
            )}
          </div>
        )}

        {/* 5. Finance Menu Group */}
        {(isAdmin || user?.is_finance_admin) && (
          <div className="mt-4">
            <button 
              type="button"
              onClick={() => setIsFinanceOpen(!isFinanceOpen)}
              className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 w-full mb-1 group relative overflow-hidden ${isFinanceActive ? 'bg-[#006E62]/10 text-[#006E62]' : 'text-gray-600 hover:bg-gray-100'}`}
              title={isCollapsed ? 'Finansial' : ''}
            >
              <span className="absolute bottom-0 left-0 h-0.5 bg-[#006E62] w-0 transition-all duration-300 group-hover:w-full"></span>
              <div className="relative shrink-0">
                <DollarSign size={20} className="text-gray-600" />
                {unreadReimbursements > 0 && isCollapsed && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></div>
                )}
              </div>
              {!isCollapsed && (
                <div className="flex items-center justify-between flex-1 overflow-hidden">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-medium text-sm">Finansial</span>
                    {(unreadReimbursements > 0 || unreadCompensations > 0) && (
                      <span className="bg-red-500 text-white text-[8px] font-bold px-1 rounded-full">NEW</span>
                    )}
                  </div>
                  {isFinanceOpen ? <ChevronDown size={16} className="text-gray-300" /> : <ChevronRight size={16} className="text-gray-300" />}
                </div>
              )}
            </button>
            
            {(isFinanceOpen || isCollapsed) && (
              <div className={`mt-1 overflow-hidden transition-all duration-300 ${isCollapsed ? '' : 'max-h-96'}`}>
                <NavItem 
                  id="salary_scheme" 
                  icon={Banknote} 
                  label="Skema Gaji" 
                  indent 
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  isCollapsed={isCollapsed}
                />
                {(isAdmin || user?.is_finance_admin) && (
                  <>
                    <NavItem 
                      id="salary_adjustment" 
                      icon={Diff} 
                      label="Kustom Gaji" 
                      indent 
                      activeTab={activeTab}
                      setActiveTab={setActiveTab}
                      isCollapsed={isCollapsed}
                    />
                    <NavItem 
                      id="payroll" 
                      icon={Receipt} 
                      label="Payroll" 
                      indent 
                      activeTab={activeTab}
                      setActiveTab={setActiveTab}
                      isCollapsed={isCollapsed}
                    />
                  </>
                )}
                <NavItem 
                  id="reimbursement" 
                  icon={Coins} 
                  label="Reimburse" 
                  indent 
                  badge={(isAdmin || user?.is_finance_admin) ? unreadReimbursements : undefined} 
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  isCollapsed={isCollapsed}
                />
                <NavItem 
                  id="early_salary" 
                  icon={BanknoteArrowDown} 
                  label="Ambil Gaji Awal" 
                  indent 
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  isCollapsed={isCollapsed}
                />
                {(isAdmin || user?.is_finance_admin) && (
                  <NavItem 
                    id="compensation" 
                    icon={HandCoins} 
                    label="Kompensasi" 
                    indent 
                    badge={unreadCompensations} 
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    isCollapsed={isCollapsed}
                  />
                )}
              </div>
            )}
          </div>
        )}

        <div className="mt-4">
          <NavItem 
            id="rapat" 
            icon={Speech} 
            label="Rapat" 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isCollapsed={isCollapsed}
          />
          <NavItem 
            id="pengumuman" 
            icon={Megaphone} 
            label="Pengumuman" 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isCollapsed={isCollapsed}
          />
          <NavItem 
            id="employee_of_the_period" 
            icon={Trophy} 
            label="Best Employee" 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isCollapsed={isCollapsed}
          />
          <NavItem 
            id="feedback" 
            icon={MessagesSquare} 
            label="Feedback" 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isCollapsed={isCollapsed}
          />
          <NavItem 
            id="lapor" 
            icon={AlertTriangle} 
            label="Lapor" 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isCollapsed={isCollapsed}
          />
        </div>

        <NavItem 
          id="document" 
          icon={Files} 
          label="Dokumen" 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isCollapsed={isCollapsed}
        />

        {/* Laporan Menu Group */}
        {(isAdmin || user?.is_hr_admin || user?.is_finance_admin) && (
          <div className="mt-4">
            <button 
              type="button"
              onClick={() => setIsReportOpen(!isReportOpen)}
              className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 w-full mb-1 group relative overflow-hidden ${isReportActive ? 'bg-[#006E62]/10 text-[#006E62]' : 'text-gray-600 hover:bg-gray-100'}`}
              title={isCollapsed ? 'Laporan' : ''}
            >
              <span className="absolute bottom-0 left-0 h-0.5 bg-[#006E62] w-0 transition-all duration-300 group-hover:w-full"></span>
              <BarChart3 size={20} className="shrink-0 text-gray-600" />
              {!isCollapsed && (
                <div className="flex items-center justify-between flex-1 overflow-hidden">
                  <span className="font-medium text-sm truncate">Laporan</span>
                  {isReportOpen ? <ChevronDown size={16} className="text-gray-300" /> : <ChevronRight size={16} className="text-gray-300" />}
                </div>
              )}
            </button>
            
            {(isReportOpen || isCollapsed) && (
              <div className={`mt-1 overflow-hidden transition-all duration-300 ${isCollapsed ? '' : 'max-h-96'}`}>
                {(isAdmin || user?.is_hr_admin) && (
                  <>
                    <NavItem 
                      id="employee_report" 
                      icon={ChartPie} 
                      label="Infografis Karyawan" 
                      indent 
                      activeTab={activeTab}
                      setActiveTab={setActiveTab}
                      isCollapsed={isCollapsed}
                    />
                    <NavItem 
                      id="attendance_report" 
                      icon={Fingerprint} 
                      label="Laporan Kehadiran" 
                      indent 
                      activeTab={activeTab}
                      setActiveTab={setActiveTab}
                      isCollapsed={isCollapsed}
                    />
                  </>
                )}
                {(isAdmin || user?.is_finance_admin) && (
                  <NavItem 
                    id="finance_report" 
                    icon={Wallet} 
                    label="Laporan Finansial" 
                    indent 
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    isCollapsed={isCollapsed}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* Presensi Group for non-admin */}
        {!isAdmin && (
          <div className="mt-4">
            <button 
              type="button"
              onClick={() => setIsPresenceOpen(!isPresenceOpen)}
              className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 w-full mb-1 group relative overflow-hidden ${isPresenceActive ? 'bg-[#006E62]/10 text-[#006E62]' : 'text-gray-600 hover:bg-gray-100'}`}
              title={isCollapsed ? 'Presensi' : ''}
            >
              <span className="absolute bottom-0 left-0 h-0.5 bg-[#006E62] w-0 transition-all duration-300 group-hover:w-full"></span>
              <div className="relative shrink-0">
                <Fingerprint size={20} className="text-gray-600" />
              </div>
              {!isCollapsed && (
                <div className="flex items-center justify-between flex-1 overflow-hidden">
                  <span className="font-medium text-sm">Presensi</span>
                  {isPresenceOpen ? <ChevronDown size={16} className="text-gray-300" /> : <ChevronRight size={16} className="text-gray-300" />}
                </div>
              )}
            </button>
            
            {(isPresenceOpen || isCollapsed) && (
              <div className={`mt-1 overflow-hidden transition-all duration-300 ${isCollapsed ? '' : 'max-h-96'}`}>
                <NavItem 
                  id="presence" 
                  icon={Fingerprint} 
                  label="Presensi Reguler" 
                  indent 
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  isCollapsed={isCollapsed}
                />
                <NavItem 
                  id="overtime" 
                  icon={Timer} 
                  label="Presensi Lembur" 
                  indent 
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  isCollapsed={isCollapsed}
                />
                <NavItem 
                  id="dispensation" 
                  icon={ClipboardList} 
                  label="Dispensasi Presensi" 
                  indent 
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  isCollapsed={isCollapsed}
                />
              </div>
            )}
          </div>
        )}

        <div className="mt-4">
          {!isAdmin && (
            <>
              <NavItem 
                id="my_payslip" 
                icon={Receipt} 
                label="Slip Gaji Saya" 
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                isCollapsed={isCollapsed}
              />
              <NavItem 
                id="settings" 
                icon={Settings} 
                label="Pengaturan" 
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                isCollapsed={isCollapsed}
              />
            </>
          )}
        </div>
      </nav>

      <div className="p-4 border-t border-gray-50 space-y-2">
        <button 
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-rose-500 hover:bg-rose-50 rounded-md transition-all font-medium text-sm"
          title={isCollapsed ? 'Keluar' : ''}
        >
          <LogOut size={20} className="shrink-0" />
          {!isCollapsed && <span>Keluar</span>}
        </button>
        
        <button 
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center p-2 text-[#006E62] hover:bg-gray-100 rounded-md transition-all"
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;