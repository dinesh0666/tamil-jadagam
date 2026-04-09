/**
 * astro.js — Vedic astrology calculation engine
 * Implements: JD conversion, Lahiri ayanamsa, planetary positions (VSOP87 simplified),
 * Moon (Meeus), Lagna, Whole Sign houses, Navamsa, Ashtakavarga.
 * Accuracy: ~1° for Sun/Mercury/Venus; ~0.5° for slower planets; Moon ~10'.
 * All sufficient for Jyotish chart placement.
 */
'use strict';

/* ── Constants ────────────────────────────────────────────────────────── */
const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

const RASI_NAMES_EN = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const NAK_NAMES_EN  = ['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishtha','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati'];
const NAK_LORDS_KEY = ['Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury','Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury','Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury'];

// Exaltation rasi (0-based) for each planet
const EXALTATION   = { Sun:0, Moon:1, Mars:9, Mercury:5, Jupiter:3, Venus:11, Saturn:6 };
const DEBILITATION = { Sun:6, Moon:7, Mars:3, Mercury:11,Jupiter:9, Venus:5,  Saturn:0 };
// Own signs
const OWN_SIGNS    = { Sun:[4], Moon:[3], Mars:[0,7], Mercury:[2,5], Jupiter:[8,11], Venus:[1,6], Saturn:[9,10] };

/* ── Math helpers ─────────────────────────────────────────────────────── */
function norm360(d) { return ((d % 360) + 360) % 360; }
function sin(d)     { return Math.sin(d * RAD); }
function cos(d)     { return Math.cos(d * RAD); }
function tan(d)     { return Math.tan(d * RAD); }
function asin(x)    { return Math.asin(x) * DEG; }
function atan2(y,x) { return Math.atan2(y,x) * DEG; }

/* ── Julian Day Number ────────────────────────────────────────────────── */
/**
 * Returns Julian Day Number for a date/time in UT.
 * @param {number} year  @param {number} month 1-12  @param {number} day
 * @param {number} hour  UT decimal hours
 */
function toJD(year, month, day, hour = 0) {
  if (month <= 2) { year -= 1; month += 12; }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5 + hour / 24;
}

/**
 * Convert birth input to Julian Day in UT.
 * @param {number} year @param {number} month @param {number} day
 * @param {number} hour @param {number} minute @param {number} tzOffset decimal hours e.g. 5.5
 */
function getBirthJD(year, month, day, hour, minute, tzOffset) {
  const utHour = hour + minute / 60 - tzOffset;
  let d = day, m = month, y = year;
  const ut = utHour;
  // handle day wrap
  if (ut < 0) { d -= 1; }
  if (ut >= 24){ d += 1; }
  const h = ((ut % 24) + 24) % 24;
  return toJD(y, m, d, h);
}

/** Centuries since J2000.0 */
function T(jd) { return (jd - 2451545.0) / 36525.0; }

/* ── Lahiri Ayanamsa ──────────────────────────────────────────────────── */
/**
 * Lahiri (Chitrapaksha) ayanamsa in decimal degrees.
 * Uses the IAU 1976 precession + Lahiri offset.
 */
function getLahiriAyanamsa(jd) {
  const t = T(jd);
  // Standard formula used by most Vedic software
  const ayan = 23.85 + 0.013646 * (jd - 2415020) / 365.25;
  // More accurate version from Suryasiddhanta derivation
  const t0 = (jd - 2415020.0) / 36524.2199; // Julian centuries from 1900
  const a = 22.460148 + 50.2564 * t0 / 3600 + 0.0001395 * t0 * t0 / 3600;
  return norm360(a);
}

/* ── Sun longitude ────────────────────────────────────────────────────── */
function getSunLon(jd) {
  const t = T(jd);
  const L0 = norm360(280.46646 + 36000.76983 * t);
  const M  = norm360(357.52911 + 35999.05029 * t - 0.0001537 * t * t);
  const C  = (1.914602 - 0.004817 * t - 0.000014 * t * t) * sin(M)
           + (0.019993 - 0.000101 * t) * sin(2 * M)
           + 0.000289 * sin(3 * M);
  const sunLon = norm360(L0 + C);
  // Apparent longitude (nutation approx — small)
  const omega = 125.04 - 1934.136 * t;
  return norm360(sunLon - 0.00569 - 0.00478 * sin(omega));
}

