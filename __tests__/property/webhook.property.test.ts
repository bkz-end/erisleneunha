/**
 * Feature: agendamento-profissional, Property 3: Webhook Atualiza Status Corretamente
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4
 *
 * Property: For any valid notification from Mercado Pago, the webhook SHALL update
 * the status_assinatura in the database according to the event type:
 * - approved → active
 * - rejected/cancelled → inactive
 * - expired → expired
 * And the system SHALL reflect this change immediately.
 */

import * as fc from "fast-check";
import type { SubscriptionStatus } from "@/types/database";
import {
  mapPaymentStatusToSubscription,
  mapSubscriptionStatusToSystem,
} from "@/services/webhook";

// ============================================================================
// Types
// ============================================================================

type MercadoPagoPaymentStatus =
  | "approved"
  | "authorized"
  | "pending"
  | "in_process"
  | "in_mediation"
  | "rejected"
  | "cancelled"
  | "refunded"
  | "charged_back"
  | "expired";

type MercadoPagoSubscriptionStatus =
  | "authorized"
  | "pending"
  | "paused"
  | "cancelled";

// ============================================================================
// Arbitraries (Data Generators)
// ============================================================================

/**
 * Generate Mercado Pago payment statuses that should result in 'active'
 */
const activePaymentStatusArb = fc.constantFrom<MercadoPagoPaymentStatus>(
  "approved",
  "authorized"
);

/**
 * Generate Mercado Pago payment statuses that should result in 'inactive'
 */
const inactivePaymentStatusArb = fc.constantFrom<MercadoPagoPaymentStatus>(
  "rejected",
  "cancelled",
  "refunded",
  "charged_back",
  "pending",
  "in_process",
  "in_mediation"
);

/**
 * Generate Mercado Pago payment status that should result in 'expired'
 */
const expiredPaymentStatusArb = fc.constant<MercadoPagoPaymentStatus>("expired");

/**
 * Generate all valid Mercado Pago payment statuses
 */
const anyPaymentStatusArb = fc.constantFrom<MercadoPagoPaymentStatus>(
  "approved",
  "authorized",
  "pending",
  "in_process",
  "in_mediation",
  "rejected",
  "cancelled",
  "refunded",
  "charged_back",
  "expired"
);

/**
 * Generate Mercado Pago subscription statuses that should result in 'active'
 */
const activeSubscriptionStatusArb = fc.constant<MercadoPagoSubscriptionStatus>("authorized");

/**
 * Generate Mercado Pago subscription statuses that should result in 'inactive'
 */
const inactiveSubscriptionStatusArb = fc.constantFrom<MercadoPagoSubscriptionStatus>(
  "pending",
  "paused",
  "cancelled"
);

/**
 * Generate all valid Mercado Pago subscription statuses
 */
const anySubscriptionStatusArb = fc.constantFrom<MercadoPagoSubscriptionStatus>(
  "authorized",
  "pending",
  "paused",
  "cancelled"
);

// ============================================================================
// Property Tests - Property 3: Webhook Atualiza Status Corretamente
// ============================================================================

