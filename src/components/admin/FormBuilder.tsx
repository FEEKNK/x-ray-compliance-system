import React, { useState } from 'react';
import { useForms, useAddForm, useUpdateForm, useDeleteForm } from '../../hooks/queries';
import { useApp } from '../../AppContext';
import { Plus, Trash2, Save, ChevronRight, Edit3, X } from 'lucide-react';
import { translations } from '../../i18n';
import type { QuestionBlock, DynamicForm } from '../../types';

const FormBuilder: React.FC = () => {
  const { language, settings } = useApp();
  const { mutate: addForm } = useAddForm();
  const { mutate: updateForm } = useUpdateForm();
  const { mutate: deleteForm } = useDeleteForm();
  const { data: forms = [] } = useForms();
  const t = translations[language];
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState<string>(settings?.departments?.[0] || 'IMAGING');
  const [questions, setQuestions] = useState<QuestionBlock[]>([]);
  const [selectedForm, setSelectedForm] = useState<DynamicForm | null>(null);
  const [filterDepartment, setFilterDepartment] = useState<string>('ALL');

  const filteredForms = forms.filter(f => filterDepartment === 'ALL' || (f.department || 'IMAGING') === filterDepartment);

  const addQuestion = () => {
    const newQ: QuestionBlock = {
      id: crypto.randomUUID(),
      label: '',
      type: 'text',
      required: true
    };
    setQuestions([...questions, newQ]);
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const updateQuestionState = (id: string, updates: Partial<QuestionBlock>) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const handleSave = () => {
    if (!title) return alert('Please enter a form title');
    
    if (selectedForm) {
      // Update existing
      const updated: DynamicForm = {
        ...selectedForm,
        title,
        description,
        department,
        questions
      };
      updateForm(updated);
      alert('Inspection Form Updated Successfully');
    } else {
      // Create new
      const newForm: DynamicForm = {
        id: `f-${crypto.randomUUID()}`,
        title,
        description,
        department,
        questions,
        isActive: true,
        createdAt: new Date().toISOString()
      };
      addForm(newForm);
      alert('Inspection Form Published Successfully');
    }
    
    // Clear state
    setSelectedForm(null);
    setTitle('');
    setDescription('');
    setDepartment('IMAGING');
    setQuestions([]);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-800">{t.formBuilder}</h1>
          <p className="text-lg text-gray-500 font-medium">Create and manage digital compliance checklists</p>
        </div>
        <button 
          onClick={handleSave}
          className="bg-[#00468B] text-white px-8 py-3 rounded-xl font-bold flex items-center space-x-2 hover:bg-[#003569] transition-all shadow-lg active:scale-95"
        >
          {selectedForm ? <Edit3 size={20} /> : <Save size={20} />}
          <span>{selectedForm ? 'Update Protocol' : 'Publish Form'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
           <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-6">
              <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                 <h3 className="text-base font-black text-gray-400 uppercase tracking-widest">Library ({filteredForms.length})</h3>
                 <button onClick={() => {
                   setSelectedForm(null);
                   setTitle('');
                   setDescription('');
                   setDepartment('IMAGING');
                   setQuestions([]);
                 }} className="p-1.5 rounded-lg hover:bg-white text-[#00468B] transition-colors">
                    <Plus size={16} />
                 </button>
              </div>
              <div className="p-3 border-b border-gray-50 bg-white">
                <select 
                  value={filterDepartment} 
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  className="w-full text-base font-bold text-gray-600 bg-gray-50 border border-gray-100 rounded-lg p-4 outline-none focus:border-[#00468B] transition-all"
                >
                  <option value="ALL">All Departments (ทั้งหมด)</option>
                  {(settings?.departments || []).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="divide-y divide-gray-50 max-h-[70vh] overflow-y-auto">
                 {filteredForms.map(f => (
                   <div 
                    key={f.id} 
                    onClick={() => {
                      setSelectedForm(f);
                      setTitle(f.title);
                      setDescription(f.description);
                      setDepartment(f.department || 'IMAGING');
                      setQuestions(f.questions);
                    }}
                    className={`p-4 flex items-center justify-between cursor-pointer transition-all group ${selectedForm?.id === f.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                   >
                      <div className="flex-1 min-w-0 mr-2">
                         <p className={`text-base font-bold truncate ${selectedForm?.id === f.id ? 'text-[#00468B]' : 'text-gray-700'}`}>{f.title}</p>
                         <p className="text-base text-gray-400 font-medium uppercase tracking-tighter">{f.department || 'IMAGING'} | {f.questions.length} fields</p>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete form "${f.title}"?`)) {
                              deleteForm(f.id);
                              if (selectedForm?.id === f.id) {
                                setSelectedForm(null);
                                setTitle('');
                                setDescription('');
                                setDepartment('IMAGING');
                                setQuestions([]);
                              }
                            }
                          }}
                          className="p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                        <ChevronRight size={14} className={selectedForm?.id === f.id ? 'text-[#00468B]' : 'text-gray-200'} />
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
            <h3 className="text-lg font-black text-gray-400 uppercase tracking-widest">General Information</h3>
            <div className="grid grid-cols-1 gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-base font-bold text-[#00468B] uppercase mb-2">Form Title</label>
                  <input 
                    type="text" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Daily MRI Safety Check"
                    className="w-full border-2 border-gray-50 rounded-xl p-5 text-2xl font-bold focus:border-blue-500 bg-gray-50 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-base font-bold text-[#00468B] uppercase mb-2">Department</label>
                  <div className="flex flex-wrap gap-2">
                    {(settings?.departments || []).map(d => (
                      <button
                        key={d}
                        onClick={() => setDepartment(d)}
                        className={`px-5 py-4 rounded-xl text-base font-black uppercase tracking-widest transition-all ${
                          department === d ? 'bg-[#00468B] text-white shadow-lg' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-base font-bold text-[#00468B] uppercase mb-2">Instructions / Description</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide guidance for the staff member..."
                  className="w-full border-2 border-gray-50 rounded-xl p-5 h-32 text-lg focus:border-blue-500 bg-gray-50 outline-none transition-all font-medium"
                ></textarea>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-black text-gray-400 uppercase tracking-widest px-2">Question Blocks</h3>
            {questions.map((q, index) => (
              <div key={q.id} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 relative group animate-in slide-in-from-top-2">
                <button 
                  onClick={() => removeQuestion(q.id)}
                  className="absolute top-6 right-6 text-gray-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={20} />
                </button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="md:col-span-2">
                    <div className="flex items-center space-x-2 mb-2">
                       <span className="w-8 h-8 rounded-full bg-blue-100 text-[#00468B] flex items-center justify-center text-base font-black">{index + 1}</span>
                       <label className="block text-base font-black text-[#00468B] uppercase tracking-wider">Field Label</label>
                    </div>
                    <input 
                      type="text" 
                      value={q.label}
                      onChange={(e) => updateQuestionState(q.id, { label: e.target.value })}
                      placeholder="e.g., Is the backup power system functional?"
                      className="w-full border-b-2 border-gray-50 py-4 text-lg text-gray-800 font-bold focus:border-blue-500 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-base font-bold text-gray-400 uppercase mb-2 tracking-widest">Input Type</label>
                    <select 
                      value={q.type}
                      onChange={(e) => updateQuestionState(q.id, { type: e.target.value as QuestionBlock['type'] })}
                      className="w-full border-2 border-gray-50 rounded-xl p-4 text-lg bg-gray-50 font-bold text-gray-700 outline-none focus:border-blue-500 transition-all"
                    >
                      <option value="text">Short Text</option>
                      <option value="number">Numeric Value</option>
                      <option value="date">Short Date</option>
                      <option value="select">Dropdown / Select</option>
                      <option value="yesno">Pass / Fail Switch</option>
                      <option value="composite">Medical Status + Photo</option>
                    </select>
                  </div>

                  {q.type === 'select' && (
                    <div className="md:col-span-2 space-y-3 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                      <label className="block text-base font-bold text-[#00468B] uppercase tracking-widest">Dropdown Options</label>
                      
                      <div className="space-y-2">
                        {(q.options || []).map((opt, optIndex) => (
                          <div key={optIndex} className="flex items-center space-x-2">
                            <input 
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const newOpts = [...(q.options || [])];
                                newOpts[optIndex] = e.target.value;
                                updateQuestionState(q.id, { options: newOpts });
                              }}
                              className="flex-1 border-2 border-gray-100 rounded-lg p-4 text-lg font-bold text-gray-700 outline-none focus:border-[#00468B] transition-all"
                              placeholder={`Option ${optIndex + 1}`}
                            />
                            <label className="flex items-center space-x-2 shrink-0 cursor-pointer group/failopt bg-white border-2 border-gray-100 rounded-lg px-3 hover:border-red-200 transition-all">
                              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${q.failOptions?.includes(opt) ? 'bg-red-500 border-red-500' : 'border-gray-300 group-hover/failopt:border-red-400'}`}>
                                {q.failOptions?.includes(opt) && <Plus size={10} className="text-white rotate-45" />}
                              </div>
                              <input 
                                type="checkbox"
                                className="hidden"
                                checked={q.failOptions?.includes(opt) || false}
                                onChange={(e) => {
                                  const currentFails = q.failOptions || [];
                                  if (e.target.checked) {
                                    updateQuestionState(q.id, { failOptions: [...currentFails, opt] });
                                  } else {
                                    updateQuestionState(q.id, { failOptions: currentFails.filter(f => f !== opt) });
                                  }
                                }}
                              />
                              <span className="text-xs font-bold text-gray-500 group-hover/failopt:text-red-500">Fail</span>
                            </label>
                            <button
                              onClick={() => {
                                const newOpts = (q.options || []).filter((_, i) => i !== optIndex);
                                updateQuestionState(q.id, { options: newOpts });
                                if (q.failOptions?.includes(opt)) {
                                  updateQuestionState(q.id, { failOptions: q.failOptions.filter(f => f !== opt) });
                                }
                              }}
                              className="w-10 h-10 shrink-0 flex items-center justify-center rounded-lg text-red-400 bg-white border-2 border-gray-100 hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-all"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => updateQuestionState(q.id, { options: [...(q.options || []), `Option ${(q.options?.length || 0) + 1}`] })}
                        className="inline-flex items-center space-x-2 text-base font-bold text-[#00468B] bg-blue-50 px-5 py-3 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <Plus size={14} />
                        <span>Add Option</span>
                      </button>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-8 md:col-span-2 pt-2">
                    <label className="flex items-center space-x-3 cursor-pointer group/check">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${q.required ? 'bg-[#00468B] border-[#00468B]' : 'border-gray-200 group-hover/check:border-blue-400'}`}>
                        {q.required && <Plus size={14} className="text-white rotate-45" />}
                      </div>
                      <input 
                        type="checkbox" 
                        checked={q.required}
                        onChange={(e) => updateQuestionState(q.id, { required: e.target.checked })}
                        className="hidden"
                      />
                      <span className="text-lg font-bold text-gray-600">Required (บังคับกรอก)</span>
                    </label>

                    {(q.type === 'select' || q.type === 'yesno' || q.type === 'composite') && (
                      <label className="flex items-center space-x-3 cursor-pointer group/custom">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${q.allowCustomInput ? 'bg-orange-500 border-orange-500' : 'border-gray-200 group-hover/custom:border-orange-400'}`}>
                          {q.allowCustomInput && <Plus size={14} className="text-white rotate-45" />}
                        </div>
                        <input 
                          type="checkbox" 
                          checked={!!q.allowCustomInput}
                          onChange={(e) => updateQuestionState(q.id, { allowCustomInput: e.target.checked })}
                          className="hidden"
                        />
                        <span className="text-lg font-bold text-gray-600">Allow Custom Input (เปิดให้ระบุเอง)</span>
                      </label>
                    )}

                    {(q.type === 'select' || q.type === 'yesno' || q.type === 'composite') && q.allowCustomInput && (
                      <label className="flex items-center space-x-3 cursor-pointer group/alertcustom mt-2 sm:mt-0">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${q.alertOnCustomInput ? 'bg-red-500 border-red-500' : 'border-gray-200 group-hover/alertcustom:border-red-400'}`}>
                          {q.alertOnCustomInput && <Plus size={14} className="text-white rotate-45" />}
                        </div>
                        <input 
                          type="checkbox" 
                          checked={!!q.alertOnCustomInput}
                          onChange={(e) => updateQuestionState(q.id, { alertOnCustomInput: e.target.checked })}
                          className="hidden"
                        />
                        <span className="text-lg font-bold text-gray-600 text-red-600">⚠️ Alert on Custom Input (แจ้งเตือนถ้าระบุเอง)</span>
                      </label>
                    )}

                    <label className="flex items-center space-x-3 cursor-pointer group/alert mt-2 sm:mt-0">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${q.alertOnFail ? 'bg-red-500 border-red-500' : 'border-gray-200 group-hover/alert:border-red-400'}`}>
                        {q.alertOnFail && <Plus size={14} className="text-white rotate-45" />}
                      </div>
                      <input 
                        type="checkbox" 
                        checked={!!q.alertOnFail}
                        onChange={(e) => updateQuestionState(q.id, { alertOnFail: e.target.checked })}
                        className="hidden"
                      />
                      <span className="text-lg font-bold text-gray-600 text-red-600">
                        {q.type === 'select' ? '⚠️ Alert on Any Fails (เปิดแจ้งเตือนสำหรับข้อนี้)' : '⚠️ Alert on Fail (แจ้งเตือนเมื่อตอบ Fail)'}
                      </span>
                    </label>

                    {q.type === 'date' && (
                      <label className="flex items-center space-x-3 cursor-pointer group/autodate">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${q.config?.autoFillToday ? 'bg-indigo-500 border-indigo-500' : 'border-gray-200 group-hover/autodate:border-indigo-400'}`}>
                          {q.config?.autoFillToday && <Plus size={14} className="text-white rotate-45" />}
                        </div>
                        <input 
                          type="checkbox" 
                          checked={!!q.config?.autoFillToday}
                          onChange={(e) => updateQuestionState(q.id, { config: { ...q.config, autoFillToday: e.target.checked } })}
                          className="hidden"
                        />
                        <span className="text-lg font-bold text-gray-600">Auto-fill Current Date (ใช้วันที่ปัจจุบันอัตโนมัติ)</span>
                      </label>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <button 
              onClick={addQuestion}
              className="w-full py-6 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 flex items-center justify-center space-x-3 hover:border-[#00468B] hover:text-[#00468B] hover:bg-blue-50 transition-all group"
            >
              <Plus size={24} className="group-hover:scale-110 transition-transform" />
              <span className="font-bold text-lg uppercase tracking-widest">Add Inspection Field</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default FormBuilder;