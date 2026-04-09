/**
 * dosha.js — Mangal Dosha, Kala Sarpa, Sade Sati, Pitra, Guru Chandala, Grahan Yoga.
 * All checks use planets from astro.js and Whole Sign house system.
 */
'use strict';

/* ── Mangal Dosha (Prompt 13) ─────────────────────────────────────────── */
/**
 * @param {Array}  planets    array of planet objects
 * @param {number} lagnaRasi  0-11
 * @returns {Object}
 */
function checkMangalDosha(planets, lagnaRasi) {
  const getHouseNum = window.Astro.getHouseNum;
  const mars = planets.find(p => p.name === 'Mars');
  if (!mars) return { hasDosha: false, fromLagna: false, fromMoon: false, fromVenus: false, isCancelled: false };

  const moon  = planets.find(p => p.name === 'Moon');
  const venus = planets.find(p => p.name === 'Venus');
  const jup   = planets.find(p => p.name === 'Jupiter');

  // Malefic houses for Mars
  const DOSHA_HOUSES = new Set([1, 2, 4, 7, 8, 12]);

  const marsHouseFromLagna = getHouseNum(mars.rasiNum, lagnaRasi);
  const fromLagna = DOSHA_HOUSES.has(marsHouseFromLagna);
  const fromMoon  = moon  ? DOSHA_HOUSES.has(getHouseNum(mars.rasiNum, moon.rasiNum))  : false;
  const fromVenus = venus ? DOSHA_HOUSES.has(getHouseNum(mars.rasiNum, venus.rasiNum)) : false;

  const hasDosha = fromLagna || fromMoon || fromVenus;
  if (!hasDosha) return { hasDosha: false, fromLagna, fromMoon, fromVenus, isCancelled: false, severity: 'none', cancellationReason: '' };

  // Cancellations
  const OWN_SIGNS_MARS = [0, 7]; // Aries, Scorpio
  const EXALT_MARS     = 9;      // Capricorn
  let isCancelled = false;
  let cancellationReason = '';

  if (OWN_SIGNS_MARS.includes(mars.rasiNum)) {
    isCancelled = true; cancellationReason = 'Mars in own sign (cancels dosha)';
  } else if (mars.rasiNum === EXALT_MARS) {
    isCancelled = true; cancellationReason = 'Mars exalted (cancels dosha)';
  } else if (jup) {
    // Jupiter conjunct or aspecting Mars
    const jupHouseFromMars = getHouseNum(jup.rasiNum, mars.rasiNum);
    if (jupHouseFromMars === 1 || jupHouseFromMars === 5 || jupHouseFromMars === 9) {
      isCancelled = true; cancellationReason = 'Jupiter aspects Mars (cancels dosha)';
    }
  } else if (lagnaRasi === 2 && marsHouseFromLagna === 2) { // Gemini lagna
    isCancelled = true; cancellationReason = 'Gemini lagna, Mars in 2nd (cancels)';
  } else if (lagnaRasi === 5 && marsHouseFromLagna === 2) { // Virgo lagna
    isCancelled = true; cancellationReason = 'Virgo lagna, Mars in 2nd (cancels)';
  } else if ((lagnaRasi === 3 || lagnaRasi === 4) && marsHouseFromLagna === 7) {
    isCancelled = true; cancellationReason = 'Cancer/Leo lagna, Mars in 7th (cancels)';
  } else if (lagnaRasi === 0 && marsHouseFromLagna === 4) {
    isCancelled = true; cancellationReason = 'Aries lagna, Mars in 4th (cancels)';
  }

  const severity = isCancelled ? 'cancelled' : (fromLagna && fromMoon ? 'high' : 'medium');

  return { hasDosha, fromLagna, fromMoon, fromVenus, isCancelled, cancellationReason, severity, marsHouse: marsHouseFromLagna };
}

/* ── Kala Sarpa Dosha (Prompt 14) ─────────────────────────────────────── */
const KALA_SARPA_VARIANTS = [
  'Ananta', 'Kulika', 'Vasuki', 'Shankhapala', 'Padma', 'Mahapadma',
  'Takshaka', 'Karkotak', 'Shankhachuda', 'Ghatak', 'Vishadhar', 'Sheshanaga'
];

