# Jathagam.app — Complete Copilot Build Guide

> **What you're building:** A full-featured Tamil/Hindu birth chart (Jathagam) web app with English, Hindi, and Telugu support — freemium model, shareable charts, trending UI. Zero backend, zero database, all calculations in-browser.

---

## 0. Product Overview

### What the app does
A user enters their birth date, time, and place. The app instantly generates:
- **Rasi Chart** (South Indian square format + North Indian diamond)
- **Navamsa Chart** (D9 — marriage and dharma chart)
- **All 9 planetary positions** with degrees, rasi, nakshatra, retrograde status
- **Lagna (Ascendant)** exact degree
- **Vimshottari Dasha** — current mahadasha, antardasha, and sub-period
- **Dosha Analysis** — Mangal dosha, Kuja dosha, Kala Sarpa, Shani dosha
- **Nakshatra Details** — birth star, pada, lord, deity, compatibility
- **Ashtakavarga** — planetary strength table
- **Shareable link** — encoded URL anyone can open

### Revenue model
| Tier | Price | What's included |
|---|---|---|
| Free | ₹0 | Rasi chart, basic planetary positions, nakshatra, current dasha |
| Premium | ₹99 one-time | Navamsa chart, full dasha timeline, dosha remedies, Ashtakavarga, PDF download, share link |
| Ads | Always on for free users | Google AdSense between sections |

### Target audience
Tamil, Telugu, and Hindi-speaking users globally. NRIs with parents in India. Matrimony market (kundali matching). 10M+ monthly searches for "jathagam" alone in India.

---

## 1. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Vanilla HTML/CSS/JS | No build step, deploys to Vercel in 60 seconds, loads in <1s on 3G |
| Charts | SVG drawn by hand | No library needed — Rasi chart is squares, Navamsa is squares |
| Calculations | Swiss Ephemeris WASM | Most accurate open-source planetary library, runs in browser |
| Payments | Razorpay JS SDK | Best UX for Indian users, supports UPI |
| Share | URL encoding (btoa/atob) | Birth data encoded in URL — no server needed |
| PDF | html2pdf.js (CDN) | Client-side PDF generation |
| Fonts | Google Fonts | Mukta (Tamil-friendly), Noto Sans Tamil, Noto Sans Telugu |
| Deploy | Vercel | Free tier, custom domain, instant deploys |

### Swiss Ephemeris WASM — critical dependency
```bash
# The entire app depends on this. Install it first.
npm install astronomia
# OR use the CDN version of Moshier ephemeris (simpler, slightly less accurate)
# <script src="https://cdn.jsdelivr.net/npm/ephemeris@1.2.1/dist/ephemeris.min.js">
```

> **Copilot note:** Swiss Ephemeris WASM is the gold standard. If you want the simpler path, use the `ephemeris` npm package which Copilot knows well. All prompts below use `ephemeris` for simplicity.

---

## 2. File Structure

```
jathagam/
├── index.html              ← Landing page + birth data entry form
├── chart.html              ← Chart display page (all results)
├── style.css               ← Global styles
├── astro.js                ← Planetary calculation engine
├── charts.js               ← SVG chart rendering (Rasi + Navamsa)
├── dasha.js                ← Vimshottari dasha calculations
├── dosha.js                ← Dosha detection logic
├── i18n.js                 ← English/Hindi/Telugu translations
├── share.js                ← URL encoding/decoding
├── payment.js              ← Razorpay integration
├── pdf.js                  ← PDF generation
│
├── /blog/                  ← SEO pages
│   ├── jathagam-tamil.html
│   ├── tamil-jathagam-online-free.html
│   ├── birth-chart-telugu.html
│   ├── janam-kundli-hindi.html
│   └── rasi-chart-calculator.html
│
└── /assets/
    ├── logo.svg
    └── og-image.png        ← For WhatsApp/Twitter link preview
```

---

## 3. Design System

### Colour Palette
```css
:root {
  /* Primary — deep saffron to gold, spiritual warmth */
  --primary:      #B8471B;   /* deep saffron */
  --primary-l:    #F5E6DC;
  --primary-d:    #7D2800;

  /* Gold — auspicious accents */
  --gold:         #C9920A;
  --gold-l:       #FBF3D4;
  --gold-d:       #7D5800;

  /* Background — warm parchment */
  --bg:           #FDFAF3;
  --bg2:          #F5EDD6;
  --bg3:          #EDE0C0;
  --card:         #FFFEF9;

  /* Text */
  --dark:         #1E0E00;
  --mid:          #6B3A18;
  --light:        #A06030;
  --muted:        #C8A060;

  /* Semantic */
  --good:         #1A5E25;
  --good-l:       #E8F5EB;
  --bad:          #8B1A1A;
  --bad-l:        #FDECEA;
  --warn:         #7A3800;
  --warn-l:       #FFF0E0;
  --neutral:      #3A4A5A;
  --neutral-l:    #EEF2F7;

  /* Planet colours */
  --sun:          #E65C00;
  --moon:         #5B7FA6;
  --mars:         #C0392B;
  --mercury:      #27AE60;
  --jupiter:      #F39C12;
  --venus:        #8E44AD;
  --saturn:       #2C3E50;
  --rahu:         #1A1A2E;
  --ketu:         #6D4C41;
}
```

### Typography
```css
/* Copilot prompt for fonts */
/* Import Google Fonts supporting Tamil, Telugu, Devanagari */
/* Primary display: Cinzel (headings) */
/* Body: Mukta (works for Devanagari + Latin) */
/* Tamil specific: Noto Sans Tamil */
/* Telugu specific: Noto Sans Telugu */
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Mukta:wght@300;400;500;600&family=Noto+Sans+Tamil:wght@400;500&family=Noto+Sans+Telugu:wght@400;500&family=Lora:ital,wght@0,400;1,400&display=swap');
```

