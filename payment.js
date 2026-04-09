/**
 * payment.js — Razorpay integration for one-time ₹99 premium unlock.
 * Loads Razorpay script lazily (only on user click).
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

/** Activate premium (call after successful payment) */
function activatePremium(paymentId) {
  const expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  localStorage.setItem(PREMIUM_KEY, JSON.stringify({
    unlocked:  true,
    paymentId: paymentId || 'manual',
    expiry:    expiryDate.toISOString(),
  }));
  // Re-render all premium-locked sections
  if (window.renderChartPage) window.renderChartPage();
  window.showToast && window.showToast('✓ Premium unlocked! All features now available.', 'premium');
  // Update UI
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

/** Load Razorpay script and open payment modal */
function initPayment() {
  if (isUnlocked()) {
    window.showToast && window.showToast('Premium is already active!', 'success');
    return;
  }

  function openRazorpay() {
    // Gather prefill info
    const urlData = window.Share?.getBirthDataFromURL?.() || {};
    const name    = urlData.n || '';

    const options = {
      key:      'rzp_test_SbMWU8mJpZgrE1',  // TODO: replace with rzp_live_... key before going to production
      amount:   9900,                       // ₹99 in paise
      currency: 'INR',
      name:     'Jathagam.app',
      description: 'Premium Unlock — Full Birth Chart',
      image:    '/assets/logo.svg',
      handler: function(response) {
        activatePremium(response.razorpay_payment_id);
      },
      prefill: {
        name:  name,
        email: '',
        contact: '',
      },
      notes: { source: 'jathagam.app' },
      theme: { color: '#B8471B' },
      modal: {
        ondismiss: function() {
          window.showToast && window.showToast('Payment cancelled.', '');
        }
      }
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

  // Lazy-load Razorpay script
  if (window.Razorpay) {
    openRazorpay();
  } else {
    const script = document.createElement('script');
    script.src   = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload  = openRazorpay;
    script.onerror = function() {
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