function checkKalaSarpaDosha(planets, lagnaRasi) {
  const rahu = planets.find(p => p.name === 'Rahu');
  const ketu = planets.find(p => p.name === 'Ketu');
  if (!rahu || !ketu) return { hasDosha: false };

  const mainPlanets = planets.filter(p => !['Rahu','Ketu','Lagna'].includes(p.name));

  const rahuLon = rahu.siderealLon;
  const ketuLon = ketu.siderealLon; // rahu + 180

  // Check if all planets are in the arc from Rahu → Ketu (going forward 0°→180°)
  function inArcRahuToKetu(lon) {
    // Normalize relative to Rahu
    const rel = ((lon - rahuLon) + 360) % 360;
    return rel < 180;
  }

  const inArc      = mainPlanets.filter(p => inArcRahuToKetu(p.siderealLon));
  const notInArc   = mainPlanets.filter(p => !inArcRahuToKetu(p.siderealLon));

  const hasDosha   = inArc.length === 7;   // all 7 trapped
  const isAmrita   = notInArc.length === 7; // all on other side

  if (!hasDosha && !isAmrita) return { hasDosha: false, type: 'none', variant: '', rahuHouse: 0, severity: 'none' };

  const type = hasDosha ? 'Kala Sarpa' : 'Kala Amrita';
  const rahuHouse = window.Astro.getHouseNum(rahu.rasiNum, lagnaRasi);
  const variant = KALA_SARPA_VARIANTS[(rahuHouse - 1) % 12];
  const severity = hasDosha ? 'high' : 'medium';

  return {
    hasDosha: hasDosha || isAmrita,
    type, variant, rahuHouse,
    severity,
    description: `${variant} Kala Sarpa — Rahu in ${rahuHouse}th house`,
  };
}

/* ── Sade Sati / Shani Dosha (Prompt 15) ──────────────────────────────── */
/**
 * For simplicity, we compute Saturn's approximate current transit rasi
 * from birth year offset. Saturn transits ~1 rasi per 2.5 years.
 * @param {number} natalMoonRasi 0-11
 * @param {Date}   currentDate
 * @param {Object} natalSaturn  planet object (to know natal Saturn rasi/lon)
 */
function checkSadeSati(natalMoonRasi, currentDate, natalSaturn, birthDate) {
  // Saturn's sidereal period ≈ 29.46 years → ~2.455 years per rasi
  const SATURN_PERIOD_DAYS = 10759.27; // days for full revolution
  const RASI_PERIOD_DAYS   = SATURN_PERIOD_DAYS / 12; // ~896 days per rasi

  // Compute approximate current Saturn rasi using natal Saturn position + elapsed time
  if (!natalSaturn || !birthDate) return { isSadeSati: false, isDhaiya: false };

  const elapsedDays = (currentDate - birthDate) / (1000 * 60 * 60 * 24);
  const rasiMoved   = Math.floor(elapsedDays / RASI_PERIOD_DAYS);
  const saturnCurrentRasi = (natalSaturn.rasiNum + rasiMoved) % 12;

  // Sade Sati: Saturn in 12th, 1st, or 2nd from natal Moon
  const relFromMoon = ((saturnCurrentRasi - natalMoonRasi) + 12) % 12;
  const isSadeSati  = [11, 0, 1].includes(relFromMoon);
  const isDhaiya    = [3, 7].includes(relFromMoon); // 4th or 8th

  let phase = '';
  if (isSadeSati) {
    if (relFromMoon === 11) phase = 'Rising';
    else if (relFromMoon === 0) phase = 'Peak';
    else phase = 'Setting';
  }

  // Approximate start/end of current sade sati
  const phaseStart = birthDate ? new Date(currentDate.getTime() - ((elapsedDays % RASI_PERIOD_DAYS) * 86400000)) : null;
  const phaseEnd   = phaseStart ? new Date(phaseStart.getTime() + RASI_PERIOD_DAYS * 86400000) : null;

  return {
    isSadeSati,
    isDhaiya,
    isFirstPhase:  isSadeSati && relFromMoon === 11,
    isPeakPhase:   isSadeSati && relFromMoon === 0,
    isLastPhase:   isSadeSati && relFromMoon === 1,
    phase,
    moonRasi: natalMoonRasi,
    saturnTransitRasi: saturnCurrentRasi,
    startedOn: phaseStart,
    endsOn: phaseEnd,
  };
}

