
import React, { useState } from 'react';
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

  if (view === 'verify') {
    return <PresenceVerification onBack={() => setView('dashboard')} />;
  }

  return <PresenceDashboard onVerify={() => setView('verify')} setActiveTab={setActiveTab} />;
};

export default PresenceMain;