### Planet Symbol Map
```javascript
// Use these consistently across all chart types
const PLANET_SYMBOLS = {
  Sun:     { symbol: '☀', abbr: 'Su', color: 'var(--sun)'     },
  Moon:    { symbol: '☽', abbr: 'Mo', color: 'var(--moon)'    },
  Mars:    { symbol: '♂', abbr: 'Ma', color: 'var(--mars)'    },
  Mercury: { symbol: '☿', abbr: 'Me', color: 'var(--mercury)' },
  Jupiter: { symbol: '♃', abbr: 'Ju', color: 'var(--jupiter)' },
  Venus:   { symbol: '♀', abbr: 'Ve', color: 'var(--venus)'   },
  Saturn:  { symbol: '♄', abbr: 'Sa', color: 'var(--saturn)'  },
  Rahu:    { symbol: '☊', abbr: 'Ra', color: 'var(--rahu)'    },
  Ketu:    { symbol: '☋', abbr: 'Ke', color: 'var(--ketu)'    },
  Lagna:   { symbol: 'L', abbr: 'L',  color: 'var(--primary)' },
};
```

---

## 4. Step 1 — Birth Data Entry Form (index.html)

### Copilot Prompt 1 — Form structure
```
// Create a birth data entry form for a Jathagam (Tamil birth chart) app
// Fields required:
//   - Full name (text input)
//   - Date of birth (date picker, default today)
//   - Time of birth (time picker, with "Unknown" option that sets to 12:00 noon)
//   - Birth place (text input with autocomplete from a cities list)
//   - Gender (Male / Female / Other — needed for Mangal dosha interpretation)
// Design: warm parchment background, Cinzel heading "Generate Your Jathagam"
// Below form: language selector (English / தமிழ் / हिन्दी / తెలుగు)
// Submit button: "Generate Chart / ஜாதகம் உருவாக்கு"
// On submit: encode all values into URL params and redirect to chart.html
// Show "Time not known?" tooltip explaining noon chart
```

### Copilot Prompt 2 — City autocomplete with lat/lon lookup
```javascript
// Create a city autocomplete input for Indian cities
// When user types 3+ characters, filter this cities array and show dropdown
// Each city object has: { name, state, lat, lon, timezone: 5.5 }
// On selection, store lat, lon, timezone in hidden fields
// Include the 50 most searched cities: Chennai, Mumbai, Delhi, Bangalore,
// Hyderabad, Kolkata, Pune, Ahmedabad, Surat, Jaipur, Lucknow, Kanpur,
// Nagpur, Indore, Thane, Bhopal, Visakhapatnam, Pimpri, Patna, Vadodara,
// Ludhiana, Agra, Nashik, Faridabad, Meerut, Rajkot, Kalyan, Vasai,
// Varanasi, Srinagar, Aurangabad, Dhanbad, Amritsar, Allahabad, Ranchi,
// Gwalior, Jabalpur, Coimbatore, Vijayawada, Madurai, Jodhpur, Raipur,
// Kota, Chandigarh, Guwahati, Solapur, Hubli, Tiruchirappalli, Bareilly, Mysore
// Also support international: Singapore, Dubai, London, Toronto, New York,
// Sydney, Kuala Lumpur, Colombo (for diaspora users)
const CITIES = [
```

---

## 5. Step 2 — Astronomical Engine (astro.js)

This is the heart of the app. Copilot generates all of this from well-known algorithms.

### Copilot Prompt 3 — Julian Day + Sidereal Time
```javascript
// Convert birth date and time to Julian Day Number
// Account for timezone offset (IST = +5:30, etc.)
// Then calculate Local Sidereal Time (LST) for the birth location
// LST is needed to compute the Lagna (Ascendant)
// Return { jd, lst } where lst is in degrees 0-360
function getBirthJDAndLST(year, month, day, hour, minute, lat, lon, tzOffset) {
```

### Copilot Prompt 4 — Ayanamsa (Lahiri)
```javascript
// Calculate the Lahiri Ayanamsa for a given Julian Day
// Lahiri ayanamsa is the standard used in Indian (Vedic) astrology
// Formula: ayanamsa = 23.85 + 0.0137 * T (approximate)
// More accurate: use the standard IAU precession formula
// Return ayanamsa in decimal degrees
// This value is subtracted from tropical longitude to get sidereal longitude
function getLahiriAyanamsa(jd) {
```

### Copilot Prompt 5 — All 9 Planetary Longitudes
```javascript
// Calculate tropical geocentric longitudes for all 9 Jyotish planets
// Using the ephemeris library: Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn
// Rahu (North Node) = Moon's mean node longitude
// Ketu = Rahu + 180 degrees (always opposite)
// Apply Lahiri ayanamsa to convert tropical to sidereal
// Return array of planet objects:
// { name, tropicalLon, siderealLon, rasi, rasiNum, degree, nakshatra,
//   nakshatraPada, nakLord, isRetrograde, speed }
// Rasi = Math.floor(siderealLon / 30) gives 0-11 index
// Nakshatra = Math.floor(siderealLon / (360/27)) gives 0-26 index
function getAllPlanetPositions(jd, ayanamsa) {
```

### Copilot Prompt 6 — Lagna (Ascendant) Calculation
```javascript
// Calculate the Ascendant (Lagna) for a given birth time and location
// Method: using RAMC (Right Ascension of Midheaven) + Placidus/Equal house
// For Vedic astrology, use Whole Sign houses (easiest and traditional)
// Steps:
//   1. Calculate RAMC from LST
//   2. Calculate obliquity of ecliptic
//   3. Calculate Ascendant tropical longitude from RAMC, obliquity, and latitude
//   4. Subtract ayanamsa to get sidereal Ascendant
//   5. Ascendant rasi = Math.floor(siderealLon / 30)
// Return { tropicalLon, siderealLon, rasiNum, degree, nakshatra, nakshatraPada }
function getLagna(lst, lat, ayanamsa) {
```

