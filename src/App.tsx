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
import Settings from './components/shared/Settings';
import SystemGuide from './components/shared/SystemGuide';
import LandingPage from './components/shared/LandingPage';
import BottomNav from './components/layout/BottomNav';
import MonthlyDashboard from './components/admin/MonthlyDashboard';
import { LogOut, UserCircle } from 'lucide-react';

const AppContent: React.FC = () => {
  const { currentUser, setCurrentUser } = useApp();
  const [activeTab, setActiveTab] = React.useState('dashboard');

  if (!currentUser) return <LandingPage />;

  return (
    <div className="flex h-screen bg-white md:bg-gray-50 overflow-hidden">
      {/* Sidebar for Desktop */}
      <div className="hidden md:flex h-full">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} role={currentUser.role} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <Header />
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-white md:bg-gray-100 p-4 md:p-6 pb-24 md:pb-6">
          {currentUser.role === 'ADMIN' ? (
            <>
              {activeTab === 'dashboard' && <AdminDashboard />}
              {activeTab === 'monthly' && <MonthlyDashboard />}
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
              {activeTab === 'profile' && (
                <div className="max-w-md mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
                  <div className="text-center pt-10">
                    <div className="w-24 h-24 bg-blue-50 text-[#00468B] rounded-full flex items-center justify-center mx-auto mb-4">
                      <UserCircle size={64} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">{currentUser.name}</h2>
                    <p className="text-gray-500 font-medium uppercase tracking-widest text-[10px] mt-1">{currentUser.role} | {currentUser.department}</p>
                  </div>

                  <div className="bg-white rounded-3xl border border-gray-100 p-6 space-y-4 shadow-sm">
                    <button 
                      onClick={() => setCurrentUser(null)}
                      className="w-full flex items-center justify-between p-4 rounded-2xl bg-red-50 text-red-600 font-bold transition-all active:scale-95"
                    >
                      <div className="flex items-center space-x-3">
                        <LogOut size={20} />
                        <span>Exit Terminal</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </main>

        {/* Bottom Nav for Mobile */}
        <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} role={currentUser.role} />
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