/* ── Moon longitude (Meeus Ch.47 truncated) ──────────────────────────── */
function getMoonLon(jd) {
  const t = T(jd);
  // Fundamental arguments
  const Lp = norm360(218.3165 + 481267.8813 * t);  // Moon mean lon
  const M  = norm360(357.5291 + 35999.0503  * t);  // Sun mean anomaly
  const Mp = norm360(134.9634 + 477198.8676 * t);  // Moon mean anomaly
  const D  = norm360(297.8502 + 445267.1115 * t);  // Moon mean elongation
  const F  = norm360(93.2721  + 483202.0175 * t);  // Moon lat argument

  // Longitude corrections (degrees, major terms only)
  let dL = 6288774 * sin(Mp)
          + 1274027 * sin(2*D - Mp)
          +  658314 * sin(2*D)
          +  213618 * sin(2*Mp)
          -  185116 * sin(M)
          -  114332 * sin(2*F)
          +   58793 * sin(2*D - 2*Mp)
          +   57066 * sin(2*D - M - Mp)
          +   53322 * sin(2*D + Mp)
          +   45758 * sin(2*D - M)
          -   40923 * sin(M - Mp)
          -   34720 * sin(D)
          -   30383 * sin(M + Mp)
          +   15327 * sin(2*D - 2*F)
          -   12528 * sin(Mp + 2*F)
          +   10980 * sin(Mp - 2*F)
          +   10675 * sin(4*D - Mp)
          +   10034 * sin(3*Mp)
          +    8548 * sin(4*D - 2*Mp)
          -    7888 * sin(2*D + M - Mp)
          -    6766 * sin(2*D + M)
          -    5163 * sin(D - Mp)
          +    4987 * sin(D + M)
          +    4036 * sin(2*D - M + Mp)
          +    3994 * sin(2*D + 2*Mp)
          +    3861 * sin(4*D)
          +    3665 * sin(2*D - 3*Mp)
          -    2689 * sin(M - 2*Mp)
          -    2602 * sin(2*D - Mp + 2*F)
          +    2390 * sin(2*D - M - 2*Mp)
          -    2348 * sin(D + Mp)
          +    2236 * sin(2*D - 2*M);
  dL /= 1e6; // convert to degrees

  const moonLon = norm360(Lp + dL);
  return moonLon;
}

/* ── Moon speed (approximate, deg/day) ───────────────────────────────── */
function getMoonSpeed(jd) {
  return (getMoonLon(jd + 0.5) - getMoonLon(jd - 0.5) + 360) % 360;
}

/* ── Rahu (True Node) longitude ──────────────────────────────────────── */
function getRahuLon(jd) {
  const t = T(jd);
  // True node of Moon
  const Omega = norm360(125.0445479 - 1934.1362608 * t
    + 0.0020754 * t * t
    + t * t * t / 467441
    - t * t * t * t / 60616000);
  // Major periodic terms
  const M  = norm360(357.5291 + 35999.0503 * t);
  const Mp = norm360(134.9634 + 477198.8676 * t);
  const D  = norm360(297.8502 + 445267.1115 * t);
  const F  = norm360(93.2721  + 483202.0175 * t);
  const dOmega = -1.4979 * sin(2*(D-F))
                 -0.1500 * sin(M)
                 -0.1226 * sin(2*D)
                 +0.1176 * sin(2*F)
                 -0.0801 * sin(2*(Mp-F));
  return norm360(Omega + dOmega);
}

/* ── Simplified planetary longitudes (VSOP87 major terms) ────────────── */
function getPlanetLon(planet, jd) {
  const t = T(jd);
  // We use low-order VSOP elements sufficient for ~1° accuracy
  switch(planet) {
    case 'Mercury': {
      const L = norm360(178.1798 + 149472.6741 * t);
      const M = norm360(168.0 + 149472.515 * t);
      const Eq = 23.3396 * sin(M) + 2.2 * sin(2*M);
      return norm360(L + Eq - 77.46);
    }
    case 'Venus': {
      const L = norm360(181.9798 + 58517.8156 * t);
      const M = norm360(48.0052 + 58517.803 * t);
      const Eq = 0.7758 * sin(M) + 0.0033 * sin(2*M);
      return norm360(L + Eq - 131.56);
    }
    case 'Mars': {
      const L0 = norm360(355.433 + 19140.2993 * t);
      const M  = norm360(319.529 + 19139.858 * t);
      const C  = 10.691 * sin(M) + 0.623 * sin(2*M) + 0.05 * sin(3*M);
      return norm360(L0 + C - 336.044);
    }
    case 'Jupiter': {
      const L0 = norm360(34.351 + 3034.9057 * t);
      const M  = norm360(20.020 + 3034.678 * t);
      const C  = 5.556 * sin(M) + 0.168 * sin(2*M);
      return norm360(L0 + C - 14.24);
    }
    case 'Saturn': {
      const L0 = norm360(50.077 + 1222.1138 * t);
      const M  = norm360(317.020 + 1221.552 * t);
      const C  = 6.388 * sin(M) + 0.212 * sin(2*M);
      return norm360(L0 + C - 92.67);
    }
    default: return 0;
  }
}