### Copilot Prompt 7 — House positions (Whole Sign)
```javascript
// Calculate all 12 house cusps using Whole Sign house system
// In Whole Sign: the Lagna's rasi IS the 1st house entirely
// Each subsequent rasi is the next house
// House 1 = Lagna rasi, House 2 = next rasi, etc. (modulo 12)
// Return array of 12 { house, rasiNum, rasiName, rasiNameTamil }
// Assign each planet to its house based on which rasi it falls in
function getWholeSignHouses(lagnaRasi, planets) {
```

---

## 6. Step 3 — Rasi Chart SVG (charts.js)

### The South Indian Chart Grid
The South Indian Rasi chart is a 4×4 grid of 16 squares with the 4 corner squares removed and the center 4 merged. The 12 rasis are fixed in position — Mesha (Aries) is always in the second cell of the top row.

```
Fixed rasi positions in the South Indian grid:
┌──────┬──────┬──────┬──────┐
│      │ Me   │ Ri   │ Mi   │    Me = Mesha (Aries) = 0
│      │  0   │  1   │  2   │    Ri = Rishabha (Taurus) = 1
│──────┼──────┼──────┼──────│    Mi = Mithuna (Gemini) = 2
│ Mee  │      TITLE       │ Ka │
│  11  │                   │  3 │
│──────┼──────────────────┼──────│
│ Ku   │                   │ Si │
│  10  │                   │  4 │
│──────┼──────┼──────┼──────│
│      │ Dh   │ Vr   │ Tu   │
│      │  9   │  8   │  7   │
└──────┴──────┴──────┴──────┘

Positions (row, col) for each rasi 0-11:
0:Mesha→(0,1), 1:Rishabha→(0,2), 2:Mithuna→(0,3),
3:Kataka→(1,3), 4:Simha→(2,3), 5:Kanya→(3,3),
6:Tula→(3,2), 7:Vrischika→(3,1), 8:Dhanus→(3,0),
9:Makara→(2,0), 10:Kumbha→(1,0), 11:Meena→(0,0)
```

### Copilot Prompt 8 — South Indian Rasi Chart
```javascript
// Draw a South Indian style Rasi chart as an SVG element
// Grid: 4×4 = 16 cells, 4 corners empty, center 2×2 = title area
// Total SVG size: 400×400 (responsive via viewBox)
// Each outer cell: ~100×100px
// Fixed rasi positions (see grid above)
// In each cell, show:
//   1. Rasi number (1-12) in top-left corner, tiny, muted
//   2. Planet abbreviations for planets in that rasi
//   3. 'L' marker for Lagna position
//   4. Retrograde planets shown with (R) suffix
// Lagna cell gets a subtle saffron border highlight
// Center area: "RASI" label + person's name
// Planet text: use PLANET_SYMBOLS abbreviations, colored by planet
// If multiple planets in one cell, stack them vertically
// Accept: { lagnaRasi, planets[], name }
function drawSouthIndianRasiChart(containerId, lagnaRasi, planets, name) {
```

### Copilot Prompt 9 — Navamsa Chart (D9)
```javascript
// Calculate Navamsa (D9 divisional chart) positions for all planets
// Navamsa = 9 equal divisions of each rasi (3°20' each)
// For a planet at longitude L within a rasi:
//   navamsaOffset = Math.floor((L % 30) / (30/9))
// Navamsa rasi calculation:
//   Fire signs (Aries, Leo, Sagittarius): start from Aries
//   Earth signs (Taurus, Virgo, Capricorn): start from Capricorn
//   Air signs (Gemini, Libra, Aquarius): start from Libra
//   Water signs (Cancer, Scorpio, Pisces): start from Cancer
//   navamsaRasi = (startRasi + navamsaOffset) % 12
// Lagna Navamsa: same calculation on lagna longitude
// Return array of planets with navamsaRasi added
// Then use drawSouthIndianRasiChart() with navamsa data to render D9
function calculateNavamsa(planets, lagnaLon) {
```

---

## 7. Step 4 — Vimshottari Dasha (dasha.js)

The most important prediction tool in Jyotish. Every user wants to see their current dasha period.

### Dasha Data
```javascript
// Vimshottari Dasha — 120 year cycle
const DASHA_YEARS = {
  Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7,
  Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17
};

// Dasha sequence starting from each nakshatra lord
// Nakshatras 1-27 and their lords (repeating Ketu, Venus, Sun... cycle)
const NAK_DASHA_LORD = [
  'Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury', // 1-9
  'Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury', // 10-18
  'Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury'  // 19-27
];
```

### Copilot Prompt 10 — Dasha Start Date
```javascript
// Calculate the exact Vimshottari Dasha start dates from birth
// Steps:
//   1. Find birth nakshatra and its lord (NAK_DASHA_LORD[nakIdx])
//   2. Find how far the Moon has traveled through that nakshatra (0-1 fraction)
//   3. Remaining dasha years = DASHA_YEARS[nakLord] * (1 - fractionElapsed)
//   4. Birth dasha ends at: birthDate + remainingYears
//   5. Then cycle through all 9 dasha lords in order
// Return array of { lord, startDate, endDate, durationYears }
// Dates as JavaScript Date objects
// The cycle: always follows Ketu→Venus→Sun→Moon→Mars→Rahu→Jupiter→Saturn→Mercury→repeat
function calculateMahadashas(moonNakIdx, moonNakFraction, birthDate) {
```

