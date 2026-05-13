import React from 'react';
import { useApp } from '../AppContext';
import { ShieldCheck, User as UserIcon, Lock, ChevronRight, LayoutGrid } from 'lucide-react';
import logo from '../assets/logo.svg';

const LandingPage: React.FC = () => {
  const { users, setCurrentUser, settings } = useApp();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 animate-in fade-in duration-700">
      <div className="max-w-4xl w-full space-y-12">
        <div className="text-center space-y-6">
          <img src={logo} alt="Hospital Logo" className="h-24 mx-auto drop-shadow-xl" />
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-[#00468B] uppercase tracking-tight">{settings.hospitalName}</h1>
            <p className="text-gray-400 font-bold uppercase tracking-[0.3em] text-xs">Clinical Compliance Management System</p>
          </div>
        </div>

        <div className="bg-white rounded-[40px] shadow-2xl shadow-blue-900/5 border border-gray-100 p-12 space-y-10 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-12 opacity-5 text-[#00468B]">
              <ShieldCheck size={160} />
           </div>

           <div className="relative z-10 space-y-2">
              <h2 className="text-2xl font-bold text-gray-800">Identify Yourself</h2>
              <p className="text-gray-500 font-medium">Please select your profile to access the operational dashboard.</p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
              {users.map(user => (
                <button 
                  key={user.id}
                  onClick={() => setCurrentUser(user)}
                  className="group p-6 rounded-3xl border-2 border-gray-50 bg-gray-50/50 hover:bg-white hover:border-[#00468B] hover:shadow-xl transition-all text-left flex items-center justify-between"
                >
                  <div className="flex items-center space-x-5">
                    <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-[#00468B] group-hover:bg-blue-50 transition-colors">
                      {user.role === 'ADMIN' ? <Lock size={24} /> : <UserIcon size={24} />}
                    </div>
                    <div>
                      <p className="font-black text-gray-800 group-hover:text-[#00468B] transition-colors">{user.name}</p>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{user.role} | {user.department}</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-gray-300 group-hover:text-[#00468B] transition-colors" />
                </button>
              ))}
           </div>

           <div className="pt-8 border-t border-gray-50 flex items-center justify-between text-gray-400">
              <div className="flex items-center space-x-2">
                 <LayoutGrid size={16} />
                 <span className="text-[10px] font-black uppercase tracking-widest">Shared Terminal Mode</span>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest">v2.2.1 Secure Access</p>
           </div>
        </div>

        <p className="text-center text-gray-300 text-[10px] font-black uppercase tracking-[0.2em]">
          Restricted Access for Authorized Personnel Only
        </p>
      </div>
    </div>
  );
};

export default LandingPage;