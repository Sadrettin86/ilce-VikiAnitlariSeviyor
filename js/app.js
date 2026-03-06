// ================================================================
// app.js — Ana uygulama akışı, state yönetimi
// ================================================================

import { GEOJSON_URL, PROV_URL, RELATIONS_URL }                    from "./config.js";
import { checkCommons, fetchAdminPoints }                           from "./wikidata.js";
import { renderProvinces, renderDistricts, refreshDistrictLayer,
         highlightDistrict, showProvHighlight, getProvBounds,
         highlightProvLayer, showAdminMarker, removeAdminMarkers }  from "./map.js";
import { initSidebar, renderList, openDetail, closeDetail,
         updateStats, scrollActiveIntoView,
         setOverlay, hideOverlay }                                  from "./sidebar.js";

// ----------------------------------------------------------------
// UYGULAMA STATE
// ----------------------------------------------------------------
const state = {
  features:       [],   // ilçe GeoJSON features
  provFeatures:   [],   // il GeoJSON features
  relations:      {},   // relation_id → { qid, label, ... }
  matches:        {},   // feature index → { qid, label, ... }  (türetilir)
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

  const [distResp, provResp, relResp] = await Promise.all([
    fetch(GEOJSON_URL),
    fetch(PROV_URL),
    fetch(RELATIONS_URL + '?_=' + Date.now())
  ]);

  if (!distResp.ok) throw new Error('İlçe GeoJSON yüklenemedi');
  if (!provResp.ok) throw new Error('İl GeoJSON yüklenemedi');

  state.features     = (await distResp.json()).features;
  state.provFeatures = (await provResp.json()).features;
  state.relations    = relResp.ok ? (await relResp.json()) : {};

  // relation_id bazlı eşleştirmeyi index bazlı matches'e dönüştür
  buildMatches();

  renderProvinces(state.provFeatures, onProvinceClick);
  renderList([]);
  updateStats(state.features, state.matches);
  hideOverlay();
}

// GeoJSON feature'larındaki relation_id → relations.json eşleştirmesi
function buildMatches() {
  state.matches = {};
  state.features.forEach((feat, idx) => {
    const relId = String(feat.properties?.relation_id || '');
    if (relId && state.relations[relId]) {
      state.matches[String(idx)] = state.relations[relId];
    }
  });
}

// ----------------------------------------------------------------
// İL TIKLAMA
// ----------------------------------------------------------------
function onProvinceClick(pi) {
  state.activeProvIdx = pi;
  state.activeIdx     = null;
  highlightProvLayer(pi);
  closeDetail();
  removeAdminMarkers();
  const provBounds   = getProvBounds(pi);
  const provFeature  = state.provFeatures[pi];
  const districtIdxs = renderDistricts(state.features, state.matches, provBounds, onDistrictClick, provFeature);
  state.currentIdxList = districtIdxs;
  renderList(districtIdxs);
  updateStats(state.features, state.matches);
}

// ----------------------------------------------------------------
// İLÇE TIKLAMA
// ----------------------------------------------------------------
function onDistrictClick(idx) {
  const prev      = state.activeIdx;
  state.activeIdx = idx;
  highlightDistrict(prev, idx, state.matches);
  if (state.activeProvIdx !== null) showProvHighlight(state.provFeatures[state.activeProvIdx]);

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
// GLOBAL EVENT HANDLERS
// ----------------------------------------------------------------
window._sel      = (idx) => onDistrictClick(idx);
window._wdSearch = (idx) => {};
window.onSearch  = (v)   => { state.searchQ = v; renderList(); };
window.setFilter = (f, btn) => {
  state.filter = f;
  document.querySelectorAll('.fbtn').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  renderList();
};

// ----------------------------------------------------------------
// BAŞLAT
// ----------------------------------------------------------------
init().catch(e => { hideOverlay(); alert('Yükleme hatası: ' + e.message); });
