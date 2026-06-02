import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, DynamicForm, Schedule, Submission, SystemSettings, AppContextType, Alert, ProtocolBundle } from './types';
import { api } from './api';
import { getShiftStatus, getLocalTodayStr } from './utils/shiftTime';

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
  // Check if we have a token
  const hasToken = !!localStorage.getItem('xray_jwt_token');
  const [forms, setForms] = useState<DynamicForm[]>([]);
  const [bundles, setBundles] = useState<ProtocolBundle[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [announcements, setAnnouncements] = useState<string[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({
    hospitalName: "โรงพยาบาลกรุงเทพสิริโรจน์",
    supervisorEmail: "supervisor@hospital.com",
    escalationEmail: "director@hospital.com",
    departments: ["IMAGING", "MRI"],
    slaHours: {
      Morning: 3,
      Afternoon: 2,
      Night: 2
    },
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

        let usersData: User[] = [];
        let formsData: DynamicForm[] = [];
        let schedulesData: Schedule[] = [];
        let bundlesData: ProtocolBundle[] = [];
        let alertsData: Alert[] = [];
        let configData: { settings: SystemSettings; announcements: string[] } | undefined;

        // Config is needed for LandingPage (hospitalName)
        configData = await api.config.get();

        if (hasToken) {
          [
            usersData,
            formsData,
            schedulesData,
            bundlesData,
            alertsData,
          ] = await Promise.all([
            api.users.getAll(),
            api.forms.getAll(),
            api.schedules.getAll(),
            api.bundles.getAll(),
            api.alerts.getAll(),
          ]);
        } else {
          // Unauthenticated state: load only public user list
          usersData = await api.users.getPublic() as User[];
          formsData = [];
          schedulesData = [];
          bundlesData = [];
          alertsData = [];
        }

        setUsers(usersData);
        setForms(formsData);
        setSchedules(schedulesData);
        setBundles(bundlesData);
        setAlerts(alertsData);
        // Fetch submissions separately (limit 200 for global state)
        if (hasToken) {
          api.submissions.getAll(1, 200).then(res => setSubmissions(res.data)).catch(() => {});
        }
        const defaultSettings: SystemSettings = {
          hospitalName: "โรงพยาบาลกรุงเทพสิริโรจน์",
          supervisorEmail: "supervisor@hospital.com",
          escalationEmail: "director@hospital.com",
          departments: ["IMAGING", "MRI"],
          slaHours: { Morning: 1.5, Afternoon: 1.5, Night: 1.5 },
          lockoutHours: { Morning: 3, Afternoon: 2, Night: 2 },
          shifts: { Morning: "08:00 - 16:00", Afternoon: "16:00 - 00:00", Night: "00:00 - 08:00" },
        };
        const mergedSettings: SystemSettings = { ...defaultSettings, ...(configData.settings as Partial<SystemSettings>) };
        // Also deep-merge nested objects so old rows without slaHours/shifts still work
        if (!(configData.settings as SystemSettings)?.slaHours) mergedSettings.slaHours = defaultSettings.slaHours;
        if (!(configData.settings as SystemSettings)?.lockoutHours) mergedSettings.lockoutHours = defaultSettings.lockoutHours;
        if (!(configData.settings as SystemSettings)?.shifts) mergedSettings.shifts = defaultSettings.shifts;
        if (!(configData.settings as SystemSettings)?.departments) mergedSettings.departments = defaultSettings.departments;
        setSettings(mergedSettings);
        setAnnouncements(configData.announcements as string[]);
      } catch (error) {
        console.error('Failed to load data from API:', error);
        setLoadError(error instanceof Error ? error.message : 'Failed to connect to server');
      } finally {
        setIsLoading(false);
      }
    };
    fetchAll();
  }, [hasToken]);

  // Persist currentUser to localStorage (for page reload, since no auth yet)
  const setCurrentUser = useCallback((user: User | null) => {
    setCurrentUserState(user);
    if (user) {
      localStorage.setItem('xray_currentUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('xray_currentUser');
      localStorage.removeItem('xray_jwt_token');
      window.location.reload(); // Reload to clear states and fetch public data
    }
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
    setSubmissions(prev => {
      const exists = prev.find(s => s.id === submission.id);
      return exists ? prev.map(s => s.id === submission.id ? submission : s) : [...prev, submission];
    });
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
    api.submissions.create(submission)
      .then(saved => {
        setSubmissions(prev => prev.map(s => s.id === submission.id ? saved : s));
      })
      .catch(err => {
        console.error('Failed to create submission:', err);
      });
  }, [users, forms, addAlert]);

  const deleteSubmission = useCallback(async (id: string) => {
    // Optimistic: find scheduleId from global state and reset it
    const sub = submissions.find(s => s.id === id);
    setSubmissions(prev => prev.filter(s => s.id !== id));
    if (sub?.scheduleId) {
      setSchedules(prev => prev.map(s => s.id === sub.scheduleId ? { ...s, status: 'Pending' as const } : s));
    }
    try {
      await api.submissions.delete(id);
    } catch (err) {
      console.error('Failed to delete submission:', err);
      // Rollback on error: re-fetch
      api.submissions.getAll(1, 200).then(res => setSubmissions(res.data)).catch(() => {});
    }
  }, [submissions]);

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
  // Client-side overdue alert check
  // Fires ONCE per schedule per alert window (tracked in localStorage)
  // Morning alert @2h from 08:00, Afternoon/Night alert @1h from shift start
  // ============================================
  useEffect(() => {
    if (isLoading) return;

    const checkOverdue = () => {
      const now = new Date();
      const dateStr = getLocalTodayStr(now);
      const sentKey = `sent_alerts_${dateStr}`;
      const sentSet: Set<string> = new Set(JSON.parse(localStorage.getItem(sentKey) || '[]'));

      const shiftsToCheck: Array<'Morning' | 'Afternoon' | 'Night'> = ['Morning', 'Afternoon', 'Night'];

      let didSend = false;
      shiftsToCheck.forEach(shift => {
        const { isAlertTime: shouldAlert } = getShiftStatus(dateStr, shift, now);
        if (!shouldAlert) return;

        const overdue = schedules.filter(s =>
          s.date === dateStr &&
          s.shift === shift &&
          s.status === 'Pending'
        );

        overdue.forEach(s => {
          const alertKey = `alert-${s.id}`;
          // Only fire once — skip if already sent today
          if (sentSet.has(alertKey)) return;

          const staff = users.find(u => u.id === s.staffId);
          const form = forms.find(f => f.id === s.formId);
          const shiftTh = shift === 'Morning' ? 'เช้า' : shift === 'Afternoon' ? 'บ่าย' : 'ดึก';
          const alertAfter = shift === 'Morning' ? 2 : 1;

          addAlert({
            type: 'Missed Task',
            message: `⚠️ แจ้งเตือน: ${staff?.name} ยังไม่ได้กรอก ${form?.title} (ผ่านไป ${alertAfter} ชม.ของเวร${shiftTh}) [${alertKey}]`,
            staffId: s.staffId,
            formId: s.formId
          });

          sentSet.add(alertKey);
          didSend = true;
        });
      });

      if (didSend) {
        localStorage.setItem(sentKey, JSON.stringify([...sentSet]));
      }
    };

    // Check every 60 seconds (lightweight, but alert fires only once per key)
    const interval = setInterval(checkOverdue, 60000);
    checkOverdue();
    return () => clearInterval(interval);
  }, [isLoading, schedules, users, forms, addAlert]);

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

  const resetData = useCallback(async () => {
    await api.resetData();
    // Clear client state immediately (no reload needed)
    setSubmissions([]);
    setSchedules([]);
    setAlerts([]);
  }, []);

  const clearLogs = useCallback(() => {
    setSubmissions([]);
    setSchedules(prev => prev.map(s => ({ ...s, status: 'Pending' as const })));
    setAlerts([]);
    // Note: This is a client-side clear; a full server-side clear would need additional endpoints
  }, []);

  const exportData = useCallback(async () => {
    const data = await api.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xray-system-export-${getLocalTodayStr()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const getStaffSchedule = useCallback((staffId: string, date: string) => {
    return schedules.filter(s => s.staffId === staffId && s.date === date);
  }, [schedules]);

  const getCompletionRate = useCallback((date: string, department?: string) => {
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
      isLoading, loadError,
      currentUser, setCurrentUser, users, addUser, updateUser, deleteUser,
      forms, addForm, updateForm, deleteForm, 
      bundles, addBundle, updateBundle, deleteBundle,
      schedules, addSchedule, deleteSchedule, bulkDeleteSchedules,
      submissions, submitForm, deleteSubmission, getStaffSchedule, getCompletionRate,
      announcements, addAnnouncement,
      alerts, addAlert, markAlertAsRead,
      language, setLanguage,
      settings, updateSettings, resetDatabase, resetData, exportData, clearLogs
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
