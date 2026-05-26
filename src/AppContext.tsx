import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, DynamicForm, Schedule, Submission, SystemSettings, AppContextType, Alert, Shift, ProtocolBundle } from './types';
import { api } from './api';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<'TH' | 'EN'>('TH');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Core data state
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUserState] = useState<User | null>(() => {
    const saved = localStorage.getItem('xray_currentUser');
    return saved ? JSON.parse(saved) : null;
  });
  const [forms, setForms] = useState<DynamicForm[]>([]);
  const [bundles, setBundles] = useState<ProtocolBundle[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [announcements, setAnnouncements] = useState<string[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({
    hospitalName: "โรงพยาบาลกรุงเทพสิริโรจน์",
    supervisorEmail: "supervisor@hospital.com",
    shifts: {
      Morning: "08:00 - 16:00",
      Afternoon: "16:00 - 00:00",
      Night: "00:00 - 08:00"
    }
  });

  // ============================================
  // Initial Data Fetch from API
  // ============================================
  useEffect(() => {
    const fetchAll = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);

        const [
          usersData,
          formsData,
          schedulesData,
          submissionsData,
          bundlesData,
          alertsData,
          configData,
        ] = await Promise.all([
          api.users.getAll(),
          api.forms.getAll(),
          api.schedules.getAll(),
          api.submissions.getAll(),
          api.bundles.getAll(),
          api.alerts.getAll(),
          api.config.get(),
        ]);

        setUsers(usersData);
        setForms(formsData);
        setSchedules(schedulesData);
        setSubmissions(submissionsData);
        setBundles(bundlesData);
        setAlerts(alertsData);
        setSettings(configData.settings as SystemSettings);
        setAnnouncements(configData.announcements as string[]);
      } catch (error) {
        console.error('Failed to load data from API:', error);
        setLoadError(error instanceof Error ? error.message : 'Failed to connect to server');
      } finally {
        setIsLoading(false);
      }
    };
    fetchAll();
  }, []);

  // Persist currentUser to localStorage (for page reload, since no auth yet)
  const setCurrentUser = useCallback((user: User | null) => {
    setCurrentUserState(user);
    localStorage.setItem('xray_currentUser', JSON.stringify(user));
  }, []);

  // ============================================
  // User CRUD — with API sync
  // ============================================
  const addUser = useCallback((user: User) => {
    // Optimistic update
    setUsers(prev => [...prev, user]);
    api.users.create(user)
      .then(saved => {
        // Replace temp with server-generated record
        setUsers(prev => prev.map(u => u.id === user.id ? { ...saved } : u));
      })
      .catch(err => {
        console.error('Failed to create user:', err);
        setUsers(prev => prev.filter(u => u.id !== user.id));
      });
  }, []);

  const updateUser = useCallback((user: User) => {
    setUsers(prev => prev.map(u => u.id === user.id ? user : u));
    api.users.update(user.id, user).catch(err => {
      console.error('Failed to update user:', err);
    });
  }, []);

  const deleteUser = useCallback((id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
    api.users.delete(id).catch(err => {
      console.error('Failed to delete user:', err);
    });
  }, []);

  // ============================================
  // Form CRUD — with API sync
  // ============================================
  const addForm = useCallback((form: DynamicForm) => {
    setForms(prev => [...prev, form]);
    api.forms.create(form)
      .then(saved => {
        setForms(prev => prev.map(f => f.id === form.id ? { ...saved } : f));
      })
      .catch(err => {
        console.error('Failed to create form:', err);
        setForms(prev => prev.filter(f => f.id !== form.id));
      });
  }, []);

  const updateForm = useCallback((form: DynamicForm) => {
    setForms(prev => prev.map(f => f.id === form.id ? form : f));
    api.forms.update(form.id, form).catch(err => {
      console.error('Failed to update form:', err);
    });
  }, []);

  const deleteForm = useCallback((id: string) => {
    setForms(prev => prev.filter(f => f.id !== id));
    api.forms.delete(id).catch(err => {
      console.error('Failed to delete form:', err);
    });
  }, []);

  // ============================================
  // Bundle CRUD — with API sync
  // ============================================
  const addBundle = useCallback((bundle: ProtocolBundle) => {
    setBundles(prev => [...prev, bundle]);
    api.bundles.create(bundle)
      .then(saved => {
        setBundles(prev => prev.map(b => b.id === bundle.id ? { ...saved } : b));
      })
      .catch(err => {
        console.error('Failed to create bundle:', err);
        setBundles(prev => prev.filter(b => b.id !== bundle.id));
      });
  }, []);

  const updateBundle = useCallback((bundle: ProtocolBundle) => {
    setBundles(prev => prev.map(b => b.id === bundle.id ? bundle : b));
    api.bundles.update(bundle.id, bundle).catch(err => {
      console.error('Failed to update bundle:', err);
    });
  }, []);

  const deleteBundle = useCallback((id: string) => {
    setBundles(prev => prev.filter(b => b.id !== id));
    api.bundles.delete(id).catch(err => {
      console.error('Failed to delete bundle:', err);
    });
  }, []);

  // ============================================
  // Schedule CRUD — with API sync
  // ============================================
  const addSchedule = useCallback((schedule: Schedule | Schedule[]) => {
    const items = Array.isArray(schedule) ? schedule : [schedule];
    // Optimistic update
    setSchedules(prev => [...prev, ...items]);
    
    // Sync with API
    api.schedules.create(items)
      .then(saved => {
        const savedArr = Array.isArray(saved) ? saved : [saved];
        setSchedules(prev => {
          // Remove optimistic items and add server-returned items
          const optimisticIds = items.map(i => i.id);
          return [...prev.filter(s => !optimisticIds.includes(s.id)), ...savedArr];
        });
      })
      .catch(err => {
        console.error('Failed to create schedule(s):', err);
        const itemIds = items.map(i => i.id);
        setSchedules(prev => prev.filter(s => !itemIds.includes(s.id)));
      });
  }, []);

  const deleteSchedule = useCallback((id: string) => {
    setSchedules(prev => prev.filter(s => s.id !== id));
    api.schedules.delete(id).catch(err => {
      console.error('Failed to delete schedule:', err);
    });
  }, []);

  const bulkDeleteSchedules = useCallback((ids: string[]) => {
    setSchedules(prev => prev.filter(s => !ids.includes(s.id)));
    api.schedules.bulkDelete(ids).catch(err => {
      console.error('Failed to bulk delete schedules:', err);
    });
  }, []);

  // ============================================
  // Alerts — with API sync
  // ============================================
  const addAlert = useCallback((alert: Omit<Alert, 'id' | 'isRead' | 'timestamp'>) => {
    const newAlert: Alert = {
      ...alert,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      isRead: false
    };
    setAlerts(prev => [newAlert, ...prev].slice(0, 50));

    api.alerts.create(alert)
      .then(saved => {
        setAlerts(prev => prev.map(a => a.id === newAlert.id ? saved : a));
      })
      .catch(err => {
        console.error('Failed to create alert:', err);
      });
  }, []);

  const markAlertAsRead = useCallback((id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a));
    api.alerts.markAsRead(id).catch(err => {
      console.error('Failed to mark alert as read:', err);
    });
  }, []);

  // ============================================
  // Submissions — with API sync
  // ============================================
  const submitForm = useCallback((submission: Submission) => {
    setSubmissions(prev => [...prev, submission]);
    setSchedules(prev => prev.map(s => s.id === submission.scheduleId ? { ...s, status: 'Completed' as const } : s));

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

    // Environmental Alerts (Temp: 18-24, Humidity: 45-65)
    const temp = parseFloat(String(submission.data['q3']));
    const humidity = parseFloat(String(submission.data['q5'] || submission.data['q6']));
    
    let envAlert = '';
    if (!isNaN(temp) && (temp < 18 || temp > 24)) {
      envAlert += `อุณหภูมิ (${temp}°C) ไม่อยู่ในเกณฑ์ 18-24°C. `;
    }
    if (!isNaN(humidity) && (humidity < 45 || humidity > 65)) {
      envAlert += `ความชื้น (${humidity}%RH) ไม่อยู่ในเกณฑ์ 45-65%RH. `;
    }

    if (envAlert) {
      const form = forms.find(f => f.id === submission.formId);
      addAlert({
        type: 'Critical Failure',
        message: `⚠️ ALERT [${form?.title}]: ${envAlert} กรุณาปรับอุณหภูมิ/ความชื้น และตรวจเช็คใหม่ใน 1 ชม. หากยังไม่ปกติให้แจ้งช่างทันที`,
        staffId: submission.staffId,
        formId: submission.formId
      });
    }

    // Sync with API
    api.submissions.create(submission).catch(err => {
      console.error('Failed to create submission:', err);
    });
  }, [users, forms, addAlert]);

  // ============================================
  // Announcements — with API sync
  // ============================================
  const addAnnouncement = useCallback((text: string) => {
    setAnnouncements(prev => [text, ...prev].slice(0, 5));
    api.config.addAnnouncement(text).catch(err => {
      console.error('Failed to add announcement:', err);
    });
  }, []);

  // ============================================
  // Settings — with API sync
  // ============================================
  const updateSettings = useCallback((newSettings: SystemSettings) => {
    setSettings(newSettings);
    api.config.updateSettings(newSettings).catch(err => {
      console.error('Failed to update settings:', err);
    });
  }, []);

  // ============================================
  // Automated Alert Check (1 hour delay) — still client-side
  // ============================================
  useEffect(() => {
    if (isLoading) return;

    const checkOverdue = () => {
      const now = new Date();
      const hour = now.getHours();
      const dateStr = now.toISOString().split('T')[0];
      
      let currentShift: Shift | null = null;
      if (hour >= 9 && hour < 16) currentShift = 'Morning';
      else if (hour >= 17 && hour < 24) currentShift = 'Afternoon';
      else if (hour >= 1 && hour < 8) currentShift = 'Night';

      if (currentShift) {
        const overdue = schedules.filter(s => 
          s.date === dateStr && 
          s.shift === currentShift && 
          s.status === 'Pending'
        );

        overdue.forEach(s => {
          const exists = alerts.some(a => a.message?.includes(s.id));
          
          if (!exists) {
            const staff = users.find(u => u.id === s.staffId);
            const form = forms.find(f => f.id === s.formId);
            
            addAlert({
              type: 'Missed Task',
              message: `⚠️ แจ้งเตือน: ${staff?.name} ยังไม่ได้ทำ ${form?.title} (เกิน 1 ชม. ของเวร${currentShift === 'Morning' ? 'เช้า' : currentShift === 'Afternoon' ? 'บ่าย' : 'ดึก'}) [Task: ${s.id}]`,
              staffId: s.staffId,
              formId: s.formId
            });

            // Send automated reminder email
            fetch('/api/send-reminder-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                staffEmail: staff?.email,
                staffName: staff?.name,
                supervisorEmail: settings.supervisorEmail,
                formTitle: form?.title,
                shift: currentShift
              })
            }).catch(err => console.error('Failed to send reminder email:', err));
          }
        });
      }
    };

    const interval = setInterval(checkOverdue, 60000 * 10);
    checkOverdue();
    return () => clearInterval(interval);
  }, [isLoading, schedules, alerts, users, forms, settings, addAlert]);

  // ============================================
  // Utility Functions
  // ============================================
  const resetDatabase = useCallback(() => {
    localStorage.clear();
    // Re-seed from db.json and reload
    api.seed()
      .then(() => window.location.reload())
      .catch(() => window.location.reload());
  }, []);

  const clearLogs = useCallback(() => {
    setSubmissions([]);
    setSchedules(prev => prev.map(s => ({ ...s, status: 'Pending' as const })));
    setAlerts([]);
    // Note: This is a client-side clear; a full server-side clear would need additional endpoints
  }, []);

  const getStaffSchedule = useCallback((staffId: string, date: string) => {
    return schedules.filter(s => s.staffId === staffId && s.date === date);
  }, [schedules]);

  const getCompletionRate = useCallback((date: string, department?: 'MRI' | 'X-RAY') => {
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
  }, [schedules, forms]);

  // ============================================
  // Loading Screen
  // ============================================
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center space-y-6">
        <div className="w-16 h-16 border-4 border-[#00468B] border-t-transparent rounded-full animate-spin"></div>
        <div className="text-center space-y-2">
          <p className="text-lg font-bold text-gray-700">กำลังโหลดข้อมูล...</p>
          <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Connecting to Database</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center space-y-6 p-8">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
          <span className="text-3xl">⚠️</span>
        </div>
        <div className="text-center space-y-3 max-w-md">
          <p className="text-lg font-bold text-red-700">ไม่สามารถเชื่อมต่อ Server ได้</p>
          <p className="text-sm text-gray-500">{loadError}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-8 py-3 bg-[#00468B] text-white rounded-xl font-bold text-sm hover:bg-[#003569] transition-colors"
          >
            ลองอีกครั้ง
          </button>
        </div>
      </div>
    );
  }

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
