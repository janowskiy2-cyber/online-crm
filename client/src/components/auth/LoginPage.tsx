import React, { useState } from 'react';
import { Kanban, Lock, Mail, ArrowRight, ShieldCheck, UserCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { users, loginWithCredentials, switchUser } = useAuth();
  const [email, setEmail] = useState('ceo@crm-online.pro');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'form' | 'quick'>('form');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginWithCredentials(email, password);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Неверный email или пароль (по умолчанию: 123456)');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (userId: string) => {
    setLoading(true);
    try {
      await switchUser(userId);
    } catch (err) {
      setError('Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#0b0f19] flex items-center justify-center p-4 select-none font-['Inter',sans-serif]">
      {/* Background Glow */}
      <div className="absolute w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none -top-20 -left-20" />
      <div className="absolute w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -bottom-20 -right-20" />

      <div className="w-full max-w-xl bg-[#111827] border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30 mb-1">
            <Kanban className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Online CRM</span>
            <span className="text-xs bg-blue-500/20 text-blue-400 font-bold px-2 py-0.5 rounded-lg border border-blue-500/30">amoPRO</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-sm">
            Корпоративная CRM-система для 20 пользователей с мессенджерами WhatsApp и Telegram
          </p>
        </div>

        {/* Tab switcher: Standard Login vs Quick 20 Roles */}
        <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-2xl text-xs font-bold">
          <button
            onClick={() => setActiveTab('form')}
            className={`flex-1 py-2 rounded-xl transition ${activeTab === 'form' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'text-slate-400 hover:text-white'}`}
          >
            Вход по паролю
          </button>
          <button
            onClick={() => setActiveTab('quick')}
            className={`flex-1 py-2 rounded-xl transition ${activeTab === 'quick' ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20' : 'text-slate-400 hover:text-white'}`}
          >
            Выбор из 20 ролей (Демо)
          </button>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Standard Form Login */}
        {activeTab === 'form' ? (
          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="text-slate-400 font-semibold block mb-1.5">Email сотрудника</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="ceo@crm-online.pro"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-400 font-semibold block mb-1.5">Пароль (по умолчанию: 123456)</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-blue-600/30 active:scale-[0.99]"
            >
              <span>{loading ? 'Вход в систему...' : 'Войти в CRM'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          /* Quick 20 Users List */
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {users.map((u) => (
              <div
                key={u.id}
                onClick={() => handleQuickLogin(u.id)}
                className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-900/60 hover:bg-slate-800/90 border border-slate-800 hover:border-purple-500/50 cursor-pointer transition"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                    alt={u.name}
                    className="w-9 h-9 rounded-full object-cover border border-slate-700"
                  />
                  <div>
                    <div className="font-bold text-xs text-white">{u.name}</div>
                    <div className="text-[10px] text-slate-400">
                      {u.department} • <span className="text-purple-400 font-semibold">{u.role}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="px-3 py-1 bg-purple-600/20 text-purple-300 border border-purple-500/30 rounded-xl text-[11px] font-bold"
                >
                  Войти
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Footer Security Badge */}
        <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>20 ролей RBAC защита</span>
          </div>
          <span>Пароль для всех по умолчанию: <b>123456</b></span>
        </div>
      </div>
    </div>
  );
};
