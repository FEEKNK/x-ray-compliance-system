import React, { useState, useMemo } from 'react';
import { useSchedules, useForms } from '../../hooks/queries';
import { useApp } from '../../AppContext';
import { translations } from '../../i18n';
import { Calendar, ChevronLeft, ChevronRight, CheckCircle, Info, MapPin } from 'lucide-react';


const MySchedule: React.FC = () => {
  const { currentUser, language } = useApp();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate());
  
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  
  const { data: schedules = [] } = useSchedules({ month: currentMonth, year: currentYear });
  const { data: forms = [] } = useForms();
  const t = translations[language];

  const monthName = currentDate.toLocaleString(language === 'TH' ? 'th-TH' : 'en-US', { month: 'long', year: 'numeric' });

  // Filter schedules to only show ones assigned to the current user
  const mySchedules = useMemo(() => {
    if (!currentUser) return [];
    return schedules.filter(s => s.staffId === currentUser.id);
  }, [schedules, currentUser]);

  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1).getDay();

  const getSchedulesForDay = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return mySchedules.filter(s => s.date === dateStr);
  };

  const weekDays = language === 'TH' 
    ? ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const selectedDaySchedules = selectedDay ? getSchedulesForDay(selectedDay) : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">ตารางเวรของฉัน</h1>
          <p className="text-sm text-gray-500 font-medium">My Schedule Calendar</p>
        </div>
        <div className="w-12 h-12 bg-blue-100 text-[#00468B] rounded-2xl flex items-center justify-center shadow-sm">
          <Calendar size={24} />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden p-6">
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={() => { setCurrentDate(new Date(currentYear, currentMonth - 2, 1)); setSelectedDay(null); }}
            className="p-2 hover:bg-gray-50 rounded-xl transition-all border border-gray-100"
          >
            <ChevronLeft size={20} className="text-gray-500" />
          </button>
          <h2 className="text-lg font-black text-[#00468B] uppercase tracking-widest">{monthName}</h2>
          <button 
            onClick={() => { setCurrentDate(new Date(currentYear, currentMonth, 1)); setSelectedDay(null); }}
            className="p-2 hover:bg-gray-50 rounded-xl transition-all border border-gray-100"
          >
            <ChevronRight size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {/* Weekday Headers */}
          {weekDays.map(day => (
            <div key={day} className="text-center py-2">
              <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{day}</span>
            </div>
          ))}

          {/* Empty Cells for First Day Offset */}
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
             <div key={`empty-${i}`} className="p-2 rounded-xl bg-transparent"></div>
          ))}

          {/* Calendar Days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
             const day = i + 1;
             const daySchedules = getSchedulesForDay(day);
             const hasMorning = daySchedules.some(sc => sc.shift === 'Morning');
             const hasAfternoon = daySchedules.some(sc => sc.shift === 'Afternoon');
             const hasNight = daySchedules.some(sc => sc.shift === 'Night');
             const hasNightBeforeMorning = daySchedules.some(sc => sc.shift === 'NightBeforeMorning');
             
             // Check if today
             const today = new Date();
             const isToday = today.getDate() === day && today.getMonth() === currentMonth - 1 && today.getFullYear() === currentYear;
             const isSelected = selectedDay === day;
             const formSchedules = daySchedules.filter(sc => sc.formId);
             const isCompletedAll = formSchedules.length > 0 && formSchedules.every(sc => sc.status === 'Completed');
             const hasPendingForms = formSchedules.some(sc => sc.status === 'Pending');

             return (
               <button 
                 key={day} 
                 onClick={() => setSelectedDay(day)}
                 className={`min-h-[60px] md:min-h-[80px] p-1.5 md:p-2 rounded-xl border flex flex-col items-center justify-start transition-all relative active:scale-95
                   ${isSelected ? 'bg-[#00468B] border-[#00468B] shadow-md ring-2 ring-blue-200' : isToday ? 'bg-blue-50 border-blue-200' : 'bg-gray-50/50 border-gray-100 hover:border-blue-300'}
                 `}
               >
                 <span className={`text-sm font-black mb-1 ${isSelected ? 'text-white' : isToday ? 'text-[#00468B]' : 'text-gray-600'}`}>
                   {day}
                 </span>
                 
                 <div className="flex flex-wrap justify-center gap-1 mt-1">
                    {hasMorning && <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-orange-400'}`}></div>}
                    {hasAfternoon && <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-400'}`}></div>}
                    {hasNight && <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-500'}`}></div>}
                    {hasNightBeforeMorning && <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-green-500'}`}></div>}
                 </div>

                 {isCompletedAll && (
                   <div className={`absolute top-1 right-1 ${isSelected ? 'text-white/80' : 'text-green-500'}`}>
                     <CheckCircle size={10} className="md:w-3 md:h-3" />
                   </div>
                 )}
                 {hasPendingForms && (
                   <div className={`absolute top-1 right-1 ${isSelected ? 'text-white/80' : 'text-amber-500'}`}>
                     <Info size={10} className="md:w-3 md:h-3" />
                   </div>
                 )}
               </button>
             )
          })}
        </div>
      </div>

      {/* Selected Day Details */}
      {selectedDay && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 animate-in slide-in-from-bottom-2">
          <h3 className="text-base font-black text-[#00468B] mb-4">
             วันที่ {selectedDay} {monthName}
          </h3>
          
          {selectedDaySchedules.length === 0 ? (
            <div className="text-center py-6 bg-gray-50 rounded-2xl">
              <p className="text-gray-500 font-medium">ไม่มีเวรในวันนี้</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDaySchedules.map(schedule => {
                const form = forms.find(f => f.id === schedule.formId);
                const isCompleted = schedule.status === 'Completed';

                return (
                  <div key={schedule.id} className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                    isCompleted ? 'bg-green-50/30 border-green-100' : 'bg-gray-50/50 border-gray-100'
                  }`}>
                    <div className="flex items-start gap-4">
                      <div className={`p-2 shrink-0 rounded-xl ${isCompleted ? 'bg-green-100 text-green-600' : 'bg-white text-gray-500 shadow-sm border border-gray-100'}`}>
                        {isCompleted ? <CheckCircle size={20} /> : <Info size={20} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest ${
                            schedule.shift === 'Morning' ? 'bg-orange-100 text-orange-700' :
                            schedule.shift === 'Afternoon' ? 'bg-blue-100 text-blue-700' :
                            schedule.shift === 'Night' ? 'bg-indigo-100 text-indigo-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {schedule.shift}
                          </span>
                          {schedule.formId && (
                            <span className={isCompleted ? 'text-xs font-bold text-green-600' : 'text-xs font-bold text-amber-600'}>
                              {isCompleted ? 'Completed' : 'Pending'}
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-gray-800 text-sm">{schedule.formId ? (form?.title || 'Unknown Form') : 'เข้าเวรปกติ (Shift Only)'}</h4>
                        {schedule.location && (
                          <div className="flex items-center text-xs font-medium text-gray-500 mt-1">
                            <MapPin size={12} className="mr-1" />
                            {schedule.location}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">สัญลักษณ์เวร (Shift Legend)</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-orange-400"></div>
            <span className="text-sm font-bold text-gray-700">{t.morning}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-blue-400"></div>
            <span className="text-sm font-bold text-gray-700">{t.afternoon}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
            <span className="text-sm font-bold text-gray-700">{t.night}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-sm font-bold text-gray-700">{t.nightBeforeMorning}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MySchedule;
