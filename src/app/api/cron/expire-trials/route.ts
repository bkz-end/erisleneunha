/**
 * Cron Job API Route: Expire Trials
 * 
 * Requirement 8.3: Atualizar status para 'expired' quando trial > 7 dias sem pagamento
 * 
 * This endpoint should be called by a cron job (e.g., Vercel Cron, external service)
 * to automatically expire trials that have exceeded 7 days.
 * 
 * Security: Protected by CRON_SECRET environment variable
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Calculate if a trial has expired (more than 7 days since start)
 */
function isTrialExpired(trialStartedAt: string): boolean {
  const startDate = new Date(trialStartedAt);
  const now = new Date();
  const diffTime = now.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 7;
}

export async function GET(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // If CRON_SECRET is set, verify it
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get all subscriptions with 'trial' status
    const { data: trials, error: fetchError } = await supabase
      .from("subscription")
      .select("id, trial_started_at")
      .eq("status", "trial");

    if (fetchError) {
      console.error("Error fetching trials:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch trials" },
        { status: 500 }
      );
    }

    if (!trials || trials.length === 0) {
      return NextResponse.json({
        message: "No trials to process",
        expired: 0,
      });
    }

    // Find expired trials
    const expiredTrialIds = trials
      .filter((trial) => trial.trial_started_at && isTrialExpired(trial.trial_started_at))
      .map((trial) => trial.id);

    if (expiredTrialIds.length === 0) {
      return NextResponse.json({
        message: "No expired trials found",
        expired: 0,
      });
    }

    // Update expired trials to 'expired' status
    // Using raw query approach to avoid type issues
    for (const id of expiredTrialIds) {
      const { error: updateError } = await supabase
        .from("subscription")
        .update({ 
          status: "expired" as const,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateError) {
        console.error(`Error updating trial ${id}:`, updateError);
      }
    }

    return NextResponse.json({
      message: `Successfully expired ${expiredTrialIds.length} trial(s)`,
      expired: expiredTrialIds.length,
      expiredIds: expiredTrialIds,
    });
  } catch (error) {
    console.error("Unexpected error in expire-trials cron:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Also support POST for flexibility with different cron services
export async function POST(request: NextRequest) {
  return GET(request);
}
