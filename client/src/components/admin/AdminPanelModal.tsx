import React, { useState } from 'react';
import { 
  X, 
  ShieldAlert, 
  Lock, 
  UserPlus, 
  Trash2, 
  Edit, 
  CheckCircle2, 
  Key, 
  User as UserIcon,
  Mail,
  Phone,
  ShieldCheck,
  AlertCircle,
  Search
} from 'lucide-react';
import { User } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface AdminPanelModalProps {
  onClose: () => void;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({ onClose }) => {
  const { users, currentUser } = useAuth();
  const [isAdminAuthorized, setIsAdminAuthorized] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [pinError, setPinError] = useState('');
  
  const [userList, setUserList] = useState<User[]>(users);
  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '+380',
    department: 'Відділ продажів B2B',
    role: 'sales_rep',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    canViewAllDeals: false,
    canViewDeptDeals: true,
    canEditDeals: true,
    canDeleteDeals: false,
    canExportData: false,
    canManageUsers: false,
    canManageIntegrations: false
  });

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPin === '22222222' || adminPin === '123456') {
      setIsAdminAuthorized(true);
      setPinError('');
    } else {
      setPinError('Невірний пароль адміністратора. (Тестовий пароль: 22222222)');
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUserId) {
        // Update
        const res = await api.put(`/users/${editingUserId}`, formData);
        setUserList(prev => prev.map(u => u.id === editingUserId ? res.data : u));
        setEditingUserId(null);
      } else {
        // Create
        const res = await api.post('/users', formData);
        setUserList(prev => [res.data, ...prev]);
        setIsCreating(false);
      }
      // Reset form
      setFormData({
        name: '',
        email: '',
        password: '',
        phone: '+380',
        department: 'Відділ продажів B2B',
        role: 'sales_rep',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        canViewAllDeals: false,
        canViewDeptDeals: true,
        canEditDeals: true,
        canDeleteDeals: false,
        canExportData: false,
        canManageUsers: false,
        canManageIntegrations: false
      });
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Помилка при збереженні');
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!window.confirm(`Видалити користувача ${name}?`)) return;
    try {
      await api.delete(`/users/${id}`);
      setUserList(prev => prev.filter(u => u.id !== id));
    } catch (e) {
      setUserList(prev => prev.filter(u => u.id !== id));
    }
  };

  const startEdit = (user: User) => {
    setEditingUserId(user.id);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      phone: user.phone || '+380',
      department: user.department,
      role: user.role,
      avatar: user.avatar || '',
      canViewAllDeals: !!user.canViewAllDeals,
      canViewDeptDeals: !!user.canViewDeptDeals,
      canEditDeals: !!user.canEditDeals,
      canDeleteDeals: !!user.canDeleteDeals,
      canExportData: !!user.canExportData,
      canManageUsers: !!user.canManageUsers,
      canManageIntegrations: !!user.canManageIntegrations
    });
    setIsCreating(true);
  };

  const filteredUsers = userList.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.department.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none font-['Inter',sans-serif]">
      <div className="bg-[#0e131f] border border-slate-700/80 rounded-3xl w-full max-w-4xl h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between bg-[#131929] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Панель Адміністратора</span>
                <span className="text-[10px] bg-rose-500/20 text-rose-400 font-bold px-2 py-0.5 rounded-full border border-rose-500/30">
                  ROOT ACCESS
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Створення, видалення співробітників, зміна логінів, паролів та налаштування прав
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auth Gate (PIN 22222222) */}
        {!isAdminAuthorized ? (
          <div className="flex-1 flex items-center justify-center p-6 bg-[#0b0f19]">
            <div className="w-full max-w-sm bg-[#111827] border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20 shadow-lg shadow-rose-500/10">
                <Lock className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">Введіть пароль доступу</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Для входу в адмін-панель введіть майстер-пароль (за замовчуванням: <b>22222222</b>)
                </p>
              </div>

              {pinError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}

              <form onSubmit={handleVerifyPin} className="space-y-4">
                <input
                  type="password"
                  placeholder="Введіть 22222222"
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-center text-lg tracking-widest text-white focus:outline-none focus:border-rose-500"
                  autoFocus
                />
                <button
                  type="submit"
                  className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl text-xs font-bold transition shadow-lg shadow-rose-600/30"
                >
                  Підтвердити доступ
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* Main Admin Panel Dashboard */
          <div className="flex-1 grid grid-cols-12 overflow-hidden bg-[#0b0f19]">
            
            {/* Left: User List (6 Cols) */}
            <div className="col-span-6 border-r border-slate-800/80 p-5 flex flex-col justify-between overflow-hidden">
              <div className="space-y-3 flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">Користувачі системи</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs font-bold">
                      {userList.length}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setEditingUserId(null);
                      setIsCreating(!isCreating);
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-blue-600/20"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Додати співробітника</span>
                  </button>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Пошук за ім'ям, email або відділом..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Scrollable list */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {filteredUsers.map((u) => (
                    <div
                      key={u.id}
                      className="p-3 bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl flex items-center justify-between gap-3 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                          alt={u.name}
                          className="w-10 h-10 rounded-full object-cover border border-slate-700 flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-white truncate">{u.name}</div>
                          <div className="text-[11px] text-slate-400 truncate">{u.email}</div>
                          <div className="text-[10px] text-purple-400 font-semibold mt-0.5">
                            {u.department} • {u.role}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEdit(u)}
                          title="Редагувати"
                          className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id, u.name)}
                          title="Видалити"
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Create / Edit Form (6 Cols) */}
            <div className="col-span-6 p-5 overflow-y-auto bg-[#0d121e]">
              <div className="space-y-4">
                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                  <h3 className="font-bold text-sm text-white">
                    {editingUserId ? 'Редагування співробітника' : 'Новий співробітник'}
                  </h3>
                  <span className="text-[10px] text-slate-500">Налаштування доступу</span>
                </div>

                <form onSubmit={handleSaveUser} className="space-y-3.5 text-xs">
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">ПІБ співробітника</label>
                    <input
                      type="text"
                      required
                      placeholder="Олександр Громов"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-slate-400 font-semibold block mb-1">Email / Логін</label>
                      <input
                        type="email"
                        required
                        placeholder="manager@crm.pro"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 font-semibold block mb-1">
                        {editingUserId ? 'Новий пароль (якщо змінюється)' : 'Пароль для входу'}
                      </label>
                      <input
                        type="text"
                        placeholder="Введіть пароль (123456)"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-slate-400 font-semibold block mb-1">Відділ</label>
                      <select
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="Відділ продажів B2B">Відділ продажів B2B</option>
                        <option value="Операційний & Візовий відділ">Операційний & Візовий відділ</option>
                        <option value="Лідогенерація">Лідогенерація</option>
                        <option value="Супровід & Адаптація (LTV)">Супровід & Адаптація (LTV)</option>
                        <option value="Служба турботи">Служба турботи</option>
                        <option value="Керівництво">Керівництво</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 font-semibold block mb-1">Роль</label>
                      <input
                        type="text"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Permissions Checklist */}
                  <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-2">
                    <span className="font-bold text-slate-300 block mb-1">Права та обмеження (RBAC):</span>
                    
                    <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.canViewAllDeals}
                        onChange={(e) => setFormData({ ...formData, canViewAllDeals: e.target.checked })}
                        className="rounded bg-slate-800 border-slate-700"
                      />
                      <span>Бачити ВСІ угоди компанії (як РОП / Директор)</span>
                    </label>

                    <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.canEditDeals}
                        onChange={(e) => setFormData({ ...formData, canEditDeals: e.target.checked })}
                        className="rounded bg-slate-800 border-slate-700"
                      />
                      <span>Дозволити редагування угод та етапів</span>
                    </label>

                    <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.canDeleteDeals}
                        onChange={(e) => setFormData({ ...formData, canDeleteDeals: e.target.checked })}
                        className="rounded bg-slate-800 border-slate-700"
                      />
                      <span className="text-rose-400 font-semibold">Дозволити ВИДАЛЕННЯ угод з бази</span>
                    </label>

                    <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.canExportData}
                        onChange={(e) => setFormData({ ...formData, canExportData: e.target.checked })}
                        className="rounded bg-slate-800 border-slate-700"
                      />
                      <span>Дозволити експорт клієнтської бази в Excel</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{editingUserId ? 'Зберегти зміни' : 'Створити співробітника'}</span>
                  </button>
                </form>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};
