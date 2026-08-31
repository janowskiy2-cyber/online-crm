import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { Server as SocketIOServer } from 'socket.io';

export function createWebhookRouter(prisma: PrismaClient, io?: SocketIOServer) {
  const router = Router();

  // Universal Inbound Lead Webhook (Facebook / Google Ads / Tilda / WordPress / API)
  router.post('/lead', async (req, res) => {
    try {
      const body = req.body || {};
      
      // Extract common fields across different payload formats
      const name = body.name || body.fullName || body.FIO || body['Ім\'я'] || body.user_name || 'Новий лід із сайту';
      const rawPhone = body.phone || body.telephone || body.tel || body['Телефон'] || body.mobile || '';
      const email = body.email || body.mail || body['E-mail'] || '';
      const companyName = body.company || body.organization || body['Компанія'] || '';
      const message = body.message || body.comment || body.notes || body['Коментар'] || 'Заявка з рекламної форми';
      const headcount = body.headcount || body.workers_count || body['Кількість людей'] || '5';

      // Extract UTM tags
      const utm_source = body.utm_source || body.source || 'Facebook/Google';
      const utm_campaign = body.utm_campaign || body.campaign || 'Recruiting 2026';
      const utm_medium = body.utm_medium || 'cpc';
      const utm_content = body.utm_content || '';

      const cleanPhone = String(rawPhone).replace(/\D/g, '');
      const formattedPhone = cleanPhone ? `+${cleanPhone}` : '+380734277174';

      // 1. Create or Find Company
      let company = null;
      if (companyName) {
        company = await prisma.company.findFirst({
          where: { name: { contains: companyName } }
        });
        if (!company) {
          company = await prisma.company.create({
            data: {
              name: companyName,
              phone: formattedPhone,
              email: email || undefined
            }
          });
        }
      }

      // 2. Create or Find Contact
      let contact = await prisma.contact.findFirst({
        where: {
          OR: [
            ...(cleanPhone ? [{ phone: { contains: cleanPhone } }, { whatsapp: { contains: cleanPhone } }] : []),
            ...(email ? [{ email }] : [])
          ]
        }
      });

      if (!contact) {
        contact = await prisma.contact.create({
          data: {
            name,
            phone: formattedPhone,
            whatsapp: formattedPhone,
            email: email || undefined,
            companyId: company?.id,
            type: 'employer'
          }
        });
      }

      // 3. Find default Sales pipeline
      const defaultPipeline = await prisma.pipeline.findFirst({
        where: { isDefault: true },
        include: { stages: { orderBy: { sortOrder: 'asc' } } }
      }) || await prisma.pipeline.findFirst({
        include: { stages: { orderBy: { sortOrder: 'asc' } } }
      });

      const firstStage = defaultPipeline?.stages[0];

      // Round-robin or Admin assignment
      const adminUser = await prisma.user.findFirst({
        where: { role: 'sales_rep', isActive: true }
      }) || await prisma.user.findFirst();

      if (!defaultPipeline || !firstStage || !adminUser) {
        return res.status(500).json({ error: 'Pipeline configuration missing' });
      }

      // 4. Create Deal
      const deal = await prisma.deal.create({
        data: {
          title: `Лід з реклами: ${name} (${companyName || 'Підприємство'})`,
          budget: Number(headcount) * 1100, // estimated budget
          pipelineId: defaultPipeline.id,
          stageId: firstStage.id,
          responsibleId: adminUser.id,
          contactId: contact.id,
          companyId: company?.id,
          projectId: 'employers',
          tags: JSON.stringify([utm_source, 'Ads Lead', `${headcount} осіб`]),
          customFields: JSON.stringify({
            'Джерело реклами': utm_source,
            'Кампанія': utm_campaign,
            'UTM Medium': utm_medium,
            'Повідомлення клієнта': message,
            'Кількість персоналу': `${headcount} осіб`
          })
        },
        include: {
          contact: true,
          company: true,
          responsible: true,
          stage: true
        }
      });

      // 5. Add initial note
      await prisma.dealNote.create({
        data: {
          dealId: deal.id,
          userId: adminUser.id,
          type: 'system',
          content: `🎯 Отримано новий лід із реклами (${utm_source})!\nКампанія: ${utm_campaign}\nКоментар: ${message}`
        }
      });

      // 6. Real-time broadcast
      if (io) {
        io.emit('deal_created', deal);
        io.emit('notification', {
          title: '🔥 Новий лід із реклами!',
          body: `${name} — ${companyName || 'Запит на ' + headcount + ' осіб'}`,
          dealId: deal.id
        });
      }

      res.status(200).json({
        status: 'success',
        message: 'Lead successfully created in CRM',
        dealId: deal.id,
        contactId: contact.id
      });
    } catch (e) {
      console.error('Webhook error:', e);
      res.status(500).json({ error: 'Failed to process webhook' });
    }
  });

  return router;
}
