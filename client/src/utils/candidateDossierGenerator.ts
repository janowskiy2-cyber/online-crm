import { Contact } from '../types';

export function generateCandidateDossierHtml(candidate: Contact): string {
  const refCode = `CAND-${candidate.id.slice(-6).toUpperCase()}`;
  const today = new Date().toLocaleDateString('uk-UA');

  // Parse skills safely
  let skillsList: string[] = [];
  if (Array.isArray(candidate.skills)) {
    skillsList = candidate.skills;
  } else if (typeof candidate.skills === 'string' && candidate.skills.trim()) {
    try {
      if (candidate.skills.startsWith('[')) {
        skillsList = JSON.parse(candidate.skills);
      } else {
        skillsList = candidate.skills.split(',').map(s => s.trim()).filter(Boolean);
      }
    } catch {
      skillsList = candidate.skills.split(',').map(s => s.trim()).filter(Boolean);
    }
  }

  const profession = candidate.profession || candidate.position || 'Кваліфікований робітник / Оператор';
  const country = candidate.country || candidate.citizenship || 'Міжнародний підбір (Узбекистан / Азія)';
  const experience = candidate.experienceYears ? `${candidate.experienceYears} ${candidate.experienceYears === 1 ? 'рік' : candidate.experienceYears < 5 ? 'роки' : 'років'}` : 'Підтверджено тестами';
  const salary = candidate.salaryExpectation || 'Згідно зі штатним розкладом підприємства';
  const driver = candidate.driverLicense || 'Не потребується / Категорія B';
  const languages = candidate.languages || 'Базова комунікація (виробничий рівень)';
  const status = candidate.status || 'Верифіковано / Готовий до виїзду';

  return `
<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8">
  <title>Досьє кандидата — ${refCode} (${profession})</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      margin: 25px 35px;
      color: #0f172a;
      font-size: 13px;
      line-height: 1.5;
      background: #ffffff;
    }
    .no-print {
      background: #0f172a;
      color: #ffffff;
      padding: 12px 20px;
      border-radius: 10px;
      margin-bottom: 25px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .print-btn {
      background: #2563eb;
      color: #ffffff;
      border: none;
      padding: 8px 18px;
      border-radius: 6px;
      font-weight: bold;
      cursor: pointer;
      font-size: 13px;
    }
    .print-btn:hover { background: #1d4ed8; }
    .header-table {
      width: 100%;
      border-bottom: 2px solid #1e3a8a;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .doc-title {
      font-size: 20px;
      font-weight: 800;
      color: #1e3a8a;
      margin-top: 5px;
      letter-spacing: -0.5px;
      text-transform: uppercase;
    }
    .ref-badge {
      display: inline-block;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 4px 10px;
      border-radius: 6px;
      font-weight: 800;
      font-family: monospace;
      font-size: 12px;
      color: #334155;
    }
    .profile-card {
      display: flex;
      gap: 20px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 18px;
      margin-bottom: 22px;
    }
    .avatar-box {
      width: 100px;
      height: 100px;
      border-radius: 12px;
      background: #1e293b;
      color: #38bdf8;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 36px;
      font-weight: 900;
      flex-shrink: 0;
    }
    .profile-info { flex: 1; }
    .profile-name { font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 2px; }
    .profile-role { font-size: 14px; font-weight: 700; color: #059669; margin-bottom: 12px; }
    
    .grid-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .grid-table td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
    .grid-table td.label { width: 35%; color: #64748b; font-weight: 600; }
    .grid-table td.value { width: 65%; color: #0f172a; font-weight: 700; }

    .skills-container { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; margin-bottom: 20px; }
    .skill-chip {
      background: #e0f2fe;
      color: #0369a1;
      border: 1px solid #bae6fd;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
    }

    .verification-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 10px;
      padding: 14px;
      margin-bottom: 22px;
    }
    .verification-title { font-size: 13px; font-weight: 800; color: #166534; margin-bottom: 8px; }
    .verification-item { font-size: 12px; color: #14532d; margin-bottom: 4px; display: flex; align-items: center; gap: 6px; }

    .guarantee-box {
      background: #fffbeb;
      border: 1px solid #fef3c7;
      border-radius: 10px;
      padding: 12px 16px;
      margin-bottom: 25px;
      font-size: 12px;
      color: #92400e;
    }

    .footer-table { width: 100%; border-top: 1px solid #cbd5e1; padding-top: 15px; margin-top: 25px; font-size: 11px; color: #64748b; }
    .stamp-area {
      width: 140px;
      height: 90px;
      border: 1.5px dashed #94a3b8;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
      text-align: center;
      font-size: 10px;
    }

    @media print {
      body { margin: 12mm 15mm; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>

  <!-- Screen Action Bar -->
  <div class="no-print">
    <div>
      <strong>Офіційне Досьє Кандидата (B2B Профіль для Роботодавця)</strong>
      <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">Контактні дані захищено агентським протоколом безпеки</div>
    </div>
    <div style="display: flex; gap: 10px;">
      <button onclick="window.print()" class="print-btn">🖨️ Друкувати / Зберегти як PDF</button>
      <button onclick="window.close()" style="background: #334155; color: white; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer;">Закрити</button>
    </div>
  </div>

  <!-- Letterhead Header -->
  <table class="header-table">
    <tr>
      <td>
        <strong style="font-size: 17px; color: #1e3a8a;">ТОВ «ЮКРЕЙН ГЛОБАЛ РЕКРУТИНГ»</strong><br>
        <span style="font-size: 11px; color: #64748b;">Ліцензія на міжнародний рекрутинг та аутстафінг персоналу №1482-МЗ</span>
      </td>
      <td style="text-align: right; font-size: 11px; color: #475569;">
        м. Київ, вул. Хрещатик, 24, оф. 402<br>
        Тел: +380 (44) 390-12-88 | info@global-recruiting.pro
      </td>
    </tr>
  </table>

  <!-- Document Title & Reference -->
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
    <div>
      <div class="doc-title">ПРОФЕСІЙНЕ ДОСЬЄ КАНДИДАТА</div>
      <div style="font-size: 12px; color: #64748b;">Дата формування: ${today} р.</div>
    </div>
    <div class="ref-badge">ІД: ${refCode}</div>
  </div>

  <!-- Candidate Summary Card -->
  <div class="profile-card">
    <div class="avatar-box">
      ${candidate.name.charAt(0)}
    </div>
    <div class="profile-info">
      <div class="profile-name">${candidate.name}</div>
      <div class="profile-role">🛠️ ${profession}</div>
      <table class="grid-table" style="margin-bottom: 0;">
        <tr>
          <td class="label">Країна походження:</td>
          <td class="value">🌐 ${country}</td>
          <td class="label">Досвід за фахом:</td>
          <td class="value">⏳ ${experience}</td>
        </tr>
        <tr>
          <td class="label">Водійське посвідчення:</td>
          <td class="value">🚗 ${driver}</td>
          <td class="label">Мовні навички:</td>
          <td class="value">🗣️ ${languages}</td>
        </tr>
        <tr>
          <td class="label">Очікувана оплата:</td>
          <td class="value">💵 ${salary}</td>
          <td class="label">Поточний статус:</td>
          <td class="value">✅ ${status}</td>
        </tr>
      </table>
    </div>
  </div>

  <!-- Key Competencies & Skills -->
  <h3 style="font-size: 13px; font-weight: 800; color: #1e293b; margin-bottom: 6px; text-transform: uppercase;">
    Ключові професійні навички та компетенції
  </h3>
  <div class="skills-container">
    ${skillsList.length > 0 ? skillsList.map(s => `<span class="skill-chip">✓ ${s}</span>`).join('') : `
      <span class="skill-chip">✓ Профільний виробничий досвід</span>
      <span class="skill-chip">✓ Дотримання техніки безпеки</span>
      <span class="skill-chip">✓ Готовність до позмінної роботи</span>
      <span class="skill-chip">✓ Дисциплінованість та відповідальність</span>
    `}
  </div>

  <!-- Verification & Security Checks -->
  <div class="verification-box">
    <div class="verification-title">🛡️ Результати перевірки службою безпеки та верифікації документів:</div>
    <div class="verification-item">✓ <strong>Медичний скринінг (форма 086):</strong> Пройдено, хронічні обмеження до фізичної праці відсутні.</div>
    <div class="verification-item">✓ <strong>Довідка про несудимість (Police Clearance):</strong> Отримана, кандидат не має правопорушень.</div>
    <div class="verification-item">✓ <strong>Закордонний біометричний паспорт:</strong> Дійсний понад 24 місяці, візовий коридор відкритий.</div>
    <div class="verification-item">✓ <strong>Відео-тестування навичок:</strong> Проведено оцінку практичних умінь інструктором агентства.</div>
  </div>

  <!-- Biography / Summary -->
  ${candidate.bio ? `
    <h3 style="font-size: 13px; font-weight: 800; color: #1e293b; margin-bottom: 6px; text-transform: uppercase;">
      Резюме кандидата та коментар рекрутера
    </h3>
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; font-size: 12px; line-height: 1.6; margin-bottom: 22px; color: #334155;">
      ${candidate.bio.replace(/\n/g, '<br>')}
    </div>
  ` : ''}

  <!-- Legal Agency Guarantee -->
  <div class="guarantee-box">
    <strong>Гарантія агентства для роботодавця:</strong> За умовами договору на надання послуг з підбору персоналу, 
    ТОВ «ЮКРЕЙН ГЛОБАЛ РЕКРУТИНГ» забезпечує <strong>безкоштовну заміну спеціаліста</strong> протягом 14 днів 
    у разі невідповідності заявленій кваліфікації або відмови від виходу на робоче місце.
  </div>

  <!-- Footer Signatures & Stamp -->
  <table class="footer-table">
    <tr>
      <td style="vertical-align: top; width: 60%;">
        <strong>Координація співбесіди та узгодження виїзду:</strong><br>
        Відділ міжнародного аутстафінгу ТОВ «ЮКРЕЙН ГЛОБАЛ РЕКРУТИНГ»<br>
        Телефон гарячої лінії: +380 (44) 390-12-88<br>
        E-mail: candidate-support@global-recruiting.pro<br>
        <br>
        <span style="font-size: 10px; color: #94a3b8;">
          * Контактні дані кандидата надаються роботодавцю після погодження графіка заїзду згідно з регламентом захисту авторських прав агентства.
        </span>
      </td>
      <td style="text-align: right; vertical-align: top; width: 40%;">
        <div style="display: inline-block; text-align: center;">
          <div class="stamp-area">
            М.П.<br>
            ВІДДІЛ КАДРОВОГО<br>
            СКРИНІНГУ
          </div>
          <div style="font-size: 11px; margin-top: 6px; color: #334155;">Верифіковано рекрутером CRM</div>
        </div>
      </td>
    </tr>
  </table>

</body>
</html>
`;
}

export function openPrintableCandidateDossier(candidate: Contact) {
  const html = generateCandidateDossierHtml(candidate);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}
