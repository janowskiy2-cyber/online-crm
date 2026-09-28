/**
 * 🛡️ SUPABASE ANTI-SLEEP KEEPALIVE SCRIPT
 *
 * Supabase free-tier projects automatically pause after 7 consecutive days of zero query activity.
 * This script connects to the database, executes a lightweight "SELECT 1" query, and keeps the project active.
 *
 * Usage:
 *   1. One-time ping (ideal for Windows Task Scheduler, Cron, or GitHub Actions):
 *      node scripts/keep-supabase-alive.js
 *
 *   2. Continuous Daemon (runs in background, pings every 6 hours):
 *      node scripts/keep-supabase-alive.js --daemon
 */

const path = require('path');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient();

async function pingDatabase() {
  const timestamp = new Date().toISOString();
  try {
    const startTime = Date.now();
    await prisma.$queryRaw`SELECT 1 AS heartbeat`;
    const latency = Date.now() - startTime;
    console.log(`[${timestamp}] 💓 [Supabase KeepAlive] Ping OK (${latency}ms) — База даних активна!`);
    return true;
  } catch (error) {
    console.error(`[${timestamp}] ❌ [Supabase KeepAlive] Помилка пінгу:`, error.message || error);
    try {
      console.log('🔄 Спроба перепідключення Prisma...');
      await prisma.$disconnect();
      await prisma.$connect();
      console.log('✅ Prisma успішно відновила зʼєднання.');
    } catch (recErr) {
      console.error('❌ Не вдалося перепідключитися:', recErr.message || recErr);
    }
    return false;
  }
}

async function main() {
  const isDaemon = process.argv.includes('--daemon');
  const INTERVAL_HOURS = 6;
  const INTERVAL_MS = INTERVAL_HOURS * 60 * 60 * 1000;

  console.log('🚀 Запуск Supabase Anti-Sleep Keep-Alive скрипта...');
  await pingDatabase();

  if (isDaemon) {
    console.log(`⏱️ Режим демона активовано. Скрипт пінгуватиме базу кожні ${INTERVAL_HOURS} годин.`);
    setInterval(async () => {
      await pingDatabase();
    }, INTERVAL_MS);
  } else {
    await prisma.$disconnect();
    process.exit(0);
  }
}

main();
