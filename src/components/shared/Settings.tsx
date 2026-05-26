import React, { useState } from 'react';
import { useApp } from '../../AppContext';
import { Building2, Mail, Save, RefreshCw, Trash2, ShieldAlert, Clock } from 'lucide-react';
import { translations } from '../../i18n';
import type { Shift, SystemSettings } from '../../types';

const Settings: React.FC = () => {
  const { settings, updateSettings, resetDatabase, clearLogs, language } = useApp();
  const t = translations[language];

  const [localSettings, setLocalSettings] = useState<SystemSettings>(settings);
  const [isTestingEmail, setIsTestingEmail] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(localSettings);
    alert('System settings updated successfully.');
  };

  const handleTestEmail = async () => {
    if (!localSettings.supervisorEmail) {
      alert('กรุณากรอกอีเมลก่อนทำการทดสอบ (Please enter an email address first)');
      return;
    }
    setIsTestingEmail(true);
    try {
      const res = await fetch('/api/test-email', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: localSettings.supervisorEmail })
      });
      const data = await res.json();
      if (data.success) {
        alert('✅ ส่งอีเมลทดสอบสำเร็จ! กรุณาตรวจสอบกล่องจดหมายของคุณ (✅ Test email sent successfully!)');
      } else {
        alert('❌ ไม่สามารถส่งอีเมลได้ (Failed to send email): ' + data.error);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      alert('❌ เกิดข้อผิดพลาดในการเชื่อมต่อ (Connection error): ' + error.message);
    } finally {
      setIsTestingEmail(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">{t.settings}</h1>
        <p className="text-sm text-gray-500 font-medium">Configure global system parameters and maintenance tasks</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <form onSubmit={handleSave} className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-8">
            <h3 className="text-sm font-black text-[#00468B] uppercase tracking-widest border-b border-gray-50 pb-4">
               Global Configuration
            </h3>

            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center">
                  <Building2 size={12} className="mr-1.5" />
                  {t.hospitalName}
                </label>
                <input 
                  type="text" 
                  value={localSettings.hospitalName}
                  onChange={(e) => setLocalSettings({...localSettings, hospitalName: e.target.value})}
                  className="w-full border-2 border-gray-50 rounded-xl p-4 bg-gray-50 font-bold text-gray-700 focus:border-blue-500 outline-none transition-all"
                  placeholder="e.g., General Hospital Imaging"
                />
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center">
                    <Mail size={12} className="mr-1.5" />
                    {t.supervisorEmail}
                  </label>
                  <div className="flex space-x-2">
                    <input 
                      type="email" 
                      value={localSettings.supervisorEmail}
                      onChange={(e) => setLocalSettings({...localSettings, supervisorEmail: e.target.value})}
                      className="flex-1 border-2 border-gray-50 rounded-xl p-4 bg-gray-50 font-bold text-gray-700 focus:border-blue-500 outline-none transition-all"
                      placeholder="supervisor@hospital.com"
                    />
                    <button 
                      type="button"
                      onClick={handleTestEmail}
                      disabled={isTestingEmail}
                      className="bg-blue-50 text-[#00468B] px-6 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-blue-100 transition-all disabled:opacity-50 flex items-center justify-center min-w-[100px]"
                    >
                      {isTestingEmail ? (
                        <div className="w-4 h-4 border-2 border-[#00468B] border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        'Test Email'
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center">
                  <Clock size={12} className="mr-1.5" />
                  Shift Time Definitions
                </label>
                <div className="grid grid-cols-1 gap-4">
                  {(['Morning', 'Afternoon', 'Night'] as Shift[]).map(s => (
                    <div key={s} className="flex items-center space-x-4">
                       <span className="w-24 text-[10px] font-black text-[#00468B] uppercase">{s}</span>
                       <input 
                        type="text" 
                        value={localSettings.shifts[s]}
                        onChange={(e) => setLocalSettings({
                          ...localSettings, 
                          shifts: { ...localSettings.shifts, [s]: e.target.value }
                        })}
                        className="flex-1 border-2 border-gray-50 rounded-xl p-3 bg-gray-50 font-bold text-gray-700 focus:border-blue-500 outline-none transition-all"
                        placeholder="e.g., 08:00 - 16:00"
                       />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-[#00468B] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#003569] transition-all shadow-xl shadow-blue-900/10 flex items-center justify-center space-x-2"
            >
              <Save size={18} />
              <span>{t.saveSettings}</span>
            </button>
          </form>
        </div>

        <div className="md:col-span-1 space-y-6">
           <div className="bg-red-50 rounded-3xl p-8 border-2 border-red-100 shadow-sm space-y-6">
              <div className="flex items-center space-x-3 text-red-600">
                 <ShieldAlert size={24} />
                 <h3 className="font-black text-xs uppercase tracking-widest">{t.databaseMaintenance}</h3>
              </div>

              <p className="text-xs text-red-800/60 font-medium leading-relaxed">
                Warning: These actions are destructive and cannot be undone. 
              </p>

              <div className="space-y-3 pt-2">
                 <button 
                  onClick={() => {
                    if (confirm('Permanently clear all submission records? Existing schedules will be reset to Pending.')) {
                      clearLogs();
                    }
                  }}
                  className="w-full bg-white text-red-600 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest border border-red-200 hover:bg-red-100 transition-all flex items-center justify-center space-x-2"
                 >
                    <Trash2 size={14} />
                    <span>{t.clearLogs}</span>
                 </button>

                 <button 
                  onClick={() => {
                    if (confirm('CRITICAL: This will erase all forms, users, and schedules. The system will reload with factory default data. Continue?')) {
                      resetDatabase();
                    }
                  }}
                  className="w-full bg-red-600 text-white py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg hover:bg-red-700 transition-all flex items-center justify-center space-x-2"
                 >
                    <RefreshCw size={14} />
                    <span>{t.resetDatabase}</span>
                 </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;