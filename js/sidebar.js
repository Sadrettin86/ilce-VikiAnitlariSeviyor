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

// Nokta modu: haritada görünen öğeleri sidebar'da listele (diff tabanlı)
let _pointsListQids = new Set(); // son render'daki QID'ler

function makePointItem(item) {
  const imgBadge = item.hasImage ? `<span class="badge badge-img">📷</span>` : '';
  const catBadge = item.p373    ? `<span class="badge badge-cat">📁</span>` : '';
  return `
    <div class="qitem" data-qid="${item.qid}" onclick="window._pointSel('${item.qid}')">
      <div class="qitem-head">
        <div class="qitem-left">
          <a class="qid-link" href="https://www.wikidata.org/wiki/${item.qid}"
             target="_blank" onclick="event.stopPropagation()">${item.qid}</a>
          <span class="qitem-label">${item.label || '–'}</span>
        </div>
        <div class="qitem-badges">${imgBadge}${catBadge}</div>
      </div>
    </div>`;
}

export function renderPointsList(items) {
  const sidebarEl = document.getElementById('sidebar');
  const titleEl   = document.getElementById('sidebar-title');
  const countEl   = document.getElementById('item-count');
  const listEl    = document.getElementById('item-list');
  const filterEl  = document.getElementById('filter-btns');
  if (!sidebarEl) return;

  if (!items || !items.length) {
    // Sidebar'ı gizleme — sadece listeyi boşalt, ani kayboluş olmasın
    _pointsListQids.clear();
    if (listEl) listEl.innerHTML = '<div style="padding:12px;color:#aaa;font-size:12px;text-align:center">Yakınlaştırın (zoom ≥ 13)</div>';
    if (countEl) countEl.textContent = '0 öğe';
    return;
  }

  // İlk kez açılıyorsa sidebar'ı göster
  if (sidebarEl.style.display !== 'flex') {
    sidebarEl.style.display = 'flex';
  }
  if (titleEl) titleEl.textContent = 'Haritadaki öğeler';
  if (countEl) countEl.textContent = `${items.length} öğe`;
  if (filterEl) filterEl.style.display = 'none';
  if (!listEl) return;

  const newQids = new Set(items.map(i => i.qid));

  // İlk yüklemede direkt render et
  if (_pointsListQids.size === 0) {
    listEl.innerHTML = items.map(makePointItem).join('');
    _pointsListQids = newQids;
    return;
  }

  // Diff: eklenenler ve çıkarılanlar
  const toRemove = [..._pointsListQids].filter(q => !newQids.has(q));
  const toAdd    = items.filter(i => !_pointsListQids.has(i.qid));

  // Çıkan satırları fade-out ile kaldır
  toRemove.forEach(qid => {
    const el = listEl.querySelector(`[data-qid="${qid}"]`);
    if (el) {
      el.style.transition = 'opacity 0.25s';
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 250);
    }
    _pointsListQids.delete(qid);
  });

  // Yeni satırları fade-in ile ekle
  toAdd.forEach(item => {
    const div = document.createElement('div');
    div.innerHTML = makePointItem(item).trim();
    const node = div.firstChild;
    node.style.opacity = '0';
    node.style.transition = 'opacity 0.35s';
    listEl.appendChild(node);
    requestAnimationFrame(() => requestAnimationFrame(() => { node.style.opacity = '1'; }));
    _pointsListQids.add(item.qid);
  });
}

export function showFilterBtns() {
  const filterEl = document.getElementById('filter-btns');
  if (filterEl) filterEl.style.display = 'flex';
}

export function resetPointsList() {
  _pointsListQids = new Set();
}
export function openQidFromMap(qid) {
  // Nokta modunda: DOM'da elemanı bul, sadece scroll et
  const existing = document.querySelector(`.qitem[onclick*="'${qid}'"]`);
  if (existing && (!_state.currentItems || !_state.currentItems.length)) {
    document.querySelectorAll('.qitem').forEach(el => el.classList.remove('open'));
    existing.classList.add('open');
    existing.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return;
  }

  // Normal district modu
  _openQid = qid;
  renderItems();
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
