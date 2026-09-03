import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, Globe2, Eye, EyeOff, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { loginWithCredentials } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Будь ласка, введіть ваш робочий email та пароль.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await loginWithCredentials(email.trim(), password);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Невірний логін або пароль. Перевірте введені дані.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#070b13] flex items-center justify-center p-4 select-none font-['Inter',sans-serif] relative overflow-hidden">
      {/* High-End Ambient Backlight (Linear / Stripe style) */}
      <div className="absolute w-[700px] h-[700px] bg-blue-600/[0.07] rounded-full blur-[160px] pointer-events-none -top-40 -left-40" />
      <div className="absolute w-[600px] h-[600px] bg-indigo-600/[0.06] rounded-full blur-[140px] pointer-events-none -bottom-32 -right-32" />
      <div className="absolute w-full h-full bg-[radial-gradient(#ffffff05_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-40" />

      <div className="w-full max-w-[420px] bg-[#0c111d]/85 border border-white/[0.08] rounded-3xl p-8 sm:p-9 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl relative z-10 space-y-6">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2.5">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 p-[1px] shadow-xl shadow-blue-500/15 mb-0.5">
            <div className="w-full h-full bg-[#0c111d] rounded-2xl flex items-center justify-center">
              <Globe2 className="w-7 h-7 text-blue-400" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center justify-center gap-2">
              <span>Recruiting CRM</span>
              <span className="text-[10px] bg-emerald-500/15 text-emerald-400 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/25 tracking-wide">
                ENTERPRISE
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Міжнародний рекрутинг та управління контрактами
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Clean & Secure Email/Password Form */}
        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label className="text-slate-300 font-medium block mb-1.5">Робочий Email / Логін</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#080d17] border border-white/[0.08] focus:border-blue-500/80 rounded-2xl pl-10 pr-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none transition shadow-inner text-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-medium block mb-1.5">Пароль</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="Введіть ваш пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#080d17] border border-white/[0.08] focus:border-blue-500/80 rounded-2xl pl-10 pr-11 py-3 text-slate-100 placeholder-slate-500 focus:outline-none transition shadow-inner text-xs font-mono tracking-wider"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-400 hover:text-slate-300 transition">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0 w-3.5 h-3.5"
              />
              <span>Запам'ятати на цьому пристрої</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 transition shadow-lg shadow-blue-600/20 active:scale-[0.98] disabled:opacity-50"
          >
            <span>{loading ? 'Авторизація...' : 'Увійти в систему'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Security Footer */}
        <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">256-bit SSL Encryption</span>
          </div>
          <span>Neon Cloud Cluster</span>
        </div>
      </div>
    </div>
  );
};
