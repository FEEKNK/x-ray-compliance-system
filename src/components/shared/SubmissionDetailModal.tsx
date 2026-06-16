import React from 'react';
import { X, Image as ImageIcon, Printer } from 'lucide-react';
import { useApp } from '../../AppContext';
import { parseDbDate } from '../../utils/shiftTime';
import type { Submission } from '../../types';
import { usePublicUsers, useForms } from '../../hooks/queries';

interface SubmissionDetailModalProps {
  submission: Submission;
  onClose: () => void;
}

const SubmissionDetailModal: React.FC<SubmissionDetailModalProps> = ({ submission, onClose }) => {
  const { language } = useApp();
  const { data: users = [] } = usePublicUsers();
  const { data: forms = [] } = useForms();
  const staff = users.find(u => u.id === submission.staffId);
  const form = forms.find(f => f.id === submission.formId);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:p-0 print:bg-white print:static print:inset-auto">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 print:max-h-none print:shadow-none print:rounded-none print:w-full print:border-none">
        <div className="bg-[#00468B] p-6 text-white flex items-center justify-between print:bg-white print:text-black print:border-b-2 print:border-gray-200 print:p-4">
          <div>
            <h3 className="text-xl font-bold">Inspection Details</h3>
            <p className="text-xs text-blue-100 opacity-70 print:text-gray-400">Report ID: {submission.id}</p>
          </div>
          <div className="flex items-center space-x-2 print:hidden">
            <button 
              onClick={handlePrint}
              className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              title="Print Report"
            >
              <Printer size={20} />
            </button>
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 space-y-8 print:overflow-visible print:p-4">
          <div className="grid grid-cols-2 gap-8 border-b border-gray-50 pb-8 print:gap-4 print:pb-4">
            <div>
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">Staff Member</label>
              <p className="font-bold text-gray-800">{staff?.name}</p>
            </div>
            <div>
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">Form Protocol</label>
              <p className="font-bold text-[#00468B]">{form?.title}</p>
            </div>
            <div>
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">Submission Time</label>
              <p className="font-bold text-gray-800">{parseDbDate(submission.submittedAt).toLocaleString('en-GB', { hour12: false })}</p>
            </div>
            <div>
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">Integrity Status</label>
              <span className="text-xs font-black uppercase text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100 print:bg-white print:border-green-600">Verified & Certified</span>
            </div>
          </div>

          <div className="space-y-6 print:space-y-4">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Inspection Responses</h4>
            <div className="grid grid-cols-1 gap-4 print:gap-2">
              {Object.entries(submission.data).map(([key, value]) => {
                const isOther = key.endsWith('_other');
                const mainKey = isOther ? key.replace('_other', '') : key;
                const question = form?.questions.find(q => q.id === mainKey);
                
                return (
                  <div key={key} className={`p-4 rounded-xl border border-gray-100 print:bg-white print:p-2 print:border-gray-200 ${isOther ? 'bg-orange-50/30 border-orange-100 ml-4' : 'bg-gray-50'}`}>
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                      {isOther ? (language === 'TH' ? `รายละเอียดเพิ่มเติมของ: ${question?.label}` : `Details for: ${question?.label}`) : (question?.label || key)}
                    </label>
                    <p className={`font-bold ${value === 'Fail' || value === 'Alert' ? 'text-red-600' : 'text-gray-800'}`}>
                      {String(value)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {submission.photos.length > 0 && (
            <div className="space-y-4 print:break-inside-avoid">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Clinical Evidence</h4>
              <div className="grid grid-cols-2 gap-4 print:grid-cols-2">
                {submission.photos.map((_, i) => (
                  <div key={i} className="aspect-video bg-gray-100 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-200 print:bg-white print:border-solid print:border-gray-300">
                     <ImageIcon className="text-gray-300 print:text-gray-400" size={32} />
                     <span className="text-xs font-bold text-gray-400 ml-2">Evidence Photo {i+1}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end print:hidden">
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-[#00468B] text-white rounded-xl font-bold text-sm hover:bg-[#003569] transition-all"
          >
            Close Report
          </button>
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default SubmissionDetailModal;