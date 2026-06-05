import React, { useState, useCallback } from 'react';
import { useApp } from '../../AppContext';
import { ShieldCheck, User as UserIcon, Lock, ChevronRight, LayoutGrid, Delete, ChevronLeft, CheckCircle } from 'lucide-react';
import logo from '../../assets/logo.svg';
import type { User } from '../../types';
import { api } from '../../api';
import { usePublicUsers } from '../../hooks/queries';

// ─── PIN Pad Component ──────────────────────────────────────────────────────
interface PinPadProps {
  selectedUser: User;
  onSuccess: (user: User) => void;
  onBack: () => void;
}

const PinPad: React.FC<PinPadProps> = ({ selectedUser, onSuccess, onBack }) => {
  const [pin, setPin] = useState('');
  const [shake, setShake] = useState(false);
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const MAX_PIN = 6;

  const handleDigit = useCallback((digit: string) => {
    setError('');
    setPin(prev => {
      if (prev.length >= MAX_PIN) return prev;
      const next = prev + digit;
      // Auto-confirm when PIN is full
      if (next.length === MAX_PIN) {
        setTimeout(() => confirmPin(next), 120);
      }
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [MAX_PIN]);

  const handleBackspace = useCallback(() => {
    setError('');
    setPin(prev => prev.slice(0, -1));
  }, []);

  const confirmPin = useCallback(async (pinToCheck: string) => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      const { user } = await api.auth.login(selectedUser.id, pinToCheck);
      onSuccess(user);
    } catch {
      setShake(true);
      setError('รหัสไม่ถูกต้อง หรือมีข้อผิดพลาด');
      setTimeout(() => {
        setShake(false);
        setPin('');
      }, 600);
    } finally {
      setIsLoggingIn(false);
    }
  }, [selectedUser, onSuccess, isLoggingIn]);

  const handleConfirm = useCallback(() => {
    confirmPin(pin);
  }, [pin, confirmPin]);

  const DIGITS = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
  ];

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center space-x-2 text-gray-400 hover:text-[#00468B] font-bold text-sm mb-8 transition-colors group"
      >
        <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
        <span>เลือกผู้ใช้อื่น</span>
      </button>

      {/* User info */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-20 h-20 rounded-3xl bg-blue-50 flex items-center justify-center text-[#00468B] text-3xl font-black shadow-inner mb-4">
          {selectedUser.name.charAt(0)}
        </div>
        <h2 className="text-xl font-black text-gray-800">{selectedUser.name}</h2>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
          {selectedUser.role} | {selectedUser.department}
        </p>
      </div>

      {/* PIN Dots */}
      <div className={`flex justify-center space-x-4 mb-3 ${shake ? 'animate-bounce' : ''}`}
        style={shake ? { animation: 'shake 0.5s ease-in-out' } : {}}>
        {Array.from({ length: MAX_PIN }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
              i < pin.length
                ? 'bg-[#00468B] border-[#00468B] scale-110'
                : 'bg-transparent border-gray-300'
            }`}
          />
        ))}
      </div>

      {/* Error message */}
      <div className="h-6 flex items-center justify-center mb-6">
        {error && (
          <p className="text-red-500 text-xs font-bold text-center animate-in fade-in duration-200">
            ❌ {error}
          </p>
        )}
      </div>

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {DIGITS.map(row =>
          row.map(d => (
            <button
              key={d}
              id={`pin-btn-${d}`}
              onClick={() => handleDigit(d)}
              className="h-16 rounded-2xl bg-gray-50 hover:bg-blue-50 hover:text-[#00468B] active:scale-95 text-gray-700 font-black text-2xl border border-gray-100 hover:border-blue-200 transition-all select-none shadow-sm"
            >
              {d}
            </button>
          ))
        )}
        {/* Bottom row: Backspace | 0 | Confirm */}
        <button
          id="pin-btn-backspace"
          onClick={handleBackspace}
          className="h-16 rounded-2xl bg-gray-50 hover:bg-red-50 hover:text-red-500 active:scale-95 text-gray-400 font-black text-xl border border-gray-100 hover:border-red-200 transition-all select-none flex items-center justify-center"
        >
          <Delete size={22} />
        </button>
        <button
          id="pin-btn-0"
          onClick={() => handleDigit('0')}
          className="h-16 rounded-2xl bg-gray-50 hover:bg-blue-50 hover:text-[#00468B] active:scale-95 text-gray-700 font-black text-2xl border border-gray-100 hover:border-blue-200 transition-all select-none shadow-sm"
        >
          0
        </button>
        <button
          id="pin-btn-confirm"
          onClick={handleConfirm}
          disabled={pin.length === 0 || isLoggingIn}
          className="h-16 rounded-2xl bg-[#00468B] hover:bg-[#003569] active:scale-95 text-white font-black text-xl border border-transparent transition-all select-none flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed shadow-md"
        >
          {isLoggingIn ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <CheckCircle size={26} />}
        </button>
      </div>

      <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">
        กรอกเลขประจำตัวพนักงานเพื่อเข้าระบบ
      </p>

      {/* shake keyframes */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-8px); }
          30% { transform: translateX(8px); }
          45% { transform: translateX(-6px); }
          60% { transform: translateX(6px); }
          75% { transform: translateX(-3px); }
          90% { transform: translateX(3px); }
        }
      `}</style>
    </div>
  );
};

// ─── Main Landing Page ──────────────────────────────────────────────────────
const LandingPage: React.FC = () => {
  const { setCurrentUser, settings } = useApp();
  const { data: users = [], isLoading } = usePublicUsers();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
  };

  const handlePinSuccess = (user: User) => {
    setCurrentUser(user);
  };

  const handleBack = () => {
    setSelectedUser(null);
  };

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

          {!selectedUser ? (
            /* ── Step 1: User List ── */
            <div className="relative z-10 space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-800">เลือกชื่อของคุณ</h2>
                <p className="text-gray-500 font-medium">เลือกโปรไฟล์เพื่อดำเนินการเข้าสู่ระบบด้วย PIN</p>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-4 border-[#00468B] border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {users.map(user => (
                  <button
                    key={user.id}
                    id={`select-user-${user.id}`}
                    onClick={() => handleSelectUser(user as any)}
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
              )}
            </div>
          ) : (
            /* ── Step 2: PIN Pad ── */
            <div className="relative z-10 max-w-xs mx-auto">
              <PinPad
                selectedUser={selectedUser}
                onSuccess={handlePinSuccess}
                onBack={handleBack}
              />
            </div>
          )}

          <div className="pt-8 border-t border-gray-50 flex items-center justify-between text-gray-400 relative z-10">
            <div className="flex items-center space-x-2">
              <LayoutGrid size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">
                {selectedUser ? 'PIN Authentication' : 'Shared Terminal Mode'}
              </span>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest">v2.3.0 Secure Access</p>
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