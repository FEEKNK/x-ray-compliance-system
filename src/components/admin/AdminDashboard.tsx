import React, { useState } from 'react';
import { useSchedules, useUsers, useForms, useAlerts, useAddAlert, useMarkAlertAsRead, useSubmissions } from '../../hooks/queries';
import { useApp } from '../../AppContext';
import { CheckCircle, AlertTriangle, Clock, TrendingUp, ShieldAlert, Info, BellRing, MailWarning, XCircle } from 'lucide-react';
import { translations } from '../../i18n';
import { getLocalTodayStr, parseDbDate, getSubmitDeadline } from '../../utils/shiftTime';

import type { Shift } from '../../types';

const AdminDashboard: React.FC = () => {
  const { language, settings } = useApp();
  const { mutate: addAlert } = useAddAlert();
  const { mutate: markAlertAsRead } = useMarkAlertAsRead();
  const { data: users = [] } = useUsers();
  const { data: forms = [] } = useForms();
  const { data: schedules = [] } = useSchedules();
  const { data: alerts = [] } = useAlerts();
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
  const criticalSubmissions = submissions.filter(sub => {
    const isDaily = dailySchedules.some(s => s.id === sub.scheduleId);
    return isDaily && Object.values(sub.data).some(v => v === 'Fail' || v === 'Alert');
  }).length;

  const formCoverage = forms
    .filter(f => f.department === selectedDept)
    .map(f => {
      const assignment = dailySchedules.find(s => s.formId === f.id);
      return {
        id: f.id,
        title: f.title,
        status: assignment ? assignment.status : 'Unassigned',
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
            className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              selectedDept === dept
                ? 'bg-[#00468B] text-white shadow-lg'
                : 'text-gray-400 hover:bg-gray-50'
            }`}
          >
            {dept}
          </button>
        ))}
      </div>

      {/* Shift Breakdown Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(['Morning', 'Afternoon', 'Night'] as Shift[]).map((shift) => {
          const shiftSchedules = dailySchedules.filter(s => s.shift === shift);
          const shiftCompleted = shiftSchedules.filter(s => s.status === 'Completed').length;
          const shiftPending = shiftSchedules.filter(s => s.status === 'Pending').length;
          const shiftTotal = shiftSchedules.length;
          const shiftRate = shiftTotal > 0 ? Math.round((shiftCompleted / shiftTotal) * 100) : 0;

          return (
            <div key={shift} className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    shift === 'Morning' ? 'bg-orange-400' : shift === 'Afternoon' ? 'bg-blue-400' : 'bg-indigo-500'
                  }`}></div>
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                    {shift === 'Morning' ? t.morning : shift === 'Afternoon' ? t.afternoon : t.night}
                  </h3>
                </div>
                <span className="text-lg font-black text-[#00468B]">{shiftRate}%</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50/50 p-3 rounded-xl border border-green-50">
                  <p className="text-[9px] font-black text-green-600 uppercase tracking-tighter mb-1">Done</p>
                  <p className="text-xl font-black text-green-700">{shiftCompleted}</p>
                </div>
                <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-50">
                  <p className="text-[9px] font-black text-amber-600 uppercase tracking-tighter mb-1">Wait</p>
                  <p className="text-xl font-black text-amber-700">{shiftPending}</p>
                </div>
              </div>

              {/* Progress bar at bottom */}
              <div className="absolute bottom-0 left-0 h-1 bg-gray-50 w-full">
                <div 
                  className={`h-full transition-all duration-1000 ${
                    shift === 'Morning' ? 'bg-orange-400' : shift === 'Afternoon' ? 'bg-blue-400' : 'bg-indigo-500'
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

      {/* ── Overdue Tasks Section ─────────────────── */}
      {overdueItems.length > 0 && (
        <div className="bg-white rounded-2xl border-2 border-orange-200 overflow-hidden shadow-sm animate-in slide-in-from-top-2">
          <div className="p-5 bg-orange-50 flex items-center justify-between border-b border-orange-100">
            <div className="flex items-center space-x-3 text-orange-700">
              <XCircle size={20} />
              <div>
                <h3 className="font-black text-sm">งานหมดเวลาแล้ว แต่ยังไม่ได้ทำ</h3>
                <p className="text-[10px] font-medium text-orange-500 mt-0.5">เวรที่ผ่านกำหนดส่งแล้วและยังค้างสถานะ Pending</p>
              </div>
            </div>
            <span className="text-xs font-black text-white bg-orange-500 px-3 py-1.5 rounded-xl shadow-sm">
              {overdueItems.length} รายการ
            </span>
          </div>

          <div className="divide-y divide-orange-50">
            {overdueItems.map((item, i) => (
              <div key={item.scheduleId} className="flex items-center justify-between px-6 py-4 hover:bg-orange-50/40 transition-colors group animate-in fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex items-center space-x-4">
                  <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                    <Clock size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800 leading-tight">{item.formTitle}</p>
                    <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                      {item.staffName}
                      <span className="mx-1.5">·</span>
                      <span className={`font-black uppercase tracking-tight ${
                        item.shift === 'Morning' ? 'text-orange-500' :
                        item.shift === 'Afternoon' ? 'text-blue-500' : 'text-indigo-500'
                      }`}>{item.shift}</span>
                      {item.location !== '—' && <><span className="mx-1.5">·</span>{item.location}</>}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-black text-orange-600 bg-orange-100 border border-orange-200 px-3 py-1.5 rounded-lg uppercase tracking-wide">
                  หมดเวลา
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-8">
          {alerts.length > 0 && (
            <div className="bg-red-50 rounded-2xl border-2 border-red-100 overflow-hidden animate-in slide-in-from-top-4">
               <div className="p-6 bg-red-100/50 flex items-center justify-between">
                  <div className="flex items-center space-x-3 text-red-700">
                     <BellRing size={20} />
                     <h3 className="font-black text-xs uppercase tracking-widest">Alert Center: Clinical Overdue</h3>
                  </div>
                  <span className="text-[10px] font-bold text-red-600 bg-white px-2 py-1 rounded-lg">{alerts.filter(a => !a.isRead).length} New Alerts</span>
               </div>
               <div className="divide-y divide-red-100">
                  {alerts.slice(0, 3).map(alert => (
                    <div key={alert.id} className={`p-4 flex items-center justify-between group ${alert.isRead ? 'opacity-50' : ''}`}>
                       <div className="flex items-center space-x-4">
                          <div className="w-8 h-8 rounded-lg bg-white text-red-600 flex items-center justify-center shrink-0 shadow-sm">
                             <MailWarning size={16} />
                          </div>
                          <div>
                             <p className="text-xs font-bold text-red-900 leading-tight">{alert.message}</p>
                             <p className="text-[9px] font-medium text-red-500 mt-1 uppercase tracking-tighter">{parseDbDate(alert.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}</p>
                          </div>
                       </div>
                       {!alert.isRead && (
                         <button 
                          onClick={() => markAlertAsRead(alert.id)}
                          className="text-[9px] font-black text-red-700 uppercase bg-white border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
                         >
                           Mark Read
                         </button>
                       )}
                    </div>
                  ))}
               </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
             <div className="flex items-center justify-between mb-8">
                <div>
                   <h3 className="text-lg font-bold text-[#00468B]">{t.dailyFormCoverage}</h3>
                   <p className="text-xs text-gray-400 font-medium">Verification status for every machine protocol today</p>
                </div>
                <div className="flex items-center space-x-2">
                   <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 rounded-full bg-gray-200"></div>
                      <span className="text-[8px] font-black text-gray-400 uppercase">Pending</span>
                   </div>
                   <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-[8px] font-black text-gray-400 uppercase">Done</span>
                   </div>
                </div>
             </div>
             
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {formCoverage.map(item => (
                  <div key={item.id} className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${
                    item.status === 'Completed' ? 'bg-green-50 border-green-100' : 
                    item.status === 'Pending' ? 'bg-amber-50 border-amber-100' : 'bg-gray-50 border-gray-100'
                  }`}>
                    <p className={`text-[9px] font-bold leading-tight mb-2 line-clamp-2 ${
                      item.status === 'Completed' ? 'text-green-700' : 
                      item.status === 'Pending' ? 'text-amber-700' : 'text-gray-400'
                    }`}>{item.title}</p>
                    <div className="flex items-center justify-between">
                       <span className="text-[8px] font-black uppercase opacity-50">
                        {item.shift ? item.shift.charAt(0) : '—'}
                       </span>
                       {item.status === 'Completed' ? <CheckCircle size={10} className="text-green-500" /> : <Info size={10} className="text-gray-300" />}
                    </div>
                  </div>
                ))}
             </div>
          </div>


      </div>
    </div>
  );
};


const StatCard: React.FC<{ title: string, value: string | number, icon: React.ReactNode, color: string, bg: string }> = ({ title, value, icon, color, bg }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
    <div className={`w-10 h-10 rounded-xl ${bg} ${color} flex items-center justify-center mb-4`}>
      {icon}
    </div>
    <div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{title}</p>
      <p className="text-2xl font-black text-gray-800">{value}</p>
    </div>
  </div>
);

export default AdminDashboard;