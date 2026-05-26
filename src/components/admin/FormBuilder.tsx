import React, { useState } from 'react';
import { useApp } from '../../AppContext';
import { Plus, Trash2, Save, FileText, Image as ImageIcon, ChevronRight, Edit3 } from 'lucide-react';
import { translations } from '../../i18n';
import type { QuestionBlock, DynamicForm } from '../../types';

const FormBuilder: React.FC = () => {
  const { forms, addForm, updateForm, deleteForm, language } = useApp();
  const t = translations[language];
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState<'IMAGING' | 'MRI'>('IMAGING');
  const [questions, setQuestions] = useState<QuestionBlock[]>([]);
  const [selectedForm, setSelectedForm] = useState<DynamicForm | null>(null);

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
          <h1 className="text-2xl font-bold text-gray-800">{t.formBuilder}</h1>
          <p className="text-sm text-gray-500 font-medium">Create and manage digital compliance checklists</p>
        </div>
        <button 
          onClick={handleSave}
          className="bg-[#00468B] text-white px-8 py-3 rounded-xl font-bold flex items-center space-x-2 hover:bg-[#003569] transition-all shadow-lg active:scale-95"
        >
          {selectedForm ? <Edit3 size={20} /> : <Save size={20} />}
          <span>{selectedForm ? 'Update Protocol' : 'Publish Form'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
           <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-6">
              <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                 <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Library ({forms.length})</h3>
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
              <div className="divide-y divide-gray-50 max-h-[70vh] overflow-y-auto">
                 {forms.map(f => (
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
                         <p className={`text-xs font-bold truncate ${selectedForm?.id === f.id ? 'text-[#00468B]' : 'text-gray-700'}`}>{f.title}</p>
                         <p className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">{f.department || 'IMAGING'} | {f.questions.length} fields</p>
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
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">General Information</h3>
            <div className="grid grid-cols-1 gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-[#00468B] uppercase mb-2">Form Title</label>
                  <input 
                    type="text" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Daily MRI Safety Check"
                    className="w-full border-2 border-gray-50 rounded-xl p-4 text-lg font-bold focus:border-blue-500 bg-gray-50 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#00468B] uppercase mb-2">Department</label>
                  <div className="flex space-x-2">
                    {(['IMAGING', 'MRI'] as const).map(d => (
                      <button
                        key={d}
                        onClick={() => setDepartment(d)}
                        className={`flex-1 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
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
                <label className="block text-xs font-bold text-[#00468B] uppercase mb-2">Instructions / Description</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide guidance for the staff member..."
                  className="w-full border-2 border-gray-50 rounded-xl p-4 h-24 focus:border-blue-500 bg-gray-50 outline-none transition-all font-medium"
                ></textarea>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest px-2">Question Blocks</h3>
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
                       <span className="w-6 h-6 rounded-full bg-blue-100 text-[#00468B] flex items-center justify-center text-[10px] font-black">{index + 1}</span>
                       <label className="block text-xs font-black text-[#00468B] uppercase tracking-wider">Field Label</label>
                    </div>
                    <input 
                      type="text" 
                      value={q.label}
                      onChange={(e) => updateQuestionState(q.id, { label: e.target.value })}
                      placeholder="e.g., Is the backup power system functional?"
                      className="w-full border-b-2 border-gray-50 py-3 text-gray-800 font-bold focus:border-blue-500 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Input Type</label>
                    <select 
                      value={q.type}
                      onChange={(e) => updateQuestionState(q.id, { type: e.target.value as QuestionBlock['type'] })}
                      className="w-full border-2 border-gray-50 rounded-xl p-3 bg-gray-50 font-bold text-gray-700 outline-none focus:border-blue-500 transition-all"
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
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Options (comma separated)</label>
                      <input 
                        type="text" 
                        value={q.options?.join(', ') || ''}
                        onChange={(e) => updateQuestionState(q.id, { options: e.target.value.split(',').map(s => s.trim()) })}
                        placeholder="e.g., Option 1, Option 2, Option 3"
                        className="w-full border-2 border-gray-50 rounded-xl p-3 bg-gray-50 font-bold text-gray-700 outline-none focus:border-blue-500 transition-all"
                      />
                    </div>
                  )}

                  <div className="flex items-center space-x-8">
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
                      <span className="text-sm font-bold text-gray-600">Required (บังคับกรอก)</span>
                    </label>

                    {q.type === 'composite' && (
                      <label className="flex items-center space-x-3 cursor-pointer group/check">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${q.config?.withPhoto ? 'bg-blue-500 border-blue-500' : 'border-gray-200 group-hover/check:border-blue-400'}`}>
                          {q.config?.withPhoto && <ImageIcon size={14} className="text-white" />}
                        </div>
                        <input 
                          type="checkbox" 
                          checked={q.config?.withPhoto}
                          onChange={(e) => updateQuestionState(q.id, { config: { ...q.config, withPhoto: e.target.checked } })}
                          className="hidden"
                        />
                        <span className="text-sm font-bold text-gray-600">Enable Evidence Photo</span>
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
              <span className="font-bold text-sm uppercase tracking-widest">Add Inspection Field</span>
            </button>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-[#00468B] text-white p-8 rounded-2xl shadow-xl sticky top-6">
            <div className="flex items-center space-x-3 mb-6 border-b border-white/10 pb-6">
              <FileText className="text-blue-300" />
              <h3 className="font-bold">JSON Data Schema</h3>
            </div>
            <div className="bg-black/20 rounded-xl p-4 font-mono text-[10px] text-blue-200 overflow-hidden">
               <pre className="overflow-x-auto max-h-96">
                 {JSON.stringify({ title, questions }, null, 2)}
               </pre>
            </div>
            <div className="mt-8 p-4 bg-white/5 rounded-xl border border-white/10">
              <p className="text-[11px] text-blue-100 italic leading-relaxed">
                This schema follows the <span className="text-white font-bold">Standard Medical Compliance Format</span>. Changes will update the digital interface for staff members immediately.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormBuilder;