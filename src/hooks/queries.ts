import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import type { User, DynamicForm, ProtocolBundle } from '../types';

// ============================================
// Users
// ============================================
export const useUsers = () => useQuery({ queryKey: ['users'], queryFn: api.users.getAll });
export const usePublicUsers = () => useQuery({ queryKey: ['users', 'public'], queryFn: api.users.getPublic });
export const useAddUser = () => { const qc = useQueryClient(); return useMutation({ mutationFn: api.users.create, onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }) }); };
export const useUpdateUser = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (user: Partial<User> & {id: string}) => api.users.update(user.id, user), onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }) }); };
export const useDeleteUser = () => { const qc = useQueryClient(); return useMutation({ mutationFn: api.users.delete, onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }) }); };
export const useReorderUsers = () => { const qc = useQueryClient(); return useMutation({ mutationFn: api.users.reorder, onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }) }); };

// ============================================
// Forms
// ============================================
export const useForms = () => useQuery({ queryKey: ['forms'], queryFn: api.forms.getAll });
export const useAddForm = () => { const qc = useQueryClient(); return useMutation({ mutationFn: api.forms.create, onSuccess: () => qc.invalidateQueries({ queryKey: ['forms'] }) }); };
export const useUpdateForm = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (form: DynamicForm) => api.forms.update(form.id, form), onSuccess: () => qc.invalidateQueries({ queryKey: ['forms'] }) }); };
export const useDeleteForm = () => { const qc = useQueryClient(); return useMutation({ mutationFn: api.forms.delete, onSuccess: () => qc.invalidateQueries({ queryKey: ['forms'] }) }); };

// ============================================
// Schedules
// ============================================
export const useSchedules = (filters?: { month?: number; year?: number; startDate?: string; endDate?: string }) => 
  useQuery({ 
    queryKey: ['schedules', filters], 
    queryFn: () => api.schedules.getAll(filters) 
  });
export const useAddSchedule = () => { const qc = useQueryClient(); return useMutation({ mutationFn: api.schedules.create, onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules'] }) }); };
export const useDeleteSchedule = () => { const qc = useQueryClient(); return useMutation({ mutationFn: api.schedules.delete, onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules'] }) }); };
export const useBulkDeleteSchedules = () => { const qc = useQueryClient(); return useMutation({ mutationFn: api.schedules.bulkDelete, onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules'] }) }); };

// ============================================
// Submissions
// ============================================
export const useSubmissions = (page = 1, limit = 200, filters?: { month?: number; year?: number }) => 
  useQuery({ 
    queryKey: ['submissions', page, limit, filters], 
    queryFn: () => api.submissions.getAll(page, limit, filters) 
  });
export const useAddSubmission = () => { 
  const qc = useQueryClient(); 
  return useMutation({ 
    mutationFn: api.submissions.create, 
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['submissions'] });
      qc.invalidateQueries({ queryKey: ['schedules'] }); // Because adding submission completes a schedule
    }
  }); 
};
export const useDeleteSubmission = () => { 
  const qc = useQueryClient(); 
  return useMutation({ 
    mutationFn: api.submissions.delete, 
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['submissions'] });
      qc.invalidateQueries({ queryKey: ['schedules'] }); // Because deleting submission reverts schedule
    }
  }); 
};

// ============================================
// Bundles
// ============================================
export const useBundles = () => useQuery({ queryKey: ['bundles'], queryFn: api.bundles.getAll });
export const useAddBundle = () => { const qc = useQueryClient(); return useMutation({ mutationFn: api.bundles.create, onSuccess: () => qc.invalidateQueries({ queryKey: ['bundles'] }) }); };
export const useUpdateBundle = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (bundle: ProtocolBundle) => api.bundles.update(bundle.id, bundle), onSuccess: () => qc.invalidateQueries({ queryKey: ['bundles'] }) }); };
export const useDeleteBundle = () => { const qc = useQueryClient(); return useMutation({ mutationFn: api.bundles.delete, onSuccess: () => qc.invalidateQueries({ queryKey: ['bundles'] }) }); };

// ============================================
// Alerts
// ============================================
export const useAlerts = () => useQuery({ queryKey: ['alerts'], queryFn: api.alerts.getAll });
export const useAddAlert = () => { const qc = useQueryClient(); return useMutation({ mutationFn: api.alerts.create, onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }) }); };
export const useMarkAlertAsRead = () => { const qc = useQueryClient(); return useMutation({ mutationFn: api.alerts.markAsRead, onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }) }); };

// ============================================
// Config
// ============================================
export const useConfig = () => useQuery({ queryKey: ['config'], queryFn: api.config.get });
export const useUpdateSettings = () => { const qc = useQueryClient(); return useMutation({ mutationFn: api.config.updateSettings, onSuccess: () => qc.invalidateQueries({ queryKey: ['config'] }) }); };
export const useAddAnnouncement = () => { const qc = useQueryClient(); return useMutation({ mutationFn: api.config.addAnnouncement, onSuccess: () => qc.invalidateQueries({ queryKey: ['config'] }) }); };
