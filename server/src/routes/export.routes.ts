import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

export function createExportRouter(prisma: PrismaClient) {
  const router = Router();

  // Helper to escape CSV cell and support UTF-8 semicolon delimiters for Excel
  const escapeCsv = (val: any): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const checkExportPermission = async (req: any): Promise<boolean> => {
    const userId = req.userId;
    const userRole = req.userRole;
    if (userRole === 'super_admin' || userRole === 'sales_director') return true;
    if (!userId) return false;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    return user?.canExportData === true || user?.role === 'super_admin';
  };

  /**
   * GET /api/export/candidates
   * Export all candidates or filtered candidates to Excel-compatible CSV (UTF-8 with BOM)
   */
  router.get('/candidates', async (req, res) => {
    try {
      const hasPerm = await checkExportPermission(req);
      if (!hasPerm) {
        return res.status(403).json({ error: 'Недостатньо прав для експорту бази даних (потрібен дозвіл canExportData)' });
      }

      const { country, status } = req.query;
      const where: any = { isDeleted: false, type: 'candidate' };
      if (country && country !== 'all') where.country = String(country);
      if (status && status !== 'all') where.status = String(status);

      const candidates = await prisma.contact.findMany({
        where,
        include: { company: true },
        orderBy: { createdAt: 'desc' }
      });

      const headers = [
        'ID',
        'ПІБ Кандидата',
        'Телефон',
        'Email',
        'Країна',
        'Професія / Спеціальність',
        'Статус анкети',
        'Закріплений Роботодавець',
        'Відео-інтерв\'ю',
        'Дата реєстрації'
      ];

      const rows = candidates.map(c => [
        escapeCsv(c.id),
        escapeCsv(c.name),
        escapeCsv(c.phone || ''),
        escapeCsv(c.email || ''),
        escapeCsv(c.country || 'Не вказано'),
        escapeCsv(c.profession || 'Різноробочий'),
        escapeCsv(c.status || 'Скринінг'),
        escapeCsv(c.company?.name || 'Вільний резерв'),
        escapeCsv(c.videoUrl || 'Немає'),
        escapeCsv(new Date(c.createdAt).toLocaleDateString('uk-UA'))
      ]);

      const csvContent = '\uFEFF' + [
        headers.map(escapeCsv).join(';'),
        ...rows.map(r => r.join(';'))
      ].join('\r\n');

      const filename = `candidates_export_${new Date().toISOString().slice(0, 10)}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(csvContent);
    } catch (e: any) {
      console.error('Export candidates error:', e);
      return res.status(500).json({ error: 'Failed to export candidates' });
    }
  });

  /**
   * GET /api/export/employers
   * Export B2B clients and enterprises to CSV
   */
  router.get('/employers', async (req, res) => {
    try {
      const hasPerm = await checkExportPermission(req);
      if (!hasPerm) {
        return res.status(403).json({ error: 'Недостатньо прав для експорту бази даних (потрібен дозвіл canExportData)' });
      }

      const companies = await prisma.company.findMany({
        where: { isDeleted: false },
        include: {
          contacts: { where: { isDeleted: false } },
          deals: { where: { isDeleted: false } }
        },
        orderBy: { createdAt: 'desc' }
      });

      const headers = [
        'ID',
        'Назва підприємства / Компанії',
        'Телефон',
        'Email',
        'Адреса / Локація',
        'Кількість угод',
        'Кількість закріплених кандидатів',
        'Дата створення'
      ];

      const rows = companies.map(comp => {
        const assignedCount = comp.contacts.filter(c => c.type === 'candidate').length;
        return [
          escapeCsv(comp.id),
          escapeCsv(comp.name),
          escapeCsv(comp.phone || ''),
          escapeCsv(comp.email || ''),
          escapeCsv(comp.address || ''),
          escapeCsv(comp.deals.length),
          escapeCsv(assignedCount),
          escapeCsv(new Date(comp.createdAt).toLocaleDateString('uk-UA'))
        ];
      });

      const csvContent = '\uFEFF' + [
        headers.map(escapeCsv).join(';'),
        ...rows.map(r => r.join(';'))
      ].join('\r\n');

      const filename = `employers_export_${new Date().toISOString().slice(0, 10)}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(csvContent);
    } catch (e: any) {
      console.error('Export employers error:', e);
      return res.status(500).json({ error: 'Failed to export employers' });
    }
  });

  /**
   * GET /api/export/deals
   * Export Deals and CRM pipeline data to CSV
   */
  router.get('/deals', async (req, res) => {
    try {
      const hasPerm = await checkExportPermission(req);
      if (!hasPerm) {
        return res.status(403).json({ error: 'Недостатньо прав для експорту бази даних (потрібен дозвіл canExportData)' });
      }

      const { projectId, pipelineId } = req.query;
      const where: any = { isDeleted: false };
      if (projectId) where.projectId = String(projectId);
      if (pipelineId) where.pipelineId = String(pipelineId);

      const deals = await prisma.deal.findMany({
        where,
        include: {
          stage: true,
          pipeline: true,
          responsible: true,
          contact: true,
          company: true
        },
        orderBy: { createdAt: 'desc' }
      });

      const headers = [
        'ID',
        'Назва угоди',
        'Бюджет (Сума)',
        'Валюта',
        'Проєкт / Напрямок',
        'Воронка',
        'Етап воронки',
        'Відповідальний менеджер',
        'Клієнт / Представник',
        'Підприємство',
        'Дата створення'
      ];

      const rows = deals.map(d => [
        escapeCsv(d.id),
        escapeCsv(d.title),
        escapeCsv(d.budget),
        escapeCsv('EUR'),
        escapeCsv(d.projectId || 'employers'),
        escapeCsv(d.pipeline?.name || ''),
        escapeCsv(d.stage?.name || ''),
        escapeCsv(d.responsible?.name || ''),
        escapeCsv(d.contact?.name || ''),
        escapeCsv(d.company?.name || ''),
        escapeCsv(new Date(d.createdAt).toLocaleDateString('uk-UA'))
      ]);

      const csvContent = '\uFEFF' + [
        headers.map(escapeCsv).join(';'),
        ...rows.map(r => r.join(';'))
      ].join('\r\n');

      const filename = `deals_export_${new Date().toISOString().slice(0, 10)}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(csvContent);
    } catch (e: any) {
      console.error('Export deals error:', e);
      return res.status(500).json({ error: 'Failed to export deals' });
    }
  });

  return router;
}
