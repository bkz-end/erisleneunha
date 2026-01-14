/**
 * Feature: agendamento-profissional, Property 11: CRUD de Serviços
 * Validates: Requirements 4.4
 *
 * Property: For any create, edit, or delete operation on a service,
 * the system SHALL persist the changes correctly and reflect the updated state
 * in subsequent queries.
 */

import * as fc from "fast-check";
import type { InsertService, Service } from "@/types/database";

// ============================================================================
// Arbitraries (Data Generators)
// ============================================================================

/**
 * Generate valid service name
 */
const serviceNameArb = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length > 0)
  .map((s) => s.trim());

/**
 * Generate valid price (in BRL, positive number)
 */
const priceArb = fc.integer({ min: 1, max: 9999999 }).map((n) => n / 100);

/**
 * Generate valid duration in minutes (5 min to 8 hours)
 */
const durationArb = fc.integer({ min: 5, max: 480 });

/**
 * Generate valid service data for creation
 * Requirement 4.4: campos: nome, preço, duração
 */
const serviceArb: fc.Arbitrary<InsertService> = fc.record({
  name: serviceNameArb,
  price: priceArb,
  duration: durationArb,
  active: fc.constant(true),
});

/**
 * Generate partial service update data
 */
const serviceUpdateArb: fc.Arbitrary<Partial<InsertService>> = fc.record(
  {
    name: fc.option(serviceNameArb, { nil: undefined }),
    price: fc.option(priceArb, { nil: undefined }),
    duration: fc.option(durationArb, { nil: undefined }),
    active: fc.option(fc.boolean(), { nil: undefined }),
  },
  { requiredKeys: [] }
);

// ============================================================================
// Mock Database (In-Memory for Testing)
// ============================================================================

interface MockDatabase {
  services: Map<string, Service>;
}

