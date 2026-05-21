import React, { useState, useMemo } from 'react';
import { useApp } from '../../AppContext';
import { 
  ChevronLeft, 
  ChevronRight,
  Plus,
  X,
  Check,
  User
} from 'lucide-react';
import { translations } from '../../i18n';
import type { Schedule, Shift } from '../../types';

const Scheduler: React.FC = () => {
  const { users, forms, bundles, addSchedule, schedules, bulkDeleteSchedules, language } = useApp();
  const t = translations[language];
  const [selectedDept, setSelectedDept] = useState<'X-RAY' | 'MRI'>('X-RAY');
  
  const staff = useMemo(() => 
    users.filter(u => u.role === 'STAFF' && u.department === selectedDept), 
    [users, selectedDept]
  );
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'Matrix' | 'List'>('Matrix');
  
  // Selection States
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [showAssignModal, setShowShowAssignModal] = useState(false);
  
  // Modal States
  const [selectedShifts, setSelectedShifts] = useState<Shift[]>([]);
  const [selectedForms, setSelectedForms] = useState<string[]>([]);

  const deptBundles = useMemo(() => 
    bundles.filter(b => b.department === selectedDept),
    [bundles, selectedDept]
  );

  const filteredForms = useMemo(() => {
    return forms
      .filter(f => !f.department || f.department === selectedDept)
      .filter(f => {
        if (selectedShifts.length === 0) return true;
        return f.shifts?.some(s => selectedShifts.includes(s)) ?? true;
      });
  }, [forms, selectedDept, selectedShifts]);

  const allFilteredSelected = filteredForms.length > 0 && filteredForms.every(f => selectedForms.includes(f.id));

  const toggleSelectCategory = () => {
    if (allFilteredSelected) {
      // Unselect only the ones in current filter
      const filteredIds = filteredForms.map(f => f.id);
      setSelectedForms(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      // Select all in current filter
      const filteredIds = filteredForms.map(f => f.id);
      setSelectedForms(prev => [...new Set([...prev, ...filteredIds])]);
    }
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
    setSelectedShifts([...new Set(existing.map(s => s.shift))]);
    
    // Filter out undefined and ensure we only have strings
    const existingFormIds = existing
      .map(s => s.formId)
      .filter((id): id is string => !!id);
    
    setSelectedForms([...new Set(existingFormIds)]);
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
      
      // Identify assignments to remove
      // If we have selected forms, remove existing that are NOT in selected forms (including placeholders)
      // If we have NO selected forms, remove ALL existing form assignments but keep placeholder if shift selected
      const toDelete = existing.filter(ex => {
        const shiftStillSelected = selectedShifts.includes(ex.shift);
        if (!shiftStillSelected) return true; // Delete if shift unselected
        
        if (selectedForms.length > 0) {
          // If we have forms, any record without a formId or with a non-selected formId should go
          return !ex.formId || !selectedForms.includes(ex.formId);
        } else {
          // If we have NO forms, any record WITH a formId should go (we only want the placeholder)
          return !!ex.formId;
        }
      });
      
      if (toDelete.some(s => s.status === 'Completed')) hasCompleted = true;
      allToDeleteIds = [...allToDeleteIds, ...toDelete.map(s => s.id)];

      selectedShifts.forEach(shift => {
        if (selectedForms.length === 0) {
          // Placeholder (Shift Only)
          const alreadyExists = existing.some(ex => ex.shift === shift && !ex.formId);
          if (!alreadyExists) {
            allNewSchedules.push({
              id: Math.random().toString(36).substr(2, 9),
              date: dateStr,
              shift,
              staffId: selectedStaffId,
              supervisorId: '1',
              status: 'Pending'
            });
          }
        } else {
          // Specific Form Assignments
          selectedForms.forEach(formId => {
            const alreadyExists = existing.some(ex => ex.shift === shift && ex.formId === formId);
            if (!alreadyExists) {
              allNewSchedules.push({
                id: Math.random().toString(36).substr(2, 9),
                date: dateStr,
                shift,
                staffId: selectedStaffId,
                formId,
                supervisorId: '1',
                status: 'Pending'
              });
            }
          });
        }
      });
    });

    if (allToDeleteIds.length > 0) {
      if (hasCompleted) {
        if (!confirm(t.language === 'TH' ? 'ตรวจพบงานที่บันทึกข้อมูลแล้วในรายการที่คุณต้องการลบ คุณแน่ใจหรือไม่ว่าต้องการลบงานที่ทำเสร็จแล้วเหล่านี้?' : 'Detected completed tasks in your selection. Are you sure you want to delete these completed records?')) {
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

  if (viewMode === 'List') {
    return <OldSchedulerView setViewMode={setViewMode} />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 max-w-full overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight">{t.personnelRoster}</h1>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">{t.matrixAssignment}</p>
        </div>
        <div className="flex items-center space-x-3 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
          {/* Department Filter in Scheduler */}
          <div className="flex bg-gray-50 p-1 rounded-xl mr-2">
            {(['X-RAY', 'MRI'] as const).map((dept) => (
              <button
                key={dept}
                onClick={() => setSelectedDept(dept)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
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
            className="p-2 hover:bg-gray-50 rounded-xl transition-all"
          >
            <ChevronLeft size={20} className="text-gray-400" />
          </button>
          <span className="text-sm font-black text-[#00468B] uppercase tracking-widest px-4">{monthName}</span>
          <button 
            onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}
            className="p-2 hover:bg-gray-50 rounded-xl transition-all"
          >
            <ChevronRight size={20} className="text-gray-400" />
          </button>
          <div className="w-px h-6 bg-gray-100 mx-2"></div>
          <button 
            onClick={() => setViewMode('List')}
            className="text-[10px] font-black uppercase tracking-widest px-4 py-2 hover:bg-gray-50 rounded-xl transition-all text-gray-400"
          >
            {t.listView}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-gray-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="sticky left-0 z-20 bg-white p-5 text-left border-b border-r border-gray-100 min-w-[200px]">
                  <div className="flex items-center space-x-2">
                    <User size={14} className="text-[#00468B]" />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t.personnelDay}</span>
                  </div>
                </th>
                {Array.from({ length: daysInMonth }).map((_, i) => (
                  <th key={i} className="p-3 border-b border-gray-100 min-w-[45px] text-center">
                    <span className="text-[10px] font-black text-gray-500">{i + 1}</span>
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
                          <span className="text-[8px] font-black bg-blue-50 text-[#00468B] px-1.5 py-0.5 rounded-full border border-blue-100">
                            {monthlyCount}
                          </span>
                        </div>
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">{s.department}</span>
                      </div>
                    </td>
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const day = i + 1;
                      const cellSchedules = getSchedulesForCell(s.id, day);
                      const hasMorning = cellSchedules.some(sc => sc.shift === 'Morning');
                      const hasAfternoon = cellSchedules.some(sc => sc.shift === 'Afternoon');
                      const hasNight = cellSchedules.some(sc => sc.shift === 'Night');
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
                            {!hasMorning && !hasAfternoon && !hasNight && (
                              <div className="opacity-0 group-hover/cell:opacity-100 text-[10px] text-gray-300 transition-opacity">
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
      <div className="flex flex-col items-center space-y-3 pt-4">
        <div className="flex items-center justify-center space-x-8">
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-full bg-orange-400"></div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t.morning}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-400"></div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t.afternoon}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t.night}</span>
          </div>
        </div>
        <div className="flex items-center space-x-2 bg-gray-50 px-4 py-1.5 rounded-full border border-gray-100">
           <div className="relative w-3 h-3">
             <div className="absolute top-0 right-0 w-0 h-0 border-t-[6px] border-r-[6px] border-t-[#00468B] border-r-[#00468B] border-l-[6px] border-l-transparent border-b-[6px] border-b-transparent"></div>
           </div>
           <span className="text-[9px] font-black text-[#00468B] uppercase tracking-widest">
             {language === 'TH' ? 'มีแบบฟอร์มงานที่มอบหมายแล้ว' : 'Has Assigned Protocols'}
           </span>
        </div>
      </div>

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
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
                   <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t.language === 'TH' ? 'เลือกวันที่' : 'Select Days'}</h4>
                   <button 
                    onClick={() => setSelectedDays(Array.from({length: daysInMonth}, (_, i) => i + 1))} 
                    className="text-[10px] font-black text-[#00468B] uppercase tracking-widest hover:underline"
                   >
                    {t.language === 'TH' ? 'เลือกทั้งเดือน' : 'Select Full Month'}
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
                        <span className={`text-[9px] font-bold uppercase tracking-widest mb-0.5 ${isSelected ? 'text-blue-200' : isWeekend ? 'text-red-300' : 'text-gray-400'}`}>
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
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t.selectShiftRotation}</h4>
                <div className="grid grid-cols-3 gap-4">
                  {(['Morning', 'Afternoon', 'Night'] as Shift[]).map(s => {
                    const isSelected = selectedShifts.includes(s);
                    return (
                      <button
                        key={s}
                        onClick={() => {
                          if (isSelected) setSelectedShifts(selectedShifts.filter(i => i !== s));
                          else setSelectedShifts([...selectedShifts, s]);
                        }}
                        className={`flex flex-col items-center justify-center p-4 rounded-3xl border-2 transition-all ${
                          isSelected ? 'bg-blue-50 border-[#00468B] text-[#00468B] shadow-lg' : 'bg-gray-50 border-gray-50 text-gray-400'
                        }`}
                      >
                        <div className={`w-3 h-3 rounded-full mb-2 ${
                          s === 'Morning' ? 'bg-orange-400' : s === 'Afternoon' ? 'bg-blue-400' : 'bg-indigo-500'
                        }`}></div>
                        <span className="text-xs font-black uppercase tracking-tighter">{s === 'Morning' ? t.morning : s === 'Afternoon' ? t.afternoon : t.night}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Forms with Bundles and Categories */}
              <div className="space-y-6">
                <div className="flex flex-col space-y-4">
                   <div className="flex justify-between items-center px-1">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t.assignProtocols}</h4>
                      <div className="flex flex-wrap gap-2">
                          {deptBundles.map(bundle => (
                            <button 
                              key={bundle.id}
                              onClick={() => {
                                // Add all forms from bundle to selection
                                setSelectedForms(prev => [...new Set([...prev, ...bundle.formIds])]);
                              }} 
                              className="text-[9px] font-black bg-blue-50 text-[#00468B] px-2.5 py-1.5 rounded-lg border border-blue-100 uppercase tracking-tight hover:bg-blue-100 transition-colors"
                            >
                              {bundle.name}
                            </button>
                          ))}
                          {deptBundles.length === 0 && (
                            <p className="text-[9px] text-gray-400 italic">{t.noGroupsDefined}</p>
                          )}
                          <div className="w-px h-4 bg-gray-200 mx-1 self-center"></div>
                          <button 
                            onClick={toggleSelectCategory}
                            className={`text-[9px] font-black px-2.5 py-1.5 rounded-lg border uppercase tracking-tight transition-colors ${
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
                            onClick={() => setSelectedForms([])} 
                            className="text-[9px] font-black bg-gray-50 text-gray-400 px-2.5 py-1.5 rounded-lg border border-gray-100 uppercase tracking-tight hover:bg-gray-100 transition-colors"
                          >
                            Clear
                          </button>
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {forms
                    .filter(f => !f.department || f.department === selectedDept)
                    .filter(f => {
                      if (selectedShifts.length === 0) return true;
                      // Show form if it supports ANY of the selected shifts
                      return f.shifts?.some(s => selectedShifts.includes(s)) ?? true;
                    })
                    .map(f => {
                    const isSelected = selectedForms.includes(f.id);
                    
                    // Check if assigned to others on ANY of the selected days/shifts
                    const assignedToOthers = schedules.filter(sc => 
                      selectedDays.some(day => sc.date === `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`) &&
                      sc.formId === f.id &&
                      sc.staffId !== selectedStaffId &&
                      selectedShifts.includes(sc.shift)
                    );

                    return (
                      <button
                        key={f.id}
                        onClick={() => {
                          if (isSelected) setSelectedForms(selectedForms.filter(i => i !== f.id));
                          else setSelectedForms([...selectedForms, f.id]);
                        }}
                        className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left ${
                          isSelected ? 'bg-[#00468B] border-[#00468B] text-white shadow-md' : 'bg-gray-50 border-gray-50 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex flex-col min-w-0 pr-4">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold truncate">{f.title}</span>
                            {assignedToOthers.length > 0 && (
                              <span className="bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded font-black uppercase">
                                Already Assigned ({assignedToOthers.length})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 mt-0.5">
                             <span className={`text-[9px] font-medium uppercase tracking-widest ${isSelected ? 'text-blue-100' : 'text-gray-400'}`}>
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
  const { users, forms, addSchedule, schedules, deleteSchedule, language } = useApp();
  const t = translations[language];
  const staff = users.filter(u => u.role === 'STAFF');

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [shift, setShift] = useState<Shift>('Morning');
  const [staffId, setStaffId] = useState('');
  const [formId, setFormId] = useState('');

  const handleSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffId || !formId) return alert('Please fill all required fields');

    const newSchedule: Schedule = {
      id: Math.random().toString(36).substr(2, 9),
      date,
      shift,
      staffId,
      formId,
      supervisorId: '1',
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
          className="bg-[#00468B] text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg"
        >
          {t.matrixView}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <form onSubmit={handleSchedule} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6 sticky top-6">
             <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{t.language === 'TH' ? 'วันที่' : 'Date'}</label>
                <input 
                  type="date" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full border-2 border-gray-50 rounded-xl p-3 focus:border-blue-500 bg-gray-50 font-bold text-gray-700 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{t.language === 'TH' ? 'เวร' : 'Shift'}</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Morning', 'Afternoon', 'Night'] as Shift[]).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setShift(s)}
                      className={`py-2.5 text-[10px] font-black rounded-lg border-2 transition-all uppercase tracking-tighter ${
                        shift === s 
                          ? 'bg-[#00468B] border-[#00468B] text-white shadow-md' 
                          : 'bg-white border-gray-50 text-gray-400 hover:border-gray-200'
                      }`}
                    >
                      {s === 'Morning' ? t.morning : s === 'Afternoon' ? t.afternoon : t.night}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{t.staffMember}</label>
                <select 
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  className="w-full border-2 border-gray-50 rounded-xl p-3 bg-gray-50 font-bold text-gray-700 outline-none focus:border-blue-500 transition-all appearance-none"
                >
                  <option value="">{t.language === 'TH' ? 'เลือกพนักงาน...' : 'Select Personnel...'}</option>
                  {staff.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{t.formProtocol}</label>
                <select 
                  value={formId}
                  onChange={(e) => setFormId(e.target.value)}
                  className="w-full border-2 border-gray-50 rounded-xl p-3 bg-gray-50 font-bold text-gray-700 outline-none focus:border-blue-500 transition-all appearance-none"
                >
                  <option value="">{t.language === 'TH' ? 'เลือกแบบฟอร์ม...' : 'Select Form...'}</option>
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
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{s.date} | {forms.find(f => f.id === s.formId)?.title}</p>
                      </div>
                   </div>
                   <button 
                    onClick={() => {
                      if (confirm(t.language === 'TH' ? 'คุณแน่ใจหรือไม่ว่าต้องการยกเลิกเวรนี้?' : 'Are you sure you want to cancel this shift?')) {
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