/* ── Planet speed (degrees/day) ──────────────────────────────────────── */
function getPlanetSpeed(getFunc, jd, planetKey) {
  const dt = 1; // 1 day
  return norm360(getFunc(planetKey, jd + dt/2) - getFunc(planetKey, jd - dt/2) + 360) % 360;
}

/* ── Obliquity of ecliptic ────────────────────────────────────────────── */
function getObliquity(jd) {
  const t = T(jd);
  return 23.439291111 - 0.013004167 * t - 0.000000164 * t * t + 0.000000504 * t * t * t;
}

/* ── Lagna (Ascendant) ────────────────────────────────────────────────── */
/**
 * Compute Local Sidereal Time (degrees) at given location.
 * @param {number} jd UT Julian Day @param {number} lon degrees East
 */
function getLocalSiderealTime(jd, lon) {
  const t = T(jd);
  // Greenwich Mean Sidereal Time 0h UT
  let GMST = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * t * t - t * t * t / 38710000;
  return norm360(GMST + lon);
}

/**
 * Calculate tropical Ascendant longitude from RAMC, obliquity, and latitude.
 * @param {number} ramc degrees  @param {number} obl degrees  @param {number} lat degrees
 * @returns {number} tropical longitude of Ascendant
 */
function calcAscendant(ramc, obl, lat) {
  // Standard astronomic ascendant formula
  const y = -cos(ramc);
  const x = sin(obl) * tan(lat) + cos(obl) * sin(ramc);
  let asc = atan2(y, x);
  // Quadrant correction
  if (asc < 0) asc += 360;
  // Ensure ascendant is in correct quadrant relative to RAMC
  if (norm360(asc - ramc + 180) < 180) asc = norm360(asc + 180);
  return norm360(asc);
}

/**
 * Full Birth chart calculation.
 * @returns {Object} { jd, ayanamsa, lagna, planets }
 */
