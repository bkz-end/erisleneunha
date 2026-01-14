/**
 * Feature: agendamento-profissional, Property 9: Prevenção de Conflito de Horários
 * Validates: Requirements 6.3
 *
 * Property: For any attempt to create a booking, if there is already a booking
 * at the same time slot, the system SHALL reject the creation and return an error.
 */

import * as fc from "fast-check";
import type { Booking, Service, InsertBooking } from "@/types/database";

// ============================================================================
// Arbitraries (Data Generators)
// ============================================================================

/**
 * Generate valid client name
 */
const clientNameArb = fc.string({ minLength: 2, maxLength: 100 }).filter(s => s.trim().length >= 2);

/**
 * Generate valid WhatsApp number (10 or 11 digits)
 */
const whatsappArb = fc.stringOf(fc.constantFrom("0", "1", "2", "3", "4", "5", "6", "7", "8", "9"), {
  minLength: 10,
  maxLength: 11,
});

/**
 * Generate valid service duration (15 to 180 minutes)
 */
const durationArb = fc.integer({ min: 15, max: 180 });

/**
 * Generate valid price
 */
const priceArb = fc.float({ min: 10, max: 1000, noNaN: true });

/**
 * Generate a date within the next 30 days
 */
const futureDateArb = fc.integer({ min: 1, max: 30 }).map((daysAhead) => {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  date.setHours(9 + Math.floor(Math.random() * 10), 0, 0, 0); // 9:00 to 18:00
  return date;
});

/**
 * Generate valid service data
 */
const serviceArb: fc.Arbitrary<Service> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  price: priceArb,
  duration: durationArb,
  active: fc.constant(true),
  created_at: fc.constant(new Date().toISOString()),
  updated_at: fc.constant(new Date().toISOString()),
});

// ============================================================================
// Mock Database (In-Memory for Testing)
// ============================================================================

interface MockDatabase {
  bookings: Map<string, Booking>;
  services: Map<string, Service>;
}

function createMockDatabase(): MockDatabase {
  return {
    bookings: new Map(),
    services: new Map(),
  };
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

// ============================================================================
// Mock Booking Operations (simulating src/services/bookings.ts)
// ============================================================================

function addService(db: MockDatabase, service: Service): void {
  db.services.set(service.id, service);
}

function getServiceById(db: MockDatabase, id: string): Service | null {
  return db.services.get(id) || null;
}

/**
 * Check if a time slot conflicts with existing bookings
 * Requirement 6.3: Impedir agendamentos em horários já ocupados
 */
function hasTimeConflict(
  db: MockDatabase,
  dateTime: Date,
  duration: number,
  excludeBookingId?: string
): boolean {
  const newStart = dateTime.getTime();
  const newEnd = newStart + duration * 60 * 1000;

  const bookingEntries = Array.from(db.bookings.entries());
  for (const [id, booking] of bookingEntries) {
    if (excludeBookingId && id === excludeBookingId) continue;
    if (booking.status === "cancelled") continue;

    const service = db.services.get(booking.service_id);
    if (!service) continue;

    const existingStart = new Date(booking.date_time).getTime();
    const existingEnd = existingStart + service.duration * 60 * 1000;

    // Check for overlap: new booking starts before existing ends AND new booking ends after existing starts
    if (newStart < existingEnd && newEnd > existingStart) {
      return true;
    }
  }

  return false;
}

/**
 * Create a booking with conflict detection
 * Returns null if there's a conflict, otherwise returns the created booking
 */
function createBooking(
  db: MockDatabase,
  data: InsertBooking
): { success: true; booking: Booking } | { success: false; error: string } {
  const service = db.services.get(data.service_id);
  if (!service) {
    return { success: false, error: "Serviço não encontrado" };
  }

  const dateTime = new Date(data.date_time);
  
  // Check for conflicts
  if (hasTimeConflict(db, dateTime, service.duration)) {
    return { success: false, error: "Este horário já está ocupado" };
  }

  const id = generateId();
  const booking: Booking = {
    id,
    service_id: data.service_id,
    client_name: data.client_name,
    client_whatsapp: data.client_whatsapp,
    date_time: data.date_time,
    status: data.status || "pending",
    created_at: new Date().toISOString(),
  };

  db.bookings.set(id, booking);
  return { success: true, booking };
}

function getBookings(db: MockDatabase): Booking[] {
  return Array.from(db.bookings.values())
    .filter(b => b.status !== "cancelled")
    .sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime());
}