/* ── Additional doshas ────────────────────────────────────────────────── */
function checkPitraDosha(planets, lagnaRasi) {
  const sun  = planets.find(p => p.name === 'Sun');
  const moon = planets.find(p => p.name === 'Moon');
  const rahu = planets.find(p => p.name === 'Rahu');
  const ketu = planets.find(p => p.name === 'Ketu');
  if (!sun || !rahu || !ketu) return { hasDosha: false };

  const sunWithRahu = sun.rasiNum === rahu.rasiNum;
  const sunWithKetu = sun.rasiNum === ketu.rasiNum;
  const moonWithRahu= moon && moon.rasiNum === rahu.rasiNum;
  const moonWithKetu= moon && moon.rasiNum === ketu.rasiNum;

  const hasDosha  = sunWithRahu || sunWithKetu || moonWithRahu || moonWithKetu;
  const afflicted = [];
  if (sunWithRahu || sunWithKetu) afflicted.push('Sun');
  if (moonWithRahu || moonWithKetu) afflicted.push('Moon');

  return {
    hasDosha,
    afflicted,
    description: hasDosha ? `${afflicted.join('+')} conjunct with Rahu/Ketu` : 'No Pitra Dosha',
  };
}

function checkGuruChandala(planets) {
  const jup  = planets.find(p => p.name === 'Jupiter');
  const rahu = planets.find(p => p.name === 'Rahu');
  if (!jup || !rahu) return { hasDosha: false };
  const hasDosha = jup.rasiNum === rahu.rasiNum;
  return { hasDosha, description: hasDosha ? 'Jupiter conjunct Rahu → Guru Chandala Yoga' : 'No Guru Chandala' };
}

function checkGrahanYoga(planets) {
  const sun  = planets.find(p => p.name === 'Sun');
  const moon = planets.find(p => p.name === 'Moon');
  const rahu = planets.find(p => p.name === 'Rahu');
  const ketu = planets.find(p => p.name === 'Ketu');
  if (!sun || !rahu) return { hasDosha: false };

  // Within 10° in same rasi
  function closeConjunct(a, b) {
    return a.rasiNum === b.rasiNum && Math.abs(a.degree - b.degree) < 10;
  }

  const hasDosha = closeConjunct(sun, rahu) || closeConjunct(sun, ketu) ||
                   (moon && (closeConjunct(moon, rahu) || closeConjunct(moon, ketu)));
  return { hasDosha, description: hasDosha ? 'Grahan (Eclipse) Yoga present' : 'No Grahan Yoga' };
}

/* ── Dosha panel renderer (Prompt 16) ─────────────────────────────────── */
const DOSHA_ICONS = {
  mangalDosha:  '♂',
  kalaSarpa:    '🐍',
  sadeSati:     '♄',
  pitraDosha:   '☀',
  guruChandala: '♃',
  grahanYoga:   '🌑',
};

const DOSHA_REMEDIES = {
  mangalDosha:  'செவ்வாய் வழிபாடு, மாங்கல்ய பூஜை. Recite Mangal Stotram on Tuesdays.',
  kalaSarpa:    'நாக பூஜை, ராகு-கேது திருவிழா. Sarpa Suktam recitation on Saturdays.',
  sadeSati:     'சனி வழிபாடு, சனீஸ்வரர் கோவில். Chant Shani mantra daily. Offer sesame oil.',
  pitraDosha:   'அமாவாசை தர்ப்பணம், பித்ரு பூஜை. Offer tarpan on new moon days.',
  guruChandala: 'குரு வழிபாடு, விஷ்ணு சகஸ்ரநாமம். Recite Guru Stotram on Thursdays.',
  grahanYoga:   'சூரிய/சந்திர க்ரஹண பூஜை. Donate during eclipses.',
};