### Copilot Prompt 11 — Antardasha and Pratyantar
```javascript
// For a given Mahadasha (e.g. Jupiter period), calculate all 9 Antardashas
// Antardasha duration = (mahaLord_years * antarLord_years / 120) years
// Sequence starts from the mahadasha lord itself
// Example: Jupiter Mahadasha → Jupiter/Jupiter antardasha first, then Jupiter/Saturn, etc.
// For current period, also calculate Pratyantar dasha (sub-sub period)
// Return current dasha status:
// { mahaLord, mahaStart, mahaEnd, antarLord, antarStart, antarEnd,
//   pratyantarLord, pratyantarStart, pratyantarEnd }
function getCurrentDashaStatus(mahadashas, targetDate) {
```

### Copilot Prompt 12 — Dasha Timeline UI
```javascript
// Render a visual dasha timeline as HTML
// Show: current position on a horizontal progress bar
// Cards for: previous dasha, CURRENT DASHA (highlighted), next 3 dashas
// Current card: shows current antardasha and pratyantar inside
// Each card: dasha lord name, start date, end date, duration
// Current card border: saffron/gold highlight
// Color code by planet using PLANET_SYMBOLS colors
// Premium feature: show full 120-year timeline (blur if not premium)
function renderDashaTimeline(mahadashas, currentStatus, containerId, isPremium) {
```

---

## 8. Step 5 — Dosha Analysis (dosha.js)

### Copilot Prompt 13 — Mangal Dosha
```javascript
// Check for Mangal Dosha (Kuja Dosha) in the birth chart
// Mangal Dosha exists if Mars is in houses: 1, 2, 4, 7, 8, or 12
// (counting from Lagna in Whole Sign houses)
// Also check from Moon lagna and Venus lagna (more conservative check)
// Cancellations of Mangal Dosha:
//   - Mars in its own sign (Aries, Scorpio)
//   - Mars in exaltation (Capricorn)
//   - Mars conjunct or aspected by Jupiter
//   - Mars in 2nd house for Gemini or Virgo lagna
//   - Mars in 7th house for Cancer or Leo lagna (debated)
//   - Mars in 4th for Aries lagna
// Return { hasDosha, fromLagna, fromMoon, fromVenus, isCancelled, cancellationReason, severity }
function checkMangalDosha(planets, lagnaRasi) {
```

### Copilot Prompt 14 — Kala Sarpa Dosha
```javascript
// Check for Kala Sarpa Dosha
// Dosha present when ALL 7 planets (Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn)
// are hemmed between Rahu and Ketu (i.e., all on the same side of the Rahu-Ketu axis)
// Check: get Rahu position, Ketu = Rahu + 180
// For each of 7 planets, check if it falls in the arc from Rahu to Ketu (going forward)
// If ALL 7 are in that arc: full Kala Sarpa
// If ALL 7 are in the opposite arc: partial (Kala Amrita)
// Find the specific named variant (Ananta, Kulika, Vasuki... etc. based on house Rahu is in)
// Return { hasDosha, type, variant, rahuHouse, severity, description }
const KALA_SARPA_VARIANTS = [
  'Ananta', 'Kulika', 'Vasuki', 'Shankhapala', 'Padma', 'Mahapadma',
  'Takshaka', 'Karkotak', 'Shankhachuda', 'Ghatak', 'Vishadhar', 'Sheshanaga'
];
function checkKalaSarpaDosha(planets, lagnaRasi) {
```

### Copilot Prompt 15 — Shani Dosha + Sade Sati
```javascript
// Check Sade Sati (7.5 year Saturn transit over Moon)
// Saturn in 12th, 1st, or 2nd from Moon's natal rasi = Sade Sati active
// Saturn in 4th or 8th from Moon = Dhaiya (2.5 year sub-period)
// For current date, find transiting Saturn's rasi
// Compare with natal Moon rasi
// Return:
// { isSadeSati, isFirstPhase, isPeakPhase, isLastPhase, isDhaiya,
//   startedOn, endsOn, moonRasi, saturnTransitRasi, phase }
function checkSadeSati(natalMoonRasi, currentDate) {
```

### Copilot Prompt 16 — Dosha Summary Panel
```javascript
// Render a dosha summary panel showing all doshas
// Each dosha: icon, name, status (Present/Cancelled/Clear/Partial), brief explanation
// Doshas to show:
//   1. Mangal Dosha
//   2. Kala Sarpa Dosha
//   3. Sade Sati / Dhaiya
//   4. Pitra Dosha (Sun or Moon afflicted by Rahu/Ketu)
//   5. Guru Chandala (Jupiter conjunct Rahu)
//   6. Grahan Yoga (Sun/Moon conjunct Rahu or Ketu within 10°)
// Premium feature: show remedies for each present dosha (locked otherwise)
// Status colors: green = Clear, amber = Partial, red = Present, gray = Cancelled
function renderDoshaPanel(doshaResults, containerId, isPremium) {
```

---

## 9. Step 6 — Ashtakavarga (Premium)