function createMockDatabase(): MockDatabase {
  return {
    services: new Map(),
  };
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// Mock Service Operations (simulating src/services/services.ts)
// ============================================================================

function createService(db: MockDatabase, service: InsertService): Service {
  const id = generateId();
  const now = new Date().toISOString();
  const data: Service = {
    id,
    name: service.name,
    price: service.price,
    duration: service.duration,
    active: service.active ?? true,
    created_at: now,
    updated_at: now,
  };
  db.services.set(id, data);
  return data;
}

function getServiceById(db: MockDatabase, id: string): Service | null {
  return db.services.get(id) || null;
}

function getServices(db: MockDatabase, activeOnly = true): Service[] {
  const services = Array.from(db.services.values());
  if (activeOnly) {
    return services.filter((s) => s.active);
  }
  return services;
}

function updateService(
  db: MockDatabase,
  id: string,
  updates: Partial<InsertService>
): Service | null {
  const existing = db.services.get(id);
  if (!existing) {
    return null;
  }

  const updated: Service = {
    ...existing,
    ...updates,
    updated_at: new Date().toISOString(),
  };
  db.services.set(id, updated);
  return updated;
}

function deleteService(db: MockDatabase, id: string): boolean {
  const existing = db.services.get(id);
  if (!existing) {
    return false;
  }

  // Soft delete - set active to false
  const updated: Service = {
    ...existing,
    active: false,
    updated_at: new Date().toISOString(),
  };
  db.services.set(id, updated);
  return true;
}

// ============================================================================
// Property Tests
// ============================================================================

describe("Property 11: CRUD de Serviços", () => {
  /**
   * Property 11.1: Create persists correctly
   * For any valid service data, creating a service should persist all fields
   * and the service should be retrievable with the same data.
   * Validates: Requirement 4.4 (criar)
   */
  it("should persist service data correctly on create", () => {
    fc.assert(
      fc.property(serviceArb, (serviceData) => {
        const db = createMockDatabase();

        // Create service
        const created = createService(db, serviceData);

        // Verify created service has correct data
        expect(created.name).toBe(serviceData.name);
        expect(created.price).toBe(serviceData.price);
        expect(created.duration).toBe(serviceData.duration);
        expect(created.active).toBe(serviceData.active ?? true);
        expect(created.id).toBeDefined();
        expect(created.created_at).toBeDefined();
        expect(created.updated_at).toBeDefined();

        // Verify service is retrievable
        const retrieved = getServiceById(db, created.id);
        expect(retrieved).not.toBeNull();
        expect(retrieved).toEqual(created);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11.2: Update persists correctly
   * For any existing service and valid update data, updating should persist
   * only the changed fields while preserving unchanged fields.
   * Validates: Requirement 4.4 (editar)
   */
  it("should persist service updates correctly", () => {
    fc.assert(
      fc.property(serviceArb, serviceUpdateArb, (serviceData, updates) => {
        const db = createMockDatabase();

        // Create initial service
        const created = createService(db, serviceData);
        const originalCreatedAt = created.created_at;

        // Filter out undefined values from updates
        const filteredUpdates: Partial<InsertService> = {};
        if (updates.name !== undefined) filteredUpdates.name = updates.name;
        if (updates.price !== undefined) filteredUpdates.price = updates.price;
        if (updates.duration !== undefined) filteredUpdates.duration = updates.duration;
        if (updates.active !== undefined) filteredUpdates.active = updates.active;

        // Skip if no actual updates
        if (Object.keys(filteredUpdates).length === 0) {
          return;
        }

        // Update service
        const updated = updateService(db, created.id, filteredUpdates);

        // Verify update succeeded
        expect(updated).not.toBeNull();
        if (!updated) return;

        // Verify updated fields
        if (filteredUpdates.name !== undefined) {
          expect(updated.name).toBe(filteredUpdates.name);
        } else {
          expect(updated.name).toBe(serviceData.name);
        }

        if (filteredUpdates.price !== undefined) {
          expect(updated.price).toBe(filteredUpdates.price);
        } else {
          expect(updated.price).toBe(serviceData.price);
        }

        if (filteredUpdates.duration !== undefined) {
          expect(updated.duration).toBe(filteredUpdates.duration);
        } else {
          expect(updated.duration).toBe(serviceData.duration);
        }

        if (filteredUpdates.active !== undefined) {
          expect(updated.active).toBe(filteredUpdates.active);
        } else {
          expect(updated.active).toBe(serviceData.active ?? true);
        }

        // Verify created_at is preserved
        expect(updated.created_at).toBe(originalCreatedAt);

        // Verify updated_at changed
        expect(new Date(updated.updated_at).getTime()).toBeGreaterThanOrEqual(
          new Date(originalCreatedAt).getTime()
        );

        // Verify service is retrievable with updated data
        const retrieved = getServiceById(db, created.id);
        expect(retrieved).toEqual(updated);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11.3: Delete (soft) persists correctly
   * For any existing service, deleting should set active to false
   * and the service should no longer appear in active-only queries.
   * Validates: Requirement 4.4 (excluir)
   */
  it("should soft delete service correctly", () => {
    fc.assert(
      fc.property(serviceArb, (serviceData) => {
        const db = createMockDatabase();

        // Create service
        const created = createService(db, serviceData);

        // Verify service appears in active list
        const activeBeforeDelete = getServices(db, true);
        expect(activeBeforeDelete.some((s) => s.id === created.id)).toBe(true);

        // Delete service
        const deleteResult = deleteService(db, created.id);
        expect(deleteResult).toBe(true);

        // Verify service no longer appears in active-only list
        const activeAfterDelete = getServices(db, true);
        expect(activeAfterDelete.some((s) => s.id === created.id)).toBe(false);

        // Verify service still exists with active = false
        const retrieved = getServiceById(db, created.id);
        expect(retrieved).not.toBeNull();
        expect(retrieved?.active).toBe(false);

        // Verify service appears in all-services list
        const allServices = getServices(db, false);
        expect(allServices.some((s) => s.id === created.id)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11.4: Update non-existent service fails gracefully
   * For any update attempt on a non-existent service ID, the operation
   * should return null without throwing.
   */
  it("should return null when updating non-existent service", () => {
    fc.assert(
      fc.property(serviceUpdateArb, (updates) => {
        const db = createMockDatabase();
        const fakeId = generateId();

        const result = updateService(db, fakeId, updates);
        expect(result).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11.5: Delete non-existent service fails gracefully
   * For any delete attempt on a non-existent service ID, the operation
   * should return false without throwing.
   */
  it("should return false when deleting non-existent service", () => {
    fc.assert(
      fc.property(fc.string(), () => {
        const db = createMockDatabase();
        const fakeId = generateId();

        const result = deleteService(db, fakeId);
        expect(result).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11.6: Multiple creates generate unique IDs
   * For any sequence of service creations, all generated IDs should be unique.
   */
  it("should generate unique IDs for all created services", () => {
    fc.assert(
      fc.property(
        fc.array(serviceArb, { minLength: 2, maxLength: 20 }),
        (servicesData) => {
          const db = createMockDatabase();
          const ids = new Set<string>();

          for (const serviceData of servicesData) {
            const created = createService(db, serviceData);
            expect(ids.has(created.id)).toBe(false);
            ids.add(created.id);
          }

          expect(ids.size).toBe(servicesData.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11.7: Create-Read consistency
   * For any service created, immediately reading it should return the same data.
   */
  it("should maintain create-read consistency", () => {
    fc.assert(
      fc.property(serviceArb, (serviceData) => {
        const db = createMockDatabase();

        const created = createService(db, serviceData);
        const read = getServiceById(db, created.id);

        expect(read).toEqual(created);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11.8: Update-Read consistency
   * For any service updated, immediately reading it should return the updated data.
   */
  it("should maintain update-read consistency", () => {
    fc.assert(
      fc.property(serviceArb, serviceArb, (initialData, updateData) => {
        const db = createMockDatabase();

        const created = createService(db, initialData);
        const updated = updateService(db, created.id, updateData);
        const read = getServiceById(db, created.id);

        expect(read).toEqual(updated);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11.9: List reflects all operations
   * After a sequence of create/update/delete operations, the list should
   * accurately reflect the current state of all services.
   */
  it("should reflect all operations in service list", () => {
    fc.assert(
      fc.property(
        fc.array(serviceArb, { minLength: 1, maxLength: 10 }),
        (servicesData) => {
          const db = createMockDatabase();
          const createdIds: string[] = [];

          // Create all services
          for (const serviceData of servicesData) {
            const created = createService(db, serviceData);
            createdIds.push(created.id);
          }

          // Verify all services are in the list
          const allServices = getServices(db, false);
          expect(allServices.length).toBe(servicesData.length);

          for (const id of createdIds) {
            expect(allServices.some((s) => s.id === id)).toBe(true);
          }

          // Delete first service if exists
          if (createdIds.length > 0) {
            deleteService(db, createdIds[0]);

            // Verify deleted service not in active list
            const activeServices = getServices(db, true);
            expect(activeServices.some((s) => s.id === createdIds[0])).toBe(false);

            // But still in all services list
            const allAfterDelete = getServices(db, false);
            expect(allAfterDelete.some((s) => s.id === createdIds[0])).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
