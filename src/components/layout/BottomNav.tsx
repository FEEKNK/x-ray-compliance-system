import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  History, 
  UserCircle,
  ClipboardList,
  CalendarDays,
  BarChart3,
  Users,
  Settings,
  FileText,
  ChevronUp,
  X,
  ShieldCheck,
  LogOut
} from 'lucide-react';


interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  role: 'ADMIN' | 'STAFF';
  onLogout?: () => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab, role, onLogout }) => {
  const [showAdminMenu, setShowAdminMenu] = useState(false);

  const staffItems = [
    { id: 'dashboard', label: 'แบบฟอร์ม', icon: ClipboardList },
    { id: 'history', label: 'ประวัติ', icon: History },
    { id: 'profile', label: 'โปรไฟล์', icon: UserCircle },
  ];

  const adminPrimaryItems = [
    { id: 'dashboard', label: 'ภาพรวม', icon: LayoutDashboard },
    { id: 'monthly', label: 'วิเคราะห์', icon: BarChart3 },
    { id: 'scheduling', label: 'ตารางเวร', icon: CalendarDays },
    { id: 'more', label: 'เพิ่มเติม', icon: ChevronUp },
  ];

  const adminMoreItems = [
    { id: 'quality', label: 'คุณภาพ', icon: ShieldCheck },
    { id: 'forms', label: 'แบบฟอร์ม', icon: FileText },
    { id: 'master-logs', label: 'ประวัติ', icon: ClipboardList },
    { id: 'users', label: 'บุคลากร', icon: Users },
    { id: 'settings', label: 'ตั้งค่า', icon: Settings },
  ];

  if (role === 'STAFF') {
    return (
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-40 pb-safe">
        <div className="flex items-center justify-around h-16 px-2">
          {staffItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 transition-all relative ${
                  isActive ? 'text-[#00468B]' : 'text-gray-400'
                }`}
              >
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#00468B] rounded-full" />
                )}
                <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-blue-50' : ''}`}>
                  <Icon size={20} />
                </div>
                <span className={`text-[9px] font-black uppercase tracking-tight ${isActive ? 'text-[#00468B]' : 'text-gray-400'}`}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  // ADMIN bottom nav
  return (
    <>
      {/* Admin More Menu Overlay */}
      {showAdminMenu && (
        <div 
          className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          onClick={() => setShowAdminMenu(false)}
        >
          <div 
            className="absolute bottom-16 left-0 right-0 bg-white rounded-t-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-4 duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-black text-gray-700 uppercase tracking-widest">เมนูเพิ่มเติม</h3>
              <button onClick={() => setShowAdminMenu(false)} className="p-1.5 bg-gray-100 rounded-full text-gray-500">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {adminMoreItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); setShowAdminMenu(false); }}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl space-y-2 transition-all ${
                      isActive ? 'bg-[#00468B] text-white shadow-lg shadow-blue-900/20' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    <Icon size={22} />
                    <span className="text-[9px] font-black uppercase tracking-tight leading-none text-center">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Logout Button */}
            {onLogout && (
              <button
                onClick={() => { onLogout(); setShowAdminMenu(false); }}
                className="mt-4 w-full flex items-center justify-center space-x-3 py-4 rounded-2xl bg-red-50 text-red-500 font-black text-sm hover:bg-red-100 active:scale-95 transition-all border border-red-100"
              >
                <LogOut size={18} />
                <span>ออกจากระบบ</span>
              </button>
            )}
          </div>
        </div>
      )}

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-40 pb-safe">
        <div className="flex items-center justify-around h-16 px-2">
          {adminPrimaryItems.map((item) => {
            const Icon = item.icon;
            const isMore = item.id === 'more';
            const isActive = isMore ? showAdminMenu : activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (isMore) {
                    setShowAdminMenu(prev => !prev);
                  } else {
                    setActiveTab(item.id);
                    setShowAdminMenu(false);
                  }
                }}
                className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 transition-all relative ${
                  isActive ? 'text-[#00468B]' : 'text-gray-400'
                }`}
              >
                {isActive && !isMore && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#00468B] rounded-full" />
                )}
                <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-blue-50' : ''}`}>
                  <Icon size={20} className={isMore && showAdminMenu ? 'rotate-180 transition-transform' : 'transition-transform'} />
                </div>
                <span className={`text-[9px] font-black uppercase tracking-tight ${isActive ? 'text-[#00468B]' : 'text-gray-400'}`}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default BottomNav;