'use strict';

const crypto = require('crypto');

function base64urlEncode(input) {
  return Buffer.from(input).toString('base64url');
}

function base64urlDecode(input) {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function getAdminSecret() {
  return String(process.env.ADMIN_SECRET || process.env.WIX_API_KEY || '').trim();
}

function signPayload(payloadText, secret) {
  return crypto.createHmac('sha256', secret).update(payloadText).digest('base64url');
}

function createAdminToken(username) {
  const secret = getAdminSecret();
  if (!secret) return null;
  const payload = JSON.stringify({
    u: username,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });
  const encoded = base64urlEncode(payload);
  const sig = signPayload(encoded, secret);
  return `${encoded}.${sig}`;
}

function verifyAdminToken(token) {
  const secret = getAdminSecret();
  if (!secret || !token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expected = signPayload(encoded, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(base64urlDecode(encoded));
    if (!payload || typeof payload !== 'object') return null;
    if (!payload.u || !payload.exp || Date.now() > Number(payload.exp)) return null;
    return payload;
  } catch {
    return null;
  }
}

module.exports = { createAdminToken, verifyAdminToken };
