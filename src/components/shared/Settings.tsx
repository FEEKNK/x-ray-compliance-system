import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../AppContext';
import { Building2, Mail, Save, RefreshCw, Trash2, ShieldAlert, Clock, Loader2, CheckCircle, DatabaseBackup, ClockAlert, Plus, X, Layers, Lock, BellRing } from 'lucide-react';
import { useUpdateSettings } from '../../hooks/queries';
import { translations } from '../../i18n';
import type { Shift, SystemSettings } from '../../types';
import { api } from '../../api';

const Settings: React.FC = () => {
  const { settings, resetDatabase, language, resetData, exportData } = useApp();
  const { mutateAsync: updateSettings } = useUpdateSettings();
  const t = translations[language];

  const [localSettings, setLocalSettings] = useState<SystemSettings>(settings);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [newDept, setNewDept] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSendingTestSLA, setIsSendingTestSLA] = useState(false);
  const [testSLAResult, setTestSLAResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync localSettings whenever global settings finish loading from the server
  useEffect(() => {
    let ignore = false;
    if (settings && Object.keys(settings).length > 0) {
      Promise.resolve().then(() => {
        if (!ignore) setLocalSettings(settings);
      });
    }
    return () => { ignore = true; };
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettings(localSettings);
      
      // Trigger SLA check immediately in the background without waiting 1 minute
      api.config.triggerSla().catch(err => console.error('Failed to trigger SLA check immediately', err));

      alert('System settings updated successfully. SLA limits applied and checked immediately.');
    } catch (err) {
      console.error(err);
      alert('Failed to update system settings.');
    }
  };

  const handleTestEmail = async () => {
    if (!localSettings.supervisorEmail) {
      alert('กรุณากรอกอีเมลก่อนทำการทดสอบ (Please enter an email address first)');
      return;
    }
    setIsTestingEmail(true);
    try {
      const data = await api.config.testEmail(localSettings.supervisorEmail);
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

  const handleResetData = async () => {
    setIsResetting(true);
    try {
      await resetData();
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 3000);
    } finally {
      setIsResetting(false);
      setShowResetConfirm(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportData();
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('CRITICAL WARNING: This will permanently DELETE your current database and replace it with the backup file. Are you absolutely sure you want to proceed?')) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsImporting(true);
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      
      await api.importData(payload);
      
      setResetSuccess(true);
      setTimeout(() => {
        setResetSuccess(false);
        window.location.reload();
      }, 2000);
    } catch (err) {
      console.error('Import failed:', err);
      alert('Failed to import backup: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Wait until all nested settings objects have loaded from the server
  const isLoaded = localSettings?.slaHours && localSettings?.shifts && localSettings?.departments;

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-3 text-gray-400">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-[#00468B] rounded-full animate-spin" />
          <span className="text-xs font-bold uppercase tracking-widest">Loading Settings...</span>
        </div>
      </div>
    );
  }

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
                
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center">
                    <Mail size={12} className="mr-1.5" />
                    Escalation Email (Level 2 Alert)
                  </label>
                  <input 
                    type="email" 
                    value={localSettings.escalationEmail}
                    onChange={(e) => setLocalSettings({...localSettings, escalationEmail: e.target.value})}
                    className="w-full border-2 border-gray-50 rounded-xl p-4 bg-gray-50 font-bold text-gray-700 focus:border-blue-500 outline-none transition-all"
                    placeholder="director@hospital.com"
                  />
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-50">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center">
                  <Layers size={12} className="mr-1.5" />
                  Department Configurations
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {(localSettings?.departments || []).map(dept => (
                    <span key={dept} className="bg-[#00468B] text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2">
                      {dept}
                      <button type="button" onClick={() => setLocalSettings({
                        ...localSettings,
                        departments: (localSettings?.departments || []).filter(d => d !== dept)
                      })} className="hover:text-red-300">
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <input 
                    type="text" 
                    value={newDept}
                    onChange={e => setNewDept(e.target.value.toUpperCase())}
                    className="flex-1 border-2 border-gray-50 rounded-xl p-3 bg-gray-50 font-bold text-gray-700 focus:border-blue-500 outline-none transition-all text-sm"
                    placeholder="Add new department (e.g. CT SCAN)"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newDept && !localSettings.departments.includes(newDept)) {
                          setLocalSettings({...localSettings, departments: [...localSettings.departments, newDept]});
                          setNewDept('');
                        }
                      }
                    }}
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      if (newDept && !localSettings.departments.includes(newDept)) {
                        setLocalSettings({...localSettings, departments: [...localSettings.departments, newDept]});
                        setNewDept('');
                      }
                    }}
                    className="bg-gray-100 text-gray-600 px-4 rounded-xl font-bold hover:bg-gray-200 transition-all flex items-center justify-center"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-50">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center">
                  <ClockAlert size={12} className="mr-1.5" />
                  SLA Alert Limits (Hours)
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {(['Morning', 'Afternoon', 'Night'] as Shift[]).map(s => (
                    <div key={`sla-${s}`}>
                       <label className="block text-[10px] font-black text-[#00468B] uppercase mb-1">{s}</label>
                       <input 
                        type="number"
                        step="0.5"
                        min="0.5" max="12"
                        value={localSettings.slaHours[s]}
                        onChange={(e) => setLocalSettings({
                          ...localSettings, 
                          slaHours: { ...localSettings.slaHours, [s]: Number(e.target.value) }
                        })}
                        className="w-full border-2 border-gray-50 rounded-xl p-3 bg-gray-50 font-bold text-gray-700 focus:border-blue-500 outline-none transition-all text-center"
                       />
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-50">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center">
                  <Lock size={12} className="mr-1.5" />
                  Form Lock Limits (Hours after shift start)
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {(['Morning', 'Afternoon', 'Night'] as Shift[]).map(s => (
                    <div key={`lock-${s}`}>
                       <label className="block text-[10px] font-black text-[#00468B] uppercase mb-1">{s}</label>
                       <input 
                        type="number"
                        step="0.5"
                        min="0.5" max="24"
                        value={localSettings.lockoutHours[s]}
                        onChange={(e) => setLocalSettings({
                          ...localSettings, 
                          lockoutHours: { ...localSettings.lockoutHours, [s]: Number(e.target.value) }
                        })}
                        className="w-full border-2 border-gray-50 rounded-xl p-3 bg-gray-50 font-bold text-gray-700 focus:border-blue-500 outline-none transition-all text-center"
                       />
                    </div>
                  ))}
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
           {/* Backup & Restore Section */}
           <div className="bg-blue-50/50 rounded-3xl p-6 border-2 border-blue-100 shadow-sm space-y-4">
              <div className="flex items-center space-x-3 text-[#00468B]">
                 <DatabaseBackup size={20} />
                 <h3 className="font-black text-xs uppercase tracking-widest">Backup & Restore</h3>
              </div>
              <p className="text-xs text-blue-800/60 font-medium leading-relaxed">
                Save or restore your system data.
              </p>
              <div className="space-y-3 pt-2">
                 <button 
                  type="button"
                  onClick={handleExport}
                  disabled={isExporting || isImporting}
                  className="w-full bg-white text-[#00468B] py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest border border-blue-200 hover:bg-blue-50 transition-all flex items-center justify-center space-x-2 shadow-sm"
                 >
                    {isExporting ? <Loader2 size={14} className="animate-spin" /> : <DatabaseBackup size={14} />}
                    <span>Export Full Backup</span>
                 </button>

                 <div>
                   <input 
                     type="file" 
                     accept=".json" 
                     className="hidden" 
                     ref={fileInputRef} 
                     onChange={handleImport} 
                   />
                   <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isExporting || isImporting}
                    className="w-full bg-[#00468B] text-white py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-[#003569] transition-all flex items-center justify-center space-x-2 shadow-sm"
                   >
                      {isImporting ? <Loader2 size={14} className="animate-spin" /> : <DatabaseBackup size={14} className="rotate-180" />}
                      <span>Import Full Backup</span>
                   </button>
                 </div>
              </div>
           </div>

           {/* Test SLA Alert Section */}
           <div className="bg-amber-50 rounded-3xl p-6 border-2 border-amber-200 shadow-sm space-y-4">
              <div className="flex items-center space-x-3 text-amber-700">
                 <BellRing size={20} />
                 <h3 className="font-black text-xs uppercase tracking-widest">ทดสอบแจ้งเตือน SLA</h3>
              </div>
              <p className="text-xs text-amber-800/70 font-medium leading-relaxed">
                ส่งอีเมลแจ้งเตือนทันทีสำหรับตารางงานที่ยังค้างอยู่วันนี้ โดยไม่ต้องรอเวลา SLA
              </p>
              {testSLAResult && (
                <div className="text-xs font-semibold text-amber-900 bg-amber-100 rounded-xl p-3 whitespace-pre-line">
                  {testSLAResult}
                </div>
              )}
              <button
                type="button"
                onClick={async () => {
                  setIsSendingTestSLA(true);
                  setTestSLAResult(null);
                  try {
                    const data = await api.config.testSlaNow();
                    if (data.success) {
                      setTestSLAResult(`✅ ส่งสำเร็จ ${data.total} คน:\n${(data.sent || []).join('\n')}`);
                    } else {
                      setTestSLAResult(`⚠️ ${data.message || data.error}`);
                    }
                  } catch {
                    setTestSLAResult('❌ เชื่อมต่อ server ไม่ได้');
                  } finally {
                    setIsSendingTestSLA(false);
                  }
                }}
                disabled={isSendingTestSLA}
                className="w-full bg-amber-500 text-white py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-amber-600 transition-all flex items-center justify-center space-x-2 shadow-sm disabled:opacity-60"
              >
                {isSendingTestSLA ? <Loader2 size={14} className="animate-spin" /> : <BellRing size={14} />}
                <span>ส่งแจ้งเตือนทดสอบตอนนี้</span>
              </button>
           </div>

           {/* Danger Zone Section */}
           <div className="bg-red-50 rounded-3xl p-6 border-2 border-red-100 shadow-sm space-y-4">
              <div className="flex items-center space-x-3 text-red-600">
                 <ShieldAlert size={20} />
                 <h3 className="font-black text-xs uppercase tracking-widest">Danger Zone</h3>
              </div>
              <p className="text-xs text-red-800/60 font-medium leading-relaxed">
                Warning: Destructive actions. Cannot be undone. 
              </p>
              <div className="space-y-3 pt-2">
                 <button
                  onClick={() => setShowResetConfirm(true)}
                  className="w-full bg-white text-orange-600 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest border border-orange-200 hover:bg-orange-50 transition-all flex items-center justify-center space-x-2 shadow-sm"
                 >
                    <Trash2 size={14} />
                    <span>ล้างข้อมูลทั้งหมด</span>
                 </button>

                 <button 
                  onClick={() => {
                    if (confirm('CRITICAL: This will erase all forms, users, and schedules. The system will reload with factory default data. Continue?')) {
                      resetDatabase();
                    }
                  }}
                  className="w-full bg-red-600 text-white py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-sm hover:bg-red-700 transition-all flex items-center justify-center space-x-2"
                 >
                    <RefreshCw size={14} />
                    <span>{t.resetDatabase}</span>
                 </button>
              </div>
           </div>
        </div>
      </div>
      {/* Reset Confirm Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
                <Trash2 size={30} className="text-orange-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">ยืนยันการล้างข้อมูลทั้งหมด</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  ระบบจะ<strong className="text-red-600">ลบข้อมูลทั้งหมด</strong>ออกจากฐานข้อมูล ได้แก่
                </p>
                <ul className="mt-3 text-sm text-left space-y-2 bg-red-50 rounded-xl p-4">
                  <li className="flex items-center gap-2 text-red-700 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0"></span>ประวัติการตรวจเช็คทั้งหมด (Submissions)</li>
                  <li className="flex items-center gap-2 text-red-700 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0"></span>ตารางงาน / กำหนดการทั้งหมด (Schedules)</li>
                  <li className="flex items-center gap-2 text-red-700 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0"></span>การแจ้งเตือนทั้งหมด (Alerts)</li>
                  <li className="flex items-center gap-2 text-red-700 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0"></span>การจัดกลุ่มแบบฟอร์ม (Bundles)</li>
                </ul>
                <div className="mt-3 p-3 bg-green-50 rounded-xl text-xs text-green-700 font-semibold">
                  ✅ ข้อมูลพนักงานและแบบฟอร์มจะยังคงอยู่
                </div>
                <p className="mt-3 text-xs text-red-500 font-bold">การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                disabled={isResetting}
                className="flex-1 py-3 rounded-xl border-2 border-gray-100 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-all disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleResetData}
                disabled={isResetting}
                className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {isResetting ? (
                  <><Loader2 size={16} className="animate-spin" /> กำลังล้างข้อมูล...</>
                ) : (
                  <><Trash2 size={16} /> ยืนยันล้างข้อมูล</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {resetSuccess && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-green-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-sm">
            <CheckCircle size={20} />
            ล้างข้อมูลสำเร็จ! ระบบพร้อมใช้งาน
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;