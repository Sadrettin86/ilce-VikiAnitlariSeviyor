// ================================================================
// app.js — Ana uygulama akışı
// ================================================================

import { GEOJSON_URL, PROV_URL, RELATIONS_URL }                    from "./config.js";
import { fetchDistrictItems, fetchAdminPoints }                    from "./wikidata.js";
import { renderProvinces, renderDistricts, refreshDistrictLayer,
         highlightDistrict, getProvBounds,
         highlightProvLayer, showAdminMarker, removeAdminMarkers,
         toggleLocate, toggleLayer, zoomIn, zoomOut }              from "./map.js";
import { initSidebar, openSidebar, closeSidebar, renderItems,
         setItemFilter, toggleAccordion,
         setOverlay, hideOverlay }                                  from "./sidebar.js";

// ----------------------------------------------------------------
// STATE
// ----------------------------------------------------------------
const state = {
  features:      [],
  provFeatures:  [],
  relations:     {},
  matches:       {},
  activeIdx:     null,
  activeProvIdx: null,
  currentItems:  [],
  currentIdxList:[],
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

  buildMatches();
  renderProvinces(state.provFeatures, onProvinceClick);
  hideOverlay();
}

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
  closeSidebar();
  removeAdminMarkers();

  const provBounds  = getProvBounds(pi);
  const provFeature = state.provFeatures[pi];
  const idxList     = renderDistricts(state.features, state.matches, provBounds, onDistrictClick, provFeature);
  state.currentIdxList = idxList;
}

// ----------------------------------------------------------------
// İLÇE TIKLAMA
// ----------------------------------------------------------------
async function onDistrictClick(idx) {
  const prev      = state.activeIdx;
  state.activeIdx = idx;
  highlightDistrict(prev, idx, state.matches);
  removeAdminMarkers();

  const m = state.matches[String(idx)];
  if (!m?.qid) {
    closeSidebar();
    return;
  }

  // Sidebar'ı hemen aç, yükleniyor göster
  openSidebar(m.label || `İlçe #${idx+1}`, []);
  setOverlay('Öğeler yükleniyor...');

  // Paralel: harita noktaları + sidebar item listesi
  const [items, points] = await Promise.all([
    fetchDistrictItems(m.qid),
    fetchAdminPoints(m.qid)
  ]);

  hideOverlay();
  points.forEach(p => showAdminMarker(p.lat, p.lng, p.label));
  openSidebar(m.label || `İlçe #${idx+1}`, items);
}

// ----------------------------------------------------------------
// GLOBAL HANDLERS
// ----------------------------------------------------------------
window._sel         = (idx) => onDistrictClick(idx);
window._qSel        = (qid) => toggleAccordion(qid);
window.setItemFilter= (f, btn) => setItemFilter(f);
window.toggleLocate = () => toggleLocate();
window.toggleLayer  = () => toggleLayer();
window.zoomIn       = () => zoomIn();
window.zoomOut      = () => zoomOut();

// ----------------------------------------------------------------
// BAŞLAT
// ----------------------------------------------------------------
init().catch(e => { hideOverlay(); alert('Yükleme hatası: ' + e.message); });
