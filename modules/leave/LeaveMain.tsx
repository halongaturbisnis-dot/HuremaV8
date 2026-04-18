import React from 'react';
import { authService } from '../../services/authService';
import AdminLeaveMain from './AdminLeaveMain';
import LeaveMandiriDashboard from './LeaveMandiriDashboard';

const LeaveMain: React.FC = () => {
  const user = authService.getCurrentUser();
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isAdmin = user?.role === 'admin' || user?.is_hr_admin || user?.is_performance_admin || user?.is_finance_admin;

  if (!user) return null;

  // Always show mobile dashboard on small screens OR for non-admin users
  if (isMobile || !isAdmin) {
    return <LeaveMandiriDashboard user={user} />;
  }

  // Show Admin Management View only on Desktop for Admins
  return <AdminLeaveMain user={user} />;
};

export default LeaveMain;