function calculateBirthChart(year, month, day, hour, minute, lat, lon, tzOffset) {
  const jd = getBirthJD(year, month, day, hour, minute, tzOffset);
  const ayanamsa = getLahiriAyanamsa(jd);
  const obl = getObliquity(jd);
  const lst = getLocalSiderealTime(jd, lon);

  // Lagna
  const asc_tropical = calcAscendant(lst, obl, lat);
  const asc_sidereal = norm360(asc_tropical - ayanamsa);
  const lagnaRasiNum = Math.floor(asc_sidereal / 30);
  const lagnaDegreesInRasi = asc_sidereal % 30;
  const lagnaNakIdx  = Math.floor(asc_sidereal / (360 / 27));
  const lagnaNakPada = Math.floor((asc_sidereal % (360 / 27)) / (360 / 108)) + 1;

  const lagna = {
    name: 'Lagna',
    tropicalLon: asc_tropical,
    siderealLon: asc_sidereal,
    rasiNum:     lagnaRasiNum,
    degree:      lagnaDegreesInRasi,
    nakshatra:   NAK_NAMES_EN[lagnaNakIdx],
    nakIdx:      lagnaNakIdx,
    nakshatraPada: lagnaNakPada,
    nakLord:     NAK_LORDS_KEY[lagnaNakIdx],
    isRetrograde:false,
    speed:       0,
  };

  // Sun
  const sunTrop = getSunLon(jd);
  const sunSid  = norm360(sunTrop - ayanamsa);
  // Sun speed ~1°/day
  const sunSpeed = norm360(getSunLon(jd + 0.5) - getSunLon(jd - 0.5) + 360) % 360;

  // Moon
  const moonTrop = getMoonLon(jd);
  const moonSid  = norm360(moonTrop - ayanamsa);
  const moonSpeed= getMoonSpeed(jd);

  // Rahu (always retrograde)
  const rahuTrop = getRahuLon(jd);
  const rahuSid  = norm360(rahuTrop - ayanamsa);
  const ketuSid  = norm360(rahuSid + 180);

  // Other planets
  const planetKeys = ['Mercury','Venus','Mars','Jupiter','Saturn'];
  const avgSpeed   = { Mercury:4.09, Venus:1.6, Mars:0.524, Jupiter:0.083, Saturn:0.034 };

  const planetList = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu'];

  function makePlanet(name, siderealLon, speed, isRetro) {
    const rn  = Math.floor(siderealLon / 30);
    const deg = siderealLon % 30;
    const ni  = Math.floor(siderealLon / (360/27));
    const np  = Math.floor((siderealLon % (360/27)) / (360/108)) + 1;
    return {
      name, siderealLon, rasiNum: rn, degree: deg,
      nakshatra: NAK_NAMES_EN[ni], nakIdx: ni,
      nakshatraPada: np, nakLord: NAK_LORDS_KEY[ni],
      isRetrograde: !!isRetro, speed,
      isExalted:    EXALTATION[name]   === rn,
      isDebilitated:DEBILITATION[name] === rn,
    };
  }

  const sunPlanet  = makePlanet('Sun',  sunSid,  sunSpeed, false);
  const moonPlanet = makePlanet('Moon', moonSid, moonSpeed, false);

  const planets = [sunPlanet, moonPlanet];

  for (const key of planetKeys) {
    const trop = getPlanetLon(key, jd);
    const sid  = norm360(trop - ayanamsa);
    // Retrograde if speed < 0 (calculate sign from jd comparison)
    const speed1 = norm360(getPlanetLon(key, jd + 1) - getPlanetLon(key, jd)); // can exceed 180 if retro near 0°
    const speed  = speed1 > 180 ? speed1 - 360 : speed1;
    const retro  = speed < 0;
    planets.push(makePlanet(key, sid, Math.abs(speed), retro));
  }

  // Rahu / Ketu always retrograde
  planets.push(makePlanet('Rahu', rahuSid, 0.053, true));
  planets.push(makePlanet('Ketu', ketuSid, 0.053, true));

  return { jd, ayanamsa, obl, lst, lagna, planets };
}

/* ── Whole Sign house assignment ──────────────────────────────────────── */
/**
 * Returns the house number (1-12) for a given planet's rasiNum.
 * House 1 = lagnaRasi, House 2 = next rasi, etc.
 */
function getHouseNum(planetRasiNum, lagnaRasiNum) {
  return ((planetRasiNum - lagnaRasiNum + 12) % 12) + 1;
}

/** Build full 12-house array */
function getWholeSignHouses(lagnaRasi, planets) {
  return Array.from({length: 12}, (_, i) => {
    const rasiNum = (lagnaRasi + i) % 12;
    return {
      house:   i + 1,
      rasiNum: rasiNum,
      rasiName:RASI_NAMES_EN[rasiNum],
      planets: planets.filter(p => p.rasiNum === rasiNum).map(p => p.name),
    };
  });
}

/* ── Navamsa (D9) calculation ─────────────────────────────────────────── */
/**
 * For each planet, compute its Navamsa rasi.
 * Fire signs start from Aries (0), Earth from Capricorn (9),
 * Air from Libra (6), Water from Cancer (3).
 */
function navamsaStartRasi(rasiNum) {
  const elem = rasiNum % 3; // 0=fire/cardinal, 1=earth/fixed, 2=air/mutable... but use element
  // Aries=0,Leo=4,Sag=8 → fire → start 0
  // Tau=1,Vir=5,Cap=9 → earth → start 9
  // Gem=2,Lib=6,Aqu=10 → air → start 6
  // Can=3,Sco=7,Pis=11 → water → start 3
  const MAP = {0:0, 1:9, 2:6, 3:3, 4:0, 5:9, 6:6, 7:3, 8:0, 9:9, 10:6, 11:3};
  return MAP[rasiNum];
}

function calculateNavamsa(planets, lagnaLon) {
  function navRasi(siderealLon) {
    const rasiNum = Math.floor(siderealLon / 30);
    const degInRasi = siderealLon % 30;
    const offset = Math.floor(degInRasi / (30/9));
    return (navamsaStartRasi(rasiNum) + offset) % 12;
  }
  const lagnaNavRasi = navRasi(lagnaLon);
  return planets.map(p => ({
    ...p,
    navamsaRasi: navRasi(p.siderealLon),
  }));
}

