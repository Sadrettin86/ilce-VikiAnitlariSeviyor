// ================================================================
// sidebar.js — Sidebar liste, filtre, detay paneli
// ================================================================

import { searchWikidata, checkCommons } from "./wikidata.js";

let _state = null; // app.js'den inject edilir

export function initSidebar(state) {
  _state = state;
}

// ----------------------------------------------------------------
// LİSTE
// ----------------------------------------------------------------
export function renderList(idxList) {
  if (idxList !== undefined) _state.currentIdxList = idxList;
  const filtered = getFiltered();

  document.getElementById('list-label').textContent = `${filtered.length} ilçe`;

  if (!filtered.length && !_state.currentIdxList?.length) {
    document.getElementById('district-list').innerHTML =
      `<div class="info-txt" style="padding:20px;color:#9ca3af">Haritada bir ile tıkla</div>`;
    return;
  }

  document.getElementById('district-list').innerHTML = filtered.map(({ idx, match }) => {
    const name   = match?.label || `İlçe #${idx + 1}`;
    const dotCls = match?.hasBuildings ? 'dot-g' : match?.qid ? 'dot-y' : 'dot-x';
    const meta   = match?.qid ? match.qid : 'Eşleştirilmedi';
    return `<div class="ditem${_state.activeIdx === idx ? ' active' : ''}" onclick="window._sel(${idx})">
      <div class="dname"><span class="dot ${dotCls}"></span>${name}</div>
      <div class="dmeta">${meta}</div>
    </div>`;
  }).join('');
}

function getFiltered() {
  const list = (_state.currentIdxList || [])
    .map(i => ({ idx: i, match: _state.matches[String(i)] }));

  let filtered = list;
  if (_state.searchQ) {
    const q = _state.searchQ.toLowerCase();
    filtered = filtered.filter(d => (d.match?.label || '').toLowerCase().includes(q));
  }
  if      (_state.filter === 'matched')   filtered = filtered.filter(d => d.match?.qid);
  else if (_state.filter === 'buildings') filtered = filtered.filter(d => d.match?.hasBuildings);
  else if (_state.filter === 'unmatched') filtered = filtered.filter(d => !d.match?.qid);

  return filtered.sort((a, b) => {
    if (a.match?.label && b.match?.label) return a.match.label.localeCompare(b.match.label, 'tr');
    if (a.match?.label) return -1;
    if (b.match?.label) return 1;
    return a.idx - b.idx;
  });
}

export function scrollActiveIntoView() {
  setTimeout(() => {
    const el = document.querySelector('.ditem.active');
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, 50);
}

// ----------------------------------------------------------------
// DETAY PANELİ
// ----------------------------------------------------------------
export function openDetail(idx) {
  const m    = _state.matches[String(idx)];
  const name = m?.label || `İlçe #${idx + 1}`;
  document.getElementById('detail').style.display = 'block';
  document.getElementById('detail-title').textContent = `📍 ${name}`;
  document.getElementById('commons-box').style.display = 'none';
  if (m?.qid) { showCurrentMatch(idx, m); showCommonsBox(m); }
  else         { showSuggestions(idx); }
}

export function closeDetail() {
  document.getElementById('detail').style.display = 'none';
}

export function updateDetailTitle(label) {
  document.getElementById('detail-title').textContent = `📍 ${label}`;
}

export function showCurrentMatch(idx, m) {
  document.getElementById('match-area').innerHTML = `
    <div class="cur-match">
      <div>
        <div class="cur-qid">${m.qid}</div>
        <div class="cur-lbl">${m.label || ''}</div>
      </div>
      <button class="xbtn" onclick="window._remove(${idx})" title="Eşleştirmeyi sil">✕</button>
    </div>`;
}

export function showCommonsBox(m) {
  const box = document.getElementById('commons-box');
  box.style.display = 'block';
  if (!m.commonsCategory) {
    box.className = 'no'; box.innerHTML = '📁 Wikidata\'da P373 değeri yok';
  } else if (m.hasBuildings) {
    const url = `https://commons.wikimedia.org/wiki/Category:${encodeURIComponent(m.buildingsCat)}`;
    box.className = 'ok'; box.innerHTML = `✅ <a href="${url}" target="_blank">Category:${m.buildingsCat}</a>`;
  } else {
    box.className = 'no'; box.innerHTML = `❌ "Buildings in ${m.commonsCategory}" kategorisi yok`;
  }
}

export async function showSuggestions(idx) {
  document.getElementById('match-area').innerHTML = `
    <div style="display:flex;gap:6px;margin-bottom:8px">
      <input id="wd-search"
        style="flex:1;background:#fff;border:1px solid #dde1ea;border-radius:6px;padding:6px 10px;color:#1e2433;font-size:12px;outline:none"
        placeholder="İlçe adını yaz, Enter'a bas..."
        onkeydown="if(event.key==='Enter')window._wdSearch(${idx})">
      <button onclick="window._wdSearch(${idx})"
        style="background:#7c3aed;border:none;color:white;padding:6px 14px;border-radius:6px;font-size:12px;cursor:pointer;font-weight:600">Ara</button>
    </div>
    <div id="sugs"></div>`;
  document.getElementById('wd-search').focus();
}

export async function runWdSearch(idx) {
  const q = document.getElementById('wd-search')?.value?.trim();
  if (!q) return;
  document.getElementById('sugs').innerHTML = `<div class="info-txt">Aranıyor...</div>`;
  try {
    const res = await searchWikidata(q);
    if (!res.length) { document.getElementById('sugs').innerHTML = `<div class="info-txt">Sonuç bulunamadı.</div>`; return; }
    window._sugData = res;
    document.getElementById('sugs').innerHTML = res.map((r, si) => `
      <div class="sug" onclick="window._applySug(${idx},${si})">
        <div class="sug-qid">${r.id}</div>
        <div>
          <div class="sug-name">${r.label || r.id}</div>
          <div class="sug-desc">${(r.description||'').replace(/</g,'&lt;')}</div>
        </div>
      </div>`).join('');
  } catch(e) {
    document.getElementById('sugs').innerHTML = `<div class="info-txt">Hata: ${e.message}</div>`;
  }
}

// ----------------------------------------------------------------
// STATS
// ----------------------------------------------------------------
export function updateStats(features, matches) {
  document.getElementById('s-total').textContent   = features.length;
  document.getElementById('s-matched').textContent = Object.keys(matches).length;
  document.getElementById('s-bldg').textContent    = Object.values(matches).filter(m => m.hasBuildings).length;
}

// ----------------------------------------------------------------
// OVERLAY
// ----------------------------------------------------------------
export function setOverlay(txt) {
  document.getElementById('overlay').classList.remove('hidden');
  document.getElementById('overlay-lbl').textContent = txt;
}
export function hideOverlay() { document.getElementById('overlay').classList.add('hidden'); }
