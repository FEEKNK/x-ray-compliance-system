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
import { LogOut, UserCircle } from 'lucide-react';
import GlobalLoader from './components/shared/GlobalLoader';

const AppContent: React.FC = () => {
  const { currentUser, setCurrentUser, isLoading, loadError } = useApp();
  const [activeTab, setActiveTab] = React.useState('dashboard');
  const [showNotice, setShowNotice] = React.useState(false);
  const prevUserRef = React.useRef<string | null>(null);

  // Show popup whenever a NEW user logs in
  React.useEffect(() => {
    if (currentUser && prevUserRef.current !== currentUser.id) {
      setShowNotice(true);
      prevUserRef.current = currentUser.id;
    }
    if (!currentUser) {
      prevUserRef.current = null;
    }
  }, [currentUser]);

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
        <Header />
        
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
              {activeTab === 'profile' && (
                <div className="max-w-md mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
                  <div className="text-center pt-10">
                    <div className="w-24 h-24 bg-blue-50 text-[#00468B] rounded-full flex items-center justify-center mx-auto mb-4">
                      <UserCircle size={64} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">{currentUser.name}</h2>
                    <p className="text-gray-500 font-medium uppercase tracking-widest text-xs mt-1">{currentUser.role} | {currentUser.department}</p>
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
        <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} role={currentUser.role} onLogout={() => setCurrentUser(null)} />
      </div>

      {/* ── Notice Popup ── */}
      {showNotice && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
            style={{ animation: 'popupIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both' }}
          >
            {/* Header stripe */}
            <div className="bg-amber-400 px-6 py-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/30 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">⚠️</span>
              </div>
              <div>
                <p className="font-black text-white text-lg leading-tight">แจ้งเตือนสำคัญ</p>
                <p className="text-amber-100 text-xs font-semibold">Important Notice</p>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              <p className="text-gray-700 text-sm font-semibold leading-relaxed">
                แบบฟอร์มในระบบนี้{' '}
                <span className="font-black text-amber-600">ยังไม่เป็นทางการ</span>{' '}
                กรุณาตรวจสอบให้ดีก่อนใช้งาน
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-1">
                <p className="text-amber-800 text-sm font-bold">📝 ต้องการเพิ่ม / แก้ไขรายการ?</p>
                <p className="text-amber-700 text-sm">
                  เข้าไปได้ที่{' '}
                  <span className="font-black">ฝั่ง Admin → จัดการแบบฟอร์ม</span>
                </p>
              </div>
              <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
                <span>📧</span>
                <span>สอบถาม / มีปัญหา ติดต่อ:</span>
                <a
                  href="mailto:hanafeepara45@gmail.com"
                  className="text-blue-600 underline font-bold hover:text-blue-800 transition-colors"
                >
                  hanafeepara45@gmail.com
                </a>
              </div>
            </div>

            {/* Footer button */}
            <div className="px-6 pb-6">
              <button
                id="notice-popup-close"
                onClick={() => setShowNotice(false)}
                className="w-full py-3.5 rounded-2xl bg-[#00468B] hover:bg-[#003569] active:scale-95 text-white font-black text-base transition-all shadow-md shadow-blue-900/20"
              >
                รับทราบแล้ว เข้าใช้งาน
              </button>
            </div>
          </div>

          <style>{`
            @keyframes popupIn {
              0%   { opacity: 0; transform: scale(0.85) translateY(20px); }
              100% { opacity: 1; transform: scale(1)    translateY(0); }
            }
          `}</style>
        </div>
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