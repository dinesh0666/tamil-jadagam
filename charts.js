/**
 * charts.js — SVG chart rendering for South Indian Rasi and Navamsa charts.
 * Draws the classic 4×4 South Indian grid, planet abbreviations, Lagna marker.
 */
'use strict';

/* ── Planet display config ────────────────────────────────────────────── */
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
  Lagna:   { symbol: 'L',  abbr: 'L',  color: 'var(--primary)' },
};

/**
 * South Indian grid: fixed rasi positions.
 * rasi 0 (Mesha/Aries) is always at cell (row=0, col=1).
 * Each entry: [row, col] in a 4×4 grid (0-indexed).
 */
const RASI_GRID_POS = [
  [0,1], // 0  Aries
  [0,2], // 1  Taurus
  [0,3], // 2  Gemini
  [1,3], // 3  Cancer
  [2,3], // 4  Leo
  [3,3], // 5  Virgo
  [3,2], // 6  Libra
  [3,1], // 7  Scorpio
  [3,0], // 8  Sagittarius
  [2,0], // 9  Capricorn
  [1,0], // 10 Aquarius
  [0,0], // 11 Pisces
];

/**
 * Build a mapping from [row*4+col] → rasiNum for rendering.
 */
function buildGridMap() {
  const map = {};
  RASI_GRID_POS.forEach(([r, c], rasiNum) => { map[r * 4 + c] = rasiNum; });
  return map;
}

/**
 * Draw South Indian Rasi chart.
 * @param {string} containerId  DOM id to draw into
 * @param {number} lagnaRasi    0-11
 * @param {Array}  planets      array of planet objects from astro.js
 * @param {string} title        center label (person name or chart type)
 * @param {string} chartLabel   'RASI' | 'NAVAMSA'
 */
