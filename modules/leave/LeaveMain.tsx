import React from 'react';
import { authService } from '../../services/authService';
import AdminLeaveMain from './AdminLeaveMain';
import LeaveMandiriDashboard from './LeaveMandiriDashboard';
import LeaveMandiriFormPage from './LeaveMandiriFormPage';
import { LeaveRequest } from '../../types';

interface LeaveMainProps {
  setActiveTab?: (tab: string) => void;
}

const LeaveMain: React.FC<LeaveMainProps> = ({ setActiveTab }) => {
  const user = authService.getCurrentUser();
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);
  const [view, setView] = React.useState<'list' | 'form'>('list');
  const [editingRequest, setEditingRequest] = React.useState<LeaveRequest | null>(null);
  const [requests, setRequests] = React.useState<LeaveRequest[]>([]);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isAdmin = user?.role === 'admin' || user?.is_hr_admin || user?.is_performance_admin || user?.is_finance_admin;

  if (!user) return null;

  // Always show mobile dashboard on small screens OR for non-admin users
  if (isMobile || !isAdmin) {
    if (view === 'form') {
      return (
        <LeaveMandiriFormPage 
          user={user}
          onBack={() => setView('list')}
          onSuccess={() => setView('list')}
          editData={editingRequest}
          existingRequests={requests}
        />
      );
    }

    return (
      <LeaveMandiriDashboard 
        user={user} 
        setActiveTab={setActiveTab}
        onAjukan={(request) => {
          setEditingRequest(request || null);
          setView('form');
        }}
        onRequestsLoaded={(data) => setRequests(data)}
      />
    );
  }

  // Show Admin Management View only on Desktop for Admins
  return <AdminLeaveMain user={user} />;
};

export default LeaveMain;
