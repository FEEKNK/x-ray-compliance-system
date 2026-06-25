import React from 'react';
import { AppProvider, useApp } from './AppContext';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import AdminDashboard from './components/admin/AdminDashboard';
import StaffDashboard from './components/staff/StaffDashboard';
import FormBuilder from './components/admin/FormBuilder';
import Scheduler from './components/admin/Scheduler';
import MasterLogs from './components/admin/MasterLogs';
import UserManagement from './components/admin/UserManagement';
import StaffHistory from './components/staff/StaffHistory';
import MySchedule from './components/staff/MySchedule';
import Settings from './components/shared/Settings';
import LandingPage from './components/shared/LandingPage';
import BottomNav from './components/layout/BottomNav';
import MonthlyDashboard from './components/admin/MonthlyDashboard';
import BundleManager from './components/admin/BundleManager';
import QualityDashboard from './components/admin/QualityDashboard';
import GlobalLoader from './components/shared/GlobalLoader';
import ForceChangePassword from './components/shared/ForceChangePassword';

const AppContent: React.FC = () => {
  const { currentUser, setCurrentUser, isLoading, loadError } = useApp();
  const [activeTab, setActiveTab] = React.useState('dashboard');
  const [showChangePassword, setShowChangePassword] = React.useState(false);

  React.useEffect(() => {
    const handleAuthError = () => {
      setCurrentUser(null);
    };
    window.addEventListener('auth-error', handleAuthError);
    return () => window.removeEventListener('auth-error', handleAuthError);
  }, [setCurrentUser]);

  if (isLoading || loadError) {
    return <GlobalLoader error={loadError} onRetry={() => window.location.reload()} />;
  }

  if (!currentUser) return <LandingPage />;

  return (
    <div className="flex h-screen bg-white md:bg-gray-50 overflow-hidden">
      {/* Sidebar for Desktop */}
      <div className="hidden md:flex h-full">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} role={currentUser.role} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <Header 
          onChangePassword={() => setShowChangePassword(true)}
          onLogout={() => setCurrentUser(null)}
        />
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-white md:bg-gray-100 p-4 md:p-6 pb-24 md:pb-6">
          {currentUser.role === 'ADMIN' ? (
            <>
              {activeTab === 'dashboard' && <AdminDashboard />}
              {activeTab === 'monthly' && <MonthlyDashboard />}
              {activeTab === 'quality' && <QualityDashboard />}
              {activeTab === 'forms' && <FormBuilder />}
              {activeTab === 'scheduling' && <Scheduler />}
              {activeTab === 'bundles' && <BundleManager />}
              {activeTab === 'master-logs' && <MasterLogs />}
              {activeTab === 'users' && <UserManagement />}
              {activeTab === 'settings' && <Settings />}
            </>
          ) : (
            <>
              {activeTab === 'dashboard' && <StaffDashboard />}
              {activeTab === 'schedule' && <MySchedule />}
              {activeTab === 'history' && <StaffHistory />}
            </>
          )}
        </main>

        {/* Bottom Nav for Mobile */}
        <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} role={currentUser.role} />
      </div>

      {/* ── Voluntary Change Password ── */}
      {showChangePassword && (
        <ForceChangePassword 
          isVoluntary={true} 
          onCancel={() => setShowChangePassword(false)} 
        />
      )}
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;