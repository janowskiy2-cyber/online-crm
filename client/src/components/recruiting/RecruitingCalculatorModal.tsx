import React, { useState, useEffect } from 'react';
import { X, Calculator, Download, Send, CheckCircle2, FileText, Globe2, Users, DollarSign } from 'lucide-react';

interface RecruitingCalculatorModalProps {
  onClose: () => void;
  onApplyToDeal?: (calcData: any) => void;
}

export const RecruitingCalculatorModal: React.FC<RecruitingCalculatorModalProps> = ({
  onClose,
  onApplyToDeal
}) => {
  const [profileType, setProfileType] = useState<'english' | 'russian'>('russian');
  const [country, setCountry] = useState('Узбекистан / Азербайджан');
  const [headcount, setHeadcount] = useState(5);
  const [salaryPerWorker, setSalaryPerWorker] = useState(900); // in EUR
  const [contractMonths, setContractMonths] = useState(12);

  // Pricing formula based on tariff grid
  let pricePerWorker = 1000;
  if (profileType === 'english') {
    if (headcount >= 51) pricePerWorker = 850;
    else if (headcount >= 11) pricePerWorker = 900;
    else pricePerWorker = 1000;
  } else {
    // Russian speaking / Central Asia
    if (headcount >= 51) pricePerWorker = 1050;
    else if (headcount >= 11) pricePerWorker = 1100;
    else pricePerWorker = 1200;
  }

  const totalRecruitingCost = pricePerWorker * headcount;
  const milestonePayment = totalRecruitingCost * 0.25; // 25% per stage

  // Monthly cost per equipped workplace
  const costPerMonthPerPlace = Math.round(pricePerWorker / contractMonths);

  const formatEUR = (val: number) => `€${new Intl.NumberFormat('ru-RU').format(val)}`;

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
      <div className="bg-[#111827] border border-slate-700/80 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between bg-[#141b2d]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Калькулятор міжнародного найму персоналу</span>
                <span className="text-[10px] bg-blue-500/20 text-blue-400 font-bold px-2 py-0.5 rounded-full">Тарифна сітка</span>
              </h2>
              <p className="text-xs text-slate-400">
                Розрахунок вартості залучення робітників з Азії, Африки та Центральної Азії
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose} 
            title="Закрити"
            aria-label="Закрити"
            data-testid="close-modal"
            data-modal-close="calculator"
            className="p-2 text-slate-400 hover:text-white rounded-xl transition hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 text-xs">
          {/* Left Inputs (6 cols) */}
          <div className="md:col-span-6 space-y-4">
            {/* Profile Selection */}
            <div>
              <label className="text-slate-400 font-semibold block mb-1.5">Мовний профіль кандидатів</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setProfileType('russian');
                    setCountry('Узбекистан / Азербайджан');
                    setSalaryPerWorker(900);
                  }}
                  className={`p-3 rounded-2xl border text-left transition ${
                    profileType === 'russian'
                      ? 'bg-purple-600/20 border-purple-500 text-white shadow-md'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="font-bold">Російськомовні</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Центральна Азія (1–2 міс.)</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setProfileType('english');
                    setCountry('Індія / Азія / Африка');
                    setSalaryPerWorker(600);
                  }}
                  className={`p-3 rounded-2xl border text-left transition ${
                    profileType === 'english'
                      ? 'bg-blue-600/20 border-blue-500 text-white shadow-md'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="font-bold">Англомовні</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Індія, Азія, Африка (3–4 міс.)</div>
                </button>
              </div>
            </div>

            {/* Headcount */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-slate-400 font-semibold">Кількість працівників у замовленні</label>
                <span className="font-bold text-amber-400 text-sm">{headcount} осіб</span>
              </div>
              <input
                type="range"
                min={3}
                max={100}
                value={headcount}
                onChange={(e) => setHeadcount(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>від 3 осіб (Мінімум)</span>
                <span>10 осіб</span>
                <span>50 осіб</span>
                <span>100+ осіб</span>
              </div>
            </div>

            {/* Country and Salary */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Країна походження</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Зарплата працівника</label>
                <input
                  type="number"
                  value={salaryPerWorker}
                  onChange={(e) => setSalaryPerWorker(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>
            </div>

            {/* Transparent Cost Breakdown from Slide 7 */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 space-y-2">
              <div className="font-bold text-slate-300 flex items-center justify-between text-[11px]">
                <span>Структура собівартості на 1 особу:</span>
                <span className="text-emerald-400 font-bold">{formatEUR(pricePerWorker)}</span>
              </div>
              <div className="space-y-1 text-[11px] text-slate-400 divide-y divide-slate-800/40">
                <div className="flex justify-between py-0.5">
                  <span>Підбір, скринінг у країні походження:</span>
                  <span className="text-slate-200">€200</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span>Дозвіл на роботу + держзбір НБУ (6 міс):</span>
                  <span className="text-slate-200">€296</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span>Робоча віза D та координація документів:</span>
                  <span className="text-slate-200">€100</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span>Логістика кордону, Молдова ➔ Одеса:</span>
                  <span className="text-slate-200">€244</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span>Супровід 1 міс + гарантія заміни:</span>
                  <span className="text-slate-200">€60</span>
                </div>
                <div className="flex justify-between py-0.5 font-bold text-blue-400">
                  <span>Комісія агентства (після виходу):</span>
                  <span>≈€300</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Summary & 4-Stage Payment Schedule (6 cols) */}
          <div className="md:col-span-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="bg-gradient-to-br from-blue-900/40 to-indigo-950/40 border border-blue-500/30 rounded-3xl p-5 shadow-lg">
                <div className="text-slate-400 text-xs font-semibold">Загальна вартість залучення ({headcount} осіб):</div>
                <div className="text-3xl font-black text-emerald-400 my-1">
                  {formatEUR(totalRecruitingCost)}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-300">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                    {formatEUR(costPerMonthPerPlace)} / міс
                  </span>
                  <span>за 1 укомплектоване робоче місце</span>
                </div>
              </div>

              {/* 4-Stage Payment Schedule (25% / 25% / 25% / 25%) */}
              <div className="space-y-2">
                <div className="font-bold text-white text-xs uppercase tracking-wider flex items-center justify-between">
                  <span>Безпечна схема платежів (4 етапи):</span>
                  <span className="text-[10px] text-emerald-400">Без ризику</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl">
                    <div className="font-bold text-blue-400 flex justify-between">
                      <span>1. Запуск</span>
                      <span>25% ({formatEUR(milestonePayment)})</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Підписання договору, старт оформлення</p>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl">
                    <div className="font-bold text-cyan-400 flex justify-between">
                      <span>2. Кандидати</span>
                      <span>25% ({formatEUR(milestonePayment)})</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Затвердження людей після інтерв'ю</p>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl">
                    <div className="font-bold text-amber-400 flex justify-between">
                      <span>3. Віза D</span>
                      <span>25% ({formatEUR(milestonePayment)})</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Готовність документів, віза, виїзд</p>
                  </div>

                  <div className="bg-slate-900 border border-emerald-500/40 p-3 rounded-2xl bg-emerald-950/20">
                    <div className="font-bold text-emerald-400 flex justify-between">
                      <span>4. Вихід</span>
                      <span>25% ({formatEUR(milestonePayment)})</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Прибуття на ваше підприємство</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (onApplyToDeal) {
                    onApplyToDeal({
                      budget: totalRecruitingCost,
                      headcount,
                      pricePerWorker,
                      profileType,
                      country,
                      milestonePayment
                    });
                  }
                  onClose();
                }}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition shadow-md shadow-blue-600/30"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Застосувати розрахунок до угоди</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
