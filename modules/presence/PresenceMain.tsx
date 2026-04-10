
import React, { useState } from 'react';
import PresenceDashboard from './PresenceDashboard';
import PresenceVerification from './PresenceVerification';

interface PresenceMainProps {
  setActiveTab?: (tab: string) => void;
}

const PresenceMain: React.FC<PresenceMainProps> = ({ setActiveTab }) => {
  const [view, setView] = useState<'dashboard' | 'verify'>('dashboard');

  if (view === 'verify') {
    return <PresenceVerification onBack={() => setView('dashboard')} />;
  }

  return <PresenceDashboard onVerify={() => setView('verify')} setActiveTab={setActiveTab} />;
};

export default PresenceMain;
