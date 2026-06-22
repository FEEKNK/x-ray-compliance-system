import React from 'react';
import { useApp } from '../../AppContext';
import {
  LayoutDashboard,
  FileEdit,
  Calendar,
  ClipboardList,
  Users,
  Settings as SettingsIcon,
  LogOut,
  TrendingUp,
  Layers,
  ShieldCheck
} from 'lucide-react';
import logo from '../../assets/logo.svg';
import type { Role } from '../../types';
import { translations } from '../../i18n';
import { KeyRound } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  role: Role;
  onChangePassword?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, role, onChangePassword }) => {
  const { language, setCurrentUser } = useApp();
  const t = translations[language];

  const adminItems = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
    { id: 'monthly', label: t.qualityDashboard, icon: TrendingUp },
    { id: 'quality', label: t.qualityMatrix, icon: ShieldCheck },
    { id: 'forms', label: t.formBuilder, icon: FileEdit },
    { id: 'scheduling', label: t.scheduling, icon: Calendar },
    { id: 'bundles', label: t.formGroups, icon: Layers },
    { id: 'master-logs', label: t.masterLogs, icon: ClipboardList },
    { id: 'users', label: t.employees, icon: Users },
    { id: 'settings', label: t.settings, icon: SettingsIcon },
  ];

  const staffItems = [
    { id: 'dashboard', label: t.myDutyCard, icon: LayoutDashboard },
    { id: 'schedule', label: 'ตารางเวรของฉัน', icon: Calendar },
    { id: 'history', label: t.myHistory, icon: ClipboardList },
  ];

  const commonItems: { id: string; label: string; icon: React.ElementType }[] = [];

  const items = [...(role === 'ADMIN' ? adminItems : staffItems), ...commonItems];

  return (
    <div className="w-72 bg-white border-r border-gray-100 flex flex-col h-full shadow-sm z-40">
      <div className="p-6">
        <div 
          className="flex items-center justify-center mb-10 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setActiveTab('dashboard')}
        >
          <img src={logo} alt="Logo" className="h-20 w-auto" />
        </div>
      
        <nav className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-blue-50 text-[#00468B] shadow-sm font-bold' 
                    : 'text-gray-500 hover:bg-gray-50 hover:text-[#00468B]'
                }`}
              >
                <Icon size={22} className={isActive ? 'text-[#00468B]' : 'text-gray-400'} />
                <span className="text-base font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-6 space-y-3">
        {onChangePassword && (
          <button 
            onClick={onChangePassword}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl border border-gray-100 text-amber-500 hover:text-amber-600 hover:bg-amber-50 hover:border-amber-100 transition-all group"
          >
            <KeyRound size={20} className="group-hover:scale-110 transition-transform" />
            <span className="text-sm font-bold uppercase tracking-widest">Change Password</span>
          </button>
        )}
        <button 
          onClick={() => setCurrentUser(null)}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl border border-gray-100 text-gray-400 hover:text-red-600 hover:bg-red-50 hover:border-red-100 transition-all group"
        >
          <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
          <span className="text-sm font-bold uppercase tracking-widest">Exit Terminal</span>
        </button>
      </div>

      <div className="p-4 border-t border-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-300 font-bold uppercase tracking-tighter">
          <span>v2.2.1</span>
          <span>Quality & Safety</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
