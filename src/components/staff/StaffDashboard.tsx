import React, { useState } from 'react';
import { useApp } from '../../AppContext';
import { 
  Clock, 
  CheckCircle2, 
  ChevronLeft, 
  ShieldCheck, 
  FileText,
  PartyPopper,
  ChevronDown,
  X
} from 'lucide-react';
import { api } from '../../api';
import type { Submission, Schedule, DynamicForm } from '../../types';
import { useSchedules, useForms, useAddSubmission } from '../../hooks/queries';
import { translations } from '../../i18n';
import { getLockStatus, getSubmitDeadline, getLocalTodayStr, getShiftAllowStartTime, getShiftStartTime } from '../../utils/shiftTime';

/** Live countdown: re-renders every second until deadline */
function useCountdown(scheduleDate: string, shift: import('../../types').Shift, lockoutHours?: Record<string, number>, shiftsConfig?: Record<string, string>) {
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const allowStartTime = getShiftAllowStartTime(scheduleDate, shift, shiftsConfig);
  const isEarly = now < allowStartTime;

  const deadline = getSubmitDeadline(scheduleDate, shift, lockoutHours, shiftsConfig);
  const diffMs = deadline.getTime() - now.getTime();
  const isLockedTime = diffMs <= 0;

  const isLocked = isLockedTime || isEarly;
  
  let label = '';
  let urgent = false;
  let warning = false;
  let totalSec = 0;

  const pad = (n: number) => String(n).padStart(2, '0');

  if (isEarly) {
    const earlyDiffMs = allowStartTime.getTime() - now.getTime();
    const eTotalSec = Math.max(0, Math.floor(earlyDiffMs / 1000));
    const eh = Math.floor(eTotalSec / 3600);
    const em = Math.floor((eTotalSec % 3600) / 60);
    const es = eTotalSec % 60;
    label = `เปิดใน ${eh > 0 ? `${eh}:` : ''}${pad(em)}:${pad(es)}`;
  } else if (isLockedTime) {
    label = 'ล็อกแล้ว';
  } else {
    totalSec = Math.max(0, Math.floor(diffMs / 1000));
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    label = h > 0
      ? `${h}:${pad(m)}:${pad(s)}`
      : `${pad(m)}:${pad(s)}`;
    urgent = totalSec < 30 * 60; // < 30 min
    warning = totalSec < 60 * 60; // < 60 min
  }

  return { isLocked, isEarly, label, urgent, warning, totalSec };
}

