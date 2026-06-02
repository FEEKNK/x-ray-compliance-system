// API Client — centralized fetch functions for all backend endpoints
import type { User, DynamicForm, Schedule, Submission, ProtocolBundle, Alert, SystemSettings } from './types';

// Get token from localStorage
const getToken = () => localStorage.getItem('xray_jwt_token');

const BASE = '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errorBody.error || `API error: ${res.status}`);
  }
  return res.json();
}

function jsonHeaders(): HeadersInit {
  const token = getToken();
  return { 
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

export const api = {
  // ─── Auth ─────────────────────────────────────────
  auth: {
    login: (userId: string, pin: string): Promise<{ token: string, user: User }> =>
      fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, pin })
      }).then(r => handleResponse(r)),
  },

  // ─── Users ────────────────────────────────────────
  users: {
    getPublic: (): Promise<Partial<User>[]> =>
      fetch(`${BASE}/users/public`).then(r => handleResponse(r)),

    getAll: (): Promise<User[]> =>
      fetch(`${BASE}/users`, { headers: jsonHeaders() }).then(r => handleResponse(r)),

    create: (user: Partial<User>): Promise<User> =>
      fetch(`${BASE}/users`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify(user),
      }).then(r => handleResponse(r)),

    update: (id: string, user: Partial<User>): Promise<User> =>
      fetch(`${BASE}/users/${id}`, {
        method: 'PUT',
        headers: jsonHeaders(),
        body: JSON.stringify(user),
      }).then(r => handleResponse(r)),

    delete: (id: string): Promise<{ success: boolean }> =>
      fetch(`${BASE}/users/${id}`, { method: 'DELETE', headers: jsonHeaders() }).then(r => handleResponse(r)),
  },

  // ─── Forms ────────────────────────────────────────
  forms: {
    getAll: (): Promise<DynamicForm[]> =>
      fetch(`${BASE}/forms`, { headers: jsonHeaders() }).then(r => handleResponse(r)),

    create: (form: Partial<DynamicForm>): Promise<DynamicForm> =>
      fetch(`${BASE}/forms`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify(form),
      }).then(r => handleResponse(r)),

    update: (id: string, form: Partial<DynamicForm>): Promise<DynamicForm> =>
      fetch(`${BASE}/forms/${id}`, {
        method: 'PUT',
        headers: jsonHeaders(),
        body: JSON.stringify(form),
      }).then(r => handleResponse(r)),

    delete: (id: string): Promise<{ success: boolean }> =>
      fetch(`${BASE}/forms/${id}`, { method: 'DELETE', headers: jsonHeaders() }).then(r => handleResponse(r)),
  },

  // ─── Schedules ────────────────────────────────────
  schedules: {
    getAll: (): Promise<Schedule[]> =>
      fetch(`${BASE}/schedules`, { headers: jsonHeaders() }).then(r => handleResponse(r)),

    create: (schedule: Partial<Schedule> | Partial<Schedule>[]): Promise<Schedule | Schedule[]> =>
      fetch(`${BASE}/schedules`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify(schedule),
      }).then(r => handleResponse(r)),

    update: (id: string, data: Partial<Schedule>): Promise<Schedule> =>
      fetch(`${BASE}/schedules/${id}`, {
        method: 'PUT',
        headers: jsonHeaders(),
        body: JSON.stringify(data),
      }).then(r => handleResponse(r)),

    delete: (id: string): Promise<{ success: boolean }> =>
      fetch(`${BASE}/schedules/${id}`, { method: 'DELETE', headers: jsonHeaders() }).then(r => handleResponse(r)),

    bulkDelete: (ids: string[]): Promise<{ success: boolean }> =>
      fetch(`${BASE}/schedules/bulk-delete`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ ids }),
      }).then(r => handleResponse(r)),
  },

  // ─── Submissions ──────────────────────────────────
  submissions: {
    getAll: (page = 1, limit = 50): Promise<{ data: Submission[], total: number, page: number, totalPages: number }> =>
      fetch(`${BASE}/submissions?page=${page}&limit=${limit}`, { headers: jsonHeaders() }).then(r => handleResponse(r)),

    getByScheduleId: (scheduleId: string): Promise<Submission> =>
      fetch(`${BASE}/submissions/schedule/${scheduleId}`, { headers: jsonHeaders() }).then(r => handleResponse(r)),

    create: (submission: Partial<Submission>): Promise<Submission> =>
      fetch(`${BASE}/submissions`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify(submission),
      }).then(r => handleResponse(r)),

    delete: (id: string): Promise<{ success: boolean }> =>
      fetch(`${BASE}/submissions/${id}`, { method: 'DELETE', headers: jsonHeaders() }).then(r => handleResponse(r)),
  },


  // ─── Bundles ──────────────────────────────────────
  bundles: {
    getAll: (): Promise<ProtocolBundle[]> =>
      fetch(`${BASE}/bundles`, { headers: jsonHeaders() }).then(r => handleResponse(r)),

    create: (bundle: Partial<ProtocolBundle>): Promise<ProtocolBundle> =>
      fetch(`${BASE}/bundles`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify(bundle),
      }).then(r => handleResponse(r)),

    update: (id: string, bundle: Partial<ProtocolBundle>): Promise<ProtocolBundle> =>
      fetch(`${BASE}/bundles/${id}`, {
        method: 'PUT',
        headers: jsonHeaders(),
        body: JSON.stringify(bundle),
      }).then(r => handleResponse(r)),

    delete: (id: string): Promise<{ success: boolean }> =>
      fetch(`${BASE}/bundles/${id}`, { method: 'DELETE', headers: jsonHeaders() }).then(r => handleResponse(r)),
  },

  // ─── Alerts ───────────────────────────────────────
  alerts: {
    getAll: (): Promise<Alert[]> =>
      fetch(`${BASE}/alerts`, { headers: jsonHeaders() }).then(r => handleResponse(r)),

    create: (alert: Partial<Alert>): Promise<Alert> =>
      fetch(`${BASE}/alerts`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify(alert),
      }).then(r => handleResponse(r)),

    markAsRead: (id: string): Promise<Alert> =>
      fetch(`${BASE}/alerts/${id}/read`, { method: 'PATCH', headers: jsonHeaders() }).then(r => handleResponse(r)),
  },

  // ─── Config ───────────────────────────────────────
  config: {
    get: (): Promise<{ settings: SystemSettings; announcements: string[] }> =>
      fetch(`${BASE}/config`).then(r => handleResponse(r)),

    updateSettings: (settings: Partial<SystemSettings>): Promise<SystemSettings> =>
      fetch(`${BASE}/config`, {
        method: 'PUT',
        headers: jsonHeaders(),
        body: JSON.stringify({ settings }),
      }).then(r => handleResponse(r)),

    addAnnouncement: (text: string): Promise<string[]> =>
      fetch(`${BASE}/config/announcements`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ text }),
      }).then(r => handleResponse<{ announcements: string[] }>(r).then(d => d.announcements)),
  },

  // ─── Seed ─────────────────────────────────────────
  seed: (): Promise<{ success: boolean }> =>
    fetch(`${BASE}/seed`, { method: 'POST' }).then(r => handleResponse(r)),

  // ─── Export Data ──────────────────────────────────
  exportData: (): Promise<unknown> =>
    fetch(`${BASE}/export-data`, { method: 'GET', headers: jsonHeaders() }).then(r => handleResponse(r)),

  // ─── Reset Data ───────────────────────────────────
  resetData: (): Promise<{ success: boolean; message: string }> =>
    fetch(`${BASE}/reset-data`, { method: 'POST' }).then(r => handleResponse(r)),
};
