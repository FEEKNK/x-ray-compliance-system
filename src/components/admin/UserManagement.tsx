import React, { useState } from 'react';
import { useApp } from '../../AppContext';
import { Mail, Building2, Tag, ShieldCheck, UserPlus, Trash2 } from 'lucide-react';
import { translations } from '../../i18n';
import type { User } from '../../types';
import UserModal from './UserModal';

const UserManagement: React.FC = () => {
  const { users, addUser, updateUser, deleteUser, language } = useApp();
  const t = translations[language];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [formData, setFormData] = useState<Partial<User>>({
    name: '',
    employeeId: '',
    department: '',
    email: '',
    role: 'STAFF'
  });

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData(user);
    } else {
      setEditingUser(null);
      setFormData({ name: '', employeeId: '', department: '', email: '', role: 'STAFF' });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.employeeId) return alert('Please fill in required fields');

    if (editingUser) {
      updateUser(formData as User);
    } else {
      const newUser: User = {
        ...formData,
        id: Math.random().toString(36).substr(2, 9)
      } as User;
      addUser(newUser);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{t.personnelDirectory}</h1>
          <p className="text-sm text-gray-500 font-medium">Manage hospital clinical staff and administrative access</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-[#00468B] text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg hover:bg-[#003569] transition-all flex items-center space-x-2"
        >
          <UserPlus size={16} />
          <span>{t.registerNewUser}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {users.map(user => (
          <div key={user.id} className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 text-[#00468B] group-hover:scale-110 transition-transform">
               <ShieldCheck size={80} />
            </div>
            
            <div className="flex items-center space-x-4 mb-6 relative">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-[#00468B] text-2xl font-black shadow-inner">
                {user.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-800">{user.name}</h3>
                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border ${
                  user.role === 'ADMIN' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-blue-50 text-blue-700 border-blue-100'
                }`}>
                  {user.role}
                </span>
              </div>
            </div>

            <div className="space-y-3 relative">
              <div className="flex items-center text-sm text-gray-500 font-medium">
                <Tag size={16} className="mr-3 text-gray-300" />
                <span>Employee ID: {user.employeeId}</span>
              </div>
              <div className="flex items-center text-sm text-gray-500 font-medium">
                <Building2 size={16} className="mr-3 text-gray-300" />
                <span>Department: {user.department}</span>
              </div>
              <div className="flex items-center text-sm text-gray-500 font-medium">
                <Mail size={16} className="mr-3 text-gray-300" />
                <span className="truncate">{user.email}</span>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-50 flex space-x-3 relative">
               <button 
                onClick={() => handleOpenModal(user)}
                className="flex-1 py-2 rounded-lg bg-gray-50 text-gray-500 text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-colors"
               >
                {t.editProfile}
               </button>
               <button 
                onClick={() => {
                  if (confirm(`Remove ${user.name} from system?`)) {
                    deleteUser(user.id);
                  }
                }}
                className="w-10 rounded-lg bg-gray-50 text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center"
               >
                 <Trash2 size={16} />
               </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <UserModal 
          editingUser={editingUser}
          formData={formData}
          setFormData={setFormData}
          onSave={handleSave}
          onClose={() => setIsModalOpen(false)}
          t={t}
        />
      )}
    </div>
  );
};

export default UserManagement;