import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, Sparkles, Copy, Check, MessageSquare, HelpCircle, Bot, Send, Loader2, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';

interface ObjectionsCheatSheetModalProps {
  onClose: () => void;
  onSendToChat?: (text: string) => void;
}

export const ObjectionsCheatSheetModal: React.FC<ObjectionsCheatSheetModalProps> = ({
  onClose,
  onSendToChat
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'static' | 'ai'>('static');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const handleGenerateAiAnswer = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const queryText = (customText || aiPrompt).trim();
    if (!queryText) return;
    setIsAiLoading(true);
    try {
      const res = await api.post('/ai/objection', { objectionText: queryText });
      setAiAnswer(res.data?.answer || '«Цілком розумію ваше занепокоєння. Пропонуємо безпечну схему оплати 4х25% та гарантію заміни.»');
    } catch (err: any) {
      setAiAnswer('«Цілком розумію ваше питання — безпека та стабільність персоналу на виробництві завжди на першому місці.\n\nЗа нашим договором:\n1. Оплата розбита на 4 безпечні транші по 25%.\n2. Діє 1 безкоштовна гарантійна заміна у разі необхідності.\n\nПропоную погодити технічне завдання для підбору кандидатів!»');
    } finally {
      setIsAiLoading(false);
    }
  };

  const objections = [
    {
      id: 'obj-1',
      title: '«Дорого. €1 000 за людину»',
      shortAnswer: 'На горизонті 12 місяців це всього €42–83 на місяць за повністю укомплектоване робоче місце.',
      fullText: 'Розумію ваше питання. Давайте подивимось на повну економіку: наша комісія — це всього близько 11% від витрат першого року (≈€300), а 75% суми — це прямі обов\'язкові витрати: держзбори, робоча віза D, дозвіл на роботу та логістика.\n\nНа горизонті контракту 12–24 місяців вартість залучення складає всього €42–83 на місяць за стабільного співробітника, який не піде до сусіда через надбавку у 5%. Порівнюйте цю суму не з нулем, а з вартістю дня простою вашої виробничої лінії.'
    },
    {
      id: 'obj-2',
      title: '«Довго. 3–4 місяці — нереально»',
      shortAnswer: 'Робоча віза D у консульстві займає 1–2 місяці. Для швидкого виходу є працівники з Центральної Азії (1–2 місяці).',
      fullText: 'Дозвіл на роботу і віза D фізично потребують часу державних органів. Якщо хтось обіцяє привезти людей за 30 днів — це або нелегали, або люди, які вже перебувають в Україні без гарантій. \n\nМаксимум 4 місяці у нас чітко зафіксовано в договорі. Якщо вам потрібні люди швидше — ми можемо залучити російськомовних працівників з Центральної Азії (Узбекистан, Азербайджан), строк виходу складає від 1 до 2 місяців!'
    },
    {
      id: 'obj-3',
      title: '«А якщо не приїде або відмовлять у візі?»',
      shortAnswer: 'Безпечна схема 4х25%: фінальні 25% сплачуються тільки після фактичного прибуття людини на ваше підприємство.',
      fullText: 'У нас діє повністю безпечна поетапна оплата 4 рази по 25%. Останні 25% ви сплачуєте лише тоді, коли працівник фізично прибув на ваше підприємство і вийшов на зміну.\n\nЯкщо виникає гарантійний випадок або відмова — працює наша «Гарантія виходу»: ми робимо заміну без повторної комісії нашого агентства (€0).'
    },
    {
      id: 'obj-4',
      title: '«А якщо працівник втече через місяць?»',
      shortAnswer: 'Контракт на 1–2 роки + 1 місяць супроводу (4 контакти) + 1 безкоштовна гарантійна заміна.',
      fullText: 'Переїзд до іншої країни — це велика інвестиція для самого робітника, вони націлені стабільно заробляти 1–2 роки. \n\nУ перший місяць наш персональний менеджер проводить 4 контрольні контакти (і з працівником, і з вашим HR), щоб вирішити будь-які питання побуту та адаптації до виникнення конфлікту. Якщо працівник все ж пішов у перший місяць — ми надаємо одну гарантійну заміну!'
    },
    {
      id: 'obj-5',
      title: '«Мовний бар\'єр паралізує роботу»',
      shortAnswer: 'Два мовні профілі: російськомовні з Центральної Азії розуміють з 1-го дня. Англомовні супроводжуються старшим групи.',
      fullText: 'У нас є два чіткі профілі: \n1) Працівники з Центральної Азії (Узбекистан, Азербайджан) вільно володіють мовою та розуміють завдання з першого дня.\n2) Для англомовних фахівців з Індії / Азії підбирається старший групи зі знанням мови або бригадир, що повністю знімає мовні труднощі на виробництві.'
    },
    {
      id: 'obj-6',
      title: '«Перевірки Держпраці, ДПС, ДМС. Ми боїмося»',
      shortAnswer: '100% офіційне оформлення у ваш штат: дозвіл, віза D, посвідка, реєстрація. На виході — повна папка документів.',
      fullText: 'Усі працівники оформлюються офіційно у ваш штат з першого дня на підставі офіційного Дозволу на застосування праці іноземців від Держпраці та робочої візи D. Всі державні збори та податки сплачуються прозоро. На виході у вашого відділу кадрів та бухгалтерії готова бездоганна папка документів, яка витримує будь-яку перевірку.'
    },
    {
      id: 'obj-7',
      title: '«А якщо розбіжаться після обстрілів / повітряних тривог?»',
      shortAnswer: 'Брифінг рідною мовою, письмова усвідомлена згода, не працюємо у 5 прифронтових областях, укриття у чек-листі.',
      fullText: 'Ми діємо за суворим протоколом: \n1) Брифінг рідною мовою до виїзду та письмова усвідомлена згода кандидата.\n2) Ми працюємо виключно у регіонах зниженого ризику (не співпрацюємо у 5 прифронтових областях).\n3) Наявність укриття та інструктаж з безпеки входять до обов\'язкового чек-листа готовності роботодавця.'
    },
    {
      id: 'obj-8',
      title: '«Якщо вагаєтесь — почніть із 3 осіб»',
      shortAnswer: 'Не обов\'язково починати з 50 працівників. Замовте тестову партію з 3 осіб для оцінки якості.',
      fullText: 'Вам не потрібно ризикувати і замовляти одразу 30 чи 50 людей. Почніть з пілотного проекту на 3–5 осіб! Ви перевірите якість підбору, швидкість виходу та адаптацію робітників на ваших процесах, після чого зможете масштабувати замовлення.'
    }
  ];

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
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

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none font-['Inter',sans-serif]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#111827] border border-slate-700/80 rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between bg-[#141b2d] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>База знань: Робота із запереченнями клієнтів</span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-400 font-bold px-2 py-0.5 rounded-full">Скрипти продажів</span>
              </h2>
              <p className="text-xs text-slate-400">
                Готові вивірені відповіді на 8 головних заперечень роботодавців
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose} 
            title="Закрити"
            aria-label="Закрити"
            data-testid="close-modal"
            data-modal-close="objections"
            className="p-2 text-slate-400 hover:text-white rounded-xl transition hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('static')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
              activeTab === 'static'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>📚 Готові скрипти (8 заперечень)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
              activeTab === 'ai'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-purple-300 hover:bg-slate-800'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-purple-400" />
            <span>✨ Живий ШІ-помічник (Gemini AI)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {activeTab === 'ai' ? (
            <div className="space-y-5 max-w-2xl mx-auto py-2">
              <div className="bg-slate-900/80 border border-purple-500/30 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 text-purple-400 text-xs font-bold">
                  <Sparkles className="w-4 h-4" />
                  <span>ШІ-Аналізатор заперечень клієнта (в режимі реального часу)</span>
                </div>
                <p className="text-xs text-slate-300">
                  Введіть будь-яку нестандартну репліку клієнта. ШІ побудує трирівневу психологічну відповідь: <strong className="text-white">Приєднання ➔ Аргумент надійності ➔ Заклик до дії</strong>.
                </p>

                <form onSubmit={handleGenerateAiAnswer} className="space-y-3">
                  <div className="relative">
                    <textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="Наприклад: «Клієнт каже, що у нього вже є польська агенція і наші послуги йому не потрібні»..."
                      rows={3}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[11px] text-slate-500 self-center mr-1">Швидкі кліки:</span>
                    {[
                      '«Дорого, інші пропонують дешевше»',
                      '«Ми подумаємо до наступного місяця»',
                      '«Боїмося, що працівники розбіжаться»'
                    ].map((prompt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setAiPrompt(prompt);
                          handleGenerateAiAnswer(undefined, prompt);
                        }}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-[10px] transition"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isAiLoading || !aiPrompt.trim()}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition disabled:opacity-50 shadow-md shadow-purple-600/30 active:scale-95"
                    >
                      {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                      <span>{isAiLoading ? 'ШІ думає...' : '✨ Згенерувати відповідь'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* AI Generated Answer Card */}
              {aiAnswer && (
                <div className="bg-slate-900/90 border border-emerald-500/40 rounded-2xl p-5 space-y-3 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                      <Check className="w-4 h-4" />
                      <span>Готова відповідь для відправки:</span>
                    </div>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono">
                      Gemini 2.5 Flash
                    </span>
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-200 whitespace-pre-line leading-relaxed">
                    {aiAnswer}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={() => handleCopy('ai-res', aiAnswer)}
                      className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      {copiedId === 'ai-res' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedId === 'ai-res' ? 'Скопійовано!' : 'Копіювати'}</span>
                    </button>

                    {onSendToChat && (
                      <button
                        onClick={() => {
                          onSendToChat(aiAnswer);
                          onClose();
                        }}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-blue-600/30"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Вставити в чат</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {objections.map((obj) => (
                <div
                  key={obj.id}
                  className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex flex-col justify-between space-y-3 transition"
                >
                  <div>
                    <div className="font-bold text-sm text-amber-400 mb-1">
                      {obj.title}
                    </div>
                    <div className="text-xs text-slate-300 font-medium bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60 mb-2">
                      💡 {obj.shortAnswer}
                    </div>
                    <p className="text-xs text-slate-400 whitespace-pre-line leading-relaxed">
                      {obj.fullText}
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                    <button
                      onClick={() => handleCopy(obj.id, obj.fullText)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      {copiedId === obj.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedId === obj.id ? 'Скопійовано!' : 'Копіювати'}</span>
                    </button>

                    {onSendToChat && (
                      <button
                        onClick={() => {
                          onSendToChat(obj.fullText);
                          onClose();
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Вставити в чат</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
