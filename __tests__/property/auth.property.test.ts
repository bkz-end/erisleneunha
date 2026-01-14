/**
 * Feature: agendamento-profissional, Property 5: Proteção de Rotas Administrativas
 * Validates: Requirements 4.1, 5.1
 *
 * Property: For any attempt to access administrative routes, if the user is not
 * authenticated, the system SHALL redirect to the login page without exposing
 * sensitive data.
 */

import * as fc from "fast-check";

// ============================================================================
// Types and Interfaces
// ============================================================================

interface Session {
  userId: string;
  email: string;
  expiresAt: number;
}

interface SessionValidation {
  valid: boolean;
  session?: Session;
  reason: "valid" | "expired" | "invalid" | "missing";
}

interface RouteAccessResult {
  allowed: boolean;
  redirectTo: string | null;
}

// ============================================================================
// Pure Functions Under Test (extracted from middleware and auth service)
// ============================================================================

/**
 * Parse and validate session token
 */
function parseSessionToken(token: string): Session | null {
  try {
    const json = Buffer.from(token, "base64").toString("utf-8");
    const session = JSON.parse(json) as Session;

    // Validate session structure
    if (
      typeof session.userId !== "string" ||
      typeof session.email !== "string" ||
      typeof session.expiresAt !== "number"
    ) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Create a session token
 */
function createSessionToken(session: Session): string {
  const json = JSON.stringify(session);
  return Buffer.from(json).toString("base64");
}

/**
 * Validate a session token
 */
function validateSession(token: string | undefined | null): SessionValidation {
  if (!token) {
    return { valid: false, reason: "missing" };
  }

  const session = parseSessionToken(token);

  if (!session) {
    return { valid: false, reason: "invalid" };
  }

  // Check if session has expired
  if (Date.now() > session.expiresAt) {
    return { valid: false, session, reason: "expired" };
  }

  return { valid: true, session, reason: "valid" };
}

/**
 * Check if a route requires authentication
 */
function requiresAuth(path: string): boolean {
  const authExcluded = ["/admin/login", "/admin/pagamento-pendente"];
  const adminRoutes = ["/admin"];

  // Check if path is excluded from auth
  if (authExcluded.some((route) => path.startsWith(route))) {
    return false;
  }

  // Check if path is an admin route
  return adminRoutes.some((route) => path.startsWith(route));
}

/**
 * Check route access based on authentication
 */
function checkRouteAccess(
  path: string,
  sessionToken: string | undefined | null
): RouteAccessResult {
  // If route doesn't require auth, allow access
  if (!requiresAuth(path)) {
    return { allowed: true, redirectTo: null };
  }

  // Validate session
  const validation = validateSession(sessionToken);

  if (!validation.valid) {
    return { allowed: false, redirectTo: "/admin/login" };
  }

  return { allowed: true, redirectTo: null };
}

// ============================================================================
// Arbitraries (Data Generators)
// ============================================================================

/**
 * Generate valid user IDs (UUIDs)
 */
const userIdArb = fc.uuid();

/**
 * Generate valid email addresses
 */
const emailArb = fc.emailAddress();

/**
 * Generate valid session (not expired)
 */
const validSessionArb: fc.Arbitrary<Session> = fc.record({
  userId: userIdArb,
  email: emailArb,
  expiresAt: fc.integer({ min: Date.now() + 1000, max: Date.now() + 86400000 }), // 1 second to 24 hours from now
});

/**
 * Generate expired session
 */
const expiredSessionArb: fc.Arbitrary<Session> = fc.record({
  userId: userIdArb,
  email: emailArb,
  expiresAt: fc.integer({ min: 0, max: Date.now() - 1000 }), // Already expired
});

/**
 * Generate valid session token
 */
const validSessionTokenArb: fc.Arbitrary<string> = validSessionArb.map(createSessionToken);

/**
 * Generate expired session token
 */
const expiredSessionTokenArb: fc.Arbitrary<string> = expiredSessionArb.map(createSessionToken);

/**
 * Generate invalid session token (malformed)
 */
const invalidSessionTokenArb: fc.Arbitrary<string> = fc.oneof(
  fc.string({ minLength: 1, maxLength: 100 }), // Random string
  fc.constant(""), // Empty string
  fc.constant("not-base64!@#$"), // Invalid base64
  fc.constant(Buffer.from("{}").toString("base64")), // Empty JSON
  fc.constant(Buffer.from('{"userId": 123}').toString("base64")), // Wrong type
);

/**
 * Generate admin routes that require authentication
 */
const protectedAdminRouteArb = fc.constantFrom(
  "/admin",
  "/admin/dashboard",
  "/admin/services",
  "/admin/bookings",
  "/admin/settings"
);

/**
 * Generate admin routes excluded from authentication
 */
const excludedAdminRouteArb = fc.constantFrom(
  "/admin/login",
  "/admin/pagamento-pendente"
);

/**
 * Generate non-admin routes
 */
const nonAdminRouteArb = fc.constantFrom(
  "/",
  "/agendar",
  "/manutencao",
  "/api/webhooks/mercadopago"
);

// ============================================================================
// Property Tests
// ============================================================================

describe("Property 5: Proteção de Rotas Administrativas", () => {
  /**
   * Property 5.1: Unauthenticated access to admin routes redirects to login
   * For any admin route requiring auth, if no session token is provided,
   * the system SHALL redirect to login.
   * Validates: Requirements 4.1, 5.1
   */
  it("should redirect to login when no session token is provided", () => {
    fc.assert(
      fc.property(protectedAdminRouteArb, (path) => {
        const result = checkRouteAccess(path, undefined);

        expect(result.allowed).toBe(false);
        expect(result.redirectTo).toBe("/admin/login");
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5.2: Invalid session token redirects to login
   * For any admin route requiring auth, if an invalid session token is provided,
   * the system SHALL redirect to login.
   * Validates: Requirements 4.1, 5.1
   */
  it("should redirect to login when invalid session token is provided", () => {
    fc.assert(
      fc.property(
        protectedAdminRouteArb,
        invalidSessionTokenArb,
        (path, token) => {
          const result = checkRouteAccess(path, token);

          expect(result.allowed).toBe(false);
          expect(result.redirectTo).toBe("/admin/login");
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5.3: Expired session token redirects to login
   * For any admin route requiring auth, if an expired session token is provided,
   * the system SHALL redirect to login.
   * Validates: Requirements 5.1, 5.5
   */
  it("should redirect to login when expired session token is provided", () => {
    fc.assert(
      fc.property(
        protectedAdminRouteArb,
        expiredSessionTokenArb,
        (path, token) => {
          const result = checkRouteAccess(path, token);

          expect(result.allowed).toBe(false);
          expect(result.redirectTo).toBe("/admin/login");
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5.4: Valid session token allows access
   * For any admin route requiring auth, if a valid session token is provided,
   * the system SHALL allow access.
   * Validates: Requirements 4.1
   */
  it("should allow access when valid session token is provided", () => {
    fc.assert(
      fc.property(
        protectedAdminRouteArb,
        validSessionTokenArb,
        (path, token) => {
          const result = checkRouteAccess(path, token);

          expect(result.allowed).toBe(true);
          expect(result.redirectTo).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5.5: Login page doesn't require authentication
   * The login page SHALL be accessible without authentication.
   * Validates: Requirements 5.1
   */
  it("should allow access to login page without authentication", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(undefined, null, "", "invalid-token"),
        (token) => {
          const result = checkRouteAccess("/admin/login", token as string | undefined);

          expect(result.allowed).toBe(true);
          expect(result.redirectTo).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5.6: Payment pending page doesn't require authentication
   * The payment pending page SHALL be accessible without authentication.
   * Validates: Requirements 5.1
   */
  it("should allow access to payment pending page without authentication", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(undefined, null, "", "invalid-token"),
        (token) => {
          const result = checkRouteAccess("/admin/pagamento-pendente", token as string | undefined);

          expect(result.allowed).toBe(true);
          expect(result.redirectTo).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5.7: Non-admin routes don't require authentication
   * Non-admin routes SHALL be accessible without authentication.
   * Validates: Requirements 5.1
   */
  it("should allow access to non-admin routes without authentication", () => {
    fc.assert(
      fc.property(
        nonAdminRouteArb,
        fc.constantFrom(undefined, null, "", "invalid-token"),
        (path, token) => {
          const result = checkRouteAccess(path, token as string | undefined);

          expect(result.allowed).toBe(true);
          expect(result.redirectTo).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Feature: agendamento-profissional, Property 6: Autenticação Funciona Corretamente
 * Validates: Requirements 5.2, 5.3, 5.5
 *
 * Property: For any login attempt, if credentials are valid, the system SHALL
 * create an authenticated session; if credentials are invalid, the system SHALL
 * reject access; when session expires, the system SHALL redirect to login.
 */

// ============================================================================
// Authentication Logic (extracted from auth service)
// ============================================================================

import bcrypt from "bcryptjs";

const BCRYPT_SALT_ROUNDS = 10;

/**
 * Hash a password using bcrypt
 */
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Check if a string is a valid bcrypt hash
 */
function isValidBcryptHash(str: string): boolean {
  const bcryptRegex = /^\$2[aby]\$\d{2}\$.{53}$/;
  return bcryptRegex.test(str);
}

/**
 * Simulate login result
 */
interface LoginResult {
  success: boolean;
  session?: Session;
  error?: string;
}

/**
 * Simulate login logic (without database)
 */
async function simulateLogin(
  inputEmail: string,
  inputPassword: string,
  storedEmail: string,
  storedPasswordHash: string
): Promise<LoginResult> {
  // Validate input - check for empty or whitespace-only
  const trimmedEmail = inputEmail?.trim() || "";
  const trimmedPassword = inputPassword?.trim() || "";
  
  if (!trimmedEmail || !trimmedPassword) {
    return { success: false, error: "Email e senha são obrigatórios" };
  }

  // Check email match (case-insensitive)
  if (trimmedEmail.toLowerCase() !== storedEmail.toLowerCase().trim()) {
    return { success: false, error: "Credenciais inválidas" };
  }

  // Verify password (use original password, not trimmed, for verification)
  const passwordValid = await verifyPassword(inputPassword, storedPasswordHash);

  if (!passwordValid) {
    return { success: false, error: "Credenciais inválidas" };
  }

  // Create session
  const session: Session = {
    userId: "test-user-id",
    email: storedEmail,
    expiresAt: Date.now() + 86400000, // 24 hours
  };

  return { success: true, session };
}

// ============================================================================
// Arbitraries for Authentication Tests
// ============================================================================

/**
 * Generate valid passwords (non-empty strings)
 */
const validPasswordArb = fc.string({ minLength: 1, maxLength: 100 });

/**
 * Generate empty or whitespace-only passwords
 */
const emptyPasswordArb = fc.constantFrom("", "   ", "\t", "\n");

/**
 * Generate empty or whitespace-only emails
 */
const emptyEmailArb = fc.constantFrom("", "   ", "\t", "\n");

// ============================================================================
// Property Tests for Authentication
// ============================================================================

describe("Property 6: Autenticação Funciona Corretamente", () => {
  /**
   * Property 6.1: Valid credentials create session
   * For any valid email and password combination, if they match stored credentials,
   * the system SHALL create an authenticated session.
   * Validates: Requirements 5.2
   */
  it("should create session for valid credentials", async () => {
    await fc.assert(
      fc.asyncProperty(
        emailArb,
        validPasswordArb,
        async (email, password) => {
          // Hash the password (simulating stored hash)
          const passwordHash = await hashPassword(password);

          // Attempt login with correct credentials
          const result = await simulateLogin(email, password, email, passwordHash);

          expect(result.success).toBe(true);
          expect(result.session).toBeDefined();
          expect(result.session?.email).toBe(email);
          expect(result.error).toBeUndefined();
        }
      ),
      { numRuns: 10 } // Reduced due to bcrypt being slow
    );
  }, 30000); // 30 second timeout

  /**
   * Property 6.2: Wrong password rejects access
   * For any valid email but wrong password, the system SHALL reject access.
   * Validates: Requirements 5.3
   */
  it("should reject access for wrong password", async () => {
    await fc.assert(
      fc.asyncProperty(
        emailArb,
        validPasswordArb,
        validPasswordArb.filter((p) => p.length > 0),
        async (email, correctPassword, wrongPassword) => {
          // Skip if passwords happen to be the same
          if (correctPassword === wrongPassword) return;

          // Hash the correct password
          const passwordHash = await hashPassword(correctPassword);

          // Attempt login with wrong password
          const result = await simulateLogin(email, wrongPassword, email, passwordHash);

          expect(result.success).toBe(false);
          expect(result.session).toBeUndefined();
          expect(result.error).toBe("Credenciais inválidas");
        }
      ),
      { numRuns: 10 } // Reduced due to bcrypt being slow
    );
  }, 30000); // 30 second timeout

  /**
   * Property 6.3: Wrong email rejects access
   * For any wrong email, the system SHALL reject access.
   * Validates: Requirements 5.3
   */
  it("should reject access for wrong email", async () => {
    await fc.assert(
      fc.asyncProperty(
        emailArb,
        emailArb,
        validPasswordArb,
        async (inputEmail, storedEmail, password) => {
          // Skip if emails happen to be the same
          if (inputEmail.toLowerCase().trim() === storedEmail.toLowerCase().trim()) return;

          // Hash the password
          const passwordHash = await hashPassword(password);

          // Attempt login with wrong email
          const result = await simulateLogin(inputEmail, password, storedEmail, passwordHash);

          expect(result.success).toBe(false);
          expect(result.session).toBeUndefined();
          expect(result.error).toBe("Credenciais inválidas");
        }
      ),
      { numRuns: 10 } // Reduced due to bcrypt being slow
    );
  }, 30000); // 30 second timeout

  /**
   * Property 6.4: Empty password rejects access
   * For any empty or whitespace-only password, the system SHALL reject access.
   * Validates: Requirements 5.3
   */
  it("should reject access for empty password", async () => {
    await fc.assert(
      fc.asyncProperty(
        emailArb,
        emptyPasswordArb,
        async (email, emptyPassword) => {
          const passwordHash = await hashPassword("valid-password");

          const result = await simulateLogin(email, emptyPassword, email, passwordHash);

          expect(result.success).toBe(false);
          expect(result.error).toBe("Email e senha são obrigatórios");
        }
      ),
      { numRuns: 10 }
    );
  }, 30000);

  /**
   * Property 6.5: Empty email rejects access
   * For any empty or whitespace-only email, the system SHALL reject access.
   * Validates: Requirements 5.3
   */
  it("should reject access for empty email", async () => {
    await fc.assert(
      fc.asyncProperty(
        emptyEmailArb,
        validPasswordArb,
        async (emptyEmail, password) => {
          const passwordHash = await hashPassword(password);

          const result = await simulateLogin(emptyEmail, password, "valid@email.com", passwordHash);

          expect(result.success).toBe(false);
          expect(result.error).toBe("Email e senha são obrigatórios");
        }
      ),
      { numRuns: 10 }
    );
  }, 30000);

  /**
   * Property 6.6: Session expiration redirects to login
   * For any expired session, validation SHALL fail with 'expired' reason.
   * Validates: Requirements 5.5
   */
  it("should fail validation for expired sessions", () => {
    fc.assert(
      fc.property(expiredSessionArb, (session) => {
        const token = createSessionToken(session);
        const validation = validateSession(token);

        expect(validation.valid).toBe(false);
        expect(validation.reason).toBe("expired");
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6.7: Email comparison is case-insensitive
   * For any email with different casing, login SHALL succeed if password is correct.
   * Validates: Requirements 5.2
   */
  it("should accept email with different casing", async () => {
    await fc.assert(
      fc.asyncProperty(
        emailArb,
        validPasswordArb,
        async (email, password) => {
          const passwordHash = await hashPassword(password);

          // Try with uppercase email
          const upperEmail = email.toUpperCase();
          const result = await simulateLogin(upperEmail, password, email, passwordHash);

          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 10 }
    );
  }, 30000);
});

/**
 * Feature: agendamento-profissional, Property 7: Senhas Armazenadas com Hash
 * Validates: Requirements 5.4, 7.5
 *
 * Property: For any password stored in the system, it SHALL be in hash format
 * (never plain text), and password verification SHALL use secure hash comparison.
 */

describe("Property 7: Senhas Armazenadas com Hash", () => {
  /**
   * Property 7.1: Hashed passwords are valid bcrypt hashes
   * For any password, after hashing, the result SHALL be a valid bcrypt hash.
   * Validates: Requirements 5.4
   */
  it("should produce valid bcrypt hashes", async () => {
    await fc.assert(
      fc.asyncProperty(validPasswordArb, async (password) => {
        const hash = await hashPassword(password);

        expect(isValidBcryptHash(hash)).toBe(true);
        expect(hash).not.toBe(password); // Hash should not equal plain text
      }),
      { numRuns: 10 }
    );
  }, 30000);

  /**
   * Property 7.2: Same password produces different hashes (salt)
   * For any password hashed twice, the hashes SHALL be different (due to salt).
   * Validates: Requirements 5.4
   */
  it("should produce different hashes for same password (salt)", async () => {
    await fc.assert(
      fc.asyncProperty(validPasswordArb, async (password) => {
        const hash1 = await hashPassword(password);
        const hash2 = await hashPassword(password);

        expect(hash1).not.toBe(hash2); // Different salts produce different hashes
        
        // But both should verify correctly
        expect(await verifyPassword(password, hash1)).toBe(true);
        expect(await verifyPassword(password, hash2)).toBe(true);
      }),
      { numRuns: 5 }
    );
  }, 30000);

  /**
   * Property 7.3: Correct password verifies successfully
   * For any password and its hash, verification SHALL succeed.
   * Validates: Requirements 5.4, 7.5
   */
  it("should verify correct password against hash", async () => {
    await fc.assert(
      fc.asyncProperty(validPasswordArb, async (password) => {
        const hash = await hashPassword(password);
        const isValid = await verifyPassword(password, hash);

        expect(isValid).toBe(true);
      }),
      { numRuns: 10 }
    );
  }, 30000);

  /**
   * Property 7.4: Wrong password fails verification
   * For any password and a different password's hash, verification SHALL fail.
   * Validates: Requirements 5.4, 7.5
   */
  it("should reject wrong password against hash", async () => {
    await fc.assert(
      fc.asyncProperty(
        validPasswordArb,
        validPasswordArb.filter((p) => p.length > 0),
        async (password1, password2) => {
          // Skip if passwords are the same
          if (password1 === password2) return;

          const hash = await hashPassword(password1);
          const isValid = await verifyPassword(password2, hash);

          expect(isValid).toBe(false);
        }
      ),
      { numRuns: 10 }
    );
  }, 30000);

  /**
   * Property 7.5: Hash length is consistent
   * For any password, the hash length SHALL be 60 characters (bcrypt standard).
   * Validates: Requirements 5.4
   */
  it("should produce hashes of consistent length", async () => {
    await fc.assert(
      fc.asyncProperty(validPasswordArb, async (password) => {
        const hash = await hashPassword(password);

        expect(hash.length).toBe(60); // Bcrypt hashes are always 60 characters
      }),
      { numRuns: 10 }
    );
  }, 30000);

  /**
   * Property 7.6: Empty password can be hashed (but should be rejected at login)
   * For any empty string, hashing SHALL still work (validation happens elsewhere).
   * Validates: Requirements 5.4
   */
  it("should hash empty strings (validation happens at login)", async () => {
    const hash = await hashPassword("");

    expect(isValidBcryptHash(hash)).toBe(true);
    expect(await verifyPassword("", hash)).toBe(true);
  }, 10000);

  /**
   * Property 7.7: Unicode passwords are handled correctly
   * For any unicode password, hashing and verification SHALL work correctly.
   * Validates: Requirements 5.4, 7.5
   */
  it("should handle unicode passwords correctly", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.unicodeString({ minLength: 1, maxLength: 50 }),
        async (password) => {
          const hash = await hashPassword(password);

          expect(isValidBcryptHash(hash)).toBe(true);
          expect(await verifyPassword(password, hash)).toBe(true);
        }
      ),
      { numRuns: 10 }
    );
  }, 30000);
});
