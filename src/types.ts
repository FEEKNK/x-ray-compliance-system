export type Role = 'ADMIN' | 'STAFF';

export interface User {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  email: string;
  role: Role;
}

export interface QuestionBlock {
  id: string;
  label: string;
  type: 'text' | 'number' | 'yesno' | 'composite' | 'select' | 'date';
  required: boolean;
  options?: string[];
  config?: {
    withPhoto?: boolean;
    photoRequired?: boolean;
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
  department?: 'MRI' | 'X-RAY';
}

export type Shift = 'Morning' | 'Afternoon' | 'Night';

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
  shifts: {
    Morning: string;
    Afternoon: string;
    Night: string;
  };
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
  department: 'MRI' | 'X-RAY';
  formIds: string[];
}

export interface AppContextType {
  currentUser: User | null;
  users: User[];
  forms: DynamicForm[];
  bundles: ProtocolBundle[];
  schedules: Schedule[];
  submissions: Submission[];
  alerts: Alert[];
  setCurrentUser: (user: User | null) => void;
  addUser: (user: User) => void;
  updateUser: (user: User) => void;
  deleteUser: (id: string) => void;
  addForm: (form: DynamicForm) => void;
  updateForm: (form: DynamicForm) => void;
  deleteForm: (id: string) => void;
  addBundle: (bundle: ProtocolBundle) => void;
  updateBundle: (bundle: ProtocolBundle) => void;
  deleteBundle: (id: string) => void;
  addSchedule: (schedule: Schedule | Schedule[]) => void;
  deleteSchedule: (id: string) => void;
  bulkDeleteSchedules: (ids: string[]) => void;
  submitForm: (submission: Submission) => void;
  getStaffSchedule: (staffId: string, date: string) => Schedule[];
  getCompletionRate: (date: string, department?: 'MRI' | 'X-RAY') => number;
  announcements: string[];
  addAnnouncement: (text: string) => void;
  addAlert: (alert: Omit<Alert, 'id' | 'isRead' | 'timestamp'>) => void;
  markAlertAsRead: (id: string) => void;
  language: 'TH' | 'EN';
  setLanguage: (lang: 'TH' | 'EN') => void;
  settings: SystemSettings;
  updateSettings: (settings: SystemSettings) => void;
  resetDatabase: () => void;
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
