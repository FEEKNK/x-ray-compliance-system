import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { Bell, Languages, Clock } from 'lucide-react';
import { translations } from '../i18n';

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
    <header className="bg-white border-b border-gray-100 h-20 flex items-center justify-between px-8 shrink-0 shadow-sm z-10">
      <div className="flex items-center space-x-6">
        <div className="flex flex-col">
           <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{settings.hospitalName}</h2>
           <h3 className="text-sm font-bold text-[#00468B]">
             {currentUser?.role === 'ADMIN' ? t.dashboard : t.myDutyCard}
           </h3>
        </div>
        
        <span className="h-8 w-px bg-gray-100"></span>
        
        <div className="flex items-center space-x-4">
           <div className="flex flex-col">
              <div className="flex items-center text-xs font-black text-gray-700">
                <Clock size={12} className="mr-1.5 text-[#00468B]" />
                {time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Current Station Time</p>
           </div>
           
           <div className={`px-3 py-1 rounded-lg border flex items-center space-x-2 ${
             currentShift === 'Morning' ? 'bg-orange-50 border-orange-100 text-orange-600' :
             currentShift === 'Afternoon' ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-indigo-50 border-indigo-100 text-indigo-600'
           }`}>
              <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                currentShift === 'Morning' ? 'bg-orange-400' : 
                currentShift === 'Afternoon' ? 'bg-blue-400' : 'bg-indigo-400'
              }`}></div>
              <span className="text-[10px] font-black uppercase tracking-widest">{currentShift} Rotation</span>
           </div>
        </div>
      </div>

      <div className="flex items-center space-x-6">
        <button 
          onClick={() => setLanguage(language === 'TH' ? 'EN' : 'TH')}
          className="flex items-center space-x-2 bg-gray-50 border border-gray-200 rounded-full px-4 py-1.5 hover:bg-gray-100 transition-all group"
        >
          <Languages size={16} className="text-gray-400 group-hover:text-[#00468B]" />
          <span className="text-xs font-bold text-[#00468B]">{language}</span>
        </button>

        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-full px-3 py-1 space-x-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase">{t.switchMode}</span>
          <select 
            className="text-xs bg-transparent border-none focus:ring-0 cursor-pointer font-bold text-[#00468B]"
            value={currentUser?.id}
            onChange={(e) => {
              const user = users.find(u => u.id === e.target.value);
              if (user) setCurrentUser(user);
            }}
          >
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.role === 'ADMIN' ? '🛡️ Admin' : '🧑‍⚕️ ' + u.name}</option>
            ))}
          </select>
        </div>
        
        <button className="relative text-gray-400 hover:text-[#00468B] transition-colors p-2 rounded-full hover:bg-gray-50">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
        
        <div className="flex items-center space-x-3 pl-6 border-l border-gray-100">
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