import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldAlert, 
  Lock, 
  UserPlus, 
  Trash2, 
  Edit, 
  CheckCircle2, 
  Key, 
  Copy, 
  Check, 
  Mail, 
  Phone, 
  Search, 
  AlertCircle, 
  ExternalLink,
  Bot,
  Sliders,
  Sparkles,
  Users,
  Archive,
  RotateCcw,
  Camera,
  Upload,
  Loader2
} from 'lucide-react';
import { User } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { compressImageToBase64 } from '../../utils/imageUtils';

interface AdminPanelModalProps {
  onClose: () => void;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({ onClose }) => {
  const { currentUser, refreshUsers, updateUserAvatar } = useAuth();
  const [isAdminAuthorized, setIsAdminAuthorized] = useState(() => {
    return currentUser?.role === 'super_admin' || localStorage.getItem('crm_admin_pin') === '22222222';
  });
  const [adminPin, setAdminPin] = useState(() => {
    return localStorage.getItem('crm_admin_pin') || '22222222';
  });
  const [pinError, setPinError] = useState('');
  
  const [userList, setUserList] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Avatar Upload State (Database persistence)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [targetAvatarUserId, setTargetAvatarUserId] = useState<string | null>(null);
  const formAvatarFileRef = React.useRef<HTMLInputElement>(null);
  const quickAvatarFileRef = React.useRef<HTMLInputElement>(null);

  const handleFormAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingAvatar(true);
      const base64 = await compressImageToBase64(file);
      setFormData(prev => ({ ...prev, avatar: base64 }));
      setSuccessNotice('Фото підготовлено для збереження в базі даних');
      setTimeout(() => setSuccessNotice(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Помилка обробки фото');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleQuickAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetAvatarUserId) return;
    try {
      setIsUploadingAvatar(true);
      const base64 = await compressImageToBase64(file);
      const ok = await updateUserAvatar(targetAvatarUserId, base64);
      if (ok) {
        setUserList(prev => prev.map(u => u.id === targetAvatarUserId ? { ...u, avatar: base64 } : u));
        setSuccessNotice('Аватар співробітника успішно оновлено в базі даних!');
        setTimeout(() => setSuccessNotice(null), 3000);
      }
    } catch (err: any) {
      alert(err.message || 'Помилка оновлення фото');
    } finally {
      setIsUploadingAvatar(false);
      setTargetAvatarUserId(null);
      if (quickAvatarFileRef.current) quickAvatarFileRef.current.value = '';
    }
  };

  // Lead Distribution Engine Settings
  const [autoDistribute, setAutoDistribute] = useState(true);

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

  const [activeUserTab, setActiveUserTab] = useState<'active' | 'archived'>('active');
  const [archivedUsers, setArchivedUsers] = useState<User[]>([]);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      if (res.data) setUserList(res.data);
    } catch (e) {
      console.warn(e);
    }
  };

  const fetchArchivedUsers = async () => {
    try {
      const res = await api.get('/users/archived/list');
      if (res.data) setArchivedUsers(res.data);
    } catch (e) {
      console.warn(e);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await api.get('/webhooks/distribution-settings');
      if (res.data) setAutoDistribute(!!res.data.autoDistribute);
    } catch (e) {}
  };

  useEffect(() => {
    if (isAdminAuthorized) {
      fetchUsers();
      fetchArchivedUsers();
      fetchSettings();
    }
  }, [isAdminAuthorized]);

