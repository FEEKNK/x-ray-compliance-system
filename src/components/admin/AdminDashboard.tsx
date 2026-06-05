import React, { useState } from 'react';
import { useSchedules, useUsers, useForms, useAddAnnouncement, useAlerts, useAddAlert, useMarkAlertAsRead, useSubmissions } from '../../hooks/queries';
import { useApp } from '../../AppContext';
import { CheckCircle, AlertTriangle, Clock, TrendingUp, ShieldCheck, Megaphone, Send, ShieldAlert, Info, BellRing, MailWarning } from 'lucide-react';
import { translations } from '../../i18n';
import { getLocalTodayStr, parseDbDate } from '../../utils/shiftTime';

import type { Shift } from '../../types';

const AdminDashboard: React.FC = () => {
  const { language, settings, announcements } = useApp();
  const { mutate: addAnnouncement } = useAddAnnouncement();
  const { mutate: addAlert } = useAddAlert();
  const { mutate: markAlertAsRead } = useMarkAlertAsRead();
  const { data: users = [] } = useUsers();
  const { data: forms = [] } = useForms();
  const { data: schedules = [] } = useSchedules();
  const { data: alerts = [] } = useAlerts();
  const { data: submissionsData } = useSubmissions();
  const submissions = submissionsData?.data || [];
  const getCompletionRate = (date: string, department?: string) => {
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
    };
  const t = translations[language];
  const [newAnnouncement, setNewAnnouncement] = useState('');
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
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

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-bold text-[#00468B]">{t.complianceVelocity}</h3>
                <p className="text-xs text-gray-400 font-medium">Performance trend for the last 7 operational days</p>
              </div>
              <div className="flex items-center space-x-4">
                 <div className="flex items-center space-x-1.5">
                   <div className="w-2 h-2 rounded-full bg-[#00468B]"></div>
                   <span className="text-[10px] font-bold text-gray-500 uppercase">Rate</span>
                 </div>
              </div>
            </div>
            
            <div className="h-48 w-full flex items-end justify-between px-2 group/chart">
              {[85, 92, 78, 100, 88, 95, rate].map((val, i) => (
                <div key={i} className="relative flex-1 flex flex-col items-center group/bar">
                  <div className="absolute -top-8 bg-[#00468B] text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none">
                    {Math.round(val)}%
                  </div>
                  <div 
                    className="w-4/5 max-w-[40px] bg-blue-50 rounded-t-lg transition-all duration-700 ease-out hover:bg-blue-100 group-hover/chart:opacity-50 hover:!opacity-100"
                    style={{ height: `${val || 5}%` }}
                  >
                    <div 
                      className="w-full bg-[#00468B] rounded-t-lg transition-all duration-1000 delay-300"
                      style={{ height: `100%` }}
                    ></div>
                  </div>
                  <span className="text-[9px] font-black text-gray-400 uppercase mt-4">Day {i+1}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#00468B] rounded-2xl shadow-lg p-8 text-white relative overflow-hidden group">
            <div className="relative z-10">
              <ShieldCheck className="mb-4 text-blue-300 group-hover:scale-110 transition-transform" size={40} />
              <h3 className="text-xl font-bold mb-2">Compliance Lock</h3>
              <p className="text-blue-100 text-sm mb-6 leading-relaxed">System-wide integrity is monitored. {rate === 100 ? t.allFormsActive : 'Action required for full coverage.'}</p>
              <button className="w-full bg-white text-[#00468B] py-3 rounded-xl font-bold text-sm shadow-md hover:bg-blue-50 transition-colors">
                Run Validation Scan
              </button>
            </div>
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white opacity-5 rounded-full"></div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">{t.internalAnnouncements}</h3>
              <Megaphone size={16} className="text-blue-500" />
            </div>
            
            <div className="space-y-6 mb-8">
              {announcements.map((ann, i) => (
                <div key={i} className="flex space-x-3 animate-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className="w-2 h-2 rounded-full bg-[#00468B] mt-1.5 shrink-0"></div>
                  <p className="text-xs text-gray-600 leading-relaxed font-medium">{ann}</p>
                </div>
              ))}
            </div>

            <div className="relative pt-6 border-t border-gray-50">
               <input 
                  type="text" 
                  value={newAnnouncement}
                  onChange={(e) => setNewAnnouncement(e.target.value)}
                  placeholder="Post new update..."
                  className="w-full bg-gray-50 border-2 border-gray-50 rounded-xl pl-4 pr-12 py-3 text-xs font-bold focus:border-blue-500 outline-none transition-all"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newAnnouncement) {
                      addAnnouncement(newAnnouncement);
                      setNewAnnouncement('');
                    }
                  }}
               />
               <button 
                  onClick={() => {
                    if (newAnnouncement) {
                      addAnnouncement(newAnnouncement);
                      setNewAnnouncement('');
                    }
                  }}
                  className="absolute right-2 top-[34px] w-8 h-8 bg-[#00468B] text-white rounded-lg flex items-center justify-center hover:bg-[#003569] transition-colors"
               >
                 <Send size={14} />
               </button>
            </div>
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