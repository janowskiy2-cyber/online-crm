import React, { useState } from 'react';
import { 
  X, 
  ShieldAlert, 
  Check, 
  User as UserIcon, 
  Lock, 
  Eye, 
  Edit3, 
  Trash2, 
  Download, 
  Sliders
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { User } from '../../types';
import { DEFAULT_ADMIN_AVATAR } from '../../constants/defaultAvatar';

interface UserSwitcherModalProps {
  onClose: () => void;
}

export const UserSwitcherModal: React.FC<UserSwitcherModalProps> = ({ onClose }) => {
  const { currentUser, users, switchUser, updateUserPermissions } = useAuth();
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const departments = ['all', ...Array.from(new Set(users.map(u => u.department)))];

  const filteredUsers = selectedDept === 'all' 
    ? users 
    : users.filter(u => u.department === selectedDept);

  const handleSelectUser = async (user: User) => {
    await switchUser(user.id);
    onClose();
  };

  const handleTogglePermission = async (user: User, key: keyof User) => {
    const updatedVal = !user[key];
    await updateUserPermissions(user.id, { [key]: updatedVal });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 font-['Inter',sans-serif] select-none animate-in fade-in">
      <div className="bitrix-glass border border-white/15 rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden backdrop-blur-2xl">
        
        {/* Modal Header */}
        <div className="h-16 px-6 border-b border-white/10 flex items-center justify-between bg-white/[0.04] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Матриця прав та 20 ролей співробітників (RBAC)</span>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 font-extrabold px-2 py-0.5 rounded-full border border-purple-500/30">
                  SECURITY
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Перемикайтеся між користувачами для аудиту прав доступу та видимості угод
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Department Filter Tabs */}
        <div className="p-3 border-b border-white/10 bg-black/20 flex gap-1.5 overflow-x-auto flex-shrink-0">
          {departments.map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                selectedDept === dept
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 font-bold'
                  : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 border border-white/5'
              }`}
            >
              {dept === 'all' ? 'Всі 20 користувачів' : dept}
            </button>
          ))}
        </div>

        {/* Users List & Permission Matrix */}
        <div className="flex-1 p-6 overflow-y-auto space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredUsers.map((u) => {
              const isCurrent = u.id === currentUser?.id;
              const isEditing = u.id === editingUserId;

              return (
                <div
                  key={u.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isCurrent
                      ? 'bg-purple-900/30 border-purple-500/80 shadow-lg shadow-purple-500/15'
                      : 'bg-slate-900/60 border-white/10 hover:bg-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={u.avatar || DEFAULT_ADMIN_AVATAR}
                        alt={u.name}
                        className="w-11 h-11 rounded-full object-cover border-2 border-purple-500/40"
                      />
                      <div>
                        <div className="font-bold text-sm text-white flex items-center gap-2">
                          <span>{u.name}</span>
                          {isCurrent && (
                            <span className="text-[10px] bg-purple-500 text-white font-black px-1.5 py-0.5 rounded">
                              АКТИВЕН
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">
                          {u.department} • <span className="text-purple-400 font-semibold">{u.role}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingUserId(isEditing ? null : u.id)}
                        title="Настроить права"
                        className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg text-xs"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                      </button>
                      {!isCurrent && (
                        <button
                          onClick={() => handleSelectUser(u)}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition shadow-sm"
                        >
                          Войти
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Summary of Permissions */}
                  <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-800/80 text-[10px]">
                    <span className={`px-2 py-0.5 rounded ${u.canViewAllDeals ? 'bg-emerald-500/20 text-emerald-400' : u.canViewDeptDeals ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-400'}`}>
                      {u.canViewAllDeals ? 'Все сделки' : u.canViewDeptDeals ? 'Сделки отдела' : 'Только свои'}
                    </span>
                    {u.canEditDeals ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">Редактирование</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-500">Только чтение</span>
                    )}
                    {u.canDeleteDeals && (
                      <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400">Удаление</span>
                    )}
                    {u.canExportData && (
                      <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-400">Экспорт</span>
                    )}
                  </div>

                  {/* Expandable Permissions Editor */}
                  {isEditing && (
                    <div className="mt-3 p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
                      <div className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider mb-1">
                        Гранулярное управление правами:
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                          <input
                            type="checkbox"
                            checked={u.canViewAllDeals}
                            onChange={() => handleTogglePermission(u, 'canViewAllDeals')}
                            className="rounded bg-slate-800"
                          />
                          <span>Видеть все сделки</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                          <input
                            type="checkbox"
                            checked={u.canViewDeptDeals}
                            onChange={() => handleTogglePermission(u, 'canViewDeptDeals')}
                            className="rounded bg-slate-800"
                          />
                          <span>Видеть сделки отдела</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                          <input
                            type="checkbox"
                            checked={u.canEditDeals}
                            onChange={() => handleTogglePermission(u, 'canEditDeals')}
                            className="rounded bg-slate-800"
                          />
                          <span>Редактировать сделки</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                          <input
                            type="checkbox"
                            checked={u.canDeleteDeals}
                            onChange={() => handleTogglePermission(u, 'canDeleteDeals')}
                            className="rounded bg-slate-800"
                          />
                          <span>Удалять сделки</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                          <input
                            type="checkbox"
                            checked={u.canExportData}
                            onChange={() => handleTogglePermission(u, 'canExportData')}
                            className="rounded bg-slate-800"
                          />
                          <span>Экспорт данных</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                          <input
                            type="checkbox"
                            checked={u.canManageIntegrations}
                            onChange={() => handleTogglePermission(u, 'canManageIntegrations')}
                            className="rounded bg-slate-800"
                          />
                          <span>Управление интеграциями</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