const StaffDashboard: React.FC = () => {
  const { currentUser, language, settings } = useApp();
  const t = translations[language];
  const { data: schedules = [] } = useSchedules();
  const { data: forms = [] } = useForms();
  const { mutate: submitForm } = useAddSubmission();
  
  const lockoutHours = settings?.lockoutHours as Record<string, number> | undefined;
  const shiftsConfig = settings?.shifts as Record<string, string> | undefined;

  // Get local date YYYY-MM-DD
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  const mySchedules = currentUser 
    ? schedules.filter(s => s.staffId === currentUser.id && s.date === today).sort((a, b) => {
        if (a.status === 'Pending' && b.status !== 'Pending') return -1;
        if (a.status !== 'Pending' && b.status === 'Pending') return 1;
        
        if (a.status === 'Pending' && b.status === 'Pending') {
           const lockA = getLockStatus(a.date, a.shift, lockoutHours, shiftsConfig).isLocked;
           const lockB = getLockStatus(b.date, b.shift, lockoutHours, shiftsConfig).isLocked;
           if (!lockA && lockB) return -1;
           if (lockA && !lockB) return 1;
        }
        
        const timeA = getShiftStartTime(a.date, a.shift, shiftsConfig).getTime();
        const timeB = getShiftStartTime(b.date, b.shift, shiftsConfig).getTime();
        return timeA - timeB;
      })
    : [];
  
  const [activeSchedule, setActiveSchedule] = useState<Schedule | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleFinishSubmission = (data: Submission) => {
    submitForm(data);
    setActiveSchedule(null);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };



  if (activeSchedule) {
    const form = forms.find(f => f.id === activeSchedule.formId);
    if (!form) return <div>Form not found</div>;

    return (
      <div className="fixed inset-0 z-[60] bg-white overflow-hidden flex flex-col animate-in slide-in-from-bottom-full duration-300">
         <FormRenderer 
          form={form} 
          schedule={activeSchedule} 
          onCancel={() => setActiveSchedule(null)} 
          onSubmit={handleFinishSubmission} 
         />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 pb-24">
      {showSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#00468B]/95 backdrop-blur-md animate-in fade-in duration-300">
           <div className="text-center text-white space-y-6 animate-in zoom-in-95 duration-500 delay-100">
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto shadow-2xl">
                 <PartyPopper size={48} className="text-blue-100" />
              </div>
              <h2 className="text-4xl font-black">Success!</h2>
              <p className="text-blue-100 font-bold opacity-80 uppercase tracking-widest px-8">Report Certified & Synchronized.</p>
              <div className="pt-8">
                 <CheckCircle2 size={64} className="mx-auto text-green-400 animate-bounce" />
              </div>
           </div>
        </div>
      )}

      {/* Hero Section — Mobile optimized */}
      <div className="bg-gradient-to-br from-[#00468B] to-[#003070] rounded-3xl p-6 md:p-10 text-white overflow-hidden relative">
        <div className="relative z-10 space-y-1">
          <p className="text-blue-200 text-[10px] font-black uppercase tracking-[0.2em]">สวัสดี, {currentUser?.name?.split(' ')[0] || 'คุณ'}</p>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">{t.todaysWork || 'งานของวันนี้'}</h1>
          <p className="text-blue-200/80 text-sm font-medium">
            {mySchedules.filter(s => s.status === 'Pending').length > 0
              ? `${t.pendingTasks || 'รออยู่'} ${mySchedules.filter(s => s.status === 'Pending').length} รายการ`
              : t.allTasksCompleted || 'ทำเสร็จครบทุกงานแล้ว! 🎉'}
          </p>
        </div>
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/5 rounded-full" />
        <div className="absolute -right-4 bottom-0 w-24 h-24 bg-white/5 rounded-full" />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-10">
          <FileText size={80} />
        </div>
      </div>

      {/* Task Queue Section */}
      {mySchedules.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] px-1 flex items-center">
            <Clock size={14} className="mr-2" />
            {t.queueToday || 'คิวงานวันนี้'} ({mySchedules.filter(s => s.status === 'Pending').length} {t.pendingTasks || 'รอดำเนินการ'})
          </h3>
          {/* Mobile: vertical stack; Desktop: horizontal scroll */}
          <div className="flex flex-col gap-4 md:hidden">
            {mySchedules.map(s => {
              const form = forms.find(f => f.id === s.formId);
              return (
                <ScheduleCard 
                  key={s.id} 
                  schedule={s} 
                  form={form} 
                  onAudit={() => setActiveSchedule(s)} 
                  fullWidth
                />
              );
            })}
          </div>
          <div className="hidden md:flex overflow-x-auto gap-4 px-2 pb-4 snap-x hide-scrollbar">
            {mySchedules.map(s => {
              const form = forms.find(f => f.id === s.formId);
              return (
                <ScheduleCard 
                  key={s.id} 
                  schedule={s} 
                  form={form} 
                  onAudit={() => setActiveSchedule(s)} 
                />
              );
            })}
          </div>
        </div>
      )}

      {mySchedules.length === 0 && (
        <div className="text-center py-16 px-4 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
          <CheckCircle2 size={48} className="mx-auto text-green-300 mb-4" />
          <h3 className="text-lg font-bold text-gray-700">ไม่มีงานที่มอบหมาย</h3>
          <p className="text-gray-500 text-sm mt-2">ยังไม่มีตารางเวรสำหรับวันนี้</p>
        </div>
      )}
    </div>
  );
};

interface ScheduleCardProps {
  schedule: Schedule;
  form: DynamicForm | undefined;
  onAudit: () => void;
  fullWidth?: boolean;
}

