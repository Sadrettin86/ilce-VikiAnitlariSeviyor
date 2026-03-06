// ================================================================
// map.js — Leaflet harita, il ve ilçe katmanları
// ================================================================

export const map = L.map('map', { zoomControl: false }).setView([39, 35], 6);

const osmTile = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> katkıda bulunanlar',
  maxZoom: 19
});
const cartoTile = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '© OpenStreetMap © CARTO', maxZoom: 19
});

osmTile.addTo(map);
let currentTile = 'osm';

let provLayers  = [];
let polyLayers  = [];
let activeProvIdx = null;

// ----------------------------------------------------------------
// İL KATMANI — sadece başlangıçta görünür, il seçilince gizlenir
// ----------------------------------------------------------------
export function renderProvinces(provFeatures, onProvinceClick) {
  provLayers.forEach(l => { if (l) map.removeLayer(l); });
  provLayers = [];
  provFeatures.forEach((feat, pi) => {
    const layer = L.geoJSON(feat, {
      style: { color: '#94a3b8', weight: 1, fillColor: '#64748b', fillOpacity: 0.04, opacity: 0.6 }
    });
    layer.on('click',     () => onProvinceClick(pi));
    layer.on('mouseover', () => {
      if (activeProvIdx !== null) return;
      layer.setStyle({ fillOpacity: 0.10, weight: 1.5, color: '#7c3aed' });
    });
    layer.on('mouseout',  () => {
      if (activeProvIdx !== null) return;
      layer.setStyle({ color: '#94a3b8', weight: 1, fillOpacity: 0.04 });
    });
    layer.addTo(map);
    provLayers[pi] = layer;
  });
}

export function highlightProvLayer(pi) {
  activeProvIdx = pi;
  provLayers.forEach(l => {
    if (!l) return;
    l.setStyle({ color: 'transparent', weight: 0, fillColor: 'transparent', fillOpacity: 0, opacity: 0 });
  });
  if (provLayers[pi]) {
    try { map.fitBounds(provLayers[pi].getBounds(), { padding: [30, 30] }); } catch(e) {}
  }
}

export function restoreProvLayers() {
  provLayers.forEach(l => {
    if (!l) return;
    l.setStyle({ color: '#94a3b8', weight: 1, fillColor: '#64748b', fillOpacity: 0.04, opacity: 0.6 });
  });
  activeProvIdx = null;
}

export function getProvBounds(pi) {
  return provLayers[pi]?.getBounds();
}

// ----------------------------------------------------------------
// İLÇE KATMANI
// ----------------------------------------------------------------
export function getDistrictStyle(matches, idx, isActive) {
  const m = matches[String(idx)];
  if (isActive) {
    if (!m)             return { color: '#475569', weight: 2, fillColor: '#475569', fillOpacity: 0.08, opacity: 1 };
    if (m.hasBuildings) return { color: '#059669', weight: 2, fillColor: '#059669', fillOpacity: 0.15, opacity: 1 };
    return                     { color: '#d97706', weight: 2, fillColor: '#d97706', fillOpacity: 0.10, opacity: 1 };
  }
  if (!m)             return { color: '#94a3b8', weight: 1, fillColor: '#94a3b8', fillOpacity: 0.04, opacity: 0.7 };
  if (m.hasBuildings) return { color: '#059669', weight: 1.2, fillColor: '#059669', fillOpacity: 0.12, opacity: 0.8 };
  return                     { color: '#d97706', weight: 1.2, fillColor: '#d97706', fillOpacity: 0.06, opacity: 0.8 };
}

export function renderDistricts(features, matches, provBounds, onDistrictClick, provFeature) {
  polyLayers.forEach(l => { if (l) map.removeLayer(l); });
  polyLayers = [];
  const districtIdxs = [];
  features.forEach((feat, idx) => {
    try {
      const style = getDistrictStyle(matches, idx, false);
      const layer = L.geoJSON(feat, { style });
      const center = layer.getBounds().getCenter();
      if (!provBounds.contains(center)) return;
      if (provFeature && !pointInGeoJSON(center, provFeature)) return;
      layer.on('click',     () => onDistrictClick(idx));
      layer.on('mouseover', () => layer.setStyle({ ...getDistrictStyle(matches, idx, false), fillOpacity: 0.18, weight: 2 }));
      layer.on('mouseout',  () => layer.setStyle(getDistrictStyle(matches, idx, false)));
      const m = matches[String(idx)];
      if (m?.label) layer.bindTooltip(m.label, { sticky: true });
      layer.addTo(map);
      polyLayers[idx] = layer;
      districtIdxs.push(idx);
    } catch(e) {}
  });
  return districtIdxs;
}

