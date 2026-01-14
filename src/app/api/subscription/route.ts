import { NextResponse } from "next/server";
import { getSubscriptionStatus } from "@/services/subscription";

/**
 * GET /api/subscription
 * 
 * Returns the current subscription status
 * Requirements: 4.3, 4.6 - Exibir status da assinatura no dashboard
 */
export async function GET() {
  try {
    const subscription = await getSubscriptionStatus();

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      subscription: {
        status: subscription.status,
        expiresAt: subscription.expiresAt?.toISOString() || null,
        trialStartedAt: subscription.trialStartedAt?.toISOString() || null,
        trialDaysRemaining: subscription.trialDaysRemaining,
        mercadoPagoId: subscription.mercadoPagoId,
      },
    });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription status" },
      { status: 500 }
    );
  }
}
