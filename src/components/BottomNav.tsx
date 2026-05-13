import React from 'react';
import { 
  LayoutDashboard, 
  History, 
  BookOpen, 
  UserCircle 
} from 'lucide-react';
import { useApp } from '../AppContext';
import { translations } from '../i18n';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  role: 'ADMIN' | 'STAFF';
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab, role }) => {
  const { language } = useApp();
  const t = translations[language];

  const adminItems = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
    { id: 'logs', label: 'Logs', icon: History },
    { id: 'guide', label: 'Guide', icon: BookOpen },
    { id: 'settings', label: 'Menu', icon: UserCircle },
  ];

  const staffItems = [
    { id: 'dashboard', label: 'Forms', icon: LayoutDashboard },
    { id: 'history', label: t.myHistory, icon: History },
    { id: 'guide', label: 'Guide', icon: BookOpen },
    { id: 'profile', label: 'Profile', icon: UserCircle },
  ];

  const items = role === 'ADMIN' ? adminItems : staffItems;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 h-16 flex items-center justify-around px-2 z-40 pb-safe">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 transition-colors ${
              isActive ? 'text-[#00468B]' : 'text-gray-400'
            }`}
          >
            <Icon size={20} className={isActive ? 'animate-in zoom-in duration-200' : ''} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;