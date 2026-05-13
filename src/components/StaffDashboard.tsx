import React, { useState, useRef } from 'react';
import { useApp } from '../AppContext';
import { 
  ClipboardCheck, 
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
  Printer
} from 'lucide-react';
import type { Schedule, DynamicForm, Submission } from '../types';
import { translations } from '../i18n';

const StaffDashboard: React.FC = () => {
  const { currentUser, getStaffSchedule, forms, submitForm, language } = useApp();
  const t = translations[language];
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

  const handlePrintHandover = () => {
    window.print();
  };

  if (activeSchedule) {
    const form = forms.find(f => f.id === activeSchedule.formId);
    if (!form) return <div>Form not found</div>;

    return <FormRenderer form={form} schedule={activeSchedule} onCancel={() => setActiveSchedule(null)} onSubmit={handleFinishSubmission} />;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 print:p-0">
      {showSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#00468B]/95 backdrop-blur-md animate-in fade-in duration-300">
           <div className="text-center text-white space-y-6 animate-in zoom-in-95 duration-500 delay-100">
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto shadow-2xl">
                 <PartyPopper size={48} className="text-blue-100" />
              </div>
              <h2 className="text-4xl font-black">Report Certified!</h2>
              <p className="text-blue-100 font-bold opacity-80 uppercase tracking-widest">Compliance data successfully recorded in clinical log.</p>
              <div className="pt-8">
                 <CheckCircle2 size={64} className="mx-auto text-green-400 animate-bounce" />
              </div>
           </div>
        </div>
      )}

      <div className="bg-[#00468B] rounded-3xl p-10 text-white shadow-xl relative overflow-hidden print:hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Hello, {currentUser?.name.split(' ')[0]}</h1>
            <p className="text-blue-100 font-medium">Ready to perform medical inspections. Select a protocol below to begin.</p>
          </div>
          <button 
            onClick={handlePrintHandover}
            className="bg-white/10 hover:bg-white/20 border border-white/20 px-6 py-3 rounded-2xl flex items-center space-x-3 transition-all font-bold text-sm"
          >
            <Printer size={18} />
            <span>{t.printHandover}</span>
          </button>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-20 -mt-20"></div>
      </div>

      {/* Primary Section: Protocol Library (Grid) as requested */}
      <div className="space-y-8 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
          <h3 className="text-sm font-black text-[#00468B] uppercase tracking-[0.2em] flex items-center">
            <FileText size={16} className="mr-2" />
            {t.formProtocol} Library
          </h3>
          <div className="relative flex-1 max-w-md">
             <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
             <input 
              type="text" 
              placeholder="Quick search protocol..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border-2 border-gray-50 rounded-xl pl-12 pr-4 py-2.5 text-xs font-bold focus:border-blue-500 outline-none transition-all"
             />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
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
              className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group text-left flex flex-col h-full"
            >
              <div className="w-12 h-12 rounded-xl bg-gray-50 text-gray-400 group-hover:bg-blue-50 group-hover:text-[#00468B] flex items-center justify-center mb-4 transition-colors">
                <FileText size={24} />
              </div>
              <h4 className="font-bold text-gray-700 text-xs leading-relaxed group-hover:text-[#00468B] transition-colors mb-2 flex-1">{f.title}</h4>
              <div className="flex items-center text-[9px] font-black text-gray-300 uppercase tracking-tighter">
                <span>{f.questions.length} Points</span>
                <ChevronRight size={10} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Secondary Section: Assigned Duties */}
      {mySchedules.length > 0 && (
        <div className="space-y-6 pt-12 border-t border-gray-100">
          <h3 className="text-sm font-black text-[#00468B] uppercase tracking-[0.2em] px-2 flex items-center print:text-black">
            <Clock size={16} className="mr-2 print:hidden" />
            {t.upcomingAssignments}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mySchedules.map(s => {
              const form = forms.find(f => f.id === s.formId);
              const isCompleted = s.status === 'Completed';
              return (
                <div key={s.id} className={`p-6 border flex items-center justify-between transition-all ${
                  isCompleted 
                    ? 'bg-white border-gray-100 rounded-2xl hover:shadow-md' 
                    : 'bg-white border-blue-100 rounded-2xl shadow-sm border-2'
                } print:border-gray-200 print:shadow-none print:rounded-none`}>
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isCompleted ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-[#00468B]'}`}>
                      {isCompleted ? <CheckCircle2 size={24} /> : <ClipboardCheck size={24} />}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 text-sm line-clamp-1">{form?.title}</h4>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{s.shift} Shift | {s.location || 'N/A'}</p>
                    </div>
                  </div>
                  {!isCompleted && (
                    <button 
                      onClick={() => setActiveSchedule(s)}
                      className="text-[10px] font-black uppercase tracking-widest text-[#00468B] bg-blue-50 px-4 py-2 rounded-lg hover:bg-[#00468B] hover:text-white transition-all print:hidden"
                    >
                      {t.startTask}
                    </button>
                  )}
                  {isCompleted && (
                    <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-1 rounded uppercase tracking-tighter hidden print:inline-block">Handed Over</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

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

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      setHasSigned(false);
    }
  };

  const handleCanvasAction = () => {
     setHasSigned(true);
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
    <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-300 mb-20">
      <div className="bg-[#00468B] p-10 text-white relative">
        <div className="relative z-10">
          <button onClick={onCancel} className="text-blue-200 hover:text-white mb-6 flex items-center text-sm font-bold transition-colors">
            <ChevronLeft size={18} /> {t.backToDashboard}
          </button>
          <h2 className="text-3xl font-bold">{form.title}</h2>
          <p className="text-blue-100 font-medium mt-2">{form.description}</p>
        </div>
        <div className="absolute top-0 right-0 p-10 opacity-10">
           <ShieldCheck size={120} />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-10 space-y-10">
        {form.questions.map(q => (
          <div key={q.id} className="space-y-4 group">
            <label className="block text-sm font-black text-[#00468B] uppercase tracking-wider group-focus-within:text-blue-600 transition-colors">
              {q.label} {q.required && <span className="text-red-500">*</span>}
            </label>
            
            {q.type === 'date' && (
              <input 
                type="date" 
                required={q.required}
                className="w-full border-2 border-gray-50 rounded-2xl p-4 focus:border-blue-500 focus:bg-white bg-gray-50 outline-none transition-all font-medium"
                onChange={(e) => setFormData({...formData, [q.id]: e.target.value})}
              />
            )}

            {q.type === 'select' && (
              <select 
                required={q.required}
                className="w-full border-2 border-gray-50 rounded-2xl p-4 focus:border-blue-500 focus:bg-white bg-gray-50 outline-none transition-all font-medium"
                onChange={(e) => setFormData({...formData, [q.id]: e.target.value})}
              >
                <option value="">Select an option...</option>
                {q.options?.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            )}

            {q.type === 'text' && (
              <input 
                type="text" 
                required={q.required}
                placeholder="Type your response..."
                className="w-full border-2 border-gray-50 rounded-2xl p-4 focus:border-blue-500 focus:bg-white bg-gray-50 outline-none transition-all font-medium"
                onChange={(e) => setFormData({...formData, [q.id]: e.target.value})}
              />
            )}

            {q.type === 'number' && (
              <input 
                type="number" 
                required={q.required}
                placeholder="0.00"
                className="w-full border-2 border-gray-50 rounded-2xl p-4 focus:border-blue-500 focus:bg-white bg-gray-50 outline-none transition-all font-medium"
                onChange={(e) => setFormData({...formData, [q.id]: e.target.value})}
              />
            )}

            {q.type === 'yesno' && (
              <div className="grid grid-cols-2 gap-4">
                {['Pass', 'Fail'].map(opt => (
                  <label key={opt} className={`flex items-center justify-center p-4 rounded-2xl border-2 cursor-pointer transition-all font-bold ${
                    formData[q.id] === opt 
                      ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' 
                      : 'bg-gray-50 border-gray-50 text-gray-500 hover:border-gray-200'
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
              <div className="bg-gray-50 p-6 rounded-2xl border-2 border-gray-50 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  {['Normal', 'Alert'].map(opt => (
                    <label key={opt} className={`flex items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all font-bold ${
                      formData[q.id] === opt 
                        ? (opt === 'Normal' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-red-50 border-red-500 text-red-700')
                        : 'bg-white border-white text-gray-500 hover:border-gray-100 shadow-sm'
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
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">{t.clinicalEvidence}</p>
                    <button 
                      type="button"
                      onClick={() => setPhotos([...photos, 'mock-photo-url'])}
                      className="flex items-center space-x-3 bg-white border-2 border-dashed border-gray-200 p-5 rounded-2xl text-gray-400 hover:text-blue-500 hover:border-blue-200 transition-all w-full justify-center group/btn"
                    >
                      <Camera size={24} className="group-hover/btn:scale-110 transition-transform" />
                      <span className="font-bold">{photos.length > 0 ? `${photos.length} Photo(s) Attached` : 'Capture Clinical Evidence'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        <div className="space-y-6">
           <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-[#00468B] uppercase tracking-widest flex items-center">
                 <ShieldAlert size={16} className="mr-2" />
                 {t.digitalSignature}
              </h4>
              <button 
                type="button" 
                onClick={clearSignature}
                className="text-[10px] font-bold text-gray-400 hover:text-red-500 transition-colors flex items-center"
              >
                <Eraser size={12} className="mr-1" />
                {t.clearSignature}
              </button>
           </div>
           
           <div className="relative bg-gray-50 rounded-3xl border-2 border-gray-100 overflow-hidden h-40 group/sig">
              <canvas 
                ref={canvasRef}
                className="absolute inset-0 w-full h-full cursor-crosshair"
                onMouseDown={handleCanvasAction}
                onTouchStart={handleCanvasAction}
              ></canvas>
              {!hasSigned && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-300">
                   <p className="text-xs font-bold uppercase tracking-widest">{t.signToConfirm}</p>
                </div>
              )}
           </div>
        </div>

        <div className="flex gap-4 pt-8 border-t border-gray-100">
          <button 
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 px-8 py-4 border-2 border-gray-100 rounded-2xl text-gray-500 font-bold hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button 
            type="submit"
            disabled={isSubmitting || !hasSigned}
            className="flex-[2] px-8 py-4 bg-[#00468B] text-white rounded-2xl font-black hover:bg-[#003569] transition-all shadow-xl shadow-blue-900/10 active:scale-95 flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center"><Clock size={20} className="animate-spin mr-2" /> {t.processing}</span>
            ) : (
              <span>{t.confirmSubmit}</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StaffDashboard;