export function refreshDistrictLayer(matches, idx) {
  const layer = polyLayers[idx];
  if (!layer) return;
  layer.setStyle(getDistrictStyle(matches, idx, false));
  layer.unbindTooltip();
  const m = matches[String(idx)];
  if (m?.label) layer.bindTooltip(m.label, { sticky: true });
}

export function highlightDistrict(prevIdx, idx, matches) {
  polyLayers.forEach((l, i) => {
    if (!l) return;
    if (i === idx) {
      l.setStyle(getDistrictStyle(matches, i, true));
    } else {
      const base = getDistrictStyle(matches, i, false);
      l.setStyle({ ...base, fillOpacity: 0, fillColor: 'transparent' });
    }
  });
}

export function showProvHighlight() {
  // Artık kullanılmıyor — il sınırı gösterilmiyor
}

// ----------------------------------------------------------------
// NOKTA MODU — tüm il/ilçe katmanlarını gizle/göster
// ----------------------------------------------------------------
export function hideAllLayers() {
  provLayers.forEach(l => { if (l) l.remove(); });
  polyLayers.forEach(l => { if (l) l.remove(); });
}

export function showAllLayers() {
  provLayers.forEach(l => { if (l) l.addTo(map); });
  polyLayers.forEach(l => { if (l) l.addTo(map); });
}

// Nokta modu marker'ları (adminMarkers'dan ayrı)
let pointMarkers = [];

export function clearPointMarkers() {
  pointMarkers.forEach(m => map.removeLayer(m));
  pointMarkers = [];
}

