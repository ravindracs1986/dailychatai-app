
import cron from 'node-cron';
import { processReminders, processRenewals } from '@/lib/subscription-service';
import { getDatabaseStatus } from '@/lib/db';

async function runJob() {
  console.log(`[Worker] Starting subscription check at ${new Date().toISOString()}`);
  
  try {
    const dbStatus = await getDatabaseStatus();
    if (dbStatus !== 'ok') {
      console.error(`[Worker] Database not ready: ${dbStatus}`);
      return;
    }

    const reminders = await processReminders();
    console.log(`[Worker] Reminders processed: ${reminders.processed}, Sent: ${reminders.sent}`);

    const renewals = await processRenewals();
    console.log(`[Worker] Renewals found: ${renewals.found}, Generated: ${renewals.generated}`);
    
  } catch (error) {
    console.error('[Worker] Error running job:', error);
  }
  
  console.log(`[Worker] Job finished at ${new Date().toISOString()}`);
}

// Check if worker is enabled via env flag
const isEnabled = process.env.ENABLE_WORKER === 'true';

if (!isEnabled) {
  console.log('[Worker] Worker is disabled (ENABLE_WORKER!=true). Exiting.');
  process.exit(0);
}

console.log('[Worker] Worker service started.');

const cronSchedule = process.env.CRON_SCHEDULE || '0 10 * * *';
console.log(`[Worker] Schedule: "${cronSchedule}"`);

// Schedule the task
cron.schedule(cronSchedule, () => {
  runJob();
});

// Run once immediately on startup (optional, useful for debugging/ensuring it works)
if (process.env.RUN_ON_STARTUP === 'true') {
  runJob();
}

// Keep the process alive
process.stdin.resume();
