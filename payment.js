/**
 * payment.js — Razorpay integration for one-time ₹99 premium unlock.
 * Secure flow:
 *   1. POST /api/create-order  → server creates order with fixed amount, returns order_id + key_id
 *   2. Razorpay modal opens with order_id (amount cannot be tampered client-side)
 *   3. On success → POST /api/verify-payment with HMAC signature
 *   4. Only if server confirms verified → activatePremium()
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

/** Activate premium — only called after server-side signature verification */
function activatePremium(paymentId) {
  const expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  localStorage.setItem(PREMIUM_KEY, JSON.stringify({
    unlocked:  true,
    paymentId: paymentId,
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

/** Step 3: Verify payment on server before granting access */
async function verifyPayment(orderId, paymentId, signature) {
  const res = await fetch('/api/verify-payment', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      razorpay_order_id:   orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature:  signature,
    }),
  });
  const data = await res.json();
  return data.verified === true;
}

/** Load Razorpay script and open payment modal */
function initPayment() {
  if (isUnlocked()) {
    window.showToast && window.showToast('Premium is already active!', 'success');
    return;
  }

  // Step 1: Create order on server (amount fixed server-side)
  async function createOrderAndOpen() {
    let orderData;
    try {
      const res = await fetch('/api/create-order', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Order creation failed');
      orderData = await res.json();
    } catch (err) {
      console.error('Create order error:', err);
      window.showToast && window.showToast('Payment service unavailable. Please try again later.', '');
      return;
    }

    const urlData = window.Share?.getBirthDataFromURL?.() || {};
    const name    = urlData.n || '';

    // Step 2: Open Razorpay with server-issued order_id
    const options = {
      key:         orderData.key_id,
      amount:      orderData.amount,
      currency:    orderData.currency,
      order_id:    orderData.order_id,
      name:        'Jathagam.app',
      description: 'Premium Unlock — Full Birth Chart',
      image:       '/assets/logo.svg',
      handler: async function(response) {
        // Step 3: Verify signature server-side before unlocking
        try {
          const verified = await verifyPayment(
            response.razorpay_order_id,
            response.razorpay_payment_id,
            response.razorpay_signature,
          );
          if (verified) {
            activatePremium(response.razorpay_payment_id);
          } else {
            window.showToast && window.showToast('Payment verification failed. Contact support.', '');
          }
        } catch (err) {
          console.error('Verify payment error:', err);
          window.showToast && window.showToast('Verification error. Contact support with payment ID: ' + response.razorpay_payment_id, '');
        }
      },
      prefill: { name, email: '', contact: '' },
      notes:   { source: 'jathagam.app' },
      theme:   { color: '#B8471B' },
      modal:   {
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

  // Lazy-load Razorpay script, then start flow
  if (window.Razorpay) {
    createOrderAndOpen();
  } else {
    const script    = document.createElement('script');
    script.src      = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload   = createOrderAndOpen;
    script.onerror  = function() {
      window.showToast && window.showToast('Failed to load payment gateway. Check your connection.', '');
    };
    document.head.appendChild(script);
  }
}

/**
 * Show premium lock overlay on a container.
 */
function showPremiumLock(containerId, featureName) {
  const el = document.getElementById(containerId);
  if (!el || isUnlocked()) return;

  const wrap = document.createElement('div');
  wrap.className = 'premium-blur-wrap';

  // Blur the existing content
  const inner = document.createElement('div');
  inner.style.filter = 'blur(5px)';
  inner.style.pointerEvents = 'none';
  inner.style.userSelect = 'none';
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
