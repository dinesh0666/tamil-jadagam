/**
 * api/create-order.js — Vercel serverless function
 * Creates a Razorpay order server-side. Amount is fixed here so it
 * cannot be tampered with from the browser.
 *
 * Environment variables required (set in Vercel dashboard):
 *   RAZORPAY_KEY_ID     — rzp_test_... or rzp_live_...
 *   RAZORPAY_KEY_SECRET — your Razorpay secret key
 */
'use strict';

const Razorpay = require('razorpay');

module.exports = async (req, res) => {
  // CORS — only needed if you ever call from a different origin
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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
      amount:          9900,          // ₹99 in paise — fixed server-side, cannot be tampered
      currency:        'INR',
      receipt:         `jathagam_${Date.now()}`,
      payment_capture: 1,
    });

    // Return only what the frontend needs. Key Secret never leaves this function.
    return res.status(200).json({
      order_id: order.id,
      amount:   order.amount,
      currency: order.currency,
      key_id:   process.env.RAZORPAY_KEY_ID,  // Public identifier — safe to expose
    });

  } catch (err) {
    console.error('Razorpay order creation error:', err.message);
    return res.status(500).json({ error: 'Order creation failed' });
  }
};
