import React, { useState } from 'react';
import { X, FileText, Download, Send, Printer, CheckCircle2, Building2, User as UserIcon } from 'lucide-react';
import { Deal } from '../../types';

interface KPGeneratorModalProps {
  deal: Deal;
  onClose: () => void;
  onSendToWhatsApp?: (text: string) => void;
}

export const KPGeneratorModal: React.FC<KPGeneratorModalProps> = ({
  deal,
  onClose,
  onSendToWhatsApp
}) => {
  const [headcount, setHeadcount] = useState(5);
  const [profileType, setProfileType] = useState<'english' | 'russian'>('russian');
  const [pricePerWorker, setPricePerWorker] = useState(1200);
  const [isCopied, setIsCopied] = useState(false);

  const clientName = deal.contact?.name || 'Шановний партнер';
  const companyName = deal.company?.name || 'Ваше підприємство';

  const totalCost = headcount * pricePerWorker;
  const milestonePayment = totalCost * 0.25;

  const kpText = `Комерційна пропозиція: Прямий міжнародний найм персоналу
Клієнт: ${companyName} (${clientName})
Дата: ${new Date().toLocaleDateString('uk-UA')}

1. ПАРАМЕТРИ ЗАМОВЛЕННЯ:
• Профіль: ${profileType === 'russian' ? 'Російськомовні працівники (Центральна Азія / Узбекистан / Азербайджан)' : 'Англомовні фахівці (Індія / Азія / Африка)'}
• Кількість персоналу: ${headcount} осіб
• Строк виходу на об'єкт: ${profileType === 'russian' ? '1–2 місяці' : '3–4 місяці'}
• Оформлення: Офіційно у штат вашого підприємства (контракт на 1–2 роки)

2. БЮДЖЕТ ТА РОЗРАХУНОК:
• Вартість залучення 1 працівника «під ключ»: €${pricePerWorker}
• Загальна вартість проекту (${headcount} осіб): €${totalCost}
• Економіка: всього ~€70 на місяць за 1 укомплектоване робоче місце

3. БЕЗПЕЧНИЙ ГРАФІК ПЛАТЕЖІВ (4 рази по 25%):
- 25% (€${milestonePayment}): Підписання договору та старт оформлення
- 25% (€${milestonePayment}): Затвердження кандидатів після вашого інтерв'ю
- 25% (€${milestonePayment}): Отримання дозволу на роботу та робочої візи D
- 25% (€${milestonePayment}): Фактичне прибуття робітників на ваше підприємство

4. ГАРАНТІЯ ТА СУПРОВІД:
• 1 місяць супроводу персональним координатором (4 контакти)
• 1 безкоштовна гарантійна заміна у разі необхідності
• 100% легальність та повний пакет документів для Держпраці та ДПС`;

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(kpText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none font-['Inter',sans-serif]">
      <div className="bg-[#111827] border border-slate-700/80 rounded-3xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between bg-[#141b2d] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Генератор Комерційної Пропозиції (КП)</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full">PDF & Messenger Ready</span>
              </h2>
              <p className="text-xs text-slate-400">
                Автоматичне формування офіційної пропозиції під реквізити клієнта
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl transition"
              title="Друк / Зберегти як PDF"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 grid grid-cols-12 overflow-hidden">
          
          {/* Left Config Panel (4 cols) */}
          <div className="col-span-4 p-5 border-r border-slate-800/80 space-y-4 overflow-y-auto bg-[#0f1523] text-xs">
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Компанія клієнта</label>
              <div className="font-bold text-white p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-400" />
                <span className="truncate">{companyName}</span>
              </div>
            </div>

            <div>
              <label className="text-slate-400 font-semibold block mb-1">Контактна особа</label>
              <div className="font-bold text-white p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-indigo-400" />
                <span className="truncate">{clientName}</span>
              </div>
            </div>

            <div>
              <label className="text-slate-400 font-semibold block mb-1.5">Профіль персоналу</label>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setProfileType('russian');
                    setPricePerWorker(1200);
                  }}
                  className={`w-full p-2.5 rounded-xl border text-left transition ${
                    profileType === 'russian' ? 'bg-purple-600/20 border-purple-500 text-white font-bold' : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <div>Російськомовні (Центр. Азія)</div>
                  <div className="text-[10px] text-slate-400">€1 200 / особа (1-2 міс.)</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setProfileType('english');
                    setPricePerWorker(1000);
                  }}
                  className={`w-full p-2.5 rounded-xl border text-left transition ${
                    profileType === 'english' ? 'bg-blue-600/20 border-blue-500 text-white font-bold' : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <div>Англомовні (Індія, Азія, Африка)</div>
                  <div className="text-[10px] text-slate-400">€1 000 / особа (3-4 міс.)</div>
                </button>
              </div>
            </div>

            <div>
              <label className="text-slate-400 font-semibold block mb-1">Кількість працівників</label>
              <input
                type="number"
                min={3}
                max={200}
                value={headcount}
                onChange={(e) => setHeadcount(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-bold"
              />
            </div>

            <div className="pt-3 border-t border-slate-800 space-y-2">
              <button
                type="button"
                onClick={handleCopy}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition flex items-center justify-center gap-2"
              >
                {isCopied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <FileText className="w-4 h-4" />}
                <span>{isCopied ? 'Текст скопійовано!' : 'Копіювати текст КП'}</span>
              </button>

              {onSendToWhatsApp && (
                <button
                  type="button"
                  onClick={() => {
                    onSendToWhatsApp(kpText);
                    onClose();
                  }}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20"
                >
                  <Send className="w-4 h-4" />
                  <span>Відправити в WhatsApp клієнту</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Live Document Preview (8 cols) */}
          <div className="col-span-8 p-8 overflow-y-auto bg-slate-950 flex justify-center">
            <div className="w-full max-w-2xl bg-white text-slate-900 rounded-2xl p-8 shadow-2xl space-y-6 print:p-0 print:shadow-none text-xs font-sans">
              
              {/* Document Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-5">
                <div>
                  <div className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-1.5">
                    <span>МІЖНАРОДНИЙ НАЙМ ПЕРСОНАЛУ</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Офіційне залучення працівників у штат підприємства</p>
                </div>
                <div className="text-right text-[11px] text-slate-500">
                  <div className="font-bold text-slate-800">КОМЕРЦІЙНА ПРОПОЗИЦІЯ</div>
                  <div>№ КП-{deal.id.substring(0, 6).toUpperCase()}</div>
                  <div>{new Date().toLocaleDateString('uk-UA')}</div>
                </div>
              </div>

              {/* Client Info */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Роботодавець:</span>
                  <span className="font-bold text-slate-800 text-sm">{companyName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Контактна особа:</span>
                  <span className="font-bold text-slate-800 text-sm">{clientName}</span>
                </div>
              </div>

              {/* Main Service Description */}
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider border-b border-slate-100 pb-1">
                  1. Специфікація замовлення
                </h3>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 text-[11px]">
                      <th className="p-2.5 rounded-l-lg">Параметр</th>
                      <th className="p-2.5 rounded-r-lg">Умови</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    <tr>
                      <td className="p-2.5 text-slate-500">Профіль кандидатів:</td>
                      <td className="p-2.5 font-semibold text-slate-800">
                        {profileType === 'russian' ? 'Центральна Азія (Узбекистан / Азербайджан) — вільне володіння мовою' : 'Індія / Азія / Африка (Англомовні, супровід старшого)'}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 text-slate-500">Кількість працівників:</td>
                      <td className="p-2.5 font-bold text-blue-600">{headcount} осіб</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 text-slate-500">Строк до першого робочого дня:</td>
                      <td className="p-2.5 font-semibold text-slate-800">{profileType === 'russian' ? '1–2 місяці' : '3–4 місяці'}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 text-slate-500">Форма співпраці:</td>
                      <td className="p-2.5 font-semibold text-slate-800">Прямий офіційний найм у штат вашого бізнесу (1–2 роки)</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Pricing & 4-Stage Payment */}
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider border-b border-slate-100 pb-1">
                  2. Вартість та безпечний графік оплати (4 рази по 25%)
                </h3>
                <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 flex justify-between items-center mb-3">
                  <div>
                    <span className="text-xs text-slate-500">Загальний бюджет проекту ({headcount} осіб):</span>
                    <div className="text-2xl font-black text-blue-700">€{totalCost}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-500 block">Вартість на 1 працівника:</span>
                    <span className="font-bold text-slate-800 text-base">€{pricePerWorker}</span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                  <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                    <span className="font-bold text-blue-600 block text-xs">25% (€{milestonePayment})</span>
                    <span className="text-slate-600 font-semibold block mt-1">1. Запуск проекту</span>
                    <span className="text-slate-400 block mt-0.5">Підписання договору</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                    <span className="font-bold text-blue-600 block text-xs">25% (€{milestonePayment})</span>
                    <span className="text-slate-600 font-semibold block mt-1">2. Затвердження</span>
                    <span className="text-slate-400 block mt-0.5">Після інтерв'ю</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                    <span className="font-bold text-blue-600 block text-xs">25% (€{milestonePayment})</span>
                    <span className="text-slate-600 font-semibold block mt-1">3. Готовність візи</span>
                    <span className="text-slate-400 block mt-0.5">Дозвіл та віза D</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-emerald-300 bg-emerald-50">
                    <span className="font-bold text-emerald-600 block text-xs">25% (€{milestonePayment})</span>
                    <span className="text-slate-700 font-bold block mt-1">4. Вихід на зміну</span>
                    <span className="text-slate-500 block mt-0.5">Прибуття на завод</span>
                  </div>
                </div>
              </div>

              {/* Guarantees */}
              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1 leading-relaxed">
                <div className="font-bold text-slate-800">Гарантійні зобов'язання:</div>
                <p>• 1 місяць безперервного супроводу координатором (4 контрольні точки контролю адаптації).</p>
                <p>• 1 гарантійна заміна у разі невідповідності кандидата узгодженим критеріям.</p>
                <p>• Повний юридичний супровід та відсутність ризиків при перевірках контролюючих органів.</p>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
