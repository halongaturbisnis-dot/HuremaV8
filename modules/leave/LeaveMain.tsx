import React from 'react';
import { authService } from '../../services/authService';
import AdminLeaveMain from './AdminLeaveMain';
import LeaveMandiriDashboard from './LeaveMandiriDashboard';

const LeaveMain: React.FC = () => {
  const user = authService.getCurrentUser();
  const isAdmin = user?.role === 'admin' || user?.is_hr_admin || user?.is_performance_admin || user?.is_finance_admin;

  if (!user) return null;

  // Render Admin View for Desktop Admin
  if (isAdmin) {
    return <AdminLeaveMain user={user} />;
  }

  // Render User View for Employees (Mobile Optimized Dashboard)
  return <LeaveMandiriDashboard user={user} />;
};

export default LeaveMain;
