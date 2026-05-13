import React, { useState } from 'react';
import { useApp } from '../AppContext';
import { 
  Calendar as CalendarIcon, 
  ChevronRight,
  Trash2,
  Plus,
  Repeat
} from 'lucide-react';
import { translations } from '../i18n';
import type { Schedule, Shift } from '../types';

const Scheduler: React.FC = () => {
  const { users, forms, addSchedule, schedules, deleteSchedule, language } = useApp();
  const t = translations[language];
  const staff = users.filter(u => u.role === 'STAFF');
  const admins = users.filter(u => u.role === 'ADMIN');

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [isBulk, setIsBulk] = useState(false);
  
  const [shift, setShift] = useState<Shift>('Morning');
  const [staffId, setStaffId] = useState('');
  const [formId, setFormId] = useState('');
  const [location, setLocation] = useState('');
  const [supervisorId, setSupervisorId] = useState(admins[0]?.id || '');

  const handleSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffId || !formId || !supervisorId) return alert('Please fill all required fields');

    if (isBulk) {
      const start = new Date(date);
      const end = new Date(endDate);
      if (end < start) return alert('End date must be after start date');

      const batch: Schedule[] = [];
      const current = new Date(start);
      while (current <= end) {
        batch.push({
          id: Math.random().toString(36).substr(2, 9),
          date: current.toISOString().split('T')[0],
          shift,
          staffId,
          formId,
          location,
          supervisorId,
          status: 'Pending'
        });
        current.setDate(current.getDate() + 1);
      }
      addSchedule(batch);
      alert(`Bulk Assignment: ${batch.length} shifts scheduled.`);
    } else {
      const newSchedule: Schedule = {
        id: Math.random().toString(36).substr(2, 9),
        date,
        shift,
        staffId,
        formId,
        location,
        supervisorId,
        status: 'Pending'
      };
      addSchedule(newSchedule);
      alert('Assignment Scheduled Successfully');
    }
    setLocation('');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">{t.scheduling}</h1>
        <p className="text-sm text-gray-500 font-medium">Assign compliance tasks and medical inspections to personnel</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <form onSubmit={handleSchedule} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6 sticky top-6">
            <div className="flex items-center justify-between border-b border-gray-50 pb-4">
               <h3 className="text-sm font-black text-[#00468B] uppercase tracking-widest flex items-center">
                  <Plus size={16} className="mr-2" />
                  Parameters
               </h3>
               <button 
                type="button"
                onClick={() => setIsBulk(!isBulk)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  isBulk ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                }`}
               >
                 <Repeat size={12} />
                 <span>Bulk Mode</span>
               </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{isBulk ? 'Start Date' : 'Effective Date'}</label>
                  <input 
                    type="date" 
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full border-2 border-gray-50 rounded-xl p-3 focus:border-blue-500 bg-gray-50 font-bold text-gray-700 outline-none transition-all"
                  />
                </div>
                {isBulk && (
                  <div className="animate-in slide-in-from-top-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">End Date</label>
                    <input 
                      type="date" 
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full border-2 border-gray-50 rounded-xl p-3 focus:border-blue-500 bg-gray-50 font-bold text-gray-700 outline-none transition-all"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Shift Rotation</label>
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
                      {s}
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
                  <option value="">Select Personnel...</option>
                  {staff.map(u => <option key={u.id} value={u.id}>{u.name} (ID: {u.employeeId})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Inspection Protocol</label>
                <select 
                  value={formId}
                  onChange={(e) => setFormId(e.target.value)}
                  className="w-full border-2 border-gray-50 rounded-xl p-3 bg-gray-50 font-bold text-gray-700 outline-none focus:border-blue-500 transition-all appearance-none"
                >
                  <option value="">Select Form...</option>
                  {forms.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{t.locationRoom}</label>
                <input 
                  type="text" 
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Room 402, CT Room"
                  className="w-full border-2 border-gray-50 rounded-xl p-3 bg-gray-50 font-bold text-gray-700 outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Verification Supervisor</label>
                <select 
                  value={supervisorId}
                  onChange={(e) => setSupervisorId(e.target.value)}
                  className="w-full border-2 border-gray-50 rounded-xl p-3 bg-gray-50 font-bold text-gray-700 outline-none focus:border-blue-500 transition-all appearance-none"
                >
                  {admins.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-[#00468B] text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#003569] transition-all shadow-xl shadow-blue-900/10 active:scale-95 mt-4"
            >
              {t.confirmAssignment}
            </button>
          </form>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-8 border-b border-gray-50 flex items-center justify-between">
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">{t.upcomingAssignments}</h3>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">{schedules.length} Active Duties</span>
            </div>
            <div className="divide-y divide-gray-50 max-h-[800px] overflow-y-auto">
              {[...schedules].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(s => {
                const staffMember = users.find(u => u.id === s.staffId);
                const form = forms.find(f => f.id === s.formId);
                return (
                  <div key={s.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-all group">
                    <div className="flex items-center space-x-5">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xs ${
                        s.shift === 'Morning' ? 'bg-orange-50 text-orange-600' : 
                        s.shift === 'Afternoon' ? 'bg-blue-50 text-blue-600' : 'bg-indigo-50 text-indigo-600'
                      }`}>
                        {s.shift.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800 group-hover:text-[#00468B] transition-colors">{staffMember?.name}</p>
                        <div className="flex items-center text-[11px] text-gray-400 font-bold uppercase tracking-tighter mt-0.5">
                          <span className="text-blue-500">{form?.title}</span>
                          <span className="mx-2 opacity-30">|</span>
                          <span className="text-gray-500">{s.location || 'No Location'}</span>
                          <span className="mx-2 opacity-30">|</span>
                          <span>{s.date}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                        s.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                      }`}>
                        {s.status}
                      </span>
                      <button 
                        onClick={() => {
                          if (confirm('Are you sure you want to cancel this assignment?')) {
                            deleteSchedule(s.id);
                          }
                        }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={16} />
                      </button>
                      <ChevronRight size={16} className="text-gray-200 group-hover:text-gray-400" />
                    </div>
                  </div>
                );
              })}
              {schedules.length === 0 && (
                <div className="p-20 text-center flex flex-col items-center justify-center text-gray-300">
                  <CalendarIcon size={48} className="mb-4 opacity-10" />
                  <p className="font-bold uppercase tracking-widest text-xs">No Scheduled Duties</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Scheduler;