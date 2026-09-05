import { PrismaClient } from '@prisma/client';
import { CloudinaryService } from './cloudinary.service';

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
        // Clean up Cloudinary cloud storage files
        const msgsWithMedia = await prisma.chatMessage.findMany({
          where: { dealId: d.id, mediaUrl: { not: null } },
          select: { mediaUrl: true }
        });
        for (const m of msgsWithMedia) {
          if (m.mediaUrl) {
            await CloudinaryService.deleteAsset(m.mediaUrl);
          }
        }

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
        // Clean up Cloudinary cloud storage files
        const msgsWithMedia = await prisma.chatMessage.findMany({
          where: { contactId: c.id, mediaUrl: { not: null } },
          select: { mediaUrl: true }
        });
        for (const m of msgsWithMedia) {
          if (m.mediaUrl) {
            await CloudinaryService.deleteAsset(m.mediaUrl);
          }
        }

        await prisma.chatMessage.deleteMany({ where: { contactId: c.id } });
        await prisma.contact.delete({ where: { id: c.id } });
        purgedContacts++;
      }

      // 3. Note: Users are NEVER permanently wiped automatically for audit safety,
      // only deactivated with isDeleted=true.
      let purgedUsers = 0;

      // 4. Auto-Purge Outgoing Chat Videos older than 30 days
      // Sent client videos (airport meeting, hostel review, factory tour) expire after 30 days.
      // Candidate profile cards/resumes are NEVER auto-deleted!
      const videoCutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const expiredVideos = await prisma.chatMessage.findMany({
        where: {
          direction: 'outgoing',
          mediaType: 'video',
          mediaUrl: { not: null },
          createdAt: { lte: videoCutoffDate }
        },
        select: { id: true, mediaUrl: true, text: true }
      });

      let purgedVideos = 0;
      for (const v of expiredVideos) {
        if (v.mediaUrl) {
          await CloudinaryService.deleteAsset(v.mediaUrl);
        }
        await prisma.chatMessage.update({
          where: { id: v.id },
          data: {
            mediaUrl: null,
            text: v.text.includes('(відеоархів очищено)') ? v.text : `${v.text} ⏳ [Відеофайл очищено за строком зберігання 30 днів]`
          }
        });
        purgedVideos++;
      }

      if (purgedDeals > 0 || purgedContacts > 0 || purgedVideos > 0) {
        console.log(`[ArchiveRetention] Purged: ${purgedDeals} deals, ${purgedContacts} contacts, ${purgedVideos} expired outgoing chat videos.`);
      } else {
        console.log('[ArchiveRetention] All archived items and videos are within safe retention window.');
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
