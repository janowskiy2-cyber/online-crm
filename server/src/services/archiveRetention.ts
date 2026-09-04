import { PrismaClient } from '@prisma/client';

/**
 * 30-Day Archive Retention Service
 * Ensures deleted entities remain in the archive for at least 30 days before any permanent purge.
 * Any accidental deletion can be restored within this 30-day recovery window.
 */
export class ArchiveRetentionService {
  private static intervalTimer: NodeJS.Timeout | null = null;
  private static readonly RETENTION_DAYS = 30;

  /**
   * Run retention cleanup check:
   * Only items soft-deleted MORE than 30 days ago are permanently purged.
   */
  public static async runRetentionCheck(prisma: PrismaClient): Promise<{ purgedDeals: number; purgedUsers: number; purgedContacts: number }> {
    const cutoffDate = new Date(Date.now() - this.RETENTION_DAYS * 24 * 60 * 60 * 1000);
    console.log(`[ArchiveRetention] Running check. Retention cutoff (30 days): ${cutoffDate.toISOString()}`);

    try {
      // 1. Purge deals older than 30 days in archive
      const oldDeals = await prisma.deal.findMany({
        where: {
          isDeleted: true,
          deletedAt: { lte: cutoffDate }
        },
        select: { id: true }
      });

      let purgedDeals = 0;
      for (const d of oldDeals) {
        await prisma.dealNote.deleteMany({ where: { dealId: d.id } });
        await prisma.task.deleteMany({ where: { dealId: d.id } });
        await prisma.chatMessage.deleteMany({ where: { dealId: d.id } });
        await prisma.deal.delete({ where: { id: d.id } });
        purgedDeals++;
      }

      // 2. Contacts older than 30 days in archive
      const oldContacts = await prisma.contact.findMany({
        where: {
          isDeleted: true,
          deletedAt: { lte: cutoffDate }
        },
        select: { id: true }
      });

      let purgedContacts = 0;
      for (const c of oldContacts) {
        await prisma.chatMessage.deleteMany({ where: { contactId: c.id } });
        await prisma.contact.delete({ where: { id: c.id } });
        purgedContacts++;
      }

      // 3. Note: Users are NEVER permanently wiped automatically for audit safety,
      // only deactivated with isDeleted=true.
      let purgedUsers = 0;

      if (purgedDeals > 0 || purgedContacts > 0) {
        console.log(`[ArchiveRetention] Purged expired items older than 30 days: ${purgedDeals} deals, ${purgedContacts} contacts.`);
      } else {
        console.log('[ArchiveRetention] All archived items are within the 30-day safe retention window.');
      }

      return { purgedDeals, purgedUsers, purgedContacts };
    } catch (err) {
      console.error('[ArchiveRetention] Error during retention check:', err);
      return { purgedDeals: 0, purgedUsers: 0, purgedContacts: 0 };
    }
  }

  /**
   * Start periodic retention schedule (runs every 24 hours)
   */
  public static startSchedule(prisma: PrismaClient) {
    // Initial run on server start
    this.runRetentionCheck(prisma);

    // Run every 24 hours
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    this.intervalTimer = setInterval(() => {
      this.runRetentionCheck(prisma);
    }, TWENTY_FOUR_HOURS);
  }

  public static stopSchedule() {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }
}
