import React, { useState, useMemo } from 'react';
import { useUsers, useForms, useBundles, useAddSchedule, useSchedules, useBulkDeleteSchedules, useDeleteSchedule } from '../../hooks/queries';
import { useApp } from '../../AppContext';
import { 
  ChevronLeft, 
  ChevronRight,
  Plus,
  X,
  Check,
  User,
  Copy,
  Download,
  Printer,
  Trash2
} from 'lucide-react';
import { translations } from '../../i18n';
import { getLocalTodayStr } from '../../utils/shiftTime';
import type { Schedule, Shift } from '../../types';

const Scheduler: React.FC = () => {
  const { language, currentUser, settings } = useApp();
  const { mutate: addSchedule } = useAddSchedule();
  const { mutate: bulkDeleteSchedules } = useBulkDeleteSchedules();
  const { data: users = [] } = useUsers();
  const { data: forms = [] } = useForms();
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  const { data: schedules = [] } = useSchedules({ month: currentMonth, year: currentYear });

  const { data: bundles = [] } = useBundles();
  const t = translations[language];
  const [selectedDept, setSelectedDept] = useState<string>(settings?.departments?.[0] || 'IMAGING');
  
  const staff = useMemo(() => {
    const filtered = users.filter(u => u.role === 'STAFF' && u.department === selectedDept);
    return filtered.sort((a, b) => a.name.localeCompare(b.name, 'th-TH'));
  }, [users, selectedDept]);
  
  const [viewMode, setViewMode] = useState<'Matrix' | 'List'>('Matrix');
  
  // Selection States
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [showAssignModal, setShowShowAssignModal] = useState(false);
  
  // Modal States
  const [selectedShifts, setSelectedShifts] = useState<Shift[]>([]);
  const [selectedFormsByShift, setSelectedFormsByShift] = useState<Record<Shift, string[]>>({ Morning: [], Afternoon: [], Night: [], NightBeforeMorning: [] });
  const [activeShiftTab, setActiveShiftTab] = useState<Shift>('Morning');

  const deptBundles = useMemo(() => 
    bundles.filter(b => b.department === selectedDept),
    [bundles, selectedDept]
  );

  const filteredForms = useMemo(() => {
    return forms
      .filter(f => !f.department || f.department === selectedDept);
  }, [forms, selectedDept]);

  const allFilteredSelected = filteredForms.length > 0 && filteredForms.every(f => selectedFormsByShift[activeShiftTab].includes(f.id));

  const toggleSelectCategory = () => {
    const filteredIds = filteredForms.map(f => f.id);
    setSelectedFormsByShift(prev => {
      const current = prev[activeShiftTab];
      if (allFilteredSelected) {
        return { ...prev, [activeShiftTab]: current.filter(id => !filteredIds.includes(id)) };
      } else {
        return { ...prev, [activeShiftTab]: [...new Set([...current, ...filteredIds])] };
      }
    });
  };

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const monthName = currentDate.toLocaleString(language === 'TH' ? 'th-TH' : 'en-US', { month: 'long', year: 'numeric' });

  const getSchedulesForCell = (staffId: string, day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return schedules.filter(s => s.staffId === staffId && s.date === dateStr);
  };

  const handleCellClick = (staffId: string, day: number) => {
    setSelectedStaffId(staffId);
    setSelectedDays([day]);
    const existing = getSchedulesForCell(staffId, day);
    const shifts = [...new Set(existing.map(s => s.shift))];
    setSelectedShifts(shifts);
    if (shifts.length > 0) setActiveShiftTab(shifts[0]);
    else setActiveShiftTab('Morning');
    
    const formsByShift: Record<Shift, string[]> = { Morning: [], Afternoon: [], Night: [], NightBeforeMorning: [] };
    existing.forEach(s => {
      if (s.formId) {
        formsByShift[s.shift].push(s.formId);
      }
    });
    
    setSelectedFormsByShift(formsByShift);
    setShowShowAssignModal(true);
  };

  const handleClearDuties = () => {
    if (!selectedStaffId || selectedDays.length === 0) return;

    let allToDeleteIds: string[] = [];
    let hasCompleted = false;

    selectedDays.forEach(day => {
      const existing = getSchedulesForCell(selectedStaffId, day);
      if (existing.some(s => s.status === 'Completed')) hasCompleted = true;
      allToDeleteIds = [...allToDeleteIds, ...existing.map(s => s.id)];
    });

    if (allToDeleteIds.length === 0) {
      setShowShowAssignModal(false);
      return;
    }

    const confirmMsg = hasCompleted
      ? (language === 'TH' ? 'มีงานที่ทำเสร็จแล้วรวมอยู่ด้วย ยืนยันที่จะลบทั้งหมดหรือไม่?' : 'Completed tasks detected. Are you sure you want to delete everything?')
      : t.confirmClearDuties;

    if (confirm(confirmMsg)) {
      bulkDeleteSchedules(allToDeleteIds);
      setShowShowAssignModal(false);
      setSelectedStaffId(null);
      setSelectedDays([]);
    }
  };

  const saveAssignments = () => {
    if (!selectedStaffId || selectedDays.length === 0) return;
    
    let allToDeleteIds: string[] = [];
    const allNewSchedules: Schedule[] = [];
    let hasCompleted = false;

    selectedDays.forEach(day => {
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const existing = getSchedulesForCell(selectedStaffId, day);
      
      const toDelete = existing.filter(ex => {
        const shiftStillSelected = selectedShifts.includes(ex.shift);
        if (!shiftStillSelected) return true; 
        
        const formsForThisShift = selectedFormsByShift[ex.shift] || [];
        if (formsForThisShift.length > 0) {
          return !ex.formId || !formsForThisShift.includes(ex.formId);
        } else {
          return !!ex.formId;
        }
      });
      
      if (toDelete.some(s => s.status === 'Completed')) hasCompleted = true;
      allToDeleteIds = [...allToDeleteIds, ...toDelete.map(s => s.id)];

      selectedShifts.forEach(shift => {
        const formsForThisShift = selectedFormsByShift[shift] || [];
        if (formsForThisShift.length === 0) {
          // Placeholder (Shift Only)
          const alreadyExists = existing.some(ex => ex.shift === shift && !ex.formId);
          if (!alreadyExists) {
            allNewSchedules.push({
              id: crypto.randomUUID(),
              date: dateStr,
              shift,
              staffId: selectedStaffId,
              supervisorId: currentUser?.id || users.find(u => u.role === 'ADMIN')?.id || '00000000-0000-0000-0000-000000000000',
              status: 'Pending'
            });
          }
        } else {
          // Specific Form Assignments
          formsForThisShift.forEach(formId => {
            const alreadyExists = existing.some(ex => ex.shift === shift && ex.formId === formId);
            if (!alreadyExists) {
              allNewSchedules.push({
                id: crypto.randomUUID(),
                date: dateStr,
                shift,
                staffId: selectedStaffId,
                formId,
                supervisorId: currentUser?.id || users.find(u => u.role === 'ADMIN')?.id || '00000000-0000-0000-0000-000000000000',
                status: 'Pending'
              });
            }
          });
        }
      });
    });

    if (allToDeleteIds.length > 0) {
      if (hasCompleted) {
        if (!confirm(language === 'TH' ? 'ตรวจพบงานที่บันทึกข้อมูลแล้วในรายการที่คุณต้องการลบ คุณแน่ใจหรือไม่ว่าต้องการลบงานที่ทำเสร็จแล้วเหล่านี้?' : 'Detected completed tasks in your selection. Are you sure you want to delete these completed records?')) {
          return;
        }
      }
      bulkDeleteSchedules(allToDeleteIds);
    }

    if (allNewSchedules.length > 0) {
      addSchedule(allNewSchedules);
    }
    setShowShowAssignModal(false);
    setSelectedStaffId(null);
    setSelectedDays([]);
  };

  const handleCopyPreviousMonth = () => {
    const prevMonthDate = new Date(currentDate);
    prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
    
    const prevYear = prevMonthDate.getFullYear();
    const prevMonth = String(prevMonthDate.getMonth() + 1).padStart(2, '0');
    const prevMonthPrefix = `${prevYear}-${prevMonth}-`;

    const currYear = currentDate.getFullYear();
    const currMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
    const currMonthPrefix = `${currYear}-${currMonth}-`;

    const prevSchedules = schedules.filter(s => {
      if (!s.date.startsWith(prevMonthPrefix)) return false;
      const staffMember = users.find(u => u.id === s.staffId);
      return staffMember && staffMember.department === selectedDept;
    });

    if (prevSchedules.length === 0) {
      alert(language === 'TH' ? 'ไม่มีตารางเวรในเดือนก่อนหน้าสำหรับแผนกนี้' : 'No schedules found in the previous month for this department.');
      return;
    }

    if (!confirm(language === 'TH' ? `ยืนยันการคัดลอกเวร ${prevSchedules.length} รายการ จากเดือนก่อนหน้า? (ข้อมูลจะเพิ่มเข้าไปในเดือนปัจจุบัน)` : `Are you sure you want to copy ${prevSchedules.length} schedules from the previous month? (They will be added to the current month)`)) {
      return;
    }

    const newSchedules: Schedule[] = [];
    prevSchedules.forEach(s => {
      const day = s.date.split('-')[2];
      const maxDaysInCurrentMonth = new Date(currYear, currentDate.getMonth() + 1, 0).getDate();
      if (parseInt(day) <= maxDaysInCurrentMonth) {
        newSchedules.push({
          ...s,
          id: crypto.randomUUID(),
          date: `${currMonthPrefix}${day}`,
          status: 'Pending'
        });
      }
    });

    if (newSchedules.length > 0) {
      addSchedule(newSchedules);
      alert(language === 'TH' ? `คัดลอกสำเร็จ ${newSchedules.length} รายการ` : `Successfully copied ${newSchedules.length} schedules.`);
    }
  };

  const handleClearMonth = () => {
    const currYear = currentDate.getFullYear();
    const currMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
    const monthPrefix = `${currYear}-${currMonth}-`;

    const schedulesToDelete = schedules.filter(s => {
      if (!s.date.startsWith(monthPrefix)) return false;
      const staffMember = users.find(u => u.id === s.staffId);
      return staffMember && staffMember.department === selectedDept;
    });

    if (schedulesToDelete.length === 0) {
      alert(language === 'TH' ? 'ไม่มีเวรในเดือนนี้สำหรับแผนกที่เลือก' : 'No schedules found in this month for the selected department.');
      return;
    }

    const hasCompleted = schedulesToDelete.some(s => s.status === 'Completed');
    let confirmMsg = language === 'TH' 
      ? `ยืนยันการลบตารางเวรทั้งหมด ${schedulesToDelete.length} รายการในเดือนนี้?` 
      : `Are you sure you want to delete all ${schedulesToDelete.length} schedules in this month?`;
    
    if (hasCompleted) {
      confirmMsg += language === 'TH' 
        ? '\n\n⚠️ คำเตือน: มีรายการที่ทำเสร็จแล้วรวมอยู่ด้วย ข้อมูลจะถูกลบทั้งหมด ยืนยันหรือไม่?' 
        : '\n\n⚠️ WARNING: There are completed tasks included. They will all be deleted. Confirm?';
    }

    if (confirm(confirmMsg)) {
      bulkDeleteSchedules(schedulesToDelete.map(s => s.id));
    }
  };

  const exportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    const headerRow = ["Personnel", ...Array.from({ length: daysInMonth }).map((_, i) => i + 1)];
    csvContent += headerRow.join(",") + "\n";

    staff.forEach(s => {
      const row = [s.name];
      for (let day = 1; day <= daysInMonth; day++) {
        const cellSchedules = getSchedulesForCell(s.id, day);
        const shifts = [...new Set(cellSchedules.map(sc => sc.shift))];
        const shiftLetters = shifts.map(sh => sh === 'Morning' ? 'M' : sh === 'Afternoon' ? 'A' : 'N');
        row.push(shiftLetters.length > 0 ? shiftLetters.join("/") : "");
      }
      csvContent += row.join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `schedule_${selectedDept}_${monthName.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (viewMode === 'List') {
    return <OldSchedulerView setViewMode={setViewMode} />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 max-w-full overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight">{t.personnelRoster}</h1>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">{t.matrixAssignment}</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={handleClearMonth}
            className="flex items-center space-x-2 bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:bg-red-100 transition-all border border-red-100"
          >
            <Trash2 size={14} />
            <span>{language === 'TH' ? 'ล้างทั้งเดือน' : 'Clear Month'}</span>
          </button>
          <button 
            onClick={handleCopyPreviousMonth}
            className="flex items-center space-x-2 bg-blue-50 text-[#00468B] px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:bg-blue-100 transition-all border border-blue-100"
          >
            <Copy size={14} />
            <span>{language === 'TH' ? 'ก๊อปปี้เดือนก่อนหน้า' : 'Copy Prev Month'}</span>
          </button>

          <div className="flex items-center space-x-1 bg-white p-1 rounded-xl border border-gray-100 shadow-sm">
            <button 
              onClick={exportToCSV}
              className="flex items-center justify-center p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
              title="Export to Excel (CSV)"
            >
              <Download size={16} />
            </button>
            <button 
              onClick={() => window.print()}
              className="flex items-center justify-center p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-all"
              title="Print to PDF"
            >
              <Printer size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center space-x-3 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm w-full md:w-auto overflow-x-auto">
          {/* Department Filter in Scheduler */}
          <div className="flex bg-gray-50 p-1 rounded-xl mr-2 shrink-0">
            {(settings?.departments || []).map((dept) => (
              <button
                key={dept}
                onClick={() => setSelectedDept(dept)}
                className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                  selectedDept === dept
                    ? 'bg-[#00468B] text-white shadow-md'
                    : 'text-gray-400 hover:bg-gray-100'
                }`}
              >
                {dept}
              </button>
            ))}
          </div>

          <button 
            onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}
            className="p-2 hover:bg-gray-50 rounded-xl transition-all shrink-0"
          >
            <ChevronLeft size={20} className="text-gray-400" />
          </button>
          <span className="text-sm font-black text-[#00468B] uppercase tracking-widest px-4 shrink-0 whitespace-nowrap">{monthName}</span>
          <button 
            onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}
            className="p-2 hover:bg-gray-50 rounded-xl transition-all shrink-0"
          >
            <ChevronRight size={20} className="text-gray-400" />
          </button>
          <div className="w-px h-6 bg-gray-100 mx-2 shrink-0"></div>
          <button 
            onClick={() => setViewMode('List')}
            className="text-xs font-black uppercase tracking-widest px-4 py-2 hover:bg-gray-50 rounded-xl transition-all text-gray-400 shrink-0"
          >
            {t.listView}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-gray-100 shadow-xl overflow-hidden">
        <div className="overflow-auto max-h-[70vh]">
          <table className="w-full border-collapse relative">
            <thead>
              <tr className="bg-gray-50">
                <th className="sticky top-0 left-0 z-40 bg-gray-50 p-5 text-left border-b border-r border-gray-200 min-w-[200px]">
                  <div className="flex items-center space-x-2">
                    <User size={14} className="text-[#00468B]" />
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{t.personnelDay}</span>
                  </div>
                </th>
                {Array.from({ length: daysInMonth }).map((_, i) => (
                  <th key={i} className="sticky top-0 z-30 bg-gray-50 p-3 border-b border-gray-200 min-w-[45px] text-center">
                    <span className="text-xs font-black text-gray-500">{i + 1}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staff.map(s => {
                const monthlyCount = schedules.filter(sc => 
                  sc.staffId === s.id && 
                  sc.date.startsWith(`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`)
                ).length;

                return (
                  <tr key={s.id} className="group hover:bg-blue-50/20 transition-all">
                    <td className="sticky left-0 z-10 bg-white group-hover:bg-blue-50 p-5 border-r border-gray-100">
                      <div className="flex flex-col">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-gray-800 text-sm">{s.name}</span>
                          <span className="text-xs font-black bg-blue-50 text-[#00468B] px-1.5 py-0.5 rounded-full border border-blue-100">
                            {monthlyCount}
                          </span>
                        </div>
                        <span className="text-xs font-black text-gray-400 uppercase tracking-tighter">{s.department}</span>
                      </div>
                    </td>
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const day = i + 1;
                      const cellSchedules = getSchedulesForCell(s.id, day);
                      const hasMorning = cellSchedules.some(sc => sc.shift === 'Morning');
                      const hasAfternoon = cellSchedules.some(sc => sc.shift === 'Afternoon');
                      const hasNight = cellSchedules.some(sc => sc.shift === 'Night');
                      const hasNightBeforeMorning = cellSchedules.some(sc => sc.shift === 'NightBeforeMorning');
                      const hasFormsAssigned = cellSchedules.some(sc => !!sc.formId);
                      
                      return (
                        <td 
                          key={i} 
                          onClick={() => handleCellClick(s.id, day)}
                          className="p-1 border-r border-gray-50 cursor-pointer hover:bg-white transition-all relative group/cell"
                        >
                          {hasFormsAssigned && (
                            <div className="absolute top-0 right-0 w-0 h-0 border-t-[6px] border-r-[6px] border-t-[#00468B] border-r-[#00468B] border-l-[6px] border-l-transparent border-b-[6px] border-b-transparent opacity-80"></div>
                          )}
                          <div className="flex flex-col items-center justify-center space-y-0.5 h-10">
                            {hasMorning && <div className="w-1.5 h-1.5 rounded-full bg-orange-400 shadow-sm shadow-orange-200"></div>}
                            {hasAfternoon && <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-sm shadow-blue-200"></div>}
                            {hasNight && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-200"></div>}
                            {hasNightBeforeMorning && <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-sm shadow-green-200"></div>}
                            {!hasMorning && !hasAfternoon && !hasNight && !hasNightBeforeMorning && (
                              <div className="opacity-0 group-hover/cell:opacity-100 text-xs text-gray-300 transition-opacity">
                                <Plus size={10} />
                              </div>
                            )}
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

      {/* Matrix Legend */}
      <div className="flex flex-col items-center space-y-3 pt-4 print:hidden">
        <div className="flex items-center justify-center space-x-8">
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-full bg-orange-400"></div>
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{t.morning}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-400"></div>
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{t.afternoon}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{t.night}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{t.nightBeforeMorning}</span>
          </div>
        </div>
        <div className="flex items-center space-x-2 bg-gray-50 px-4 py-1.5 rounded-full border border-gray-100">
           <div className="relative w-3 h-3">
             <div className="absolute top-0 right-0 w-0 h-0 border-t-[6px] border-r-[6px] border-t-[#00468B] border-r-[#00468B] border-l-[6px] border-l-transparent border-b-[6px] border-b-transparent"></div>
           </div>
           <span className="text-xs font-black text-[#00468B] uppercase tracking-widest">
             {language === 'TH' ? 'มีแบบฟอร์มงานที่มอบหมายแล้ว' : 'Has Assigned Protocols'}
           </span>
        </div>
      </div>

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300 print:hidden">
          <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-[#00468B] p-8 text-white flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black tracking-tight">{t.dutyAssignment}</h3>
                <p className="text-blue-100/70 text-xs font-bold uppercase tracking-widest mt-1">
                  Personnel: {staff.find(s => s.id === selectedStaffId)?.name}
                </p>
              </div>
              <button onClick={() => setShowShowAssignModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-all">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
              {/* Step 1: Days Selection */}
              <div className="space-y-4">
                <div className="flex justify-between items-end px-1">
                   <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">{language === 'TH' ? 'เลือกวันที่' : 'Select Days'}</h4>
                   <button 
                    onClick={() => setSelectedDays(Array.from({length: daysInMonth}, (_, i) => i + 1))} 
                    className="text-xs font-black text-[#00468B] uppercase tracking-widest hover:underline"
                   >
                    {language === 'TH' ? 'เลือกทั้งเดือน' : 'Select Full Month'}
                   </button>
                </div>
                <div className="grid grid-cols-7 sm:grid-cols-7 md:grid-cols-10 gap-2">
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const isSelected = selectedDays.includes(day);
                    const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                    const dayOfWeek = dateObj.toLocaleDateString(language === 'TH' ? 'th-TH' : 'en-US', { weekday: 'short' });
                    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                    const hasAssignments = selectedStaffId ? getSchedulesForCell(selectedStaffId, day).length > 0 : false;

                    return (
                      <button
                        key={day}
                        onClick={() => {
                          if (isSelected && selectedDays.length > 1) setSelectedDays(selectedDays.filter(d => d !== day));
                          else if (!isSelected) setSelectedDays([...selectedDays, day].sort((a,b) => a-b));
                        }}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all relative ${
                          isSelected 
                            ? 'bg-[#00468B] border-[#00468B] text-white shadow-md' 
                            : isWeekend 
                              ? 'bg-red-50/30 border-red-100 text-red-400 hover:bg-red-50' 
                              : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        {hasAssignments && (
                          <div className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/60' : 'bg-green-500'} shadow-sm`}></div>
                        )}
                        <span className={`text-xs font-bold uppercase tracking-widest mb-0.5 ${isSelected ? 'text-blue-200' : isWeekend ? 'text-red-300' : 'text-gray-400'}`}>
                          {dayOfWeek}
                        </span>
                        <span className="text-sm font-black">
                          {day}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Shifts */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">{t.selectShiftRotation}</h4>
                <div className="grid grid-cols-3 gap-4">
                  {(['Morning', 'Afternoon', 'Night', 'NightBeforeMorning'] as Shift[]).map(s => {
                    const isSelected = selectedShifts.includes(s);
                    return (
                      <button
                        key={s}
                        onClick={() => {
                          let newShifts = [...selectedShifts];
                          if (isSelected) {
                            newShifts = selectedShifts.filter(i => i !== s);
                          } else {
                            newShifts.push(s);
                          }
                          setSelectedShifts(newShifts);
                          
                          if (!isSelected) {
                            setActiveShiftTab(s);
                          } else if (activeShiftTab === s) {
                            setActiveShiftTab(newShifts.length > 0 ? newShifts[0] : 'Morning');
                          }
                        }}
                        className={`flex flex-col items-center justify-center p-4 rounded-3xl border-2 transition-all ${
                          isSelected ? 'bg-blue-50 border-[#00468B] text-[#00468B] shadow-lg' : 'bg-gray-50 border-gray-50 text-gray-400'
                        }`}
                      >
                        <div className={`w-3 h-3 rounded-full mb-2 ${
                          s === 'Morning' ? 'bg-orange-400' : s === 'Afternoon' ? 'bg-blue-400' : s === 'NightBeforeMorning' ? 'bg-green-500' : 'bg-indigo-500'
                        }`}></div>
                        <span className="text-xs font-black uppercase tracking-tighter">{s === 'Morning' ? t.morning : s === 'Afternoon' ? t.afternoon : s === 'NightBeforeMorning' ? t.nightBeforeMorning : t.night}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Forms with Bundles and Categories */}
              {selectedShifts.length > 0 && (
              <div className="space-y-6">
                <div className="flex flex-col space-y-4">
                   <div className="flex justify-between items-center px-1">
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">{t.assignProtocols}</h4>
                      <div className="flex space-x-2 bg-gray-50 p-1 rounded-xl">
                        {selectedShifts.map(s => (
                          <button
                            key={s}
                            onClick={() => setActiveShiftTab(s)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                              activeShiftTab === s
                                ? 'bg-white text-[#00468B] shadow-sm border border-gray-200'
                                : 'text-gray-400 hover:bg-gray-100'
                            }`}
                          >
                            {s === 'Morning' ? t.morning : s === 'Afternoon' ? t.afternoon : s === 'NightBeforeMorning' ? t.nightBeforeMorning : t.night}
                          </button>
                        ))}
                      </div>
                   </div>
                   
                   <div className="flex flex-wrap gap-2 px-1">
                       {deptBundles.map(bundle => (
                         <button 
                           key={bundle.id}
                           onClick={() => {
                             setSelectedFormsByShift(prev => ({
                               ...prev,
                               [activeShiftTab]: [...new Set([...prev[activeShiftTab], ...bundle.formIds])]
                             }));
                           }} 
                           className="text-xs font-black bg-blue-50 text-[#00468B] px-2.5 py-1.5 rounded-lg border border-blue-100 uppercase tracking-tight hover:bg-blue-100 transition-colors"
                         >
                           {bundle.name}
                         </button>
                       ))}
                       {deptBundles.length === 0 && (
                         <p className="text-xs text-gray-400 italic">{t.noGroupsDefined}</p>
                       )}
                       <div className="w-px h-4 bg-gray-200 mx-1 self-center"></div>
                       <button 
                         onClick={toggleSelectCategory}
                         className={`text-xs font-black px-2.5 py-1.5 rounded-lg border uppercase tracking-tight transition-colors ${
                           allFilteredSelected 
                             ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100' 
                             : 'bg-blue-50 text-[#00468B] border-blue-100 hover:bg-blue-100'
                         }`}
                       >
                         {allFilteredSelected 
                           ? (language === 'TH' ? 'ยกเลิกทั้งหมด' : 'Unselect All') 
                           : (language === 'TH' ? 'เลือกทั้งหมด' : 'Select All')}
                       </button>
                       <button 
                         onClick={() => setSelectedFormsByShift(prev => ({ ...prev, [activeShiftTab]: [] }))} 
                         className="text-xs font-black bg-gray-50 text-gray-400 px-2.5 py-1.5 rounded-lg border border-gray-100 uppercase tracking-tight hover:bg-gray-100 transition-colors"
                       >
                         Clear
                       </button>
                   </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {filteredForms.map(f => {
                    const isSelected = selectedFormsByShift[activeShiftTab].includes(f.id);
                    
                    const assignedToOthers = schedules.filter(sc => 
                      selectedDays.some(day => sc.date === `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`) &&
                      sc.formId === f.id &&
                      sc.staffId !== selectedStaffId &&
                      sc.shift === activeShiftTab
                    );

                    return (
                      <button
                        key={f.id}
                        onClick={() => {
                          setSelectedFormsByShift(prev => {
                            const current = prev[activeShiftTab];
                            if (isSelected) {
                              return { ...prev, [activeShiftTab]: current.filter(i => i !== f.id) };
                            } else {
                              return { ...prev, [activeShiftTab]: [...current, f.id] };
                            }
                          });
                        }}
                        className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left ${
                          isSelected ? 'bg-[#00468B] border-[#00468B] text-white shadow-md' : 'bg-gray-50 border-gray-50 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex flex-col min-w-0 pr-4">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold truncate">{f.title}</span>
                            {assignedToOthers.length > 0 && (
                              <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded font-black uppercase">
                                Already Assigned ({assignedToOthers.length})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 mt-0.5">
                             <span className={`text-xs font-medium uppercase tracking-widest ${isSelected ? 'text-blue-100' : 'text-gray-400'}`}>
                               {f.department} | {f.questions.length} {t.auditPoints}
                             </span>
                          </div>
                        </div>
                        {isSelected && <Check size={16} />}
                      </button>
                    );
                  })}
                </div>
              </div>
              )}
            </div>

            <div className="p-8 bg-gray-50 border-t border-gray-100 flex gap-4">
              <button 
                onClick={() => setShowShowAssignModal(false)}
                className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-all"
              >
                {t.closeReport}
              </button>
              <button 
                onClick={handleClearDuties}
                className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-red-500 bg-red-50 hover:bg-red-100 rounded-2xl transition-all"
              >
                {language === 'TH' ? 'ล้างเวร' : 'Clear Duties'}
              </button>
              <button 
                onClick={saveAssignments}
                className="flex-[2] py-4 bg-[#00468B] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-900/10 hover:shadow-blue-900/20 active:scale-95 transition-all"
              >
                {t.applyDuties} ({selectedDays.length} {language === 'TH' ? 'วัน' : 'Days'})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Extracted Old Scheduler Logic for legacy access
const OldSchedulerView: React.FC<{setViewMode: (v: 'Matrix' | 'List') => void}> = ({ setViewMode }) => {
  const { language, currentUser } = useApp();
  const { data: users = [] } = useUsers();
  const { data: forms = [] } = useForms();
  const { data: schedules = [] } = useSchedules();
  const { mutate: addSchedule } = useAddSchedule();
  const { mutate: deleteSchedule } = useDeleteSchedule();
  const t = translations[language];
  const staff = users.filter(u => u.role === 'STAFF').sort((a, b) => a.name.localeCompare(b.name, 'th-TH'));

  const [date, setDate] = useState(getLocalTodayStr());
  const [shift, setShift] = useState<Shift>('Morning');
  const [staffId, setStaffId] = useState('');
  const [formId, setFormId] = useState('');

  const handleSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffId || !formId) return alert('Please fill all required fields');

    const newSchedule: Schedule = {
      id: crypto.randomUUID(),
      date,
      shift,
      staffId,
      formId,
      supervisorId: currentUser?.id || users.find(u => u.role === 'ADMIN')?.id || '00000000-0000-0000-0000-000000000000',
      status: 'Pending'
    };
    addSchedule(newSchedule);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{t.scheduling}</h1>
          <p className="text-sm text-gray-500 font-medium">{t.listView}</p>
        </div>
        <button 
          onClick={() => setViewMode('Matrix')}
          className="bg-[#00468B] text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg"
        >
          {t.matrixView}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <form onSubmit={handleSchedule} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6 sticky top-6">
             <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">{language === 'TH' ? 'วันที่' : 'Date'}</label>
                <input 
                  type="date" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full border-2 border-gray-50 rounded-xl p-3 focus:border-blue-500 bg-gray-50 font-bold text-gray-700 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">{language === 'TH' ? 'เวร' : 'Shift'}</label>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  {(['Morning', 'Afternoon', 'Night', 'NightBeforeMorning'] as Shift[]).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setShift(s)}
                      className={`py-2.5 px-2 text-xs font-black rounded-lg border-2 transition-all uppercase tracking-tighter ${
                        shift === s 
                          ? 'bg-[#00468B] border-[#00468B] text-white shadow-md' 
                          : 'bg-white border-gray-50 text-gray-400 hover:border-gray-200'
                      }`}
                    >
                      {s === 'Morning' ? t.morning : s === 'Afternoon' ? t.afternoon : s === 'NightBeforeMorning' ? t.nightBeforeMorning : t.night}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">{t.staffMember}</label>
                <select 
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  className="w-full border-2 border-gray-50 rounded-xl p-3 bg-gray-50 font-bold text-gray-700 outline-none focus:border-blue-500 transition-all appearance-none"
                >
                  <option value="">{language === 'TH' ? 'เลือกพนักงาน...' : 'Select Personnel...'}</option>
                  {staff.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">{t.formProtocol}</label>
                <select 
                  value={formId}
                  onChange={(e) => setFormId(e.target.value)}
                  className="w-full border-2 border-gray-50 rounded-xl p-3 bg-gray-50 font-bold text-gray-700 outline-none focus:border-blue-500 transition-all appearance-none"
                >
                  <option value="">{language === 'TH' ? 'เลือกแบบฟอร์ม...' : 'Select Form...'}</option>
                  {forms.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
                </select>
              </div>
            </div>
            <button type="submit" className="w-full bg-[#00468B] text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest">
              {t.confirmAssignment}
            </button>
          </form>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="divide-y divide-gray-50">
              {schedules.map(s => (
                <div key={s.id} className="p-6 flex items-center justify-between">
                   <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold">{s.shift.charAt(0)}</div>
                      <div>
                        <p className="font-bold text-gray-700">{users.find(u => u.id === s.staffId)?.name}</p>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{s.date} | {forms.find(f => f.id === s.formId)?.title}</p>
                      </div>
                   </div>
                   <button 
                    onClick={() => {
                      if (confirm(language === 'TH' ? 'คุณแน่ใจหรือไม่ว่าต้องการยกเลิกเวรนี้?' : 'Are you sure you want to cancel this shift?')) {
                        deleteSchedule(s.id);
                      }
                    }} 
                    className="text-red-400 p-2 hover:bg-red-50 rounded-lg transition-all"
                   >
                    <X size={16} />
                   </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Scheduler;