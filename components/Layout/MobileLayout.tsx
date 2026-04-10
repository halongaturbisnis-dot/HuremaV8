
import React, { useState, useEffect } from 'react';
import { Bell, Home, Fingerprint, UserCircle, Menu, User } from 'lucide-react';
import { AuthUser, Attendance } from '../../types';
import { googleDriveService } from '../../services/googleDriveService';
import { presenceService } from '../../services/presenceService';
import { LOGO_ICON } from '../../assets';

interface MobileLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  user: AuthUser;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({ children, activeTab, setActiveTab, user }) => {
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [presenceView, setPresenceView] = useState<'dashboard' | 'verify'>('dashboard');

  useEffect(() => {
    const handleViewChange = (e: any) => {
      setPresenceView(e.detail);
    };
    window.addEventListener('presence_view_change', handleViewChange);
    return () => window.removeEventListener('presence_view_change', handleViewChange);
  }, []);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const attendance = await presenceService.getTodayAttendance(user.id);
        setTodayAttendance(attendance);
      } catch (error) {
        console.error('Error fetching attendance for bottom nav:', error);
      }
    };

    fetchAttendance();
    // Refresh every minute to keep status updated
    const interval = setInterval(fetchAttendance, 60000);
    return () => clearInterval(interval);
  }, [user.id]);

  const isCheckOut = !!todayAttendance && !todayAttendance.check_out;

  return (
    <div className="min-h-screen bg-white flex flex-col md:hidden">
      {/* Top Header */}
      <header className="h-16 flex items-center px-4 bg-white fixed top-0 left-0 right-0 z-50 border-b border-gray-50">
        <div className="flex items-center gap-2 flex-shrink-0 flex-nowrap">
          <img src={LOGO_ICON} alt="Logo" className="w-8 h-8 object-contain" />
          <span className="text-xl font-bold tracking-tight text-[#006E62] leading-none whitespace-nowrap">HUREMA</span>
        </div>
        
        <div className="flex items-center gap-3 ml-auto">
          <span className="text-xs font-semibold text-gray-700 truncate max-w-[120px]">{user.full_name}</span>
          <div className="w-9 h-9 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center text-gray-400 font-bold shadow-sm">
            {user.photo_google_id ? (
              <img 
                src={googleDriveService.getFileUrl(user.photo_google_id)} 
                alt="" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <UserCircle size={22} />
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pt-16 pb-20 scrollbar-none">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="h-20 bg-white border-t border-gray-100 flex items-center justify-around px-6 fixed bottom-0 left-0 right-0 z-50 pb-safe">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`p-3 rounded-2xl transition-all duration-300 ${activeTab === 'dashboard' ? 'bg-[#006E62] text-white shadow-lg shadow-emerald-100 scale-110' : 'text-gray-400'}`}
        >
          <Home size={24} />
        </button>
        
        <button 
          onClick={() => {
            if (activeTab === 'presence') {
              window.dispatchEvent(new CustomEvent('presence_force_verify'));
            } else {
              localStorage.setItem('presence_nav_source', 'bottom_nav');
              setActiveTab('presence');
            }
          }}
          className={`p-4 rounded-full transition-all duration-300 -mt-10 border-4 border-white ${activeTab === 'presence' && presenceView !== 'verify' ? 'bg-[#006E62] text-white shadow-xl scale-110' : 'bg-white text-[#006E62] shadow-lg'}`}
        >
          <div className="relative">
            <Fingerprint size={28} />
            <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${isCheckOut ? 'bg-orange-500' : 'bg-emerald-500'}`}></div>
          </div>
        </button>

        <button 
          onClick={() => setActiveTab('account')}
          className={`p-3 rounded-2xl transition-all duration-300 ${activeTab === 'account' ? 'bg-[#006E62] text-white shadow-lg shadow-emerald-100 scale-110' : 'text-gray-400'}`}
        >
          <User size={24} />
        </button>
      </nav>
    </div>
  );
};

export default MobileLayout;
