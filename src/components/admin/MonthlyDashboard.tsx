import React, { useMemo, useState } from 'react';
import { useForms, useSubmissions, useUsers, useSchedules } from '../../hooks/queries';
import { useApp } from '../../AppContext';
import {
  BarChart, Bar,
  XAxis, YAxis,
  CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import { Calendar, Users, AlertCircle, ChevronLeft, ChevronRight, User, Check, Clock, TrendingUp, BarChart2, X, Download, FileText } from 'lucide-react';
import { translations } from '../../i18n';
import type { Schedule } from '../../types';
import { getLocalTodayStr, parseDbDate } from '../../utils/shiftTime';
import * as XLSX from 'xlsx';



const MONTHS_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const MONTHS_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

interface MachineErrorDetail {
  formId: string;
  title: string;
  errorCount: number;
  equipmentDetails: Record<string, number>;
}

const MachineErrorModal: React.FC<{
  detail: MachineErrorDetail;
  onClose: () => void;
}> = ({ detail, onClose }) => {
  const equipments = Object.entries(detail.equipmentDetails).sort((a, b) => b[1] - a[1]);
  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] w-full max-w-lg shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-red-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
              <AlertCircle size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-lg pr-4">{detail.title}</h3>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mt-1">พบปัญหาการเช็ค {detail.errorCount} ครั้ง</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-red-100 rounded-full text-red-400 hover:text-red-600 transition-colors shrink-0">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <table className="w-full text-sm text-left">
             <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs tracking-wider">
               <tr>
                 <th className="px-4 py-3 rounded-l-xl">อุปกรณ์ / คำถามที่ขัดข้อง</th>
                 <th className="px-4 py-3 text-center rounded-r-xl w-24">จำนวนครั้ง</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-gray-50">
               {equipments.map(([name, count]) => (
                 <tr key={name} className="hover:bg-gray-50/50">
                   <td className="px-4 py-3 font-medium text-gray-700">{name}</td>
                   <td className="px-4 py-3 text-center">
                     <span className="inline-flex items-center justify-center px-2 py-1 bg-red-100 text-red-700 rounded-lg font-bold text-xs">
                       {count}
                     </span>
                   </td>
                 </tr>
               ))}
             </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────
// Sub-components for Monthly & Yearly views
// ─────────────────────────────────────────

interface MonthlyViewProps {
  year: number;
  month: number; // 0-indexed
  selectedDept: string;
}

const MonthlyView: React.FC<MonthlyViewProps> = ({ year, month, selectedDept }) => {
  const { language } = useApp();
  const t = translations[language];
  const { data: users = [] } = useUsers();
  const { data: forms = [] } = useForms();
  const { data: schedules = [] } = useSchedules({ month: month + 1, year });
  const { data: submissionsData } = useSubmissions(1, 10000, { month: month + 1, year });
  const submissions = useMemo(() => submissionsData?.data || [], [submissionsData]);
  const [filterDate, setFilterDate] = useState('');
  const [selectedError, setSelectedError] = useState<MachineErrorDetail | null>(null);

  const selectedMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = getLocalTodayStr();



  const filteredStaff = useMemo(() => {
    let s = users.filter(u => u.role === 'STAFF');
    if (selectedDept !== 'ALL') s = s.filter(u => u.department === selectedDept);
    return s;
  }, [users, selectedDept]);

  const filteredForms = useMemo(() => {
    let f = forms;
    if (selectedDept !== 'ALL') f = f.filter(form => form.department === selectedDept);
    return f;
  }, [forms, selectedDept]);

  // ── Staff KPI ────────────────────────────
  const staffKPI = useMemo(() => {
    return filteredStaff.map(s => {
      const staffSchedules = schedules.filter(sch =>
        sch.staffId === s.id &&
        (filterDate ? sch.date === filterDate : sch.date.startsWith(selectedMonthStr)) &&
        sch.formId
      );
      const total = staffSchedules.length;
      const completed = staffSchedules.filter(sch => sch.status === 'Completed').length;
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
      return { id: s.id, name: s.name, department: s.department, total, completed, percent };
    }).sort((a, b) => b.percent - a.percent);
  }, [filteredStaff, schedules, selectedMonthStr, filterDate]);

  // ── Machine Errors ───────────────────────
  const machineErrors = useMemo(() => {
    const periodSubmissions = submissions.filter(s => {
      const localDate = getLocalTodayStr(parseDbDate(s.submittedAt));
      return filterDate ? localDate === filterDate : localDate.startsWith(selectedMonthStr);
    });
    const errorsMap: Record<string, { count: number, details: Record<string, number> }> = {};
    
    periodSubmissions.forEach(sub => {
      const form = forms.find(f => f.id === sub.formId);
      if (!form) return;
      if (selectedDept !== 'ALL' && form.department !== selectedDept) return;
      
      let formHasError = false;
      Object.entries(sub.data).forEach(([key, value]) => {
        if (value === 'Fail' || value === 'Alert') {
          formHasError = true;
          if (!errorsMap[sub.formId]) {
            errorsMap[sub.formId] = { count: 0, details: {} };
          }
          const question = form.questions.find(q => q.id === key);
          const eqName = question ? question.label : key;
          errorsMap[sub.formId].details[eqName] = (errorsMap[sub.formId].details[eqName] || 0) + 1;
        }
      });
      if (formHasError) {
         errorsMap[sub.formId].count += 1;
      }
    });

    return Object.keys(errorsMap).map(formId => {
      const form = forms.find(f => f.id === formId);
      return { 
        formId, 
        title: form?.title || 'Unknown', 
        errorCount: errorsMap[formId].count,
        equipmentDetails: errorsMap[formId].details
      };
    }).sort((a, b) => b.errorCount - a.errorCount);
  }, [submissions, forms, selectedMonthStr, filterDate, selectedDept]);

  // ── Compliance Matrix ────────────────────
  const staff = filteredStaff;
  const getCellStatus = (staffId: string, day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const cellSchedules = schedules.filter(s => s.staffId === staffId && s.date === dateStr && s.formId);
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

  const getFormCellStatus = (formId: string, day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const cellSchedules = schedules.filter(s => s.formId === formId && s.date === dateStr);
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

  // ── Download Compliance Matrix as Excel ──
  const downloadMatrix = () => {
    const wb = XLSX.utils.book_new();
    const monthLabel = `${year}-${String(month + 1).padStart(2, '0')}`;
    const deptLabel = selectedDept === 'ALL' ? 'All Depts' : selectedDept;

    // === Sheet 1: Compliance Matrix ===
    const header = ['พนักงาน (Staff)', 'แผนก'];
    for (let d = 1; d <= daysInMonth; d++) header.push(String(d));
    header.push('รวมงาน', 'สำเร็จ', 'ค้าง/ลืม', 'KPI %');

    const rows: (string | number)[][] = [header];

    staff.forEach(s => {
      const row: (string | number)[] = [s.name, s.department];
      let total = 0, completed = 0, missed = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        const { status, missedCount } = getCellStatus(s.id, d);
        if (status === 'completed')     { row.push('✓'); total++; completed++; }
        else if (status === 'missed')   { row.push(`✗(${missedCount})`); total++; missed += missedCount; }
        else if (status === 'pending_today') { row.push('○'); total++; }
        else if (status === 'scheduled')    { row.push('·'); total++; }
        else row.push('-');
      }
      const kpi = total > 0 ? Math.round((completed / total) * 100) : 0;
      row.push(total, completed, missed, `${kpi}%`);
      rows.push(row);
    });

    const ws1 = XLSX.utils.aoa_to_sheet(rows);
    // Column widths
    ws1['!cols'] = [
      { wch: 24 }, { wch: 12 },
      ...Array(daysInMonth).fill({ wch: 5 }),
      { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 },
    ];
    XLSX.utils.book_append_sheet(wb, ws1, 'Compliance Matrix');

    // === Sheet 2: Staff KPI Summary ===
    const kpiHeader = ['ลำดับ', 'พนักงาน', 'แผนก', 'งานทั้งหมด', 'สำเร็จ', 'KPI %'];
    const kpiRows: (string | number)[][] = [kpiHeader];
    staffKPI.forEach((s, i) => {
      kpiRows.push([i + 1, s.name, s.department, s.total, s.completed, `${s.percent}%`]);
    });
    const ws2 = XLSX.utils.aoa_to_sheet(kpiRows);
    ws2['!cols'] = [{ wch: 6 }, { wch: 24 }, { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 8 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'Staff KPI');

    // === Sheet 3: Form Compliance Matrix ===
    const formHeader = ['แบบฟอร์ม (Form)', 'แผนก'];
    for (let d = 1; d <= daysInMonth; d++) formHeader.push(String(d));
    formHeader.push('รวมงาน', 'สำเร็จ', 'ค้าง/ลืม', 'KPI %');

    const formRows: (string | number)[][] = [formHeader];

    filteredForms.forEach(f => {
      const row: (string | number)[] = [f.title || '', f.department ?? ''];
      let total = 0, completed = 0, missed = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        const { status, missedCount } = getFormCellStatus(f.id, d);
        if (status === 'completed')     { row.push('✓'); total++; completed++; }
        else if (status === 'missed')   { row.push(`✗(${missedCount})`); total++; missed += missedCount; }
        else if (status === 'pending_today') { row.push('○'); total++; }
        else if (status === 'scheduled')    { row.push('·'); total++; }
        else row.push('-');
      }
      const kpi = total > 0 ? Math.round((completed / total) * 100) : 0;
      row.push(total, completed, missed, `${kpi}%`);
      formRows.push(row);
    });

    const ws3 = XLSX.utils.aoa_to_sheet(formRows);
    ws3['!cols'] = [
      { wch: 30 }, { wch: 12 },
      ...Array(daysInMonth).fill({ wch: 5 }),
      { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 },
    ];
    XLSX.utils.book_append_sheet(wb, ws3, 'Form Matrix');

    XLSX.writeFile(wb, `Compliance_Matrix_${monthLabel}_${deptLabel}.xlsx`);
  };

  const missedDetails = useMemo(() => {
    const monthlySchedules = schedules.filter(s => s.date.startsWith(selectedMonthStr));
    const details: Array<Schedule & { staffName: string; formTitle: string }> = [];
    const staffIdsInDept = new Set(filteredStaff.map(s => s.id));
    monthlySchedules.forEach(s => {
      if (s.status === 'Pending' && s.date < todayStr && staffIdsInDept.has(s.staffId) && s.formId) {
        details.push({
          ...s,
          staffName: users.find(u => u.id === s.staffId)?.name || 'Unknown',
          formTitle: forms.find(f => f.id === s.formId)?.title || 'Unknown'
        });
      }
    });
    return details.sort((a, b) => b.date.localeCompare(a.date));
  }, [schedules, users, forms, selectedMonthStr, todayStr, filteredStaff]);

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
              <span className="font-bold text-gray-700 block">{t.complianceMatrix || "ตารางสรุปการทำงาน (Compliance Matrix)"}</span>
              <span className="text-xs text-gray-400">ภาพรวมการตรวจสอบงานแต่ละวันของพนักงาน</span>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="hidden md:flex items-center space-x-4 text-xs font-bold text-gray-500">
              <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-green-500 mr-1.5"></span>ทำครบถ้วน</div>
              <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-red-500 mr-1.5"></span>ลืมทำ/ค้าง</div>
              <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-orange-400 mr-1.5"></span>รอทำวันนี้</div>
            </div>
            <button
              onClick={downloadMatrix}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00468B] hover:bg-[#003569] text-white text-xs font-bold transition-all shadow-sm active:scale-95"
            >
              <Download size={14} />
              <span>ดาวน์โหลด Excel</span>
            </button>
          </div>
        </div>
        <div className="overflow-auto max-h-[65vh] relative">
          <table className="w-full border-collapse min-w-[800px]">
            <thead>
              <tr>
                <th className="sticky top-0 left-0 z-30 bg-white p-5 text-left border-b border-r border-gray-100 min-w-[200px] shadow-[4px_4px_12px_rgba(0,0,0,0.02)]">
                  <div className="flex items-center space-x-2">
                    <User size={14} className="text-[#00468B]" />
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">พนักงาน (Staff)</span>
                  </div>
                </th>
                {Array.from({ length: daysInMonth }).map((_, i) => (
                  <th key={i} className="sticky top-0 z-20 bg-gray-50 p-3 border-b border-gray-100 min-w-[40px] text-center shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
                    <span className="text-xs font-black text-gray-500">{i + 1}</span>
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
                      <span className="text-xs font-black text-gray-400 uppercase tracking-tighter">{s.department}</span>
                    </div>
                  </td>
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const { status, missedCount } = getCellStatus(s.id, i + 1);
                    return (
                      <td key={i} className="p-1 border-r border-gray-50 text-center">
                        <div className="flex justify-center items-center h-full w-full py-2">
                          {status === 'completed' && <Check size={16} className="text-green-500 stroke-[3]" />}
                          {status === 'missed' && (
                            <div className="flex items-center justify-center w-5 h-5 rounded-md bg-red-100 text-red-600 font-black text-xs">{missedCount}</div>
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

      {/* Form Compliance Matrix */}
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileText size={20} />
            </div>
            <div>
              <span className="font-bold text-gray-700 block">ตารางสรุปการทำงานตามแบบฟอร์ม (Form Compliance Matrix)</span>
              <span className="text-xs text-gray-400">ภาพรวมการตรวจสอบงานแต่ละวันแยกตามแบบฟอร์ม</span>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="hidden md:flex items-center space-x-4 text-xs font-bold text-gray-500">
              <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-green-500 mr-1.5"></span>ทำครบถ้วน</div>
              <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-red-500 mr-1.5"></span>ลืมทำ/ค้าง</div>
              <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-orange-400 mr-1.5"></span>รอทำวันนี้</div>
            </div>
          </div>
        </div>
        <div className="overflow-auto max-h-[65vh] relative">
          <table className="w-full border-collapse min-w-[800px]">
            <thead>
              <tr>
                <th className="sticky top-0 left-0 z-30 bg-white p-5 text-left border-b border-r border-gray-100 min-w-[200px] shadow-[4px_4px_12px_rgba(0,0,0,0.02)]">
                  <div className="flex items-center space-x-2">
                    <FileText size={14} className="text-indigo-600" />
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">แบบฟอร์ม (Form)</span>
                  </div>
                </th>
                {Array.from({ length: daysInMonth }).map((_, i) => (
                  <th key={i} className="sticky top-0 z-20 bg-gray-50 p-3 border-b border-gray-100 min-w-[40px] text-center shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
                    <span className="text-xs font-black text-gray-500">{i + 1}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredForms.map(f => (
                <tr key={f.id} className="group hover:bg-gray-50/50 transition-all">
                  <td className="sticky left-0 z-10 bg-white p-4 border-r border-gray-100 shadow-[4px_0_12px_rgba(0,0,0,0.02)]">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-800 text-sm">{f.title}</span>
                      <span className="text-xs font-black text-gray-400 uppercase tracking-tighter">{f.department}</span>
                    </div>
                  </td>
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const { status, missedCount } = getFormCellStatus(f.id, i + 1);
                    return (
                      <td key={i} className="p-1 border-r border-gray-50 text-center">
                        <div className="flex justify-center items-center h-full w-full py-2">
                          {status === 'completed' && <Check size={16} className="text-green-500 stroke-[3]" />}
                          {status === 'missed' && (
                            <div className="flex items-center justify-center w-5 h-5 rounded-md bg-red-100 text-red-600 font-black text-xs">{missedCount}</div>
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
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm text-left relative">
              <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs tracking-wider sticky top-0 z-10 shadow-sm">
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
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center"><Users size={20} /></div>
              <span className="font-bold text-gray-700">Staff KPI (ความสำเร็จ)</span>
            </div>
            <button
              onClick={downloadMatrix}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-all active:scale-95"
            >
              <Download size={13} />
              <span>ดาวน์โหลด</span>
            </button>
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
                <tr key={m.formId} onClick={() => setSelectedError(m)} className="hover:bg-gray-50 cursor-pointer group transition-colors">
                  <td className="px-4 py-3 font-bold text-gray-800 group-hover:text-[#00468B] transition-colors">{m.title}</td>
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
      {selectedError && <MachineErrorModal detail={selectedError} onClose={() => setSelectedError(null)} />}


    </div>
  );
};

// ─────────────────────────────────────────
// Yearly View
// ─────────────────────────────────────────

interface YearlyViewProps {
  year: number;
  language: 'TH' | 'EN';
  selectedDept: string;
}

const YearlyView: React.FC<YearlyViewProps> = ({ year, language, selectedDept }) => {
  const { data: users = [] } = useUsers();
  const { data: forms = [] } = useForms();
  const { data: schedules = [] } = useSchedules({ year });
  const { data: submissionsData } = useSubmissions(1, 10000, { year });
  const submissions = useMemo(() => submissionsData?.data || [], [submissionsData]);
  const MONTHS = language === 'TH' ? MONTHS_TH : MONTHS_EN;
  const [selectedError, setSelectedError] = useState<MachineErrorDetail | null>(null);

  const filteredStaff = useMemo(() => {
    let s = users.filter(u => u.role === 'STAFF');
    if (selectedDept !== 'ALL') s = s.filter(u => u.department === selectedDept);
    return s;
  }, [users, selectedDept]);

  // ── Compliance per month (completion rate %) ──
  const monthlyCompliance = useMemo(() => {
    const staffIdsInDept = new Set(filteredStaff.map(s => s.id));
    return Array.from({ length: 12 }, (_, m) => {
      const monthStr = `${year}-${String(m + 1).padStart(2, '0')}`;
      const monthSchedules = schedules.filter(s => s.date.startsWith(monthStr) && staffIdsInDept.has(s.staffId));
      const total = monthSchedules.length;
      const completed = monthSchedules.filter(s => s.status === 'Completed').length;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
      return { month: MONTHS[m], total, completed, rate };
    });
  }, [schedules, year, MONTHS, filteredStaff]);

  // ── Error count per month ──
  const monthlyErrors = useMemo(() => {
    return Array.from({ length: 12 }, (_, m) => {
      const monthStr = `${year}-${String(m + 1).padStart(2, '0')}`;
      const monthSubs = submissions.filter(s => {
        if (!getLocalTodayStr(parseDbDate(s.submittedAt)).startsWith(monthStr)) return false;
        if (selectedDept === 'ALL') return true;
        const form = forms.find(f => f.id === s.formId);
        return form && form.department === selectedDept;
      });
      const errors = monthSubs.filter(s => Object.values(s.data).some(v => v === 'Fail' || v === 'Alert')).length;
      return { month: MONTHS[m], errors };
    });
  }, [submissions, forms, year, MONTHS, selectedDept]);

  // ── Staff KPI for whole year ──
  const yearlyStaffKPI = useMemo(() => {
    return filteredStaff.map(s => {
      const staffSchedules = schedules.filter(sch =>
        sch.staffId === s.id && sch.date.startsWith(`${year}-`) && sch.formId
      );
      const total = staffSchedules.length;
      const completed = staffSchedules.filter(sch => sch.status === 'Completed').length;
      const missed = staffSchedules.filter(sch => sch.status === 'Pending' && sch.date < getLocalTodayStr()).length;
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
      return { id: s.id, name: s.name, department: s.department, total, completed, missed, percent };
    }).sort((a, b) => b.percent - a.percent);
  }, [filteredStaff, schedules, year]);

  // ── Top machine errors for whole year ──
  const yearlyMachineErrors = useMemo(() => {
    const yearSubs = submissions.filter(s => getLocalTodayStr(parseDbDate(s.submittedAt)).startsWith(`${year}-`));
    const errorsMap: Record<string, { count: number, details: Record<string, number> }> = {};
    
    yearSubs.forEach(sub => {
      const form = forms.find(f => f.id === sub.formId);
      if (!form) return;
      if (selectedDept !== 'ALL' && form.department !== selectedDept) return;
      
      let formHasError = false;
      Object.entries(sub.data).forEach(([key, value]) => {
        if (value === 'Fail' || value === 'Alert') {
          formHasError = true;
          if (!errorsMap[sub.formId]) {
            errorsMap[sub.formId] = { count: 0, details: {} };
          }
          const question = form.questions.find(q => q.id === key);
          const eqName = question ? question.label : key;
          errorsMap[sub.formId].details[eqName] = (errorsMap[sub.formId].details[eqName] || 0) + 1;
        }
      });
      if (formHasError) {
         errorsMap[sub.formId].count += 1;
      }
    });

    return Object.keys(errorsMap).map(formId => {
      const form = forms.find(f => f.id === formId);
      return { 
        formId, 
        title: form?.title || 'Unknown', 
        errorCount: errorsMap[formId].count,
        equipmentDetails: errorsMap[formId].details
      };
    }).sort((a, b) => b.errorCount - a.errorCount);
  }, [submissions, forms, year, selectedDept]);

  // ── Year summary stats ──
  const staffIdsInDept = new Set(filteredStaff.map(s => s.id));
  const yearSchedules = schedules.filter(s => s.date.startsWith(`${year}-`) && staffIdsInDept.has(s.staffId) && s.formId);
  const totalTasks = yearSchedules.length;
  const completedTasks = yearSchedules.filter(s => s.status === 'Completed').length;
  const missedTasks = yearSchedules.filter(s => s.status === 'Pending' && s.date < getLocalTodayStr()).length;
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
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{card.label}</p>
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
        <div className="h-[280px] w-full min-h-[280px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
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
        <div className="h-[240px] w-full min-h-[240px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
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
                    <div className="text-xs text-gray-400 font-black uppercase">{s.department}</div>
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
                <tr key={m.formId} onClick={() => setSelectedError(m)} className="hover:bg-gray-50 cursor-pointer group transition-colors">
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black ${idx === 0 ? 'bg-red-500 text-white' : idx === 1 ? 'bg-orange-400 text-white' : idx === 2 ? 'bg-yellow-400 text-white' : 'bg-gray-100 text-gray-500'}`}>
                      {idx + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-gray-800 text-xs group-hover:text-[#00468B] transition-colors">{m.title}</td>
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
      {selectedError && <MachineErrorModal detail={selectedError} onClose={() => setSelectedError(null)} />}
    </div>
  );
};

// ─────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────

const MonthlyDashboard: React.FC = () => {
  const { language, settings } = useApp();
  const t = translations[language];

  const [selectedDept, setSelectedDept] = useState<string>('ALL');
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
          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-gray-200 text-gray-700 outline-none shadow-sm focus:border-[#00468B] transition-all"
          >
            <option value="ALL">{t.allDepts || "ทุกแผนก (All Depts)"}</option>
            {settings?.departments?.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

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
        ? <MonthlyView year={currentDate.getFullYear()} month={currentDate.getMonth()} selectedDept={selectedDept} />
        : <YearlyView year={currentYear} language={language} selectedDept={selectedDept} />
      }
    </div>
  );
};

export default MonthlyDashboard;