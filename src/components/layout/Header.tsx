import React, { useState, useEffect } from 'react';
import { useApp } from '../../AppContext';
import { Clock, User as UserIcon } from 'lucide-react';

const Header: React.FC = () => {
  const { currentUser, users, setCurrentUser, language, setLanguage } = useApp();
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
    <header className="bg-white border-b border-gray-100 shrink-0 shadow-sm z-30 sticky top-0">
      {/* Main header row */}
      <div className="h-14 md:h-20 flex items-center justify-between px-4 md:px-8">
        <div className="flex items-center space-x-3">
          {/* Logo / Brand */}
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-[#00468B] flex items-center justify-center shrink-0">
              <span className="text-white font-black text-[10px] md:text-xs">XR</span>
            </div>
            <div className="hidden md:block">
              <p className="text-xs font-bold text-[#00468B] leading-none">X-Ray System</p>
              <p className="text-[9px] text-gray-400 font-medium leading-none mt-0.5">{currentUser?.department}</p>
            </div>
          </div>

          {/* Live shift badge */}
          <div className={`px-2 py-1 rounded-lg border flex items-center space-x-1.5 ${
            currentShift === 'Morning' ? 'bg-orange-50 border-orange-100 text-orange-600' :
            currentShift === 'Afternoon' ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-indigo-50 border-indigo-100 text-indigo-600'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
              currentShift === 'Morning' ? 'bg-orange-400' : 
              currentShift === 'Afternoon' ? 'bg-blue-400' : 'bg-indigo-400'
            }`}></div>
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">
              {currentShift === 'Morning' ? 'เช้า' : currentShift === 'Afternoon' ? 'บ่าย' : 'ดึก'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2 md:space-x-4">
          {/* Clock - desktop only */}
          <div className="hidden md:flex items-center text-xs font-black text-gray-500">
            <Clock size={12} className="mr-1 text-[#00468B]" />
            {time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}
          </div>

          <button 
            onClick={() => setLanguage(language === 'TH' ? 'EN' : 'TH')}
            className="p-1.5 md:px-4 md:py-1.5 bg-gray-50 border border-gray-200 rounded-full hover:bg-gray-100 transition-all text-[#00468B] font-bold text-xs"
          >
            {language}
          </button>

          {/* User Switcher */}
          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-full px-2 py-1 md:px-3">
            <UserIcon size={13} className="text-gray-400 mr-1 md:mr-2 shrink-0" />
            <select 
              className="text-[10px] md:text-xs bg-transparent border-none focus:ring-0 cursor-pointer font-bold text-[#00468B] max-w-[70px] md:max-w-none"
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
          
          {/* Desktop profile chip */}
          <div className="hidden md:flex items-center space-x-3 pl-4 border-l border-gray-100">
            <div className="text-right">
              <p className="text-xs font-bold text-[#00468B] leading-none mb-1">{currentUser?.name}</p>
              <p className="text-[10px] text-gray-400 font-medium leading-none">{currentUser?.department}</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-blue-100 border-2 border-white shadow-sm flex items-center justify-center text-[#00468B] font-bold overflow-hidden">
               {currentUser?.name.charAt(0)}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sub-bar: name + time */}
      <div className="md:hidden flex items-center justify-between px-4 pb-2">
        <p className="text-[10px] font-bold text-gray-500">
          {currentUser?.name} • {currentUser?.department}
        </p>
        <div className="flex items-center text-[10px] font-black text-gray-400">
          <Clock size={10} className="mr-1 text-[#00468B]" />
          {time.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })}
        </div>
      </div>
    </header>
  );
};

export default Header;