function drawSouthIndianChart(containerId, lagnaRasi, planets, title, chartLabel) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const SIZE  = 400;
  const CELL  = SIZE / 4;   // 100px each
  const PAD   = 6;
  const gridMap = buildGridMap();

  // Build a lookup: rasiNum → list of planets in that rasi
  const rasiPlanets = {};
  for (let i = 0; i < 12; i++) rasiPlanets[i] = [];

  // Lagna marker
  rasiPlanets[lagnaRasi].push({ name: 'Lagna', isRetrograde: false });

  for (const p of planets) {
    const rasi = chartLabel === 'NAVAMSA' ? p.navamsaRasi : p.rasiNum;
    if (rasi !== undefined && rasi !== null) {
      rasiPlanets[rasi] = rasiPlanets[rasi] || [];
      rasiPlanets[rasi].push(p);
    }
  }

  // SVG namespace
  const SVGNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${SIZE} ${SIZE}`);
  svg.setAttribute('width', '100%');
  svg.style.maxWidth = SIZE + 'px';
  svg.style.display  = 'block';
  svg.style.margin   = '0 auto';

  // Background
  const bg = document.createElementNS(SVGNS, 'rect');
  bg.setAttribute('width', SIZE); bg.setAttribute('height', SIZE);
  bg.setAttribute('fill', 'var(--card)');
  svg.appendChild(bg);

  // Center area (rows 1-2, cols 1-2) — 2×2 center block
  const cx = CELL, cy = CELL, cw = 2*CELL, ch = 2*CELL;
  const centerRect = document.createElementNS(SVGNS, 'rect');
  centerRect.setAttribute('x', cx); centerRect.setAttribute('y', cy);
  centerRect.setAttribute('width', cw); centerRect.setAttribute('height', ch);
  centerRect.setAttribute('fill', 'var(--gold-l)');
  centerRect.setAttribute('stroke', 'var(--gold)');
  centerRect.setAttribute('stroke-width', '1.5');
  svg.appendChild(centerRect);

  // Center label
  const labelGroup = document.createElementNS(SVGNS, 'g');
  const labelText1 = document.createElementNS(SVGNS, 'text');
  labelText1.setAttribute('x', SIZE / 2);
  labelText1.setAttribute('y', SIZE / 2 - 12);
  labelText1.setAttribute('text-anchor', 'middle');
  labelText1.setAttribute('font-family', 'Cinzel, serif');
  labelText1.setAttribute('font-size', '13');
  labelText1.setAttribute('fill', 'var(--gold-d)');
  labelText1.setAttribute('font-weight', '700');
  labelText1.setAttribute('letter-spacing', '2');
  labelText1.textContent = chartLabel;
  labelGroup.appendChild(labelText1);

  // Person name (truncate if long)
  const nameText = document.createElementNS(SVGNS, 'text');
  nameText.setAttribute('x', SIZE / 2);
  nameText.setAttribute('y', SIZE / 2 + 8);
  nameText.setAttribute('text-anchor', 'middle');
  nameText.setAttribute('font-family', 'Mukta, sans-serif');
  nameText.setAttribute('font-size', '11');
  nameText.setAttribute('fill', 'var(--mid)');
  const nameShort = title.length > 18 ? title.slice(0, 16) + '…' : title;
  nameText.textContent = nameShort;
  labelGroup.appendChild(nameText);
  svg.appendChild(labelGroup);

  // Draw cells
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      // Skip corners
      if ((row === 0 || row === 3) && (col === 0 || col === 3)) continue;
      // Skip center 2×2
      if (row >= 1 && row <= 2 && col >= 1 && col <= 2) continue;

      const rasiNum = gridMap[row * 4 + col];
      const x = col * CELL;
      const y = row * CELL;

      const isLagna = (rasiNum === lagnaRasi);

      // Cell background
      const cellRect = document.createElementNS(SVGNS, 'rect');
      cellRect.setAttribute('x', x); cellRect.setAttribute('y', y);
      cellRect.setAttribute('width', CELL); cellRect.setAttribute('height', CELL);
      cellRect.setAttribute('fill', isLagna ? 'var(--primary-l)' : 'var(--bg)');
      cellRect.setAttribute('stroke', 'var(--bg3)');
      cellRect.setAttribute('stroke-width', isLagna ? '2' : '1');
      if (isLagna) cellRect.setAttribute('stroke', 'var(--primary)');
      svg.appendChild(cellRect);

      // Rasi number (top-left corner, tiny)
      const rNumTxt = document.createElementNS(SVGNS, 'text');
      rNumTxt.setAttribute('x', x + 4);
      rNumTxt.setAttribute('y', y + 11);
      rNumTxt.setAttribute('font-size', '8');
      rNumTxt.setAttribute('fill', 'var(--muted)');
      rNumTxt.setAttribute('font-family', 'Mukta, sans-serif');
      rNumTxt.textContent = rasiNum + 1; // 1-based display
      svg.appendChild(rNumTxt);

      // Planet abbreviations
      const planetsInCell = rasiPlanets[rasiNum] || [];
      const lineH = 14;
      const startY = y + 24;
      const cx2    = x + CELL / 2;

      planetsInCell.forEach((p, idx) => {
        const ps  = PLANET_SYMBOLS[p.name] || { abbr: p.name.slice(0,2), color: 'var(--dark)' };
        const txt = document.createElementNS(SVGNS, 'text');
        txt.setAttribute('x', cx2);
        txt.setAttribute('y', startY + idx * lineH);
        txt.setAttribute('text-anchor', 'middle');
        txt.setAttribute('font-size', p.name === 'Lagna' ? '11' : '12');
        txt.setAttribute('font-weight', p.name === 'Lagna' ? '700' : '600');
        txt.setAttribute('font-family', 'Mukta, sans-serif');
        txt.setAttribute('fill', ps.color);

        let label = ps.abbr;
        if (p.isRetrograde && p.name !== 'Lagna') label += 'ᴿ';
        txt.textContent = label;
        svg.appendChild(txt);
      });
    }
  }

  // Diagonal lines for corner decoration (optional visual)
  // Top-left corner: line from (0,CELL) to (CELL,0)
  const corners = [
    [0, 0], [0, 3*CELL], [3*CELL, 0], [3*CELL, 3*CELL]
  ];
  const cornerLines = [
    [[0, CELL], [CELL, 0]],
    [[0, 3*CELL], [CELL, SIZE]],
    [[3*CELL, 0], [SIZE, CELL]],
    [[3*CELL, SIZE], [SIZE, 3*CELL]],
  ];
  cornerLines.forEach(([[x1,y1],[x2,y2]]) => {
    const ln = document.createElementNS(SVGNS, 'line');
    ln.setAttribute('x1', x1); ln.setAttribute('y1', y1);
    ln.setAttribute('x2', x2); ln.setAttribute('y2', y2);
    ln.setAttribute('stroke', 'var(--bg3)'); ln.setAttribute('stroke-width', '1');
    svg.appendChild(ln);
  });

  container.innerHTML = '';
  container.appendChild(svg);
}

/**
 * Render planet positions table (Prompt 23).
 * @param {Array}  planets   array with lagna first then planets
 * @param {Object} lagna
 * @param {string} containerId
 */
function renderPlanetTable(planets, lagna, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const EXALTATION   = window.Astro.EXALTATION;
  const DEBILITATION = window.Astro.DEBILITATION;

  const rows = [{ name:'Lagna', ...lagna }, ...planets];

  // Table
  const wrap  = document.createElement('div');
  wrap.className = 'planet-table-wrap';

  const table = document.createElement('table');
  table.className = 'planet-table';

  // Header
  const thead = document.createElement('thead');
  thead.innerHTML = `<tr>
    <th data-i18n="table.planet">${t('table.planet')}</th>
    <th data-i18n="table.rasi">${t('table.rasi')}</th>
    <th data-i18n="table.degree">${t('table.degree')}</th>
    <th data-i18n="table.nakshatra">${t('table.nakshatra')}</th>
    <th data-i18n="table.pada">${t('table.pada')}</th>
    <th data-i18n="table.lord">${t('table.lord')}</th>
    <th data-i18n="table.retro">${t('table.retro')}</th>
  </tr>`;
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  rows.forEach(p => {
    const ps = PLANET_SYMBOLS[p.name] || { symbol:'?', abbr: p.name, color: 'var(--dark)' };
    const isLagnaRow = p.name === 'Lagna';
    const tr = document.createElement('tr');
    if (isLagnaRow) tr.className = 'lagna-row';

    const exalted   = EXALTATION   && EXALTATION[p.name]   === p.rasiNum;
    const debilited = DEBILITATION && DEBILITATION[p.name]  === p.rasiNum;

    const retroHtml = p.isRetrograde ? '<span class="retro-badge" title="Retrograde">®</span>' : '—';
    const exaltHtml = exalted   ? '<span class="exalt-badge" title="Exalted">★</span>' : '';
    const debilHtml = debilited ? '<span class="debil-badge" title="Debilitated">▼</span>' : '';

    tr.innerHTML = `
      <td>
        <span class="planet-symbol" style="color:${ps.color}">${ps.symbol}</span>
        <span class="planet-abbr" style="color:${ps.color};margin-left:4px">${planetName(p.name)}</span>
        ${exaltHtml}${debilHtml}
      </td>
      <td>${rasiName(p.rasiNum)}</td>
      <td>${p.degree ? p.degree.toFixed(2) + '°' : '—'}</td>
      <td>${nakName(p.nakIdx !== undefined ? p.nakIdx : 0)}</td>
      <td>${p.nakshatraPada || '—'}</td>
      <td>${planetName(p.nakLord || '—')}</td>
      <td>${retroHtml}</td>
    `;
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  wrap.appendChild(table);

  // Mobile card view
  const cards = document.createElement('div');
  cards.className = 'planet-cards';
  rows.forEach(p => {
    const ps = PLANET_SYMBOLS[p.name] || { symbol:'', abbr: p.name, color: 'var(--dark)' };
    const isLagnaRow = p.name === 'Lagna';
    const card = document.createElement('div');
    card.className = 'planet-card' + (isLagnaRow ? ' lagna-card' : '');
    card.innerHTML = `
      <div class="planet-card-name" style="color:${ps.color}">${ps.symbol} ${planetName(p.name)}</div>
      <div class="planet-card-detail">${rasiName(p.rasiNum)}, ${p.degree ? p.degree.toFixed(1)+'°' : ''}</div>
      <div class="planet-card-detail">${nakName(p.nakIdx !== undefined ? p.nakIdx : 0)}, Pada ${p.nakshatraPada || '—'}</div>
      ${p.isRetrograde ? '<div class="retro-badge">® Retrograde</div>' : ''}
    `;
    cards.appendChild(card);
  });
  wrap.appendChild(cards);

  container.innerHTML = '';
  container.appendChild(wrap);
}

/**
 * Render the birth nakshatra detail card (Prompt 24 supplement).
 */
function renderNakshtaraCard(moonPlanet, lagnaRasi, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const nak = nakName(moonPlanet.nakIdx);
  const pada = moonPlanet.nakshatraPada;
  const lord = planetName(moonPlanet.nakLord);
  const moonRasi = rasiName(moonPlanet.rasiNum);
  const nakStars = ['★','✦','✧','☆','⋆','✩','✪'];
  const star = nakStars[moonPlanet.nakIdx % nakStars.length];

  container.innerHTML = `
    <div class="nak-card">
      <div class="nak-star">${star}</div>
      <div style="flex:1">
        <div class="nak-name">${nak} <span class="nak-pada">Pada ${pada}</span></div>
        <div class="nak-detail">${planetName('Moon')} ${t('table.rasi') || 'Rasi'}: ${moonRasi} · ${t('table.lord') || 'Lord'}: ${lord}</div>
        <div class="nak-grid">
          <div class="nak-stat">
            <div class="nak-stat-label">${t('table.nakshatra') || 'Nakshatra'}</div>
            <div class="nak-stat-value">${nak}</div>
          </div>
          <div class="nak-stat">
            <div class="nak-stat-label">${t('table.pada') || 'Pada'}</div>
            <div class="nak-stat-value">${pada}</div>
          </div>
          <div class="nak-stat">
            <div class="nak-stat-label">${t('table.lord') || 'Lord'}</div>
            <div class="nak-stat-value">${lord}</div>
          </div>
          <div class="nak-stat">
            <div class="nak-stat-label">${t('table.degree') || 'Degree'}</div>
            <div class="nak-stat-value">${moonPlanet.degree.toFixed(2)}°</div>
          </div>
          <div class="nak-stat">
            <div class="nak-stat-label">${t('table.rasi') || 'Rasi'}</div>
            <div class="nak-stat-value">${moonRasi}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Animated chart banner (Prompt 24).
 */
