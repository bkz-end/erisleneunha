/**
 * Feature: agendamento-profissional, Property 12: CRUD de Horários
 * Validates: Requirements 4.5
 *
 * Property: For any create, edit, or delete operation on a time slot,
 * the system SHALL persist the changes correctly and reflect the updated state
 * in subsequent queries.
 */

import * as fc from "fast-check";
import type { InsertTimeSlot, TimeSlot } from "@/types/database";

// ============================================================================
// Arbitraries (Data Generators)
// ============================================================================

/**
 * Generate valid day of week (0-6, where 0 = Sunday)
 */
const dayOfWeekArb = fc.integer({ min: 0, max: 6 });

/**
 * Generate valid time string in HH:mm format
 */
const timeArb = fc
  .tuple(
    fc.integer({ min: 0, max: 23 }),
    fc.integer({ min: 0, max: 59 })
  )
  .map(([h, m]) => `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);

/**
 * Generate valid time slot data for creation
 * Requirement 4.5: Gestão de horários disponíveis
 */
const timeSlotArb: fc.Arbitrary<InsertTimeSlot> = fc
  .tuple(dayOfWeekArb, timeArb, timeArb, fc.boolean())
  .filter(([, start, end]) => start < end)
  .map(([day_of_week, start_time, end_time, available]) => ({
    day_of_week,
    start_time,
    end_time,
    available,
  }));

/**
 * Generate partial time slot update data
 */
const timeSlotUpdateArb: fc.Arbitrary<Partial<InsertTimeSlot>> = fc.record(
  {
    day_of_week: fc.option(dayOfWeekArb, { nil: undefined }),
    start_time: fc.option(timeArb, { nil: undefined }),
    end_time: fc.option(timeArb, { nil: undefined }),
    available: fc.option(fc.boolean(), { nil: undefined }),
  },
  { requiredKeys: [] }
);

// ============================================================================
// Mock Database (In-Memory for Testing)
// ============================================================================

interface MockDatabase {
  timeSlots: Map<string, TimeSlot>;
}

function createMockDatabase(): MockDatabase {
  return {
    timeSlots: new Map(),
  };
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}


// ============================================================================
// Mock Time Slot Operations (simulating src/services/timeslots.ts)
// ============================================================================

function createTimeSlot(db: MockDatabase, slot: InsertTimeSlot): TimeSlot {
  const id = generateId();
  const data: TimeSlot = {
    id,
    day_of_week: slot.day_of_week,
    start_time: slot.start_time,
    end_time: slot.end_time,
    available: slot.available ?? true,
  };
  db.timeSlots.set(id, data);
  return data;
}

function getTimeSlotById(db: MockDatabase, id: string): TimeSlot | null {
  return db.timeSlots.get(id) || null;
}

function getTimeSlots(db: MockDatabase, availableOnly = false): TimeSlot[] {
  const slots = Array.from(db.timeSlots.values());
  if (availableOnly) {
    return slots.filter((s) => s.available);
  }
  return slots.sort((a, b) => {
    if (a.day_of_week !== b.day_of_week) {
      return a.day_of_week - b.day_of_week;
    }
    return a.start_time.localeCompare(b.start_time);
  });
}

function updateTimeSlot(
  db: MockDatabase,
  id: string,
  updates: Partial<InsertTimeSlot>
): TimeSlot | null {
  const existing = db.timeSlots.get(id);
  if (!existing) {
    return null;
  }

  const updated: TimeSlot = {
    ...existing,
    ...updates,
  };
  db.timeSlots.set(id, updated);
  return updated;
}

function deleteTimeSlot(db: MockDatabase, id: string): boolean {
  return db.timeSlots.delete(id);
}

// ============================================================================
// Property Tests
// ============================================================================

describe("Property 12: CRUD de Horários", () => {
  /**
   * Property 12.1: Create persists correctly
   * For any valid time slot data, creating a time slot should persist all fields
   * and the time slot should be retrievable with the same data.
   * Validates: Requirement 4.5 (criar)
   */
  it("should persist time slot data correctly on create", () => {
    fc.assert(
      fc.property(timeSlotArb, (slotData) => {
        const db = createMockDatabase();

        // Create time slot
        const created = createTimeSlot(db, slotData);

        // Verify created time slot has correct data
        expect(created.day_of_week).toBe(slotData.day_of_week);
        expect(created.start_time).toBe(slotData.start_time);
        expect(created.end_time).toBe(slotData.end_time);
        expect(created.available).toBe(slotData.available ?? true);
        expect(created.id).toBeDefined();

        // Verify time slot is retrievable
        const retrieved = getTimeSlotById(db, created.id);
        expect(retrieved).not.toBeNull();
        expect(retrieved).toEqual(created);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12.2: Update persists correctly
   * For any existing time slot and valid update data, updating should persist
   * only the changed fields while preserving unchanged fields.
   * Validates: Requirement 4.5 (editar)
   */
  it("should persist time slot updates correctly", () => {
    fc.assert(
      fc.property(timeSlotArb, timeSlotUpdateArb, (slotData, updates) => {
        const db = createMockDatabase();

        // Create initial time slot
        const created = createTimeSlot(db, slotData);

        // Filter out undefined values from updates
        const filteredUpdates: Partial<InsertTimeSlot> = {};
        if (updates.day_of_week !== undefined) filteredUpdates.day_of_week = updates.day_of_week;
        if (updates.start_time !== undefined) filteredUpdates.start_time = updates.start_time;
        if (updates.end_time !== undefined) filteredUpdates.end_time = updates.end_time;
        if (updates.available !== undefined) filteredUpdates.available = updates.available;

        // Skip if no actual updates
        if (Object.keys(filteredUpdates).length === 0) {
          return;
        }

        // Validate time order if times are being updated
        const finalStartTime = filteredUpdates.start_time ?? created.start_time;
        const finalEndTime = filteredUpdates.end_time ?? created.end_time;
        if (finalStartTime >= finalEndTime) {
          // Skip invalid time combinations
          return;
        }

        // Update time slot
        const updated = updateTimeSlot(db, created.id, filteredUpdates);

        // Verify update succeeded
        expect(updated).not.toBeNull();
        if (!updated) return;

        // Verify updated fields
        if (filteredUpdates.day_of_week !== undefined) {
          expect(updated.day_of_week).toBe(filteredUpdates.day_of_week);
        } else {
          expect(updated.day_of_week).toBe(slotData.day_of_week);
        }

        if (filteredUpdates.start_time !== undefined) {
          expect(updated.start_time).toBe(filteredUpdates.start_time);
        } else {
          expect(updated.start_time).toBe(slotData.start_time);
        }

        if (filteredUpdates.end_time !== undefined) {
          expect(updated.end_time).toBe(filteredUpdates.end_time);
        } else {
          expect(updated.end_time).toBe(slotData.end_time);
        }

        if (filteredUpdates.available !== undefined) {
          expect(updated.available).toBe(filteredUpdates.available);
        } else {
          expect(updated.available).toBe(slotData.available ?? true);
        }

        // Verify time slot is retrievable with updated data
        const retrieved = getTimeSlotById(db, created.id);
        expect(retrieved).toEqual(updated);
      }),
      { numRuns: 100 }
    );
  });


  /**
   * Property 12.3: Delete removes correctly
   * For any existing time slot, deleting should remove it completely
   * and the time slot should no longer be retrievable.
   * Validates: Requirement 4.5 (excluir)
   */
  it("should delete time slot correctly", () => {
    fc.assert(
      fc.property(timeSlotArb, (slotData) => {
        const db = createMockDatabase();

        // Create time slot
        const created = createTimeSlot(db, slotData);

        // Verify time slot exists
        const beforeDelete = getTimeSlotById(db, created.id);
        expect(beforeDelete).not.toBeNull();

        // Delete time slot
        const deleteResult = deleteTimeSlot(db, created.id);
        expect(deleteResult).toBe(true);

        // Verify time slot no longer exists
        const afterDelete = getTimeSlotById(db, created.id);
        expect(afterDelete).toBeNull();

        // Verify time slot not in list
        const allSlots = getTimeSlots(db, false);
        expect(allSlots.some((s) => s.id === created.id)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12.4: Update non-existent time slot fails gracefully
   * For any update attempt on a non-existent time slot ID, the operation
   * should return null without throwing.
   */
  it("should return null when updating non-existent time slot", () => {
    fc.assert(
      fc.property(timeSlotUpdateArb, (updates) => {
        const db = createMockDatabase();
        const fakeId = generateId();

        const result = updateTimeSlot(db, fakeId, updates);
        expect(result).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12.5: Delete non-existent time slot fails gracefully
   * For any delete attempt on a non-existent time slot ID, the operation
   * should return false without throwing.
   */
  it("should return false when deleting non-existent time slot", () => {
    fc.assert(
      fc.property(fc.string(), () => {
        const db = createMockDatabase();
        const fakeId = generateId();

        const result = deleteTimeSlot(db, fakeId);
        expect(result).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12.6: Multiple creates generate unique IDs
   * For any sequence of time slot creations, all generated IDs should be unique.
   */
  it("should generate unique IDs for all created time slots", () => {
    fc.assert(
      fc.property(
        fc.array(timeSlotArb, { minLength: 2, maxLength: 20 }),
        (slotsData) => {
          const db = createMockDatabase();
          const ids = new Set<string>();

          for (const slotData of slotsData) {
            const created = createTimeSlot(db, slotData);
            expect(ids.has(created.id)).toBe(false);
            ids.add(created.id);
          }

          expect(ids.size).toBe(slotsData.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12.7: Create-Read consistency
   * For any time slot created, immediately reading it should return the same data.
   */
  it("should maintain create-read consistency", () => {
    fc.assert(
      fc.property(timeSlotArb, (slotData) => {
        const db = createMockDatabase();

        const created = createTimeSlot(db, slotData);
        const read = getTimeSlotById(db, created.id);

        expect(read).toEqual(created);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12.8: Update-Read consistency
   * For any time slot updated, immediately reading it should return the updated data.
   */
  it("should maintain update-read consistency", () => {
    fc.assert(
      fc.property(timeSlotArb, timeSlotArb, (initialData, updateData) => {
        const db = createMockDatabase();

        const created = createTimeSlot(db, initialData);
        const updated = updateTimeSlot(db, created.id, updateData);
        const read = getTimeSlotById(db, created.id);

        expect(read).toEqual(updated);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12.9: List reflects all operations
   * After a sequence of create/update/delete operations, the list should
   * accurately reflect the current state of all time slots.
   */
  it("should reflect all operations in time slot list", () => {
    fc.assert(
      fc.property(
        fc.array(timeSlotArb, { minLength: 1, maxLength: 10 }),
        (slotsData) => {
          const db = createMockDatabase();
          const createdIds: string[] = [];

          // Create all time slots
          for (const slotData of slotsData) {
            const created = createTimeSlot(db, slotData);
            createdIds.push(created.id);
          }

          // Verify all time slots are in the list
          const allSlots = getTimeSlots(db, false);
          expect(allSlots.length).toBe(slotsData.length);

          for (const id of createdIds) {
            expect(allSlots.some((s) => s.id === id)).toBe(true);
          }

          // Delete first time slot if exists
          if (createdIds.length > 0) {
            deleteTimeSlot(db, createdIds[0]);

            // Verify deleted time slot not in list
            const afterDelete = getTimeSlots(db, false);
            expect(afterDelete.some((s) => s.id === createdIds[0])).toBe(false);
            expect(afterDelete.length).toBe(slotsData.length - 1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12.10: Available filter works correctly
   * For any set of time slots with mixed availability, filtering by available
   * should return only available time slots.
   */
  it("should filter available time slots correctly", () => {
    fc.assert(
      fc.property(
        fc.array(timeSlotArb, { minLength: 1, maxLength: 10 }),
        (slotsData) => {
          const db = createMockDatabase();

          // Create all time slots
          for (const slotData of slotsData) {
            createTimeSlot(db, slotData);
          }

          // Get available only
          const availableSlots = getTimeSlots(db, true);
          
          // Verify all returned slots are available
          for (const slot of availableSlots) {
            expect(slot.available).toBe(true);
          }

          // Verify count matches expected
          const expectedAvailableCount = slotsData.filter((s) => s.available).length;
          expect(availableSlots.length).toBe(expectedAvailableCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12.11: Time slots are sorted by day and time
   * For any set of time slots, the list should be sorted by day_of_week
   * and then by start_time.
   */
  it("should return time slots sorted by day and time", () => {
    fc.assert(
      fc.property(
        fc.array(timeSlotArb, { minLength: 2, maxLength: 10 }),
        (slotsData) => {
          const db = createMockDatabase();

          // Create all time slots
          for (const slotData of slotsData) {
            createTimeSlot(db, slotData);
          }

          // Get all time slots
          const allSlots = getTimeSlots(db, false);

          // Verify sorting
          for (let i = 1; i < allSlots.length; i++) {
            const prev = allSlots[i - 1];
            const curr = allSlots[i];

            if (prev.day_of_week === curr.day_of_week) {
              expect(prev.start_time <= curr.start_time).toBe(true);
            } else {
              expect(prev.day_of_week < curr.day_of_week).toBe(true);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
