import React, { useState } from 'react';
import { useUsers, useAddUser, useUpdateUser, useDeleteUser } from '../../hooks/queries';
import { useApp } from '../../AppContext';
import { Mail, Building2, Tag, ShieldCheck, UserPlus, Trash2, KeyRound } from 'lucide-react';
import { translations } from '../../i18n';
import type { User } from '../../types';
import { api } from '../../api';
import UserModal from './UserModal';

const UserManagement: React.FC = () => {
  const { language, settings } = useApp();
  const { mutate: addUser } = useAddUser();
  const { mutate: updateUser } = useUpdateUser();
  const { mutate: deleteUser } = useDeleteUser();
  const { data: users = [] } = useUsers();
  const t = translations[language];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [testingEmailId, setTestingEmailId] = useState<string | null>(null);
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [isResetting, setIsResetting] = useState<string | null>(null);

  const handleResetPassword = async (user: User) => {
    if (confirm(`คุณแน่ใจหรือไม่ที่จะรีเซ็ตรหัสผ่านของ ${user.name} ให้เป็นรหัสพนักงาน?\n(ระบบจะบังคับให้เปลี่ยนรหัสผ่านเมื่อล็อกอินครั้งถัดไป)`)) {
      setIsResetting(user.id);
      try {
        await api.users.resetPassword(user.id);
        alert('รีเซ็ตรหัสผ่านสำเร็จ!');
      } catch {
        alert('เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน');
      } finally {
        setIsResetting(null);
      }
    }
  };

  const filteredUsers = React.useMemo(() => {
    if (selectedDept === 'ALL') return users;
    return users.filter(u => u.department === selectedDept);
  }, [users, selectedDept]);

  const handleTestEmail = async (email: string, id: string) => {
    if (!email) return;
    setTestingEmailId(id);
    try {
      const data = await api.config.testEmail(email);
      if (data.success) {
        alert(`✅ ส่งอีเมลทดสอบไปที่ ${email} สำเร็จ! (✅ Test email sent!)`);
      } else {
        alert('❌ ไม่สามารถส่งอีเมลได้ (Failed to send email): ' + data.error);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      alert('❌ เกิดข้อผิดพลาดในการเชื่อมต่อ (Connection error): ' + error.message);
    } finally {
      setTestingEmailId(null);
    }
  };

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
        id: crypto.randomUUID()
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
        <div className="flex items-center space-x-4">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-gray-200 text-gray-700 outline-none shadow-sm focus:border-[#00468B] transition-all"
          >
            <option value="ALL">ทุกแผนก (All Depts)</option>
            {settings?.departments?.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <button 
            onClick={() => handleOpenModal()}
            className="bg-[#00468B] text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg hover:bg-[#003569] transition-all flex items-center space-x-2"
          >
            <UserPlus size={16} />
            <span>{t.registerNewUser}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredUsers.map(user => (
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
                <span className={`text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded-md border ${
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
                <span className="truncate flex-1">{user.email}</span>
                {user.email && (
                  <button
                    onClick={() => handleTestEmail(user.email, user.id)}
                    disabled={testingEmailId === user.id}
                    className="ml-2 bg-blue-50 text-[#00468B] px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider hover:bg-blue-100 transition-colors disabled:opacity-50"
                  >
                    {testingEmailId === user.id ? '...' : 'Test'}
                  </button>
                )}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-50 flex space-x-3 relative">
               <button 
                onClick={() => handleOpenModal(user)}
                className="flex-1 py-2 rounded-lg bg-gray-50 text-gray-500 text-xs font-black uppercase tracking-widest hover:bg-gray-100 transition-colors"
               >
                {t.editProfile}
               </button>
               <button 
                onClick={() => handleResetPassword(user)}
                disabled={isResetting === user.id}
                title="รีเซ็ตรหัสผ่าน (Reset Password)"
                className="w-10 rounded-lg bg-gray-50 text-amber-500 hover:text-amber-600 hover:bg-amber-50 transition-all flex items-center justify-center disabled:opacity-50"
               >
                 <KeyRound size={16} />
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