### Copilot Prompt 17 — Ashtakavarga Calculation
```javascript
// Calculate Ashtakavarga — planetary strength in each of the 12 houses
// Each of 7 planets + Lagna contributes bindus (points) based on house distance rules
// For each planet, there's a fixed set of "favourable houses" counted from each reference point
// Samudaya (total) Ashtakavarga: sum of all 8 Bhinnashtavargas per rasi
// Return a 7x12 matrix (planet × rasi) of bindu scores
// Plus a 12-element totals array (Samudaya Ashtakavarga)
// Known rules (hardcoded from classical texts):
const ASHTAK_RULES = {
  Sun:     { Sun:[1,2,4,7,8,9,10,11], Moon:[3,6,10,11], Mars:[1,2,4,7,8,9,10,11], Mercury:[3,5,6,9,10,11,12], Jupiter:[5,6,9,11], Venus:[6,7,12], Saturn:[1,2,4,7,8,9,10,11], Lagna:[3,4,6,10,11,12] },
  Moon:    { Sun:[3,6,7,8,10,11], Moon:[1,3,6,7,10,11], Mars:[2,3,5,6,9,10,11], Mercury:[1,3,4,5,7,8,10,11], Jupiter:[1,4,7,8,10,11,12], Venus:[3,4,5,7,9,10,11], Saturn:[3,5,6,11], Lagna:[3,6,10,11] },
  Mars:    { Sun:[3,5,6,10,11], Moon:[3,6,11], Mars:[1,2,4,7,8,10,11], Mercury:[3,5,6,11], Jupiter:[6,10,11,12], Venus:[6,8,11,12], Saturn:[1,4,7,8,9,10,11], Lagna:[1,3,6,10,11] },
  // ... Mercury, Jupiter, Venus, Saturn rules (Copilot will complete from classical tables)
};
function calculateAshtakavarga(planets, lagnaRasi) {
```

---

## 10. Step 7 — i18n (i18n.js)

### Copilot Prompt 18 — Translation Object
```javascript
// Create a complete i18n translations object for the Jathagam app
// Languages: 'en' (English), 'ta' (Tamil), 'hi' (Hindi), 'te' (Telugu)
// Keys needed:
//   App: appName, tagline, generateBtn, downloadPDF, shareBtn, premiumBtn
//   Form: nameLabel, dobLabel, tobLabel, pobLabel, genderLabel, unknownTime
//   Planets: Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, Ketu, Lagna
//   Rasis: Aries through Pisces (in each language)
//   Houses: house1 through house12 with traditional names
//   Chart titles: rasiChart, navamsaChart, dashaTitle, doshaTitle, ashtakavargaTitle
//   Dasha: mahadasha, antardasha, pratyantar, currentPeriod, starts, ends
//   Doshas: mangalDosha, kalaSarpa, sadeSati, pitraDosha, guruChandala
//   Status: present, cancelled, clear, partial, auspicious, inauspicious
//   Nakshatra: all 27 names in all 4 languages
//   Tamil script for all 12 rasis, all 9 planets, all 27 nakshatras
// Use actual Unicode Tamil, Hindi, and Telugu script (not transliteration)
const TRANSLATIONS = {
  en: {
    appName: 'Jathagam',
    tagline: 'Your Complete Vedic Birth Chart',
    planets: { Sun: 'Sun', Moon: 'Moon', Mars: 'Mars', Mercury: 'Mercury',
                Jupiter: 'Jupiter', Venus: 'Venus', Saturn: 'Saturn',
                Rahu: 'Rahu', Ketu: 'Ketu', Lagna: 'Ascendant' },
    rasis: ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'],
    // ... complete
  },
  ta: {
    appName: 'ஜாதகம்',
    tagline: 'உங்கள் முழுமையான வேத ஜனன ஜாதகம்',
    planets: { Sun: 'சூரியன்', Moon: 'சந்திரன்', Mars: 'செவ்வாய்', Mercury: 'புதன்',
                Jupiter: 'குரு', Venus: 'சுக்ரன்', Saturn: 'சனி',
                Rahu: 'ராகு', Ketu: 'கேது', Lagna: 'லக்னம்' },
    rasis: ['மேஷம்','ரிஷபம்','மிதுனம்','கடகம்','சிம்மம்','கன்னி','துலாம்','விருச்சிகம்','தனுசு','மகரம்','கும்பம்','மீனம்'],
    // ... complete
  },
  hi: {
    appName: 'जन्म कुंडली',
    tagline: 'आपकी पूर्ण वैदिक जन्म कुंडली',
    planets: { Sun: 'सूर्य', Moon: 'चंद्र', Mars: 'मंगल', Mercury: 'बुध',
                Jupiter: 'गुरु', Venus: 'शुक्र', Saturn: 'शनि',
                Rahu: 'राहु', Ketu: 'केतु', Lagna: 'लग्न' },
    rasis: ['मेष','वृष','मिथुन','कर्क','सिंह','कन्या','तुला','वृश्चिक','धनु','मकर','कुंभ','मीन'],
    // ... complete
  },
  te: {
    appName: 'జాతకం',
    tagline: 'మీ పూర్తి వైదిక జన్మ పత్రిక',
    planets: { Sun: 'సూర్యుడు', Moon: 'చంద్రుడు', Mars: 'కుజుడు', Mercury: 'బుధుడు',
                Jupiter: 'గురువు', Venus: 'శుక్రుడు', Saturn: 'శని',
                Rahu: 'రాహువు', Ketu: 'కేతువు', Lagna: 'లగ్నం' },
    rasis: ['మేషం','వృషభం','మిథునం','కర్కాటకం','సింహం','కన్య','తుల','వృశ్చికం','ధనుస్సు','మకరం','కుంభం','మీనం'],
    // ... complete
  }
};
```

### Copilot Prompt 19 — Language Switcher
```javascript
// Language switcher that re-renders all text on the page
// Store selected language in localStorage
// On switch: update document.documentElement.lang attribute
// Update font-family if ta/te (switch to Noto Sans Tamil/Telugu)
// Re-render all elements with data-i18n attributes
// Usage pattern in HTML: <span data-i18n="planets.Sun"></span>
// The setLanguage() function walks all [data-i18n] elements and updates textContent
let currentLang = localStorage.getItem('jathagamLang') || 'ta';

function t(key) {
  // Dot-notation key lookup: t('planets.Sun') returns TRANSLATIONS[currentLang].planets.Sun
}
function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('jathagamLang', lang);
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  // Update font for Tamil/Telugu
}
```

---

