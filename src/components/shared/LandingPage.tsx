import React, { useState } from 'react';
import { useApp } from '../../AppContext';
import { ShieldCheck, LayoutGrid, Loader2 } from 'lucide-react';
import logo from '../../assets/logo.svg';
import { api } from '../../api';

const LandingPage: React.FC = () => {
  const { setCurrentUser, settings } = useApp();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId || !password) return;

    setIsLoading(true);
    setError('');

    try {
      const { user } = await api.auth.login(loginId, password);
      setCurrentUser(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 animate-in fade-in duration-700">
      <div className="max-w-md w-full space-y-12">
        <div className="text-center space-y-6">
          <img src={logo} alt="Hospital Logo" className="h-24 mx-auto drop-shadow-xl" />
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-[#00468B] uppercase tracking-tight">{settings.hospitalName}</h1>
            <p className="text-gray-400 font-bold uppercase tracking-[0.3em] text-xs">Clinical Compliance Management System</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.05)] border border-gray-100 p-8 space-y-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 text-[#00468B] pointer-events-none">
            <ShieldCheck size={120} />
          </div>

          <div className="relative z-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-bold text-gray-800">เข้าสู่ระบบ</h2>
              <p className="text-gray-500 font-medium text-sm">กรุณากรอกรหัสพนักงานและรหัสผ่านของคุณ</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold text-center animate-in fade-in">
                  ❌ {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-2">
                    รหัสพนักงาน หรือ อีเมล (Employee ID / Email)
                  </label>
                  <input
                    type="text"
                    value={loginId}
                    onChange={e => setLoginId(e.target.value)}
                    placeholder="กรอกรหัสพนักงาน หรืออีเมล"
                    autoComplete="username"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#00468B]/20 focus:border-[#00468B] transition-all font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-2">
                    รหัสผ่าน (Password)
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="กรอกรหัสผ่าน"
                    autoComplete="current-password"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#00468B]/20 focus:border-[#00468B] transition-all font-medium"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !loginId || !password}
                className="w-full py-4 rounded-2xl bg-[#00468B] hover:bg-[#003569] active:scale-[0.98] text-white font-black text-lg transition-all shadow-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {isLoading ? <Loader2 className="animate-spin" size={24} /> : 'ลงชื่อเข้าใช้'}
              </button>
            </form>
          </div>

          <div className="pt-6 border-t border-gray-50 flex items-center justify-between text-gray-400 relative z-10">
            <div className="flex items-center space-x-2">
              <LayoutGrid size={16} />
              <span className="text-xs font-black uppercase tracking-widest">
                Standard Authentication
              </span>
            </div>
            <p className="text-xs font-black uppercase tracking-widest">v2.4.0 Secure Access</p>
          </div>
        </div>

        <p className="text-center text-gray-300 text-xs font-black uppercase tracking-[0.2em]">
          Restricted Access for Authorized Personnel Only
        </p>
      </div>
    </div>
  );
};

export default LandingPage;