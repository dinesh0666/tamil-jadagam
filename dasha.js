/**
 * dasha.js — Vimshottari Dasha calculation and rendering.
 * Calculates Mahadasha, Antardasha, Pratyantar dasha from Moon's nakshatra at birth.
 */
'use strict';

/* ── Dasha data ───────────────────────────────────────────────────────── */
const DASHA_YEARS = {
  Ketu:7, Venus:20, Sun:6, Moon:10, Mars:7,
  Rahu:18, Jupiter:16, Saturn:19, Mercury:17
};

// Dasha sequence — starts from Ketu, cycles every 9
const DASHA_SEQUENCE = ['Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury'];

// Nakshatra lords (index 0-26, repeating the 9-lord cycle)
const NAK_DASHA_LORD = [
  'Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury',  // 1-9
  'Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury',  // 10-18
  'Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury'   // 19-27
];

const TOTAL_DASHA_YEARS = 120;

/* ── Date helpers ─────────────────────────────────────────────────────── */
function addYears(date, years) {
  const d = new Date(date.getTime());
  const wholeYears = Math.floor(years);
  const fracDays   = (years - wholeYears) * 365.25;
  d.setFullYear(d.getFullYear() + wholeYears);
  d.setDate(d.getDate() + Math.round(fracDays));
  return d;
}

function formatDate(date) {
  return date.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
}

/* ── Mahadasha calculation ────────────────────────────────────────────── */
/**
 * Calculate all Mahadashas from birth date.
 * @param {number} moonNakIdx      0-26  (birth nakshatra index)
 * @param {number} moonNakFraction 0-1   (how far Moon is through its nakshatra)
 * @param {Date}   birthDate
 * @returns Array of { lord, startDate, endDate, durationYears }
 */
function calculateMahadashas(moonNakIdx, moonNakFraction, birthDate) {
  const nakLord  = NAK_DASHA_LORD[moonNakIdx];
  const seqIdx   = DASHA_SEQUENCE.indexOf(nakLord);
  const totalYrs = DASHA_YEARS[nakLord];

  // How much of the current dasha was elapsed at birth
  const elapsed    = totalYrs * moonNakFraction;
  const remaining  = totalYrs - elapsed;

  const dashas = [];
  let cursor = new Date(birthDate.getTime());

  // Current (partial) dasha
  const firstEnd = addYears(cursor, remaining);
  dashas.push({
    lord:          nakLord,
    startDate:     addYears(cursor, -elapsed),  // actual start (before birth)
    endDate:       firstEnd,
    durationYears: totalYrs,
    remainingAtBirth: remaining,
  });
  cursor = firstEnd;

  // Subsequent complete dashas
  let nextSeqIdx = (seqIdx + 1) % 9;
  while (dashas.length < 9) {
    const lord = DASHA_SEQUENCE[nextSeqIdx];
    const yrs  = DASHA_YEARS[lord];
    const end  = addYears(cursor, yrs);
    dashas.push({ lord, startDate: cursor, endDate: end, durationYears: yrs });
    cursor = end;
    nextSeqIdx = (nextSeqIdx + 1) % 9;
  }

  return dashas;
}

/* ── Antardasha calculation ───────────────────────────────────────────── */
/**
 * For a given Mahadasha, calculate all 9 Antardashas.
 * Sequence starts from the Mahadasha lord itself.
 */
function calculateAntardashas(maha) {
  const mahaSeqIdx = DASHA_SEQUENCE.indexOf(maha.lord);
  const antardashas = [];
  let cursor = new Date(maha.startDate.getTime());

  for (let i = 0; i < 9; i++) {
    const antarLord = DASHA_SEQUENCE[(mahaSeqIdx + i) % 9];
    const antarYrs  = (maha.durationYears * DASHA_YEARS[antarLord]) / TOTAL_DASHA_YEARS;
    const end = addYears(cursor, antarYrs);
    antardashas.push({
      lord: antarLord,
      startDate: new Date(cursor),
      endDate: end,
      durationYears: antarYrs,
    });
    cursor = end;
  }

  return antardashas;
}

/* ── Pratyantar dasha ─────────────────────────────────────────────────── */
function calculatePratyantardashas(antar, mahaYears) {
  const antarSeqIdx = DASHA_SEQUENCE.indexOf(antar.lord);
  const pratys = [];
  let cursor = new Date(antar.startDate.getTime());

  for (let i = 0; i < 9; i++) {
    const pratyLord = DASHA_SEQUENCE[(antarSeqIdx + i) % 9];
    const pratyYrs  = (antar.durationYears * DASHA_YEARS[pratyLord]) / TOTAL_DASHA_YEARS;
    const end = addYears(cursor, pratyYrs);
    pratys.push({
      lord: pratyLord,
      startDate: new Date(cursor),
      endDate: end,
      durationYears: pratyYrs,
    });
    cursor = end;
  }

  return pratys;
}

