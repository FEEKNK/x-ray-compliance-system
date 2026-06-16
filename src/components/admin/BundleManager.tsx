import React, { useState } from 'react';
import { useForms, useBundles, useAddBundle, useUpdateBundle, useDeleteBundle } from '../../hooks/queries';
import { useApp } from '../../AppContext';
import { Plus, Trash2, Check, ChevronRight, Save } from 'lucide-react';
import type { ProtocolBundle } from '../../types';
import { translations } from '../../i18n';

const BundleManager: React.FC = () => {
  const { language, settings } = useApp();
  const { mutate: addBundle } = useAddBundle();
  const { mutate: updateBundle } = useUpdateBundle();
  const { mutate: deleteBundle } = useDeleteBundle();
  const { data: forms = [] } = useForms();
  const { data: bundles = [] } = useBundles();
  const t = translations[language];

  const [selectedBundle, setSelectedBundle] = useState<ProtocolBundle | null>(null);
  const [name, setName] = useState('');
  const [department, setDepartment] = useState<string>(settings?.departments?.[0] || 'IMAGING');
  const [selectedFormIds, setSelectedFormIds] = useState<string[]>([]);
  const [filterDepartment, setFilterDepartment] = useState<string>('ALL');

  const filteredBundles = filterDepartment === 'ALL' 
    ? bundles 
    : bundles.filter(b => b.department === filterDepartment);

  const handleSave = () => {
    if (!name) return alert('Please enter a bundle name');
    if (selectedFormIds.length === 0) return alert('Please select at least one form');

    if (selectedBundle) {
      updateBundle({ ...selectedBundle, name, department, formIds: selectedFormIds });
    } else {
      // eslint-disable-next-line react-hooks/purity
      const newId = `b-${Date.now()}`;
      addBundle({
        id: newId,
        name,
        department,
        formIds: selectedFormIds
      });
    }
    reset();
  };

  const reset = () => {
    setSelectedBundle(null);
    setName('');
    setDepartment(settings?.departments?.[0] || 'IMAGING');
    setSelectedFormIds([]);
  };

  const toggleForm = (id: string) => {
    if (selectedFormIds.includes(id)) {
      setSelectedFormIds(selectedFormIds.filter(f => f !== id));
    } else {
      setSelectedFormIds([...selectedFormIds, id]);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight">{t.formGroups}</h1>
          <p className="text-sm text-gray-500 font-medium">{t.groupDesc}</p>
        </div>
        <button 
          onClick={handleSave}
          className="bg-[#00468B] text-white px-8 py-3 rounded-xl font-bold flex items-center space-x-2 hover:bg-[#003569] transition-all shadow-lg active:scale-95"
        >
          <Save size={20} />
          <span>{selectedBundle ? t.updateGroup : t.createGroup}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Bundle Library */}
        <div className="lg:col-span-1 space-y-6">
           <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-6">
              <div className="p-6 border-b border-gray-50 bg-gray-50/50 space-y-4">
                 <div className="flex items-center justify-between">
                   <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">{t.presetGroups} ({filteredBundles.length})</h3>
                   <button onClick={reset} className="p-1.5 rounded-lg hover:bg-white text-[#00468B] transition-colors">
                      <Plus size={16} />
                   </button>
                 </div>
                 <select
                   value={filterDepartment}
                   onChange={(e) => setFilterDepartment(e.target.value)}
                   className="w-full text-xs p-2 rounded-lg border border-gray-200 bg-white text-gray-700 outline-none focus:border-[#00468B] transition-colors"
                 >
                   <option value="ALL">{t.allDepts || 'All Depts'}</option>
                   {settings?.departments?.map(d => (
                     <option key={d} value={d}>{d}</option>
                   ))}
                 </select>
              </div>
              <div className="divide-y divide-gray-50 max-h-[70vh] overflow-y-auto">
                 {filteredBundles.map(b => (
                   <div 
                    key={b.id} 
                    onClick={() => {
                      setSelectedBundle(b);
                      setName(b.name);
                      setDepartment(b.department);
                      setSelectedFormIds(b.formIds);
                    }}
                    className={`p-4 flex items-center justify-between cursor-pointer transition-all group ${selectedBundle?.id === b.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                   >
                      <div className="flex-1 min-w-0 mr-2">
                         <p className={`text-xs font-bold truncate ${selectedBundle?.id === b.id ? 'text-[#00468B]' : 'text-gray-700'}`}>{b.name}</p>
                         <p className="text-xs text-gray-400 font-medium uppercase tracking-tighter">{b.department} | {b.formIds.length} forms</p>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete bundle "${b.name}"?`)) {
                              deleteBundle(b.id);
                              if (selectedBundle?.id === b.id) reset();
                            }
                          }}
                          className="p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                        <ChevronRight size={14} className={selectedBundle?.id === b.id ? 'text-[#00468B]' : 'text-gray-200'} />
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>

        {/* Configuration */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-8">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                   <label className="block text-xs font-bold text-[#00468B] uppercase mb-2 tracking-widest">Bundle Name</label>
                   <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Morning IMAGING Standard"
                    className="w-full border-2 border-gray-50 rounded-xl p-4 font-bold focus:border-blue-500 bg-gray-50 outline-none transition-all"
                   />
                </div>
                <div>
                   <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Target Department</label>
                   <div className="flex flex-wrap gap-2 min-h-[58px]">
                    {(settings?.departments || []).map(d => (
                      <button
                        key={d}
                        onClick={() => setDepartment(d)}
                        className={`px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                          department === d ? 'bg-[#00468B] text-white shadow-md' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
             </div>

             <div className="space-y-4">
                <div className="flex items-center justify-between">
                   <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Select Forms for this Bundle</h3>
                   <span className="text-xs font-black text-[#00468B]">{selectedFormIds.length} Selected</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                   {forms.filter(f => f.department === department).map(f => {
                     const isSelected = selectedFormIds.includes(f.id);
                     return (
                       <button
                        key={f.id}
                        onClick={() => toggleForm(f.id)}
                        className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left ${
                          isSelected ? 'bg-blue-50 border-[#00468B] text-[#00468B]' : 'bg-white border-gray-50 text-gray-400 hover:border-gray-100'
                        }`}
                       >
                         <div className="flex flex-col min-w-0 pr-4">
                           <span className="text-xs font-bold truncate">{f.title}</span>
                         </div>
                         <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 ${isSelected ? 'bg-[#00468B] border-[#00468B] text-white' : 'border-gray-100'}`}>
                            {isSelected && <Check size={12} />}
                         </div>
                       </button>
                     );
                   })}
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BundleManager;