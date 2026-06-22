import React, { useState } from 'react';
import { useApp } from '../../AppContext';
import { api } from '../../api';
import { ShieldAlert, CheckCircle2, XCircle, Loader2, X } from 'lucide-react';

export default function ForceChangePassword({ onCancel, isVoluntary }: { onCancel?: () => void, isVoluntary?: boolean }) {
  const { currentUser, setCurrentUser } = useApp();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Validation rules
  const minLength = newPassword.length >= 8;
  
  const isNotEmployeeIdOrName = () => {
    if (!currentUser) return false;
    const lowerPw = newPassword.toLowerCase();
    const lowerId = currentUser.employeeId?.toLowerCase() || '';
    const lowerName = currentUser.name?.toLowerCase() || '';
    
    if (lowerId && lowerPw.includes(lowerId)) return false;
    
    // Check if parts of the name are in the password
    const nameParts = lowerName.split(' ').filter(p => p.length > 2);
    for (const part of nameParts) {
      if (lowerPw.includes(part)) return false;
    }
    return true;
  };

  const isMatched = newPassword === confirmPassword && newPassword !== '';
  const isAllValid = minLength && isNotEmployeeIdOrName() && isMatched && oldPassword !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAllValid || !currentUser) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      await api.auth.changePassword(currentUser.id, oldPassword, newPassword);
      // Success: update currentUser state to remove requirePasswordChange flag
      setCurrentUser({ ...currentUser, requirePasswordChange: false });
      if (onCancel) onCancel(); // Close modal on success if voluntary
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.auth.logout();
      setCurrentUser(null);
    } catch (e) {
      console.error(e);
      setCurrentUser(null);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="fixed inset-0 bg-white z-[9999] overflow-y-auto flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.1)] border border-gray-100 p-8 space-y-8 relative overflow-hidden">
        
        {/* If voluntary, show Close. If mandatory, show Logout. */}
        {isVoluntary ? (
          onCancel && (
            <button 
              type="button"
              onClick={onCancel} 
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors z-20"
            >
              <X size={24} />
            </button>
          )
        ) : (
          <button 
            type="button"
            onClick={handleLogout} 
            className="absolute top-6 right-6 text-gray-400 hover:text-red-500 transition-colors z-20 flex items-center gap-1 text-xs font-bold uppercase tracking-wider"
          >
            <X size={16} />
            <span>ยกเลิก (Log out)</span>
          </button>
        )}

        <div className="absolute top-0 right-0 p-8 opacity-5 text-amber-500 pointer-events-none">
          <ShieldAlert size={120} />
        </div>

        <div className="text-center space-y-3 relative z-10">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-2xl font-black text-gray-800">
            {isVoluntary ? 'เปลี่ยนรหัสผ่าน' : 'เปลี่ยนรหัสผ่านครั้งแรก'}
          </h2>
          <p className="text-gray-500 text-sm font-medium">
            {isVoluntary 
              ? 'กรอกรหัสผ่านเดิม และตั้งรหัสผ่านใหม่ของคุณ' 
              : 'เพื่อความปลอดภัยของระบบ กรุณาตั้งรหัสผ่านใหม่ของคุณก่อนเข้าใช้งาน'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-bold flex items-center gap-2">
              <XCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-2">
                รหัสผ่านเดิม
              </label>
              <input
                type="password"
                value={oldPassword}
                onChange={e => setOldPassword(e.target.value)}
                placeholder="กรอกรหัสผ่านเดิม"
                autoComplete="current-password"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#00468B]/20 focus:border-[#00468B] transition-all font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-2">
                รหัสผ่านใหม่
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="ตั้งรหัสผ่านใหม่"
                autoComplete="new-password"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#00468B]/20 focus:border-[#00468B] transition-all font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-2">
                ยืนยันรหัสผ่านใหม่
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                autoComplete="new-password"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#00468B]/20 focus:border-[#00468B] transition-all font-medium"
                required
              />
            </div>
          </div>

          {/* Validation Rules Checklist */}
          <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-sm">
            <p className="font-bold text-gray-700 text-xs uppercase tracking-wider mb-3">เงื่อนไขความปลอดภัย:</p>
            
            <div className={`flex items-center gap-2 ${minLength ? 'text-green-600' : 'text-gray-500'}`}>
              {minLength ? <CheckCircle2 size={16} /> : <div className="w-4 h-4 rounded-full border-2 border-gray-300" />}
              <span className="font-medium text-xs">ความยาวอย่างน้อย 8 ตัวอักษร</span>
            </div>

            <div className={`flex items-center gap-2 ${newPassword.length > 0 && isNotEmployeeIdOrName() ? 'text-green-600' : 'text-gray-500'}`}>
              {newPassword.length > 0 && isNotEmployeeIdOrName() ? <CheckCircle2 size={16} /> : <div className="w-4 h-4 rounded-full border-2 border-gray-300" />}
              <span className="font-medium text-xs">ไม่ใช้รหัสพนักงาน หรือชื่อจริงมาตั้งเป็นรหัสผ่าน</span>
            </div>

            <div className={`flex items-center gap-2 ${confirmPassword && isMatched ? 'text-green-600' : 'text-gray-500'}`}>
              {confirmPassword && isMatched ? <CheckCircle2 size={16} /> : <div className="w-4 h-4 rounded-full border-2 border-gray-300" />}
              <span className="font-medium text-xs">รหัสผ่านตรงกัน</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={!isAllValid || isLoading}
            className="w-full py-4 rounded-2xl bg-[#00468B] hover:bg-[#003569] active:scale-[0.98] text-white font-black text-lg transition-all shadow-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="animate-spin" size={24} /> : 'บันทึกและเข้าใช้งาน'}
          </button>
        </form>
      </div>
    </div>
  );
}
