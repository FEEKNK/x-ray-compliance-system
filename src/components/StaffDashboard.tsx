import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../AppContext';
import { 
  Clock, 
  Camera, 
  CheckCircle2, 
  ChevronLeft, 
  ShieldCheck, 
  FileText,
  Search,
  ChevronRight,
  ShieldAlert,
  PartyPopper,
  Eraser,
  ChevronDown
} from 'lucide-react';
import type { Schedule, DynamicForm, Submission } from '../types';
import { translations } from '../i18n';

const StaffDashboard: React.FC = () => {
  const { currentUser, getStaffSchedule, forms, submitForm } = useApp();
  const today = new Date().toISOString().split('T')[0];
  const mySchedules = currentUser ? getStaffSchedule(currentUser.id, today) : [];
  
  const [activeSchedule, setActiveSchedule] = useState<Schedule | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const handleFinishSubmission = (data: Submission) => {
    submitForm(data);
    setActiveSchedule(null);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  if (activeSchedule) {
    const form = forms.find(f => f.id === activeSchedule.formId);
    if (!form) return <div>Form not found</div>;

    return (
      <div className="fixed inset-0 z-[60] bg-white overflow-hidden flex flex-col animate-in slide-in-from-bottom-full duration-300">
         <FormRenderer 
          form={form} 
          schedule={activeSchedule} 
          onCancel={() => setActiveSchedule(null)} 
          onSubmit={handleFinishSubmission} 
         />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20">
      {showSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#00468B]/95 backdrop-blur-md animate-in fade-in duration-300">
           <div className="text-center text-white space-y-6 animate-in zoom-in-95 duration-500 delay-100">
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto shadow-2xl">
                 <PartyPopper size={48} className="text-blue-100" />
              </div>
              <h2 className="text-4xl font-black">Success!</h2>
              <p className="text-blue-100 font-bold opacity-80 uppercase tracking-widest px-8">Report Certified & Synchronized.</p>
              <div className="pt-8">
                 <CheckCircle2 size={64} className="mx-auto text-green-400 animate-bounce" />
              </div>
           </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="bg-white rounded-3xl p-8 md:p-10 border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden relative group">
        <div className="relative z-10 space-y-2">
          <h1 className="text-2xl md:text-3xl font-black text-gray-800 tracking-tight">Protocol Selection</h1>
          <p className="text-gray-500 font-medium">Ready to perform medical inspections. Select a system to audit.</p>
        </div>
        <div className="absolute top-0 right-0 p-10 opacity-5 -mr-10 -mt-10 group-hover:scale-110 transition-transform duration-700">
           <FileText size={160} />
        </div>
      </div>

      {/* Task Queue Section */}
      {mySchedules.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] px-2 flex items-center">
            <Clock size={14} className="mr-2" />
            Priority Queue ({mySchedules.filter(s => s.status === 'Pending').length})
          </h3>
          <div className="flex overflow-x-auto gap-4 px-2 pb-4 snap-x hide-scrollbar">
            {mySchedules.map(s => {
              const form = forms.find(f => f.id === s.formId);
              const isCompleted = s.status === 'Completed';
              return (
                <div 
                  key={s.id} 
                  className={`min-w-[280px] md:min-w-[320px] snap-start p-6 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                    isCompleted 
                      ? 'bg-gray-50 border-gray-100 opacity-60' 
                      : 'bg-white border-[#00468B]/10 shadow-lg shadow-blue-900/5'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                       <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${
                         s.shift === 'Morning' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'
                       }`}>{s.shift}</span>
                       {isCompleted && <CheckCircle2 className="text-green-500" size={16} />}
                    </div>
                    <h4 className="font-bold text-gray-800 text-lg leading-tight line-clamp-2">{form?.title}</h4>
                  </div>
                  
                  <div className="mt-8 pt-4 border-t border-gray-50 flex items-center justify-between">
                    <div className="flex items-center text-xs text-gray-400 font-bold">
                       <TrendingUpIcon className="mr-1" /> {s.location || 'N/A'}
                    </div>
                    {!isCompleted && (
                      <button 
                        onClick={() => setActiveSchedule(s)}
                        className="bg-[#00468B] text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all"
                      >
                        Audit Now
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Grid: All Forms */}
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2 border-b border-gray-100 pb-6">
          <div>
            <h3 className="text-xl font-black text-gray-800 tracking-tight">Machine Registry</h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Direct Access to all 28 Protocols</p>
          </div>
          <div className="relative flex-1 max-w-md w-full">
             <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
             <input 
              type="text" 
              placeholder="Filter machines or protocols..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold focus:border-[#00468B] focus:bg-white outline-none transition-all"
             />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-2">
          {forms.filter(f => f.title.toLowerCase().includes(searchTerm.toLowerCase())).map(f => (
            <button 
              key={f.id}
              onClick={() => {
                const manualSchedule: Schedule = {
                  id: `manual-${Math.random().toString(36).substr(2, 9)}`,
                  date: today,
                  shift: 'Morning',
                  staffId: currentUser?.id || '',
                  formId: f.id,
                  location: 'Ad-hoc Check',
                  supervisorId: '1',
                  status: 'Pending'
                };
                setActiveSchedule(manualSchedule);
              }}
              className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all group text-left flex items-center space-x-5 h-full relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/50 rounded-bl-[100px] -mr-8 -mt-8 group-hover:scale-125 transition-transform duration-500"></div>
              
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#00468B] group-hover:bg-[#00468B] group-hover:text-white flex items-center justify-center shrink-0 transition-all duration-300 relative z-10">
                <FileText size={28} />
              </div>
              
              <div className="relative z-10 flex-1 min-w-0">
                <h4 className="font-bold text-gray-800 text-sm leading-snug group-hover:text-[#00468B] transition-colors mb-1 truncate pr-4">{f.title}</h4>
                <div className="flex items-center space-x-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                   <span>{f.questions.length} Audit Points</span>
                   <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const TrendingUpIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
);

interface FormRendererProps {
  form: DynamicForm;
  schedule: Schedule;
  onCancel: () => void;
  onSubmit: (submission: Submission) => void;
}

const FormRenderer: React.FC<FormRendererProps> = ({ form, schedule, onCancel, onSubmit }) => {
  const { language } = useApp();
  const t = translations[language];
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasSigned, setHasSigned] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#00468B';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
      }
    }
  }, []);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    setHasSigned(true);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      const rect = canvas.getBoundingClientRect();
      const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
      const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      const rect = canvas.getBoundingClientRect();
      const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
      const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      setHasSigned(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasSigned) return alert(t.signToConfirm);
    setIsSubmitting(true);
    
    setTimeout(() => {
      const submission: Submission = {
        id: Math.random().toString(36).substr(2, 9),
        scheduleId: schedule.id,
        staffId: schedule.staffId,
        formId: form.id,
        submittedAt: new Date().toISOString(),
        data: formData,
        photos: photos
      };
      onSubmit(submission);
      setIsSubmitting(false);
    }, 800);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
      {/* Fixed App Bar */}
      <div className="bg-[#00468B] p-6 text-white shrink-0 shadow-lg z-20 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={onCancel} className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all">
            <ChevronLeft size={24} />
          </button>
          <div className="min-w-0">
             <h2 className="text-lg font-bold leading-tight truncate pr-4">{form.title}</h2>
             <p className="text-[10px] font-medium text-blue-100/70 truncate">{schedule.location || 'Clinical Area'}</p>
          </div>
        </div>
        <div className="w-10 h-10 rounded-full bg-blue-400/20 flex items-center justify-center shrink-0">
           <ShieldCheck size={20} className="text-blue-100" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit} id="compliance-form" className="p-6 md:p-10 space-y-12 pb-32">
          {form.questions.map((q, idx) => (
            <div key={q.id} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: `${idx * 50}ms` }}>
              <div className="flex items-start space-x-3">
                 <span className="w-6 h-6 rounded-lg bg-blue-50 text-[#00468B] flex items-center justify-center text-[10px] font-black shrink-0 mt-1">{idx + 1}</span>
                 <label className="block text-sm font-black text-gray-800 tracking-tight leading-relaxed">
                   {q.label} {q.required && <span className="text-red-500">*</span>}
                 </label>
              </div>
              
              <div className="pl-9">
                {q.type === 'date' && (
                  <input 
                    type="date" 
                    required={q.required}
                    className="w-full border-2 border-gray-100 rounded-2xl p-4 focus:border-[#00468B] focus:bg-white bg-white shadow-sm outline-none transition-all font-bold text-gray-700"
                    onChange={(e) => setFormData({...formData, [q.id]: e.target.value})}
                  />
                )}

                {q.type === 'select' && (
                  <div className="relative">
                    <select 
                      required={q.required}
                      className="w-full border-2 border-gray-100 rounded-2xl p-4 appearance-none focus:border-[#00468B] focus:bg-white bg-white shadow-sm outline-none transition-all font-bold text-gray-700"
                      onChange={(e) => setFormData({...formData, [q.id]: e.target.value})}
                    >
                      <option value="">Select option...</option>
                      {q.options?.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                  </div>
                )}

                {q.type === 'text' && (
                  <input 
                    type="text" 
                    required={q.required}
                    placeholder="Enter observation..."
                    className="w-full border-2 border-gray-100 rounded-2xl p-4 focus:border-[#00468B] focus:bg-white bg-white shadow-sm outline-none transition-all font-bold text-gray-700"
                    onChange={(e) => setFormData({...formData, [q.id]: e.target.value})}
                  />
                )}

                {q.type === 'number' && (
                  <input 
                    type="number" 
                    required={q.required}
                    placeholder="0.00"
                    className="w-full border-2 border-gray-100 rounded-2xl p-4 focus:border-[#00468B] focus:bg-white bg-white shadow-sm outline-none transition-all font-bold text-gray-700"
                    onChange={(e) => setFormData({...formData, [q.id]: e.target.value})}
                  />
                )}

                {q.type === 'yesno' && (
                  <div className="grid grid-cols-2 gap-4">
                    {['Pass', 'Fail'].map(opt => (
                      <label key={opt} className={`flex items-center justify-center p-5 rounded-2xl border-2 cursor-pointer transition-all font-black text-xs uppercase tracking-widest ${
                        formData[q.id] === opt 
                          ? (opt === 'Pass' ? 'bg-green-50 border-green-500 text-green-700 shadow-md' : 'bg-red-50 border-red-500 text-red-700 shadow-md')
                          : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200 shadow-sm'
                      }`}>
                        <input 
                          type="radio" 
                          name={q.id} 
                          value={opt}
                          required={q.required}
                          className="hidden"
                          onChange={(e) => setFormData({...formData, [q.id]: e.target.value})}
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {q.type === 'composite' && (
                  <div className="bg-white p-6 rounded-3xl border-2 border-gray-100 shadow-sm space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      {['Normal', 'Alert'].map(opt => (
                        <label key={opt} className={`flex items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all font-black text-xs uppercase tracking-widest ${
                          formData[q.id] === opt 
                            ? (opt === 'Normal' ? 'bg-green-50 border-green-500 text-green-700 shadow-md' : 'bg-red-50 border-red-500 text-red-700 shadow-md')
                            : 'bg-gray-50 border-gray-50 text-gray-400 hover:border-gray-100'
                        }`}>
                          <input 
                            type="radio" 
                            name={q.id} 
                            value={opt}
                            required={q.required}
                            className="hidden"
                            onChange={(e) => setFormData({...formData, [q.id]: e.target.value})}
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                    {q.config?.withPhoto && (
                      <div className="pt-2">
                        <button 
                          type="button"
                          onClick={() => setPhotos([...photos, 'mock-photo-url'])}
                          className="flex flex-col items-center justify-center bg-gray-50 border-2 border-dashed border-gray-200 p-8 rounded-2xl text-gray-400 hover:text-[#00468B] hover:border-[#00468B] hover:bg-blue-50 transition-all w-full group/btn"
                        >
                          <Camera size={32} className="group-hover/btn:scale-110 transition-transform mb-2" />
                          <span className="font-bold text-xs uppercase tracking-widest">{photos.length > 0 ? `${photos.length} Photo(s) Attached` : 'Attach Photo Proof'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Signature Pad Overhaul */}
          <div className="space-y-6 pt-10 border-t border-gray-100 animate-in fade-in duration-1000">
             <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-[#00468B] uppercase tracking-widest flex items-center">
                   <ShieldAlert size={16} className="mr-2" />
                   {t.digitalSignature}
                </h4>
                <button 
                  type="button" 
                  onClick={clearSignature}
                  className="text-[10px] font-black text-gray-400 hover:text-red-500 transition-colors flex items-center uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-full"
                >
                  <Eraser size={12} className="mr-1" />
                  {t.clearSignature}
                </button>
             </div>
             
             <div className="relative bg-white rounded-[32px] border-2 border-[#00468B]/10 overflow-hidden h-48 shadow-inner group/sig">
                <canvas 
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                ></canvas>
                {!hasSigned && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-gray-300">
                     <Edit3Icon className="mb-2 opacity-50" />
                     <p className="text-[10px] font-black uppercase tracking-[0.2em]">{t.signToConfirm}</p>
                  </div>
                )}
             </div>
          </div>
        </form>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-100 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] z-20 flex gap-4">
          <button 
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 px-8 py-4 border-2 border-gray-100 rounded-2xl text-gray-500 font-bold hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm uppercase tracking-widest"
          >
            Cancel
          </button>
          <button 
            type="submit"
            form="compliance-form"
            disabled={isSubmitting || !hasSigned}
            className="flex-[2] px-8 py-4 bg-[#00468B] text-white rounded-2xl font-black hover:bg-[#003569] transition-all shadow-xl shadow-blue-900/20 active:scale-95 flex items-center justify-center space-x-2 disabled:opacity-50 text-sm uppercase tracking-widest"
          >
            {isSubmitting ? (
              <span className="flex items-center"><Clock size={20} className="animate-spin mr-2" /> {t.processing}</span>
            ) : (
              <span>{t.confirmSubmit}</span>
            )}
          </button>
      </div>
    </div>
  );
};

const Edit3Icon = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
);

export default StaffDashboard;