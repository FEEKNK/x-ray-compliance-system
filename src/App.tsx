import React from 'react';
import { AppProvider, useApp } from './AppContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import AdminDashboard from './components/AdminDashboard';
import StaffDashboard from './components/StaffDashboard';
import FormBuilder from './components/FormBuilder';
import Scheduler from './components/Scheduler';
import MasterLogs from './components/MasterLogs';
import UserManagement from './components/UserManagement';
import StaffHistory from './components/StaffHistory';
import Settings from './components/Settings';
import SystemGuide from './components/SystemGuide';
import LandingPage from './components/LandingPage';

const AppContent: React.FC = () => {
  const { currentUser } = useApp();
  const [activeTab, setActiveTab] = React.useState('dashboard');

  if (!currentUser) return <LandingPage />;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} role={currentUser.role} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
          {currentUser.role === 'ADMIN' ? (
            <>
              {activeTab === 'dashboard' && <AdminDashboard />}
              {activeTab === 'forms' && <FormBuilder />}
              {activeTab === 'schedule' && <Scheduler />}
              {activeTab === 'logs' && <MasterLogs />}
              {activeTab === 'users' && <UserManagement />}
              {activeTab === 'settings' && <Settings />}
              {activeTab === 'guide' && <SystemGuide />}
            </>
          ) : (
            <>
              {activeTab === 'dashboard' && <StaffDashboard />}
              {activeTab === 'history' && <StaffHistory />}
              {activeTab === 'guide' && <SystemGuide />}
            </>
          )}
        </main>
      </div>
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