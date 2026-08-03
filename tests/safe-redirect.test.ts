import assert from 'node:assert/strict';
import test from 'node:test';
import { getSafeRedirectPath } from '../lib/safe-redirect';

test('keeps valid same-origin paths', () => {
  assert.equal(getSafeRedirectPath('/upload?draft=1'), '/upload?draft=1');
});

test('rejects absolute and protocol-relative redirects', () => {
  assert.equal(getSafeRedirectPath('https://evil.example'), '/dashboard');
  assert.equal(getSafeRedirectPath('//evil.example/path'), '/dashboard');
});

test('rejects backslash redirect tricks and empty values', () => {
  assert.equal(getSafeRedirectPath('/\\evil.example'), '/dashboard');
  assert.equal(getSafeRedirectPath(null), '/dashboard');
});
