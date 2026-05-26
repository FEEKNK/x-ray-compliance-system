import React, { useMemo, useState } from 'react';
import { useApp } from '../../AppContext';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis,
  CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import { Thermometer, Droplets, Calendar, Users, AlertCircle, ChevronLeft, ChevronRight, User, Check, Clock, TrendingUp, BarChart2 } from 'lucide-react';
import { translations } from '../../i18n';
import type { Schedule } from '../../types';

interface GroupedData {
  [date: string]: {
    date: string;
    temp: number[];
    humidity: number[];
  };
}

const MONTHS_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const MONTHS_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ─────────────────────────────────────────
// Sub-components for Monthly & Yearly views
// ─────────────────────────────────────────

interface MonthlyViewProps {
  year: number;
  month: number; // 0-indexed
  language: 'TH' | 'EN';
}

const MonthlyView: React.FC<MonthlyViewProps> = ({ year, month, language }) => {
  const { submissions, forms, schedules, users } = useApp();
  const t = translations[language];
  const [filterDate, setFilterDate] = useState('');

  const selectedMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = new Date().toISOString().split('T')[0];

  // ── Environmental Chart ──────────────────
  const envChartData = useMemo(() => {
    const envForms = forms.filter(f => f.title.includes('อุณหภูมิ') || f.title.includes('ความชื้น'));
    const envFormIds = envForms.map(f => f.id);
    const envSubmissions = submissions.filter(s =>
      envFormIds.includes(s.formId) && s.submittedAt.startsWith(selectedMonthStr)
    );
    const grouped = envSubmissions.reduce((acc: GroupedData, sub) => {
      const date = sub.submittedAt.split('T')[0];
      if (!acc[date]) acc[date] = { date, temp: [], humidity: [] };
      const tValue = parseFloat(sub.data['q3'] as string);
      const hValue = parseFloat((sub.data['q5'] || sub.data['q6']) as string);
      if (!isNaN(tValue)) acc[date].temp.push(tValue);
      if (!isNaN(hValue)) acc[date].humidity.push(hValue);
      return acc;
    }, {});
    return Object.values(grouped).map(day => ({
      date: day.date,
      avgTemp: day.temp.length > 0 ? parseFloat((day.temp.reduce((a, b) => a + b, 0) / day.temp.length).toFixed(1)) : null,
      avgHumidity: day.humidity.length > 0 ? parseFloat((day.humidity.reduce((a, b) => a + b, 0) / day.humidity.length).toFixed(1)) : null,
    })).sort((a, b) => a.date.localeCompare(b.date));
  }, [submissions, forms, selectedMonthStr]);

  // ── Staff KPI ────────────────────────────
  const staffKPI = useMemo(() => {
    const staffList = users.filter(u => u.role === 'STAFF');
    return staffList.map(s => {
      const staffSchedules = schedules.filter(sch =>
        sch.staffId === s.id &&
        (filterDate ? sch.date === filterDate : sch.date.startsWith(selectedMonthStr))
      );
      const total = staffSchedules.length;
      const completed = staffSchedules.filter(sch => sch.status === 'Completed').length;
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
      return { id: s.id, name: s.name, department: s.department, total, completed, percent };
    }).sort((a, b) => b.percent - a.percent);
  }, [users, schedules, selectedMonthStr, filterDate]);

  // ── Machine Errors ───────────────────────
  const machineErrors = useMemo(() => {
    const periodSubmissions = submissions.filter(s =>
      filterDate ? s.submittedAt.startsWith(filterDate) : s.submittedAt.startsWith(selectedMonthStr)
    );
    const errorsMap: Record<string, number> = {};
    periodSubmissions.forEach(sub => {
      if (Object.values(sub.data).some(v => v === 'Fail' || v === 'Alert')) {
        errorsMap[sub.formId] = (errorsMap[sub.formId] || 0) + 1;
      }
    });
    return Object.keys(errorsMap).map(formId => {
      const form = forms.find(f => f.id === formId);
      return { formId, title: form?.title || 'Unknown', errorCount: errorsMap[formId] };
    }).sort((a, b) => b.errorCount - a.errorCount);
  }, [submissions, forms, selectedMonthStr, filterDate]);

  // ── Compliance Matrix ────────────────────
  const staff = users.filter(u => u.role === 'STAFF');
  const getCellStatus = (staffId: string, day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const cellSchedules = schedules.filter(s => s.staffId === staffId && s.date === dateStr);
    if (cellSchedules.length === 0) return { status: 'none', missedCount: 0 };
    const pending = cellSchedules.filter(s => s.status === 'Pending');
    const completed = cellSchedules.filter(s => s.status === 'Completed');
    if (pending.length === 0 && completed.length > 0) return { status: 'completed', missedCount: 0 };
    if (pending.length > 0) {
      if (dateStr < todayStr) return { status: 'missed', missedCount: pending.length };
      if (dateStr === todayStr) return { status: 'pending_today', missedCount: 0 };
      return { status: 'scheduled', missedCount: 0 };
    }
    return { status: 'none', missedCount: 0 };
  };

  const missedDetails = useMemo(() => {
    const monthlySchedules = schedules.filter(s => s.date.startsWith(selectedMonthStr));
    const details: Array<Schedule & { staffName: string; formTitle: string }> = [];
    monthlySchedules.forEach(s => {
      if (s.status === 'Pending' && s.date < todayStr) {
        details.push({
          ...s,
          staffName: users.find(u => u.id === s.staffId)?.name || 'Unknown',
          formTitle: forms.find(f => f.id === s.formId)?.title || 'Unknown'
        });
      }
    });
    return details.sort((a, b) => b.date.localeCompare(a.date));
  }, [schedules, users, forms, selectedMonthStr, todayStr]);

  return (
    <div className="space-y-8">
      {/* Compliance Matrix */}
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
              {staff.map(s => (
                <tr key={s.id} className="group hover:bg-gray-50/50 transition-all">
                  <td className="sticky left-0 z-10 bg-white p-4 border-r border-gray-100 shadow-[4px_0_12px_rgba(0,0,0,0.02)]">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-800 text-sm">{s.name}</span>
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">{s.department}</span>
                    </div>
                  </td>
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const { status, missedCount } = getCellStatus(s.id, i + 1);
                    return (
                      <td key={i} className="p-1 border-r border-gray-50 text-center">
                        <div className="flex justify-center items-center h-full w-full py-2">
                          {status === 'completed' && <Check size={16} className="text-green-500 stroke-[3]" />}
                          {status === 'missed' && (
                            <div className="flex items-center justify-center w-5 h-5 rounded-md bg-red-100 text-red-600 font-black text-[10px]">{missedCount}</div>
                          )}
                          {status === 'pending_today' && <Clock size={14} className="text-orange-400" />}
                          {status === 'scheduled' && <div className="w-1.5 h-1.5 rounded-full bg-gray-200"></div>}
                          {status === 'none' && <span className="text-gray-200">-</span>}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Missed Tasks */}
      {missedDetails.length > 0 && (
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center space-x-3 bg-red-50/30">
            <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
              <AlertCircle size={16} />
            </div>
            <span className="font-bold text-red-700">รายการที่ลืมตรวจสอบ (Missed Tasks)</span>
            <span className="bg-red-100 text-red-700 py-0.5 px-2.5 rounded-full text-xs font-bold ml-auto">{missedDetails.length} รายการ</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-6 py-4">วันที่</th>
                  <th className="px-6 py-4">เวร</th>
                  <th className="px-6 py-4">พนักงาน</th>
                  <th className="px-6 py-4">รายการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {missedDetails.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-medium text-gray-700">{m.date}</td>
                    <td className="px-6 py-4"><span className="px-2.5 py-1 rounded-md text-xs font-bold bg-gray-100 text-gray-600">{m.shift}</span></td>
                    <td className="px-6 py-4 font-bold text-gray-800">{m.staffName}</td>
                    <td className="px-6 py-4 text-red-600 font-medium">{m.formTitle}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Analytics: Staff KPI + Machine Errors */}
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <h3 className="font-bold text-gray-800 text-lg">Analytics Overview</h3>
        <div className="flex items-center space-x-2 mt-3 md:mt-0">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Filter By Date:</span>
          <input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="border-2 border-gray-100 rounded-xl px-4 py-2 bg-white text-xs font-bold text-gray-600 focus:border-[#00468B] outline-none transition-all shadow-sm"
          />
          {filterDate && (
            <button onClick={() => setFilterDate('')} className="text-xs font-bold text-[#00468B] hover:underline">Clear</button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Staff KPI */}
        <div className="bg-white p-6 md:p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center"><Users size={20} /></div>
            <span className="font-bold text-gray-700">Staff KPI (ความสำเร็จ)</span>
          </div>
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs tracking-wider">
              <tr>
                <th className="px-4 py-3">พนักงาน</th>
                <th className="px-4 py-3 text-center">มอบหมาย</th>
                <th className="px-4 py-3 text-center">สำเร็จ</th>
                <th className="px-4 py-3 text-center">KPI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staffKPI.map(s => (
                <tr key={s.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-bold text-gray-800">{s.name}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{s.total}</td>
                  <td className="px-4 py-3 text-center text-green-600 font-bold">{s.completed}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center justify-center px-2 py-1 rounded font-bold text-xs ${s.percent >= 90 ? 'bg-green-100 text-green-700' : s.percent >= 70 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                      {s.percent}%
                    </span>
                  </td>
                </tr>
              ))}
              {staffKPI.length === 0 && <tr><td colSpan={4} className="text-center py-4 text-gray-400">ไม่มีข้อมูล</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Machine Errors */}
        <div className="bg-white p-6 md:p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center"><AlertCircle size={20} /></div>
            <span className="font-bold text-gray-700">Machine Error Analytics</span>
          </div>
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs tracking-wider">
              <tr>
                <th className="px-4 py-3">โปรโตคอล / เครื่องมือ</th>
                <th className="px-4 py-3 text-center">จำนวนครั้ง</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {machineErrors.slice(0, 5).map(m => (
                <tr key={m.formId} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-bold text-gray-800">{m.title}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600 font-black">{m.errorCount}</span>
                  </td>
                </tr>
              ))}
              {machineErrors.length === 0 && <tr><td colSpan={2} className="text-center py-4 text-gray-400">ไม่พบปัญหาในช่วงนี้</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Environmental Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 md:p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center"><Thermometer size={20} /></div>
            <span className="font-bold text-gray-700">{t.temperatureLog || 'Temperature Log'}</span>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={envChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="date" hide />
                <YAxis domain={[15, 30]} unit="°" stroke="#94a3b8" fontSize={10} fontWeight="bold" />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <ReferenceLine y={18} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'right', value: 'Min', fill: '#ef4444', fontSize: 10 }} />
                <ReferenceLine y={24} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'right', value: 'Max', fill: '#ef4444', fontSize: 10 }} />
                <Line type="monotone" dataKey="avgTemp" stroke="#f97316" strokeWidth={3} dot={{ r: 3 }} name="อุณหภูมิ" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white p-6 md:p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center"><Droplets size={20} /></div>
            <span className="font-bold text-gray-700">{t.humidityLog || 'Humidity Log'}</span>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={envChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="date" hide />
                <YAxis domain={[30, 80]} unit="%" stroke="#94a3b8" fontSize={10} fontWeight="bold" />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <ReferenceLine y={45} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'right', value: 'Min', fill: '#ef4444', fontSize: 10 }} />
                <ReferenceLine y={65} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'right', value: 'Max', fill: '#ef4444', fontSize: 10 }} />
                <Line type="monotone" dataKey="avgHumidity" stroke="#3b82f6" strokeWidth={3} dot={{ r: 3 }} name="ความชื้น" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────
// Yearly View
// ─────────────────────────────────────────

interface YearlyViewProps {
  year: number;
  language: 'TH' | 'EN';
}

const YearlyView: React.FC<YearlyViewProps> = ({ year, language }) => {
  const { submissions, forms, schedules, users } = useApp();
  const MONTHS = language === 'TH' ? MONTHS_TH : MONTHS_EN;

  // ── Compliance per month (completion rate %) ──
  const monthlyCompliance = useMemo(() => {
    return Array.from({ length: 12 }, (_, m) => {
      const monthStr = `${year}-${String(m + 1).padStart(2, '0')}`;
      const monthSchedules = schedules.filter(s => s.date.startsWith(monthStr));
      const total = monthSchedules.length;
      const completed = monthSchedules.filter(s => s.status === 'Completed').length;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
      return { month: MONTHS[m], total, completed, rate };
    });
  }, [schedules, year, MONTHS]);

  // ── Error count per month ──
  const monthlyErrors = useMemo(() => {
    return Array.from({ length: 12 }, (_, m) => {
      const monthStr = `${year}-${String(m + 1).padStart(2, '0')}`;
      const monthSubs = submissions.filter(s => s.submittedAt.startsWith(monthStr));
      const errors = monthSubs.filter(s => Object.values(s.data).some(v => v === 'Fail' || v === 'Alert')).length;
      return { month: MONTHS[m], errors };
    });
  }, [submissions, year, MONTHS]);

  // ── Staff KPI for whole year ──
  const yearlyStaffKPI = useMemo(() => {
    const staffList = users.filter(u => u.role === 'STAFF');
    return staffList.map(s => {
      const staffSchedules = schedules.filter(sch =>
        sch.staffId === s.id && sch.date.startsWith(`${year}-`)
      );
      const total = staffSchedules.length;
      const completed = staffSchedules.filter(sch => sch.status === 'Completed').length;
      const missed = staffSchedules.filter(sch => sch.status === 'Pending' && sch.date < new Date().toISOString().split('T')[0]).length;
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
      return { id: s.id, name: s.name, department: s.department, total, completed, missed, percent };
    }).sort((a, b) => b.percent - a.percent);
  }, [users, schedules, year]);

  // ── Top machine errors for whole year ──
  const yearlyMachineErrors = useMemo(() => {
    const yearSubs = submissions.filter(s => s.submittedAt.startsWith(`${year}-`));
    const errorsMap: Record<string, number> = {};
    yearSubs.forEach(sub => {
      if (Object.values(sub.data).some(v => v === 'Fail' || v === 'Alert')) {
        errorsMap[sub.formId] = (errorsMap[sub.formId] || 0) + 1;
      }
    });
    return Object.keys(errorsMap).map(formId => {
      const form = forms.find(f => f.id === formId);
      return { formId, title: form?.title || 'Unknown', errorCount: errorsMap[formId] };
    }).sort((a, b) => b.errorCount - a.errorCount);
  }, [submissions, forms, year]);

  // ── Year summary stats ──
  const yearSchedules = schedules.filter(s => s.date.startsWith(`${year}-`));
  const totalTasks = yearSchedules.length;
  const completedTasks = yearSchedules.filter(s => s.status === 'Completed').length;
  const missedTasks = yearSchedules.filter(s => s.status === 'Pending' && s.date < new Date().toISOString().split('T')[0]).length;
  const overallRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'งานทั้งหมด', value: totalTasks, color: 'blue', icon: <BarChart2 size={20} /> },
          { label: 'สำเร็จ', value: completedTasks, color: 'green', icon: <Check size={20} /> },
          { label: 'ค้าง/ลืม', value: missedTasks, color: 'red', icon: <AlertCircle size={20} /> },
          { label: 'อัตราความสำเร็จ', value: `${overallRate}%`, color: 'purple', icon: <TrendingUp size={20} /> },
        ].map(card => (
          <div key={card.label} className={`bg-white p-6 rounded-2xl border border-gray-100 shadow-sm`}>
            <div className={`w-10 h-10 rounded-xl mb-3 flex items-center justify-center ${
              card.color === 'blue' ? 'bg-blue-50 text-blue-600' :
              card.color === 'green' ? 'bg-green-50 text-green-600' :
              card.color === 'red' ? 'bg-red-50 text-red-600' : 'bg-purple-50 text-purple-600'
            }`}>{card.icon}</div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{card.label}</p>
            <p className={`text-2xl font-black ${
              card.color === 'blue' ? 'text-blue-700' :
              card.color === 'green' ? 'text-green-700' :
              card.color === 'red' ? 'text-red-600' : 'text-purple-700'
            }`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Monthly Compliance Bar Chart */}
      <div className="bg-white p-6 md:p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center"><BarChart2 size={20} /></div>
          <div>
            <span className="font-bold text-gray-700 block">อัตราความสำเร็จรายเดือน (Monthly Compliance)</span>
            <span className="text-xs text-gray-400">% งานที่เสร็จสมบูรณ์ในแต่ละเดือน ปี {year}</span>
          </div>
        </div>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyCompliance} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} />
              <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                formatter={(v: unknown) => [`${v}%`, 'อัตราสำเร็จ']}
              />
              <ReferenceLine y={90} stroke="#22c55e" strokeDasharray="4 4" label={{ position: 'right', value: '90%', fill: '#22c55e', fontSize: 10 }} />
              <Bar
                dataKey="rate"
                name="อัตราสำเร็จ"
                radius={[8, 8, 0, 0]}
                fill="#00468B"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Error Count Bar Chart */}
      <div className="bg-white p-6 md:p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center"><AlertCircle size={20} /></div>
          <div>
            <span className="font-bold text-gray-700 block">จำนวนปัญหาเครื่องมือรายเดือน (Monthly Issues)</span>
            <span className="text-xs text-gray-400">จำนวนฟอร์มที่พบ Fail/Alert ในแต่ละเดือน ปี {year}</span>
          </div>
        </div>
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyErrors} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                formatter={(v: unknown) => [`${v}`, 'ครั้งที่พบปัญหา']}
              />
              <Bar dataKey="errors" name="ปัญหา" radius={[8, 8, 0, 0]} fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Year Staff KPI + Top Machine Errors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 md:p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center"><Users size={20} /></div>
            <div>
              <span className="font-bold text-gray-700 block">Staff KPI รายปี</span>
              <span className="text-xs text-gray-400">ผลรวมทั้งปี {year}</span>
            </div>
          </div>
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs tracking-wider">
              <tr>
                <th className="px-4 py-3">พนักงาน</th>
                <th className="px-4 py-3 text-center">มอบหมาย</th>
                <th className="px-4 py-3 text-center">ค้าง</th>
                <th className="px-4 py-3 text-center">KPI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {yearlyStaffKPI.map(s => (
                <tr key={s.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <div className="font-bold text-gray-800">{s.name}</div>
                    <div className="text-[10px] text-gray-400 font-black uppercase">{s.department}</div>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500">{s.total}</td>
                  <td className="px-4 py-3 text-center">
                    {s.missed > 0
                      ? <span className="text-red-600 font-bold">{s.missed}</span>
                      : <span className="text-green-600 font-bold">0</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center justify-center px-2 py-1 rounded font-bold text-xs ${s.percent >= 90 ? 'bg-green-100 text-green-700' : s.percent >= 70 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                      {s.percent}%
                    </span>
                  </td>
                </tr>
              ))}
              {yearlyStaffKPI.length === 0 && <tr><td colSpan={4} className="text-center py-4 text-gray-400">ไม่มีข้อมูล</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center"><AlertCircle size={20} /></div>
            <div>
              <span className="font-bold text-gray-700 block">เครื่องมือที่มีปัญหาบ่อย (ทั้งปี)</span>
              <span className="text-xs text-gray-400">อันดับปัญหาตลอดปี {year}</span>
            </div>
          </div>
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs tracking-wider">
              <tr>
                <th className="px-4 py-3">อันดับ</th>
                <th className="px-4 py-3">โปรโตคอล / เครื่องมือ</th>
                <th className="px-4 py-3 text-center">ครั้ง</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {yearlyMachineErrors.slice(0, 8).map((m, idx) => (
                <tr key={m.formId} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black ${idx === 0 ? 'bg-red-500 text-white' : idx === 1 ? 'bg-orange-400 text-white' : idx === 2 ? 'bg-yellow-400 text-white' : 'bg-gray-100 text-gray-500'}`}>
                      {idx + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-gray-800 text-xs">{m.title}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600 font-black">{m.errorCount}</span>
                  </td>
                </tr>
              ))}
              {yearlyMachineErrors.length === 0 && <tr><td colSpan={3} className="text-center py-4 text-gray-400">ไม่พบปัญหาในปีนี้</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────

const MonthlyDashboard: React.FC = () => {
  const { language } = useApp();
  const t = translations[language];

  const [view, setView] = useState<'monthly' | 'yearly'>('monthly');
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());

  const handlePrevMonth = () => setCurrentDate(prev => { const d = new Date(prev); d.setMonth(d.getMonth() - 1); return d; });
  const handleNextMonth = () => setCurrentDate(prev => { const d = new Date(prev); d.setMonth(d.getMonth() + 1); return d; });

  const monthDisplay = currentDate.toLocaleString(language === 'EN' ? 'en-US' : 'th-TH', { month: 'long', year: 'numeric' });

  return (
    <div className="p-4 md:p-6 space-y-8 animate-in fade-in duration-500 pb-24 max-w-[100vw] overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-800">{t.monthlyPerformance || 'Quality & Performance Dashboard'}</h2>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Performance & Compliance Matrix</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Tab switcher */}
          <div className="flex bg-gray-100 rounded-2xl p-1">
            <button
              onClick={() => setView('monthly')}
              className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${view === 'monthly' ? 'bg-[#00468B] text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
            >
              รายเดือน
            </button>
            <button
              onClick={() => setView('yearly')}
              className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${view === 'yearly' ? 'bg-[#00468B] text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
            >
              รายปี
            </button>
          </div>

          {/* Month / Year navigator */}
          {view === 'monthly' ? (
            <div className="bg-white border border-gray-200 px-2 py-1.5 rounded-2xl flex items-center shadow-sm">
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
          ) : (
            <div className="bg-white border border-gray-200 px-2 py-1.5 rounded-2xl flex items-center shadow-sm">
              <button onClick={() => setCurrentYear(y => y - 1)} className="p-2 text-gray-400 hover:text-[#00468B] hover:bg-blue-50 rounded-xl transition-colors">
                <ChevronLeft size={20} />
              </button>
              <div className="flex items-center space-x-2 px-4 min-w-[100px] justify-center">
                <Calendar size={18} className="text-[#00468B]" />
                <span className="text-sm font-black text-[#00468B]">{currentYear}</span>
              </div>
              <button onClick={() => setCurrentYear(y => y + 1)} className="p-2 text-gray-400 hover:text-[#00468B] hover:bg-blue-50 rounded-xl transition-colors">
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {view === 'monthly'
        ? <MonthlyView year={currentDate.getFullYear()} month={currentDate.getMonth()} language={language} />
        : <YearlyView year={currentYear} language={language} />
      }
    </div>
  );
};

export default MonthlyDashboard;