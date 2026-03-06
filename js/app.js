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

  // Sayfa açılışında hash varsa oraya git
  navigateToHash();
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
// HASH YÖNETİMİ
// ----------------------------------------------------------------
function setHash(type, relationId) {
  history.replaceState(null, '', `#${type}/${relationId}`);
}

function clearHash() {
  history.replaceState(null, '', window.location.pathname);
}

function navigateToHash() {
  const hash = window.location.hash; // örn: #province/2167999 veya #district/2167999
  if (!hash) return;

  const [, type, relId] = hash.match(/^#(province|district)\/(\d+)$/) || [];
  if (!type || !relId) return;

  if (type === 'province') {
    const pi = state.provFeatures.findIndex(f =>
      String(f.properties?.['@id'] || f.properties?.relation_id || '').includes(relId)
    );
    if (pi !== -1) onProvinceClick(pi);

  } else if (type === 'district') {
    // Önce ilçeyi bul
    const idx = state.features.findIndex(f =>
      String(f.properties?.relation_id || '') === relId
    );
    if (idx === -1) return;

    // O ilçenin iline git
    const provBounds  = state.provFeatures.findIndex(pf => {
      // İlçenin bulunduğu ili bul: bounding box içinde hangi il var?
      try {
        const distFeat = state.features[idx];
        const coords   = distFeat.geometry?.coordinates?.[0]?.[0] || distFeat.geometry?.coordinates?.[0];
        const pt       = Array.isArray(coords?.[0]) ? coords[0] : coords;
        if (!pt) return false;
        // İlin geometrisinin bbox'ını kontrol et
        const pBounds  = L.geoJSON(pf).getBounds();
        return pBounds.contains([pt[1], pt[0]]);
      } catch(e) { return false; }
    });

    const pi = provBounds !== -1 ? provBounds : null;
    if (pi !== null) {
      state.activeProvIdx = pi;
      highlightProvLayer(pi);
      const pb        = getProvBounds(pi);
      const pf        = state.provFeatures[pi];
      const idxList   = renderDistricts(state.features, state.matches, pb, onDistrictClick, pf);
      state.currentIdxList = idxList;
    }
    onDistrictClick(idx);
  }
}

// Browser geri/ileri tuşlarını dinle
window.addEventListener('hashchange', navigateToHash);

// ----------------------------------------------------------------
// İL TIKLAMA
// ----------------------------------------------------------------
function onProvinceClick(pi) {
  state.activeProvIdx = pi;
  state.activeIdx     = null;
  highlightProvLayer(pi);
  closeSidebar();
  removeAdminMarkers();

  const provFeature = state.provFeatures[pi];
  const relId       = String(provFeature?.properties?.['@id'] || '').replace('relation/', '')
                   || String(provFeature?.properties?.relation_id || '');
  if (relId) setHash('province', relId); else clearHash();

  const provBounds     = getProvBounds(pi);
  const idxList        = renderDistricts(state.features, state.matches, provBounds, onDistrictClick, provFeature);
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

  // Hash güncelle
  const relId = String(state.features[idx]?.properties?.relation_id || '');
  if (relId) setHash('district', relId); else clearHash();

  const m = state.matches[String(idx)];
  if (!m?.qid) {
    closeSidebar();
    return;
  }

  openSidebar(m.label || `İlçe #${idx+1}`, []);
  setOverlay('Öğeler yükleniyor...');

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
window._qSel        = (qid) => {
  toggleAccordion(qid);
  const relId    = String(state.features[state.activeIdx]?.properties?.relation_id || '');
  const isNowOpen = document.querySelector(`.qitem.open`); // render sonrası kontrol
  if (relId) {
    const hash = isNowOpen ? `#district/${relId}/qid/${qid}` : `#district/${relId}`;
    history.replaceState(null, '', hash);
  }
};
window.setItemFilter= (f, btn) => setItemFilter(f);
window.toggleLocate = () => toggleLocate();
window.toggleLayer  = () => toggleLayer();
window.zoomIn       = () => zoomIn();
window.zoomOut      = () => zoomOut();

// ----------------------------------------------------------------
// BAŞLAT
// ----------------------------------------------------------------
init().catch(e => { hideOverlay(); alert('Yükleme hatası: ' + e.message); });
