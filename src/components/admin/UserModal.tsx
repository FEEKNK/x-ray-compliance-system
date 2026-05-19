import React from 'react';
import { X } from 'lucide-react';
import type { User, Role } from '../../types';

import { translations } from '../../i18n';

interface UserModalProps {
  editingUser: User | null;
  formData: Partial<User>;
  setFormData: (data: Partial<User>) => void;
  onSave: (e: React.FormEvent) => void;
  onClose: () => void;
  t: typeof translations.EN;
}

const UserModal: React.FC<UserModalProps> = ({ editingUser, formData, setFormData, onSave, onClose, t }) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 shadow-2xl">
         <div className="bg-[#00468B] p-6 text-white flex items-center justify-between">
            <h3 className="text-xl font-bold">{editingUser ? t.editProfile : t.registerNewUser}</h3>
            <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-xl transition-colors">
              <X size={20} />
            </button>
         </div>
         
         <form onSubmit={onSave} className="p-8 space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Full Name</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full border-2 border-gray-50 rounded-xl p-3 bg-gray-50 font-bold text-gray-700 outline-none focus:border-blue-500 transition-all"
                  placeholder="e.g., Dr. Jane Doe"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Employee ID</label>
                <input 
                  type="text" 
                  value={formData.employeeId}
                  onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                  className="w-full border-2 border-gray-50 rounded-xl p-3 bg-gray-50 font-bold text-gray-700 outline-none focus:border-blue-500 transition-all"
                  placeholder="e.g., E992"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Department</label>
                  <select 
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    className="w-full border-2 border-gray-50 rounded-xl p-3 bg-gray-50 font-bold text-gray-700 outline-none focus:border-blue-500 transition-all appearance-none"
                  >
                    <option value="">Select Dept...</option>
                    <option value="X-RAY">X-RAY</option>
                    <option value="MRI">MRI</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">System Role</label>
                  <select 
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value as Role})}
                    className="w-full border-2 border-gray-50 rounded-xl p-3 bg-gray-50 font-bold text-gray-700 outline-none focus:border-blue-500 transition-all appearance-none"
                  >
                    <option value="STAFF">STAFF</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Email Address</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full border-2 border-gray-50 rounded-xl p-3 bg-gray-50 font-bold text-gray-700 outline-none focus:border-blue-500 transition-all"
                  placeholder="jane@hospital.com"
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-[#00468B] text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#003569] transition-all shadow-xl shadow-blue-900/10"
            >
              Save Personnel Data
            </button>
         </form>
      </div>
    </div>
  );
};

export default UserModal;