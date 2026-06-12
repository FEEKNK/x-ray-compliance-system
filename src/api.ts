// API Client — centralized fetch functions for all backend endpoints
import type { User, DynamicForm, Schedule, Submission, ProtocolBundle, Alert, SystemSettings } from './types';

const BASE = '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      // Dispatch event instead of hard reload
      window.dispatchEvent(new Event('auth-error'));
      return {} as T;
    }
    const errorBody = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errorBody.error || `API error: ${res.status}`);
  }
  return res.json();
}

async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  return fetch(`${BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include'
  });
}

export const api = {
  // ─── Auth ─────────────────────────────────────────
  auth: {
    login: (userId: string, pin: string): Promise<{ user: User }> =>
      apiFetch(`/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ userId, pin })
      }).then(r => handleResponse(r)),
      
    logout: (): Promise<{ success: boolean }> =>
      apiFetch(`/auth/logout`, {
        method: 'POST'
      }).then(r => handleResponse(r)),
  },

  // ─── Users ────────────────────────────────────────
  users: {
    getPublic: (): Promise<Partial<User>[]> =>
      apiFetch(`/users/public`).then(r => handleResponse(r)),

    getAll: (): Promise<User[]> =>
      apiFetch(`/users`).then(r => handleResponse(r)),

    create: (user: Partial<User>): Promise<User> =>
      apiFetch(`/users`, {
        method: 'POST',
        body: JSON.stringify(user),
      }).then(r => handleResponse(r)),

    update: (id: string, user: Partial<User>): Promise<User> =>
      apiFetch(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(user),
      }).then(r => handleResponse(r)),

    delete: (id: string): Promise<{ success: boolean }> =>
      apiFetch(`/users/${id}`, { method: 'DELETE' }).then(r => handleResponse(r)),
  },

  // ─── Forms ────────────────────────────────────────
  forms: {
    getAll: (): Promise<DynamicForm[]> =>
      apiFetch(`/forms`).then(r => handleResponse(r)),

    create: (form: Partial<DynamicForm>): Promise<DynamicForm> =>
      apiFetch(`/forms`, {
        method: 'POST',
        body: JSON.stringify(form),
      }).then(r => handleResponse(r)),

    update: (id: string, form: Partial<DynamicForm>): Promise<DynamicForm> =>
      apiFetch(`/forms/${id}`, {
        method: 'PUT',
        body: JSON.stringify(form),
      }).then(r => handleResponse(r)),

    delete: (id: string): Promise<{ success: boolean }> =>
      apiFetch(`/forms/${id}`, { method: 'DELETE' }).then(r => handleResponse(r)),
  },

  schedules: {
    getAll: (filters?: { month?: number; year?: number; startDate?: string; endDate?: string }): Promise<Schedule[]> => {
      const params = new URLSearchParams();
      if (filters?.month) params.append('month', filters.month.toString());
      if (filters?.year) params.append('year', filters.year.toString());
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      const query = params.toString() ? `?${params.toString()}` : '';
      return apiFetch(`/schedules${query}`).then(r => handleResponse(r));
    },

    create: (schedule: Partial<Schedule> | Partial<Schedule>[]): Promise<Schedule | Schedule[]> =>
      apiFetch(`/schedules`, {
        method: 'POST',
        body: JSON.stringify(schedule),
      }).then(r => handleResponse(r)),

    update: (id: string, data: Partial<Schedule>): Promise<Schedule> =>
      apiFetch(`/schedules/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }).then(r => handleResponse(r)),

    delete: (id: string): Promise<{ success: boolean }> =>
      apiFetch(`/schedules/${id}`, { method: 'DELETE' }).then(r => handleResponse(r)),

    bulkDelete: (ids: string[]): Promise<{ success: boolean }> =>
      apiFetch(`/schedules/bulk-delete`, {
        method: 'POST',
        body: JSON.stringify({ ids }),
      }).then(r => handleResponse(r)),
  },

  // ─── Submissions ──────────────────────────────────
  submissions: {
    getAll: (page = 1, limit = 50): Promise<{ data: Submission[], total: number, page: number, totalPages: number }> =>
      apiFetch(`/submissions?page=${page}&limit=${limit}`).then(r => handleResponse(r)),

    getByScheduleId: (scheduleId: string): Promise<Submission> =>
      apiFetch(`/submissions/schedule/${scheduleId}`).then(r => handleResponse(r)),

    create: (submission: Partial<Submission>): Promise<Submission> =>
      apiFetch(`/submissions`, {
        method: 'POST',
        body: JSON.stringify(submission),
      }).then(r => handleResponse(r)),

    delete: (id: string): Promise<{ success: boolean }> =>
      apiFetch(`/submissions/${id}`, { method: 'DELETE' }).then(r => handleResponse(r)),
  },


  // ─── Bundles ──────────────────────────────────────
  bundles: {
    getAll: (): Promise<ProtocolBundle[]> =>
      apiFetch(`/bundles`).then(r => handleResponse(r)),

    create: (bundle: Partial<ProtocolBundle>): Promise<ProtocolBundle> =>
      apiFetch(`/bundles`, {
        method: 'POST',
        body: JSON.stringify(bundle),
      }).then(r => handleResponse(r)),

    update: (id: string, bundle: Partial<ProtocolBundle>): Promise<ProtocolBundle> =>
      apiFetch(`/bundles/${id}`, {
        method: 'PUT',
        body: JSON.stringify(bundle),
      }).then(r => handleResponse(r)),

    delete: (id: string): Promise<{ success: boolean }> =>
      apiFetch(`/bundles/${id}`, { method: 'DELETE' }).then(r => handleResponse(r)),
  },

  // ─── Alerts ───────────────────────────────────────
  alerts: {
    getAll: (): Promise<Alert[]> =>
      apiFetch(`/alerts`).then(r => handleResponse(r)),

    create: (alert: Partial<Alert>): Promise<Alert> =>
      apiFetch(`/alerts`, {
        method: 'POST',
        body: JSON.stringify(alert),
      }).then(r => handleResponse(r)),

    markAsRead: (id: string): Promise<Alert> =>
      apiFetch(`/alerts/${id}/read`, { method: 'PATCH' }).then(r => handleResponse(r)),
  },

  // ─── Config ───────────────────────────────────────
  config: {
    get: (): Promise<{ settings: SystemSettings; announcements: string[] }> =>
      apiFetch(`/config`).then(r => handleResponse(r)),

    updateSettings: (settings: Partial<SystemSettings>): Promise<SystemSettings> =>
      apiFetch(`/config`, {
        method: 'PUT',
        body: JSON.stringify({ settings }),
      }).then(r => handleResponse(r)),

    addAnnouncement: (text: string): Promise<string[]> =>
      apiFetch(`/config/announcements`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      }).then(r => handleResponse<{ announcements: string[] }>(r).then(d => d.announcements)),

    testEmail: (email: string): Promise<{ success: boolean; error?: string }> =>
      apiFetch(`/test-email`, {
        method: 'POST',
        body: JSON.stringify({ email }),
      }).then(r => handleResponse(r)),

    triggerSla: (): Promise<{ success: boolean }> =>
      apiFetch(`/trigger-sla`, { method: 'POST' }).then(r => handleResponse(r)),

    testSlaNow: (): Promise<{ success: boolean; total?: number; sent?: string[]; message?: string; error?: string }> =>
      apiFetch(`/test-sla-now`, { method: 'POST' }).then(r => handleResponse(r)),
  },

  // ─── Seed ─────────────────────────────────────────
  seed: (): Promise<{ success: boolean }> =>
    apiFetch(`/seed`, { method: 'POST' }).then(r => handleResponse(r)),

  // ─── Export Data ──────────────────────────────────
  exportData: (): Promise<unknown> =>
    apiFetch(`/export-data`, { method: 'GET' }).then(r => handleResponse(r)),

  // ─── Reset Data ───────────────────────────────────
  resetData: (): Promise<{ success: boolean; message: string }> =>
    apiFetch(`/reset-data`, { method: 'POST' }).then(r => handleResponse(r)),

  // ─── Import Data ──────────────────────────────────
  importData: (payload: unknown, options?: { mode: 'replace_all' | 'merge', collections: string[] }): Promise<{ success: boolean; message: string }> =>
    apiFetch(`/import-data`, {
      method: 'POST',
      body: JSON.stringify({ payload, options })
    }).then(r => handleResponse(r)),
};
