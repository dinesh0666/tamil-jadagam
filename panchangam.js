/**
 * panchangam.js — Tamil daily Panchangam calculator
 * Relies on astro.js globals: getSunLon, getMoonLon, getLahiriAyanamsa, toJD, norm360
 * All calculations run in-browser (no server needed).
 */
'use strict';

window.Panchangam = (() => {

  /* ── Tamil 60-year cycle (Prabhava = index 0, cycle started 1987-88) ── */
  const TAMIL_YEARS = [
    'பிரபவ','விபவ','சுக்ல','பிரமோத','பிரஜோத்பத்தி',
    'அங்கிரஸ','ஸ்ரீமுக','பவ','யுவ','தாது',
    'ஈஸ்வர','பஹுதான்ய','பிரமாதி','விக்கிரம','விஷ',
    'சித்திரபானு','சுபானு','தாரண','பார்தீவ','வியய',
    'சர்வஜித்','சர்வதாரி','விரோதி','விக்ருது','கர',
    'நந்தன','விஜய','ஜய','மன்மத','துர்முகி',
    'ஹேவிளம்பி','விளம்பி','விகாரி','சார்வரி','பிலவ',
    'சுபகிருது','சோபகிருது','க்ரோதி','விஸ்வாவசு','பராபவ',
    'பிலவங்க','கீலக','சௌம்ய','சாதாரண','விரோதக்ருது',
    'பரிதாவி','பிரமாதீச','ஆனந்த','ராக்ஷஸ','நல',
    'பிங்கள','காளயுக்தி','சித்தார்தி','ரௌத்ரி','துர்மதி',
    'துந்துபி','ருதிரோத்காரி','ரக்தாக்ஷி','க்ரோதன','அக்ஷய',
  ];
  const CYCLE_BASE_YEAR = 1987; // Gregorian year when Prabhava (index 0) started

  /* ── Tamil solar months (one per rasi, in sidereal order) ──────────── */
  const TAMIL_MONTHS = [
    'சித்திரை','வைகாசி','ஆனி','ஆடி',
    'ஆவணி','புரட்டாசி','ஐப்பசி','கார்த்திகை',
    'மார்கழி','தை','மாசி','பங்குனி',
  ];

  /* ── Tithi names (Shukla 1–15, Krishna 1–15) ───────────────────────── */
  const SUKLA_TITHI  = ['பிரதமை','துவிதியை','திரிதியை','சதுர்த்தி','பஞ்சமி',
    'சஷ்டி','சப்தமி','அஷ்டமி','நவமி','தசமி',
    'ஏகாதசி','துவாதசி','திரயோதசி','சதுர்தசி','பௌர்ணமி'];
  const KRISHNA_TITHI = ['பிரதமை','துவிதியை','திரிதியை','சதுர்த்தி','பஞ்சமி',
    'சஷ்டி','சப்தமி','அஷ்டமி','நவமி','தசமி',
    'ஏகாதசி','துவாதசி','திரயோதசி','சதுர்தசி','அமாவாசை'];
  const PAKSHA = ['வளர்பிறை ☽','தேய்பிறை ☾'];

  /* ── Nakshatra names (27) ──────────────────────────────────────────── */
  const NAK = [
    'அசுவினி','பரணி','கார்த்திகை','ரோகிணி','மிருகசீரிஷம்',
    'திருவாதிரை','புனர்பூசம்','பூசம்','ஆயில்யம்','மகம்',
    'பூரம்','உத்திரம்','ஹஸ்தம்','சித்திரை','சுவாதி',
    'விசாகம்','அனுஷம்','கேட்டை','மூலம்','பூராடம்',
    'உத்திராடம்','திருவோணம்','அவிட்டம்','சதயம்','பூரட்டாதி',
    'உத்திரட்டாதி','ரேவதி',
  ];

  /* ── Yogam names (27) ─────────────────────────────────────────────── */
  const YOGAM = [
    'விஷ்கம்ப','பிரீதி','ஆயுஷ்மான்','சௌபாக்கிய','சோபன',
    'அதிகண்ட','சுகர்மன்','த்ருதி','சூல','கண்ட',
    'விருத்தி','த்ருவ','வியாகாத','ஹர்ஷண','வஜ்ர',
    'சித்தி','வ்யதீபாத','வரீயான்','பரிக','சிவ',
    'சித்த','சாத்திய','சுபம்','சுக்ல','ப்ரம்ம',
    'இந்த்ர','வைத்ருதி',
  ];

  /* ── Karanam (7 repeating + 4 fixed) ──────────────────────────────── */
  const KARA_MOVABLE = ['பாலவ','கௌலவ','தைதில','கரஜ','வணிஜ','விஷ்டி','பவ'];
  const KARA_FIXED   = ['சகுனி','சதுஷ்பாத','நாகவ','கிம்ஸ்துக்ன'];

  /* ── Vaaram (weekday) ─────────────────────────────────────────────── */
  const VAARAM = ['ஞாயிறு','திங்கள்','செவ்வாய்','புதன்','வியாழன்','வெள்ளி','சனி'];
  const VAARAM_PLANET = ['☀','☽','♂','☿','♃','♀','♄'];

  /* ── Muhurta slot indices (1-8, each = 1/8 of daytime from sunrise) ──
     Rahu Kalam verified against standard Tamil almanac:               */
  const RAHU_SLOT = [8, 2, 7, 5, 6, 4, 3]; // Sun Mon Tue Wed Thu Fri Sat
  const EMA_SLOT  = [5, 4, 3, 2, 1, 7, 6]; // Yamakanda
  const KULI_SLOT = [7, 6, 5, 4, 3, 2, 1]; // Kuligai

  /* ── Nakshatra ruling lords (repeating 9-planet cycle, 27 stars) ──── */
  const NAK_LORD = [
    'கேது','சுக்கிரன்','சூரியன்','சந்திரன்','செவ்வாய்','ராகு','குரு','சனி','புதன்',
    'கேது','சுக்கிரன்','சூரியன்','சந்திரன்','செவ்வாய்','ராகு','குரு','சனி','புதன்',
    'கேது','சுக்கிரன்','சூரியன்','சந்திரன்','செவ்வாய்','ராகு','குரு','சனி','புதன்',
  ];

  /* ── Yogam quality (27 yogas — inauspicious ones flagged) ─────────── */
  // Inauspicious: Vishkamba(0), Atiganda(5), Shula(8), Ganda(9), Vyaghata(12),
  //               Vajra(14), Vyatipata(16), Parigha(18), Vaidhriti(26)
  const YOGAM_QUALITY = [
    'bad','good','good','good','good',
    'bad','good','good','bad','bad',
    'good','good','bad','good','bad',
    'good','bad','good','bad','good',
    'good','good','good','good','good',
    'good','bad',
  ];

  /* ── Planetary Hora system (Chaldean order) ────────────────────────── */
  // Sequence used to assign planetary hours starting from sunrise each day
  const HORA_PLANET    = ['Sun','Venus','Mercury','Moon','Saturn','Jupiter','Mars'];
  // Index of first hora lord for each weekday (0=Sun … 6=Sat) in HORA_PLANET
  const HORA_DAY_START = [0, 3, 6, 2, 5, 1, 4];

  /* ── Chennai fallback sunrise/sunset by month (IST decimal hours) ─── */
  // Used only when lat/lon not supplied
  const SR_DEFAULT = [6.42,6.38,6.22,6.07,5.97,5.87,5.97,6.08,6.17,6.17,6.25,6.53];
  const SS_DEFAULT = [17.97,18.03,18.12,18.25,18.38,18.42,18.37,18.22,17.95,17.72,17.62,17.78];

  /* ── Muhurta (auspicious day) criteria ────────────────────────────── */
  // Nakshatras: Rohini(3), Mrigasira(4), Hasta(12), Chitra(13), Swati(14),
  //             Anuradha(16), Mula(18), Uttarashada(20), UttaraBhadra(25), Revati(26)
  const MUHURTA_NAK   = [3,4,12,13,14,16,18,20,25,26];
  // Shukla paksha tithis (0-indexed within paksha): avoid Prathami(0), Chaturthi(3), Ashtami(7), Navami(8), Chaturdashi(13)
  const MUHURTA_TITHI = [1,2,4,5,6,9,10,11,12];
  // Auspicious weekdays: Monday(1), Wednesday(3), Thursday(4), Friday(5)
  const MUHURTA_DOW   = [1,3,4,5];

  /* ── Rasi → nakshatra names for chandrashtamam display ─────────────── */
  const RASI_NAK_STR = [
    'அசுவினி, பரணி, கார்த்திகை',
    'கார்த்திகை, ரோகிணி, மிருகசீரிஷம்',
    'மிருகசீரிஷம், திருவாதிரை, புனர்பூசம்',
    'புனர்பூசம், பூசம், ஆயில்யம்',
    'மகம், பூரம், உத்திரம்',
    'உத்திரம், ஹஸ்தம், சித்திரை',
    'சித்திரை, சுவாதி, விசாகம்',
    'விசாகம், அனுஷம், கேட்டை',
    'மூலம், பூராடம், உத்திராடம்',
    'உத்திராடம், திருவோணம், அவிட்டம்',
    'அவிட்டம், சதயம், பூரட்டாதி',
    'பூரட்டாதி, உத்திரட்டாதி, ரேவதி',
  ];

  /* ── Soolam parihaaram (remedy) by weekday ──────────────────────── */
  const SOOLAM_REMEDY = ['தாமிரம்', 'பால்', 'சிவப்பு வஸ்திரம்', 'மலர்', 'தைலம்', 'இலந்தை', 'நல்லெண்ணெய்'];

  /* ── Islamic month names (Tamil) ────────────────────────────── */
  const HIJRI_MONTHS_TA = [
    'முஹர்ரம்', 'சஃபர்', 'ரபீவுல் அவ்வல்', 'ரபீவுல் ஆகிர்',
    'ஜுமாதல் அவ்வல்', 'ஜுமாதல் ஆகிர்', 'ரஜப்', 'ஷஃபான்',
    'ரமளான்', 'ஷவ்வால்', 'துல் க்வைதா', 'துல் ஹிஜ்ஜா',
  ];

  /* ── Shaka (Indian National Calendar) month names ─────────────────── */
  const SHAKA_MONTHS_TA = [
    'சைதிரம்','வைசாகம்','ஜ்யேஷ்டம்','ஆஷாடம்',
    'ஷ்ராவணம்','பாத்ரபதம்','ஆஸ்வயுஜம்','கார்த்திகம்',
    'மார்கசீர்ஷம்','பௌஷம்','மாகம்','பால்குனம்',
  ];

  /* ── Chandrabala keywords per position (1st–12th from Moon rasi) ────── */
  const CB_WORD = [
    'உடல் நலம்', 'விரயம்', 'முன்னேற்றம்', 'சிந்தனை',
    'கவலை', 'வெற்றி', 'உறவு நலம்', 'சிக்கல்',
    'பாக்கியம்', 'தொழில் நலம்', 'லாபம்', 'ஓய்வு',
  ];
  const CB_TYPE = [
    'mid','bad','good','mid','bad','good','good','bad','good','good','good','mid',
  ];

  /* ── Soolam direction ─────────────────────────────────────────────── */
  const SOOLAM = ['தெற்கு','கிழக்கு','வடக்கு','வடக்கு','தெற்கு','மேற்கு','கிழக்கு'];

  /* ── Rasi names (Tamil) ───────────────────────────────────────────── */
  const RASI_TA = [
    'மேஷம்','ரிஷபம்','மிதுனம்','கடகம்','சிம்மம்','கன்னி',
    'துலாம்','விருச்சிகம்','தனுசு','மகரம்','கும்பம்','மீனம்',
  ];

  /* ── Astronomical sunrise/sunset (NOAA algorithm) ────────────────── */
  /**
   * Calculate local sunrise and sunset times.
   * @param {number} latDeg  latitude  (positive = north)
   * @param {number} lonDeg  longitude (positive = east)
   * @param {Date}   date
   * @param {number} tzHr   timezone offset in decimal hours (e.g. 5.5 for IST)
   * @returns {{ sunrise: number, sunset: number }} decimal hours after midnight local time
   */
  function calcSunriseSunset(latDeg, lonDeg, date, tzHr) {
    const y = date.getFullYear(), mo = date.getMonth() + 1, d = date.getDate();
    const jdNoon = toJD(y, mo, d, 12 - tzHr);
    const t = (jdNoon - 2451545.0) / 36525;

    // Sun's mean longitude and anomaly
    const L0 = norm360(280.46646 + 36000.76983 * t);
    const M  = norm360(357.52911 + 35999.05029 * t - 0.0001537 * t * t);
    const C  = (1.914602 - 0.004817 * t - 0.000014 * t * t) * sin(M)
             + (0.019993 - 0.000101 * t) * sin(2 * M)
             + 0.000289 * sin(3 * M);
    const sunTrueLon = norm360(L0 + C);
    const omega      = 125.04 - 1934.136 * t;
    const lambdaDeg  = sunTrueLon - 0.00569 - 0.00478 * sin(omega);

    // Obliquity and declination
    const epsDeg  = 23.439291111 - 0.013004167 * t + 0.00256 * cos(omega);
    const deltaDeg = Math.asin(sin(epsDeg) * sin(lambdaDeg)) * DEG;

    // Equation of time (minutes)
    const e  = 0.016708634 - 0.000042037 * t;
    const y2 = Math.tan((epsDeg * RAD) / 2) ** 2;
    const EqTmin = 4 * (y2 * sin(2 * L0 * RAD)
      - 2 * e * sin(M * RAD)
      + 4 * e * y2 * sin(M * RAD) * cos(2 * L0 * RAD)
      - 0.5 * y2 * y2 * sin(4 * L0 * RAD)
      - 1.25 * e * e * sin(2 * M * RAD));

    // Longitude correction (minutes) from standard meridian
    const lonCorrMin = (lonDeg - 15 * tzHr) * 4;

    // Solar noon in local time (hours)
    const solarNoon = 12 - EqTmin / 60 - lonCorrMin / 60;

    // Hour angle — 90.833° accounts for atmospheric refraction + solar disc radius
    const cosHA = (cos(90.833) - sin(latDeg) * sin(deltaDeg)) / (cos(latDeg) * cos(deltaDeg));
    if (cosHA > 1 || cosHA < -1) {
      // Polar day/night fallback
      const mIdx = date.getMonth();
      return { sunrise: SR_DEFAULT[mIdx], sunset: SS_DEFAULT[mIdx] };
    }

    const HA = Math.acos(cosHA) * DEG;
    return {
      sunrise: solarNoon - HA / 15,
      sunset:  solarNoon + HA / 15,
    };
  }

  /* ── Hora (planetary hour) times for a given day ──────────────────── */
  /**
   * Returns the 12 daytime hora objects: { planet, start, end } in decimal hours.
   * Daytime is divided into 12 equal horas from sunrise to sunset.
   */
  function calcHoras(dow, sunriseH, sunsetH) {
    const dayLen  = sunsetH - sunriseH;  // hours
    const horaLen = dayLen / 12;          // each hora length
    const startIdx = HORA_DAY_START[dow];
    const horas = [];
    for (let i = 0; i < 12; i++) {
      horas.push({
        planet: HORA_PLANET[(startIdx + i) % 7],
        start:  sunriseH + i * horaLen,
        end:    sunriseH + (i + 1) * horaLen,
      });
    }
    return horas;
  }

  /** Get time windows for a specific hora planet (max 2 windows, daytime only) */
  function getHoraTimes(horas, planet) {
    return horas
      .filter(h => h.planet === planet)
      .slice(0, 2)
      .map(h => `${formatHM(h.start)} – ${formatHM(h.end)}`);
  }

  /* ── Helpers ──────────────────────────────────────────────────────── */
  function formatHM(h) {
    const totalMin = Math.round(h * 60);
    const hh = Math.floor(totalMin / 60) % 24;
    const mm = totalMin % 60;
    const ampm = hh < 12 ? 'AM' : 'PM';
    const dh = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh;
    return `${dh}:${mm.toString().padStart(2,'0')} ${ampm}`;
  }

  function slotToTime(slot, sunriseH, slotLen) {
    const s = sunriseH + (slot - 1) * slotLen;
    return `${formatHM(s)} – ${formatHM(s + slotLen)}`;
  }

  /* ── JD → IST time string ────────────────────────────────────────────── */
  function jdToIST(jd) {
    const msFromJ2000 = (jd - 2451545.0) * 86400000;
    const utcMs = Date.UTC(2000, 0, 1, 12, 0, 0) + msFromJ2000;
    const istMs = utcMs + 5.5 * 3600000;
    const d = new Date(istMs);
    const h = d.getUTCHours(), m = d.getUTCMinutes();
    const ampm = h < 12 ? 'AM' : 'PM';
    const dh = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${dh}:${m.toString().padStart(2,'0')} ${ampm}`;
  }

  /* ── Binary search for tithi end time ────────────────────────────── */
  function findTithiEnd(date, tithiNum0) {
    const y = date.getFullYear(), mo = date.getMonth() + 1, d = date.getDate();
    const jd0 = toJD(y, mo, d, 0.5);
    const getT = (jd) => {
      const ay = getLahiriAyanamsa(jd);
      return Math.floor(norm360(norm360(getMoonLon(jd) - ay) - norm360(getSunLon(jd) - ay)) / 12);
    };
    let lo = jd0, hi = jd0 + 1.8;
    if (getT(hi) === tithiNum0) return null;
    for (let i = 0; i < 28; i++) { const mid = (lo + hi) / 2; if (getT(mid) === tithiNum0) lo = mid; else hi = mid; }
    return hi;
  }

  /* ── Binary search for nakshatra end time ──────────────────────────── */
  function findNakEnd(date, nakIdx0) {
    const y = date.getFullYear(), mo = date.getMonth() + 1, d = date.getDate();
    const jd0 = toJD(y, mo, d, 0.5);
    const getN = (jd) => Math.floor(norm360(getMoonLon(jd) - getLahiriAyanamsa(jd)) / (360 / 27)) % 27;
    let lo = jd0, hi = jd0 + 1.8;
    if (getN(hi) === nakIdx0) return null;
    for (let i = 0; i < 28; i++) { const mid = (lo + hi) / 2; if (getN(mid) === nakIdx0) lo = mid; else hi = mid; }
    return hi;
  }

  /* ── Hijri (Islamic) date ───────────────────────────────────────────── */
  function toHijri(date) {
    const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
    const a = Math.floor((14 - m) / 12), Y = y + 4800 - a, M = m + 12 * a - 3;
    const JDN = d + Math.floor((153 * M + 2) / 5) + 365 * Y +
                Math.floor(Y / 4) - Math.floor(Y / 100) + Math.floor(Y / 400) - 32045;
    const k = JDN - 1948440 + 10632;
    const n = Math.floor((k - 1) / 10631);
    const kk = k - 10631 * n + 354;
    const j  = Math.floor((10985 - kk) / 5316) * Math.floor(50 * kk / 17719) +
                Math.floor(kk / 5670) * Math.floor(43 * kk / 15238);
    const kk2 = kk - Math.floor((30 - j) / 15) * Math.floor(17719 * j / 50) -
                 Math.floor(j / 16) * Math.floor(15238 * j / 43) + 29;
    const hM = Math.floor(24 * kk2 / 709);
    return { day: kk2 - Math.floor(709 * hM / 24), month: hM, year: 30 * n + j - 30, monthName: HIJRI_MONTHS_TA[hM - 1] };
  }

  /* ── Shaka (Indian National) date ───────────────────────────────────── */
  function getShaka(date) {
    const march22 = new Date(date.getFullYear(), 2, 22);
    const diff = Math.floor((date - march22) / 86400000);
    if (diff < 0) {
      const prev22 = new Date(date.getFullYear() - 1, 2, 22);
      const d2 = Math.floor((date - prev22) / 86400000);
      return { year: date.getFullYear() - 79, month: SHAKA_MONTHS_TA[Math.min(Math.floor(d2 / 30), 11)], day: (d2 % 30) + 1 };
    }
    return { year: date.getFullYear() - 78, month: SHAKA_MONTHS_TA[Math.min(Math.floor(diff / 30), 11)], day: (diff % 30) + 1 };
  }

  /* ── Day of year ────────────────────────────────────────────────── */
  function getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 1);
    const dayNo = Math.floor((date - start) / 86400000) + 1;
    const isLeap = (date.getFullYear() % 4 === 0 && date.getFullYear() % 100 !== 0) || date.getFullYear() % 400 === 0;
    return { dayNo: String(dayNo).padStart(3, '0'), daysLeft: (isLeap ? 366 : 365) - dayNo };
  }

  /* ── Rasi palan by chandrabala position ──────────────────────────── */
  function getRasiPalan(moonRasiIdx) {
    return RASI_TA.map((rasi, i) => {
      const pos = ((i - moonRasiIdx + 12) % 12) + 1;
      return { rasi, word: CB_WORD[pos - 1], type: CB_TYPE[pos - 1] };
    });
  }

  function getTamilYear(date) {
    const y = date.getFullYear();
    // Tamil year changes on Mesha Sankranti ≈ April 13-14
    const befSankranti = date.getMonth() < 3 || (date.getMonth() === 3 && date.getDate() < 14);
    const eff = befSankranti ? y - 1 : y;
    const idx = ((eff - CYCLE_BASE_YEAR) % 60 + 60) % 60;
    return TAMIL_YEARS[idx];
  }

  /* ── Main calculation ─────────────────────────────────────────────── */
  /**
   * @param {Date}   date
   * @param {number} [lat=13.0827] Latitude  (default: Chennai)
   * @param {number} [lon=80.2707] Longitude (default: Chennai)
   * @param {number} [tz=5.5]     Timezone offset in hours (default: IST)
   */
  function calculate(date, lat, lon, tz) {
    lat = (lat != null) ? lat : 13.0827;
    lon = (lon != null) ? lon : 80.2707;
    tz  = (tz  != null) ? tz  : 5.5;

    const y = date.getFullYear(), mo = date.getMonth() + 1, d = date.getDate();
    // Panchangam computed at sunrise (≈0.5 UT for IST)
    const jd  = toJD(y, mo, d, 0.5);
    const dow = date.getDay();

    // Sidereal longitudes (Lahiri)
    const ayan     = getLahiriAyanamsa(jd);
    const sunLong  = norm360(getSunLon(jd)  - ayan);
    const moonLong = norm360(getMoonLon(jd) - ayan);

    // Tamil solar month & date within it
    const monthIdx  = Math.floor(sunLong / 30) % 12;
    const tamilDate = Math.floor(sunLong % 30) + 1;

    // Tithi
    const tithiAngle = norm360(moonLong - sunLong);
    const tithiNum   = Math.floor(tithiAngle / 12);  // 0–29
    const paksha     = tithiNum < 15 ? 0 : 1;
    const tithiIdx   = tithiNum % 15;
    const tithi      = (paksha === 0 ? SUKLA_TITHI : KRISHNA_TITHI)[tithiIdx];

    // Nakshatra & Pada
    const NAK_SPAN = 360 / 27;
    const nakIdx   = Math.floor(moonLong / NAK_SPAN) % 27;
    const pada     = Math.floor((moonLong % NAK_SPAN) / (NAK_SPAN / 4)) + 1;

    // Transition end times (binary search)
    const tithiEndJD   = findTithiEnd(date, tithiNum);
    const tithiEndTime = tithiEndJD ? jdToIST(tithiEndJD) : null;
    const nextTNum     = (tithiNum + 1) % 30;
    const nextTithi    = nextTNum < 15 ? SUKLA_TITHI[nextTNum] : KRISHNA_TITHI[nextTNum % 15];
    const nakEndJD   = findNakEnd(date, nakIdx);
    const nakEndTime = nakEndJD ? jdToIST(nakEndJD) : null;
    const nextNak    = NAK[(nakIdx + 1) % 27];

    // Special day flags
    const isPournami = tithiNum === 14;
    const isAmavasai = tithiNum === 29;
    const isMuhurat  = paksha === 0 && !isPournami
      && MUHURTA_TITHI.includes(tithiIdx)
      && MUHURTA_NAK.includes(nakIdx)
      && MUHURTA_DOW.includes(dow);

    // Yogam
    const yogamIdx     = Math.floor(norm360(sunLong + moonLong) / NAK_SPAN) % 27;
    const yogamQuality = YOGAM_QUALITY[yogamIdx];

    // Karanam
    const karaNum = Math.floor(tithiAngle / 6);
    let karanam;
    if      (karaNum === 0)  karanam = KARA_FIXED[3];
    else if (karaNum >= 57)  karanam = KARA_FIXED[karaNum - 57];
    else                     karanam = KARA_MOVABLE[(karaNum - 1) % 7];

    // Chandrashtamam
    const chandraMoonRasiIdx = Math.floor(moonLong / 30) % 12;
    const chandraRasiIdx     = (chandraMoonRasiIdx - 7 + 12) % 12;
    const chandrashtamam     = RASI_TA[chandraRasiIdx];
    const chandrashtamamNak  = RASI_NAK_STR[chandraRasiIdx];

    // ── Sunrise / Sunset (astronomical) ──────────────────────────────────
    const ss       = calcSunriseSunset(lat, lon, date, tz);
    const sunriseH = ss.sunrise;
    const sunsetH  = ss.sunset;
    const slotLen  = (sunsetH - sunriseH) / 8;  // each of 8 day segments

    // ── Rahu Kalam, Ema Gandam, Kuligai ──────────────────────────────────
    const rahuKalam = slotToTime(RAHU_SLOT[dow], sunriseH, slotLen);
    const emaGanda  = slotToTime(EMA_SLOT[dow],  sunriseH, slotLen);
    const kuligai   = slotToTime(KULI_SLOT[dow], sunriseH, slotLen);

    // ── Nalla Neram (Jupiter horas) & Gowri Nalla Neram (Moon horas) ─────
    const horas           = calcHoras(dow, sunriseH, sunsetH);
    const nallaNeramTimes = getHoraTimes(horas, 'Jupiter');  // up to 2 windows
    const gowriNeramTimes = getHoraTimes(horas, 'Moon');     // up to 2 windows
    const nallaNeram  = nallaNeramTimes[0] || '—';
    const gowriNeram  = gowriNeramTimes[0] || '—';

    // Calendar info
    const hijriDate = toHijri(date);
    const shakaDate = getShaka(date);
    const dayInfo   = getDayOfYear(date);
    const rasiPalan = getRasiPalan(chandraMoonRasiIdx);

    return {
      date,
      tamilYear:    getTamilYear(date),
      tamilMonth:   TAMIL_MONTHS[monthIdx],
      tamilDate,
      vaaram:       VAARAM[dow],
      vaaramPlanet: VAARAM_PLANET[dow],
      nakshatra:    NAK[nakIdx],
      nakLord:      NAK_LORD[nakIdx],
      nakPada:      pada,
      nakEndTime,
      nextNak,
      tithi,
      paksha:       PAKSHA[paksha],
      tithiNum:     tithiNum + 1,
      tithiEndTime,
      nextTithi,
      yogam:        YOGAM[yogamIdx],
      yogamQuality,
      karanam,
      chandrashtamam,
      chandrashtamamNak,
      rahuKalam,
      emaGanda,
      kuligai,
      nallaNeram,
      nallaNeramTimes,
      gowriNeram,
      gowriNeramTimes,
      soolam:       SOOLAM[dow],
      soolamRemedy: SOOLAM_REMEDY[dow],
      sunrise:      formatHM(sunriseH),
      sunset:       formatHM(sunsetH),
      sunriseH,
      sunsetH,
      isPournami,
      isAmavasai,
      isMuhurat,
      hijri:   hijriDate,
      shaka:   shakaDate,
      dayInfo,
      rasiPalan,
    };
  }

  /* ── Quick flags for calendar cell rendering ────────────────────── */
  function getDayFlags(year, month1, day) {
    const jd     = toJD(year, month1, day, 0.5);
    const ayan   = getLahiriAyanamsa(jd);
    const sun    = norm360(getSunLon(jd)  - ayan);
    const moon   = norm360(getMoonLon(jd) - ayan);
    const tAngle = norm360(moon - sun);
    const tNum   = Math.floor(tAngle / 12);  // 0–29
    const tIdx   = tNum % 15;
    const nakIdx = Math.floor(moon / (360 / 27)) % 27;
    const dow    = new Date(year, month1 - 1, day).getDay();
    const isPournami = tNum === 14;
    const isAmavasai = tNum === 29;
    const isMuhurat  = tNum < 15 && !isPournami
      && MUHURTA_TITHI.includes(tIdx)
      && MUHURTA_NAK.includes(nakIdx)
      && MUHURTA_DOW.includes(dow);
    return { isPournami, isAmavasai, isMuhurat };
  }

  return { calculate, getDayFlags, calcSunriseSunset, TAMIL_MONTHS, VAARAM, RASI_TA };
})();
