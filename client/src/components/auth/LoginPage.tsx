import React, { useState } from 'react';
import { Kanban, Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, Globe2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { loginWithCredentials } = useAuth();
  const [email, setEmail] = useState('admin@crm.pro');
  const [password, setPassword] = useState('22222222');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginWithCredentials(email, password);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Невірний логін або пароль. Перевірте введені дані.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#080c14] flex items-center justify-center p-4 select-none font-['Inter',sans-serif]">
      {/* Ambient Glows */}
      <div className="absolute w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none -top-28 -left-28" />
      <div className="absolute w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none -bottom-28 -right-28" />

      <div className="w-full max-w-md bg-[#0f1422]/90 border border-slate-800/90 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative z-10 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 flex items-center justify-center shadow-xl shadow-blue-500/20 mb-1 border border-blue-400/30">
            <Globe2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Recruiting CRM</span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-lg border border-emerald-500/30">PRO</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-xs">
            Корпоративна система міжнародного найму та управління угодами
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Real Email/Password Form */}
        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label className="text-slate-400 font-semibold block mb-1.5">Email / Логін співробітника</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="manager@crm.pro або admin@crm.pro"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-2xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition shadow-inner"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-slate-400 font-semibold">Пароль для входу</label>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-2xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition shadow-inner"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-blue-600/30 active:scale-[0.99]"
          >
            <span>{loading ? 'Перевірка доступу...' : 'Увійти в CRM'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Footer info */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Захищений вхід</span>
          </div>
          <span className="text-slate-500">Адмін: <b>admin@crm.pro / 22222222</b></span>
        </div>
      </div>
    </div>
  );
};
