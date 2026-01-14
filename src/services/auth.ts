/**
 * Authentication Service
 * 
 * Requirements:
 * - 5.4: Armazenar senhas de forma segura usando hash
 * - 7.5: Armazenar credenciais da Keyla de forma segura
 * - 5.2: Criar sessão autenticada com credenciais válidas
 * - 5.3: Exibir mensagem de erro com credenciais inválidas
 * - 5.5: Redirecionar para login quando sessão expira
 */

import bcrypt from "bcryptjs";
import { createServerClient } from "@/lib/supabase";
import type { AdminUser, InsertAdminUser } from "@/types/database";

// ============================================================================
// Types
// ============================================================================

export interface Session {
  userId: string;
  email: string;
  expiresAt: number; // Unix timestamp
}

export interface AuthResult {
  success: boolean;
  session?: Session;
  error?: string;
}

export interface SessionValidation {
  valid: boolean;
  session?: Session;
  reason?: "valid" | "expired" | "invalid" | "missing";
}

// ============================================================================
// Constants
// ============================================================================

// Session duration: 24 hours
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

// Bcrypt salt rounds (10 is a good balance between security and performance)
const BCRYPT_SALT_ROUNDS = 10;

// Cookie name for session
export const SESSION_COOKIE_NAME = "admin_session";

// ============================================================================
// Password Hashing
// ============================================================================

/**
 * Hash a password using bcrypt
 * Requirement 5.4: Armazenar senhas de forma segura usando hash
 * 
 * @param password - Plain text password to hash
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 * Requirement 5.4: Verificação de senha usando comparação segura de hash
 * 
 * @param password - Plain text password to verify
 * @param hash - Stored password hash
 * @returns True if password matches, false otherwise
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Check if a string is a valid bcrypt hash
 * Used to verify that passwords are stored as hashes, not plain text
 * 
 * @param str - String to check
 * @returns True if string is a valid bcrypt hash
 */
export function isValidBcryptHash(str: string): boolean {
  // Bcrypt hashes start with $2a$, $2b$, or $2y$ and are 60 characters long
  const bcryptRegex = /^\$2[aby]\$\d{2}\$.{53}$/;
  return bcryptRegex.test(str);
}

// ============================================================================
// Session Management
// ============================================================================

/**
 * Create a session token (simple base64 encoded JSON)
 * In production, consider using JWT with proper signing
 * 
 * @param session - Session data to encode
 * @returns Base64 encoded session token
 */
export function createSessionToken(session: Session): string {
  const json = JSON.stringify(session);
  return Buffer.from(json).toString("base64");
}

/**
 * Parse a session token
 * 
 * @param token - Base64 encoded session token
 * @returns Parsed session or null if invalid
 */
export function parseSessionToken(token: string): Session | null {
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
 * Create a new session for a user
 * 
 * @param user - Admin user to create session for
 * @returns Session object
 */
export function createSession(user: AdminUser): Session {
  return {
    userId: user.id,
    email: user.email,
    expiresAt: Date.now() + SESSION_DURATION_MS,
  };
}

/**
 * Validate a session token
 * Requirement 5.5: Redirecionar para login quando sessão expira
 * 
 * @param token - Session token to validate
 * @returns Validation result with session if valid
 */
export function validateSession(token: string | undefined | null): SessionValidation {
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

// ============================================================================
// Authentication
// ============================================================================

/**
 * Authenticate a user with email and password
 * Requirements:
 * - 5.2: Criar sessão autenticada com credenciais válidas
 * - 5.3: Exibir mensagem de erro com credenciais inválidas
 * 
 * @param email - User email
 * @param password - User password
 * @returns Authentication result with session if successful
 */
export async function login(email: string, password: string): Promise<AuthResult> {
  // Validate input
  if (!email || !password) {
    return {
      success: false,
      error: "Email e senha são obrigatórios",
    };
  }

  const client = createServerClient();

  // Find user by email
  const { data: user, error } = await client
    .from("admin_user")
    .select("*")
    .eq("email", email.toLowerCase().trim())
    .single() as { data: AdminUser | null; error: unknown };

  if (error || !user) {
    // Use generic error message to prevent email enumeration
    return {
      success: false,
      error: "Credenciais inválidas",
    };
  }

  // Verify password
  const passwordValid = await verifyPassword(password, user.password_hash);

  if (!passwordValid) {
    return {
      success: false,
      error: "Credenciais inválidas",
    };
  }

  // Create session
  const session = createSession(user);

  return {
    success: true,
    session,
  };
}

/**
 * Get admin user by ID
 * 
 * @param userId - User ID
 * @returns Admin user or null if not found
 */
export async function getAdminUser(userId: string): Promise<AdminUser | null> {
  const client = createServerClient();

  const { data: user, error } = await client
    .from("admin_user")
    .select("*")
    .eq("id", userId)
    .single() as { data: AdminUser | null; error: unknown };

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Create a new admin user (for initial setup)
 * 
 * @param email - User email
 * @param password - User password (will be hashed)
 * @returns Created user or null if failed
 */
export async function createAdminUser(
  email: string,
  password: string
): Promise<AdminUser | null> {
  const client = createServerClient();

  // Hash password before storing
  const passwordHash = await hashPassword(password);

  const insertData: InsertAdminUser = {
    email: email.toLowerCase().trim(),
    password_hash: passwordHash,
  };

  const result = await client
    .from("admin_user")
    // @ts-expect-error - Supabase types mismatch
    .insert(insertData)
    .select()
    .single();

  const { data: user, error } = result as unknown as { data: AdminUser | null; error: unknown };

  if (error || !user) {
    console.error("Error creating admin user:", error);
    return null;
  }

  return user;
}