export function showPointMarkers(items, onMarkerClick) {
  clearPointMarkers();
  items.forEach(item => {
    const iconUrl = item.hasImage ? 'css/marker-green.png' : 'css/marker-red.png';
    const icon = L.icon({
      iconUrl,
      shadowUrl:    'css/marker-shadow.png',
      iconSize:     [25, 41], iconAnchor:   [12, 41],
      popupAnchor:  [1, -34], shadowSize:   [41, 41], shadowAnchor: [12, 41],
    });

    const p18thumb = item.p18file
      ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(item.p18file)}?width=100`
      : null;
    const imgHtml = p18thumb
      ? `<img src="${p18thumb}" style="width:72px;height:54px;object-fit:cover;border-radius:3px;flex-shrink:0">`
      : `<div style="width:72px;height:54px;background:#e8e8e8;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">📷</div>`;

    const popupHtml = `
      <div onclick="window.open('upload.html?qid=${item.qid}','_blank')" style="display:flex;gap:10px;align-items:center;cursor:pointer;min-width:200px;max-width:260px;padding:2px">
        ${imgHtml}
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:13px;color:#333;margin-bottom:3px;line-height:1.3">${item.label || item.qid}</div>
          <div style="font-size:11px;color:#888">${item.hasImage ? '📷 Fotoğraf var' : '📷 Fotoğraf yok'}</div>
          <div style="font-size:10px;color:#7ebc6f;margin-top:4px;font-weight:600">Yükle →</div>
        </div>
      </div>`;

    const marker = L.marker([item.lat, item.lng], { icon })
      .bindPopup(popupHtml, { maxWidth: 280, className: 'monument-popup' })
      .addTo(map);

    marker.on('click', () => { if (onMarkerClick) onMarkerClick(item.qid); });
    pointMarkers.push(marker);
  });
}

export function getMapBounds() { return map.getBounds(); }
export function getMapZoom()   { return map.getZoom(); }
export function onMapMoveEnd(fn) { map.on('moveend', fn); }
export function offMapMoveEnd(fn) { map.off('moveend', fn); }

// ----------------------------------------------------------------
// NOKTA (P11729)
// ----------------------------------------------------------------
let adminMarkers = [];

export function showAdminMarker(lat, lng, label, qid, hasImage, p18thumb) {
  const iconUrl = hasImage
    ? 'css/marker-green.png'
    : 'css/marker-red.png';

  const icon = L.icon({
    iconUrl,
    shadowUrl:    'css/marker-shadow.png',
    iconSize:     [25, 41],
    iconAnchor:   [12, 41],
    popupAnchor:  [1, -34],
    shadowSize:   [41, 41],
    shadowAnchor: [12, 41],
  });

  const imgHtml = p18thumb
    ? `<img src="${p18thumb}" style="width:72px;height:54px;object-fit:cover;border-radius:3px;flex-shrink:0">`
    : `<div style="width:72px;height:54px;background:#e8e8e8;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">📷</div>`;

  const popupHtml = `
    <div onclick="window.open('upload.html?qid=${qid}','_blank')" style="
      display:flex;gap:10px;align-items:center;cursor:pointer;
      min-width:200px;max-width:260px;padding:2px">
      ${imgHtml}
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:13px;color:#333;margin-bottom:3px;line-height:1.3">${label || qid}</div>
        <div style="font-size:11px;color:#888">${hasImage ? '📷 Fotoğraf var' : '📷 Fotoğraf yok'}</div>
        <div style="font-size:10px;color:#7ebc6f;margin-top:4px;font-weight:600">Yükle →</div>
      </div>
    </div>`;

  const marker = L.marker([lat, lng], { icon })
    .bindPopup(popupHtml, { maxWidth: 280, className: 'monument-popup' })
    .addTo(map);

  marker.on('click', () => {
    if (window._sidebarOpenQid) window._sidebarOpenQid(qid);
  });

  adminMarkers.push(marker);
}

export function removeAdminMarkers() {
  adminMarkers.forEach(m => map.removeLayer(m));
  adminMarkers = [];
}

// ----------------------------------------------------------------
// YARDIMCI
// ----------------------------------------------------------------
function pointInGeoJSON(latlng, geojsonFeature) {
  const pt = [latlng.lng, latlng.lat];
  const geom = geojsonFeature.geometry;
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  return polys.some(poly => pointInPolygon(pt, poly[0]));
}

function pointInPolygon(pt, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    if (((yi > pt[1]) !== (yj > pt[1])) &&
        (pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

// ----------------------------------------------------------------
// KONUM TAKİBİ
// ----------------------------------------------------------------
let locationMarker = null;
let locationCircle = null;
let watchId        = null;
let locating       = false;

export function toggleLocate() {
  if (locating) { stopLocate(); } else { startLocate(); }
}

function startLocate() {
  if (!navigator.geolocation) { alert('Tarayıcınız konum desteklemiyor.'); return; }
  locating = true;
  document.getElementById('btn-locate').classList.add('active');
  watchId = navigator.geolocation.watchPosition(
    pos => updateLocation(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
    ()  => stopLocate(),
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
  );
}

function stopLocate() {
  locating = false;
  document.getElementById('btn-locate').classList.remove('active');
  if (watchId !== null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
  if (locationMarker) { map.removeLayer(locationMarker); locationMarker = null; }
  if (locationCircle) { map.removeLayer(locationCircle); locationCircle = null; }
}

function updateLocation(lat, lng, accuracy) {
  const latlng = [lat, lng];
  if (!locationMarker) {
    map.setView(latlng, 14);
    const icon = L.divIcon({
      className: '',
      html: `<div style="width:14px;height:14px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 2px 6px rgba(37,99,235,.5)"></div>`,
      iconSize: [14, 14], iconAnchor: [7, 7]
    });
    locationMarker = L.marker(latlng, { icon, zIndexOffset: 1000 })
      .bindTooltip('Buradasınız', { permanent: false, direction: 'top' })
      .addTo(map);
    locationCircle = L.circle(latlng, {
      radius: accuracy, color: '#2563eb', fillColor: '#2563eb',
      fillOpacity: 0.08, weight: 1, opacity: 0.4
    }).addTo(map);
  } else {
    locationMarker.setLatLng(latlng);
    locationCircle.setLatLng(latlng);
    locationCircle.setRadius(accuracy);
  }
}

// ----------------------------------------------------------------
// KATMAN DEĞİŞTİR
// ----------------------------------------------------------------
export function toggleLayer() {
  if (currentTile === 'osm') {
    map.removeLayer(osmTile);
    cartoTile.addTo(map);
    currentTile = 'carto';
    document.getElementById('btn-layers').title = 'OpenStreetMap\'e geç';
  } else {
    map.removeLayer(cartoTile);
    osmTile.addTo(map);
    currentTile = 'osm';
    document.getElementById('btn-layers').title = 'Açık haritaya geç';
  }
}

// ----------------------------------------------------------------
// ZOOM
// ----------------------------------------------------------------
export function zoomIn()  { map.zoomIn(); }
export function zoomOut() { map.zoomOut(); }

export function getDistrictCenter(idx) {
  return polyLayers[idx]?.getBounds()?.getCenter();
}
