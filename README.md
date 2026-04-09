# Jathagam.app — Tamil Astrology & Panchangam

Free Tamil birth chart (ஜாதகம்) generator and daily Panchangam calendar — all calculations run in-browser using VSOP87 planetary theory with Lahiri Ayanamsa.

## Live Site

**[jathagam.app](https://jathagam.app)**

## Features

### ✦ Birth Chart (ஜாதகம்)
- Rasi & Navamsa chart with South Indian layout
- Dasha periods (Vimshottari) & sub-periods
- Dosha analysis — Mangal, Kaal Sarp, Sade Sati
- Multi-language support — Tamil, English, Hindi, Telugu
- PDF export & shareable URL
- Premium unlock via Razorpay

### 📅 Panchangam (பஞ்சாங்கம்)
- Monthly calendar with Pournami 🌕 / Amavasai 🌑 / Muhurta ✶ markers
- Five limbs — Tithi, Nakshatra, Yogam, Karanam, Vaaram with end times
- Rahu Kalam, Yamagandam, Gulikai — good/bad time grid
- Chandrashtamam with affected Rasi & Nakshatra names
- Soolam direction & remedy
- 12-Rasi daily palan (Chandrabala)
- Shaka & Hijri date, day-of-year

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Vanilla HTML / CSS / JS (zero frameworks) |
| Astronomy | VSOP87 (astro.js) — sub-arcminute accuracy |
| Ayanamsa | Lahiri (Chitrapaksha) |
| Payments | Razorpay via Vercel Serverless Functions |
| Hosting | Vercel (static + `/api/` serverless) |

## Project Structure

```
├── index.html          # Home — birth data form
├── chart.html          # Birth chart results page
├── panchangam.html     # Daily Panchangam calendar
├── astro.js            # VSOP87 planetary calculations
├── panchangam.js       # Panchangam calculation engine
├── charts.js           # Rasi/Navamsa chart rendering
├── dasha.js            # Vimshottari Dasha engine
├── dosha.js            # Dosha detection
├── i18n.js             # Tamil/English/Hindi/Telugu translations
├── payment.js          # Razorpay frontend (calls /api/)
├── share.js            # URL sharing & PDF export
├── pdf.js              # PDF generation
├── style.css           # All styles
├── api/
│   ├── create-order.js # Vercel serverless — Razorpay order creation
│   └── verify-payment.js # Vercel serverless — signature verification
├── blog/               # SEO landing pages (Tamil, Hindi, Telugu)
├── vercel.json         # Routing, headers, CSP
└── package.json        # Node deps (razorpay SDK)
```

## Local Development

```bash
# Serve static files
python3 -m http.server 3000

# API functions need Vercel CLI
npm i -g vercel
vercel dev
```

## Deployment (Vercel)

1. Import repo on [vercel.com](https://vercel.com/new)
2. Framework Preset: **Other**
3. Add Environment Variables:
   - `RAZORPAY_KEY_ID` — your Razorpay Key ID
   - `RAZORPAY_KEY_SECRET` — your Razorpay Key Secret
4. Deploy — Vercel auto-detects `/api/` serverless functions

## Environment Variables

| Variable | Description |
|----------|-------------|
| `RAZORPAY_KEY_ID` | Razorpay API Key ID |
| `RAZORPAY_KEY_SECRET` | Razorpay API Key Secret (never in frontend) |

## License

© 2026 Jathagam.app. All rights reserved.
