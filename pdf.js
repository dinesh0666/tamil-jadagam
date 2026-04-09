/**
 * pdf.js — Client-side PDF generation using html2pdf.js (CDN).
 * html2pdf.js is loaded from CDN in chart.html.
 */
'use strict';

function generate() {
  if (!window.Payment?.isUnlocked()) {
    window.Payment?.initPayment();
    return;
  }

  const element = document.getElementById('chart-area') || document.body;
  const name    = document.querySelector('.banner-name')?.textContent || 'Jathagam';

  // Temporarily make overflow visible so html2pdf captures full content
  const oldOverflow = element.style.overflow;
  element.style.overflow = 'visible';

  const opt = {
    margin:       [8, 8, 8, 8],
    filename:     `${name.replace(/\s+/g, '_')}_Jathagam.pdf`,
    image:        { type: 'jpeg', quality: 0.95 },
    html2canvas:  { scale: 2, useCORS: true, logging: false },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] },
  };

  if (window.html2pdf) {
    window.html2pdf().set(opt).from(element).save().then(() => {
      element.style.overflow = oldOverflow;
      window.showToast && window.showToast('PDF downloaded!', 'success');
    }).catch(() => {
      element.style.overflow = oldOverflow;
      window.showToast && window.showToast('PDF generation failed.', '');
    });
  } else {
    element.style.overflow = oldOverflow;
    window.showToast && window.showToast('PDF library not loaded.', '');
  }
}

window.PDF = { generate };
