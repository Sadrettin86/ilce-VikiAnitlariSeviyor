// ================================================================
// sidebar.js — İlçe seçilince açılan QID listesi
// ================================================================

let _state  = null;
let _filter = 'all';   // 'all' | 'image' | 'category'
let _openQid = null;   // accordion açık olan QID

export function initSidebar(state) { _state = state; }

// ----------------------------------------------------------------
// SIDEBAR AÇ / KAPAT
// ----------------------------------------------------------------
export function openSidebar(districtLabel, items) {
  _openQid = null;
  _filter  = 'all';
  document.querySelectorAll('.fbtn').forEach(b => {
    b.classList.toggle('on', b.dataset.f === 'all');
  });

  const titleEl   = document.getElementById('sidebar-title');
  const sidebarEl = document.getElementById('sidebar');
  if (titleEl)   titleEl.textContent    = districtLabel;
  if (sidebarEl) sidebarEl.style.display = 'flex';
  renderItems(items);
}

export function closeSidebar() {
  const el = document.getElementById('sidebar');
  if (el) el.style.display = 'none';
}

// ----------------------------------------------------------------
// RENDER
// ----------------------------------------------------------------
export function renderItems(items) {
  if (items === undefined) items = _state.currentItems || [];
  _state.currentItems = items;

  const filtered = applyFilter(items);
  const list     = document.getElementById('item-list');
  const count    = document.getElementById('item-count');

  if (count) count.textContent = `${filtered.length} öğe`;

  if (!filtered.length) {
    list.innerHTML = `<div class="info-txt">Bu filtrede öğe yok</div>`;
    return;
  }

  list.innerHTML = filtered.map(item => {
    const isOpen    = _openQid === item.qid;
    const imgBadge  = item.hasImage  ? `<span class="badge badge-img">Görsel</span>` : '';
    const catBadge  = item.p373      ? `<span class="badge badge-cat">Kategori</span>` : '';
    const accordion = isOpen ? renderAccordion(item) : '';
    return `
      <div class="qitem${isOpen ? ' open' : ''}" onclick="window._qSel('${item.qid}')">
        <div class="qitem-head">
          <div class="qitem-left">
            <a class="qid-link" href="https://www.wikidata.org/wiki/${item.qid}"
               target="_blank" onclick="event.stopPropagation()">${item.qid}</a>
            <span class="qitem-label">${item.label || '–'}</span>
          </div>
          <div class="qitem-badges">${imgBadge}${catBadge}</div>
          <span class="qitem-arrow">${isOpen ? '▲' : '▼'}</span>
        </div>
        ${accordion}
      </div>`;
  }).join('');
}

function renderAccordion(item) {
  const catLine = item.p373
    ? `<a href="https://commons.wikimedia.org/wiki/Category:${encodeURIComponent(item.p373)}"
          target="_blank" class="acc-link">📁 ${item.p373}</a>`
    : `<span class="acc-empty">P373 değeri yok</span>`;
  return `<div class="qitem-body">
    ${catLine}
    <a class="upload-btn" href="upload.html?qid=${item.qid}" target="_blank">📤 Yükle</a>
  </div>`;
}

function applyFilter(items) {
  if (_filter === 'image')    return items.filter(i => i.hasImage);
  if (_filter === 'noimage')  return items.filter(i => !i.hasImage);
  if (_filter === 'category') return items.filter(i => i.p373);
  if (_filter === 'nocat')    return items.filter(i => !i.p373);
  return items;
}

// Nokta modu: haritada görünen öğeleri sidebar'da listele
export function renderPointsList(items) {
  const sidebarEl = document.getElementById('sidebar');
  const titleEl   = document.getElementById('sidebar-title');
  const countEl   = document.getElementById('item-count');
  const listEl    = document.getElementById('item-list');
  if (!sidebarEl) return;

  if (!items || !items.length) {
    sidebarEl.style.display = 'none';
    return;
  }

  sidebarEl.style.display = 'flex';
  if (titleEl) titleEl.textContent = 'Haritadaki öğeler';
  if (countEl) countEl.textContent = `${items.length} öğe`;
  // Filtre butonlarını gizle nokta modunda
  const filterEl = document.getElementById('filter-btns');
  if (filterEl) filterEl.style.display = 'none';

  if (!listEl) return;
  listEl.innerHTML = items.map(item => {
    const imgBadge = item.hasImage ? `<span class="badge badge-img">📷</span>` : '';
    const catBadge = item.p373    ? `<span class="badge badge-cat">📁</span>` : '';
    return `
      <div class="qitem" onclick="window._pointSel('${item.qid}')">
        <div class="qitem-head">
          <div class="qitem-left">
            <a class="qid-link" href="https://www.wikidata.org/wiki/${item.qid}"
               target="_blank" onclick="event.stopPropagation()">${item.qid}</a>
            <span class="qitem-label">${item.label || '–'}</span>
          </div>
          <div class="qitem-badges">${imgBadge}${catBadge}</div>
        </div>
      </div>`;
  }).join('');
}

export function showFilterBtns() {
  const filterEl = document.getElementById('filter-btns');
  if (filterEl) filterEl.style.display = 'flex';
}
export function openQidFromMap(qid) {
  _openQid = qid;
  renderItems();
  // O QID'nin elemanına scroll et
  setTimeout(() => {
    const el = document.querySelector(`.qitem.open`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 50);
}

// ----------------------------------------------------------------
// FİLTRE
// ----------------------------------------------------------------
export function setItemFilter(f) {
  _filter = f;
  document.querySelectorAll('.fbtn').forEach(b => {
    b.classList.toggle('on', b.dataset.f === f);
  });
  renderItems();
}

// ----------------------------------------------------------------
// ACCORDION
// ----------------------------------------------------------------
export function toggleAccordion(qid) {
  _openQid = (_openQid === qid) ? null : qid;
  renderItems();
}

// ----------------------------------------------------------------
// OVERLAY
// ----------------------------------------------------------------
export function setOverlay(txt) {
  const o = document.getElementById('overlay');
  const l = document.getElementById('overlay-lbl');
  if (o) o.classList.remove('hidden');
  if (l) l.textContent = txt;
}
export function hideOverlay() {
  const o = document.getElementById('overlay');
  if (o) o.classList.add('hidden');
}
