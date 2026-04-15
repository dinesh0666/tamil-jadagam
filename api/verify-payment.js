/**
 * api/verify-payment.js — Vercel serverless function
 * Verifies Razorpay payment signature using HMAC-SHA256.
 * Key Secret never touches the browser.
 *
 * Environment variables (set in Vercel dashboard):
 *   RAZORPAY_KEY_SECRET — your Razorpay secret key
 *   ALLOWED_ORIGIN      — https://jathagam.app
 */
'use strict';

const crypto = require('crypto');

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://jathagam.app';

function setCORS(req, res) {
  const origin = req.headers.origin || '';
  const isAllowed = origin === ALLOWED_ORIGIN || /^http:\/\/localhost(:\d+)?$/.test(origin);
  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
}

module.exports = (req, res) => {
  setCORS(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body || {};

  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    return res.status(400).json({ verified: false, error: 'Missing required fields' });
  }

  // Basic format validation — all three must be non-empty strings up to 100 chars
  const valid = [razorpay_payment_id, razorpay_order_id, razorpay_signature]
    .every(v => typeof v === 'string' && v.length > 0 && v.length <= 200);
  if (!valid) {
    return res.status(400).json({ verified: false, error: 'Invalid field format' });
  }

  if (!process.env.RAZORPAY_KEY_SECRET) {
    console.error('RAZORPAY_KEY_SECRET env var missing');
    return res.status(500).json({ error: 'Payment service not configured' });
  }

  // Razorpay signature = HMAC-SHA256(order_id|payment_id, key_secret)
  const payload  = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(payload)
    .digest('hex');

  let isValid = false;
  try {
    const expectedBuf = Buffer.from(expected,               'hex');
    const receivedBuf = Buffer.from(razorpay_signature,     'hex');
    if (expectedBuf.length === receivedBuf.length) {
      isValid = crypto.timingSafeEqual(expectedBuf, receivedBuf);
    }
  } catch (_) {
    isValid = false;
  }

  if (isValid) {
    return res.status(200).json({ verified: true, payment_id: razorpay_payment_id });
  } else {
    return res.status(400).json({ verified: false });
  }
};