/* ── Find current dasha status ────────────────────────────────────────── */
/**
 * @param {Array}  mahadashas   returned by calculateMahadashas
 * @param {Date}   targetDate   usually today
 * @returns {Object} { mahaLord, mahaStart, mahaEnd, antarLord, antarStart, antarEnd,
 *                     pratyantarLord, pratyantarStart, pratyantarEnd }
 */
function getCurrentDashaStatus(mahadashas, targetDate) {
  // Find active Mahadasha
  let activeMaha = mahadashas[0];
  for (const m of mahadashas) {
    if (targetDate >= m.startDate && targetDate < m.endDate) {
      activeMaha = m; break;
    }
  }

  const antardashas = calculateAntardashas(activeMaha);
  let activeAntar = antardashas[0];
  for (const a of antardashas) {
    if (targetDate >= a.startDate && targetDate < a.endDate) {
      activeAntar = a; break;
    }
  }

  const pratyantars = calculatePratyantardashas(activeAntar, activeMaha.durationYears);
  let activePraty = pratyantars[0];
  for (const p of pratyantars) {
    if (targetDate >= p.startDate && targetDate < p.endDate) {
      activePraty = p; break;
    }
  }

  return {
    mahaLord:         activeMaha.lord,
    mahaStart:        activeMaha.startDate,
    mahaEnd:          activeMaha.endDate,
    antarLord:        activeAntar.lord,
    antarStart:       activeAntar.startDate,
    antarEnd:         activeAntar.endDate,
    pratyantarLord:   activePraty.lord,
    pratyantarStart:  activePraty.startDate,
    pratyantarEnd:    activePraty.endDate,
    // Progress within maha (0-1)
    mahaProgress: (targetDate - activeMaha.startDate) / (activeMaha.endDate - activeMaha.startDate),
  };
}

/* ── Rendering ────────────────────────────────────────────────────────── */
/**
 * Render dasha timeline (Prompt 12).
 */
