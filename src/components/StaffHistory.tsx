import React from 'react';
import { useApp } from '../AppContext';
import { ClipboardList, Clock, CheckCircle2, ChevronRight, Search } from 'lucide-react';
import SubmissionDetailModal from './SubmissionDetailModal';
import { translations } from '../i18n';
import type { Submission } from '../types';

const StaffHistory: React.FC = () => {
  const { submissions, forms, currentUser, language } = useApp();
  const t = translations[language];
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedSubmission, setSelectedSubmission] = React.useState<Submission | null>(null);

  const mySubmissions = submissions
    .filter(s => s.staffId === currentUser?.id)
    .filter(s => {
      const form = forms.find(f => f.id === s.formId);
      return form?.title.toLowerCase().includes(searchTerm.toLowerCase());
    })
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{t.myHistory}</h1>
          <p className="text-sm text-gray-500 font-medium">Review your previously submitted clinical reports</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative">
        <Search size={20} className="absolute left-10 top-1/2 -translate-y-1/2 text-gray-300" />
        <input 
          type="text" 
          placeholder="Search your records..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-14 pr-4 py-4 border-2 border-gray-50 rounded-2xl focus:border-blue-500 bg-gray-50 font-bold text-gray-700 outline-none transition-all"
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {mySubmissions.length > 0 ? mySubmissions.map(sub => {
          const form = forms.find(f => f.id === sub.formId);
          return (
            <div 
              key={sub.id} 
              onClick={() => setSelectedSubmission(sub)}
              className="bg-white p-6 rounded-2xl border border-gray-100 flex items-center justify-between hover:shadow-md transition-all group cursor-pointer"
            >
              <div className="flex items-center space-x-5">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#00468B] flex items-center justify-center">
                  <ClipboardList size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 group-hover:text-[#00468B] transition-colors">{form?.title}</h3>
                  <div className="flex items-center space-x-4 mt-1">
                    <span className="flex items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <Clock size={12} className="mr-1" /> {new Date(sub.submittedAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center text-[10px] font-black text-green-600 uppercase tracking-widest bg-green-50 px-2 py-0.5 rounded">
                      <CheckCircle2 size={12} className="mr-1" /> {t.verifiedCertified}
                    </span>
                  </div>
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-200 group-hover:text-gray-400 transition-colors" />
            </div>
          );
        }) : (
          <div className="bg-white p-20 rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
            <ClipboardList size={48} className="mb-4 opacity-10" />
            <p className="font-bold uppercase tracking-widest text-xs">No records found</p>
          </div>
        )}
      </div>

      {selectedSubmission && (
        <SubmissionDetailModal 
          submission={selectedSubmission} 
          onClose={() => setSelectedSubmission(null)} 
        />
      )}
    </div>
  );
};

export default StaffHistory;