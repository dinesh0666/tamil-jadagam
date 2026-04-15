/**
 * api/create-order.js — Vercel serverless function
 * Creates a Razorpay order server-side. Amount fixed here — cannot be tampered via browser.
 *
 * Environment variables (set in Vercel dashboard):
 *   RAZORPAY_KEY_ID     — rzp_live_... (or rzp_test_... for staging)
 *   RAZORPAY_KEY_SECRET — your Razorpay secret key
 *   ALLOWED_ORIGIN      — https://jathagam.app (your production domain)
 */
'use strict';

const Razorpay = require('razorpay');

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://jathagam.app';

function setCORS(req, res) {
  const origin = req.headers.origin || '';
  // Only allow our own domain (or localhost in dev)
  const isAllowed = origin === ALLOWED_ORIGIN || /^http:\/\/localhost(:\d+)?$/.test(origin);
  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
}

module.exports = async (req, res) => {
  setCORS(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.error('Razorpay env vars missing');
    return res.status(500).json({ error: 'Payment service not configured' });
  }

  try {
    const razorpay = new Razorpay({
      key_id:     process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const order = await razorpay.orders.create({
      amount:          9900,          // ₹99 in paise — fixed here, cannot be tampered
      currency:        'INR',
      receipt:         `jathagam_${Date.now()}`,
      payment_capture: 1,
    });

    // Return only what the frontend needs. Secret never leaves this function.
    return res.status(200).json({
      order_id: order.id,
      amount:   order.amount,
      currency: order.currency,
      key_id:   process.env.RAZORPAY_KEY_ID,  // Public key — safe to expose
    });

  } catch (err) {
    console.error('Razorpay order creation error:', err.message);
    return res.status(500).json({ error: 'Order creation failed' });
  }
};