  const handleToggleAutoDistribute = async (val: boolean) => {
    setAutoDistribute(val);
    try {
      await api.post('/webhooks/distribution-settings', { autoDistribute: val });
      setSuccessNotice(val ? '🤖 Увімкнено автоматичний розподіл лідів (Round-Robin)' : '📥 Увімкнено ручний розподіл лідів адміністратором');
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (e) {}
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleVerifyPin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const pin = (adminPin || '22222222').trim();
    try {
      const res = await api.post('/users/verify-admin-pin', { password: pin });
      if (res.data?.success) {
        setIsAdminAuthorized(true);
        setPinError('');
        api.defaults.headers.common['x-admin-pin'] = pin;
        localStorage.setItem('crm_admin_pin', pin);
        fetchUsers();
      }
    } catch (err: any) {
      setPinError(err?.response?.data?.error || 'Невірний майстер-пароль адміністратора');
    }
  };

  const handleResetUserPassword = async (user: User) => {
    if (!window.confirm(`Згенерувати новий випадковий пароль для ${user.name}?`)) return;
    try {
      const res = await api.post(`/users/${user.id}/reset-password`, {});
      if (res.data?.newPassword) {
        copyWorkerInvite(user, res.data.newPassword);
        setSuccessNotice(`🔑 Новий пароль для ${user.name}: "${res.data.newPassword}" скопійовано в буфер!`);
        setTimeout(() => setSuccessNotice(null), 6000);
      }
    } catch (e) {
      alert('Помилка при скиданні пароля');
    }
  };

  const handleToggleUserStatus = async (user: User) => {
    try {
      const res = await api.post(`/users/${user.id}/toggle-status`, {});
      setUserList(prev => prev.map(u => u.id === user.id ? { ...u, isActive: res.data.isActive } : u));
      refreshUsers();
      setSuccessNotice(`Статус ${user.name}: ${res.data.isActive ? '🟢 Доступ відкрито' : '🔴 Доступ заблоковано'}`);
      setTimeout(() => setSuccessNotice(null), 3000);
    } catch (e) {
      alert('Помилка при зміні статусу');
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUserId) {
        const res = await api.put(`/users/${editingUserId}`, formData);
        setUserList(prev => prev.map(u => u.id === editingUserId ? res.data : u));
        setSuccessNotice(`✅ Співробітника ${formData.name} оновлено!`);
        setEditingUserId(null);
      } else {
        const res = await api.post('/users', formData);
        setUserList(prev => [res.data, ...prev]);
        const passToCopy = res.data.generatedPassword || formData.password;
        copyWorkerInvite(res.data, passToCopy);
        setSuccessNotice(`✅ Співробітника ${formData.name} створено! Доступи та пароль скопійовано в буфер обміну.`);
        setIsCreating(false);
      }
      refreshUsers();
      setTimeout(() => setSuccessNotice(null), 5000);

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
    if (!window.confirm(`Перемістити співробітника ${name} до кошика/архіву (безпечне видалення з можливістю відновлення)?`)) return;
    try {
      await api.delete(`/users/${id}`);
      setUserList(prev => prev.filter(u => u.id !== id));
      fetchArchivedUsers();
      refreshUsers();
      setSuccessNotice(`📦 Співробітника ${name} архівовано (зберігається 30 днів з можливістю відновлення).`);
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (e) {
      setUserList(prev => prev.filter(u => u.id !== id));
    }
  };

  const handleRestoreUser = async (id: string, name: string) => {
    try {
      await api.post(`/users/${id}/restore`);
      setArchivedUsers(prev => prev.filter(u => u.id !== id));
      fetchUsers();
      refreshUsers();
      setSuccessNotice(`♻️ Співробітника ${name} успішно відновлено з архіву!`);
      setTimeout(() => setSuccessNotice(null), 3500);
    } catch (e) {
      alert('Не вдалося відновити співробітника');
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

  const copyWorkerInvite = (user: User) => {
    const inviteText = `Вам надано робочий доступ до Recruiting CRM!

🔗 Посилання для входу: ${window.location.origin}
👤 Логін / Email: ${user.email}
🔑 Пароль: 123456 (або пароль, встановлений адміністратором)`;

    navigator.clipboard.writeText(inviteText);
    setCopiedId(user.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const filteredUsers = userList.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.department.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none font-['Inter',sans-serif]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#0e131f] border border-slate-700/80 rounded-3xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between bg-[#131929] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30 shadow-lg shadow-rose-500/10">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Панель Адміністратора</span>
                <span className="text-[10px] bg-rose-500/20 text-rose-400 font-bold px-2 py-0.5 rounded-full border border-rose-500/30 font-mono">
                  MASTER ADMIN
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Створення працівників, видача логінів і паролів, розподіл лідів
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auth Gate (PIN 22222222) */}
        {!isAdminAuthorized ? (
          <div className="flex-1 flex items-center justify-center p-6 bg-[#080c14]">
            <div className="w-full max-w-sm bg-[#111827] border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20 shadow-lg shadow-rose-500/10">
                <Lock className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">Введіть майстер-пароль</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Для доступу до панелі керування введіть захисний ключ адміністратора
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
                  placeholder="22222222"
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-center text-lg tracking-widest text-white focus:outline-none focus:border-rose-500 font-mono"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAdminPin('22222222');
                      handleVerifyPin();
                    }}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-xs font-semibold transition border border-slate-700"
                  >
                    Майстер-код (22222222)
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl text-xs font-bold transition shadow-lg shadow-rose-600/30"
                  >
                    Підтвердити
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          /* Main Admin Panel Dashboard */
          <div className="flex-1 grid grid-cols-12 overflow-hidden bg-[#080c14]">
            
            {/* Left: User List & Distribution Settings (6 Cols) */}
            <div className="col-span-6 border-r border-slate-800/80 p-5 flex flex-col justify-between overflow-hidden">
              <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
                
                {successNotice && (
                  <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-semibold text-center animate-in fade-in">
                    {successNotice}
                  </div>
                )}

                {/* Lead Distribution Engine Toggle Card */}
                <div className="p-4 bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border border-blue-500/30 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Bot className="w-4 h-4 text-blue-400" />
                      <span>Розумний розподіл вхідних лідів</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold">
                      {autoDistribute ? 'ROUND-ROBIN' : 'MANUAL'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Автоматично призначати нові звернення з WhatsApp, Telegram та реклами порівну між менеджерами
                  </p>
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      onClick={() => handleToggleAutoDistribute(true)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                        autoDistribute ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      Авто-розподіл (ВКЛ)
                    </button>
                    <button
                      onClick={() => handleToggleAutoDistribute(false)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                        !autoDistribute ? 'bg-amber-600 text-white shadow-md' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      Ручний розподіл (Адмін)
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <input
                    ref={quickAvatarFileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleQuickAvatarSelect}
                    className="hidden"
                  />
                  <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setActiveUserTab('active')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                        activeUserTab === 'active'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Активні ({userList.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveUserTab('archived');
                        fetchArchivedUsers();
                      }}
                      className={`px-3 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 transition ${
                        activeUserTab === 'archived'
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Archive className="w-3 h-3" />
                      <span>Архів / Кошик ({archivedUsers.length})</span>
                    </button>
                  </div>

                  {activeUserTab === 'active' && (
                    <button
                      onClick={() => {
                        setEditingUserId(null);
                        setIsCreating(true);
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-blue-600/20"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>+ Створити працівника</span>
                    </button>
                  )}
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Пошук працівника за ім'ям, email або відділом..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Scrollable list */}
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  {activeUserTab === 'archived' ? (
                    archivedUsers.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 text-xs">
                        Кошик порожній. Немає архівованих працівників.
                      </div>
                    ) : (
                      archivedUsers.map((u) => (
                        <div
                          key={u.id}
                          className="p-3.5 bg-slate-900/60 border border-dashed border-amber-500/30 rounded-2xl space-y-2.5 transition"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                                alt={u.name}
                                className="w-10 h-10 rounded-full object-cover border border-amber-500/40 opacity-70 flex-shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="font-bold text-xs text-slate-300 truncate flex items-center gap-1.5">
                                  <span className="line-through">{u.name}</span>
                                  <span className="text-[9px] bg-amber-500/20 text-amber-400 font-bold px-1.5 py-0.2 rounded border border-amber-500/30">
                                    В АРХІВІ (30 днів)
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 truncate">{u.email}</div>
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                  {u.department}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRestoreUser(u.id, u.name)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-emerald-600/20"
                              title="Відновити співробітника та повернути йому робочий доступ"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Відновити</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )
                  ) : filteredUsers.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      Немає створених працівників. Натисніть «+ Створити працівника».
                    </div>
                  ) : (
                    filteredUsers.map((u) => (
                      <div
                        key={u.id}
                        className="p-3.5 bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl space-y-2.5 transition"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              onClick={() => {
                                setTargetAvatarUserId(u.id);
                                quickAvatarFileRef.current?.click();
                              }}
                              className="relative group/av cursor-pointer flex-shrink-0"
                              title="Натисніть, щоб змінити фото в базі даних"
                            >
                              <img
                                src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                                alt={u.name}
                                className="w-10 h-10 rounded-full object-cover border border-slate-700 group-hover/av:border-cyan-400 transition"
                              />
                              <div className="absolute inset-0 bg-black/60 rounded-full hidden group-hover/av:flex items-center justify-center text-cyan-400">
                                <Camera className="w-3.5 h-3.5" />
                              </div>
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-xs text-white truncate flex items-center gap-1.5">
                                <span>{u.name}</span>
                                {u.role === 'super_admin' && (
                                  <span className="text-[9px] bg-rose-500/20 text-rose-400 font-bold px-1.5 py-0.2 rounded">ROOT</span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate">{u.email}</div>
                              <div className="text-[10px] text-purple-400 font-semibold mt-0.5">
                                {u.department}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => startEdit(u)}
                              title="Редагувати дані та права"
                              className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            {u.role !== 'super_admin' && (
                              <button
                                onClick={() => handleDeleteUser(u.id, u.name)}
                                title="Видалити співробітника"
                                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Status, Reset Password, Toggle Lock & Copy Invite */}
                        <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${u.isActive !== false ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                            <span className={u.isActive !== false ? 'text-emerald-400 font-semibold text-[10px]' : 'text-rose-400 font-semibold text-[10px]'}>
                              {u.isActive !== false ? 'Активний' : 'Заблокований'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {u.role !== 'super_admin' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleResetUserPassword(u)}
                                  title="Згенерувати новий пароль"
                                  className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition"
                                >
                                  <Key className="w-3 h-3" />
                                  <span>Скинути пароль</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleToggleUserStatus(u)}
                                  title={u.isActive !== false ? 'Заблокувати доступ' : 'Відновити доступ'}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition ${
                                    u.isActive !== false
                                      ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30'
                                      : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                  }`}
                                >
                                  {u.isActive !== false ? 'Заблокувати' : 'Розблокувати'}
                                </button>
                              </>
                            )}

                            <button
                              type="button"
                              onClick={() => copyWorkerInvite(u)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold flex items-center gap-1.5 transition text-[10px]"
                            >
                              {copiedId === u.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedId === u.id ? 'Скопійовано!' : 'Скопіювати'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right: Create / Edit Form (6 Cols) */}
            <div className="col-span-6 p-6 overflow-y-auto bg-[#0b0f19]">
              <div className="space-y-4">
                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                  <h3 className="font-bold text-sm text-white">
                    {editingUserId ? 'Редагування співробітника' : 'Створення нового співробітника'}
                  </h3>
                  <span className="text-[10px] text-slate-500">Заповніть логін і пароль</span>
                </div>

                <form onSubmit={handleSaveUser} className="space-y-3.5 text-xs">
                  {/* Employee Avatar (Saved directly into PostgreSQL DB as Base64) */}
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">
                      Аватарка співробітника (Зберігається в базу даних)
                    </label>
                    <div className="flex items-center gap-3 p-2.5 bg-slate-900 border border-slate-800 rounded-xl">
                      <img
                        src={formData.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                        alt="Preview"
                        className="w-12 h-12 rounded-full object-cover border-2 border-cyan-400 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <input
                          ref={formAvatarFileRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFormAvatarSelect}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => formAvatarFileRef.current?.click()}
                          disabled={isUploadingAvatar}
                          className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                        >
                          {isUploadingAvatar ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Camera className="w-3.5 h-3.5" />
                          )}
                          <span>Завантажити фото з комп'ютера</span>
                        </button>
                        <span className="text-[10px] text-slate-500 block mt-1">
                          Стискається в Base64 та зберігається прямо в PostgreSQL
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">ПІБ співробітника</label>
                    <input
                      type="text"
                      required
                      placeholder="Іван Мельник"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-slate-400 font-semibold block mb-1">Email / Логін для входу</label>
                      <input
                        type="email"
                        required
                        placeholder="ivan@agency.pro"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-slate-400 font-semibold">
                          {editingUserId ? 'Новий пароль' : 'Пароль для входу'}
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
                            let rand = '';
                            for (let i = 0; i < 6; i++) rand += chars.charAt(Math.floor(Math.random() * chars.length));
                            setFormData({ ...formData, password: `Ukr-${rand}!` });
                          }}
                          className="text-[10px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3 text-amber-400" />
                          <span>Згенерувати</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="Введіть або згенеруйте пароль"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500 font-mono"
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
                        <option value="Міжнародний рекрутинг">Міжнародний рекрутинг</option>
                        <option value="Супровід & Адаптація (LTV)">Супровід & Адаптація (LTV)</option>
                        <option value="Служба турботи">Служба турботи</option>
                        <option value="Керівництво">Керівництво</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 font-semibold block mb-1">Посада / Роль</label>
                      <input
                        type="text"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Permissions Checklist */}
                  <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-2">
                    <span className="font-bold text-slate-300 block mb-1">Права доступу працівника:</span>
                    
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
                      <span>Дозволити редагування угод та зміну етапів</span>
                    </label>

                    <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.canDeleteDeals}
                        onChange={(e) => setFormData({ ...formData, canDeleteDeals: e.target.checked })}
                        className="rounded bg-slate-800 border-slate-700"
                      />
                      <span className="text-rose-400 font-semibold">Дозволити ВИДАЛЕННЯ угод</span>
                    </label>

                    <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.canExportData}
                        onChange={(e) => setFormData({ ...formData, canExportData: e.target.checked })}
                        className="rounded bg-slate-800 border-slate-700"
                      />
                      <span>Дозволити експорт клієнтів в Excel</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{editingUserId ? 'Зберегти зміни' : 'Створити працівника та видати доступ'}</span>
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
