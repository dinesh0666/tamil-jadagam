/**
 * api/verify-payment.js — Vercel serverless function
 * Verifies Razorpay payment signature using HMAC-SHA256.
 * The Key Secret never touches the browser — verification happens here.
 *
 * Environment variables required (set in Vercel dashboard):
 *   RAZORPAY_KEY_SECRET — your Razorpay secret key
 */
'use strict';

const crypto = require('crypto');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body || {};

  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    return res.status(400).json({ verified: false, error: 'Missing required fields' });
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

  // Use timingSafeEqual to prevent timing attacks
  const expectedBuf = Buffer.from(expected,             'hex');
  const receivedBuf = Buffer.from(razorpay_signature,   'hex');

  if (expectedBuf.length !== receivedBuf.length) {
    return res.status(400).json({ verified: false });
  }

  const isValid = crypto.timingSafeEqual(expectedBuf, receivedBuf);

  if (isValid) {
    return res.status(200).json({ verified: true, payment_id: razorpay_payment_id });
  } else {
    return res.status(400).json({ verified: false });
  }
};
