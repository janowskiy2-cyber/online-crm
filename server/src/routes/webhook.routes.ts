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

      // 1. Check if Company ALREADY exists in verified database (never auto-create for unpaid leads)
      let company = null;
      if (companyName && typeof companyName === 'string' && companyName.trim()) {
        company = await prisma.company.findFirst({
          where: { 
            name: { equals: companyName.trim(), mode: 'insensitive' as const },
            isDeleted: false 
          }
        });
      }

      // 2. Create or Find Contact
      let contact = await prisma.contact.findFirst({
        where: {
          OR: [
            ...(cleanPhone ? [{ phone: { contains: cleanPhone } }, { whatsapp: { contains: cleanPhone } }] : []),
            ...(email ? [{ email: { equals: email.trim(), mode: 'insensitive' as const } }] : [])
          ],
          isDeleted: false
        }
      });

      if (!contact) {
        contact = await prisma.contact.create({
          data: {
            name,
            phone: formattedPhone,
            whatsapp: formattedPhone,
            email: email || undefined,
            companyId: company?.id || null,
            position: companyName ? `Лід (${companyName})` : 'Лід із сайту',
            type: 'b2b_contact'
          }
        });
      }

      // 3. Process Lead Distribution into CRM Deals Funnel (Stage 0: "📥 Нові ліди / Заявки з сайту")
      const deal = await distributionService.processInboundLead({
        title: `Лід із сайту: ${name}${companyName ? ` (${companyName})` : ''}`,
        contactId: contact.id,
        companyId: company?.id || undefined,
        channel: 'ads',
        budget: Number(headcount) * 1100,
        tags: ['Вхідний лід', utm_source, `${headcount} осіб`, utm_campaign].filter(Boolean),
        customFields: JSON.stringify({
          rawCompanyName: companyName || '',
          headcount: headcount || '5',
          message: message || '',
          isPaidEmployer: false,
          source: utm_source || 'Сайт'
        })
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
