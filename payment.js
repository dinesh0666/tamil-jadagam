/**
 * payment.js — Razorpay integration (server-secured architecture)
 *
 * Flow:
 *  1. User clicks ₹99 → initPayment()
 *  2. POST /api/create-order  → server creates Razorpay order, returns order_id + key_id
 *  3. Browser opens Razorpay checkout with order_id
 *  4. After payment: POST /api/verify-payment → server verifies HMAC signature
 *  5. If verified: activatePremium()
 *
 * The Key Secret never touches the browser.
 */
'use strict';

const PREMIUM_KEY = 'jathagamPremium';

/** Check premium status */
function isUnlocked() {
  try {
    const data = JSON.parse(localStorage.getItem(PREMIUM_KEY) || '{}');
    return !!(data.unlocked && new Date(data.expiry) > new Date());
  } catch (_) {
    return false;
  }
}

/** Activate premium (call only after server-verified payment) */
function activatePremium(paymentId) {
  const expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  localStorage.setItem(PREMIUM_KEY, JSON.stringify({
    unlocked:  true,
    paymentId: paymentId || 'manual',
    expiry:    expiryDate.toISOString(),
  }));
  if (window.renderChartPage) window.renderChartPage();
  window.showToast && window.showToast('✓ Premium unlocked! All features now available.', 'premium');
  document.querySelectorAll('.unlock-btn').forEach(btn => {
    btn.textContent = '✓ Premium Active';
    btn.disabled = true;
  });
  document.querySelectorAll('.blur-overlay').forEach(el => el.remove());
  document.querySelectorAll('.premium-blur-wrap').forEach(el => {
    el.style.filter = '';
    const child = el.firstElementChild;
    if (child) child.style.filter = '';
  });
}

/** Main payment entry point */
async function initPayment() {
  if (isUnlocked()) {
    window.showToast && window.showToast('Premium is already active!', 'success');
    return;
  }

  // Step 1: Create order server-side (amount is fixed there — cannot be tampered)
  let orderData;
  try {
    const res = await fetch('/api/create-order', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    orderData = await res.json();
  } catch (err) {
    console.error('Order creation failed:', err);
    window.showToast && window.showToast('Payment service unavailable. Please try again.', '');
    return;
  }

  // Step 2: Open Razorpay checkout
  function openCheckout() {
    const urlData = window.Share?.getBirthDataFromURL?.() || {};

    const options = {
      key:      orderData.key_id,       // Returned from server — no key in this file
      amount:   orderData.amount,       // ₹99 in paise, set server-side
      currency: orderData.currency,
      order_id: orderData.order_id,     // Required for signature verification
      name:        'Jathagam.app',
      description: 'Premium Unlock — Full Birth Chart',
      image:       '/assets/logo.svg',

      handler: async function(response) {
        // Step 3: Verify payment signature on the server
        try {
          const vRes = await fetch('/api/verify-payment', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_signature:  response.razorpay_signature,
            }),
          });
          const vData = await vRes.json();

          if (vData.verified) {
            activatePremium(response.razorpay_payment_id);
          } else {
            window.showToast && window.showToast('Payment verification failed. Contact support.', '');
          }
        } catch (err) {
          console.error('Verification error:', err);
          window.showToast && window.showToast('Could not verify payment. Contact support.', '');
        }
      },

      prefill: {
        name:    urlData.n || '',
        email:   '',
        contact: '',
      },
      notes:  { source: 'jathagam.app' },
      theme:  { color: '#B8471B' },
      modal: {
        ondismiss: function() {
          window.showToast && window.showToast('Payment cancelled.', '');
        },
      },
    };

    try {
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function(response) {
        window.showToast && window.showToast('Payment failed. Please try again.', '');
        console.error('Razorpay payment failed:', response.error);
      });
      rzp.open();
    } catch (e) {
      console.error('Razorpay init error:', e);
      window.showToast && window.showToast('Payment service unavailable. Please try again later.', '');
    }
  }

  // Lazy-load Razorpay SDK
  if (window.Razorpay) {
    openCheckout();
  } else {
    const script   = document.createElement('script');
    script.src     = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload  = openCheckout;
    script.onerror = function() {
      window.showToast && window.showToast('Failed to load payment gateway. Check your connection.', '');
    };
    document.head.appendChild(script);
  }
}

/** Show premium lock overlay on a container */
function showPremiumLock(containerId, featureName) {
  const el = document.getElementById(containerId);
  if (!el || isUnlocked()) return;

  const wrap  = document.createElement('div');
  wrap.className = 'premium-blur-wrap';

  const inner = document.createElement('div');
  inner.style.filter       = 'blur(5px)';
  inner.style.pointerEvents = 'none';
  inner.style.userSelect    = 'none';
  while (el.firstChild) inner.appendChild(el.firstChild);
  wrap.appendChild(inner);

  const overlay = document.createElement('div');
  overlay.className = 'blur-overlay';
  overlay.innerHTML = `
    <div class="lock-icon">🔒</div>
    <div style="font-weight:700;font-size:1rem;color:var(--primary-d)">${featureName || t('premium.locked')}</div>
    <div style="font-size:.85rem;color:var(--mid);text-align:center;max-width:200px">${t('premium.unlockMsg')}</div>
    <button class="unlock-btn" onclick="window.Payment.initPayment()">${t('premiumBtn')}</button>
  `;
  wrap.appendChild(overlay);

  el.innerHTML = '';
  el.appendChild(wrap);
}

// Expose
window.Payment = { initPayment, isUnlocked, activatePremium, showPremiumLock };

// Initialize premium UI on load
document.addEventListener('DOMContentLoaded', function() {
  if (isUnlocked()) {
    document.querySelectorAll('[data-premium-btn]').forEach(btn => {
      btn.textContent = '✓ ' + t('premium.unlocked');
      btn.disabled = true;
    });
  }
});
