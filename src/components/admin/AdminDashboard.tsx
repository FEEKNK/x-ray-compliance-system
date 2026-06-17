import React, { useState } from 'react';
import { useSchedules, useUsers, useForms, useAddAlert, useSubmissions } from '../../hooks/queries';
import { useApp } from '../../AppContext';
import { CheckCircle, AlertTriangle, Clock, TrendingUp, ShieldAlert, Info, XCircle } from 'lucide-react';
import { translations } from '../../i18n';
import { getLocalTodayStr, getSubmitDeadline } from '../../utils/shiftTime';

import type { Shift } from '../../types';

const AdminDashboard: React.FC = () => {
  const { language, settings } = useApp();
  const { mutate: addAlert } = useAddAlert();
  const { data: users = [] } = useUsers();
  const { data: forms = [] } = useForms();
  const { data: schedules = [] } = useSchedules();
  const { data: submissionsData } = useSubmissions();
  const submissions = submissionsData?.data || [];
  const getCompletionRate = React.useCallback((date: string, department?: string) => {
      let dailySchedules = schedules.filter(s => s.date === date);
      if (department) {
        dailySchedules = dailySchedules.filter(s => {
          const form = forms.find(f => f.id === s.formId);
          return form?.department === department;
        });
      }
      if (dailySchedules.length === 0) return 0;
      const completed = dailySchedules.filter(s => s.status === 'Completed').length;
      return (completed / dailySchedules.length) * 100;
    }, [schedules, forms]);
  const t = translations[language];
  const [selectedDept, setSelectedDept] = useState<string>(settings?.departments?.[0] || 'IMAGING');
  
  const today = getLocalTodayStr();
  const rate = getCompletionRate(today, selectedDept);
  
  const dailySchedules = schedules.filter(s => {
    const form = forms.find(f => f.id === s.formId);
    return s.date === today && form?.department === selectedDept;
  });
  const pending = dailySchedules.filter(s => s.status === 'Pending').length;
  const completed = dailySchedules.filter(s => s.status === 'Completed').length;

  // Dynamic Critical Alerts from Submissions (Filtered for today and selected department)
  const criticalSubmissionItems = React.useMemo(() => {
    return submissions.filter(sub => {
      const isDaily = dailySchedules.some(s => s.id === sub.scheduleId);
      return isDaily && Object.values(sub.data).some(v => v === 'Fail' || v === 'Alert');
    }).map(sub => {
      const schedule = dailySchedules.find(s => s.id === sub.scheduleId);
      const staff = users.find(u => u.id === sub.staffId);
      const form = forms.find(f => f.id === schedule?.formId);
      
      const failedFields = Object.entries(sub.data)
        .filter(([_, v]) => v === 'Fail' || v === 'Alert')
        .map(([k, _]) => {
          let label = k;
          if (form) {
            const q = form.questions?.find(q => q.id === k);
            if (q) label = q.label;
          }
          const detail = sub.data[`${k}_other`];
          if (detail && typeof detail === 'string' && detail.trim() !== '') {
            return `${label}: ${detail}`;
          }
          return label;
        });
        
      return {
        submissionId: sub.id,
        formTitle: form?.title || '—',
        staffName: staff?.name || '—',
        shift: schedule?.shift || '—',
        location: schedule?.location || '—',
        failedFields
      };
    });
  }, [submissions, dailySchedules, users, forms]);

  const criticalSubmissions = criticalSubmissionItems.length;

  const formCoverage = forms
    .filter(f => f.department === selectedDept)
    .map(f => {
      const assignment = dailySchedules.find(s => s.formId === f.id);
      let status = assignment ? assignment.status : 'Unassigned';
      
      if (status === 'Pending' && assignment) {
        const now = new Date();
        const deadline = getSubmitDeadline(
          assignment.date,
          assignment.shift as import('../../types').Shift,
          settings?.lockoutHours,
          settings?.shifts
        );
        if (now >= deadline) {
          status = 'Overdue';
        }
      }

      return {
        id: f.id,
        title: f.title,
        status,
        shift: assignment?.shift
      };
    });

  // Overdue: Pending schedules whose submission deadline has already passed
  const overdueItems = React.useMemo(() => {
    const now = new Date();
    return dailySchedules
      .filter(s => s.status === 'Pending')
      .filter(s => {
        const deadline = getSubmitDeadline(
          s.date,
          s.shift as import('../../types').Shift,
          settings?.lockoutHours,
          settings?.shifts
        );
        return now >= deadline;
      })
      .map(s => {
        const staff = users.find(u => u.id === s.staffId);
        const form = forms.find(f => f.id === s.formId);
        return { scheduleId: s.id, staffName: staff?.name || '—', formTitle: form?.title || '—', shift: s.shift, location: s.location || '—' };
      });
  }, [dailySchedules, users, forms, settings]);

  const runComplianceAudit = () => {
    const overdue = dailySchedules.filter(s => s.status === 'Pending');
    const uncovered = forms.filter(f => !dailySchedules.some(s => s.formId === f.id));
    
    if (overdue.length > 0) {
      overdue.forEach(s => {
        const staff = users.find(u => u.id === s.staffId);
        const form = forms.find(f => f.id === s.formId);
        addAlert({
          type: 'Missed Task',
          message: `OVERDUE: ${staff?.name} has not completed ${form?.title} at ${s.location || 'Assigned Area'}.`,
          staffId: s.staffId,
          formId: s.formId
        });
      });
      alert(`SYSTEM ALERT: ${overdue.length} overdue tasks detected. Alerts logged.`);
    } else if (uncovered.length > 0) {
      alert(`COMPLIANCE GAP: ${uncovered.length} protocols not yet assigned for today.`);
    } else {
      alert('COMPLIANCE SECURE: All systems operational.');
    }
  };



  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Hospital Compliance Overview</h1>
          <p className="text-sm text-gray-500 font-medium">{settings.hospitalName} | Daily Operations</p>
        </div>
        <div className="flex space-x-3">
           <button 
            onClick={runComplianceAudit}
            className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold bg-white border-2 border-gray-50 text-red-600 hover:bg-red-50 transition-all shadow-sm"
           >
             <ShieldAlert size={16} className="mr-2" />
             Run Audit
           </button>
           <span className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold bg-green-50 text-green-700 border border-green-100 shadow-sm">
             <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2"></span>
             Safe Status
           </span>
        </div>
      </div>

      {/* Department Selector */}
      <div className="flex bg-white p-2 rounded-2xl border border-gray-100 shadow-sm w-fit">
        {(settings?.departments || []).map((dept) => (
          <button
            key={dept}
            onClick={() => setSelectedDept(dept)}
            className={`px-8 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${
              selectedDept === dept
                ? 'bg-[#00468B] text-white shadow-lg'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            {dept}
          </button>
        ))}
      </div>

      {/* Shift Breakdown Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {(['Morning', 'Afternoon', 'Night', 'NightBeforeMorning'] as Shift[]).map((shift) => {
          const shiftSchedules = dailySchedules.filter(s => s.shift === shift);
          const shiftCompleted = shiftSchedules.filter(s => s.status === 'Completed').length;
          const shiftPending = shiftSchedules.filter(s => s.status === 'Pending').length;
          const shiftTotal = shiftSchedules.length;
          const shiftRate = shiftTotal > 0 ? Math.round((shiftCompleted / shiftTotal) * 100) : 0;

          return (
            <div key={shift} className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    shift === 'Morning' ? 'bg-orange-400' : shift === 'Afternoon' ? 'bg-blue-400' : shift === 'NightBeforeMorning' ? 'bg-green-500' : 'bg-indigo-500'
                  }`}></div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-gray-500">
                    {shift === 'Morning' ? t.morning : shift === 'Afternoon' ? t.afternoon : shift === 'NightBeforeMorning' ? t.nightBeforeMorning : t.night}
                  </h3>
                </div>
                <span className="text-lg font-black text-[#00468B]">{shiftRate}%</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50/50 p-4 rounded-xl border border-green-50">
                  <p className="text-xs font-black text-green-600 uppercase tracking-wider mb-1">Done</p>
                  <p className="text-2xl font-black text-green-700">{shiftCompleted}</p>
                </div>
                <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-50">
                  <p className="text-xs font-black text-amber-600 uppercase tracking-wider mb-1">Wait</p>
                  <p className="text-2xl font-black text-amber-700">{shiftPending}</p>
                </div>
              </div>

              {/* Progress bar at bottom */}
              <div className="absolute bottom-0 left-0 h-1 bg-gray-50 w-full">
                <div 
                  className={`h-full transition-all duration-1000 ${
                    shift === 'Morning' ? 'bg-orange-400' : shift === 'Afternoon' ? 'bg-blue-400' : shift === 'NightBeforeMorning' ? 'bg-green-500' : 'bg-indigo-500'
                  }`}
                  style={{ width: `${shiftRate}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title={t.globalCompliance} 
          value={`${Math.round(rate)}%`} 
          icon={<TrendingUp size={20} />}
          color="text-[#00468B]"
          bg="bg-blue-50"
        />
        <StatCard 
          title={t.verifiedReports} 
          value={completed} 
          icon={<CheckCircle size={20} />}
          color="text-green-600"
          bg="bg-green-50"
        />
        <StatCard 
          title={t.pendingInspections} 
          value={pending} 
          icon={<Clock size={20} />}
          color="text-amber-600"
          bg="bg-amber-50"
        />
        <StatCard 
          title="Clinical Failures" 
          value={criticalSubmissions} 
          icon={<AlertTriangle size={20} />}
          color="text-red-600"
          bg="bg-red-50"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
         <div className="flex items-center justify-between mb-8">
            <div>
               <h3 className="text-lg font-bold text-[#00468B]">{t.dailyFormCoverage}</h3>
               <p className="text-xs text-gray-400 font-medium">Verification status for every machine protocol today</p>
            </div>
            <div className="flex items-center space-x-3">
               <div className="flex items-center space-x-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-300"></div>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Pending</span>
               </div>
               <div className="flex items-center space-x-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                  <span className="text-xs font-bold text-green-600 uppercase tracking-wide">Done</span>
               </div>
               <div className="flex items-center space-x-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                  <span className="text-xs font-bold text-red-600 uppercase tracking-wide">Missed</span>
               </div>
            </div>
         </div>
         
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {formCoverage.map(item => (
              <div key={item.id} className={`p-4 rounded-xl border transition-all flex flex-col justify-between shadow-sm hover:shadow-md ${
                item.status === 'Completed' ? 'bg-green-50 border-green-100' : 
                item.status === 'Overdue' ? 'bg-red-50 border-red-200' : 
                item.status === 'Pending' ? 'bg-amber-50 border-amber-100' : 'bg-gray-50 border-gray-100'
              }`}>
                <p className={`text-sm font-bold leading-snug mb-3 line-clamp-3 ${
                  item.status === 'Completed' ? 'text-green-700' : 
                  item.status === 'Overdue' ? 'text-red-700' : 
                  item.status === 'Pending' ? 'text-amber-700' : 'text-gray-500'
                }`}>{item.title}</p>
                <div className="flex items-center justify-between mt-auto">
                   <span className="text-xs font-black uppercase opacity-60">
                    {item.shift ? item.shift.charAt(0) : '—'}
                   </span>
                   {item.status === 'Completed' ? <CheckCircle size={16} className="text-green-500" /> : 
                    item.status === 'Overdue' ? <XCircle size={16} className="text-red-500" /> : 
                    <Info size={16} className="text-gray-400" />}
                </div>
              </div>
            ))}
         </div>
      </div>

      {/* ── Overdue Tasks Section ─────────────────── */}
      {overdueItems.length > 0 && (
        <div className="bg-white rounded-2xl border-2 border-orange-200 overflow-hidden shadow-sm animate-in slide-in-from-top-2">
          <div className="p-5 bg-orange-50 flex items-center justify-between border-b border-orange-100">
            <div className="flex items-center space-x-3 text-orange-700">
              <XCircle size={20} />
              <div>
                <h3 className="font-black text-base">งานหมดเวลาแล้ว แต่ยังไม่ได้ทำ</h3>
                <p className="text-xs font-medium text-orange-500 mt-1">เวรที่ผ่านกำหนดส่งแล้วและยังค้างสถานะ Pending</p>
              </div>
            </div>
            <span className="text-xs font-black text-white bg-orange-500 px-3 py-1.5 rounded-xl shadow-sm">
              {overdueItems.length} รายการ
            </span>
          </div>

          <div className="divide-y divide-orange-50 max-h-[400px] overflow-y-auto">
            {overdueItems.map((item, i) => (
              <div key={item.scheduleId} className="flex items-center justify-between px-6 py-4 hover:bg-orange-50/40 transition-colors group animate-in fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex items-center space-x-4">
                  <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                    <Clock size={16} />
                  </div>
                  <div>
                    <p className="text-base font-bold text-gray-800 leading-tight">{item.formTitle}</p>
                    <p className="text-xs text-gray-500 font-medium mt-1">
                      {item.staffName}
                      <span className="mx-1.5">·</span>
                      <span className={`font-black uppercase tracking-tight ${
                        item.shift === 'Morning' ? 'text-orange-500' :
                        item.shift === 'Afternoon' ? 'text-blue-500' : 
                        item.shift === 'NightBeforeMorning' ? 'text-green-500' : 'text-indigo-500'
                      }`}>{item.shift}</span>
                      {item.location !== '—' && <><span className="mx-1.5">·</span>{item.location}</>}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-black text-orange-600 bg-orange-100 border border-orange-200 px-3 py-1.5 rounded-lg uppercase tracking-wide">
                  หมดเวลา
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Critical Failures Section ─────────────────── */}
      {criticalSubmissionItems.length > 0 && (
        <div className="bg-white rounded-2xl border-2 border-red-200 overflow-hidden shadow-sm animate-in slide-in-from-top-2 mt-8">
          <div className="p-5 bg-red-50 flex items-center justify-between border-b border-red-100">
            <div className="flex items-center space-x-3 text-red-700">
              <AlertTriangle size={20} />
              <div>
                <h3 className="font-black text-base">รายการที่ตรวจพบปัญหา (Clinical Failures)</h3>
                <p className="text-xs font-medium text-red-500 mt-1">รายการที่มีการรายงานว่า Fail หรือมีความผิดปกติในวันนี้</p>
              </div>
            </div>
            <span className="text-xs font-black text-white bg-red-500 px-3 py-1.5 rounded-xl shadow-sm">
              {criticalSubmissionItems.length} รายการ
            </span>
          </div>

          <div className="divide-y divide-red-50 max-h-[400px] overflow-y-auto">
            {criticalSubmissionItems.map((item, i) => (
              <div key={item.submissionId} className="flex items-center justify-between px-6 py-4 hover:bg-red-50/40 transition-colors group animate-in fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex items-center space-x-4">
                  <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                    <AlertTriangle size={16} />
                  </div>
                  <div>
                    <p className="text-base font-bold text-gray-800 leading-tight">{item.formTitle}</p>
                    <p className="text-xs text-gray-500 font-medium mt-1">
                      {item.staffName}
                      <span className="mx-1.5">·</span>
                      <span className={`font-black uppercase tracking-tight ${
                        item.shift === 'Morning' ? 'text-orange-500' :
                        item.shift === 'Afternoon' ? 'text-blue-500' : 
                        item.shift === 'NightBeforeMorning' ? 'text-green-500' : 'text-indigo-500'
                      }`}>{item.shift}</span>
                      {item.location !== '—' && <><span className="mx-1.5">·</span>{item.location}</>}
                    </p>
                    {item.failedFields.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {item.failedFields.map(field => (
                          <span key={field} className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-md border border-red-200">
                            {field}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-xs font-black text-red-600 bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg uppercase tracking-wide">
                  ผิดปกติ
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


const StatCard: React.FC<{ title: string, value: string | number, icon: React.ReactNode, color: string, bg: string }> = ({ title, value, icon, color, bg }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
    <div className={`w-12 h-12 rounded-xl ${bg} ${color} flex items-center justify-center mb-4`}>
      {icon}
    </div>
    <div>
      <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">{title}</p>
      <p className="text-3xl font-black text-gray-800">{value}</p>
    </div>
  </div>
);

export default AdminDashboard;