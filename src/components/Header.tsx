import React from 'react';
import { useApp } from '../AppContext';
import { Bell, Languages } from 'lucide-react';
import { translations } from '../i18n';
const Header: React.FC = () => {
  const { currentUser, users, setCurrentUser, language, setLanguage, settings } = useApp();
  const t = translations[language];

  return (
    <header className="bg-white border-b border-gray-100 h-16 flex items-center justify-between px-8 shrink-0 shadow-sm z-10">
      <div className="flex items-center space-x-4">
        <div className="flex flex-col">
           <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{settings.hospitalName}</h2>
           <h3 className="text-sm font-bold text-[#00468B]">
             {currentUser?.role === 'ADMIN' ? t.dashboard : t.myDutyCard}
           </h3>
        </div>
        <span className="text-gray-300">|</span>
...
        <div className="flex items-center text-xs text-gray-500 font-medium">
          <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
          {t.systemOnline}
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
          <div className="w-9 h-9 rounded-full bg-blue-100 border-2 border-white shadow-sm flex items-center justify-center text-[#00468B] font-bold overflow-hidden">
             {currentUser?.name.charAt(0)}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;