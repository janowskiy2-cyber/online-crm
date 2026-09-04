import React, { useState } from 'react';
import { 
  Globe2, 
  Copy, 
  Check, 
  Code2, 
  Share2, 
  Zap, 
  ExternalLink, 
  CheckCircle2, 
  ArrowRight,
  Sliders,
  Send,
  Layers,
  Sparkles
} from 'lucide-react';
import { api } from '../../services/api';

export const IntegrationsView: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [testLeadStatus, setTestLeadStatus] = useState<string | null>(null);
  const [loadingTest, setLoadingTest] = useState(false);

  // Form customizer state
  const [formTitle, setFormTitle] = useState('Залишити заявку на підбір персоналу');
  const [formButtonText, setFormButtonText] = useState('Отримати розрахунок вартості');
  const [includeHeadcount, setIncludeHeadcount] = useState(true);
  const [includeCompany, setIncludeCompany] = useState(true);

  const webhookUrl = `${window.location.origin.replace('vercel.app', 'onrender.com')}/api/webhooks/lead`;

  const copyToClipboard = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleSendTestLead = async () => {
    setLoadingTest(true);
    setTestLeadStatus(null);
    try {
      await api.post('/webhooks/lead', {
        name: 'Олег Васильович (Тест)',
        phone: '+380734277174',
        email: 'oleg.test@enterprise.ua',
        company: 'ТОВ «Агро-Переробка Тест»',
        headcount: '10',
        message: 'Потрібно 10 фасувальників з Узбекистану на завод',
        utm_source: 'Facebook Ads',
        utm_campaign: 'B2B Recruitment Summer 2026'
      });
      setTestLeadStatus('✅ Тестовий лід успішно надіслано та створено в CRM!');
      setTimeout(() => setTestLeadStatus(null), 5000);
    } catch (e) {
      setTestLeadStatus('❌ Помилка надсилання тестового ліда');
    } finally {
      setLoadingTest(false);
    }
  };

  const generatedEmbedCode = `<!-- Recruiting CRM Lead Form Widget -->
<div id="crm-lead-widget" style="max-width:440px;background:#111827;padding:24px;border-radius:16px;font-family:sans-serif;color:#fff;">
  <h3 style="margin-top:0;font-size:18px;font-weight:bold;">${formTitle}</h3>
  <form action="${webhookUrl}" method="POST">
    <input type="hidden" name="utm_source" value="Website Widget" />
    <div style="margin-bottom:12px;">
      <label style="font-size:12px;color:#94a3b8;display:block;margin-bottom:4px;">Ваше ім'я:</label>
      <input type="text" name="name" required placeholder="Іван Коваль" style="width:100%;padding:10px;border-radius:8px;border:1px solid #334155;background:#0f172a;color:#fff;box-sizing:border-box;" />
    </div>
    <div style="margin-bottom:12px;">
      <label style="font-size:12px;color:#94a3b8;display:block;margin-bottom:4px;">Номер телефону (WhatsApp):</label>
      <input type="tel" name="phone" required placeholder="+380 73 000 00 00" style="width:100%;padding:10px;border-radius:8px;border:1px solid #334155;background:#0f172a;color:#fff;box-sizing:border-box;" />
    </div>
    ${includeCompany ? `<div style="margin-bottom:12px;">
      <label style="font-size:12px;color:#94a3b8;display:block;margin-bottom:4px;">Компанія / Підприємство:</label>
      <input type="text" name="company" placeholder="ТОВ Завод" style="width:100%;padding:10px;border-radius:8px;border:1px solid #334155;background:#0f172a;color:#fff;box-sizing:border-box;" />
    </div>` : ''}
    ${includeHeadcount ? `<div style="margin-bottom:12px;">
      <label style="font-size:12px;color:#94a3b8;display:block;margin-bottom:4px;">Кількість працівників:</label>
      <input type="number" name="headcount" value="5" min="3" style="width:100%;padding:10px;border-radius:8px;border:1px solid #334155;background:#0f172a;color:#fff;box-sizing:border-box;" />
    </div>` : ''}
    <button type="submit" style="width:100%;padding:12px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-weight:bold;cursor:pointer;">
      ${formButtonText}
    </button>
  </form>
</div>`;

  return (
    <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto bitrix-wallpaper font-['Inter',sans-serif] select-none">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header (Bitrix24 Glassmorphism) */}
        <div className="bitrix-glass rounded-2xl p-6 shadow-2xl border border-white/10 backdrop-blur-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                  <Zap className="w-3 h-3" /> ADS HUB
                </span>
                <span className="text-xs text-slate-400 font-mono">Трафік & Лідогенерація</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                <span>Рекламні інтеграції та Вебхуки</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Автоматичний прийом заявок із Facebook Lead Ads, TikTok, Google Ads та сайтів (Tilda/WordPress)
              </p>
            </div>

            <button
              onClick={handleSendTestLead}
              disabled={loadingTest}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-lg shadow-emerald-600/30 active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{loadingTest ? 'Надсилання...' : 'Надіслати тестовий лід'}</span>
            </button>
          </div>
        </div>

        {testLeadStatus && (
          <div className="p-3.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-semibold text-center animate-in fade-in">
            {testLeadStatus}
          </div>
        )}

        {/* Universal Webhook Banner */}
        <div className="bitrix-glass rounded-2xl p-6 shadow-xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">Універсальний Webhook URL для реклами</span>
              <h3 className="text-base font-bold text-white mt-1">Прийом лідів із будь-яких джерел</h3>
            </div>
            <span className="text-[10px] bg-blue-500/20 text-blue-300 font-bold px-2 py-0.5 rounded-full">REST API / JSON</span>
          </div>

          <div className="flex items-center gap-2 bg-[#0a0e1a] p-3 rounded-2xl border border-slate-800 font-mono text-xs text-slate-300">
            <span className="flex-1 truncate text-emerald-400 font-semibold">{webhookUrl}</span>
            <button
              onClick={() => copyToClipboard('webhook', webhookUrl)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
            >
              {copiedKey === 'webhook' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'webhook' ? 'Скопійовано!' : 'Скопіювати'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
            <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800">
              <span className="font-bold text-blue-400 block mb-1">1. Facebook & Instagram Ads</span>
              <p className="text-slate-400 text-[11px]">
                Вставте Webhook URL у налаштування Facebook Lead Ads (через Zapier, Make або Webhook).
              </p>
            </div>
            <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800">
              <span className="font-bold text-purple-400 block mb-1">2. Tilda / WordPress сайти</span>
              <p className="text-slate-400 text-[11px]">
                У налаштуваннях форми сайту виберіть «Webhook» та вставте це посилання.
              </p>
            </div>
            <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800">
              <span className="font-bold text-amber-400 block mb-1">3. UTM-мітки</span>
              <p className="text-slate-400 text-[11px]">
                CRM автоматично фіксує <code className="text-slate-300 font-mono">utm_source</code> та бюджет клієнта.
              </p>
            </div>
          </div>
        </div>

        {/* Interactive Form Builder (Embed code for website) */}
        <div className="bitrix-glass rounded-2xl border border-white/10 p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">Конструктор форми заявки</span>
              <h3 className="text-base font-bold text-white mt-1">Готовий HTML-код віджета для вашого сайту</h3>
            </div>
            <button
              onClick={() => copyToClipboard('embed', generatedEmbedCode)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-blue-600/30"
            >
              {copiedKey === 'embed' ? <Check className="w-3.5 h-3.5" /> : <Code2 className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'embed' ? 'Код скопійовано!' : 'Скопіювати HTML-код форми'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Form Controls (5 cols) */}
            <div className="md:col-span-5 space-y-4 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Заголовок форми на сайті</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Текст на кнопці</label>
                <input
                  type="text"
                  value={formButtonText}
                  onChange={(e) => setFormButtonText(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeCompany}
                    onChange={(e) => setIncludeCompany(e.target.checked)}
                    className="rounded bg-slate-800"
                  />
                  <span>Поле «Компанія / Підприємство»</span>
                </label>

                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeHeadcount}
                    onChange={(e) => setIncludeHeadcount(e.target.checked)}
                    className="rounded bg-slate-800"
                  />
                  <span>Поле «Кількість працівників»</span>
                </label>
              </div>
            </div>

            {/* Live Visual Form Preview (7 cols) */}
            <div className="md:col-span-7 bg-[#0a0e1a] border border-slate-800 rounded-2xl p-6 flex flex-col justify-center items-center">
              <div className="w-full max-w-sm bg-[#111827] border border-slate-700/80 rounded-2xl p-5 shadow-2xl space-y-3.5 text-xs">
                <h4 className="font-bold text-white text-sm text-center">{formTitle}</h4>
                
                <div className="space-y-2">
                  <input
                    type="text"
                    disabled
                    placeholder="Ваше ім'я"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-slate-400 text-xs"
                  />
                  <input
                    type="text"
                    disabled
                    placeholder="Номер телефону (WhatsApp)"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-slate-400 text-xs"
                  />
                  {includeCompany && (
                    <input
                      type="text"
                      disabled
                      placeholder="Компанія / Підприємство"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-slate-400 text-xs"
                    />
                  )}
                  {includeHeadcount && (
                    <input
                      type="number"
                      disabled
                      value="5"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-slate-400 text-xs"
                    />
                  )}
                </div>

                <button
                  type="button"
                  className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs"
                >
                  {formButtonText}
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
