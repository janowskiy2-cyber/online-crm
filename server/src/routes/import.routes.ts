import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

export function createImportRouter(prisma: PrismaClient) {
  const router = Router();

  /**
   * POST /api/import/candidates
   * Bulk import candidates from parsed CSV/Excel rows with anti-duplicate logic
   */
  router.post('/candidates', async (req, res) => {
    try {
      const { candidates } = req.body;
      if (!Array.isArray(candidates) || candidates.length === 0) {
        return res.status(400).json({ error: 'Список кандидатів порожній або має невірний формат' });
      }

      let createdCount = 0;
      let updatedCount = 0;

      for (const item of candidates) {
        const name = (item.name || item['ПІБ'] || item["Ім'я"] || item['ФИО'] || '').trim();
        if (!name) continue;

        const phone = (item.phone || item['Телефон'] || item['Номер'] || '').trim();
        const country = (item.country || item['Країна'] || item['Страна'] || 'Узбекистан').trim();
        const profession = (item.profession || item['Професія'] || item['Спеціальність'] || item['Профессия'] || 'Оператор виробництва').trim();
        const status = (item.status || item['Статус'] || 'Скринінг / Анкета').trim();
        const email = (item.email || item['Email'] || '').trim();
        const companyName = (item.companyName || item['Роботодавець'] || item['Підприємство'] || '').trim();

        let companyId: string | null = null;
        if (companyName) {
          const company = await prisma.company.findFirst({
            where: { name: { equals: companyName }, isDeleted: false }
          });
          if (company) {
            companyId = company.id;
          } else {
            const newComp = await prisma.company.create({
              data: { name: companyName }
            });
            companyId = newComp.id;
          }
        }

        // Anti-duplicate check by phone if phone is provided
        if (phone) {
          const existing = await prisma.contact.findFirst({
            where: {
              phone: { equals: phone },
              isDeleted: false,
              type: 'candidate'
            }
          });

          if (existing) {
            await prisma.contact.update({
              where: { id: existing.id },
              data: {
                name,
                country: country || existing.country,
                profession: profession || existing.profession,
                status: status || existing.status,
                email: email || existing.email,
                companyId: companyId || existing.companyId
              }
            });
            updatedCount++;
            continue;
          }
        }

        await prisma.contact.create({
          data: {
            name,
            phone: phone || null,
            whatsapp: phone || null,
            email: email || null,
            country,
            profession,
            status,
            type: 'candidate',
            companyId
          }
        });
        createdCount++;
      }

      return res.json({
        success: true,
        total: candidates.length,
        created: createdCount,
        updated: updatedCount,
        message: `Успішно імпортовано: ${createdCount} нових, ${updatedCount} оновлено`
      });
    } catch (e: any) {
      console.error('Import candidates error:', e);
      return res.status(500).json({ error: e.message || 'Помилка імпорту кандидатів' });
    }
  });

  /**
   * POST /api/import/employers
   * Bulk import B2B employers and factories from CSV/Excel
   */
  router.post('/employers', async (req, res) => {
    try {
      const { employers } = req.body;
      if (!Array.isArray(employers) || employers.length === 0) {
        return res.status(400).json({ error: 'Список підприємств порожній або має невірний формат' });
      }

      let createdCount = 0;
      let updatedCount = 0;

      for (const item of employers) {
        const name = (item.name || item['Назва'] || item['Компанія'] || item['Підприємство'] || '').trim();
        if (!name) continue;

        const phone = (item.phone || item['Телефон'] || '').trim();
        const email = (item.email || item['Email'] || '').trim();
        const address = (item.address || item['Адреса'] || item['Локація'] || item['Місто'] || '').trim();
        const website = (item.website || item['Сайт'] || '').trim();

        const existing = await prisma.company.findFirst({
          where: { name: { equals: name }, isDeleted: false }
        });

        if (existing) {
          await prisma.company.update({
            where: { id: existing.id },
            data: {
              phone: phone || existing.phone,
              email: email || existing.email,
              address: address || existing.address,
              website: website || existing.website
            }
          });
          updatedCount++;
        } else {
          await prisma.company.create({
            data: {
              name,
              phone: phone || null,
              email: email || null,
              address: address || null,
              website: website || null
            }
          });
          createdCount++;
        }
      }

      return res.json({
        success: true,
        total: employers.length,
        created: createdCount,
        updated: updatedCount,
        message: `Успішно імпортовано: ${createdCount} нових компаній, ${updatedCount} оновлено`
      });
    } catch (e: any) {
      console.error('Import employers error:', e);
      return res.status(500).json({ error: e.message || 'Помилка імпорту підприємств' });
    }
  });

  return router;
}
