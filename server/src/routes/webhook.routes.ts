import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { Server as SocketIOServer } from 'socket.io';
import { LeadDistributionService } from '../services/lead-distribution.service';

export function createWebhookRouter(prisma: PrismaClient, distributionService: LeadDistributionService, io?: SocketIOServer) {
  const router = Router();

  // 1. Inbound Lead Webhook (Facebook / Google Ads / Tilda / WordPress / API)
  router.post('/lead', async (req, res) => {
    try {
      const body = req.body || {};
      
      const name = body.name || body.fullName || body.FIO || body['Ім\'я'] || body.user_name || 'Новий лід із сайту';
      const rawPhone = body.phone || body.telephone || body.tel || body['Телефон'] || body.mobile || '';
      const email = body.email || body.mail || body['E-mail'] || '';
      const companyName = body.company || body.organization || body['Компанія'] || '';
      const message = body.message || body.comment || body.notes || body['Коментар'] || 'Заявка з рекламної форми';
      const headcount = body.headcount || body.workers_count || body['Кількість людей'] || '5';

      const utm_source = body.utm_source || body.source || 'Facebook/Google';
      const utm_campaign = body.utm_campaign || body.campaign || 'Recruiting 2026';
      const utm_medium = body.utm_medium || 'cpc';

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
            position: 'Роботодавець (Реклама)'
          }
        });
      }

      // 3. Process Lead Distribution via Round-Robin or Manual Admin Assignment
      const deal = await distributionService.processInboundLead({
        title: `Лід з реклами: ${name} (${companyName || 'Підприємство'})`,
        contactId: contact.id,
        companyId: company?.id,
        channel: 'ads',
        budget: Number(headcount) * 1100,
        tags: [utm_source, `${headcount} осіб`, utm_campaign]
      });

      res.status(200).json({
        status: 'success',
        message: 'Lead successfully created and distributed in CRM',
        dealId: deal?.id,
        contactId: contact.id
      });
    } catch (e) {
      console.error('Webhook error:', e);
      res.status(500).json({ error: 'Failed to process webhook' });
    }
  });

  // 2. Get Distribution Settings
  router.get('/distribution-settings', (req, res) => {
    res.json(distributionService.getMode());
  });

  // 3. Update Distribution Settings (Admin Toggle)
  router.post('/distribution-settings', (req, res) => {
    const { autoDistribute } = req.body;
    distributionService.setMode(!!autoDistribute);
    res.json({ success: true, autoDistribute: !!autoDistribute });
  });

  return router;
}
