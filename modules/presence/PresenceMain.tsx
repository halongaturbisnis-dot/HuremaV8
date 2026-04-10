
import React, { useState, useEffect } from 'react';
import PresenceDashboard from './PresenceDashboard';
import PresenceVerification from './PresenceVerification';

interface PresenceMainProps {
  setActiveTab?: (tab: string) => void;
}

const PresenceMain: React.FC<PresenceMainProps> = ({ setActiveTab }) => {
  const [view, setView] = useState<'dashboard' | 'verify'>(() => {
    const source = localStorage.getItem('presence_nav_source');
    localStorage.removeItem('presence_nav_source');
    return source === 'bottom_nav' ? 'verify' : 'dashboard';
  });

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('presence_view_change', { detail: view }));
  }, [view]);

  useEffect(() => {
    const handleForceVerify = () => setView('verify');
    window.addEventListener('presence_force_verify', handleForceVerify);
    return () => window.removeEventListener('presence_force_verify', handleForceVerify);
  }, []);

  if (view === 'verify') {
    return <PresenceVerification onBack={() => setView('dashboard')} />;
  }

  return <PresenceDashboard onVerify={() => setView('verify')} setActiveTab={setActiveTab} />;
};

export default PresenceMain;
