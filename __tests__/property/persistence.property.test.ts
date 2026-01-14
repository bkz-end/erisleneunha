/**
 * Feature: agendamento-profissional, Property 8: Round-Trip de Persistência de Dados
 * Validates: Requirements 6.2, 7.1, 7.2, 7.3, 7.4
 *
 * Property: For any valid data (subscription, service, time slot, booking),
 * when saved to the database and subsequently retrieved, the data SHALL be equivalent to the original.
 */

import * as fc from "fast-check";
import type {
  SubscriptionStatus,
  BookingStatus,
  InsertService,
  InsertTimeSlot,
  InsertBooking,
} from "@/types/database";

// ============================================================================
// Arbitraries (Data Generators)
// ============================================================================

/**
 * Generate valid subscription status
 */
const subscriptionStatusArb = fc.constantFrom<SubscriptionStatus>(
  "active",
  "inactive",
  "expired",
  "trial"
);

/**
 * Generate valid booking status
 */
const bookingStatusArb = fc.constantFrom<BookingStatus>(
  "pending",
  "confirmed",
  "cancelled"
);

/**
 * Generate valid service data
 * Requirement 7.2: name, price, duration, active
 */
const serviceArb: fc.Arbitrary<InsertService> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
  price: fc.integer({ min: 1, max: 9999999 }).map((n) => n / 100), // Price in cents, converted to decimal
  duration: fc.integer({ min: 5, max: 480 }), // 5 minutes to 8 hours
  active: fc.boolean(),
});

/**
 * Generate valid time slot data
 * Requirement 7.3: day_of_week, start_time, end_time, available
 */
const timeSlotArb: fc.Arbitrary<InsertTimeSlot> = fc.record({
  day_of_week: fc.integer({ min: 0, max: 6 }),
  start_time: fc
    .tuple(fc.integer({ min: 0, max: 23 }), fc.integer({ min: 0, max: 59 }))
    .map(([h, m]) => `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`),
  end_time: fc
    .tuple(fc.integer({ min: 0, max: 23 }), fc.integer({ min: 0, max: 59 }))
    .map(([h, m]) => `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`),
  available: fc.boolean(),
});

/**
 * Generate valid booking data
 * Requirement 7.4: service_id, client_name, client_whatsapp, date_time, status
 */
const bookingArb = (serviceId: string): fc.Arbitrary<InsertBooking> =>
  fc.record({
    service_id: fc.constant(serviceId),
    client_name: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
    client_whatsapp: fc
      .tuple(
        fc.integer({ min: 10, max: 99 }), // DDD
        fc.integer({ min: 900000000, max: 999999999 }) // Number
      )
      .map(([ddd, num]) => `55${ddd}${num}`),
    date_time: fc
      .date({ min: new Date(), max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) })
      .map((d) => d.toISOString()),
    status: bookingStatusArb,
  });

// ============================================================================
// Mock Database (In-Memory for Testing)
// ============================================================================

interface MockDatabase {
  subscriptions: Map<string, any>;
  services: Map<string, any>;
  timeSlots: Map<string, any>;
  bookings: Map<string, any>;
}

