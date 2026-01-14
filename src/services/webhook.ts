import crypto from "crypto";
import { updateSubscriptionStatus, clearSubscriptionCache } from "./subscription";
import type { SubscriptionStatus } from "@/types/database";

// ============================================================================
// Mercado Pago Webhook Types
// ============================================================================

export interface MercadoPagoWebhookPayload {
  id: string;
  live_mode: boolean;
  type: "subscription_preapproval" | "payment" | "subscription_authorized_payment";
  date_created: string;
  user_id: string;
  api_version: string;
  action: "created" | "updated" | "payment.created" | "payment.updated";
  data: {
    id: string;
  };
}

// ============================================================================
// HMAC Signature Validation
// ============================================================================

/**
 * Validate Mercado Pago webhook signature
 * Requirement 2.5: Validar autenticidade das notificações
 * 
 * Mercado Pago sends signature in x-signature header with format:
 * ts=timestamp,v1=hash
 * 
 * The hash is computed as HMAC-SHA256 of:
 * id:{data.id};request-id:{x-request-id};ts:{timestamp};
 */
export function validateWebhookSignature(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string,
  secret: string
): boolean {
  if (!xSignature || !xRequestId || !secret) {
    return false;
  }

  // Parse x-signature header
  const parts = xSignature.split(",");
  let ts: string | null = null;
  let hash: string | null = null;

  for (const part of parts) {
    const [key, value] = part.split("=");
    if (key === "ts") ts = value;
    if (key === "v1") hash = value;
  }

  if (!ts || !hash) {
    return false;
  }

  // Build manifest string
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

  // Compute HMAC-SHA256
  const computedHash = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(hash, "hex"),
      Buffer.from(computedHash, "hex")
    );
  } catch {
    // If buffers have different lengths, comparison fails
    return false;
  }
}

/**
 * Generate a valid webhook signature for testing
 */
export function generateWebhookSignature(
  dataId: string,
  requestId: string,
  timestamp: string,
  secret: string
): string {
  const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
  const hash = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");
  return `ts=${timestamp},v1=${hash}`;
}

// ============================================================================
// Status Mapping
// ============================================================================

/**
 * Map Mercado Pago payment status to system subscription status
 * Requirements 2.1, 2.2, 2.3: Mapear eventos para status do sistema
 * 
 * Mapping:
 * - approved, authorized → active (Requirement 2.1)
 * - rejected, cancelled, refunded, charged_back → inactive (Requirement 2.2)
 * - expired → expired (Requirement 2.3)
 */
export function mapPaymentStatusToSubscription(mpStatus: string): SubscriptionStatus {
  switch (mpStatus) {
    case "approved":
    case "authorized":
      return "active";
    case "rejected":
    case "cancelled":
    case "refunded":
    case "charged_back":
      return "inactive";
    case "expired":
      return "expired";
    case "pending":
    case "in_process":
    case "in_mediation":
      // Keep current status for pending payments
      return "inactive";
    default:
      return "inactive";
  }
}

/**
 * Map Mercado Pago subscription status to system subscription status
 */
export function mapSubscriptionStatusToSystem(mpStatus: string): SubscriptionStatus {
  switch (mpStatus) {
    case "authorized":
      return "active";
    case "paused":
    case "cancelled":
      return "inactive";
    case "pending":
      return "inactive";
    default:
      return "inactive";
  }
}

// ============================================================================
// Webhook Processing Logic
// ============================================================================

export interface ProcessResult {
  success: boolean;
  processed: boolean;
  newStatus?: SubscriptionStatus;
  error?: string;
}

/**
 * Process webhook payload and update subscription status
 * Requirements 2.1, 2.2, 2.3, 2.4: Atualizar status baseado no evento
 */
export async function processWebhookPayload(
  payload: MercadoPagoWebhookPayload,
  fetchPaymentStatusFn?: (id: string) => Promise<string | null>,
  fetchSubscriptionStatusFn?: (id: string) => Promise<string | null>
): Promise<ProcessResult> {
  const { type, data } = payload;

  // Handle payment events
  if (type === "payment" || type === "subscription_authorized_payment") {
    const paymentStatus = fetchPaymentStatusFn 
      ? await fetchPaymentStatusFn(data.id)
      : null;
    
    if (!paymentStatus) {
      return { success: true, processed: false };
    }

    return await updateStatusFromPayment(paymentStatus, data.id);
  }

  // Handle subscription events
  if (type === "subscription_preapproval") {
    const subscriptionStatus = fetchSubscriptionStatusFn
      ? await fetchSubscriptionStatusFn(data.id)
      : null;
    
    if (!subscriptionStatus) {
      return { success: true, processed: false };
    }

    return await updateStatusFromSubscription(subscriptionStatus, data.id);
  }

  // Unknown event type - acknowledge but don't process
  return { success: true, processed: false };
}

/**
 * Update subscription status from payment event
 * Requirement 2.4: Liberação imediata após pagamento
 */
export async function updateStatusFromPayment(
  paymentStatus: string,
  mercadoPagoId: string
): Promise<ProcessResult> {
  const newStatus = mapPaymentStatusToSubscription(paymentStatus);
  
  // Calculate expiration date (30 days from now for approved payments)
  const expiresAt = newStatus === "active" 
    ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    : undefined;

  const updated = await updateSubscriptionStatus(newStatus, mercadoPagoId, expiresAt);
  
  if (!updated) {
    return { success: false, processed: false, error: "Failed to update subscription" };
  }

  // Clear cache to ensure immediate effect (Requirement 2.4)
  clearSubscriptionCache();

  return { success: true, processed: true, newStatus };
}

/**
 * Update subscription status from subscription event
 */
export async function updateStatusFromSubscription(
  subscriptionStatus: string,
  mercadoPagoId: string
): Promise<ProcessResult> {
  const newStatus = mapSubscriptionStatusToSystem(subscriptionStatus);
  
  const updated = await updateSubscriptionStatus(newStatus, mercadoPagoId);
  
  if (!updated) {
    return { success: false, processed: false, error: "Failed to update subscription" };
  }

  // Clear cache to ensure immediate effect
  clearSubscriptionCache();

  return { success: true, processed: true, newStatus };
}