function renderDashaTimeline(mahadashas, currentStatus, containerId, isPremium) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const PS = window.Charts ? window.Charts.PLANET_SYMBOLS : {};

  // Current period card
  const curCard = document.createElement('div');
  curCard.className = 'dasha-current fade-in';

  const mahaColor = (PS[currentStatus.mahaLord] || {}).color || 'var(--primary)';
  const antarColor= (PS[currentStatus.antarLord] || {}).color || 'var(--mid)';

  curCard.innerHTML = `
    <div class="dasha-current-label" data-i18n="dasha.currentPeriod">${t('dasha.currentPeriod')}</div>
    <div class="dasha-current-lord" style="color:${mahaColor}">
      ${planetName(currentStatus.mahaLord)} ${t('dasha.mahadasha')}
    </div>
    <div class="dasha-antardasha">
      <span data-i18n="dasha.antardasha">${t('dasha.antardasha')}:</span>
      <strong style="color:${antarColor}">${planetName(currentStatus.antarLord)}</strong>
      <span style="font-size:.78rem;color:var(--muted);margin-left:.4rem">${formatDate(currentStatus.antarStart)} → ${formatDate(currentStatus.antarEnd)}</span>
    </div>
    <div class="dasha-antardasha" style="font-size:.82rem;color:var(--muted)">
      <span data-i18n="dasha.pratyantar">${t('dasha.pratyantar')}:</span>
      <strong>${planetName(currentStatus.pratyantarLord)}</strong>
      <span style="font-size:.78rem;margin-left:.25rem">${formatDate(currentStatus.pratyantarStart)} → ${formatDate(currentStatus.pratyantarEnd)}</span>
    </div>
    <div class="dasha-dates">
      ${t('dasha.mahadasha')}: ${formatDate(currentStatus.mahaStart)} → ${formatDate(currentStatus.mahaEnd)}
    </div>
    <!-- Mahadasha progress bar -->
    <div class="dasha-progress-wrap">
      <div class="dasha-progress-label">
        <span>${planetName(currentStatus.mahaLord)} ${t('dasha.mahadasha')}</span>
        <span>${(currentStatus.mahaProgress * 100).toFixed(0)}% ${t('dasha.of') || 'of'} ${DASHA_YEARS[currentStatus.mahaLord]} ${t('dasha.years')}</span>
      </div>
      <div class="dasha-progress-bar">
        <div class="dasha-progress-fill" style="width:${(currentStatus.mahaProgress * 100).toFixed(1)}%"></div>
      </div>
    </div>
  `;
  container.innerHTML = '';
  container.appendChild(curCard);

  // Timeline scroll
  const scrollLabel = document.createElement('h3');
  scrollLabel.style.cssText = 'font-size:.85rem;color:var(--mid);margin:.75rem 0 .5rem;';
  scrollLabel.textContent = 'Mahadasha Timeline';
  container.appendChild(scrollLabel);

  const today = new Date();
  const scrollDiv = document.createElement('div');
  scrollDiv.className = 'dasha-scroll';

  const displayDashas = isPremium ? mahadashas : mahadashas.slice(0, 5);

  displayDashas.forEach(maha => {
    const isCurrent  = today >= maha.startDate && today < maha.endDate;
    const isPast     = maha.endDate < today;
    const ps         = PS[maha.lord] || {};
    const card       = document.createElement('div');
    card.className   = 'dasha-card' + (isCurrent ? ' current' : '') + (isPast ? ' past' : '');
    card.innerHTML   = `
      <div class="dasha-card-lord" style="color:${ps.color || 'var(--dark)'}">${ps.symbol || ''} ${planetName(maha.lord)}</div>
      <div class="dasha-card-years">${maha.durationYears} ${t('dasha.years')}</div>
      <div class="dasha-card-dates">${formatDate(maha.startDate)}</div>
      <div class="dasha-card-dates">→ ${formatDate(maha.endDate)}</div>
    `;
    scrollDiv.appendChild(card);
  });

  container.appendChild(scrollDiv);

  // Premium lock for full timeline
  if (!isPremium) {
    const lockDiv = document.createElement('div');
    lockDiv.className = 'premium-blur-wrap';
    const blurGrid = document.createElement('div');
    blurGrid.className = 'dasha-scroll';
    blurGrid.style.filter = 'blur(4px)';

    // Generate fake remaining cards for blur preview
    ['Saturn','Mercury','Ketu','Venus'].forEach(lord => {
      const ps = PS[lord] || {};
      const fake = document.createElement('div');
      fake.className = 'dasha-card';
      fake.innerHTML = `<div class="dasha-card-lord" style="color:${ps.color||'var(--dark)'}">${ps.symbol||''} ${planetName(lord)}</div><div class="dasha-card-years">— ${t('dasha.years')}</div>`;
      blurGrid.appendChild(fake);
    });
    lockDiv.appendChild(blurGrid);

    const overlay = document.createElement('div');
    overlay.className = 'blur-overlay';
    overlay.innerHTML = `
      <div class="lock-icon">🔒</div>
      <div style="font-weight:600;font-size:.9rem">${t('premium.locked')}</div>
      <button class="unlock-btn" onclick="window.Payment && window.Payment.initPayment()">
        ${t('premiumBtn')}
      </button>
    `;
    lockDiv.appendChild(overlay);
    container.appendChild(lockDiv);
  }

  // Antardasha detail for current maha
  const antardashas = calculateAntardashas(
    mahadashas.find(m => today >= m.startDate && today < m.endDate) || mahadashas[0]
  );
  const antarLabel = document.createElement('h3');
  antarLabel.style.cssText = 'font-size:.85rem;color:var(--mid);margin:.75rem 0 .5rem;';
  antarLabel.textContent = `${planetName(currentStatus.mahaLord)} ${t('dasha.mahadasha')} — ${t('dasha.antardasha')}`;
  container.appendChild(antarLabel);

  const antarScroll = document.createElement('div');
  antarScroll.className = 'dasha-scroll';

  antardashas.forEach(antar => {
    const isCurrentA = today >= antar.startDate && today < antar.endDate;
    const isPastA    = antar.endDate < today;
    const ps         = PS[antar.lord] || {};
    const card2      = document.createElement('div');
    card2.className  = 'dasha-card' + (isCurrentA ? ' current' : '') + (isPastA ? ' past' : '');
    card2.style.minWidth = '120px';
    card2.innerHTML  = `
      <div class="dasha-card-lord" style="font-size:.9rem;color:${ps.color||'var(--dark)'}">${planetName(antar.lord)}</div>
      <div class="dasha-card-years" style="font-size:.7rem">${antar.durationYears.toFixed(2)} ${t('dasha.years')}</div>
      <div class="dasha-card-dates">${formatDate(antar.startDate)}</div>
      <div class="dasha-card-dates">→ ${formatDate(antar.endDate)}</div>
    `;
    antarScroll.appendChild(card2);
  });
  container.appendChild(antarScroll);
}

// Expose
window.Dasha = {
  calculateMahadashas,
  calculateAntardashas,
  calculatePratyantardashas,
  getCurrentDashaStatus,
  renderDashaTimeline,
  NAK_DASHA_LORD,
  DASHA_YEARS,
  DASHA_SEQUENCE,
  formatDate,
};
