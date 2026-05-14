import React from 'react';
import { useApp } from '../AppContext';
import { 
  LayoutDashboard, 
  FileEdit, 
  Calendar, 
  ClipboardList, 
  Users,
  Settings as SettingsIcon,
  BookOpen,
  LogOut,
  TrendingUp
} from 'lucide-react';
import logo from '../assets/logo.svg';
import type { Role } from '../types';
import { translations } from '../i18n';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  role: Role;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, role }) => {
  const { language, setCurrentUser } = useApp();
  const t = translations[language];

  const adminItems = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
    { id: 'monthly', label: 'Monthly Audit', icon: TrendingUp },
    { id: 'forms', label: t.formBuilder, icon: FileEdit },
    { id: 'schedule', label: t.scheduling, icon: Calendar },
    { id: 'logs', label: t.masterLogs, icon: ClipboardList },
    { id: 'users', label: t.employees, icon: Users },
    { id: 'settings', label: t.settings, icon: SettingsIcon },
  ];

  const staffItems = [
    { id: 'dashboard', label: t.myDutyCard, icon: LayoutDashboard },
    { id: 'history', label: t.myHistory, icon: ClipboardList },
  ];

  const commonItems = [
    { id: 'guide', label: 'System Guide', icon: BookOpen },
  ];

  const items = [...(role === 'ADMIN' ? adminItems : staffItems), ...commonItems];

  return (
    <div className="w-64 bg-white border-r border-gray-200 text-gray-600 flex flex-col h-full shrink-0 shadow-sm">
      <div className="p-8 flex flex-col items-center justify-center border-b border-gray-100 bg-white">
        <img src={logo} alt="Hospital Logo" className="h-14 w-auto mb-3" />
        <div className="h-px w-12 bg-blue-100 mb-3"></div>
        <h1 className="text-[10px] font-black tracking-[0.3em] text-[#00468B] uppercase opacity-60">Compliance</h1>
      </div>
      
      <nav className="flex-1 mt-6 px-4 space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive 
                  ? 'bg-blue-50 text-[#00468B] shadow-sm font-bold border-l-4 border-[#00468B] rounded-l-none -ml-4 pl-8' 
                  : 'hover:bg-gray-50 hover:text-[#00468B]'
              }`}
            >
              <Icon size={20} className={isActive ? 'text-[#00468B]' : 'text-gray-400'} />
              <span className="text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-6 space-y-4">
        <button 
          onClick={() => setCurrentUser(null)}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl border border-gray-100 text-gray-400 hover:text-red-600 hover:bg-red-50 hover:border-red-100 transition-all group"
        >
          <LogOut size={18} className="group-hover:translate-x-1 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-widest">Exit Terminal</span>
        </button>

        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <p className="text-[10px] font-bold text-blue-800 uppercase tracking-widest mb-1">{t.support}</p>
          <p className="text-xs text-blue-600 mb-2">Need help with compliance?</p>
          <button className="text-xs font-bold text-[#00468B] hover:underline">{t.contactIT}</button>
        </div>
      </div>

      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
          <span>v2.2.1</span>
          <span>Quality & Safety</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;