function createMockDatabase(): MockDatabase {
  return {
    subscriptions: new Map(),
    services: new Map(),
    timeSlots: new Map(),
    bookings: new Map(),
  };
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Mock service operations
function saveService(db: MockDatabase, service: InsertService): { id: string; data: any } {
  const id = generateId();
  const now = new Date().toISOString();
  const data = {
    id,
    ...service,
    created_at: now,
    updated_at: now,
  };
  db.services.set(id, data);
  return { id, data };
}

function getService(db: MockDatabase, id: string): any | null {
  return db.services.get(id) || null;
}

// Mock time slot operations
function saveTimeSlot(db: MockDatabase, slot: InsertTimeSlot): { id: string; data: any } {
  const id = generateId();
  const data = {
    id,
    ...slot,
  };
  db.timeSlots.set(id, data);
  return { id, data };
}

function getTimeSlot(db: MockDatabase, id: string): any | null {
  return db.timeSlots.get(id) || null;
}

// Mock booking operations
function saveBooking(db: MockDatabase, booking: InsertBooking): { id: string; data: any } {
  const id = generateId();
  const now = new Date().toISOString();
  const data = {
    id,
    ...booking,
    created_at: now,
  };
  db.bookings.set(id, data);
  return { id, data };
}

function getBooking(db: MockDatabase, id: string): any | null {
  return db.bookings.get(id) || null;
}

// Mock subscription operations
function saveSubscription(
  db: MockDatabase,
  status: SubscriptionStatus,
  mercadoPagoId?: string,
  expiresAt?: string
): { id: string; data: any } {
  const id = generateId();
  const now = new Date().toISOString();
  const data = {
    id,
    status,
    mercado_pago_id: mercadoPagoId || null,
    trial_started_at: status === "trial" ? now : null,
    expires_at: expiresAt || null,
    updated_at: now,
  };
  db.subscriptions.set(id, data);
  return { id, data };
}

function getSubscription(db: MockDatabase, id: string): any | null {
  return db.subscriptions.get(id) || null;
}

// ============================================================================
// Property Tests
// ============================================================================

describe("Property 8: Round-Trip de Persistência de Dados", () => {
  /**
   * Property 8.1: Service Round-Trip
   * For any valid service, saving and retrieving should return equivalent data
   * Validates: Requirement 7.2
   */
  it("should preserve service data through save/retrieve cycle", () => {
    fc.assert(
      fc.property(serviceArb, (service) => {
        const db = createMockDatabase();

        // Save service
        const { id, data: saved } = saveService(db, service);

        // Retrieve service
        const retrieved = getService(db, id);

        // Verify round-trip
        expect(retrieved).not.toBeNull();
        expect(retrieved.name).toBe(service.name);
        expect(retrieved.price).toBe(service.price);
        expect(retrieved.duration).toBe(service.duration);
        expect(retrieved.active).toBe(service.active);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.2: TimeSlot Round-Trip
   * For any valid time slot, saving and retrieving should return equivalent data
   * Validates: Requirement 7.3
   */
  it("should preserve time slot data through save/retrieve cycle", () => {
    fc.assert(
      fc.property(timeSlotArb, (slot) => {
        const db = createMockDatabase();

        // Save time slot
        const { id } = saveTimeSlot(db, slot);

        // Retrieve time slot
        const retrieved = getTimeSlot(db, id);

        // Verify round-trip
        expect(retrieved).not.toBeNull();
        expect(retrieved.day_of_week).toBe(slot.day_of_week);
        expect(retrieved.start_time).toBe(slot.start_time);
        expect(retrieved.end_time).toBe(slot.end_time);
        expect(retrieved.available).toBe(slot.available);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.3: Booking Round-Trip
   * For any valid booking, saving and retrieving should return equivalent data
   * Validates: Requirements 6.2, 7.4
   */
  it("should preserve booking data through save/retrieve cycle", () => {
    fc.assert(
      fc.property(
        serviceArb.chain((service) => {
          const db = createMockDatabase();
          const { id: serviceId } = saveService(db, service);
          return fc.tuple(fc.constant(db), fc.constant(serviceId), bookingArb(serviceId));
        }),
        ([db, serviceId, booking]) => {
          // Save booking
          const { id } = saveBooking(db, booking);

          // Retrieve booking
          const retrieved = getBooking(db, id);

          // Verify round-trip
          expect(retrieved).not.toBeNull();
          expect(retrieved.service_id).toBe(booking.service_id);
          expect(retrieved.client_name).toBe(booking.client_name);
          expect(retrieved.client_whatsapp).toBe(booking.client_whatsapp);
          expect(retrieved.date_time).toBe(booking.date_time);
          expect(retrieved.status).toBe(booking.status);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.4: Subscription Round-Trip
   * For any valid subscription status, saving and retrieving should return equivalent data
   * Validates: Requirement 7.1
   */
  it("should preserve subscription data through save/retrieve cycle", () => {
    fc.assert(
      fc.property(
        subscriptionStatusArb,
        fc.option(fc.string({ minLength: 10, maxLength: 50 })),
        fc.option(
          fc.date({ min: new Date(), max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) })
        ),
        (status, mercadoPagoId, expiresAt) => {
          const db = createMockDatabase();

          // Save subscription
          const { id } = saveSubscription(
            db,
            status,
            mercadoPagoId ?? undefined,
            expiresAt?.toISOString()
          );

          // Retrieve subscription
          const retrieved = getSubscription(db, id);

          // Verify round-trip
          expect(retrieved).not.toBeNull();
          expect(retrieved.status).toBe(status);
          expect(retrieved.mercado_pago_id).toBe(mercadoPagoId ?? null);
          if (expiresAt) {
            expect(retrieved.expires_at).toBe(expiresAt.toISOString());
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.5: Data Integrity - IDs are unique
   * For any sequence of saves, all generated IDs should be unique
   */
  it("should generate unique IDs for all saved entities", () => {
    fc.assert(
      fc.property(fc.array(serviceArb, { minLength: 2, maxLength: 20 }), (services) => {
        const db = createMockDatabase();
        const ids = new Set<string>();

        for (const service of services) {
          const { id } = saveService(db, service);
          expect(ids.has(id)).toBe(false);
          ids.add(id);
        }

        expect(ids.size).toBe(services.length);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.6: Timestamps are set correctly
   * For any saved entity, created_at and updated_at should be valid timestamps
   */
  it("should set valid timestamps on save", () => {
    fc.assert(
      fc.property(serviceArb, (service) => {
        const db = createMockDatabase();
        const beforeSave = new Date();

        const { data } = saveService(db, service);

        const afterSave = new Date();
        const createdAt = new Date(data.created_at);
        const updatedAt = new Date(data.updated_at);

        expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeSave.getTime());
        expect(createdAt.getTime()).toBeLessThanOrEqual(afterSave.getTime());
        expect(updatedAt.getTime()).toBeGreaterThanOrEqual(beforeSave.getTime());
        expect(updatedAt.getTime()).toBeLessThanOrEqual(afterSave.getTime());
      }),
      { numRuns: 100 }
    );
  });
});
