import React, { createContext, useContext, useState } from 'react';
import type { User, DynamicForm, Schedule, Submission, SystemSettings, AppContextType, Alert, Shift, ProtocolBundle, DatabaseSchema } from './types';

const AppContext = createContext<AppContextType | undefined>(undefined);

import db from './data/db.json';

const typedDb = db as DatabaseSchema;

const MOCK_USERS: User[] = typedDb.users;
const MOCK_FORMS: DynamicForm[] = typedDb.forms;
const INITIAL_SCHEDULES: Schedule[] = typedDb.schedules;
const MOCK_BUNDLES: ProtocolBundle[] = typedDb.bundles || [];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<'TH' | 'EN'>('TH');
  
  // Persistence logic
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('xray_users');
    return saved ? JSON.parse(saved) : MOCK_USERS;
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('xray_currentUser');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [forms, setForms] = useState<DynamicForm[]>(() => {
    const saved = localStorage.getItem('xray_forms');
    return saved ? JSON.parse(saved) : MOCK_FORMS;
  });

  const [bundles, setBundles] = useState<ProtocolBundle[]>(() => {
    const saved = localStorage.getItem('xray_bundles');
    return saved ? JSON.parse(saved) : MOCK_BUNDLES;
  });
  
  const [schedules, setSchedules] = useState<Schedule[]>(() => {
    const saved = localStorage.getItem('xray_schedules');
    return saved ? JSON.parse(saved) : INITIAL_SCHEDULES;
  });
  
  const [submissions, setSubmissions] = useState<Submission[]>(() => {
    const saved = localStorage.getItem('xray_submissions');
    return saved ? JSON.parse(saved) : [];
  });

  const [alerts, setAlerts] = useState<Alert[]>(() => {
    const saved = localStorage.getItem('xray_alerts');
    return saved ? JSON.parse(saved) : [];
  });

  const [announcements, setAnnouncements] = useState<string[]>(() => {
    const saved = localStorage.getItem('xray_announcements');
    return saved ? JSON.parse(saved) : [
      "New JCI Standards for medical imaging have been updated in the system.",
      "Biomedical Engineering maintenance window starts at 22:00 tonight."
    ];
  });

  const [settings, setSettings] = useState<SystemSettings>(() => {
    const saved = localStorage.getItem('xray_settings');
    return saved ? JSON.parse(saved) : {
      hospitalName: "โรงพยาบาลกรุงเทพสิริโรจน์",
      supervisorEmail: "supervisor@hospital.com",
      shifts: {
        Morning: "08:00 - 16:00",
        Afternoon: "16:00 - 00:00",
        Night: "00:00 - 08:00"
      }
    };
  });

  React.useEffect(() => {
    localStorage.setItem('xray_users', JSON.stringify(users));
    localStorage.setItem('xray_currentUser', JSON.stringify(currentUser));
    localStorage.setItem('xray_forms', JSON.stringify(forms));
    localStorage.setItem('xray_bundles', JSON.stringify(bundles));
    localStorage.setItem('xray_schedules', JSON.stringify(schedules));
    localStorage.setItem('xray_submissions', JSON.stringify(submissions));
    localStorage.setItem('xray_announcements', JSON.stringify(announcements));
    localStorage.setItem('xray_settings', JSON.stringify(settings));
    localStorage.setItem('xray_alerts', JSON.stringify(alerts));
  }, [users, currentUser, forms, bundles, schedules, submissions, announcements, settings, alerts]);

  const addUser = (user: User) => setUsers(prev => [...prev, user]);
  const updateUser = (user: User) => setUsers(prev => prev.map(u => u.id === user.id ? user : u));
  const deleteUser = (id: string) => setUsers(prev => prev.filter(u => u.id !== id));

  const addForm = (form: DynamicForm) => setForms(prev => [...prev, form]);
  const updateForm = (form: DynamicForm) => setForms(prev => prev.map(f => f.id === form.id ? form : f));
  const deleteForm = (id: string) => setForms(prev => prev.filter(f => f.id !== id));

  const addBundle = (bundle: ProtocolBundle) => setBundles(prev => [...prev, bundle]);
  const updateBundle = (bundle: ProtocolBundle) => setBundles(prev => prev.map(b => b.id === bundle.id ? bundle : b));
  const deleteBundle = (id: string) => setBundles(prev => prev.filter(b => b.id !== id));

  const addSchedule = (schedule: Schedule | Schedule[]) => {
    if (Array.isArray(schedule)) {
      setSchedules(prev => [...prev, ...schedule]);
    } else {
      setSchedules(prev => [...prev, schedule]);
    }
  };
  
  const deleteSchedule = (id: string) => setSchedules(prev => prev.filter(s => s.id !== id));
  const bulkDeleteSchedules = (ids: string[]) => setSchedules(prev => prev.filter(s => !ids.includes(s.id)));

  const addAlert = (alert: Omit<Alert, 'id' | 'isRead' | 'timestamp'>) => {
    const newAlert: Alert = {
      ...alert,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      isRead: false
    };
    setAlerts(prev => [newAlert, ...prev].slice(0, 50));
  };

  const submitForm = (submission: Submission) => {
    setSubmissions(prev => [...prev, submission]);
    setSchedules(prev => prev.map(s => s.id === submission.scheduleId ? { ...s, status: 'Completed' } : s));

    const staff = users.find(u => u.id === submission.staffId);
    const form = forms.find(f => f.id === submission.formId);

    // Auto-alert logic for clinical failures
    const hasCritical = Object.values(submission.data).some(v => v === 'Fail' || v === 'Alert');
    if (hasCritical) {
      addAlert({
        type: 'Critical Failure',
        message: `CRITICAL: Failure reported by ${staff?.name} in ${form?.title}. Urgent inspection required.`,
        staffId: submission.staffId,
        formId: submission.formId
      });
    }

    // Environmental Alerts (Temp: 18-24, Humidity: 45-65)
    const temp = parseFloat(String(submission.data['q3'])); // Standard ID for temp in these forms
    const humidity = parseFloat(String(submission.data['q5'] || submission.data['q6'])); // Standard IDs for humidity
    
    let envAlert = '';
    if (!isNaN(temp) && (temp < 18 || temp > 24)) {
      envAlert += `อุณหภูมิ (${temp}°C) ไม่อยู่ในเกณฑ์ 18-24°C. `;
    }
    if (!isNaN(humidity) && (humidity < 45 || humidity > 65)) {
      envAlert += `ความชื้น (${humidity}%RH) ไม่อยู่ในเกณฑ์ 45-65%RH. `;
    }

    if (envAlert) {
      addAlert({
        type: 'Critical Failure',
        message: `⚠️ ALERT [${form?.title}]: ${envAlert} กรุณาปรับอุณหภูมิ/ความชื้น และตรวจเช็คใหม่ใน 1 ชม. หากยังไม่ปกติให้แจ้งช่างทันที`,
        staffId: submission.staffId,
        formId: submission.formId
      });
    }
  };

  const addAnnouncement = (text: string) => setAnnouncements([text, ...announcements].slice(0, 5));

  const markAlertAsRead = (id: string) => {
    setAlerts(alerts.map(a => a.id === id ? { ...a, isRead: true } : a));
  };

  const updateSettings = (newSettings: SystemSettings) => setSettings(newSettings);

  // Automated Alert Check (1 hour delay)
  React.useEffect(() => {
    const checkOverdue = () => {
      const now = new Date();
      const hour = now.getHours();
      const dateStr = now.toISOString().split('T')[0];
      
      // Determine current shift based on standard definitions with 1 hour delay
      let currentShift: Shift | null = null;
      
      if (hour >= 9 && hour < 16) {
        currentShift = 'Morning';
      } else if (hour >= 17 && hour < 24) {
        currentShift = 'Afternoon';
      } else if (hour >= 1 && hour < 8) {
        currentShift = 'Night';
      }

      if (currentShift) {
        const overdue = schedules.filter(s => 
          s.date === dateStr && 
          s.shift === currentShift && 
          s.status === 'Pending'
        );

        overdue.forEach(s => {
          // Check if alert already exists for this schedule on this day
          const exists = alerts.some(a => a.id.startsWith(`missed_${s.id}`));
          
          if (!exists) {
            const staff = users.find(u => u.id === s.staffId);
            const form = forms.find(f => f.id === s.formId);
            
            const newAlert: Alert = {
              id: `missed_${s.id}_${Date.now()}`,
              type: 'Missed Task',
              message: `⚠️ แจ้งเตือน: ${staff?.name} ยังไม่ได้ทำ ${form?.title} (เกิน 1 ชม. ของเวร${currentShift === 'Morning' ? 'เช้า' : currentShift === 'Afternoon' ? 'บ่าย' : 'ดึก'})`,
              timestamp: new Date().toISOString(),
              isRead: false,
              staffId: s.staffId,
              formId: s.formId
            };
            
            setAlerts(prev => [newAlert, ...prev].slice(0, 50));
          }
        });
      }
    };

    const interval = setInterval(checkOverdue, 60000 * 10); // Check every 10 mins
    checkOverdue();
    return () => clearInterval(interval);
  }, [schedules, alerts, users, forms]);

  const resetDatabase = () => {
    localStorage.clear();
    window.location.reload();
  };

  const clearLogs = () => {
    setSubmissions([]);
    setSchedules(schedules.map(s => ({ ...s, status: 'Pending' })));
    setAlerts([]);
  };

  const getStaffSchedule = (staffId: string, date: string) => {
    return schedules.filter(s => s.staffId === staffId && s.date === date);
  };

  const getCompletionRate = (date: string, department?: 'MRI' | 'X-RAY') => {
    let dailySchedules = schedules.filter(s => s.date === date);
    
    if (department) {
      dailySchedules = dailySchedules.filter(s => {
        const form = forms.find(f => f.id === s.formId);
        return form?.department === department;
      });
    }

    if (dailySchedules.length === 0) return 0;
    const completed = dailySchedules.filter(s => s.status === 'Completed').length;
    return (completed / dailySchedules.length) * 100;
  };

  return (
    <AppContext.Provider value={{
      currentUser, setCurrentUser, users, addUser, updateUser, deleteUser,
      forms, addForm, updateForm, deleteForm, 
      bundles, addBundle, updateBundle, deleteBundle,
      schedules, addSchedule, deleteSchedule, bulkDeleteSchedules,
      submissions, submitForm, getStaffSchedule, getCompletionRate,
      announcements, addAnnouncement,
      alerts, addAlert, markAlertAsRead,
      language, setLanguage,
      settings, updateSettings, resetDatabase, clearLogs
    }}>
      {children}
    </AppContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