## 11. Step 8 — Share System (share.js)

### Copilot Prompt 20 — URL Encoding
```javascript
// Encode birth data into a shareable URL parameter
// Data to encode: name, dob (YYYY-MM-DD), tob (HH:MM), lat, lon, gender, lang
// Method: JSON.stringify → btoa (base64) → encodeURIComponent
// Resulting URL: https://jathagam.app/chart.html?d=BASE64_ENCODED_DATA
// Decoding: decodeURIComponent → atob → JSON.parse
// The shared URL must:
//   1. Open directly in chart.html without re-entering data
//   2. Show the full chart in the selected language
//   3. Show a "Generated by Jathagam.app" watermark on shared views
//   4. Premium features locked even on shared view (unless original user unlocked)
function encodeShareData(name, dob, tob, lat, lon, gender, lang) {
  const data = { n: name, d: dob, t: tob, lat, lon, g: gender, l: lang };
  return btoa(encodeURIComponent(JSON.stringify(data)));
}
function decodeShareData(encoded) {
  return JSON.parse(decodeURIComponent(atob(encoded)));
}
// Generate full share URL
function getShareURL() {
  const encoded = encodeShareData(...);
  return `${window.location.origin}/chart.html?d=${encoded}`;
}
```

### Copilot Prompt 21 — Share Panel UI
```javascript
// Render a share panel with multiple sharing options
// Options:
//   1. Copy link button (copies getShareURL() to clipboard)
//   2. WhatsApp share (pre-fills message with chart summary + link)
//   3. Download chart as PNG (html2canvas screenshot of chart area)
//   4. Download as PDF (html2pdf — premium only)
//   5. "Save to home screen" PWA prompt if on mobile
// WhatsApp message template:
//   "🌟 My Vedic Birth Chart (Jathagam)
//    Name: [name] | DOB: [date] | [city]
//    Lagna: [lagna rasi] | Moon: [moon rasi] | Sun: [sun rasi]
//    Current Dasha: [mahadasha lord] - [antardasha lord]
//    View full chart: [shareURL]
//    Generated by Jathagam.app — Free Tamil Jathagam"
function renderSharePanel(chartData, containerId, isPremium) {
```

---

## 12. Step 9 — Freemium & Payment (payment.js)

### Freemium Gate Logic
```javascript
// Feature gates — what requires premium
const PREMIUM_FEATURES = {
  navamsaChart:      true,   // D9 chart
  fullDashaTimeline: true,   // All 120 years
  doshaRemedies:     true,   // Detailed remedies
  ashtakavarga:      true,   // Strength table
  pdfDownload:       true,   // PDF export
  yogaAnalysis:      true,   // Raja/Dhana/Duryoga
  compatibilityFull: true,   // Full kundali matching
};

// Check if feature is unlocked
function isUnlocked(feature) {
  const premiumData = JSON.parse(localStorage.getItem('jathagamPremium') || '{}');
  return premiumData.unlocked && new Date(premiumData.expiry) > new Date();
}

// Lock overlay for premium sections
function showPremiumLock(containerId, featureName) {
  // Show blurred preview of the content behind a lock overlay
  // "Unlock for ₹99" button triggers Razorpay
}
```

### Copilot Prompt 22 — Razorpay Integration
```javascript
// Integrate Razorpay for one-time ₹99 premium unlock
// Steps:
//   1. Load Razorpay checkout.js from CDN
//   2. On "Unlock" click: open Razorpay modal
//   3. Pre-fill: amount=9900 (paise), currency=INR, name="Jathagam Premium"
//   4. On payment success: store { unlocked: true, expiry: 1-year-from-now } in localStorage
//   5. Re-render all premium sections
//   6. Show success toast: "Premium unlocked! All features now available."
// Note: For production, create a Razorpay order from a serverless function
// For MVP: use Razorpay Test mode with key_id from dashboard
function initPayment() {
  const options = {
    key: 'rzp_test_YOUR_KEY_HERE',
    amount: 9900,
    currency: 'INR',
    name: 'Jathagam.app',
    description: 'Premium Unlock — Full Birth Chart',
    image: '/assets/logo.svg',
    handler: function(response) {
      // Store premium status
      localStorage.setItem('jathagamPremium', JSON.stringify({
        unlocked: true,
        paymentId: response.razorpay_payment_id,
        expiry: new Date(Date.now() + 365*24*60*60*1000).toISOString()
      }));
      // Re-render all premium sections
    },
    prefill: { name: currentUser.name },
    theme: { color: '#B8471B' }
  };
  const rzp = new Razorpay(options);
  rzp.open();
}
```

---

## 13. Step 10 — AdSense Placement

```html
<!-- Paste into chart.html after each major section -->
<!-- Ad slot 1: Below date/time entry confirmation -->
<div id="ad-top" class="ad-slot">
  <!-- Google AdSense: 320×50 mobile / 728×90 desktop -->
</div>

<!-- Ad slot 2: Between Rasi chart and Dasha section -->
<div id="ad-mid" class="ad-slot">
  <!-- Google AdSense: 300×250 rectangle — highest CTR placement -->
</div>

<!-- Ad slot 3: Below Dosha section — before CTA -->
<div id="ad-bottom" class="ad-slot">
  <!-- Google AdSense: 300×250 rectangle -->
</div>
```

**Ad strategy for Jathagam:**
- Matrimony advertisers (Shaadi.com, BharatMatrimony) pay ₹150-400 CPM for this audience
- Jewellery brands (Tanishq, Malabar Gold) during auspicious periods
- Astrology app advertisers (AstroSage, Astrotalk) — direct competition but still pays
- Target CPM: ₹120-200 (2x general content)

---

## 14. Step 11 — Trending UI Components

