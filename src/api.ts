// API Client — centralized fetch functions for all backend endpoints
import type { User, DynamicForm, Schedule, Submission, ProtocolBundle, Alert, SystemSettings } from './types';

const BASE = '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errorBody.error || `API error: ${res.status}`);
  }
  return res.json();
}

function jsonHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json' };
}

export const api = {
  // ─── Users ────────────────────────────────────────
  users: {
    getAll: (): Promise<User[]> =>
      fetch(`${BASE}/users`).then(r => handleResponse(r)),

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
      fetch(`${BASE}/users/${id}`, { method: 'DELETE' }).then(r => handleResponse(r)),
  },

  // ─── Forms ────────────────────────────────────────
  forms: {
    getAll: (): Promise<DynamicForm[]> =>
      fetch(`${BASE}/forms`).then(r => handleResponse(r)),

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
      fetch(`${BASE}/forms/${id}`, { method: 'DELETE' }).then(r => handleResponse(r)),
  },

  // ─── Schedules ────────────────────────────────────
  schedules: {
    getAll: (): Promise<Schedule[]> =>
      fetch(`${BASE}/schedules`).then(r => handleResponse(r)),

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
      fetch(`${BASE}/schedules/${id}`, { method: 'DELETE' }).then(r => handleResponse(r)),

    bulkDelete: (ids: string[]): Promise<{ success: boolean }> =>
      fetch(`${BASE}/schedules/bulk-delete`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ ids }),
      }).then(r => handleResponse(r)),
  },

  // ─── Submissions ──────────────────────────────────
  submissions: {
    getAll: (): Promise<Submission[]> =>
      fetch(`${BASE}/submissions`).then(r => handleResponse(r)),

    create: (submission: Partial<Submission>): Promise<Submission> =>
      fetch(`${BASE}/submissions`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify(submission),
      }).then(r => handleResponse(r)),
  },

  // ─── Bundles ──────────────────────────────────────
  bundles: {
    getAll: (): Promise<ProtocolBundle[]> =>
      fetch(`${BASE}/bundles`).then(r => handleResponse(r)),

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
      fetch(`${BASE}/bundles/${id}`, { method: 'DELETE' }).then(r => handleResponse(r)),
  },

  // ─── Alerts ───────────────────────────────────────
  alerts: {
    getAll: (): Promise<Alert[]> =>
      fetch(`${BASE}/alerts`).then(r => handleResponse(r)),

    create: (alert: Partial<Alert>): Promise<Alert> =>
      fetch(`${BASE}/alerts`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify(alert),
      }).then(r => handleResponse(r)),

    markAsRead: (id: string): Promise<Alert> =>
      fetch(`${BASE}/alerts/${id}/read`, { method: 'PATCH' }).then(r => handleResponse(r)),
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

    addAnnouncement: (text: string): Promise<{ success: boolean }> =>
      fetch(`${BASE}/config/announcements`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ text }),
      }).then(r => handleResponse(r)),
  },

  // ─── Seed ─────────────────────────────────────────
  seed: (): Promise<{ success: boolean }> =>
    fetch(`${BASE}/seed`, { method: 'POST' }).then(r => handleResponse(r)),
};