const ScheduleCard: React.FC<ScheduleCardProps> = ({ schedule: s, form, onAudit, fullWidth = false }) => {
  const { settings, language } = useApp();
  const t = translations[language];
  const lockoutHours = settings?.lockoutHours as Record<string, number> | undefined;
  const shiftsConfig = settings?.shifts as Record<string, string> | undefined;
  const isCompleted = s.status === 'Completed';
  const lockStatus = getLockStatus(s.date, s.shift, lockoutHours, shiftsConfig);
  const cd = useCountdown(s.date, s.shift, lockoutHours, shiftsConfig);

  return (
    <div 
      className={`${fullWidth ? 'w-full' : 'min-w-[280px] md:min-w-[320px]'} snap-start p-6 rounded-3xl border-2 transition-all flex flex-col justify-between ${
        lockStatus.isLocked
          ? (lockStatus.isEarly ? 'bg-orange-50/60 border-orange-100 opacity-80' : 'bg-red-50/60 border-red-100 opacity-80')
          : isCompleted 
          ? 'bg-gray-50 border-gray-100 opacity-70' 
          : 'bg-white border-[#00468B]/10 shadow-lg shadow-blue-900/5'
      }`}
    >
      <div className="space-y-4">
        {/* Top row: shift badge + lock badge */}
        <div className="flex items-center justify-between">
            <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${
              s.shift === 'Morning' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'
            }`}>{s.shift}</span>
            {isCompleted && !cd.isLocked && <CheckCircle2 className="text-green-500" size={16} />}
        </div>
        <h4 className="font-bold text-gray-800 text-lg leading-tight line-clamp-2">{form?.title}</h4>

        {/* Countdown badge — top-right corner of card body */}
        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-black tracking-widest self-start ${
          cd.isLocked
            ? (cd.isEarly ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600')
            : cd.urgent
            ? 'bg-orange-100 text-orange-600 animate-pulse'
            : cd.warning
            ? 'bg-yellow-50 text-yellow-700'
            : 'bg-gray-100 text-gray-500'
        }`}>
          {cd.isLocked ? '🔒' : <Clock size={11} />}
          {cd.isLocked ? (cd.isEarly ? cd.label : 'หมดเวลา') : cd.label}
        </div>
      </div>
      
      <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between">
        <div className="flex flex-col">
          <div className="flex items-center text-xs text-gray-400 font-bold">
              <TrendingUpIcon className="mr-1" /> {s.location || 'N/A'}
          </div>
        </div>
        {cd.isLocked ? (
          <span className={`px-5 py-2 rounded-xl text-xs font-bold ${cd.isEarly ? 'bg-orange-50 text-orange-400 border border-orange-100' : 'bg-red-50 text-red-400 border border-red-100'}`}>
            {cd.isEarly ? 'ยังไม่ถึงเวลา' : (t.notDone || 'ไม่ได้ทำ')}
          </span>
        ) : (
          <button 
            onClick={onAudit}
            className={`px-5 py-2 rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all ${
              isCompleted ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' : 'bg-[#00468B] text-white'
            }`}
          >
            {isCompleted ? (t.edit || 'แก้ไข') : 'Audit Now'}
          </button>
        )}
      </div>
    </div>
  );
};


const TrendingUpIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
);

interface FormRendererProps {
  form: DynamicForm;
  schedule: Schedule;
  initialSubmission?: Submission;
  onCancel: () => void;
  onSubmit: (submission: Submission) => void;
}

