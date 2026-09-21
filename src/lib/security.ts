import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getSession } from "./auth";

export type Role = "customer" | "seller" | "admin";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string;
  sellerStatus?: "pending" | "approved" | "suspended";
}

/**
 * Validates whether a given string is a valid MongoDB ObjectId.
 */
export function isValidObjectId(id: unknown): boolean {
  if (typeof id !== "string" || !id) return false;
  return mongoose.Types.ObjectId.isValid(id) && new mongoose.Types.ObjectId(id).toString() === id;
}

/**
 * Sanitizes input strings against HTML/script injection (XSS).
 */
export function sanitizeString(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .trim();
}

/**
 * In-memory sliding rate limiter for sensitive routes (e.g., auth, payment).
 */
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

// Cleanup expired records periodically
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitMap.entries()) {
      if (record.resetAt <= now) {
        rateLimitMap.delete(key);
      }
    }
  }, 60000);
}

export function checkRateLimit(key: string, limit = 10, windowMs = 60000): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || record.resetAt <= now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  record.count += 1;
  return { allowed: true, remaining: limit - record.count };
}

/**
 * Retrieves and validates the current user session.
 */
export async function getAuthUser(): Promise<AuthenticatedUser | null> {
  const session = await getSession();
  if (!session?.user?.id) return null;
  return session.user as AuthenticatedUser;
}

/**
 * RBAC Helper: Checks if the user has one of the required roles.
 */
export function hasRole(user: AuthenticatedUser | null, allowedRoles: Role[]): boolean {
  if (!user) return false;
  return allowedRoles.includes(user.role);
}

/**
 * RBAC Helper: Checks if the user is an approved seller or admin.
 */
export function isApprovedSeller(user: AuthenticatedUser | null): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  return user.role === "seller" && user.sellerStatus === "approved";
}

/**
 * Standard API error responses
 */
export function unauthorizedResponse(error = "Authentication required"): NextResponse {
  return NextResponse.json({ success: false, error }, { status: 401 });
}

export function forbiddenResponse(error = "You do not have permission to perform this action"): NextResponse {
  return NextResponse.json({ success: false, error }, { status: 403 });
}

export function badRequestResponse(error: string): NextResponse {
  return NextResponse.json({ success: false, error }, { status: 400 });
}

export function notFoundResponse(error = "Resource not found"): NextResponse {
  return NextResponse.json({ success: false, error }, { status: 404 });
}

export function tooManyRequestsResponse(error = "Too many requests. Please try again later."): NextResponse {
  return NextResponse.json({ success: false, error }, { status: 429 });
}

export function serverErrorResponse(error = "An unexpected server error occurred"): NextResponse {
  return NextResponse.json({ success: false, error }, { status: 500 });
}
