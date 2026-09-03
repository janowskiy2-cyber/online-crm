export interface InvoiceData {
  dealTitle: string;
  companyName: string;
  trancheNumber: number; // 1, 2, 3, 4
  tranchePercent: number; // 25
  totalDealBudget: number;
  dealId: string;
  contactName?: string;
  contactPhone?: string;
  contractNumber?: string;
  date?: string;
}

export function generateInvoiceHtml(data: InvoiceData): string {
  const trancheAmount = Math.round((data.totalDealBudget * data.tranchePercent) / 100) || 25000;
  const invoiceNum = `СФ-${data.dealId.slice(-4).toUpperCase()}-${data.trancheNumber}`;
  const today = data.date || new Date().toLocaleDateString('uk-UA');
  const contract = data.contractNumber || `РК-${data.dealId.slice(-4).toUpperCase()}/26`;

  const trancheDescriptions: Record<number, string> = {
    1: 'Авансовий платіж (25%) за запуск процедури рекрутингу та формування пулу кандидатів',
    2: 'Другий платіж (25%) після затвердження фінального списку кандидатів роботодавцем',
    3: 'Третій платіж (25%) після реєстрації та готовності робочих віз D / пакетів документів',
    4: 'Фінальний розрахунок (25%) після прибуття працівників на підприємство та виходу на зміну'
  };

  const desc = trancheDescriptions[data.trancheNumber] || `Оплата послуг підбору персоналу (${data.tranchePercent}%)`;

  return `
<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8">
  <title>Рахунок-фактура № ${invoiceNum}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 30px; color: #111; font-size: 13px; line-height: 1.4; }
    .header-table { width: 100%; border-bottom: 2px solid #222; padding-bottom: 12px; margin-bottom: 16px; }
    .title { font-size: 18px; font-weight: bold; margin: 20px 0 15px 0; }
    .requisites-table { width: 100%; margin-bottom: 20px; font-size: 12px; }
    .requisites-table td { padding: 4px 0; vertical-align: top; }
    .label { font-weight: bold; width: 130px; color: #555; }
    .items-table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 20px; }
    .items-table th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 8px; font-weight: bold; font-size: 12px; }
    .items-table td { border: 1px solid #cbd5e1; padding: 8px; font-size: 12px; }
    .total-block { width: 100%; text-align: right; margin-bottom: 25px; }
    .total-row { font-size: 15px; font-weight: bold; }
    .signatures { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px; }
    .stamp-box { border: 2px dashed #94a3b8; border-radius: 12px; width: 130px; height: 130px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 11px; text-align: center; }
    @media print {
      body { margin: 15mm; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="background: #0f172a; color: white; padding: 12px; border-radius: 8px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
    <div><strong>Офіційний рахунок сформовано CRM Pro</strong> (Транш №${data.trancheNumber} — ${data.tranchePercent}%)</div>
    <button onclick="window.print()" style="background: #2563eb; color: white; border: none; padding: 8px 18px; border-radius: 6px; font-weight: bold; cursor: pointer;">🖨️ Друкувати / Зберегти як PDF</button>
  </div>

  <table class="header-table">
    <tr>
      <td>
        <strong style="font-size: 16px; color: #1e3a8a;">ТОВ «ЮКРЕЙН ГЛОБАЛ РЕКРУТИНГ»</strong><br>
        <span style="font-size: 11px; color: #64748b;">Ліцензія на міжнародний рекрутинг та аутстафінг персоналу №1482-МЗ</span>
      </td>
      <td style="text-align: right; font-size: 11px; color: #475569;">
        м. Київ, вул. Хрещатик, 24, оф. 402<br>
        Тел: +380 (44) 390-12-88 | info@global-recruiting.pro
      </td>
    </tr>
  </table>

  <div class="title">РАХУНОК-ФАКТУРА № ${invoiceNum} від ${today} р.</div>

  <table class="requisites-table">
    <tr>
      <td class="label">Постачальник:</td>
      <td><strong>ТОВ «ЮКРЕЙН ГЛОБАЛ РЕКРУТИНГ»</strong>, ЄДРПОУ 43981204, ІПН 439812026551<br>
          р/р IBAN: <strong>UA213052990000026001234567890</strong> в АТ КБ «ПРИВАТБАНК», МФО 305299</td>
    </tr>
    <tr>
      <td class="label">Покупець:</td>
      <td><strong>${data.companyName || data.dealTitle}</strong>${data.contactPhone ? ` (Контакт: ${data.contactName || ''} ${data.contactPhone})` : ''}</td>
    </tr>
    <tr>
      <td class="label">Підстава:</td>
      <td>Договір про надання послуг з підбору персоналу № <strong>${contract}</strong></td>
    </tr>
  </table>

  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 30px;">№</th>
        <th>Найменування робіт / послуг</th>
        <th style="width: 60px;">Кіл-ть</th>
        <th style="width: 50px;">Од.</th>
        <th style="width: 110px;">Ціна без ПДВ</th>
        <th style="width: 110px;">Сума, грн</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="text-align: center;">1</td>
        <td>
          <strong>${desc}</strong><br>
          <span style="font-size: 10px; color: #64748b;">Проект: «${data.dealTitle}». Поетапний транш згідно умов договору.</span>
        </td>
        <td style="text-align: center;">1</td>
        <td style="text-align: center;">послуга</td>
        <td style="text-align: right;">${trancheAmount.toLocaleString('uk-UA')} ₴</td>
        <td style="text-align: right;"><strong>${trancheAmount.toLocaleString('uk-UA')} ₴</strong></td>
      </tr>
    </tbody>
  </table>

  <div class="total-block">
    <div>Разом без ПДВ: <strong>${trancheAmount.toLocaleString('uk-UA')} ₴</strong></div>
    <div>ПДВ (0% / не є платником): <strong>0,00 ₴</strong></div>
    <div class="total-row" style="margin-top: 5px;">Всього до сплати: <span style="color: #1e3a8a;">${trancheAmount.toLocaleString('uk-UA')} ₴</span></div>
  </div>

  <div style="font-size: 11px; margin-bottom: 30px; padding: 10px; background: #f8fafc; border-left: 3px solid #2563eb;">
    Оплата даного рахунку означає погодження з умовами виконання етапу робіт згідно з Договором №${contract}.
  </div>

  <div class="signatures">
    <div>
      <div>Керівник підприємства:</div>
      <div style="margin-top: 35px; border-top: 1px solid #000; width: 200px; text-align: center; font-size: 11px;">
        (підпис) Яновський І. В.
      </div>
    </div>
    <div class="stamp-box">
      М. П.<br>(Електронна печатка ТОВ)
    </div>
  </div>
</body>
</html>
`;
}

export function openPrintableInvoice(data: InvoiceData) {
  const html = generateInvoiceHtml(data);
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