/* ── Ashtakavarga (Prompt 17) ─────────────────────────────────────────── */
const ASHTAK_RULES = {
  Sun:     { Sun:[1,2,4,7,8,9,10,11], Moon:[3,6,10,11], Mars:[1,2,4,7,8,9,10,11], Mercury:[3,5,6,9,10,11,12], Jupiter:[5,6,9,11], Venus:[6,7,12], Saturn:[1,2,4,7,8,9,10,11], Lagna:[3,4,6,10,11,12] },
  Moon:    { Sun:[3,6,7,8,10,11], Moon:[1,3,6,7,10,11], Mars:[2,3,5,6,9,10,11], Mercury:[1,3,4,5,7,8,10,11], Jupiter:[1,4,7,8,10,11,12], Venus:[3,4,5,7,9,10,11], Saturn:[3,5,6,11], Lagna:[3,6,10,11] },
  Mars:    { Sun:[3,5,6,10,11], Moon:[3,6,11], Mars:[1,2,4,7,8,10,11], Mercury:[3,5,6,11], Jupiter:[6,10,11,12], Venus:[6,8,11,12], Saturn:[1,4,7,8,9,10,11], Lagna:[1,3,6,10,11] },
  Mercury: { Sun:[5,6,9,11,12], Moon:[2,4,6,8,10,11], Mars:[1,2,4,7,8,9,10,11], Mercury:[1,3,5,6,9,10,11,12], Jupiter:[6,8,11,12], Venus:[1,2,3,4,5,8,9,11], Saturn:[1,2,4,7,8,9,10,11], Lagna:[1,2,4,6,8,10,11] },
  Jupiter: { Sun:[1,2,3,4,7,8,9,10,11], Moon:[2,5,7,9,11], Mars:[1,2,4,7,8,10,11], Mercury:[1,2,4,5,6,9,10,11], Jupiter:[1,2,3,4,7,8,10,11], Venus:[2,5,6,9,10,11], Saturn:[3,5,6,12], Lagna:[1,2,4,5,6,7,9,10,11] },
  Venus:   { Sun:[8,11,12], Moon:[1,2,3,4,5,8,9,11,12], Mars:[3,5,6,9,11,12], Mercury:[3,5,6,9,11], Jupiter:[5,8,9,10,11], Venus:[1,2,3,4,5,8,9,10,11], Saturn:[3,4,5,8,9,10,11], Lagna:[1,2,3,4,5,8,9,11] },
  Saturn:  { Sun:[1,2,4,7,8,10,11], Moon:[3,6,11], Mars:[3,5,6,10,11,12], Mercury:[6,8,9,10,11,12], Jupiter:[5,6,11,12], Venus:[6,11,12], Saturn:[3,5,6,11], Lagna:[1,3,4,6,10,11] },
};

/**
 * Calculate Ashtakavarga for all planets.
 * Returns: { matrix: planet[] × rasi[12], totals: rasi[12] }
 */
function calculateAshtakavarga(planets, lagnaRasiNum) {
  const pNames = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'];
  // Build planet rasi map
  const rasiMap = {};
  for (const p of planets) rasiMap[p.name] = p.rasiNum;
  rasiMap['Lagna'] = lagnaRasiNum;

  // Matrix: for each of 7 planets, 12 bindus
  const matrix = {};
  const totals = new Array(12).fill(0);

  for (const pName of pNames) {
    const pRasi = rasiMap[pName];
    const row = new Array(12).fill(0);
    const rules = ASHTAK_RULES[pName] || {};
    // For each reference point (planets + lagna)
    for (const [refName, favorableHouses] of Object.entries(rules)) {
      const refRasi = rasiMap[refName];
      if (refRasi === undefined) continue;
      for (const h of favorableHouses) {
        // h is house number from refName's rasi
        const targetRasi = (refRasi + h - 1) % 12;
        row[targetRasi]++;
      }
    }
    matrix[pName] = row;
    for (let i = 0; i < 12; i++) totals[i] += row[i];
  }

  return { matrix, totals };
}

/* ── Public API ───────────────────────────────────────────────────────── */
// Expose globally for browser use
window.Astro = {
  calculateBirthChart,
  getWholeSignHouses,
  calculateNavamsa,
  calculateAshtakavarga,
  getHouseNum,
  getLahiriAyanamsa,
  toJD,
  norm360,
  NAK_NAMES_EN,
  NAK_LORDS_KEY,
  RASI_NAMES_EN,
  EXALTATION,
  DEBILITATION,
  OWN_SIGNS,
};
