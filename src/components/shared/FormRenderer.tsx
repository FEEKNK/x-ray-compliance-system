import React, { useState } from 'react';
import { useApp } from '../../AppContext';
import { api } from '../../api';
import { translations } from '../../i18n';
import type { DynamicForm, Schedule, Submission } from '../../types';
import { Clock, ChevronLeft, ShieldCheck, ChevronDown, X } from 'lucide-react';
import { getLocalTodayStr } from '../../utils/shiftTime';

export interface FormRendererProps {
  form: DynamicForm;
  schedule: Schedule;
  initialSubmission?: Submission;
  onCancel: () => void;
  onSubmit: (submission: Submission) => void;
}

export const FormRenderer: React.FC<FormRendererProps> = ({ form, schedule, initialSubmission, onCancel, onSubmit }) => {
  const { language } = useApp();
  const t = translations[language];
  const [existingSubmission, setExistingSubmission] = useState<Submission | null>(null);
  const [formData, setFormData] = useState<Record<string, string | number | boolean | string[]>>({});
  const [customModes, setCustomModes] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    if (initialSubmission) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExistingSubmission(initialSubmission);
      setFormData(initialSubmission.data);
      setIsLoading(false);
      return;
    }
    api.submissions.getByScheduleId(schedule.id)
      .then(sub => {
        setExistingSubmission(sub);
        setFormData(sub.data);
      })
      .catch(() => {
        // Pre-fill fields for new submissions
        const initialData: Record<string, string> = {};
        form.questions.forEach(q => {
          if (q.type === 'date' && q.config?.autoFillToday) {
            initialData[q.id] = getLocalTodayStr();
          }
        });
        setFormData(initialData);
      })
      .finally(() => setIsLoading(false));
  }, [schedule.id, form.questions, initialSubmission]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const finalFormData = { ...formData };

    const submission: Submission = {
      id: existingSubmission?.id || crypto.randomUUID(),
      scheduleId: schedule.id,
      staffId: schedule.staffId,
      formId: form.id,
      submittedAt: new Date().toISOString(),
      data: finalFormData,
      photos: []
    };
    
    // Call onSubmit which handles the API request
    onSubmit(submission);
    
    // The parent component should ideally handle resetting isSubmitting 
    // after the API call completes, but for now we reset it here.
    // If the parent unmounts this component on success, this setState might warn,
    // but the 800ms timeout had the same issue.
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <Clock size={40} className="text-gray-300 animate-spin" />
      </div>
    );
  }

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
             <p className="text-xs font-medium text-blue-100/70 truncate">{schedule.location || 'Clinical Area'}</p>
          </div>
        </div>
        <div className="w-10 h-10 rounded-full bg-blue-400/20 flex items-center justify-center shrink-0">
           <ShieldCheck size={20} className="text-blue-100" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit} id="compliance-form" className="p-6 md:p-10 space-y-12 pb-44">
          {form.questions.map((q, idx) => (
            <div key={q.id} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: `${idx * 50}ms` }}>
              <div className="flex items-start space-x-3">
                 <span className="w-6 h-6 rounded-lg bg-blue-50 text-[#00468B] flex items-center justify-center text-xs font-black shrink-0 mt-1">{idx + 1}</span>
                 <label className="block text-sm font-black text-gray-800 tracking-tight leading-relaxed">
                   {q.label} {q.required && <span className="text-red-500">*</span>}
                 </label>
              </div>
              
              <div className="pl-9">
                {q.type === 'date' && (
                  <div className="relative">
                    <input 
                      type="date" 
                      required={q.required}
                      className="w-full border-2 border-gray-100 rounded-2xl p-4 focus:border-[#00468B] focus:bg-white bg-white shadow-sm outline-none transition-all font-bold text-gray-700 uppercase"
                      value={String(formData[q.id] || '')}
                      onChange={(e) => setFormData({...formData, [q.id]: e.target.value})}
                    />
                  </div>
                )}

                {q.type === 'select' && (
                  <div className="space-y-2">
                    {!customModes[q.id] ? (
                      <div className="flex items-center space-x-2">
                        <div className="relative flex-1">
                          <select 
                            required={q.required && !customModes[q.id]}
                            className="w-full border-2 border-gray-100 rounded-2xl p-4 appearance-none focus:border-[#00468B] focus:bg-white bg-white shadow-sm outline-none transition-all font-bold text-gray-700"
                            value={String(formData[q.id] || '')}
                            onChange={(e) => setFormData({...formData, [q.id]: e.target.value})}
                          >
                            <option value="">Select option...</option>
                            {q.options?.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                          <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                        </div>
                        {q.allowCustomInput && (
                          <button 
                            type="button"
                            onClick={() => {
                              setCustomModes({...customModes, [q.id]: true});
                              setFormData({...formData, [q.id]: ''});
                            }}
                            className="px-4 py-4 shrink-0 rounded-2xl border-2 border-orange-200 text-orange-600 font-bold bg-orange-50 hover:bg-orange-100 transition-all whitespace-nowrap text-sm"
                          >
                            + ระบุเอง
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 animate-in fade-in zoom-in-95 duration-200">
                        <input 
                          type="text"
                          required={q.required}
                          autoFocus
                          placeholder="กรุณาระบุรายละเอียด..."
                          className="flex-1 border-2 border-orange-200 bg-orange-50/50 rounded-2xl p-4 focus:border-orange-500 focus:bg-white shadow-sm outline-none transition-all font-bold text-sm text-gray-700 placeholder-orange-300"
                          value={String(formData[q.id] || '')}
                          onChange={(e) => setFormData({...formData, [q.id]: e.target.value})}
                        />
                        <button 
                          type="button"
                          onClick={() => {
                            setCustomModes({...customModes, [q.id]: false});
                            setFormData({...formData, [q.id]: ''});
                          }}
                          className="w-14 h-[56px] shrink-0 flex items-center justify-center rounded-2xl border-2 border-gray-100 text-gray-400 bg-gray-50 hover:bg-gray-100 hover:text-gray-600 transition-all"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {q.type === 'text' && (
                  <input 
                    type="text" 
                    required={q.required}
                    placeholder="Enter observation..."
                    className="w-full border-2 border-gray-100 rounded-2xl p-4 focus:border-[#00468B] focus:bg-white bg-white shadow-sm outline-none transition-all font-bold text-gray-700"
                    value={String(formData[q.id] || '')}
                    onChange={(e) => setFormData({...formData, [q.id]: e.target.value})}
                  />
                )}

                {q.type === 'number' && (
                  <input 
                    type="number" 
                    step="any"
                    required={q.required}
                    placeholder="0.00"
                    className="w-full border-2 border-gray-100 rounded-2xl p-4 focus:border-[#00468B] focus:bg-white bg-white shadow-sm outline-none transition-all font-bold text-gray-700"
                    value={String(formData[q.id] ?? '')}
                    onChange={(e) => setFormData({...formData, [q.id]: e.target.value})}
                  />
                )}

                {q.type === 'yesno' && (
                  <div className="space-y-2">
                    {!customModes[q.id] ? (
                      <div className="flex items-center space-x-2">
                        <div className="grid grid-cols-2 gap-4 flex-1">
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
                                required={q.required && !customModes[q.id]}
                                className="hidden"
                                onChange={(e) => setFormData({...formData, [q.id]: e.target.value})}
                                checked={formData[q.id] === opt}
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                        {q.allowCustomInput && (
                          <button 
                            type="button"
                            onClick={() => {
                              setCustomModes({...customModes, [q.id]: true});
                              setFormData({...formData, [q.id]: ''});
                            }}
                            className="px-4 py-4 h-[62px] shrink-0 rounded-2xl border-2 border-orange-200 text-orange-600 font-bold bg-orange-50 hover:bg-orange-100 transition-all whitespace-nowrap text-sm"
                          >
                            + ระบุเอง
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 animate-in fade-in zoom-in-95 duration-200">
                        <input 
                          type="text"
                          required={q.required}
                          autoFocus
                          placeholder="กรุณาระบุรายละเอียด (Pass/Fail หรืออื่นๆ)..."
                          className="flex-1 border-2 border-orange-200 bg-orange-50/50 rounded-2xl p-4 focus:border-orange-500 focus:bg-white shadow-sm outline-none transition-all font-bold text-sm text-gray-700 placeholder-orange-300"
                          value={String(formData[q.id] || '')}
                          onChange={(e) => setFormData({...formData, [q.id]: e.target.value})}
                        />
                        <button 
                          type="button"
                          onClick={() => {
                            setCustomModes({...customModes, [q.id]: false});
                            setFormData({...formData, [q.id]: ''});
                          }}
                          className="w-14 h-[56px] shrink-0 flex items-center justify-center rounded-2xl border-2 border-gray-100 text-gray-400 bg-gray-50 hover:bg-gray-100 hover:text-gray-600 transition-all"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {q.type === 'composite' && (
                  <div className="bg-white p-6 rounded-3xl border-2 border-gray-100 shadow-sm space-y-6">
                    <div className="space-y-2">
                      {!customModes[q.id] ? (
                        <div className="flex items-center space-x-2">
                          <div className="grid grid-cols-2 gap-4 flex-1">
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
                                  required={q.required && !customModes[q.id]}
                                  className="hidden"
                                  onChange={(e) => setFormData({...formData, [q.id]: e.target.value})}
                                  checked={formData[q.id] === opt}
                                />
                                <span>{opt}</span>
                              </label>
                            ))}
                          </div>
                          {q.allowCustomInput && (
                            <button 
                              type="button"
                              onClick={() => {
                                setCustomModes({...customModes, [q.id]: true});
                                setFormData({...formData, [q.id]: ''});
                              }}
                              className="px-4 py-4 h-[54px] shrink-0 rounded-xl border-2 border-orange-200 text-orange-600 font-bold bg-orange-50 hover:bg-orange-100 transition-all whitespace-nowrap text-sm"
                            >
                              + ระบุเอง
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2 animate-in fade-in zoom-in-95 duration-200">
                          <input 
                            type="text"
                            required={q.required}
                            autoFocus
                            placeholder="กรุณาระบุรายละเอียดสถานะ..."
                            className="flex-1 border-2 border-orange-200 bg-orange-50/50 rounded-xl p-4 focus:border-orange-500 focus:bg-white shadow-sm outline-none transition-all font-bold text-sm text-gray-700 placeholder-orange-300"
                            value={String(formData[q.id] || '')}
                            onChange={(e) => setFormData({...formData, [q.id]: e.target.value})}
                          />
                          <button 
                            type="button"
                            onClick={() => {
                              setCustomModes({...customModes, [q.id]: false});
                              setFormData({...formData, [q.id]: ''});
                            }}
                            className="w-14 h-[54px] shrink-0 flex items-center justify-center rounded-xl border-2 border-gray-100 text-gray-400 bg-gray-50 hover:bg-gray-100 hover:text-gray-600 transition-all"
                          >
                            <X size={20} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Legacy auto-specify box for Fail/Alert or specific hardcoded keywords, kept for backward compatibility if customInput is off but needs notes */}
                {(!customModes[q.id] && (
                  q.label === 'อื่นๆ' ||
                  q.label.includes('(ระบุ)') || 
                  formData[q.id] === 'อื่นๆ' ||
                  formData[q.id] === 'Fail' ||
                  formData[q.id] === 'Alert'
                )) && (
                  <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center space-x-2 mb-2 px-1">
                       <span className="text-xs font-black text-orange-600 uppercase tracking-widest">Detail Required (กรุณาระบุรายละเอียด)</span>
                    </div>
                    <input 
                      type="text" 
                      placeholder={language === 'TH' ? 'ระบุจำนวน / เลขล็อค / หมายเหตุเพิ่มเติม...' : 'Specify amount / lock no / notes...'}
                      className="w-full border-2 border-orange-100 bg-orange-50/30 rounded-2xl p-4 focus:border-orange-400 focus:bg-white shadow-sm outline-none transition-all font-bold text-sm text-gray-700 placeholder-orange-300"
                      value={String(formData[`${q.id}_other`] || '')}
                      onChange={(e) => setFormData({...formData, [`${q.id}_other`]: e.target.value})}
                      required={q.required && !formData[q.id]}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}

        </form>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="shrink-0 p-6 bg-white border-t border-gray-100 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] z-20 flex gap-4">
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
            disabled={isSubmitting}
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
