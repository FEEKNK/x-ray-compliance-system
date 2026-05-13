import React, { createContext, useContext, useState } from 'react';
import type { User, DynamicForm, Schedule, Submission, SystemSettings, AppContextType, Alert } from './types';

const AppContext = createContext<AppContextType | undefined>(undefined);

import db from './data/db.json';

const MOCK_USERS: User[] = db.users as User[];
const MOCK_FORMS: DynamicForm[] = db.forms as DynamicForm[];
const INITIAL_SCHEDULES: Schedule[] = db.schedules as Schedule[];

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
      hospitalName: "Metropolitan Imaging Center",
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
    localStorage.setItem('xray_schedules', JSON.stringify(schedules));
    localStorage.setItem('xray_submissions', JSON.stringify(submissions));
    localStorage.setItem('xray_announcements', JSON.stringify(announcements));
    localStorage.setItem('xray_settings', JSON.stringify(settings));
    localStorage.setItem('xray_alerts', JSON.stringify(alerts));
  }, [users, currentUser, forms, schedules, submissions, announcements, settings, alerts]);

  // Line Notify Utility
  const sendLineNotify = async (token: string, message: string) => {
    if (!token) return;
    try {
      console.log(`[LINE NOTIFY] Sending to token ${token.substring(0, 4)}...: ${message}`);
      // In a real production app, this would be a proxy call due to CORS
      /* 
      await fetch('https://notify-api.line.me/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `Bearer ${token}` },
        body: `message=${encodeURIComponent(message)}`
      });
      */
    } catch (e) { console.error(e); }
  };

  const addUser = (user: User) => setUsers([...users, user]);
  const updateUser = (user: User) => setUsers(users.map(u => u.id === user.id ? user : u));
  const deleteUser = (id: string) => setUsers(users.filter(u => u.id !== id));

  const addForm = (form: DynamicForm) => setForms([...forms, form]);
  const updateForm = (form: DynamicForm) => setForms(forms.map(f => f.id === form.id ? form : f));
  const deleteForm = (id: string) => setForms(forms.filter(f => f.id !== id));

  const addSchedule = (schedule: Schedule | Schedule[]) => {
    if (Array.isArray(schedule)) {
      setSchedules([...schedules, ...schedule]);
    } else {
      setSchedules([...schedules, schedule]);
    }
  };
  
  const deleteSchedule = (id: string) => setSchedules(schedules.filter(s => s.id !== id));

  const addAlert = (alert: Omit<Alert, 'id' | 'isRead' | 'timestamp'>) => {
    const newAlert: Alert = {
      ...alert,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      isRead: false
    };
    setAlerts(prev => [newAlert, ...prev].slice(0, 50));

    // Send Line Notification to Supervisor if configured
    if (settings.supervisorLineToken) {
       sendLineNotify(settings.supervisorLineToken, newAlert.message);
    }
  };

  const submitForm = (submission: Submission) => {
    setSubmissions(prev => [...prev, submission]);
    setSchedules(prev => prev.map(s => s.id === submission.scheduleId ? { ...s, status: 'Completed' } : s));

    // Auto-alert logic for clinical failures
    const hasCritical = Object.values(submission.data).some(v => v === 'Fail' || v === 'Alert');
    if (hasCritical) {
      const staff = users.find(u => u.id === submission.staffId);
      const form = forms.find(f => f.id === submission.formId);
      addAlert({
        type: 'Critical Failure',
        message: `CRITICAL: Failure reported by ${staff?.name} in ${form?.title}. Urgent inspection required.`,
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

  const getCompletionRate = (date: string) => {
    const dailySchedules = schedules.filter(s => s.date === date);
    if (dailySchedules.length === 0) return 0;
    const completed = dailySchedules.filter(s => s.status === 'Completed').length;
    return (completed / dailySchedules.length) * 100;
  };

  return (
    <AppContext.Provider value={{
      currentUser, setCurrentUser, users, addUser, updateUser, deleteUser,
      forms, addForm, updateForm, deleteForm, 
      schedules, addSchedule, deleteSchedule, 
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

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
