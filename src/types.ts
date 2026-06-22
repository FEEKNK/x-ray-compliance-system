export type Role = 'ADMIN' | 'STAFF';

export interface User {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  email: string;
  role: Role;
  requirePasswordChange?: boolean;
  sortOrder?: number;
}

export interface QuestionBlock {
  id: string;
  label: string;
  type: 'text' | 'number' | 'yesno' | 'composite' | 'select' | 'date';
  required: boolean;
  options?: string[];
  allowCustomInput?: boolean;
  config?: {
    photoRequired?: boolean;
    autoFillToday?: boolean;
  };
}

export interface DynamicForm {
  id: string;
  title: string;
  description: string;
  questions: QuestionBlock[];
  isActive: boolean;
  createdAt: string;
  shifts?: Shift[];
  department?: string;
}

export type Shift = 'Morning' | 'Afternoon' | 'Night' | 'NightBeforeMorning';

export interface Schedule {
  id: string;
  date: string;
  shift: Shift;
  staffId: string;
  formId?: string;
  location?: string;
  supervisorId: string;
  status: 'Pending' | 'Completed';
}

export interface Submission {
  id: string;
  scheduleId: string;
  staffId: string;
  formId: string;
  submittedAt: string;
  data: Record<string, string | number | boolean | string[]>;
  photos: string[];
}

export interface SystemSettings {
  hospitalName: string;
  supervisorEmail: string;
  escalationEmail: string;
  departments: string[];
  slaHours: {
    Morning: number;
    Afternoon: number;
    Night: number;
    NightBeforeMorning: number;
  };
  lockoutHours: {
    Morning: number;
    Afternoon: number;
    Night: number;
    NightBeforeMorning: number;
  };
  shifts: {
    Morning: string;
    Afternoon: string;
    Night: string;
    NightBeforeMorning: string;
  };
  autoBackupEnabled?: boolean;
}

export interface Alert {
  id: string;
  type: 'Missed Task' | 'Critical Failure';
  message: string;
  timestamp: string;
  isRead: boolean;
  staffId?: string;
  formId?: string;
}

export interface ProtocolBundle {
  id: string;
  name: string;
  department: string;
  formIds: string[];
}

export interface AppContextType {
  isLoading: boolean;
  loadError: string | null;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  language: 'TH' | 'EN';
  setLanguage: (lang: 'TH' | 'EN') => void;
  settings: SystemSettings;
  setSettings: (settings: SystemSettings) => void;
  announcements: string[];
  
  // Keep these global actions here for now or move to separate hooks
  resetDatabase: () => void;
  resetData: () => Promise<void>;
  exportData: (prefix?: string) => Promise<void>;
  clearLogs: () => void;
}

export interface DatabaseSchema {
  users: User[];
  forms: DynamicForm[];
  schedules: Schedule[];
  submissions: Submission[];
  bundles: ProtocolBundle[];
  // Add other top-level properties from db.json if any
}
