import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, Globe2, Eye, EyeOff, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export const LoginPage: React.FC = () => {
  const { loginWithCredentials } = useAuth();
  const { isDark, toggleTheme } = useTheme();
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
      setError(err?.message || err?.response?.data?.error || 'Невірний логін або пароль. Перевірте введені дані.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-slate-50 dark:bg-[#070b13] flex items-center justify-center p-4 select-none font-['Inter',sans-serif] relative overflow-hidden transition-colors duration-200">
      {/* High-End Ambient Mesh Glow (Linear / Stripe style) */}
      <div className="absolute w-[600px] h-[600px] bg-blue-500/[0.08] dark:bg-blue-600/[0.08] rounded-full blur-[140px] pointer-events-none -top-40 -left-40" />
      <div className="absolute w-[500px] h-[500px] bg-indigo-500/[0.06] dark:bg-indigo-600/[0.06] rounded-full blur-[130px] pointer-events-none -bottom-32 -right-32" />
      <div className="absolute w-full h-full bg-[radial-gradient(#00000008_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff05_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      {/* Top-Right Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-2 rounded-xl bg-white/80 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-sm transition active:scale-95 z-20"
        title={isDark ? 'Перемкнути на світлу тему' : 'Перемкнути на темну тему'}
      >
        {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
      </button>

      {/* Login Card Shell */}
      <div className="w-full max-w-[400px] bg-white/95 dark:bg-[#0c111d]/90 border border-slate-200/90 dark:border-white/[0.08] rounded-2xl p-7 sm:p-8 shadow-xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl relative z-10 space-y-6">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 p-[1px] shadow-lg shadow-blue-500/15 mb-0.5">
            <div className="w-full h-full bg-white dark:bg-[#0c111d] rounded-xl flex items-center justify-center">
              <Globe2 className="w-6 h-6 text-blue-600 dark:text-blue-400" strokeWidth={1.75} />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center justify-center gap-1.5">
              <span>Recruiting CRM</span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold px-2 py-0.2 rounded-full border border-emerald-500/20 tracking-wide">
                PRO
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Міжнародний рекрутинг та управління штатом
            </p>
          </div>
        </div>

        {/* Clean & Secure Email/Password Form */}
        <form onSubmit={handleLogin} className="space-y-3.5 text-xs">
          <div>
            <label className="text-slate-700 dark:text-slate-300 font-medium block mb-1">Робочий Email / Логін</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={1.75} />
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 rounded-xl pl-9 pr-3.5 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition text-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-700 dark:text-slate-300 font-medium block mb-1">Пароль</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={1.75} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="Введіть пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 rounded-xl pl-9 pr-10 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition text-xs font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 text-blue-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
              />
              <span>Запам'ятати на цьому пристрої</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-sm hover:shadow-md hover:shadow-blue-500/20 active:scale-95 disabled:opacity-50 mt-2"
          >
            <span>{loading ? 'Авторизація...' : 'Увійти в систему'}</span>
            <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        </form>

        {/* Security Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" strokeWidth={1.75} />
            <span className="text-slate-500 dark:text-slate-400">256-bit SSL</span>
          </div>
          <span>Neon PostgreSQL Cluster</span>
        </div>
      </div>
    </div>
  );
};
