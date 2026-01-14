/**
 * Feature: agendamento-profissional, Property 1: Bloqueio Total com Assinatura Inativa
 * Validates: Requirements 1.2, 1.4, 1.6, 1.7
 *
 * Property: For any request to the system (client or admin), when status_assinatura
 * is 'inactive' or 'expired', the system SHALL block access and redirect to the
 * appropriate page (maintenance for client, payment for admin).
 */

import * as fc from "fast-check";
import type { SubscriptionStatus } from "@/types/database";

// ============================================================================
// Types and Interfaces
// ============================================================================

interface SubscriptionData {
  status: SubscriptionStatus;
  trial_started_at: string | null;
}

interface AccessCheckResult {
  allowed: boolean;
  redirectTo: string | null;
}

type RouteType = "admin" | "client" | "public";

// ============================================================================
// Pure Functions Under Test (extracted from middleware logic)
// ============================================================================

/**
 * Calculate trial days remaining
 */
function calculateTrialDaysRemaining(trialStartedAt: string | null): number | null {
  if (!trialStartedAt) return null;

  const startDate = new Date(trialStartedAt);
  const now = new Date();
  const diffTime = now.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return 7 - diffDays;
}

/**
 * Check if access should be allowed based on subscription status
 */
function shouldAllowAccess(subscription: SubscriptionData): boolean {
  const { status, trial_started_at } = subscription;

  // Active subscription: always allow
  if (status === "active") {
    return true;
  }

  // Trial subscription: allow if within 7 days
  if (status === "trial") {
    const daysRemaining = calculateTrialDaysRemaining(trial_started_at);
    return daysRemaining !== null && daysRemaining >= 0;
  }

  // Inactive or expired: deny access
  return false;
}

/**
 * Determine redirect URL based on route type and subscription status
 */
function getRedirectUrl(routeType: RouteType, subscription: SubscriptionData): string | null {
  if (routeType === "public") {
    return null; // Public routes don't redirect
  }

  const allowed = shouldAllowAccess(subscription);
  
  if (allowed) {
    return null; // No redirect needed
  }

  // Blocked: redirect based on route type
  if (routeType === "admin") {
    return "/admin/pagamento-pendente";
  }
  
  return "/manutencao";
}

/**
 * Full access check combining all logic
 */
function checkAccess(routeType: RouteType, subscription: SubscriptionData): AccessCheckResult {
  if (routeType === "public") {
    return { allowed: true, redirectTo: null };
  }

  const allowed = shouldAllowAccess(subscription);
  const redirectTo = allowed ? null : getRedirectUrl(routeType, subscription);

  return { allowed, redirectTo };
}

// ============================================================================
// Arbitraries (Data Generators)
// ============================================================================

/**
 * Generate blocked subscription statuses (inactive or expired)
 */
const blockedStatusArb = fc.constantFrom<SubscriptionStatus>("inactive", "expired");

/**
 * Generate allowed subscription statuses (active)
 */
const activeStatusArb = fc.constant<SubscriptionStatus>("active");

/**
 * Generate trial subscription with configurable days
 */
const trialSubscriptionArb = (daysAgo: number): fc.Arbitrary<SubscriptionData> => {
  const trialStartDate = new Date();
  trialStartDate.setDate(trialStartDate.getDate() - daysAgo);
  
  return fc.constant({
    status: "trial" as SubscriptionStatus,
    trial_started_at: trialStartDate.toISOString(),
  });
};

/**
 * Generate expired trial (more than 7 days ago)
 */
const expiredTrialArb: fc.Arbitrary<SubscriptionData> = fc
  .integer({ min: 8, max: 365 })
  .chain((daysAgo) => trialSubscriptionArb(daysAgo));

/**
 * Generate valid trial (0-7 days ago)
 */
const validTrialArb: fc.Arbitrary<SubscriptionData> = fc
  .integer({ min: 0, max: 7 })
  .chain((daysAgo) => trialSubscriptionArb(daysAgo));

/**
 * Generate blocked subscription (inactive, expired, or expired trial)
 */
