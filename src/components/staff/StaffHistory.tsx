import React, { useState } from 'react';
import { useApp } from '../../AppContext';
import { parseDbDate } from '../../utils/shiftTime';
import { ClipboardList, Clock, CheckCircle2, Search, Pencil, Lock } from 'lucide-react';
import SubmissionDetailModal from '../shared/SubmissionDetailModal';
import { translations } from '../../i18n';
import type { Submission, DynamicForm, Schedule } from '../../types';
import { getLockStatus, isSubmitAllowed } from '../../utils/shiftTime';
import { FormRenderer } from './StaffDashboard';
import { useForms, useSchedules, useSubmissions, useAddSubmission } from '../../hooks/queries';

const StaffHistory: React.FC = () => {
  const { currentUser, language, settings } = useApp();
  const { data: forms = [] } = useForms();
  const { data: schedules = [] } = useSchedules();
  const { data: submissionsData } = useSubmissions();
  const submissions = submissionsData?.data || [];
  const { mutate: submitForm } = useAddSubmission();
  const t = translations[language];
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterDate, setFilterDate] = React.useState('');
  const [selectedSubmission, setSelectedSubmission] = React.useState<Submission | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<{ schedule: Schedule; form: DynamicForm, submission: Submission } | null>(null);

  const mySubmissions = submissions
    .filter(s => s.staffId === currentUser?.id)
    .filter(s => {
      const form = forms.find(f => f.id === s.formId);
      const matchesSearch = form?.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDate = !filterDate || s.submittedAt.startsWith(filterDate);
      return matchesSearch && matchesDate;
    })
    .sort((a, b) => parseDbDate(b.submittedAt).getTime() - parseDbDate(a.submittedAt).getTime());

  const handleEditClick = (sub: Submission) => {
    const schedule = schedules.find(s => s.id === sub.scheduleId);
    if (!schedule) return;
    const form = forms.find(f => f.id === sub.formId);
    if (!form) return;
    const lockoutHours = settings?.lockoutHours as Record<string, number> | undefined;
    const shiftsConfig = settings?.shifts as Record<string, string> | undefined;
    if (!isSubmitAllowed(schedule.date, schedule.shift, lockoutHours, shiftsConfig)) return; // locked
    setEditingSchedule({ schedule, form, submission: sub });
  };

  const handleEditSubmit = (data: Submission) => {
    submitForm(data);
    setEditingSchedule(null);
  };


  if (editingSchedule) {
    return (
      <div className="fixed inset-0 z-[60] bg-white overflow-hidden flex flex-col animate-in slide-in-from-bottom-full duration-300">
        <FormRenderer
          form={editingSchedule.form}
          schedule={editingSchedule.schedule}
          initialSubmission={editingSchedule.submission}
          onCancel={() => setEditingSchedule(null)}
          onSubmit={handleEditSubmit}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{t.myHistory}</h1>
          <p className="text-sm text-gray-500 font-medium">ประวัติการตรวจสอบของคุณ — แก้ไขได้จนกว่าฟอร์มจะล็อก</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
        <div className="relative flex-1">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
          <input 
            type="text" 
            placeholder="Search your records..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 border-2 border-gray-50 rounded-2xl focus:border-blue-500 bg-gray-50 font-bold text-gray-700 outline-none transition-all"
          />
        </div>
        <div className="w-full md:w-auto">
          <input 
            type="date" 
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="w-full border-2 border-gray-50 rounded-2xl px-4 py-4 bg-gray-50 font-bold text-gray-600 focus:border-blue-500 outline-none transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {mySubmissions.length > 0 ? mySubmissions.map(sub => {
          const form = forms.find(f => f.id === sub.formId);
          const hasAlert = Object.values(sub.data).some(v => v === 'Fail' || v === 'Alert');
          const schedule = schedules.find(s => s.id === sub.scheduleId);
          const lockoutHours = settings?.lockoutHours as Record<string, number> | undefined;
          const shiftsConfig = settings?.shifts as Record<string, string> | undefined;
          const lockStatus = schedule ? getLockStatus(schedule.date, schedule.shift, lockoutHours, shiftsConfig) : { isLocked: true, label: '' };
          const canEdit = !lockStatus.isLocked;

          return (
            <div 
              key={sub.id} 
              className={`bg-white p-6 rounded-2xl border flex items-center justify-between transition-all group ${
                lockStatus.isLocked ? 'border-gray-100 opacity-80' : 'border-gray-100 hover:shadow-md cursor-pointer'
              }`}
            >
              <div
                className="flex items-center space-x-5 flex-1 min-w-0 cursor-pointer"
                onClick={() => setSelectedSubmission(sub)}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  lockStatus.isLocked ? 'bg-gray-100 text-gray-400' : 'bg-blue-50 text-[#00468B]'
                }`}>
                  {lockStatus.isLocked ? <Lock size={22} /> : <ClipboardList size={24} />}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-800 group-hover:text-[#00468B] transition-colors truncate">{form?.title}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="flex items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <Clock size={12} className="mr-1" /> {parseDbDate(sub.submittedAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short', hour12: false })}
                    </span>
                    <span className={`flex items-center text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                      hasAlert ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'
                    }`}>
                      {hasAlert ? '🔴 Issue Found' : (
                        <><CheckCircle2 size={12} className="mr-1" /> {t.verifiedCertified}</>
                      )}
                    </span>
                    {lockStatus.isLocked && (
                      <span className="flex items-center text-[10px] font-black text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                        🔒 ล็อกแล้ว
                      </span>
                    )}
                    {!lockStatus.isLocked && (
                      <span className="text-[10px] font-bold text-orange-500">
                        ✏️ {lockStatus.label}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {canEdit && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleEditClick(sub); }}
                  className="ml-2 shrink-0 flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-[#00468B] rounded-xl text-xs font-bold hover:bg-[#00468B] hover:text-white transition-all active:scale-95"
                >
                  <Pencil size={14} />
                  แก้ไข
                </button>
              )}
            </div>
          );
        }) : (
          <div className="bg-white p-20 rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
            <ClipboardList size={48} className="mb-4 opacity-10" />
            <p className="font-bold uppercase tracking-widest text-xs">No records found</p>
          </div>
        )}
      </div>

      {selectedSubmission && (
        <SubmissionDetailModal 
          submission={selectedSubmission} 
          onClose={() => setSelectedSubmission(null)} 
        />
      )}
    </div>
  );
};

export default StaffHistory;