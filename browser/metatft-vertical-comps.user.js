// ==UserScript==
// @name         MetaTFT Vertical Comps
// @namespace    https://metatft.com
// @version      3.0
// @description  reformats metatft comp list into vertical cards to maximize comps visible on wide screens
// @author       jasonshipp
// @match        https://www.metatft.com/*
// @match        https://metatft.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  console.log('[VC] metatft vertical comps v3 loaded');

  // ---- config ----
  const CARD_MIN_WIDTH = 220;
  const TOGGLE_KEY = 'v'; // alt+v

  let active = false;
  let cardGrid = null;
  let observer = null;

  // ---- styles ----
  const css = `
    /* ===== card grid container ===== */
    #vc-card-grid {
      display: none;
      grid-template-columns: repeat(auto-fill, minmax(${CARD_MIN_WIDTH}px, 1fr));
      gap: 8px;
      padding: 8px;
      width: 100%;
      overflow-y: auto;
      align-items: start;
    }
    #vc-card-grid.vc-active {
      display: grid;
    }

    /* ===== individual card ===== */
    .vc-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      border: 1px solid #3a3b3e;
      border-radius: 6px;
      padding: 10px 8px;
      gap: 6px;
      background: #222326;
    }
    .vc-card:nth-child(even) {
      background: #27282b;
    }

    /* header: tier badge + comp name */
    .vc-card-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 100%;
    }
    .vc-card-header .CompRowTierBadge {
      flex-shrink: 0;
    }
    .vc-card-name {
      text-align: center;
      font-size: 13px;
      font-weight: 600;
      line-height: 1.3;
      white-space: normal;
      word-break: break-word;
    }

    /* tags row */
    .vc-card-tags {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 4px;
      width: 100%;
    }

    /* traits row */
    .vc-card-traits {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 1px;
      width: 100%;
    }

    /* units row */
    .vc-card-units {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 3px;
      width: 100%;
    }

    /* stats row */
    .vc-card-stats {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 4px 10px;
      width: 100%;
      font-size: 12px;
    }

    /* ===== toggle button ===== */
    #metatft-vc-toggle {
      position: fixed;
      bottom: 14px;
      right: 14px;
      z-index: 99999;
      background: #ff7e83;
      color: #111;
      border: none;
      border-radius: 6px;
      padding: 7px 16px;
      font-family: 'Poppins', sans-serif;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 2px 10px rgba(0,0,0,.45);
      transition: background .15s, transform .1s;
      user-select: none;
    }
    #metatft-vc-toggle:hover {
      background: #ffbf7f;
      transform: scale(1.04);
    }
    #metatft-vc-toggle.vc-on {
      background: #7eff83;
    }

    /* slider panel */
    #metatft-vc-controls {
      position: fixed;
      bottom: 50px;
      right: 14px;
      z-index: 99999;
      background: #27282b;
      border: 1px solid #3a3b3e;
      border-radius: 6px;
      padding: 8px 12px;
      display: none;
      flex-direction: column;
      gap: 6px;
      font-family: 'Poppins', sans-serif;
      font-size: 12px;
      color: #ccc;
      box-shadow: 0 2px 10px rgba(0,0,0,.45);
    }
    #metatft-vc-controls.vc-visible {
      display: flex;
    }
    #metatft-vc-controls label {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    #metatft-vc-controls input[type="range"] {
      width: 120px;
      accent-color: #ff7e83;
    }

    /* hide original list when grid is active */
    .vc-original-hidden {
      display: none !important;
    }
  `;

  // ---- inject styles ----
  function injectStyles() {
    const el = document.createElement('style');
    el.id = 'metatft-vc-styles';
    el.textContent = css;
    document.head.appendChild(el);
  }

  // ---- find the comp list container ----
  function findCompList() {
    return document.querySelector('.CompListContainer');
  }

  // ---- convert a comp row into a vertical card ----
  function rowToCard(row) {
    const card = document.createElement('div');
    card.className = 'vc-card';

    // header: tier badge + name
    const header = document.createElement('div');
    header.className = 'vc-card-header';

    const badge = row.querySelector('.CompRowTierBadge');
    if (badge) header.appendChild(badge.cloneNode(true));

    const nameEl = row.querySelector('.Comp_Title');
    if (nameEl) {
      const nameSpan = document.createElement('span');
      nameSpan.className = 'vc-card-name';
      nameSpan.textContent = nameEl.textContent.trim();
      header.appendChild(nameSpan);
    }
    if (header.childNodes.length) card.appendChild(header);

    // tags (e.g. "Fast 8", "Medium")
    const tags = row.querySelectorAll('.CompRowTag');
    if (tags.length) {
      const wrap = document.createElement('div');
      wrap.className = 'vc-card-tags';
      tags.forEach(t => wrap.appendChild(t.cloneNode(true)));
      card.appendChild(wrap);
    }

    // traits
    const traits = row.querySelectorAll('.TraitCompactContainer');
    if (traits.length) {
      const wrap = document.createElement('div');
      wrap.className = 'vc-card-traits';
      traits.forEach(t => wrap.appendChild(t.cloneNode(true)));
      card.appendChild(wrap);
    }

    // units
    const units = row.querySelectorAll('.Unit_Wrapper');
    if (units.length) {
      const wrap = document.createElement('div');
      wrap.className = 'vc-card-units';
      units.forEach(u => wrap.appendChild(u.cloneNode(true)));
      card.appendChild(wrap);
    }

    // stats
    const statsContainer = row.querySelector('.Comp_Stats');
    if (statsContainer) {
      const wrap = document.createElement('div');
      wrap.className = 'vc-card-stats';
      const statRows = statsContainer.querySelectorAll(':scope > .Comp_Stats_Row');
      statRows.forEach(s => wrap.appendChild(s.cloneNode(true)));
      card.appendChild(wrap);
    }

    // fallback: if nothing matched, clone the whole row
    if (card.children.length === 0) {
      card.innerHTML = row.innerHTML;
    }

    return card;
  }

  // ---- build all cards from current rows ----
  function buildCards() {
    if (!cardGrid) return;
    cardGrid.innerHTML = '';

    const rows = document.querySelectorAll('.CompRowWrapper');
    let count = 0;
    rows.forEach(row => {
      // skip placeholder/skeleton rows
      if (row.querySelector('.CompRowPlaceholder')) return;
      const card = rowToCard(row);
      cardGrid.appendChild(card);
      count++;
    });
    console.log(`[VC] built ${count} cards`);
  }

  // ---- scroll the page to trigger lazy loading of all comp rows ----
  function scrollToLoadAll() {
    return new Promise(resolve => {
      const totalHeight = document.documentElement.scrollHeight;
      const step = window.innerHeight;
      let pos = 0;

      console.log(`[VC] scrolling to load all rows (height: ${totalHeight})`);

      function scrollStep() {
        pos += step;
        window.scrollTo(0, pos);

        if (pos < totalHeight + step) {
          requestAnimationFrame(scrollStep);
        } else {
          window.scrollTo(0, 0);
          setTimeout(resolve, 300);
        }
      }
      requestAnimationFrame(scrollStep);
    });
  }

  // ---- toggle ----
  async function toggle() {
    active = !active;

    const btn = document.getElementById('metatft-vc-toggle');
    const controls = document.getElementById('metatft-vc-controls');
    const compList = findCompList();

    if (active) {
      btn.textContent = 'Loading...';
      btn.disabled = true;

      // create the card grid if needed
      if (!cardGrid) {
        cardGrid = document.createElement('div');
        cardGrid.id = 'vc-card-grid';
        if (compList) {
          compList.parentElement.insertBefore(cardGrid, compList);
        } else {
          document.getElementById('root').appendChild(cardGrid);
        }
      }

      // scroll the page to trigger lazy loading of all comp rows
      await scrollToLoadAll();

      // build cards from all loaded rows
      buildCards();

      // hide original, show grid
      if (compList) compList.classList.add('vc-original-hidden');
      cardGrid.classList.add('vc-active');

      // observe for data refreshes (filter changes, etc.)
      startObserver();

      btn.textContent = 'Horizontal \u2194';
      btn.disabled = false;
      btn.classList.add('vc-on');
      if (controls) controls.classList.add('vc-visible');

      // apply slider width
      const slider = document.getElementById('metatft-vc-width');
      if (slider) setCardWidth(parseInt(slider.value, 10));

    } else {
      // restore original
      if (compList) compList.classList.remove('vc-original-hidden');
      if (cardGrid) cardGrid.classList.remove('vc-active');
      stopObserver();

      btn.textContent = 'Vertical \u2195';
      btn.classList.remove('vc-on');
      if (controls) controls.classList.remove('vc-visible');
    }
  }

  // ---- mutation observer: rebuild cards when data changes ----
  let rebuildTimeout = null;
  function startObserver() {
    if (observer) return;
    const compList = findCompList();
    if (!compList) return;

    observer = new MutationObserver(() => {
      if (!active) return;
      // debounce rebuilds
      clearTimeout(rebuildTimeout);
      rebuildTimeout = setTimeout(buildCards, 300);
    });
    observer.observe(compList, { childList: true, subtree: true });
  }

  function stopObserver() {
    if (observer) { observer.disconnect(); observer = null; }
    clearTimeout(rebuildTimeout);
  }

  // ---- card width slider ----
  function setCardWidth(px) {
    if (cardGrid) {
      cardGrid.style.gridTemplateColumns = `repeat(auto-fill, minmax(${px}px, 1fr))`;
    }
    const label = document.getElementById('metatft-vc-width-val');
    if (label) label.textContent = px + 'px';
  }

  // ---- build ui ----
  function buildUI() {
    const btn = document.createElement('button');
    btn.id = 'metatft-vc-toggle';
    btn.textContent = 'Vertical \u2195';
    btn.addEventListener('click', () => toggle());
    document.body.appendChild(btn);

    const panel = document.createElement('div');
    panel.id = 'metatft-vc-controls';
    panel.innerHTML = `
      <label>
        Card width
        <input type="range" id="metatft-vc-width" min="150" max="400" value="${CARD_MIN_WIDTH}" step="10">
        <span id="metatft-vc-width-val">${CARD_MIN_WIDTH}px</span>
      </label>
    `;
    document.body.appendChild(panel);

    panel.querySelector('#metatft-vc-width').addEventListener('input', e => {
      setCardWidth(parseInt(e.target.value, 10));
    });

    document.addEventListener('keydown', e => {
      if (e.altKey && e.key === TOGGLE_KEY) {
        e.preventDefault();
        toggle();
      }
    });
  }

  // ---- init ----
  function init() {
    console.log('[VC] initializing');
    injectStyles();
    buildUI();
  }

  if (document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('load', init);
  }
})();