const blockedSubscriptionArb: fc.Arbitrary<SubscriptionData> = fc.oneof(
  blockedStatusArb.map((status) => ({ status, trial_started_at: null })),
  expiredTrialArb
);

/**
 * Generate allowed subscription (active or valid trial)
 */
const allowedSubscriptionArb: fc.Arbitrary<SubscriptionData> = fc.oneof(
  activeStatusArb.map((status) => ({ status, trial_started_at: null })),
  validTrialArb
);

/**
 * Generate route types that require subscription check
 */
const protectedRouteTypeArb = fc.constantFrom<RouteType>("admin", "client");

/**
 * Generate any route type
 */
const anyRouteTypeArb = fc.constantFrom<RouteType>("admin", "client", "public");

// ============================================================================
// Property Tests
// ============================================================================

describe("Property 1: Bloqueio Total com Assinatura Inativa", () => {
  /**
   * Property 1.1: Blocked subscriptions deny access
   * For any blocked subscription (inactive, expired, or expired trial),
   * access to protected routes SHALL be denied.
   * Validates: Requirements 1.2, 1.6
   */
  it("should deny access for blocked subscriptions on protected routes", () => {
    fc.assert(
      fc.property(
        blockedSubscriptionArb,
        protectedRouteTypeArb,
        (subscription, routeType) => {
          const result = checkAccess(routeType, subscription);
          
          expect(result.allowed).toBe(false);
          expect(result.redirectTo).not.toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 1.2: Admin routes redirect to payment page
   * For any blocked subscription, admin routes SHALL redirect to payment page.
   * Validates: Requirements 1.4
   */
  it("should redirect admin routes to payment page when blocked", () => {
    fc.assert(
      fc.property(blockedSubscriptionArb, (subscription) => {
        const result = checkAccess("admin", subscription);
        
        expect(result.allowed).toBe(false);
        expect(result.redirectTo).toBe("/admin/pagamento-pendente");
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 1.3: Client routes redirect to maintenance page
   * For any blocked subscription, client routes SHALL redirect to maintenance page.
   * Validates: Requirements 1.6, 1.7
   */
  it("should redirect client routes to maintenance page when blocked", () => {
    fc.assert(
      fc.property(blockedSubscriptionArb, (subscription) => {
        const result = checkAccess("client", subscription);
        
        expect(result.allowed).toBe(false);
        expect(result.redirectTo).toBe("/manutencao");
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 1.4: Inactive status always blocks
   * For any route type (except public), inactive status SHALL block access.
   * Validates: Requirements 1.2
   */
  it("should always block access for inactive status", () => {
    fc.assert(
      fc.property(protectedRouteTypeArb, (routeType) => {
        const subscription: SubscriptionData = {
          status: "inactive",
          trial_started_at: null,
        };
        
        const result = checkAccess(routeType, subscription);
        
        expect(result.allowed).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 1.5: Expired status always blocks
   * For any route type (except public), expired status SHALL block access.
   * Validates: Requirements 1.2
   */
  it("should always block access for expired status", () => {
    fc.assert(
      fc.property(protectedRouteTypeArb, (routeType) => {
        const subscription: SubscriptionData = {
          status: "expired",
          trial_started_at: null,
        };
        
        const result = checkAccess(routeType, subscription);
        
        expect(result.allowed).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 1.6: Expired trial blocks access
   * For any trial that started more than 7 days ago, access SHALL be blocked.
   * Validates: Requirements 1.2
   */
  it("should block access for expired trials (> 7 days)", () => {
    fc.assert(
      fc.property(
        expiredTrialArb,
        protectedRouteTypeArb,
        (subscription, routeType) => {
          const result = checkAccess(routeType, subscription);
          
          expect(result.allowed).toBe(false);
          expect(result.redirectTo).not.toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: agendamento-profissional, Property 2: Liberação Automática com Assinatura Ativa ou Trial
 * Validates: Requirements 1.3, 3.1, 4.2, 8.2
 *
 * Property: For any request to the system, when status_assinatura is 'active' OR
 * ('trial' with dias_desde_criacao <= 7), the system SHALL allow access to the
 * corresponding functionalities.
 */
describe("Property 2: Liberação Automática com Assinatura Ativa ou Trial", () => {
  /**
   * Property 2.1: Active subscription allows access
   * For any active subscription, access to all protected routes SHALL be allowed.
   * Validates: Requirements 1.3, 3.1, 4.2
   */
  it("should allow access for active subscriptions", () => {
    fc.assert(
      fc.property(protectedRouteTypeArb, (routeType) => {
        const subscription: SubscriptionData = {
          status: "active",
          trial_started_at: null,
        };
        
        const result = checkAccess(routeType, subscription);
        
        expect(result.allowed).toBe(true);
        expect(result.redirectTo).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2.2: Valid trial allows access
   * For any trial within 7 days, access to all protected routes SHALL be allowed.
   * Validates: Requirements 8.2
   */
  it("should allow access for valid trials (0-7 days)", () => {
    fc.assert(
      fc.property(
        validTrialArb,
        protectedRouteTypeArb,
        (subscription, routeType) => {
          const result = checkAccess(routeType, subscription);
          
          expect(result.allowed).toBe(true);
          expect(result.redirectTo).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2.3: Allowed subscriptions don't redirect
   * For any allowed subscription (active or valid trial), no redirect SHALL occur.
   * Validates: Requirements 1.3, 8.2
   */
  it("should not redirect for allowed subscriptions", () => {
    fc.assert(
      fc.property(
        allowedSubscriptionArb,
        anyRouteTypeArb,
        (subscription, routeType) => {
          const result = checkAccess(routeType, subscription);
          
          // If allowed, no redirect
          if (result.allowed) {
            expect(result.redirectTo).toBeNull();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2.4: Public routes always allow access
   * For any subscription status, public routes SHALL always allow access.
   * Validates: Requirements 1.3
   */
  it("should always allow access to public routes regardless of subscription", () => {
    fc.assert(
      fc.property(
        fc.oneof(blockedSubscriptionArb, allowedSubscriptionArb),
        (subscription) => {
          const result = checkAccess("public", subscription);
          
          expect(result.allowed).toBe(true);
          expect(result.redirectTo).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2.5: Trial day 7 still allows access
   * For a trial that started exactly 7 days ago, access SHALL still be allowed.
   * Validates: Requirements 8.2
   */
  it("should allow access on trial day 7 (boundary)", () => {
    const trialStartDate = new Date();
    trialStartDate.setDate(trialStartDate.getDate() - 7);
    
    const subscription: SubscriptionData = {
      status: "trial",
      trial_started_at: trialStartDate.toISOString(),
    };
    
    fc.assert(
      fc.property(protectedRouteTypeArb, (routeType) => {
        const result = checkAccess(routeType, subscription);
        
        expect(result.allowed).toBe(true);
        expect(result.redirectTo).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2.6: Trial day 8 blocks access
   * For a trial that started 8 days ago, access SHALL be blocked.
   * Validates: Requirements 8.2
   */
  it("should block access on trial day 8 (boundary)", () => {
    const trialStartDate = new Date();
    trialStartDate.setDate(trialStartDate.getDate() - 8);
    
    const subscription: SubscriptionData = {
      status: "trial",
      trial_started_at: trialStartDate.toISOString(),
    };
    
    fc.assert(
      fc.property(protectedRouteTypeArb, (routeType) => {
        const result = checkAccess(routeType, subscription);
        
        expect(result.allowed).toBe(false);
        expect(result.redirectTo).not.toBeNull();
      }),
      { numRuns: 100 }
    );
  });
});


/**
 * Feature: agendamento-profissional, Property 13: Expiração Automática do Trial
 * Validates: Requirements 8.3
 *
 * Property: For any account with status 'trial', when dias_desde_criacao > 7 AND
 * payment was not made, the system SHALL automatically update status to 'expired'.
 */

// ============================================================================
// Trial Expiration Logic (extracted from cron job)
// ============================================================================

/**
 * Check if a trial has expired (more than 7 days since start)
 */
function isTrialExpired(trialStartedAt: string): boolean {
  const startDate = new Date(trialStartedAt);
  const now = new Date();
  const diffTime = now.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 7;
}

/**
 * Determine if a subscription should be expired
 */
function shouldExpireTrial(subscription: SubscriptionData): boolean {
  if (subscription.status !== "trial") {
    return false;
  }
  
  if (!subscription.trial_started_at) {
    return false;
  }
  
  return isTrialExpired(subscription.trial_started_at);
}

/**
 * Get the new status after expiration check
 */
function getStatusAfterExpirationCheck(subscription: SubscriptionData): SubscriptionStatus {
  if (shouldExpireTrial(subscription)) {
    return "expired";
  }
  return subscription.status;
}


describe("Property 13: Expiração Automática do Trial", () => {
  /**
   * Property 13.1: Expired trials should be marked as expired
   * For any trial that started more than 7 days ago, the expiration check
   * SHALL return 'expired' status.
   * Validates: Requirements 8.3
   */
  it("should mark expired trials as expired", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 8, max: 365 }),
        (daysAgo) => {
          const trialStartDate = new Date();
          trialStartDate.setDate(trialStartDate.getDate() - daysAgo);
          
          const subscription: SubscriptionData = {
            status: "trial",
            trial_started_at: trialStartDate.toISOString(),
          };
          
          const newStatus = getStatusAfterExpirationCheck(subscription);
          
          expect(newStatus).toBe("expired");
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 13.2: Valid trials should not be expired
   * For any trial within 7 days, the expiration check SHALL NOT change status.
   * Validates: Requirements 8.3
   */
  it("should not expire valid trials (0-7 days)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 7 }),
        (daysAgo) => {
          const trialStartDate = new Date();
          trialStartDate.setDate(trialStartDate.getDate() - daysAgo);
          
          const subscription: SubscriptionData = {
            status: "trial",
            trial_started_at: trialStartDate.toISOString(),
          };
          
          const newStatus = getStatusAfterExpirationCheck(subscription);
          
          expect(newStatus).toBe("trial");
        }
      ),
      { numRuns: 100 }
    );
  });


  /**
   * Property 13.3: Non-trial statuses should not be affected
   * For any subscription that is not in trial status, the expiration check
   * SHALL NOT change the status.
   * Validates: Requirements 8.3
   */
  it("should not affect non-trial subscriptions", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<SubscriptionStatus>("active", "inactive", "expired"),
        (status) => {
          const subscription: SubscriptionData = {
            status,
            trial_started_at: null,
          };
          
          const newStatus = getStatusAfterExpirationCheck(subscription);
          
          expect(newStatus).toBe(status);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 13.4: Trial without start date should not be expired
   * For any trial without a start date, the expiration check SHALL NOT expire it.
   * Validates: Requirements 8.3
   */
  it("should not expire trial without start date", () => {
    const subscription: SubscriptionData = {
      status: "trial",
      trial_started_at: null,
    };
    
    const newStatus = getStatusAfterExpirationCheck(subscription);
    
    expect(newStatus).toBe("trial");
  });

  /**
   * Property 13.5: Boundary test - day 7 should not expire
   * For a trial that started exactly 7 days ago, it SHALL NOT be expired.
   * Validates: Requirements 8.3
   */
  it("should not expire trial on day 7 (boundary)", () => {
    const trialStartDate = new Date();
    trialStartDate.setDate(trialStartDate.getDate() - 7);
    
    const subscription: SubscriptionData = {
      status: "trial",
      trial_started_at: trialStartDate.toISOString(),
    };
    
    const newStatus = getStatusAfterExpirationCheck(subscription);
    
    expect(newStatus).toBe("trial");
  });

  /**
   * Property 13.6: Boundary test - day 8 should expire
   * For a trial that started 8 days ago, it SHALL be expired.
   * Validates: Requirements 8.3
   */
  it("should expire trial on day 8 (boundary)", () => {
    const trialStartDate = new Date();
    trialStartDate.setDate(trialStartDate.getDate() - 8);
    
    const subscription: SubscriptionData = {
      status: "trial",
      trial_started_at: trialStartDate.toISOString(),
    };
    
    const newStatus = getStatusAfterExpirationCheck(subscription);
    
    expect(newStatus).toBe("expired");
  });
});