export const FormRenderer: React.FC<FormRendererProps> = ({ form, schedule, initialSubmission, onCancel, onSubmit }) => {
  const { language } = useApp();
  const t = translations[language];
  const [existingSubmission, setExistingSubmission] = useState<Submission | null>(null);
  const [formData, setFormData] = useState<Record<string, string | number | boolean | string[]>>({});
  const [customModes, setCustomModes] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    if (initialSubmission) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExistingSubmission(initialSubmission);
      setFormData(initialSubmission.data);
      setIsLoading(false);
      return;
    }
    api.submissions.getByScheduleId(schedule.id)
      .then(sub => {
        setExistingSubmission(sub);
        setFormData(sub.data);
      })
      .catch(() => {
        // Pre-fill fields for new submissions
        const initialData: Record<string, string> = {};
        form.questions.forEach(q => {
          if (q.type === 'date' && q.config?.autoFillToday) {
            initialData[q.id] = getLocalTodayStr();
          }
        });
        setFormData(initialData);
      })
      .finally(() => setIsLoading(false));
  }, [schedule.id, form.questions, initialSubmission]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const finalFormData = { ...formData };

    setTimeout(() => {
      const submission: Submission = {
        id: existingSubmission?.id || crypto.randomUUID(),
        scheduleId: schedule.id,
        staffId: schedule.staffId,
        formId: form.id,
        submittedAt: new Date().toISOString(),
        data: finalFormData,
        photos: []
      };
      onSubmit(submission);
      setIsSubmitting(false);
    }, 800);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <Clock size={40} className="text-gray-300 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
      {/* Fixed App Bar */}
      <div className="bg-[#00468B] p-6 text-white shrink-0 shadow-lg z-20 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={onCancel} className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all">
            <ChevronLeft size={24} />
          </button>
          <div className="min-w-0">
             <h2 className="text-lg font-bold leading-tight truncate pr-4">{form.title}</h2>
             <p className="text-[10px] font-medium text-blue-100/70 truncate">{schedule.location || 'Clinical Area'}</p>
          </div>
        </div>
        <div className="w-10 h-10 rounded-full bg-blue-400/20 flex items-center justify-center shrink-0">
           <ShieldCheck size={20} className="text-blue-100" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit} id="compliance-form" className="p-6 md:p-10 space-y-12 pb-44">
          {form.questions.map((q, idx) => (
            <div key={q.id} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: `${idx * 50}ms` }}>
              <div className="flex items-start space-x-3">
                 <span className="w-6 h-6 rounded-lg bg-blue-50 text-[#00468B] flex items-center justify-center text-[10px] font-black shrink-0 mt-1">{idx + 1}</span>
                 <label className="block text-sm font-black text-gray-800 tracking-tight leading-relaxed">
                   {q.label} {q.required && <span className="text-red-500">*</span>}
                 </label>
              </div>
              
              <div className="pl-9">
                {q.type === 'date' && (
                  <div className="relative">
                    <input 
                      type="date" 
                      required={q.required}
                      className="w-full border-2 border-gray-100 rounded-2xl p-4 focus:border-[#00468B] focus:bg-white bg-white shadow-sm outline-none transition-all font-bold text-gray-700 uppercase"
                      value={String(formData[q.id] || '')}
                      onChange={(e) => setFormData({...formData, [q.id]: e.target.value})}
                    />
                  </div>
                )}

                {q.type === 'select' && (
                  <div className="space-y-2">
                    {!customModes[q.id] ? (
                      <div className="flex items-center space-x-2">
                        <div className="relative flex-1">
                          <select 
                            required={q.required && !customModes[q.id]}
                            className="w-full border-2 border-gray-100 rounded-2xl p-4 appearance-none focus:border-[#00468B] focus:bg-white bg-white shadow-sm outline-none transition-all font-bold text-gray-700"
                            value={String(formData[q.id] || '')}
                            onChange={(e) => setFormData({...formData, [q.id]: e.target.value})}
                          >
                            <option value="">Select option...</option>
                            {q.options?.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                          <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                        </div>
                        {q.allowCustomInput && (
                          <button 
                            type="button"
                            onClick={() => {
                              setCustomModes({...customModes, [q.id]: true});
                              setFormData({...formData, [q.id]: ''});
                            }}
                            className="px-4 py-4 shrink-0 rounded-2xl border-2 border-orange-200 text-orange-600 font-bold bg-orange-50 hover:bg-orange-100 transition-all whitespace-nowrap text-sm"
                          >
                            + ระบุเอง
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 animate-in fade-in zoom-in-95 duration-200">
                        <input 
                          type="text"
                          required={q.required}
                          autoFocus
                          placeholder="กรุณาระบุรายละเอียด..."
                          className="flex-1 border-2 border-orange-200 bg-orange-50/50 rounded-2xl p-4 focus:border-orange-500 focus:bg-white shadow-sm outline-none transition-all font-bold text-sm text-gray-700 placeholder-orange-300"
                          value={String(formData[q.id] || '')}
                          onChange={(e) => setFormData({...formData, [q.id]: e.target.value})}
                        />
                        <button 
                          type="button"
                          onClick={() => {
                            setCustomModes({...customModes, [q.id]: false});
                            setFormData({...formData, [q.id]: ''});
                          }}
                          className="w-14 h-[56px] shrink-0 flex items-center justify-center rounded-2xl border-2 border-gray-100 text-gray-400 bg-gray-50 hover:bg-gray-100 hover:text-gray-600 transition-all"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {q.type === 'text' && (
                  <input 
                    type="text" 
                    required={q.required}
                    placeholder="Enter observation..."
                    className="w-full border-2 border-gray-100 rounded-2xl p-4 focus:border-[#00468B] focus:bg-white bg-white shadow-sm outline-none transition-all font-bold text-gray-700"
                    onChange={(e) => setFormData({...formData, [q.id]: e.target.value})}
                  />
                )}

                {q.type === 'number' && (
                  <input 
                    type="number" 
                    step="any"
                    required={q.required}
                    placeholder="0.00"
                    className="w-full border-2 border-gray-100 rounded-2xl p-4 focus:border-[#00468B] focus:bg-white bg-white shadow-sm outline-none transition-all font-bold text-gray-700"
                    onChange={(e) => setFormData({...formData, [q.id]: e.target.value})}
                  />
                )}

                {q.type === 'yesno' && (
                  <div className="space-y-2">
                    {!customModes[q.id] ? (
                      <div className="flex items-center space-x-2">
                        <div className="grid grid-cols-2 gap-4 flex-1">
                          {['Pass', 'Fail'].map(opt => (
                            <label key={opt} className={`flex items-center justify-center p-5 rounded-2xl border-2 cursor-pointer transition-all font-black text-xs uppercase tracking-widest ${
                              formData[q.id] === opt 
                                ? (opt === 'Pass' ? 'bg-green-50 border-green-500 text-green-700 shadow-md' : 'bg-red-50 border-red-500 text-red-700 shadow-md')
                                : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200 shadow-sm'
                            }`}>
                              <input 
                                type="radio" 
                                name={q.id} 
                                value={opt}
                                required={q.required && !customModes[q.id]}
                                className="hidden"
                                onChange={(e) => setFormData({...formData, [q.id]: e.target.value})}
                                checked={formData[q.id] === opt}
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                        {q.allowCustomInput && (
                          <button 
                            type="button"
                            onClick={() => {
                              setCustomModes({...customModes, [q.id]: true});
                              setFormData({...formData, [q.id]: ''});
                            }}
                            className="px-4 py-4 h-[62px] shrink-0 rounded-2xl border-2 border-orange-200 text-orange-600 font-bold bg-orange-50 hover:bg-orange-100 transition-all whitespace-nowrap text-sm"
                          >
                            + ระบุเอง
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 animate-in fade-in zoom-in-95 duration-200">
                        <input 
                          type="text"
                          required={q.required}
                          autoFocus
                          placeholder="กรุณาระบุรายละเอียด (Pass/Fail หรืออื่นๆ)..."
                          className="flex-1 border-2 border-orange-200 bg-orange-50/50 rounded-2xl p-4 focus:border-orange-500 focus:bg-white shadow-sm outline-none transition-all font-bold text-sm text-gray-700 placeholder-orange-300"
                          value={String(formData[q.id] || '')}
                          onChange={(e) => setFormData({...formData, [q.id]: e.target.value})}
                        />
                        <button 
                          type="button"
                          onClick={() => {
                            setCustomModes({...customModes, [q.id]: false});
                            setFormData({...formData, [q.id]: ''});
                          }}
                          className="w-14 h-[56px] shrink-0 flex items-center justify-center rounded-2xl border-2 border-gray-100 text-gray-400 bg-gray-50 hover:bg-gray-100 hover:text-gray-600 transition-all"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {q.type === 'composite' && (
                  <div className="bg-white p-6 rounded-3xl border-2 border-gray-100 shadow-sm space-y-6">
                    <div className="space-y-2">
                      {!customModes[q.id] ? (
                        <div className="flex items-center space-x-2">
                          <div className="grid grid-cols-2 gap-4 flex-1">
                            {['Normal', 'Alert'].map(opt => (
                              <label key={opt} className={`flex items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all font-black text-xs uppercase tracking-widest ${
                                formData[q.id] === opt 
                                  ? (opt === 'Normal' ? 'bg-green-50 border-green-500 text-green-700 shadow-md' : 'bg-red-50 border-red-500 text-red-700 shadow-md')
                                  : 'bg-gray-50 border-gray-50 text-gray-400 hover:border-gray-100'
                              }`}>
                                <input 
                                  type="radio" 
                                  name={q.id} 
                                  value={opt}
                                  required={q.required && !customModes[q.id]}
                                  className="hidden"
                                  onChange={(e) => setFormData({...formData, [q.id]: e.target.value})}
                                  checked={formData[q.id] === opt}
                                />
                                <span>{opt}</span>
                              </label>
                            ))}
                          </div>
                          {q.allowCustomInput && (
                            <button 
                              type="button"
                              onClick={() => {
                                setCustomModes({...customModes, [q.id]: true});
                                setFormData({...formData, [q.id]: ''});
                              }}
                              className="px-4 py-4 h-[54px] shrink-0 rounded-xl border-2 border-orange-200 text-orange-600 font-bold bg-orange-50 hover:bg-orange-100 transition-all whitespace-nowrap text-sm"
                            >
                              + ระบุเอง
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2 animate-in fade-in zoom-in-95 duration-200">
                          <input 
                            type="text"
                            required={q.required}
                            autoFocus
                            placeholder="กรุณาระบุรายละเอียดสถานะ..."
                            className="flex-1 border-2 border-orange-200 bg-orange-50/50 rounded-xl p-4 focus:border-orange-500 focus:bg-white shadow-sm outline-none transition-all font-bold text-sm text-gray-700 placeholder-orange-300"
                            value={String(formData[q.id] || '')}
                            onChange={(e) => setFormData({...formData, [q.id]: e.target.value})}
                          />
                          <button 
                            type="button"
                            onClick={() => {
                              setCustomModes({...customModes, [q.id]: false});
                              setFormData({...formData, [q.id]: ''});
                            }}
                            className="w-14 h-[54px] shrink-0 flex items-center justify-center rounded-xl border-2 border-gray-100 text-gray-400 bg-gray-50 hover:bg-gray-100 hover:text-gray-600 transition-all"
                          >
                            <X size={20} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Legacy auto-specify box for Fail/Alert or specific hardcoded keywords, kept for backward compatibility if customInput is off but needs notes */}
                {(!customModes[q.id] && (
                  q.label === 'อื่นๆ' ||
                  q.label.includes('(ระบุ)') || 
                  formData[q.id] === 'อื่นๆ' ||
                  formData[q.id] === 'Fail' ||
                  formData[q.id] === 'Alert'
                )) && (
                  <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center space-x-2 mb-2 px-1">
                       <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Detail Required (กรุณาระบุรายละเอียด)</span>
                    </div>
                    <input 
                      type="text" 
                      placeholder={language === 'TH' ? 'ระบุจำนวน / เลขล็อค / หมายเหตุเพิ่มเติม...' : 'Specify amount / lock no / notes...'}
                      className="w-full border-2 border-orange-100 bg-orange-50/30 rounded-2xl p-4 focus:border-orange-400 focus:bg-white shadow-sm outline-none transition-all font-bold text-sm text-gray-700 placeholder-orange-300"
                      value={String(formData[`${q.id}_other`] || '')}
                      onChange={(e) => setFormData({...formData, [`${q.id}_other`]: e.target.value})}
                      required={q.required && !formData[q.id]}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}

        </form>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="shrink-0 p-6 bg-white border-t border-gray-100 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] z-20 flex gap-4">
          <button 
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 px-8 py-4 border-2 border-gray-100 rounded-2xl text-gray-500 font-bold hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm uppercase tracking-widest"
          >
            Cancel
          </button>
          <button 
            type="submit"
            form="compliance-form"
            disabled={isSubmitting}
            className="flex-[2] px-8 py-4 bg-[#00468B] text-white rounded-2xl font-black hover:bg-[#003569] transition-all shadow-xl shadow-blue-900/20 active:scale-95 flex items-center justify-center space-x-2 disabled:opacity-50 text-sm uppercase tracking-widest"
          >
            {isSubmitting ? (
              <span className="flex items-center"><Clock size={20} className="animate-spin mr-2" /> {t.processing}</span>
            ) : (
              <span>{t.confirmSubmit}</span>
            )}
          </button>
      </div>
    </div>
  );
};

export default StaffDashboard;