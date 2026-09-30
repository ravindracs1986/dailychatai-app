
import { query, execute, generateUUID } from "@/lib/db";
import { sendTemplateEmail, sendInvoiceEmail } from "@/lib/email";
import { InvoiceData } from "@/lib/invoice";

export async function processReminders() {
  // Find active manual subscriptions expiring in exactly 15 days
  // And ensuring we haven't sent a reminder in the last 24 hours (just in case cron runs multiple times)
  const subscriptions = await query<{
    id: string;
    user_id: string;
    current_period_end: Date;
    email: string;
    username: string;
  }>(`
    SELECT s.id, s.user_id, s.current_period_end, u.email, u.username
    FROM subscriptions s
    JOIN users u ON s.user_id = u.id
    WHERE s.status = 'active'
      AND s.stripe_subscription_id IS NULL
      AND DATEDIFF(s.current_period_end, NOW()) = 15
      AND (s.last_reminder_sent_at IS NULL OR DATEDIFF(NOW(), s.last_reminder_sent_at) > 0)
  `);

  let count = 0;
  for (const sub of subscriptions) {
    try {
      const renewalDate = new Date(sub.current_period_end).toLocaleDateString();
      await sendTemplateEmail(sub.email, "subscription_reminder", {
        username: sub.username,
        renewal_date: renewalDate,
      });

      await execute(
        "UPDATE subscriptions SET last_reminder_sent_at = NOW() WHERE id = ?",
        [sub.id]
      );
      count++;
    } catch (error) {
      console.error(`[Cron] Failed to send reminder for sub ${sub.id}:`, error);
    }
  }

  return { processed: subscriptions.length, sent: count };
}

export async function processRenewals() {
  // Find active manual subscriptions that are due (or slightly past due)
  // We check for subscriptions where current_period_end <= NOW()
  // But we MUST check if we've already generated a pending transaction for this cycle to avoid dupes.
  // We assume if a pending transaction exists created recently (e.g., last 5 days), we skip.

  const dueSubscriptions = await query<{
    id: string;
    user_id: string;
    plan_id: string;
    current_period_end: Date;
    email: string;
    username: string;
    plan_name: string;
    plan_price: number;
    user_address?: string;
    user_phone?: string;
  }>(`
    SELECT 
      s.id, s.user_id, s.plan_id, s.current_period_end,
      u.email, u.username,
      p.name as plan_name, p.price as plan_price
    FROM subscriptions s
    JOIN users u ON s.user_id = u.id
    JOIN plans p ON s.plan_id = p.id
    WHERE s.status = 'active'
      AND s.stripe_subscription_id IS NULL
      AND s.current_period_end <= NOW()
  `);

  let generated = 0;

  for (const sub of dueSubscriptions) {
    try {
      // Check for existing pending transaction in the last 20 days (to cover the invoice window)
      // This prevents generating multiple invoices for the same expiry if the user hasn't paid yet.
      const existingTx = await query<{ id: string }>(
        `SELECT id FROM transactions 
         WHERE user_id = ? 
           AND status = 'pending' 
           AND created_at > DATE_SUB(NOW(), INTERVAL 20 DAY)`,
        [sub.user_id]
      );

      if (existingTx.length > 0) {
        // Invoice already generated recently, skip
        continue;
      }

      // Create Transaction
      const txId = generateUUID();
      const amount = sub.plan_price || 0;
      
      // We need a gateway ID. We'll use the 'manual' gateway for these auto-generated invoices
      // or check if there is a preferred one. For now, default to 'manual' or find one.
      // Let's look up the 'manual' gateway id.
      const manualGateway = await query<{ id: string }>(
        "SELECT id FROM payment_gateways WHERE name = 'manual'"
      );
      
      const gatewayId = manualGateway.length > 0 ? manualGateway[0].id : "00000000-0000-0000-0000-000000manual";

      await execute(
        `INSERT INTO transactions (id, user_id, gateway_id, amount, currency, status, metadata)
         VALUES (?, ?, ?, ?, 'USD', 'pending', ?)`,
        [txId, sub.user_id, gatewayId, amount, JSON.stringify({ description: `Renewal for ${sub.plan_name}` })]
      );

      // Generate Invoice PDF and Send Email
      const invoiceData: InvoiceData = {
        invoiceId: txId,
        date: new Date(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Due in 7 days
        user: {
          name: sub.username,
          email: sub.email,
          // address/phone if available in future
        },
        items: [
          {
            description: `Subscription Renewal: ${sub.plan_name}`,
            amount: Number(amount),
            quantity: 1,
          },
        ],
        subTotal: Number(amount),
        total: Number(amount),
        currency: "USD",
      };

      await sendInvoiceEmail(sub.email, sub.username, invoiceData);
      
      generated++;
      
      // Optionally mark subscription as 'past_due' if you want to block access until payment
      // await execute("UPDATE subscriptions SET status = 'past_due' WHERE id = ?", [sub.id]);

    } catch (error) {
      console.error(`[Cron] Failed to process renewal for sub ${sub.id}:`, error);
    }
  }

  return { found: dueSubscriptions.length, generated };
}
