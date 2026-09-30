
import { NextRequest, NextResponse } from "next/server";
import { processReminders, processRenewals } from "@/lib/subscription-service";

// Helper to check if authorized
function isAuthorized(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  // If CRON_SECRET is set, require it. Otherwise, allow (for dev/testing, but warn)
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return false;
  }
  return true;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const remindersResult = await processReminders();
    const renewalsResult = await processRenewals();

    return NextResponse.json({
      success: true,
      reminders: remindersResult,
      renewals: renewalsResult,
    });
  } catch (error) {
    console.error("[Cron] Error processing subscriptions:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: String(error) },
      { status: 500 }
    );
  }
}
