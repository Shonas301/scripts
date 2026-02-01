// ==UserScript==
// @name         MetaTFT Vertical Comps
// @namespace    https://metatft.com
// @version      3.2
// @description  reformats metatft comp list into ultra-compact vertical cards to maximize comps visible on wide screens
// @author       jasonshipp
// @match        https://www.metatft.com/*
// @match        https://metatft.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  console.log('[VC] metatft vertical comps v3.2 loaded');

  // ---- config ----
  const CARD_MIN_WIDTH = 80;
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
      grid-auto-rows: 1fr;
      gap: 4px;
      padding: 4px;
      width: 100%;
      overflow-y: auto;
    }
    #vc-card-grid.vc-active {
      display: grid;
    }

    /* ===== individual card ===== */
    .vc-card {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      border: 1px solid #3a3b3e;
      border-radius: 4px;
      padding: 9px 5px;
      gap: 2px;
      background: #222326;
    }
    .vc-card:nth-child(even) {
      background: #27282b;
    }

    /* header: tier badge only (name is hidden behind popout) */
    .vc-card-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      width: 100%;
    }
    .vc-card-header .CompRowTierBadge {
      flex-shrink: 0;
    }

    /* comp name popout trigger */
    .vc-name-trigger {
      cursor: pointer;
      font-size: 9px;
      color: #888;
      background: #333;
      border-radius: 3px;
      padding: 1px 4px;
      line-height: 1.2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 50px;
      user-select: none;
    }
    .vc-name-trigger:hover {
      color: #ccc;
      background: #444;
    }

    /* popout (shared for name and traits) */
    .vc-popout {
      display: none;
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      background: #111;
      border: 2px solid #ff7e83;
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 12px;
      font-weight: 600;
      color: #fff;
      white-space: nowrap;
      z-index: 200;
      pointer-events: none;
      box-shadow: 0 4px 16px rgba(0,0,0,.8);
    }
    .vc-popout.vc-popout-above {
      bottom: 100%;
      margin-bottom: 4px;
    }
    .vc-popout.vc-popout-below {
      top: 100%;
      margin-top: 4px;
    }
    .vc-popout.vc-popout-visible {
      display: block;
    }

    /* traits inside popout */
    .vc-popout .vc-popout-traits {
      display: flex;
      flex-wrap: wrap;
      gap: 2px;
      justify-content: center;
    }

    /* tags: icon-only for those with images, hidden otherwise */
    .vc-card-tags {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 2px;
      width: 100%;
    }
    .vc-tag-icon {
      width: 14px;
      height: 14px;
      display: block;
    }

    /* traits trigger (small icon to open traits popout) */
    .vc-traits-trigger {
      cursor: pointer;
      font-size: 9px;
      color: #888;
      background: #333;
      border-radius: 3px;
      padding: 1px 4px;
      line-height: 1.2;
      user-select: none;
    }
    .vc-traits-trigger:hover {
      color: #ccc;
      background: #444;
    }

    /* units: single vertical column */
    .vc-card-units {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      width: 100%;
    }
    /* each unit: champion portrait with items stacked to its right */
    .vc-card-units .Unit_Wrapper {
      display: flex !important;
      flex-direction: row !important;
      align-items: flex-start;
      gap: 1px;
      transform: scale(0.7);
      transform-origin: center top;
      margin-bottom: -14px;
    }
    .vc-card-units .Unit_Wrapper > a {
      flex-shrink: 0;
    }
    .vc-card-units .ItemsContainer_Inline {
      display: flex !important;
      flex-direction: column !important;
      gap: 1px;
      align-items: center;
    }
    .vc-card-units .Item_img {
      width: 14px !important;
      height: 14px !important;
    }
    .vc-card-units .UnitNames {
      display: none !important;
    }

    /* stats: compact top-right overlay */
    .vc-card-stats {
      position: absolute;
      top: 2px;
      right: 2px;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0;
      font-size: 9px;
      line-height: 1.2;
      pointer-events: none;
      z-index: 10;
    }
    .vc-stat {
      display: flex;
      align-items: center;
      gap: 2px;
    }
    .vc-stat-label {
      color: #777;
      font-size: 7px;
      text-transform: uppercase;
    }
    .vc-stat-value {
      font-weight: 600;
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

    /* collapse page header and ad banner when vertical mode is active */
    body.vc-mode-active .PageHeader {
      display: none !important;
    }
    body.vc-mode-active .NavBarContainerMain .NavBarBrand {
      max-height: 28px;
      overflow: hidden;
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

    // header: tier badge + clickable name trigger
    const header = document.createElement('div');
    header.className = 'vc-card-header';

    const badge = row.querySelector('.CompRowTierBadge');
    if (badge) header.appendChild(badge.cloneNode(true));

    const nameEl = row.querySelector('.Comp_Title');
    if (nameEl) {
      const nameText = nameEl.textContent.trim();
      // small trigger that shows popout on click
      const trigger = document.createElement('span');
      trigger.className = 'vc-name-trigger';
      trigger.textContent = '\u2139';
      trigger.title = nameText;

      const popout = document.createElement('div');
      popout.className = 'vc-popout';
      popout.textContent = nameText;

      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllPopouts(popout);
        positionPopout(card, popout);
        popout.classList.toggle('vc-popout-visible');
      });

      header.appendChild(trigger);
      card.appendChild(popout);
    }
    if (header.childNodes.length) card.appendChild(header);

    // tags: only show icon if the tag has an image, skip text-only tags
    const tags = row.querySelectorAll('.CompRowTag');
    const iconTags = [];
    tags.forEach(t => {
      const img = t.querySelector('img');
      if (img) {
        const icon = img.cloneNode(true);
        icon.className = 'vc-tag-icon';
        icon.title = t.textContent.trim();
        iconTags.push(icon);
      }
    });
    if (iconTags.length) {
      const wrap = document.createElement('div');
      wrap.className = 'vc-card-tags';
      iconTags.forEach(i => wrap.appendChild(i));
      card.appendChild(wrap);
    }

    // traits: popout trigger instead of always-visible row
    const traits = row.querySelectorAll('.TraitCompactContainer');
    if (traits.length) {
      const traitsTrigger = document.createElement('span');
      traitsTrigger.className = 'vc-traits-trigger';
      traitsTrigger.textContent = '\u2726' + traits.length;
      traitsTrigger.title = 'Show traits';

      const traitsPopout = document.createElement('div');
      traitsPopout.className = 'vc-popout';
      const traitsWrap = document.createElement('div');
      traitsWrap.className = 'vc-popout-traits';
      traits.forEach(t => traitsWrap.appendChild(t.cloneNode(true)));
      traitsPopout.appendChild(traitsWrap);

      traitsTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllPopouts(traitsPopout);
        positionPopout(card, traitsPopout);
        traitsPopout.classList.toggle('vc-popout-visible');
      });

      card.appendChild(traitsTrigger);
      card.appendChild(traitsPopout);
    }

    // units: single vertical column
    const units = row.querySelectorAll('.Unit_Wrapper');
    if (units.length) {
      const wrap = document.createElement('div');
      wrap.className = 'vc-card-units';
      units.forEach(u => wrap.appendChild(u.cloneNode(true)));
      card.appendChild(wrap);
    }

    // stats: compact top-right overlay (avg place + win rate only)
    const statsContainer = row.querySelector('.Comp_Stats');
    if (statsContainer) {
      const wrap = document.createElement('div');
      wrap.className = 'vc-card-stats';

      const statRows = statsContainer.querySelectorAll(':scope .Comp_Stats_Row .Stat_Number');
      statRows.forEach(numEl => {
        const parentRow = numEl.closest('.Comp_Stats_Row');
        const labelEl = parentRow?.querySelector('.Stat_Text');
        if (!labelEl) return;

        const labelText = labelEl.textContent.trim();
        // only show avg place and win rate for compactness
        let shortLabel = '';
        if (labelText === 'Avg Place') shortLabel = 'AP';
        else if (labelText === 'Win Rate') shortLabel = 'W';
        else if (labelText === 'Pick Rate') shortLabel = 'P';
        else return;

        const stat = document.createElement('div');
        stat.className = 'vc-stat';

        const lbl = document.createElement('span');
        lbl.className = 'vc-stat-label';
        lbl.textContent = shortLabel;

        const val = document.createElement('span');
        val.className = 'vc-stat-value';
        val.textContent = numEl.textContent.trim();
        val.style.color = numEl.style.color || '#ccc';

        stat.appendChild(lbl);
        stat.appendChild(val);
        wrap.appendChild(stat);
      });

      if (wrap.children.length) card.appendChild(wrap);
    }

    // fallback: if nothing matched, clone the whole row
    if (card.children.length === 0) {
      card.innerHTML = row.innerHTML;
    }

    return card;
  }

  // ---- popout helpers ----
  function closeAllPopouts(except) {
    document.querySelectorAll('.vc-popout.vc-popout-visible').forEach(p => {
      if (p !== except) p.classList.remove('vc-popout-visible', 'vc-popout-above', 'vc-popout-below');
    });
  }

  // position popout above or below the card depending on viewport space
  // dynamically measures the site's sticky header so it never hides behind it
  function positionPopout(card, popout) {
    popout.classList.remove('vc-popout-above', 'vc-popout-below');
    const rect = card.getBoundingClientRect();
    // find the bottom edge of the sticky nav bar
    const nav = document.querySelector('.NavBarContainerMain');
    const navBottom = nav ? nav.getBoundingClientRect().bottom : 0;
    // add some breathing room for the popout height
    const threshold = navBottom + 60;
    if (rect.top < threshold) {
      popout.classList.add('vc-popout-below');
    } else {
      popout.classList.add('vc-popout-above');
    }
  }

  document.addEventListener('click', () => closeAllPopouts());

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

      // hide original, show grid, collapse header
      if (compList) compList.classList.add('vc-original-hidden');
      cardGrid.classList.add('vc-active');
      document.body.classList.add('vc-mode-active');

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
      document.body.classList.remove('vc-mode-active');
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
        <input type="range" id="metatft-vc-width" min="60" max="300" value="${CARD_MIN_WIDTH}" step="10">
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
