// ================================================================
// app.js — Ana uygulama akışı, state yönetimi
// ================================================================

import { GEOJSON_URL, PROV_URL }                                   from "./config.js";
import { loadMatches, saveMatch, deleteMatch }                      from "./firebase.js";
import { checkCommons, fetchP11729 }                                from "./wikidata.js";
import { renderProvinces, renderDistricts, refreshDistrictLayer,
         highlightDistrict, showProvHighlight, getProvBounds,
         highlightProvLayer, getDistrictCenter,
         showAdminMarker, removeAdminMarker }                       from "./map.js";
import { initSidebar, renderList, openDetail, closeDetail,
         showCurrentMatch, showCommonsBox, showSuggestions,
         runWdSearch, updateStats, scrollActiveIntoView,
         setOverlay, hideOverlay, updateDetailTitle }               from "./sidebar.js";

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

function onProvinceClick(pi) {
  state.activeProvIdx = pi;
  state.activeIdx     = null;
  highlightProvLayer(pi);
  closeDetail();
  removeAdminMarker();
  const provBounds   = getProvBounds(pi);
  const districtIdxs = renderDistricts(state.features, state.matches, provBounds, onDistrictClick);
  state.currentIdxList = districtIdxs;
  renderList(districtIdxs);
  updateStats(state.features, state.matches);
}

function onDistrictClick(idx) {
  const prev      = state.activeIdx;
  state.activeIdx = idx;
  highlightDistrict(prev, idx, state.matches);
  if (state.activeProvIdx !== null) showProvHighlight(state.provFeatures[state.activeProvIdx]);

  // P11729 idari merkez noktası
  removeAdminMarker();
  const m = state.matches[String(idx)];
  if (m?.qid) {
    fetchP11729(m.qid).then(coord => {
      if (coord) showAdminMarker(coord.lat, coord.lng, m.label);
    });
  }

  renderList();
  scrollActiveIntoView();
  openDetail(idx);
}

window._applySug = function(idx, si) {
  const r = window._sugData?.[si];
  if (r) applyMatch(idx, r.id, r.label || r.id);
};
window._apply = applyMatch;

async function applyMatch(idx, qid, label) {
  document.getElementById('match-area').innerHTML = `<div class="info-txt">⏳ Commons kontrol ediliyor...</div>`;
  document.getElementById('commons-box').style.display = 'none';
  const { commonsCategory, hasBuildings, buildingsCat } = await checkCommons(qid);
  const data = { qid, label, commonsCategory: commonsCategory||'', hasBuildings: !!hasBuildings, buildingsCat: buildingsCat||'', updatedAt: new Date().toISOString() };
  await saveMatch(idx, data);
  state.matches[String(idx)] = data;
  updateDetailTitle(label);
  showCurrentMatch(idx, data);
  showCommonsBox(data);
  refreshDistrictLayer(state.matches, idx);
  // Eşleştirme yapılınca noktayı hemen göster
  fetchP11729(qid).then(coord => {
    if (coord) showAdminMarker(coord.lat, coord.lng, label);
  });
  renderList();
  updateStats(state.features, state.matches);
}

window._remove = async function(idx) {
  await deleteMatch(idx);
  delete state.matches[String(idx)];
  document.getElementById('commons-box').style.display = 'none';
  document.getElementById('detail-title').textContent = `📍 İlçe #${idx + 1}`;
  refreshDistrictLayer(state.matches, idx);
  removeAdminMarker();
  renderList();
  updateStats(state.features, state.matches);
  showSuggestions(idx);
};

window._sel      = (idx) => onDistrictClick(idx);
window._wdSearch = (idx) => runWdSearch(idx);
window.onSearch  = (v)   => { state.searchQ = v; renderList(); };
window.setFilter = (f, btn) => {
  state.filter = f;
  document.querySelectorAll('.fbtn').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  renderList();
};

init().catch(e => { hideOverlay(); alert('Yükleme hatası: ' + e.message); });
