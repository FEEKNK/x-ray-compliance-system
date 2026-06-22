import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, SystemSettings, AppContextType } from './types';
import { api } from './api';

const AppContext = createContext<AppContextType | undefined>(undefined);

// Magic number extracted
export const ALERT_CHECK_INTERVAL_MS = 60000;

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<'TH' | 'EN'>('TH');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [currentUser, setCurrentUserState] = useState<User | null>(() => {
    const saved = localStorage.getItem('xray_currentUser');
    return saved ? JSON.parse(saved) : null;
  });

  const [announcements, setAnnouncements] = useState<string[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({
    hospitalName: "โรงพยาบาลกรุงเทพสิริโรจน์",
    supervisorEmail: "supervisor@hospital.com",
    escalationEmail: "director@hospital.com",
    departments: ["IMAGING", "MRI"],
    slaHours: { Morning: 3, Afternoon: 2, Night: 2, NightBeforeMorning: 2 },
    shifts: { Morning: "08:00 - 16:00", Afternoon: "16:00 - 00:00", Night: "00:00 - 08:00", NightBeforeMorning: "04:00 - 08:00" },
    lockoutHours: { Morning: 3, Afternoon: 2, Night: 2, NightBeforeMorning: 2 }
  });

  // Fetch config — uses public endpoint initially (no auth needed for landing page).
  // Full config (with sensitive emails) is fetched after login via setCurrentUser.
  const fetchConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      
      const saved = localStorage.getItem('xray_currentUser');
      // If user is already logged in, fetch full config; otherwise fetch public config
      const configData = saved
        ? await api.config.get().catch(() => api.config.getPublic())
        : await api.config.getPublic();

      const defaultSettings: SystemSettings = {
        hospitalName: "โรงพยาบาลกรุงเทพสิริโรจน์",
        supervisorEmail: "supervisor@hospital.com",
        escalationEmail: "director@hospital.com",
        departments: ["IMAGING", "MRI"],
        slaHours: { Morning: 1.5, Afternoon: 1.5, Night: 1.5, NightBeforeMorning: 1.5 },
        lockoutHours: { Morning: 3, Afternoon: 2, Night: 2, NightBeforeMorning: 2 },
        shifts: { Morning: "08:00 - 16:00", Afternoon: "16:00 - 00:00", Night: "00:00 - 08:00", NightBeforeMorning: "04:00 - 08:00" },
      };
      const mergedSettings = { ...defaultSettings, ...(configData.settings as Partial<SystemSettings>) };
      
      if (!(configData.settings as SystemSettings)?.slaHours) mergedSettings.slaHours = defaultSettings.slaHours;
      else mergedSettings.slaHours = { ...defaultSettings.slaHours, ...(configData.settings as SystemSettings).slaHours };
      
      if (!(configData.settings as SystemSettings)?.lockoutHours) mergedSettings.lockoutHours = defaultSettings.lockoutHours;
      else mergedSettings.lockoutHours = { ...defaultSettings.lockoutHours, ...(configData.settings as SystemSettings).lockoutHours };
      
      if (!(configData.settings as SystemSettings)?.shifts) mergedSettings.shifts = defaultSettings.shifts;
      else mergedSettings.shifts = { ...defaultSettings.shifts, ...(configData.settings as SystemSettings).shifts };
      
      if (!(configData.settings as SystemSettings)?.departments) mergedSettings.departments = defaultSettings.departments;
      
      setSettings(mergedSettings);
      setAnnouncements(configData.announcements as string[]);
    } catch (error) {
      console.error('Failed to load config from API:', error);
      setLoadError(error instanceof Error ? error.message : 'Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch and fetch when currentUser changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchConfig();
  }, [currentUser?.id, fetchConfig]);

  const setCurrentUser = useCallback((user: User | null) => {
    setCurrentUserState(user);
    if (user) {
      localStorage.setItem('xray_currentUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('xray_currentUser');
      api.auth.logout().catch(() => {}).finally(() => {
        window.location.reload();
      });
    }
  }, []);

  const resetDatabase = useCallback(async () => {
    try { await api.seed(); } catch (e) { console.error(e); }
    localStorage.clear();
    window.location.reload();
  }, []);

  const resetData = useCallback(async () => {
    await api.resetData();
  }, []);

  const clearLogs = useCallback(async () => {
    await api.resetData();
  }, []);

  const exportData = useCallback(async (prefix = 'xray-system-export') => {
    const data = await api.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Create timestamp YYYYMMDD_HHMM
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const timestamp = `${year}${month}${day}_${hours}${mins}`;
    
    a.download = `${prefix}_${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  return (
    <AppContext.Provider value={{
      isLoading, loadError,
      currentUser, setCurrentUser,
      language, setLanguage,
      settings, setSettings, announcements,
      resetDatabase, resetData, exportData, clearLogs
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
