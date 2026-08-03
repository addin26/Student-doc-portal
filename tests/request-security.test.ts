import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { getRateLimitIpHash, hasVerifiedEmail, isTrustedMutationOrigin } from '../lib/request-security';

test('browser mutations require a matching origin', () => {
  const trusted = new NextRequest('https://portal.example/api/upload/finalize', {
    method: 'POST',
    headers: { origin: 'https://portal.example', host: 'portal.example' },
  });
  const crossSite = new NextRequest('https://portal.example/api/upload/finalize', {
    method: 'POST',
    headers: { origin: 'https://attacker.example', host: 'portal.example' },
  });
  assert.equal(isTrustedMutationOrigin(trusted), true);
  assert.equal(isTrustedMutationOrigin(crossSite), false);
});

test('non-browser bearer clients may omit Origin but cookie clients may not', () => {
  const bearer = new NextRequest('https://portal.example/api/ai/summarize', {
    method: 'POST', headers: { authorization: 'Bearer diagnostic' },
  });
  const cookie = new NextRequest('https://portal.example/api/ai/summarize', {
    method: 'POST', headers: { cookie: 'session=diagnostic' },
  });
  assert.equal(isTrustedMutationOrigin(bearer), true);
  assert.equal(isTrustedMutationOrigin(cookie), false);
});

test('rate-limit identifiers are stable HMACs and verification is server-derived', () => {
  const previous = process.env.RATE_LIMIT_HASH_SECRET;
  process.env.RATE_LIMIT_HASH_SECRET = 'test-only-rate-limit-secret-at-least-32-characters';
  try {
    const request = new NextRequest('https://portal.example/api/download/id', {
      headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' },
    });
    const hash = getRateLimitIpHash(request);
    assert.match(hash, /^[a-f0-9]{64}$/);
    assert.equal(hash.includes('203.0.113.7'), false);
    assert.equal(hasVerifiedEmail({ email_confirmed_at: '2026-08-03T00:00:00Z' } as User), true);
    assert.equal(hasVerifiedEmail({} as User), false);
  } finally {
    if (previous === undefined) delete process.env.RATE_LIMIT_HASH_SECRET;
    else process.env.RATE_LIMIT_HASH_SECRET = previous;
  }
});
