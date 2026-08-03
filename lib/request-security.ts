import { createHmac } from 'crypto';
import type { NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';

function normalizedOrigin(value: string | undefined | null) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function isTrustedMutationOrigin(request: NextRequest) {
  const origin = normalizedOrigin(request.headers.get('origin'));
  if (!origin) {
    // Non-browser clients may authenticate with a Bearer token and no cookies.
    return Boolean(request.headers.get('authorization') && !request.headers.get('cookie'));
  }

  const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const forwardedProtocol = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '');
  const allowed = new Set([
    normalizedOrigin(process.env.NEXT_PUBLIC_SITE_URL),
    normalizedOrigin(request.nextUrl.origin),
    normalizedOrigin(forwardedHost ? `${forwardedProtocol}://${forwardedHost}` : null),
    normalizedOrigin(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null),
  ].filter((value): value is string => Boolean(value)));
  return allowed.has(origin);
}

export function getRateLimitIpHash(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',', 1)[0]?.trim();
  const ip = forwarded || request.headers.get('x-real-ip') || 'unknown';
  const secret = process.env.RATE_LIMIT_HASH_SECRET;
  if (!secret || secret.length < 32) throw new Error('Rate-limit hashing configuration is incomplete.');
  return createHmac('sha256', secret).update(ip).digest('hex');
}

export function uploadRequiresVerifiedEmail() {
  return process.env.REQUIRE_VERIFIED_EMAIL_FOR_UPLOAD !== 'false';
}

export function hasVerifiedEmail(user: User) {
  return Boolean(user.email_confirmed_at || user.confirmed_at);
}
