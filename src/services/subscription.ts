import { supabase, createServerClient } from "@/lib/supabase";
import type { Subscription, SubscriptionStatus, UpdateSubscription } from "@/types/database";

export interface SubscriptionInfo {
  status: SubscriptionStatus;
  expiresAt: Date | null;
  trialStartedAt: Date | null;
  trialDaysRemaining: number | null;
  mercadoPagoId: string | null;
}

// ============================================================================
// Cache Implementation
// ============================================================================

interface CacheEntry {
  data: SubscriptionInfo;
  timestamp: number;
}

// Cache duration: 30 seconds (short-lived to balance performance and freshness)
const CACHE_DURATION_MS = 30 * 1000;

let subscriptionCache: CacheEntry | null = null;

/**
 * Clear the subscription cache
 * Useful after updates to ensure fresh data
 */
export function clearSubscriptionCache(): void {
  subscriptionCache = null;
}

/**
 * Check if cache is valid
 */
function isCacheValid(): boolean {
  if (!subscriptionCache) return false;
  const now = Date.now();
  return now - subscriptionCache.timestamp < CACHE_DURATION_MS;
}

// ============================================================================
// Subscription Status Service
// ============================================================================

/**
 * Get the current subscription status with caching
 * Requirement 1.1: Consultar status_assinatura no banco de dados
 * Requirement 8.1: Definir status_assinatura e registrar data de início
 * 
 * Returns cached data if available and fresh, otherwise fetches from database.
 * Cache duration is 30 seconds to avoid excessive database queries.
 */
export async function getSubscriptionStatus(): Promise<SubscriptionInfo | null> {
  // Return cached data if valid
  if (isCacheValid() && subscriptionCache) {
    return subscriptionCache.data;
  }

  const { data, error } = await supabase
    .from("subscription")
    .select("*")
    .single();

  if (error || !data) {
    console.error("Error fetching subscription:", error);
    return null;
  }

  const subscriptionInfo = mapSubscriptionToInfo(data);
  
  // Update cache
  subscriptionCache = {
    data: subscriptionInfo,
    timestamp: Date.now(),
  };

  return subscriptionInfo;
}

/**
 * Get subscription status without cache (for critical operations)
 * Use this when you need guaranteed fresh data
 */
export async function getSubscriptionStatusFresh(): Promise<SubscriptionInfo | null> {
  clearSubscriptionCache();
  return getSubscriptionStatus();
}

/**
 * Update subscription status
 * Requirements 2.1, 2.2, 2.3: Atualizar status via webhook
 * 
 * Clears cache after update to ensure fresh data on next read.
 */
export async function updateSubscriptionStatus(
  status: SubscriptionStatus,
  mercadoPagoId?: string,
  expiresAt?: Date
): Promise<boolean> {
  const client = createServerClient();
  
  const updateData: UpdateSubscription = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (mercadoPagoId !== undefined) {
    updateData.mercado_pago_id = mercadoPagoId;
  }

  if (expiresAt !== undefined) {
    updateData.expires_at = expiresAt.toISOString();
  }

  // Get the first subscription to update (there should only be one)
  const { data: subscriptions } = await client
    .from("subscription")
    .select("id")
    .limit(1) as { data: { id: string }[] | null };

  if (!subscriptions || subscriptions.length === 0) {
    console.error("No subscription found to update");
    return false;
  }

  const { error } = await client
    .from("subscription")
    .update(updateData as never)
    .eq("id", subscriptions[0].id);

  if (error) {
    console.error("Error updating subscription:", error);
    return false;
  }

  // Clear cache to ensure fresh data on next read
  clearSubscriptionCache();

  return true;
}

/**
 * Check if trial has expired and update status if needed
 * Requirement 8.3: Atualizar status para 'expired' quando trial > 7 dias
 */
export async function checkAndExpireTrial(): Promise<boolean> {
  const subscription = await getSubscriptionStatus();
  
  if (!subscription) return false;
  
  if (subscription.status === "trial" && subscription.trialDaysRemaining !== null) {
    if (subscription.trialDaysRemaining < 0) {
      return await updateSubscriptionStatus("expired");
    }
  }
  
  return false;
}

/**
 * Map database subscription to SubscriptionInfo
 */
function mapSubscriptionToInfo(data: Subscription): SubscriptionInfo {
  const trialStartedAt = data.trial_started_at ? new Date(data.trial_started_at) : null;
  let trialDaysRemaining: number | null = null;

  if (data.status === "trial" && trialStartedAt) {
    const now = new Date();
    const diffTime = now.getTime() - trialStartedAt.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    trialDaysRemaining = 7 - diffDays;
  }

  return {
    status: data.status,
    expiresAt: data.expires_at ? new Date(data.expires_at) : null,
    trialStartedAt,
    trialDaysRemaining,
    mercadoPagoId: data.mercado_pago_id,
  };
}


// ============================================================================
// Access Control Helpers
// ============================================================================

export interface AccessCheckResult {
  allowed: boolean;
  status: SubscriptionStatus | null;
  trialDaysRemaining: number | null;
  reason?: 'active' | 'trial_valid' | 'inactive' | 'expired' | 'trial_expired' | 'error';
}

/**
 * Check if access should be allowed based on subscription status
 * Requirements 1.2, 1.3, 8.2: Verificar status antes de permitir acesso
 * 
 * Access is allowed if:
 * - status == 'active'
 * - status == 'trial' AND trialDaysRemaining >= 0 (within 7 days)
 * 
 * Access is denied if:
 * - status == 'inactive'
 * - status == 'expired'
 * - status == 'trial' AND trialDaysRemaining < 0 (trial expired)
 * - Error fetching subscription (fail-safe: deny access)
 */
export async function checkAccess(): Promise<AccessCheckResult> {
  const subscription = await getSubscriptionStatus();

  // Fail-safe: if we can't get subscription status, deny access
  if (!subscription) {
    return {
      allowed: false,
      status: null,
      trialDaysRemaining: null,
      reason: 'error',
    };
  }

  const { status, trialDaysRemaining } = subscription;

  // Active subscription: always allow
  if (status === 'active') {
    return {
      allowed: true,
      status,
      trialDaysRemaining: null,
      reason: 'active',
    };
  }

  // Trial subscription: allow if within 7 days
  if (status === 'trial') {
    const isTrialValid = trialDaysRemaining !== null && trialDaysRemaining >= 0;
    return {
      allowed: isTrialValid,
      status,
      trialDaysRemaining,
      reason: isTrialValid ? 'trial_valid' : 'trial_expired',
    };
  }

  // Inactive or expired: deny access
  return {
    allowed: false,
    status,
    trialDaysRemaining: null,
    reason: status === 'inactive' ? 'inactive' : 'expired',
  };
}

/**
 * Check if subscription is in a blocked state (for middleware use)
 * Returns true if access should be blocked
 */
export async function isSubscriptionBlocked(): Promise<boolean> {
  const result = await checkAccess();
  return !result.allowed;
}
