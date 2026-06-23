import { useState, useEffect } from 'react';
import { useApp } from '../../AppContext';
import { 
  Clock, 
  CheckCircle2, 
  FileText,
  PartyPopper
} from 'lucide-react';
import type { Submission, Schedule, DynamicForm } from '../../types';
import { useSchedules, useForms, useAddSubmission } from '../../hooks/queries';
import { translations } from '../../i18n';
import { getLockStatus, getSubmitDeadline, getLocalTodayStr, getShiftAllowStartTime, getShiftStartTime } from '../../utils/shiftTime';
import { FormRenderer } from '../shared/FormRenderer';

/** Live countdown: re-renders every second until deadline */
function useCountdown(scheduleDate: string, shift: import('../../types').Shift, lockoutHours?: Record<string, number>, shiftsConfig?: Record<string, string>) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const allowStartTime = getShiftAllowStartTime(scheduleDate, shift, shiftsConfig);
  const isEarly = now < allowStartTime;

  const deadline = getSubmitDeadline(scheduleDate, shift, lockoutHours, shiftsConfig);
  const diffMs = deadline.getTime() - now.getTime();
  const isLockedTime = diffMs <= 0;

  const isLocked = isLockedTime || isEarly;
  
  let label: string;
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

  const today = getLocalTodayStr();
  
  const mySchedules = currentUser 
    ? schedules.filter(s => s.staffId === currentUser.id && s.date === today && s.formId).sort((a, b) => {
        const getPriority = (schedule: Schedule) => {
           const lock = getLockStatus(schedule.date, schedule.shift, lockoutHours, shiftsConfig);
           if (!lock.isLocked) {
               return schedule.status === 'Pending' ? 1 : 2;
           } else {
               return lock.isEarly ? 3 : 4;
           }
        };

        const prioA = getPriority(a);
        const prioB = getPriority(b);
        
        if (prioA !== prioB) return prioA - prioB;
        
        const timeA = getShiftStartTime(a.date, a.shift, shiftsConfig).getTime();
        const timeB = getShiftStartTime(b.date, b.shift, shiftsConfig).getTime();
        return timeA - timeB;
      })
    : [];
  
  const [activeSchedule, setActiveSchedule] = useState<Schedule | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleFinishSubmission = (data: Submission) => {
    submitForm(data, {
      onSuccess: () => {
        setActiveSchedule(null);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      },
      onError: (err) => {
        alert("Failed to save submission: " + (err instanceof Error ? err.message : String(err)));
      }
    });
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
          <p className="text-blue-200 text-xs font-black uppercase tracking-[0.2em]">สวัสดี, {currentUser?.name?.split(' ')[0] || 'คุณ'}</p>
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
  const cd = useCountdown(s.date, s.shift, lockoutHours, shiftsConfig);

  return (
    <div 
      className={`${fullWidth ? 'w-full' : 'min-w-[280px] md:min-w-[320px]'} snap-start p-6 rounded-3xl border-2 transition-all flex flex-col justify-between ${
        isCompleted
          ? 'bg-green-50/60 border-green-200 opacity-80'
          : cd.isLocked
          ? (cd.isEarly ? 'bg-orange-50/60 border-orange-100 opacity-80' : 'bg-red-50/60 border-red-100 opacity-80')
          : 'bg-white border-[#00468B]/10 shadow-lg shadow-blue-900/5'
      }`}
    >
      <div className="space-y-4">
        {/* Top row: shift badge + lock badge */}
        <div className="flex items-center justify-between">
            <span className={`text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${
              s.shift === 'Morning' ? 'bg-orange-50 text-orange-600' : 
              s.shift === 'Afternoon' ? 'bg-blue-50 text-blue-600' :
              s.shift === 'NightBeforeMorning' ? 'bg-green-50 text-green-600' :
              'bg-indigo-50 text-indigo-600'
            }`}>{s.shift}</span>
            {isCompleted && <CheckCircle2 className="text-green-500" size={16} />}
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
        {isCompleted ? (
          <div className="flex items-center gap-2">
            <span className="px-5 py-2 rounded-xl text-xs font-bold bg-green-100 text-green-700 border border-green-200">
              ✓ {t.completed || 'เสร็จแล้ว'}
            </span>
            {!cd.isLocked && (
              <button 
                onClick={onAudit}
                className="px-4 py-2 rounded-xl text-xs font-bold shadow-sm active:scale-95 transition-all bg-white border-2 border-gray-100 text-gray-600 hover:bg-gray-50"
              >
                แก้ไข
              </button>
            )}
          </div>
        ) : cd.isLocked ? (
          <span className={`px-5 py-2 rounded-xl text-xs font-bold ${cd.isEarly ? 'bg-orange-50 text-orange-400 border border-orange-100' : 'bg-red-50 text-red-400 border border-red-100'}`}>
            {cd.isEarly ? 'ยังไม่ถึงเวลา' : (t.notDone || 'ไม่ได้ทำ')}
          </span>
        ) : (
          <button 
            onClick={onAudit}
            className="px-5 py-2 rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all bg-[#00468B] text-white"
          >
            Audit Now
          </button>
        )}
      </div>
    </div>
  );
};


const TrendingUpIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
);

export default StaffDashboard;