function renderChartHeader(name, lagnaRasi, moonPlanet, sunPlanet, currentDasha, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const lagnaRasiStr = rasiName(lagnaRasi);
  const moonRasiStr  = rasiName(moonPlanet.rasiNum);
  const sunRasiStr   = rasiName(sunPlanet.rasiNum);
  const nakStr       = nakName(moonPlanet.nakIdx);
  const dashaStr     = currentDasha ? `${planetName(currentDasha.mahaLord)} - ${planetName(currentDasha.antarLord)}` : '';

  let metaHtml = '';
  // filled in chart.html from URL params

  container.innerHTML = `
    <div class="banner-content fade-in">
      <div class="banner-name">${name}</div>
      <div class="banner-meta">${nakStr} ${t('table.nakshatra') || 'Nakshatra'}</div>
      <div class="banner-pills">
        <span class="pill">🔼 ${planetName('Lagna')}: ${lagnaRasiStr}</span>
        <span class="pill">☽ ${planetName('Moon')}: ${moonRasiStr}</span>
        <span class="pill">☀ ${planetName('Sun')}: ${sunRasiStr}</span>
        ${dashaStr ? `<span class="pill current-dasha">⏱ ${dashaStr}</span>` : ''}
      </div>
    </div>
  `;
}

// Expose globally
window.Charts = {
  drawSouthIndianChart,
  renderPlanetTable,
  renderChartHeader,
  renderNakshtaraCard,
  PLANET_SYMBOLS,
};
