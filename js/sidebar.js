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

  document.getElementById('sidebar-title').textContent = districtLabel;
  document.getElementById('sidebar').style.display     = 'flex';
  renderItems(items);
}

export function closeSidebar() {
  document.getElementById('sidebar').style.display = 'none';
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

  count.textContent = `${filtered.length} öğe`;

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
  return `<div class="qitem-body">${catLine}</div>`;
}

function applyFilter(items) {
  if (_filter === 'image')    return items.filter(i => i.hasImage);
  if (_filter === 'noimage')  return items.filter(i => !i.hasImage);
  if (_filter === 'category') return items.filter(i => i.p373);
  if (_filter === 'nocat')    return items.filter(i => !i.p373);
  return items;
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
  document.getElementById('overlay').classList.remove('hidden');
  document.getElementById('overlay-lbl').textContent = txt;
}
export function hideOverlay() { document.getElementById('overlay').classList.add('hidden'); }