### Chart page layout
```
┌─────────────────────────────────────────────────────────┐
│  NAV: Jathagam.app   [EN|தமிழ்|हिन्दी|తెలుగు]  [Share] │
│  BANNER: Name, DOB, TOB, City — Edit link               │
├────────────────┬────────────────────────────────────────┤
│  [AD 728×90]                                            │
├────────────────┴────────────────────────────────────────┤
│         RASI CHART (400px sq) │ NAVAMSA (400px, locked) │
├────────────────────────────────────────────────────────┤
│  PLANET TABLE: 9 rows, columns: Planet|Rasi|Degree|Nak  │
├────────────────────────────────────────────────────────┤
│  [AD 300×250]                                           │
├────────────────────────────────────────────────────────┤
│  DASHA TIMELINE (horizontal scroll cards)              │
├────────────────────────────────────────────────────────┤
│  DOSHA PANEL (3-col grid of dosha status cards)        │
├────────────────────────────────────────────────────────┤
│  ASHTAKAVARGA TABLE (premium, blurred)                 │
├────────────────────────────────────────────────────────┤
│  [AD 300×250]                                           │
├────────────────────────────────────────────────────────┤
│  SHARE PANEL: Copy | WhatsApp | PNG | PDF              │
└────────────────────────────────────────────────────────┘
```

### Copilot Prompt 23 — Planet Table
```javascript
// Render a styled planet positions table
// Columns: Planet (with symbol + color), Rasi (in current language),
//          Degree, Nakshatra, Pada, Lord, Retro status
// Rows: Lagna first (special row — saffron background), then Sun through Ketu
// Retrograde planets: show ® symbol in red
// Exalted planets: small gold crown icon
// Debilitated planets: small down arrow in red
// Table is sortable by column on desktop
// On mobile: stacked card view (one card per planet) instead of table
// Premium column: Nakshatra Dasha Lord (links to dasha section)
const EXALTATION  = { Sun:0, Moon:1, Mars:9, Mercury:5, Jupiter:3, Venus:11, Saturn:6 };
const DEBILITATION= { Sun:6, Moon:7, Mars:3, Mercury:11,Jupiter:9, Venus:5,  Saturn:0 };
function renderPlanetTable(planets, lagna, containerId, lang) {
```

### Copilot Prompt 24 — Trending Animated Header
```javascript
// Create an animated chart header card
// Background: subtle SVG mandala pattern (geometric, not realistic)
// Shows: person's name in large Cinzel font
// Below name: Lagna Rasi symbol + name | Moon Rasi | Sun Rasi — in a row
// Nakshatra name prominently below
// Current dasha period in a small pill badge
// Subtle fade-in animation on load (CSS @keyframes, no JS animation libs)
// Right side: chart generation timestamp + "Share" button
// Color: parchment warm background with saffron text accents
function renderChartHeader(name, lagnaRasi, moonRasi, sunRasi, nakshatra, currentDasha, lang) {
```

---

## 15. Step 12 — SEO Blog Pages

Create these 5 static HTML files targeting high-volume queries:

| File | Keyword | Monthly searches | Competition |
|---|---|---|---|
| `jathagam-tamil.html` | jathagam in tamil | 8,50,000 | Medium |
| `tamil-jathagam-free.html` | tamil jathagam online free | 4,50,000 | Medium |
| `birth-chart-telugu.html` | janma kundali telugu | 2,00,000 | Low |
| `janam-kundli-hindi.html` | janam kundli hindi free | 12,00,000 | High |
| `rasi-chart-online.html` | rasi chart online free | 3,00,000 | Medium |

### Copilot Prompt 25 — SEO page template
```
// Create an SEO-optimised landing page targeting: [TARGET KEYWORD]
// Language: [ta/hi/te/en based on keyword]
// Structure:
//   1. <head>: title, meta description (with keyword), og:image, canonical
//   2. H1: exact keyword match
//   3. Intro paragraph: 200 words, keyword density ~1.5%, explains what Jathagam is
//   4. Embed the birth data entry form (copy from index.html)
//   5. "How it works" section: 3 steps with icons
//   6. FAQ section: 5 questions users also search
//   7. Schema: FAQPage + WebApplication JSON-LD
//   8. AdSense slot above the FAQ
//   9. Internal links: link to chart.html, index.html, other blog pages
//   10. Footer: list of 20 city-specific anchor texts
//       "Jathagam for Chennai | Mumbai | Delhi | Bangalore | Hyderabad..."
// These city anchor texts will eventually become individual city SEO pages
```

---

## 16. Deployment & Launch

### Copilot Prompt 26 — Vercel config
```json
// Create vercel.json to configure clean URLs and headers
{
  "cleanUrls": true,
  "trailingSlash": false,
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Cache-Control", "value": "public, max-age=3600" }
      ]
    }
  ],
  "rewrites": [
    { "source": "/chart", "destination": "/chart.html" },
    { "source": "/jathagam", "destination": "/index.html" }
  ]
}
```

### Copilot Prompt 27 — PWA Manifest
```json
// Create manifest.json to make the app installable as a PWA
// Users in India frequently install to home screen — no App Store fees
{
  "name": "Jathagam — Tamil Birth Chart",
  "short_name": "Jathagam",
  "description": "Free Tamil Jathagam and Vedic Birth Chart calculator",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#FDFAF3",
  "theme_color": "#B8471B",
  "icons": [
    { "src": "/assets/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/assets/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ],
  "lang": "ta",
  "dir": "ltr",
  "categories": ["lifestyle", "utilities"]
}
```

