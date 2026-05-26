import React, { useState } from 'react';
import { useApp } from '../../AppContext';
import { Search, Filter, Download, ExternalLink, Image as ImageIcon } from 'lucide-react';
import SubmissionDetailModal from '../shared/SubmissionDetailModal';
import { translations } from '../../i18n';
import type { Submission } from '../../types';

const MasterLogs: React.FC = () => {
  const { submissions, users, forms, schedules, language } = useApp();
  const t = translations[language];
  const [searchTerm, setSearchTerm] = useState('');
  const [filterShift, setFilterShift] = useState('All');
  const [filterDept, setFilterDept] = useState<'All' | 'IMAGING' | 'MRI'>('All');
  const [filterDate, setFilterDate] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  const filteredSubmissions = submissions.filter(sub => {
    const staff = users.find(u => u.id === sub.staffId);
    const form = forms.find(f => f.id === sub.formId);
    const schedule = schedules.find(s => s.id === sub.scheduleId);
    
    const matchesSearch = 
      staff?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      form?.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesShift = filterShift === 'All' || schedule?.shift === filterShift;
    const matchesDept = filterDept === 'All' || form?.department === filterDept;
    const matchesDate = !filterDate || sub.submittedAt.startsWith(filterDate);

    return matchesSearch && matchesShift && matchesDept && matchesDate;
  });

  const stats = {
    total: filteredSubmissions.length,
    withPhotos: filteredSubmissions.filter(s => s.photos.length > 0).length,
    alerts: filteredSubmissions.filter(s => Object.values(s.data).some(v => v === 'Fail' || v === 'Alert')).length
  };

  const exportToCSV = () => {
    if (submissions.length === 0) return;
    const headers = ['Date', 'Staff', 'Department', 'Form', 'Status', 'Data'];
    const rows = filteredSubmissions.map(sub => {
      const staff = users.find(u => u.id === sub.staffId);
      const form = forms.find(f => f.id === sub.formId);
      return [
        new Date(sub.submittedAt).toLocaleString(),
        staff?.name,
        staff?.department,
        form?.title,
        'Certified',
        JSON.stringify(sub.data).replace(/"/g, '""')
      ].join(',');
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `xray_logs_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{t.masterLogs}</h1>
          <p className="text-sm text-gray-500 font-medium">Verified historical records of all medical inspections</p>
        </div>
        <button 
          onClick={exportToCSV}
          className="flex items-center space-x-2 bg-white border-2 border-gray-50 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-[#00468B] hover:bg-gray-50 transition-all shadow-sm"
        >
          <Download size={18} />
          <span>{t.exportArchive}</span>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
         <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Records</p>
            <p className="text-2xl font-black text-gray-800">{stats.total}</p>
         </div>
         <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Evidence Captured</p>
            <p className="text-2xl font-black text-blue-600">{stats.withPhotos}</p>
         </div>
         <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Critical Alerts</p>
            <p className="text-2xl font-black text-red-600">{stats.alerts}</p>
         </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-6">
        <div className="flex-1 relative">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
          <input 
            type="text" 
            placeholder={t.searchClinician}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border-2 border-gray-50 rounded-xl focus:border-blue-500 bg-gray-50 font-bold text-gray-700 outline-none transition-all"
          />
        </div>
        
        <div className="flex items-center space-x-3">
          <Filter size={20} className="text-gray-300" />
          <input 
            type="date" 
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="border-2 border-gray-50 rounded-xl px-4 py-3 bg-gray-50 text-xs font-bold text-gray-600 focus:border-blue-500 outline-none transition-all"
          />
          <select 
            value={filterShift}
            onChange={(e) => setFilterShift(e.target.value)}
            className="border-2 border-gray-50 rounded-xl px-4 py-3 bg-gray-50 text-xs font-black uppercase tracking-widest text-gray-600 focus:border-blue-500 outline-none transition-all"
          >
            <option value="All">All Rotations</option>
            <option value="Morning">Morning</option>
            <option value="Afternoon">Afternoon</option>
            <option value="Night">Night</option>
          </select>
          <select 
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value as 'All' | 'IMAGING' | 'MRI')}
            className="border-2 border-gray-50 rounded-xl px-4 py-3 bg-gray-50 text-xs font-black uppercase tracking-widest text-gray-600 focus:border-blue-500 outline-none transition-all"
          >
            <option value="All">All Depts</option>
            <option value="IMAGING">IMAGING</option>
            <option value="MRI">MRI</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-50">
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Verification Timestamp</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Medical Staff</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Protocol / Task</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Shift</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Integrity Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredSubmissions.length > 0 ? filteredSubmissions.map(sub => {
                const staff = users.find(u => u.id === sub.staffId);
                const form = forms.find(f => f.id === sub.formId);
                const schedule = schedules.find(s => s.id === sub.scheduleId);
                const hasAlert = Object.values(sub.data).some(v => v === 'Fail' || v === 'Alert');
                return (
                  <tr key={sub.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-8 py-6">
                      <p className="text-sm text-gray-800 font-bold">{new Date(sub.submittedAt).toLocaleDateString('en-GB')}</p>
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">{new Date(sub.submittedAt).toLocaleTimeString()}</p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-[#00468B] flex items-center justify-center text-white text-xs font-black shadow-md shadow-blue-900/10">
                          {staff?.name.charAt(0)}
                        </div>
                        <span className="text-sm font-bold text-gray-700">{staff?.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-sm font-bold text-[#00468B]">{form?.title}</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border ${
                        schedule?.shift === 'Morning' ? 'bg-orange-50 text-orange-600 border-orange-100' : 
                        schedule?.shift === 'Afternoon' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                      }`}>
                        {schedule?.shift}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center space-x-2">
                        {sub.photos.length > 0 && <ImageIcon size={14} className="text-blue-500" />}
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                          hasAlert 
                            ? 'text-red-600 bg-red-50 border-red-100' 
                            : 'text-green-600 bg-green-50 border-green-100'
                        }`}>
                          {hasAlert ? '🔴 Issue Found' : t.verifiedCertified}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <button 
                        onClick={() => setSelectedSubmission(sub)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 hover:text-[#00468B] hover:bg-white transition-all group-hover:shadow-sm group-hover:border group-hover:border-gray-100"
                      >
                        <ExternalLink size={18} />
                      </button>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center flex flex-col items-center justify-center text-gray-300">
                    <Search size={48} className="mb-4 opacity-10" />
                    <p className="font-bold uppercase tracking-widest text-xs">No records found in current view</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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

export default MasterLogs;