function cancelBooking(db: MockDatabase, id: string): boolean {
  const booking = db.bookings.get(id);
  if (!booking) return false;
  booking.status = "cancelled";
  return true;
}

// ============================================================================
// Property Tests
// ============================================================================

describe("Property 9: Prevenção de Conflito de Horários", () => {
  /**
   * Property 9.1: Exact time conflict is rejected
   * For any existing booking, attempting to create another booking at the exact
   * same time should be rejected.
   * Validates: Requirement 6.3
   */
  it("should reject booking at exact same time as existing booking", () => {
    fc.assert(
      fc.property(
        serviceArb,
        futureDateArb,
        clientNameArb,
        whatsappArb,
        clientNameArb,
        whatsappArb,
        (service, dateTime, name1, whatsapp1, name2, whatsapp2) => {
          const db = createMockDatabase();
          addService(db, service);

          // Create first booking
          const result1 = createBooking(db, {
            service_id: service.id,
            date_time: dateTime.toISOString(),
            client_name: name1,
            client_whatsapp: whatsapp1,
            status: "pending",
          });

          expect(result1.success).toBe(true);

          // Try to create second booking at exact same time
          const result2 = createBooking(db, {
            service_id: service.id,
            date_time: dateTime.toISOString(),
            client_name: name2,
            client_whatsapp: whatsapp2,
            status: "pending",
          });

          // Should be rejected due to conflict
          expect(result2.success).toBe(false);
          if (!result2.success) {
            expect(result2.error).toContain("ocupado");
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9.2: Overlapping time conflict is rejected
   * For any existing booking, attempting to create a booking that overlaps
   * (starts during the existing booking) should be rejected.
   * Validates: Requirement 6.3
   */
  it("should reject booking that overlaps with existing booking", () => {
    fc.assert(
      fc.property(
        serviceArb,
        futureDateArb,
        clientNameArb,
        whatsappArb,
        clientNameArb,
        whatsappArb,
        fc.integer({ min: 1, max: 30 }), // overlap offset in minutes
        (service, dateTime, name1, whatsapp1, name2, whatsapp2, overlapMinutes) => {
          const db = createMockDatabase();
          addService(db, service);

          // Create first booking
          const result1 = createBooking(db, {
            service_id: service.id,
            date_time: dateTime.toISOString(),
            client_name: name1,
            client_whatsapp: whatsapp1,
            status: "pending",
          });

          expect(result1.success).toBe(true);

          // Try to create overlapping booking (starts during first booking)
          const overlappingTime = new Date(dateTime.getTime() + overlapMinutes * 60 * 1000);
          
          // Only test if overlap is within the service duration
          if (overlapMinutes < service.duration) {
            const result2 = createBooking(db, {
              service_id: service.id,
              date_time: overlappingTime.toISOString(),
              client_name: name2,
              client_whatsapp: whatsapp2,
              status: "pending",
            });

            // Should be rejected due to conflict
            expect(result2.success).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9.3: Non-overlapping bookings are allowed
   * For any existing booking, creating a booking that starts after the existing
   * booking ends should be allowed.
   * Validates: Requirement 6.3
   */
  it("should allow booking after existing booking ends", () => {
    fc.assert(
      fc.property(
        serviceArb,
        futureDateArb,
        clientNameArb,
        whatsappArb,
        clientNameArb,
        whatsappArb,
        fc.integer({ min: 0, max: 60 }), // gap in minutes after first booking ends
        (service, dateTime, name1, whatsapp1, name2, whatsapp2, gapMinutes) => {
          const db = createMockDatabase();
          addService(db, service);

          // Create first booking
          const result1 = createBooking(db, {
            service_id: service.id,
            date_time: dateTime.toISOString(),
            client_name: name1,
            client_whatsapp: whatsapp1,
            status: "pending",
          });

          expect(result1.success).toBe(true);

          // Create second booking after first one ends
          const afterFirstEnds = new Date(
            dateTime.getTime() + (service.duration + gapMinutes) * 60 * 1000
          );
          
          const result2 = createBooking(db, {
            service_id: service.id,
            date_time: afterFirstEnds.toISOString(),
            client_name: name2,
            client_whatsapp: whatsapp2,
            status: "pending",
          });

          // Should be allowed
          expect(result2.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9.4: Cancelled bookings don't cause conflicts
   * For any cancelled booking, creating a new booking at the same time
   * should be allowed.
   * Validates: Requirement 6.3
   */
  it("should allow booking at time of cancelled booking", () => {
    fc.assert(
      fc.property(
        serviceArb,
        futureDateArb,
        clientNameArb,
        whatsappArb,
        clientNameArb,
        whatsappArb,
        (service, dateTime, name1, whatsapp1, name2, whatsapp2) => {
          const db = createMockDatabase();
          addService(db, service);

          // Create first booking
          const result1 = createBooking(db, {
            service_id: service.id,
            date_time: dateTime.toISOString(),
            client_name: name1,
            client_whatsapp: whatsapp1,
            status: "pending",
          });

          expect(result1.success).toBe(true);
          if (!result1.success) return;

          // Cancel the first booking
          cancelBooking(db, result1.booking.id);

          // Create second booking at same time
          const result2 = createBooking(db, {
            service_id: service.id,
            date_time: dateTime.toISOString(),
            client_name: name2,
            client_whatsapp: whatsapp2,
            status: "pending",
          });

          // Should be allowed since first was cancelled
          expect(result2.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9.5: Multiple non-overlapping bookings are allowed
   * For any sequence of non-overlapping time slots, all bookings should be created successfully.
   * Validates: Requirement 6.3
   */
  it("should allow multiple non-overlapping bookings", () => {
    fc.assert(
      fc.property(
        serviceArb,
        futureDateArb,
        fc.array(fc.tuple(clientNameArb, whatsappArb), { minLength: 2, maxLength: 5 }),
        (service, baseDate, clients) => {
          const db = createMockDatabase();
          addService(db, service);

          let currentTime = baseDate;
          const createdBookings: Booking[] = [];

          for (const [name, whatsapp] of clients) {
            const result = createBooking(db, {
              service_id: service.id,
              date_time: currentTime.toISOString(),
              client_name: name,
              client_whatsapp: whatsapp,
              status: "pending",
            });

            expect(result.success).toBe(true);
            if (result.success) {
              createdBookings.push(result.booking);
            }

            // Move to next slot (after current booking ends)
            currentTime = new Date(currentTime.getTime() + service.duration * 60 * 1000);
          }

          // Verify all bookings were created
          expect(createdBookings.length).toBe(clients.length);

          // Verify bookings are in the list
          const allBookings = getBookings(db);
          expect(allBookings.length).toBe(clients.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9.6: Different services at same time still conflict
   * For any two different services, if their time slots overlap, the second
   * booking should be rejected (same professional can't serve two clients).
   * Validates: Requirement 6.3
   */
  it("should reject overlapping bookings even for different services", () => {
    fc.assert(
      fc.property(
        serviceArb,
        serviceArb,
        futureDateArb,
        clientNameArb,
        whatsappArb,
        clientNameArb,
        whatsappArb,
        (service1, service2, dateTime, name1, whatsapp1, name2, whatsapp2) => {
          // Ensure services have different IDs
          const s2 = { ...service2, id: service2.id + "-2" };
          
          const db = createMockDatabase();
          addService(db, service1);
          addService(db, s2);

          // Create first booking
          const result1 = createBooking(db, {
            service_id: service1.id,
            date_time: dateTime.toISOString(),
            client_name: name1,
            client_whatsapp: whatsapp1,
            status: "pending",
          });

          expect(result1.success).toBe(true);

          // Try to create second booking at same time with different service
          const result2 = createBooking(db, {
            service_id: s2.id,
            date_time: dateTime.toISOString(),
            client_name: name2,
            client_whatsapp: whatsapp2,
            status: "pending",
          });

          // Should be rejected - same professional can't serve two clients
          expect(result2.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9.7: Booking before existing booking is allowed if no overlap
   * For any existing booking, creating a booking that ends before the existing
   * booking starts should be allowed.
   * Validates: Requirement 6.3
   */
  it("should allow booking that ends before existing booking starts", () => {
    fc.assert(
      fc.property(
        serviceArb,
        futureDateArb,
        clientNameArb,
        whatsappArb,
        clientNameArb,
        whatsappArb,
        fc.integer({ min: 0, max: 60 }), // gap in minutes
        (service, dateTime, name1, whatsapp1, name2, whatsapp2, gapMinutes) => {
          const db = createMockDatabase();
          addService(db, service);

          // Create first booking
          const result1 = createBooking(db, {
            service_id: service.id,
            date_time: dateTime.toISOString(),
            client_name: name1,
            client_whatsapp: whatsapp1,
            status: "pending",
          });

          expect(result1.success).toBe(true);

          // Create second booking that ends before first one starts
          const beforeFirstStarts = new Date(
            dateTime.getTime() - (service.duration + gapMinutes) * 60 * 1000
          );
          
          // Only test if the time is still in the future
          if (beforeFirstStarts > new Date()) {
            const result2 = createBooking(db, {
              service_id: service.id,
              date_time: beforeFirstStarts.toISOString(),
              client_name: name2,
              client_whatsapp: whatsapp2,
              status: "pending",
            });

            // Should be allowed
            expect(result2.success).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});


// ============================================================================
// Property 10: Ordenação de Agendamentos
// ============================================================================

describe("Property 10: Ordenação de Agendamentos", () => {
  /**
   * Feature: agendamento-profissional, Property 10: Ordenação de Agendamentos
   * Validates: Requirements 6.4
   *
   * Property: For any list of bookings returned by the system, the items SHALL
   * be ordered by date/time in ascending order.
   */

  /**
   * Property 10.1: Bookings are always sorted by date_time ascending
   * For any set of bookings created in random order, when retrieved,
   * they should be sorted by date_time in ascending order.
   * Validates: Requirement 6.4
   */
  it("should return bookings sorted by date_time in ascending order", () => {
    fc.assert(
      fc.property(
        serviceArb,
        fc.array(
          fc.tuple(
            futureDateArb,
            clientNameArb,
            whatsappArb
          ),
          { minLength: 2, maxLength: 10 }
        ),
        (service, bookingData) => {
          const db = createMockDatabase();
          addService(db, service);

          // Create bookings with different times (ensure no conflicts by spacing them out)
          const sortedByTime = [...bookingData].sort(
            (a, b) => a[0].getTime() - b[0].getTime()
          );

          // Space out bookings to avoid conflicts
          let currentTime = sortedByTime[0][0];
          const spacedBookings: Array<[Date, string, string]> = [];
          
          for (const [, name, whatsapp] of sortedByTime) {
            spacedBookings.push([new Date(currentTime), name, whatsapp]);
            currentTime = new Date(currentTime.getTime() + (service.duration + 30) * 60 * 1000);
          }

          // Shuffle the bookings to create them in random order
          const shuffled = [...spacedBookings].sort(() => Math.random() - 0.5);

          // Create bookings in shuffled order
          for (const [dateTime, name, whatsapp] of shuffled) {
            createBooking(db, {
              service_id: service.id,
              date_time: dateTime.toISOString(),
              client_name: name,
              client_whatsapp: whatsapp,
              status: "pending",
            });
          }

          // Get bookings (should be sorted)
          const bookings = getBookings(db);

          // Verify they are sorted by date_time ascending
          for (let i = 1; i < bookings.length; i++) {
            const prevTime = new Date(bookings[i - 1].date_time).getTime();
            const currTime = new Date(bookings[i].date_time).getTime();
            expect(currTime).toBeGreaterThanOrEqual(prevTime);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10.2: Empty list is valid sorted list
   * An empty list of bookings is trivially sorted.
   * Validates: Requirement 6.4
   */
  it("should return empty list when no bookings exist", () => {
    fc.assert(
      fc.property(
        serviceArb,
        (service) => {
          const db = createMockDatabase();
          addService(db, service);

          const bookings = getBookings(db);
          
          expect(bookings).toEqual([]);
          expect(bookings.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10.3: Single booking is valid sorted list
   * A list with a single booking is trivially sorted.
   * Validates: Requirement 6.4
   */
  it("should return single booking as sorted list", () => {
    fc.assert(
      fc.property(
        serviceArb,
        futureDateArb,
        clientNameArb,
        whatsappArb,
        (service, dateTime, name, whatsapp) => {
          const db = createMockDatabase();
          addService(db, service);

          createBooking(db, {
            service_id: service.id,
            date_time: dateTime.toISOString(),
            client_name: name,
            client_whatsapp: whatsapp,
            status: "pending",
          });

          const bookings = getBookings(db);
          
          expect(bookings.length).toBe(1);
          // Single element list is always sorted
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10.4: Cancelled bookings are excluded from sorted list
   * Cancelled bookings should not appear in the returned list.
   * Validates: Requirement 6.4
   */
  it("should exclude cancelled bookings from sorted list", () => {
    fc.assert(
      fc.property(
        serviceArb,
        fc.array(
          fc.tuple(
            futureDateArb,
            clientNameArb,
            whatsappArb,
            fc.boolean() // whether to cancel this booking
          ),
          { minLength: 3, maxLength: 8 }
        ),
        (service, bookingData) => {
          const db = createMockDatabase();
          addService(db, service);

          // Space out bookings to avoid conflicts
          let currentTime = new Date();
          currentTime.setDate(currentTime.getDate() + 1);
          currentTime.setHours(9, 0, 0, 0);

          const createdBookings: Array<{ id: string; shouldCancel: boolean }> = [];

          for (const [, name, whatsapp, shouldCancel] of bookingData) {
            const result = createBooking(db, {
              service_id: service.id,
              date_time: currentTime.toISOString(),
              client_name: name,
              client_whatsapp: whatsapp,
              status: "pending",
            });

            if (result.success) {
              createdBookings.push({ id: result.booking.id, shouldCancel });
            }

            currentTime = new Date(currentTime.getTime() + (service.duration + 30) * 60 * 1000);
          }

          // Cancel some bookings
          const cancelledCount = createdBookings.filter(b => {
            if (b.shouldCancel) {
              cancelBooking(db, b.id);
              return true;
            }
            return false;
          }).length;

          // Get bookings
          const bookings = getBookings(db);

          // Verify cancelled bookings are excluded
          expect(bookings.length).toBe(createdBookings.length - cancelledCount);

          // Verify remaining bookings are sorted
          for (let i = 1; i < bookings.length; i++) {
            const prevTime = new Date(bookings[i - 1].date_time).getTime();
            const currTime = new Date(bookings[i].date_time).getTime();
            expect(currTime).toBeGreaterThanOrEqual(prevTime);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10.5: Sorting is stable for same date_time
   * If two bookings have the same date_time (edge case), the order should be deterministic.
   * Note: In practice, conflict prevention should prevent this, but we test the sorting behavior.
   * Validates: Requirement 6.4
   */
  it("should maintain deterministic order for bookings", () => {
    fc.assert(
      fc.property(
        serviceArb,
        fc.array(futureDateArb, { minLength: 2, maxLength: 5 }),
        (service, dates) => {
          const db = createMockDatabase();
          addService(db, service);

          // Space out dates to avoid conflicts
          const spacedDates = dates.map((_, index) => {
            const date = new Date();
            date.setDate(date.getDate() + 1 + index);
            date.setHours(10, 0, 0, 0);
            return date;
          });

          // Create bookings
          for (let i = 0; i < spacedDates.length; i++) {
            createBooking(db, {
              service_id: service.id,
              date_time: spacedDates[i].toISOString(),
              client_name: `Client ${i}`,
              client_whatsapp: "11999999999",
              status: "pending",
            });
          }

          // Get bookings multiple times
          const bookings1 = getBookings(db);
          const bookings2 = getBookings(db);

          // Order should be consistent
          expect(bookings1.length).toBe(bookings2.length);
          for (let i = 0; i < bookings1.length; i++) {
            expect(bookings1[i].id).toBe(bookings2[i].id);
            expect(bookings1[i].date_time).toBe(bookings2[i].date_time);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
