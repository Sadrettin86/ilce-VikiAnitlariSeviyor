// ================================================================
// app.js — Ana uygulama akışı, state yönetimi
// ================================================================

import { GEOJSON_URL, PROV_URL }                                   from "./config.js";
import { loadMatches, saveMatch, deleteMatch }                      from "./firebase.js";
import { checkCommons, fetchAdminPoints }                                from "./wikidata.js";
import { renderProvinces, renderDistricts, refreshDistrictLayer,
         highlightDistrict, showProvHighlight, getProvBounds,
         highlightProvLayer, getDistrictCenter,
         showAdminMarker, removeAdminMarkers }                       from "./map.js";
import { initSidebar, renderList, openDetail, closeDetail,
         showCurrentMatch, showCommonsBox, showSuggestions,
         runWdSearch, updateStats, scrollActiveIntoView,
         setOverlay, hideOverlay, updateDetailTitle }               from "./sidebar.js";

// ----------------------------------------------------------------
// UYGULAMA STATE
// ----------------------------------------------------------------
const state = {
  features:       [],
  provFeatures:   [],
  matches:        {},
  activeIdx:      null,
  activeProvIdx:  null,
  filter:         'all',
  searchQ:        '',
  currentIdxList: [],
};

initSidebar(state);

// ----------------------------------------------------------------
// INIT
// ----------------------------------------------------------------
async function init() {
  setOverlay('Harita yükleniyor...');

  const [distResp, provResp] = await Promise.all([fetch(GEOJSON_URL), fetch(PROV_URL)]);
  if (!distResp.ok) throw new Error('İlçe GeoJSON yüklenemedi');
  if (!provResp.ok) throw new Error('İl GeoJSON yüklenemedi');

  state.features     = (await distResp.json()).features;
  state.provFeatures = (await provResp.json()).features;

  setOverlay('Eşleştirmeler yükleniyor...');
  state.matches = await loadMatches();

  renderProvinces(state.provFeatures, onProvinceClick);
  renderList([]);
  updateStats(state.features, state.matches);
  hideOverlay();
}

// ----------------------------------------------------------------
// İL TIKLAMA
// ----------------------------------------------------------------
function onProvinceClick(pi) {
  state.activeProvIdx = pi;
  state.activeIdx     = null;

  highlightProvLayer(pi);
  closeDetail();

  const provBounds   = getProvBounds(pi);
  const districtIdxs = renderDistricts(state.features, state.matches, provBounds, onDistrictClick);

  state.currentIdxList = districtIdxs;
  renderList(districtIdxs);
  updateStats(state.features, state.matches);
}

// ----------------------------------------------------------------
// İLÇE TIKLAMA
// ----------------------------------------------------------------
function onDistrictClick(idx) {
  const prev         = state.activeIdx;
  state.activeIdx    = idx;

  highlightDistrict(prev, idx, state.matches);

  // Seçili ilin sınırını mor göster
  if (state.activeProvIdx !== null) {
    showProvHighlight(state.provFeatures[state.activeProvIdx]);
  }

  // P11729 — ilçeye bağlı tüm idari merkez noktaları
  removeAdminMarkers();
  const m = state.matches[String(idx)];
  if (m?.qid) {
    fetchAdminPoints(m.qid).then(points => {
      points.forEach(p => showAdminMarker(p.lat, p.lng, p.label));
    });
  }

  renderList();
  scrollActiveIntoView();
  openDetail(idx);
}

// ----------------------------------------------------------------
// EŞLEŞTİRME UYGULA
// ----------------------------------------------------------------
window._applySug = function(idx, si) {
  const r = window._sugData?.[si];
  if (r) applyMatch(idx, r.id, r.label || r.id);
};

window._apply = applyMatch;

async function applyMatch(idx, qid, label) {
  document.getElementById('match-area').innerHTML = `<div class="info-txt">⏳ Commons kontrol ediliyor...</div>`;
  document.getElementById('commons-box').style.display = 'none';

  const { commonsCategory, hasBuildings, buildingsCat } = await checkCommons(qid);
  const data = {
    qid, label,
    commonsCategory: commonsCategory || '',
    hasBuildings:    !!hasBuildings,
    buildingsCat:    buildingsCat || '',
    updatedAt:       new Date().toISOString()
  };

  await saveMatch(idx, data);
  state.matches[String(idx)] = data;

  updateDetailTitle(label);
  showCurrentMatch(idx, data);
  showCommonsBox(data);
  refreshDistrictLayer(state.matches, idx);
  renderList();
  updateStats(state.features, state.matches);
}

// ----------------------------------------------------------------
// EŞLEŞTİRME SİL
// ----------------------------------------------------------------
window._remove = async function(idx) {
  await deleteMatch(idx);
  delete state.matches[String(idx)];

  document.getElementById('commons-box').style.display = 'none';
  document.getElementById('detail-title').textContent = `📍 İlçe #${idx + 1}`;
  refreshDistrictLayer(state.matches, idx);
  renderList();
  updateStats(state.features, state.matches);
  showSuggestions(idx);
};

// ----------------------------------------------------------------
// GLOBAL EVENT HANDLERS (HTML'den çağrılır)
// ----------------------------------------------------------------
window._sel       = (idx) => onDistrictClick(idx);
window._wdSearch  = (idx) => runWdSearch(idx);
window.onSearch   = (v)   => { state.searchQ = v; renderList(); };
window.setFilter  = (f, btn) => {
  state.filter = f;
  document.querySelectorAll('.fbtn').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  renderList();
};

// ----------------------------------------------------------------
// BAŞLAT
// ----------------------------------------------------------------
init().catch(e => { hideOverlay(); alert('Yükleme hatası: ' + e.message); });