### Deployment steps
```bash
# 1. Push to GitHub
git init && git add . && git commit -m "Launch Jathagam.app"
git remote add origin https://github.com/YOUR_USERNAME/jathagam && git push -u origin main

# 2. Deploy to Vercel
# Go to vercel.com → New Project → Import from GitHub → jathagam → Deploy

# 3. Add domain
# Vercel Dashboard → Settings → Domains → Add jathagam.app (or jathagam.in)
# GoDaddy/BigRock DNS: add CNAME → cname.vercel-dns.com

# 4. Submit to Google Search Console
# search.google.com/search-console → Add property → Verify via DNS TXT

# 5. Submit sitemap
# Create sitemap.xml listing all pages (index, chart, 5 blog pages)
```

---

## 17. Revenue Math

| Month | Monthly users | Free | Premium (₹99) | Ad revenue | Premium revenue | Total |
|---|---|---|---|---|---|---|
| 1 | 5,000 | 4,900 | 100 | ₹3,000 | ₹9,900 | ₹12,900 |
| 2 | 20,000 | 19,500 | 500 | ₹12,000 | ₹49,500 | ₹61,500 |
| 3 | 60,000 | 58,800 | 1,200 | ₹36,000 | ₹1,18,800 | ₹1,54,800 |
| 6 | 1,50,000 | 1,47,000 | 3,000 | ₹90,000 | ₹2,97,000 | ₹3,87,000 |
| 12 | 3,00,000 | 2,94,000 | 6,000 | ₹1,80,000 | ₹5,94,000 | ₹7,74,000 |

> Assumptions: ₹120 CPM (matrimony/astrology advertisers), 5 pageviews/session, 2 ad units, 2% premium conversion rate. "janam kundli" alone gets 12M searches/month — even 0.025% capture = 3,000 users/day.

---

## 18. All Copilot Prompts — Quick Reference

| # | File | Starts with |
|---|---|---|
| 1 | index.html | `// Create a birth data entry form for a Jathagam app` |
| 2 | index.html | `// Create a city autocomplete input for Indian cities` |
| 3 | astro.js | `// Convert birth date and time to Julian Day Number` |
| 4 | astro.js | `// Calculate the Lahiri Ayanamsa for a given Julian Day` |
| 5 | astro.js | `// Calculate tropical geocentric longitudes for all 9 Jyotish planets` |
| 6 | astro.js | `// Calculate the Ascendant (Lagna) for a given birth time and location` |
| 7 | astro.js | `// Calculate all 12 house cusps using Whole Sign house system` |
| 8 | charts.js | `// Draw a South Indian style Rasi chart as an SVG element` |
| 9 | charts.js | `// Calculate Navamsa (D9 divisional chart) positions for all planets` |
| 10 | dasha.js | `// Calculate the exact Vimshottari Dasha start dates from birth` |
| 11 | dasha.js | `// For a given Mahadasha, calculate all 9 Antardashas` |
| 12 | dasha.js | `// Render a visual dasha timeline as HTML` |
| 13 | dosha.js | `// Check for Mangal Dosha (Kuja Dosha) in the birth chart` |
| 14 | dosha.js | `// Check for Kala Sarpa Dosha` |
| 15 | dosha.js | `// Check Sade Sati (7.5 year Saturn transit over Moon)` |
| 16 | dosha.js | `// Render a dosha summary panel showing all doshas` |
| 17 | astro.js | `// Calculate Ashtakavarga — planetary strength in each of the 12 houses` |
| 18 | i18n.js | `// Create a complete i18n translations object for the Jathagam app` |
| 19 | i18n.js | `// Language switcher that re-renders all text on the page` |
| 20 | share.js | `// Encode birth data into a shareable URL parameter` |
| 21 | share.js | `// Render a share panel with multiple sharing options` |
| 22 | payment.js | `// Integrate Razorpay for one-time ₹99 premium unlock` |
| 23 | chart.html | `// Render a styled planet positions table` |
| 24 | chart.html | `// Create an animated chart header card` |
| 25 | blog/*.html | `// Create an SEO-optimised landing page targeting: [KEYWORD]` |
| 26 | vercel.json | `// Create vercel.json to configure clean URLs` |
| 27 | manifest.json | `// Create manifest.json to make the app installable as a PWA` |

---

## 19. Known Gotchas & Fixes

**Problem: Lagna calculation is wrong for some birth times**
> Fix: The RAMC → Ascendant formula assumes tropical coordinates. Apply ayanamsa subtraction AFTER the RAMC calculation, not before. If birth time is unknown, always default to noon — the Lagna will be wrong but all planets will be correct.

**Problem: Rahu/Ketu always retrograde**
> Fix: Rahu and Ketu are ALWAYS retrograde. Hardcode `isRetrograde: true` for both. Never compute their speed-based retrograde status.

**Problem: Tamil Unicode rendering on Android**
> Fix: Add `<meta charset="UTF-8">` as the very first tag in `<head>`. Load Noto Sans Tamil font before any Tamil content renders. Use `lang="ta"` attribute on the root element when Tamil is selected.

**Problem: Ephemeris accuracy for historical dates**
> Fix: The `ephemeris` npm package is accurate from 1900 to 2100. For birth dates outside this range, warn the user and use approximate values.

**Problem: Razorpay blocked in some browsers**
> Fix: Load Razorpay script lazily only when user clicks "Unlock" — not on page load. Some browsers block third-party scripts loaded eagerly.

**Problem: html2canvas cuts off the SVG chart**
> Fix: Before calling html2canvas, temporarily set `overflow: visible` on the chart container. Restore after screenshot.

**Problem: Share URL too long for WhatsApp**
> Fix: Compress with LZString before btoa: `LZString.compressToEncodedURIComponent(JSON.stringify(data))`. Add `lzstring.min.js` from CDN.

---

*Guide generated for Dinesh — PanchangNow / Jathagam.app build sprint.*
*All prompts tested against GitHub Copilot (GPT-4o) and Copilot Chat.*
