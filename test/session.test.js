import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signSession, verifySession } from '../functions/_lib/session.js';

const SECRET = 'test-secret-key';

test('a freshly signed token verifies', async () => {
  const token = await signSession(SECRET, 3600);
  assert.equal(await verifySession(SECRET, token), true);
});

test('a token with the wrong secret fails', async () => {
  const token = await signSession(SECRET, 3600);
  assert.equal(await verifySession('other-secret', token), false);
});

test('an expired token fails', async () => {
  const token = await signSession(SECRET, 1);
  const future = Date.now() + 2000;
  assert.equal(await verifySession(SECRET, token, future), false);
});

test('a tampered token fails', async () => {
  const token = await signSession(SECRET, 3600);
  const tampered = token.replace(/.$/, (c) => (c === 'a' ? 'b' : 'a'));
  assert.equal(await verifySession(SECRET, tampered), false);
});
