import React, { useMemo, useState } from 'react';
import { useApp } from '../../AppContext';
import { 
  LineChart, Line, 
  XAxis, YAxis, 
  CartesianGrid, Tooltip, 
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import { Thermometer, Droplets, Calendar, Users, AlertCircle, ChevronLeft, ChevronRight, User, Check, Clock } from 'lucide-react';
import { translations } from '../../i18n';
import type { Schedule } from '../../types';

interface GroupedData {
  [date: string]: {
    date: string;
    temp: number[];
    humidity: number[];
  };
}

const MonthlyDashboard: React.FC = () => {
  const { submissions, forms, schedules, users, language } = useApp();
  const t = translations[language];

  // Month Selection State
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    d.setDate(1); 
    return d;
  });

  const selectedMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const todayStr = new Date().toISOString().split('T')[0];
  
  const handlePrevMonth = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  const monthDisplay = currentDate.toLocaleString(language === 'EN' ? 'en-US' : 'th-TH', { month: 'long', year: 'numeric' });

  // ==========================================
  // Environmental Chart Data
  // ==========================================
  const envChartData = useMemo(() => {
    const envForms = forms.filter(f => f.title.includes('อุณหภูมิ') || f.title.includes('ความชื้น'));
    const envFormIds = envForms.map(f => f.id);

    const envSubmissions = submissions.filter(s => {
      return envFormIds.includes(s.formId) && s.submittedAt.startsWith(selectedMonthStr);
    });

    const grouped = envSubmissions.reduce((acc: GroupedData, sub) => {
      const date = sub.submittedAt.split('T')[0];
      if (!acc[date]) acc[date] = { date, temp: [], humidity: [] };

      const tValue = parseFloat(sub.data['q3'] as string);
      const hValue = parseFloat((sub.data['q5'] || sub.data['q6']) as string);

      if (!isNaN(tValue)) acc[date].temp.push(tValue);
      if (!isNaN(hValue)) acc[date].humidity.push(hValue);

      return acc;
    }, {});

    return Object.values(grouped).map((day) => ({
      date: day.date,
      avgTemp: day.temp.length > 0 ? parseFloat((day.temp.reduce((a, b) => a + b, 0) / day.temp.length).toFixed(1)) : null,
      avgHumidity: day.humidity.length > 0 ? parseFloat((day.humidity.reduce((a, b) => a + b, 0) / day.humidity.length).toFixed(1)) : null,
    })).sort((a, b) => a.date.localeCompare(b.date));
  }, [submissions, forms, selectedMonthStr]);

  // ==========================================
  // Staff KPI Analytics
  // ==========================================
  const staffKPI = useMemo(() => {
    const staffList = users.filter(u => u.role === 'STAFF');
    return staffList.map(s => {
      const staffSchedules = schedules.filter(sch => sch.staffId === s.id && sch.date.startsWith(selectedMonthStr));
      const total = staffSchedules.length;
      const completed = staffSchedules.filter(sch => sch.status === 'Completed').length;
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
      return { id: s.id, name: s.name, department: s.department, total, completed, percent };
    }).sort((a, b) => b.percent - a.percent);
  }, [users, schedules, selectedMonthStr]);

  // ==========================================
  // Machine Error Analytics
  // ==========================================
  const machineErrors = useMemo(() => {
    const monthSubmissions = submissions.filter(s => s.submittedAt.startsWith(selectedMonthStr));
    const errorsMap: Record<string, number> = {};
    monthSubmissions.forEach(sub => {
      const hasAlert = Object.values(sub.data).some(v => v === 'Fail' || v === 'Alert');
      if (hasAlert) {
        errorsMap[sub.formId] = (errorsMap[sub.formId] || 0) + 1;
      }
    });
    
    return Object.keys(errorsMap).map(formId => {
      const form = forms.find(f => f.id === formId);
      return { formId, title: form?.title || 'Unknown', errorCount: errorsMap[formId] };
    }).sort((a, b) => b.errorCount - a.errorCount);
  }, [submissions, forms, selectedMonthStr]);

  // ==========================================
  // Staff Matrix Logic
  // ==========================================
  const staff = users.filter(u => u.role === 'STAFF');

  const getCellStatus = (staffId: string, day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const cellSchedules = schedules.filter(s => s.staffId === staffId && s.date === dateStr);
    
    if (cellSchedules.length === 0) return { status: 'none', count: 0, missedCount: 0 };
    
    const pending = cellSchedules.filter(s => s.status === 'Pending');
    const completed = cellSchedules.filter(s => s.status === 'Completed');
    
    if (pending.length === 0 && completed.length > 0) return { status: 'completed', count: completed.length, missedCount: 0 };
    
    if (pending.length > 0) {
      if (dateStr < todayStr) return { status: 'missed', count: cellSchedules.length, missedCount: pending.length };
      if (dateStr === todayStr) return { status: 'pending_today', count: cellSchedules.length, missedCount: 0 };
      return { status: 'scheduled', count: cellSchedules.length, missedCount: 0 };
    }
    
    return { status: 'none', count: 0, missedCount: 0 };
  };

  // Detailed missed tasks for the list below
  const missedDetails = useMemo(() => {
    const monthlySchedules = schedules.filter(s => s.date.startsWith(selectedMonthStr));
    const details: Array<Schedule & { staffName: string; formTitle: string }> = [];

    monthlySchedules.forEach(s => {
      if (s.status === 'Pending' && s.date < todayStr) {
        details.push({
          ...s,
          staffName: users.find(u => u.id === s.staffId)?.name || 'Unknown Staff',
          formTitle: forms.find(f => f.id === s.formId)?.title || 'Unknown Form'
        });
      }
    });

    return details.sort((a, b) => b.date.localeCompare(a.date));
  }, [schedules, users, forms, selectedMonthStr, todayStr]);

  return (
    <div className="p-4 md:p-6 space-y-8 animate-in fade-in duration-500 pb-24 max-w-[100vw] overflow-x-hidden">
      {/* Header & Month Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-800">{t.monthlyPerformance || 'Quality Dashboard'}</h2>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
            Performance & Compliance Matrix
          </p>
        </div>
        
        <div className="bg-white border border-gray-200 px-2 py-1.5 rounded-2xl flex items-center shadow-sm w-fit">
          <button onClick={handlePrevMonth} className="p-2 text-gray-400 hover:text-[#00468B] hover:bg-blue-50 rounded-xl transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center space-x-2 px-4 min-w-[140px] justify-center">
             <Calendar size={18} className="text-[#00468B]" />
             <span className="text-sm font-black text-[#00468B] uppercase tracking-widest">{monthDisplay}</span>
          </div>
          <button onClick={handleNextMonth} className="p-2 text-gray-400 hover:text-[#00468B] hover:bg-blue-50 rounded-xl transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Matrix Audit Table */}
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users size={20} />
            </div>
            <div>
              <span className="font-bold text-gray-700 block">ตารางสรุปการทำงาน (Compliance Matrix)</span>
              <span className="text-xs text-gray-400">ภาพรวมการตรวจสอบงานแต่ละวันของพนักงาน</span>
            </div>
          </div>
          <div className="hidden md:flex items-center space-x-4 text-xs font-bold text-gray-500">
             <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-green-500 mr-1.5"></span>ทำครบถ้วน</div>
             <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-red-500 mr-1.5"></span>ลืมทำ/ค้าง</div>
             <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-orange-400 mr-1.5"></span>รอทำวันนี้</div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="sticky left-0 z-20 bg-white p-5 text-left border-b border-r border-gray-100 min-w-[200px] shadow-[4px_0_12px_rgba(0,0,0,0.02)]">
                  <div className="flex items-center space-x-2">
                    <User size={14} className="text-[#00468B]" />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">พนักงาน (Staff)</span>
                  </div>
                </th>
                {Array.from({ length: daysInMonth }).map((_, i) => (
                  <th key={i} className="p-3 border-b border-gray-100 min-w-[40px] text-center">
                    <span className="text-[10px] font-black text-gray-500">{i + 1}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staff.map(s => {
                return (
                  <tr key={s.id} className="group hover:bg-gray-50/50 transition-all">
                    <td className="sticky left-0 z-10 bg-white p-4 border-r border-gray-100 shadow-[4px_0_12px_rgba(0,0,0,0.02)]">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-800 text-sm">{s.name}</span>
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">{s.department}</span>
                      </div>
                    </td>
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const day = i + 1;
                      const { status, missedCount } = getCellStatus(s.id, day);
                      
                      return (
                        <td key={i} className="p-1 border-r border-gray-50 text-center">
                          <div className="flex justify-center items-center h-full w-full py-2">
                            {status === 'completed' && <Check size={16} className="text-green-500 stroke-[3]" />}
                            {status === 'missed' && (
                               <div className="flex items-center justify-center w-5 h-5 rounded-md bg-red-100 text-red-600 font-black text-[10px]">
                                 {missedCount}
                               </div>
                            )}
                            {status === 'pending_today' && <Clock size={14} className="text-orange-400" />}
                            {status === 'scheduled' && <div className="w-1.5 h-1.5 rounded-full bg-gray-200"></div>}
                            {status === 'none' && <span className="text-gray-200">-</span>}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Missed Tasks Table */}
      {missedDetails.length > 0 && (
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center space-x-3 bg-red-50/30">
            <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
              <AlertCircle size={16} />
            </div>
            <span className="font-bold text-red-700">รายการที่ลืมตรวจสอบทั้งหมดในเดือนนี้ (Missed Tasks List)</span>
            <span className="bg-red-100 text-red-700 py-0.5 px-2.5 rounded-full text-xs font-bold ml-auto">
              {missedDetails.length} รายการ
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-6 py-4">วันที่ (Date)</th>
                  <th className="px-6 py-4">เวร (Shift)</th>
                  <th className="px-6 py-4">พนักงาน (Staff)</th>
                  <th className="px-6 py-4">รายการที่ต้องทำ (Task)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {missedDetails.map((missed) => (
                  <tr key={missed.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-700">{missed.date}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-gray-100 text-gray-600">
                        {missed.shift}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-800">{missed.staffName}</td>
                    <td className="px-6 py-4 text-red-600 font-medium">{missed.formTitle}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Analytics Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Staff KPI Analytics */}
        <div className="bg-white p-6 md:p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
              <Users size={20} />
            </div>
            <span className="font-bold text-gray-700">Staff KPI (ความสำเร็จในการทำงาน)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-4 py-3">พนักงาน</th>
                  <th className="px-4 py-3 text-center">มอบหมาย</th>
                  <th className="px-4 py-3 text-center">สำเร็จ</th>
                  <th className="px-4 py-3 text-center">KPI (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {staffKPI.map((staff) => (
                  <tr key={staff.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-bold text-gray-800">{staff.name}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{staff.total}</td>
                    <td className="px-4 py-3 text-center text-green-600 font-bold">{staff.completed}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center justify-center px-2 py-1 rounded font-bold text-xs ${
                        staff.percent >= 90 ? 'bg-green-100 text-green-700' :
                        staff.percent >= 70 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {staff.percent}%
                      </span>
                    </td>
                  </tr>
                ))}
                {staffKPI.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-4 text-gray-400">ไม่มีข้อมูลพนักงาน</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Machine Error Analytics */}
        <div className="bg-white p-6 md:p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center">
              <AlertCircle size={20} />
            </div>
            <span className="font-bold text-gray-700">Machine Error Analytics (ปัญหาเครื่องมือ)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-4 py-3">โปรโตคอล / เครื่องมือ</th>
                  <th className="px-4 py-3 text-center">จำนวนครั้งที่พบปัญหา</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {machineErrors.slice(0, 5).map((machine) => (
                  <tr key={machine.formId} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-bold text-gray-800">{machine.title}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600 font-black">
                        {machine.errorCount}
                      </span>
                    </td>
                  </tr>
                ))}
                {machineErrors.length === 0 && (
                  <tr>
                    <td colSpan={2} className="text-center py-4 text-gray-400">ไม่พบปัญหาเครื่องมือในเดือนนี้</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Environmental Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Temperature Chart */}
        <div className="bg-white p-6 md:p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
                <Thermometer size={20} />
              </div>
              <span className="font-bold text-gray-700">{t.temperatureLog || 'Temperature Log'}</span>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={envChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="date" hide />
                <YAxis domain={[15, 30]} unit="°" stroke="#94a3b8" fontSize={10} fontWeight="bold" />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                />
                <ReferenceLine y={18} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'right', value: 'Min', fill: '#ef4444', fontSize: 10 }} />
                <ReferenceLine y={24} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'right', value: 'Max', fill: '#ef4444', fontSize: 10 }} />
                <Line type="monotone" dataKey="avgTemp" stroke="#f97316" strokeWidth={4} dot={{ r: 4, fill: '#f97316', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} name="Temperature" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Humidity Chart */}
        <div className="bg-white p-6 md:p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
                <Droplets size={20} />
              </div>
              <span className="font-bold text-gray-700">{t.humidityLog || 'Humidity Log'}</span>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={envChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="date" hide />
                <YAxis domain={[30, 80]} unit="%" stroke="#94a3b8" fontSize={10} fontWeight="bold" />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                />
                <ReferenceLine y={45} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'right', value: 'Min', fill: '#ef4444', fontSize: 10 }} />
                <ReferenceLine y={65} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'right', value: 'Max', fill: '#ef4444', fontSize: 10 }} />
                <Line type="monotone" dataKey="avgHumidity" stroke="#3b82f6" strokeWidth={4} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} name="Humidity" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlyDashboard;