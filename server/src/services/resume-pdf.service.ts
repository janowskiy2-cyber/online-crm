import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { CloudinaryService } from './cloudinary.service';

export interface ResumeData {
  name: string;
  profession: string;
  country: string;
  citizenship?: string;
  birthDate?: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  telegram?: string;
  experienceYears?: number;
  salaryExpectation?: string;
  languages?: string;
  driverLicense?: string;
  bio?: string;
  skills?: string[];
  workExperience?: Array<{
    period: string;
    role: string;
    company: string;
    details: string;
  }>;
  education?: string;
  certificates?: string[];
}

export class ResumePdfService {
  /**
   * Generates a sleek, high-standard A4 PDF resume buffer for a candidate
   */
  public static async generateResumeBuffer(data: ResumeData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 36,
          info: {
            Title: `Резюме - ${data.name}`,
            Author: 'Міжнародна Агенція Працевлаштування (Online CRM Pro)',
            Subject: data.profession,
            Keywords: 'Резюме, CV, Вакансії, Робота за кордоном'
          }
        });

        const buffers: Buffer[] = [];
        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', (err) => reject(err));

        // Locate fonts
        const fontRegular = path.join(process.cwd(), 'fonts', 'arial.ttf');
        const fontBold = path.join(process.cwd(), 'fonts', 'arialbd.ttf');

        const hasCustomFonts = fs.existsSync(fontRegular) && fs.existsSync(fontBold);
        if (hasCustomFonts) {
          doc.registerFont('AppFont', fontRegular);
          doc.registerFont('AppFont-Bold', fontBold);
          doc.font('AppFont');
        }

        const fontMain = hasCustomFonts ? 'AppFont' : 'Helvetica';
        const fontB = hasCustomFonts ? 'AppFont-Bold' : 'Helvetica-Bold';

        const pageWidth = 595.28;
        const pageHeight = 841.89;

        // 1. TOP HEADER BANNER (Dark slate with emerald accent)
        doc.rect(0, 0, pageWidth, 110).fill('#0f172a'); // slate-900
        doc.rect(0, 106, pageWidth, 4).fill('#059669'); // emerald-600 accent stripe

        // Candidate Avatar Placeholder Box
        doc.roundedRect(36, 20, 70, 70, 10).fill('#1e293b');
        doc.roundedRect(36, 20, 70, 70, 10).lineWidth(1.5).stroke('#10b981');
        
        doc.font(fontB).fontSize(26).fillColor('#34d399');
        const initials = data.name.split(' ').map(n => n[0]).join('').slice(0, 2);
        doc.text(initials, 36, 42, { width: 70, align: 'center' });

        // Name & Profession in Header
        doc.font(fontB).fontSize(20).fillColor('#ffffff');
        doc.text(data.name, 120, 26, { width: pageWidth - 140 });

        doc.font(fontMain).fontSize(12).fillColor('#34d399');
        doc.text(data.profession, 120, 52, { width: pageWidth - 140 });

        // Header Sub-badges (Country, Experience, Salary)
        const expStr = data.experienceYears ? `Досвід: ${data.experienceYears} р.` : 'Кваліфікований фахівець';
        const salStr = data.salaryExpectation ? `Очікування: ${data.salaryExpectation}` : '';
        const metaLine = `Країна: ${data.country}  |  ${expStr}  ${salStr ? '|  ' + salStr : ''}`;
        doc.font(fontMain).fontSize(9.5).fillColor('#94a3b8');
        doc.text(metaLine, 120, 74, { width: pageWidth - 140 });

        // LAYOUT: TWO COLUMNS (Left Sidebar: 170pt, Right Main: 330pt)
        const leftColX = 36;
        const leftColW = 165;
        const rightColX = 220;
        const rightColW = pageWidth - rightColX - 36;
        let leftY = 130;
        let rightY = 130;

        // --- LEFT COLUMN ---
        // Section: Контакти
        doc.font(fontB).fontSize(10).fillColor('#0f172a');
        doc.text('КОНТАКТНІ ДАНІ', leftColX, leftY);
        doc.rect(leftColX, leftY + 14, leftColW, 1).fill('#cbd5e1');
        leftY += 22;

        const addContactItem = (label: string, value?: string) => {
          if (!value) return;
          doc.font(fontB).fontSize(8).fillColor('#64748b').text(label, leftColX, leftY);
          leftY += 10;
          doc.font(fontMain).fontSize(8.5).fillColor('#0f172a').text(value, leftColX, leftY, { width: leftColW });
          leftY += 14;
        };

        addContactItem('Телефон:', data.phone);
        addContactItem('WhatsApp:', data.whatsapp);
        addContactItem('Telegram:', data.telegram);
        addContactItem('Email:', data.email);
        addContactItem('Громадянство:', data.citizenship || data.country);
        if (data.birthDate) addContactItem('Дата народження:', data.birthDate);

        leftY += 8;

        // Section: Мови
        if (data.languages) {
          doc.font(fontB).fontSize(10).fillColor('#0f172a');
          doc.text('МОВНІ НАВИЧКИ', leftColX, leftY);
          doc.rect(leftColX, leftY + 14, leftColW, 1).fill('#cbd5e1');
          leftY += 22;

          doc.font(fontMain).fontSize(8.5).fillColor('#334155');
          doc.text(data.languages, leftColX, leftY, { width: leftColW, lineGap: 3 });
          leftY += doc.heightOfString(data.languages, { width: leftColW }) + 14;
        }

        // Section: Посвідчення водія / Допуски
        if (data.driverLicense) {
          doc.font(fontB).fontSize(10).fillColor('#0f172a');
          doc.text('ПОСВІДЧЕННЯ ТА ДОПУСКИ', leftColX, leftY);
          doc.rect(leftColX, leftY + 14, leftColW, 1).fill('#cbd5e1');
          leftY += 22;

          doc.font(fontMain).fontSize(8.5).fillColor('#334155');
          doc.text(data.driverLicense, leftColX, leftY, { width: leftColW, lineGap: 2 });
          leftY += doc.heightOfString(data.driverLicense, { width: leftColW }) + 14;
        }

        // Section: Ключові компетенції / Навички
        if (data.skills && data.skills.length > 0) {
          doc.font(fontB).fontSize(10).fillColor('#0f172a');
          doc.text('КЛЮЧОВІ НАВИЧКИ', leftColX, leftY);
          doc.rect(leftColX, leftY + 14, leftColW, 1).fill('#cbd5e1');
          leftY += 22;

          for (const skill of data.skills) {
            doc.font(fontB).fontSize(8).fillColor('#059669').text('• ', leftColX, leftY, { continued: true });
            doc.font(fontMain).fontSize(8.5).fillColor('#1e293b').text(skill, { width: leftColW - 10 });
            leftY += 13;
          }
        }

        // --- RIGHT COLUMN ---
        // Section: Про кандидата (Bio / Summary)
        if (data.bio) {
          doc.font(fontB).fontSize(11).fillColor('#0f172a');
          doc.text('ПРОФЕСІЙНИЙ ПРОФІЛЬ', rightColX, rightY);
          doc.rect(rightColX, rightY + 15, rightColW, 1.5).fill('#10b981');
          rightY += 24;

          doc.font(fontMain).fontSize(9).fillColor('#334155');
          doc.text(data.bio, rightColX, rightY, { width: rightColW, lineGap: 3.5, align: 'justify' });
          rightY += doc.heightOfString(data.bio, { width: rightColW, lineGap: 3.5 }) + 18;
        }

        // Section: Досвід роботи
        if (data.workExperience && data.workExperience.length > 0) {
          doc.font(fontB).fontSize(11).fillColor('#0f172a');
          doc.text('ДОСВІД РОБОТИ ТА ПРОЄКТИ', rightColX, rightY);
          doc.rect(rightColX, rightY + 15, rightColW, 1.5).fill('#10b981');
          rightY += 24;

          for (const exp of data.workExperience) {
            // Period badge
            doc.roundedRect(rightColX, rightY, 115, 15, 3).fill('#f1f5f9');
            doc.font(fontB).fontSize(8).fillColor('#475569');
            doc.text(exp.period, rightColX, rightY + 3.5, { width: 115, align: 'center' });

            // Role & Company
            doc.font(fontB).fontSize(9.5).fillColor('#0f172a');
            doc.text(exp.role, rightColX + 125, rightY + 2, { width: rightColW - 125 });
            
            doc.font(fontMain).fontSize(8.5).fillColor('#059669');
            doc.text(exp.company, rightColX + 125, rightY + 15, { width: rightColW - 125 });

            rightY += 28;

            // Details
            doc.font(fontMain).fontSize(8.5).fillColor('#334155');
            doc.text(exp.details, rightColX + 10, rightY, { width: rightColW - 10, lineGap: 2.5 });
            rightY += doc.heightOfString(exp.details, { width: rightColW - 10, lineGap: 2.5 }) + 14;
          }
        }

        // Section: Освіта та кваліфікація
        if (data.education) {
          doc.font(fontB).fontSize(11).fillColor('#0f172a');
          doc.text('ОСВІТА ТА ДИПЛОМИ', rightColX, rightY);
          doc.rect(rightColX, rightY + 15, rightColW, 1.5).fill('#10b981');
          rightY += 24;

          doc.font(fontMain).fontSize(9).fillColor('#334155');
          doc.text(data.education, rightColX, rightY, { width: rightColW, lineGap: 3 });
          rightY += doc.heightOfString(data.education, { width: rightColW, lineGap: 3 }) + 14;
        }

        // Section: Сертифікати та ліцензії
        if (data.certificates && data.certificates.length > 0) {
          doc.font(fontB).fontSize(11).fillColor('#0f172a');
          doc.text('СЕРТИФІКАТИ ТА КВАЛІФІКАЦІЙНІ АТЕСТАТИ', rightColX, rightY);
          doc.rect(rightColX, rightY + 15, rightColW, 1.5).fill('#10b981');
          rightY += 24;

          for (const cert of data.certificates) {
            doc.font(fontB).fontSize(8).fillColor('#059669').text('✓ ', rightColX + 5, rightY, { continued: true });
            doc.font(fontMain).fontSize(8.5).fillColor('#1e293b').text(cert, { width: rightColW - 20 });
            rightY += 13;
          }
        }

        // FOOTER
        doc.rect(36, pageHeight - 34, pageWidth - 72, 1).fill('#e2e8f0');
        doc.font(fontMain).fontSize(7.5).fillColor('#94a3b8');
        const verificationText = `Документ верифіковано в базі Online CRM Pro • Статус: Готовий до працевлаштування • Дата оновлення: ${new Date().toLocaleDateString('uk-UA')}`;
        doc.text(verificationText, 36, pageHeight - 26, { width: pageWidth - 72, align: 'center' });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Generates and uploads PDF resume for candidate, returning accessible URL
   */
  public static async generateAndUploadResume(data: ResumeData): Promise<string> {
    const buffer = await this.generateResumeBuffer(data);
    const cleanName = data.name.replace(/[^a-zA-Zа-яА-ЯіІїЇєЄ0-9_-]/g, '_');
    const fileName = `CV_${cleanName}_${Date.now()}.pdf`;
    const url = await CloudinaryService.uploadBuffer(buffer, fileName, 'application/pdf');
    return url;
  }
}