describe("Property 3: Webhook Atualiza Status Corretamente", () => {
  /**
   * Property 3.1: Approved/authorized payments result in active status
   * For any payment with status 'approved' or 'authorized', the system
   * SHALL update subscription status to 'active'.
   * Validates: Requirements 2.1
   */
  it("should map approved/authorized payments to active status", () => {
    fc.assert(
      fc.property(activePaymentStatusArb, (mpStatus) => {
        const result = mapPaymentStatusToSubscription(mpStatus);
        expect(result).toBe("active");
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.2: Rejected/cancelled payments result in inactive status
   * For any payment with status 'rejected', 'cancelled', 'refunded', or 'charged_back',
   * the system SHALL update subscription status to 'inactive'.
   * Validates: Requirements 2.2
   */
  it("should map rejected/cancelled payments to inactive status", () => {
    fc.assert(
      fc.property(inactivePaymentStatusArb, (mpStatus) => {
        const result = mapPaymentStatusToSubscription(mpStatus);
        expect(result).toBe("inactive");
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.3: Expired payments result in expired status
   * For any payment with status 'expired', the system SHALL update
   * subscription status to 'expired'.
   * Validates: Requirements 2.3
   */
  it("should map expired payments to expired status", () => {
    fc.assert(
      fc.property(expiredPaymentStatusArb, (mpStatus) => {
        const result = mapPaymentStatusToSubscription(mpStatus);
        expect(result).toBe("expired");
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.4: All payment statuses map to valid subscription statuses
   * For any Mercado Pago payment status, the mapping SHALL return a valid
   * subscription status ('active', 'inactive', or 'expired').
   * Validates: Requirements 2.1, 2.2, 2.3
   */
  it("should always return valid subscription status for any payment status", () => {
    fc.assert(
      fc.property(anyPaymentStatusArb, (mpStatus) => {
        const result = mapPaymentStatusToSubscription(mpStatus);
        expect(["active", "inactive", "expired"]).toContain(result);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.5: Authorized subscriptions result in active status
   * For any subscription with status 'authorized', the system SHALL
   * update subscription status to 'active'.
   * Validates: Requirements 2.1
   */
  it("should map authorized subscriptions to active status", () => {
    fc.assert(
      fc.property(activeSubscriptionStatusArb, (mpStatus) => {
        const result = mapSubscriptionStatusToSystem(mpStatus);
        expect(result).toBe("active");
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.6: Paused/cancelled subscriptions result in inactive status
   * For any subscription with status 'paused', 'cancelled', or 'pending',
   * the system SHALL update subscription status to 'inactive'.
   * Validates: Requirements 2.2
   */
  it("should map paused/cancelled subscriptions to inactive status", () => {
    fc.assert(
      fc.property(inactiveSubscriptionStatusArb, (mpStatus) => {
        const result = mapSubscriptionStatusToSystem(mpStatus);
        expect(result).toBe("inactive");
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.7: All subscription statuses map to valid system statuses
   * For any Mercado Pago subscription status, the mapping SHALL return
   * a valid subscription status ('active' or 'inactive').
   * Validates: Requirements 2.1, 2.2
   */
  it("should always return valid subscription status for any subscription status", () => {
    fc.assert(
      fc.property(anySubscriptionStatusArb, (mpStatus) => {
        const result = mapSubscriptionStatusToSystem(mpStatus);
        expect(["active", "inactive", "expired"]).toContain(result);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.8: Unknown payment statuses default to inactive
   * For any unknown payment status, the system SHALL default to 'inactive'
   * as a fail-safe measure.
   * Validates: Requirements 2.2
   */
  it("should default unknown payment statuses to inactive", () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !["approved", "authorized", "pending", "in_process", 
          "in_mediation", "rejected", "cancelled", "refunded", "charged_back", "expired"].includes(s)),
        (unknownStatus) => {
          const result = mapPaymentStatusToSubscription(unknownStatus);
          expect(result).toBe("inactive");
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.9: Unknown subscription statuses default to inactive
   * For any unknown subscription status, the system SHALL default to 'inactive'
   * as a fail-safe measure.
   * Validates: Requirements 2.2
   */
  it("should default unknown subscription statuses to inactive", () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !["authorized", "pending", "paused", "cancelled"].includes(s)),
        (unknownStatus) => {
          const result = mapSubscriptionStatusToSystem(unknownStatus);
          expect(result).toBe("inactive");
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.10: Mapping is deterministic
   * For any payment status, calling the mapping function multiple times
   * SHALL always return the same result.
   * Validates: Requirements 2.4 (immediate and consistent updates)
   */
  it("should be deterministic - same input always produces same output", () => {
    fc.assert(
      fc.property(anyPaymentStatusArb, (mpStatus) => {
        const result1 = mapPaymentStatusToSubscription(mpStatus);
        const result2 = mapPaymentStatusToSubscription(mpStatus);
        const result3 = mapPaymentStatusToSubscription(mpStatus);
        
        expect(result1).toBe(result2);
        expect(result2).toBe(result3);
      }),
      { numRuns: 100 }
    );
  });
});


/**
 * Feature: agendamento-profissional, Property 4: Validação de Autenticidade do Webhook
 * Validates: Requirements 2.5
 *
 * Property: For any request to the webhook endpoint, if the signature does not
 * match the Mercado Pago secret key, the system SHALL reject the request
 * without processing.
 */

import {
  validateWebhookSignature,
  generateWebhookSignature,
} from "@/services/webhook";

// ============================================================================
// Arbitraries for Signature Validation
// ============================================================================

/**
 * Generate valid webhook data
 */
const webhookDataArb = fc.record({
  dataId: fc.uuid(),
  requestId: fc.uuid(),
  timestamp: fc.integer({ min: 1000000000, max: 9999999999 }).map(String),
  secret: fc.string({ minLength: 16, maxLength: 64 }),
});

/**
 * Generate invalid/tampered signatures
 */
const tamperedSignatureArb = fc.oneof(
  fc.constant(null),
  fc.constant(""),
  fc.constant("invalid"),
  fc.constant("ts=123,v1=invalid"),
  fc.hexaString({ minLength: 64, maxLength: 64 }).map((hex) => `ts=123456789,v1=${hex}`),
  fc.string().filter((s) => !s.includes("ts=") || !s.includes("v1="))
);

// ============================================================================
// Property Tests - Property 4: Validação de Autenticidade do Webhook
// ============================================================================

describe("Property 4: Validação de Autenticidade do Webhook", () => {
  /**
   * Property 4.1: Valid signatures are accepted
   * For any valid webhook data with correct signature, the validation
   * SHALL return true.
   * Validates: Requirements 2.5
   */
  it("should accept valid signatures", () => {
    fc.assert(
      fc.property(webhookDataArb, ({ dataId, requestId, timestamp, secret }) => {
        // Generate valid signature
        const signature = generateWebhookSignature(dataId, requestId, timestamp, secret);
        
        // Validate should return true
        const isValid = validateWebhookSignature(signature, requestId, dataId, secret);
        
        expect(isValid).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4.2: Invalid signatures are rejected
   * For any webhook request with invalid/tampered signature, the validation
   * SHALL return false.
   * Validates: Requirements 2.5
   */
  it("should reject invalid signatures", () => {
    fc.assert(
      fc.property(
        webhookDataArb,
        tamperedSignatureArb,
        ({ dataId, requestId, secret }, tamperedSig) => {
          const isValid = validateWebhookSignature(tamperedSig, requestId, dataId, secret);
          
          expect(isValid).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4.3: Wrong secret is rejected
   * For any valid signature generated with one secret, validation with
   * a different secret SHALL return false.
   * Validates: Requirements 2.5
   */
  it("should reject signatures with wrong secret", () => {
    fc.assert(
      fc.property(
        webhookDataArb,
        fc.string({ minLength: 16, maxLength: 64 }),
        ({ dataId, requestId, timestamp, secret }, wrongSecret) => {
          // Skip if secrets happen to be the same
          fc.pre(secret !== wrongSecret);
          
          // Generate signature with original secret
          const signature = generateWebhookSignature(dataId, requestId, timestamp, secret);
          
          // Validate with wrong secret should fail
          const isValid = validateWebhookSignature(signature, requestId, dataId, wrongSecret);
          
          expect(isValid).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4.4: Tampered dataId is rejected
   * For any valid signature, if the dataId is modified, validation SHALL fail.
   * Validates: Requirements 2.5
   */
  it("should reject when dataId is tampered", () => {
    fc.assert(
      fc.property(
        webhookDataArb,
        fc.uuid(),
        ({ dataId, requestId, timestamp, secret }, tamperedDataId) => {
          // Skip if IDs happen to be the same
          fc.pre(dataId !== tamperedDataId);
          
          // Generate signature with original dataId
          const signature = generateWebhookSignature(dataId, requestId, timestamp, secret);
          
          // Validate with tampered dataId should fail
          const isValid = validateWebhookSignature(signature, requestId, tamperedDataId, secret);
          
          expect(isValid).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4.5: Tampered requestId is rejected
   * For any valid signature, if the requestId is modified, validation SHALL fail.
   * Validates: Requirements 2.5
   */
  it("should reject when requestId is tampered", () => {
    fc.assert(
      fc.property(
        webhookDataArb,
        fc.uuid(),
        ({ dataId, requestId, timestamp, secret }, tamperedRequestId) => {
          // Skip if IDs happen to be the same
          fc.pre(requestId !== tamperedRequestId);
          
          // Generate signature with original requestId
          const signature = generateWebhookSignature(dataId, requestId, timestamp, secret);
          
          // Validate with tampered requestId should fail
          const isValid = validateWebhookSignature(signature, tamperedRequestId, dataId, secret);
          
          expect(isValid).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4.6: Missing headers are rejected
   * For any webhook request with missing required headers (signature or requestId),
   * validation SHALL return false.
   * Validates: Requirements 2.5
   */
  it("should reject when required headers are missing", () => {
    fc.assert(
      fc.property(webhookDataArb, ({ dataId, requestId, timestamp, secret }) => {
        const signature = generateWebhookSignature(dataId, requestId, timestamp, secret);
        
        // Missing signature
        expect(validateWebhookSignature(null, requestId, dataId, secret)).toBe(false);
        
        // Missing requestId
        expect(validateWebhookSignature(signature, null, dataId, secret)).toBe(false);
        
        // Missing secret
        expect(validateWebhookSignature(signature, requestId, dataId, "")).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4.7: Signature format must be correct
   * For any signature that doesn't follow the ts=X,v1=Y format,
   * validation SHALL return false.
   * Validates: Requirements 2.5
   */
  it("should reject malformed signature format", () => {
    fc.assert(
      fc.property(
        webhookDataArb,
        fc.oneof(
          fc.constant("v1=abc123"), // Missing ts
          fc.constant("ts=123"), // Missing v1
          fc.constant("ts123,v1abc"), // Missing equals
          fc.constant("random string"),
          fc.constant("ts=,v1="), // Empty values
        ),
        ({ dataId, requestId, secret }, malformedSig) => {
          const isValid = validateWebhookSignature(malformedSig, requestId, dataId, secret);
          
          expect(isValid).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4.8: Round-trip signature generation and validation
   * For any valid webhook data, generating a signature and then validating it
   * SHALL always succeed (round-trip property).
   * Validates: Requirements 2.5
   */
  it("should pass round-trip: generate then validate", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 1000000000, max: 9999999999 }).map(String),
        fc.string({ minLength: 16, maxLength: 64 }),
        (dataId, requestId, timestamp, secret) => {
          // Generate signature
          const signature = generateWebhookSignature(dataId, requestId, timestamp, secret);
          
          // Validate should pass
          const isValid = validateWebhookSignature(signature, requestId, dataId, secret);
          
          expect(isValid).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4.9: Signature is deterministic
   * For any webhook data, generating the signature multiple times
   * SHALL always produce the same result.
   * Validates: Requirements 2.5
   */
  it("should generate deterministic signatures", () => {
    fc.assert(
      fc.property(webhookDataArb, ({ dataId, requestId, timestamp, secret }) => {
        const sig1 = generateWebhookSignature(dataId, requestId, timestamp, secret);
        const sig2 = generateWebhookSignature(dataId, requestId, timestamp, secret);
        const sig3 = generateWebhookSignature(dataId, requestId, timestamp, secret);
        
        expect(sig1).toBe(sig2);
        expect(sig2).toBe(sig3);
      }),
      { numRuns: 100 }
    );
  });
});
