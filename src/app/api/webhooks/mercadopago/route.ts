import { NextRequest, NextResponse } from "next/server";
import {
  validateWebhookSignature,
  processWebhookPayload,
  type MercadoPagoWebhookPayload,
} from "@/services/webhook";

// ============================================================================
// Mercado Pago API Integration
// ============================================================================

/**
 * Fetch payment status from Mercado Pago API
 */
async function fetchPaymentStatus(paymentId: string): Promise<string | null> {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  
  if (!accessToken) {
    console.warn("Webhook: MERCADO_PAGO_ACCESS_TOKEN not configured");
    return null;
  }

  try {
    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error(`Webhook: MP API error ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.status;
  } catch (error) {
    console.error("Webhook: Error fetching payment status", error);
    return null;
  }
}

/**
 * Fetch subscription status from Mercado Pago API
 */
async function fetchSubscriptionStatus(subscriptionId: string): Promise<string | null> {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  
  if (!accessToken) {
    console.warn("Webhook: MERCADO_PAGO_ACCESS_TOKEN not configured");
    return null;
  }

  try {
    const response = await fetch(
      `https://api.mercadopago.com/preapproval/${subscriptionId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error(`Webhook: MP API error ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.status;
  } catch (error) {
    console.error("Webhook: Error fetching subscription status", error);
    return null;
  }
}

// ============================================================================
// Webhook Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Get headers for signature validation
    const xSignature = request.headers.get("x-signature");
    const xRequestId = request.headers.get("x-request-id");
    
    // Parse request body
    const body = await request.text();
    let payload: MercadoPagoWebhookPayload;
    
    try {
      payload = JSON.parse(body);
    } catch {
      console.error("Webhook: Invalid JSON payload");
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!payload.type || !payload.data?.id) {
      console.error("Webhook: Missing required fields");
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate signature (Requirement 2.5)
    const webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
    
    if (webhookSecret) {
      const isValid = validateWebhookSignature(
        xSignature,
        xRequestId,
        payload.data.id,
        webhookSecret
      );

      if (!isValid) {
        console.error("Webhook: Invalid signature");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    } else {
      // In development, log warning but continue
      console.warn("Webhook: MERCADO_PAGO_WEBHOOK_SECRET not configured");
    }

    // Process webhook
    const result = await processWebhookPayload(
      payload,
      fetchPaymentStatus,
      fetchSubscriptionStatus
    );

    if (!result.success) {
      console.error("Webhook: Processing failed", result.error);
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    console.log(`Webhook: Processed ${payload.type} - ${payload.data.id}, status: ${result.newStatus || 'unchanged'}`);
    
    return NextResponse.json({ received: true, processed: result.processed });
  } catch (error) {
    console.error("Webhook: Unexpected error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
