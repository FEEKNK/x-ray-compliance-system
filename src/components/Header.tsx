import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { Clock, User as UserIcon } from 'lucide-react';
import { translations } from '../i18n';
import logo from '../assets/logo.svg';

const Header: React.FC = () => {
  const { currentUser, users, setCurrentUser, language, setLanguage, settings } = useApp();
  const t = translations[language];
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getActiveShift = () => {
    const hour = time.getHours();
    if (hour >= 8 && hour < 16) return 'Morning';
    if (hour >= 16 && hour < 24) return 'Afternoon';
    return 'Night';
  };

  const currentShift = getActiveShift();

  return (
    <header className="bg-white border-b border-gray-100 h-16 md:h-20 flex items-center justify-between px-4 md:px-8 shrink-0 shadow-sm z-30 sticky top-0">
      <div className="flex items-center space-x-3 md:space-x-6">
        {/* Logo for Mobile - Always Visible */}
        <div className="md:hidden flex items-center shrink-0">
           <img src={logo} alt="Logo" className="h-10 w-auto" />
        </div>

        {/* Branding - Hidden on small mobile, condensed on desktop */}
        <div className="hidden sm:flex flex-col">
           <h2 className="text-[10px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1 truncate max-w-[120px] md:max-w-none">
            {settings.hospitalName}
           </h2>
           <h3 className="text-xs md:text-sm font-bold text-[#00468B]">
             {currentUser?.role === 'ADMIN' ? t.dashboard : t.myDutyCard}
           </h3>
        </div>
        
        <span className="hidden sm:block h-8 w-px bg-gray-100"></span>
        
        {/* Real-time Status */}
        <div className="flex items-center space-x-2 md:space-x-4">
           <div className="flex flex-col">
              <div className="flex items-center text-[10px] md:text-xs font-black text-gray-700">
                <Clock size={12} className="mr-1 text-[#00468B] shrink-0" />
                {time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </div>
           </div>
           
           <div className={`px-2 md:px-3 py-1 rounded-lg border flex items-center space-x-1.5 ${
             currentShift === 'Morning' ? 'bg-orange-50 border-orange-100 text-orange-600' :
             currentShift === 'Afternoon' ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-indigo-50 border-indigo-100 text-indigo-600'
           }`}>
              <div className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full animate-pulse ${
                currentShift === 'Morning' ? 'bg-orange-400' : 
                currentShift === 'Afternoon' ? 'bg-blue-400' : 'bg-indigo-400'
              }`}></div>
              <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest">{currentShift.charAt(0)}</span>
           </div>
        </div>
      </div>

      <div className="flex items-center space-x-2 md:space-x-6">
        <button 
          onClick={() => setLanguage(language === 'TH' ? 'EN' : 'TH')}
          className="p-2 md:px-4 md:py-1.5 bg-gray-50 border border-gray-200 rounded-full hover:bg-gray-100 transition-all text-[#00468B] font-bold text-xs"
        >
          {language}
        </button>

        {/* User Switcher - Condensed for Mobile */}
        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-full px-2 py-1 md:px-3">
          <UserIcon size={14} className="text-gray-400 mr-1 md:mr-2 shrink-0" />
          <select 
            className="text-[10px] md:text-xs bg-transparent border-none focus:ring-0 cursor-pointer font-bold text-[#00468B] max-w-[80px] md:max-w-none"
            value={currentUser?.id}
            onChange={(e) => {
              const user = users.find(u => u.id === e.target.value);
              if (user) setCurrentUser(user);
            }}
          >
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name.split(' ')[0]}</option>
            ))}
          </select>
        </div>
        
        <div className="hidden md:flex items-center space-x-3 pl-6 border-l border-gray-100">
          <div className="text-right">
            <p className="text-xs font-bold text-[#00468B] leading-none mb-1">{currentUser?.name}</p>
            <p className="text-[10px] text-gray-400 font-medium leading-none">{currentUser?.department}</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-blue-100 border-2 border-white shadow-sm flex items-center justify-center text-[#00468B] font-bold overflow-hidden">
             {currentUser?.name.charAt(0)}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;