function renderDoshaPanel(doshaResults, containerId, isPremium) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const doshaInfo = [
    {
      key: 'mangalDosha',
      result: doshaResults.mangal,
      hasDosha: doshaResults.mangal?.hasDosha,
      isCancelled: doshaResults.mangal?.isCancelled,
      getStatus() {
        if (!this.hasDosha) return 'clear';
        if (this.isCancelled) return 'cancelled';
        return doshaResults.mangal.severity === 'high' ? 'present' : 'partial';
      },
      getDesc() {
        if (!this.hasDosha) return 'No Mangal Dosha detected.';
        if (this.isCancelled) return doshaResults.mangal.cancellationReason;
        const from = [];
        if (doshaResults.mangal.fromLagna) from.push(planetName('Lagna'));
        if (doshaResults.mangal.fromMoon)  from.push(planetName('Moon'));
        if (doshaResults.mangal.fromVenus) from.push(planetName('Venus'));
        return `${planetName('Mars')} ${doshaResults.mangal.marsHouse}${t('houses')[doshaResults.mangal.marsHouse - 1]?.slice(-4) || 'th house'} (${from.join(', ')}).`;
      }
    },
    {
      key: 'kalaSarpa',
      result: doshaResults.kalaSarpa,
      hasDosha: doshaResults.kalaSarpa?.hasDosha,
      getStatus() {
        if (!this.hasDosha) return 'clear';
        return doshaResults.kalaSarpa.type === 'Kala Amrita' ? 'partial' : 'present';
      },
      getDesc() {
        if (!this.hasDosha) return 'No Kala Sarpa Dosha.';
        return doshaResults.kalaSarpa.description || doshaResults.kalaSarpa.type;
      }
    },
    {
      key: 'sadeSati',
      result: doshaResults.sadeSati,
      hasDosha: doshaResults.sadeSati?.isSadeSati || doshaResults.sadeSati?.isDhaiya,
      getStatus() {
        if (!this.hasDosha) return 'clear';
        return doshaResults.sadeSati.isSadeSati ? 'present' : 'partial';
      },
      getDesc() {
        if (!this.hasDosha) return 'Sade Sati not active currently.';
        if (doshaResults.sadeSati.isDhaiya) return 'Dhaiya (Shani 2.5yr transit) active.';
        return `Sade Sati ${doshaResults.sadeSati.phase} phase active.`;
      }
    },
    {
      key: 'pitraDosha',
      result: doshaResults.pitraDosha,
      hasDosha: doshaResults.pitraDosha?.hasDosha,
      getStatus() { return this.hasDosha ? 'present' : 'clear'; },
      getDesc() { return doshaResults.pitraDosha?.description || 'No Pitra Dosha.'; }
    },
    {
      key: 'guruChandala',
      result: doshaResults.guruChandala,
      hasDosha: doshaResults.guruChandala?.hasDosha,
      getStatus() { return this.hasDosha ? 'present' : 'clear'; },
      getDesc() { return doshaResults.guruChandala?.description || 'No Guru Chandala.'; }
    },
    {
      key: 'grahanYoga',
      result: doshaResults.grahanYoga,
      hasDosha: doshaResults.grahanYoga?.hasDosha,
      getStatus() { return this.hasDosha ? 'present' : 'clear'; },
      getDesc() { return doshaResults.grahanYoga?.description || 'No Grahan Yoga.'; }
    },
  ];

  const statusLabels = { present:'Present', cancelled:'Cancelled', clear:'Clear', partial:'Partial' };

  const grid = document.createElement('div');
  grid.className = 'dosha-grid';

  doshaInfo.forEach(info => {
    const status = info.getStatus();
    const card   = document.createElement('div');
    card.className = `dosha-card ${status}`;
    const name   = t(`doshas.${info.key}`) || info.key;
    const stLabel= t(`doshaStatus.${status}`) || statusLabels[status];
    const icon   = DOSHA_ICONS[info.key] || '⚡';
    const remedy = info.hasDosha && !info.isCancelled ? DOSHA_REMEDIES[info.key] : '';

    card.innerHTML = `
      <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.4rem">
        <span class="dosha-icon">${icon}</span>
        <span class="dosha-name">${name}</span>
      </div>
      <div class="dosha-badge ${status}">${stLabel}</div>
      <div class="dosha-desc" style="margin-top:.4rem">${info.getDesc()}</div>
      ${remedy ? `<div class="dosha-remedy" style="margin-top:.5rem;font-size:.75rem;color:var(--gold-d);border-top:1px solid rgba(0,0,0,.08);padding-top:.4rem">
        ${isPremium ? `<strong>Remedy:</strong> ${remedy}` : `<button class="unlock-btn" style="font-size:.72rem;padding:.2rem .65rem" onclick="window.Payment&&window.Payment.initPayment()">🔓 View Remedy</button>`}
      </div>` : ''}
    `;
    grid.appendChild(card);
  });

  container.innerHTML = '';
  container.appendChild(grid);
}

/* ── Combined check ───────────────────────────────────────────────────── */
function runAllDoshaChecks(planets, lagnaRasi, birthDate, currentDate) {
  const natalMoon   = planets.find(p => p.name === 'Moon');
  const natalSaturn = planets.find(p => p.name === 'Saturn');

  return {
    mangal:      checkMangalDosha(planets, lagnaRasi),
    kalaSarpa:   checkKalaSarpaDosha(planets, lagnaRasi),
    sadeSati:    checkSadeSati(natalMoon?.rasiNum || 0, currentDate || new Date(), natalSaturn, birthDate),
    pitraDosha:  checkPitraDosha(planets, lagnaRasi),
    guruChandala:checkGuruChandala(planets),
    grahanYoga:  checkGrahanYoga(planets),
  };
}

// Expose
window.Dosha = {
  checkMangalDosha,
  checkKalaSarpaDosha,
  checkSadeSati,
  checkPitraDosha,
  checkGuruChandala,
  checkGrahanYoga,
  runAllDoshaChecks,
  renderDoshaPanel,
};
