// ================================================================
// map.js — Leaflet harita, il ve ilçe katmanları
// ================================================================

export const map = L.map('map').setView([39, 35], 6);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '© OpenStreetMap © CARTO', maxZoom: 19
}).addTo(map);

let provLayers    = [];
let polyLayers    = [];
let activeProvLayer = null;

// ----------------------------------------------------------------
// İL KATMANI
// ----------------------------------------------------------------
export function renderProvinces(provFeatures, onProvinceClick) {
  provLayers.forEach(l => { if (l) map.removeLayer(l); });
  provLayers = [];

  provFeatures.forEach((feat, pi) => {
    const layer = L.geoJSON(feat, {
      style: { color: '#94a3b8', weight: 1, fillColor: '#64748b', fillOpacity: 0.04, opacity: 0.6 }
    });
    layer.on('click',     () => onProvinceClick(pi));
    layer.on('mouseover', () => layer.setStyle({ fillOpacity: 0.12, weight: 1.5, color: '#7c3aed' }));
    layer.on('mouseout',  () => layer.setStyle({ color: '#94a3b8', weight: 1, fillOpacity: 0.04 }));
    layer.addTo(map);
    provLayers[pi] = layer;
  });
}

export function highlightProvLayer(pi) {
  provLayers.forEach((l, i) => {
    if (!l) return;
    if (i === pi) l.setStyle({ color: '#7c3aed', weight: 2, fillColor: '#7c3aed', fillOpacity: 0.06 });
    else          l.setStyle({ color: '#94a3b8', weight: 1, fillColor: '#64748b', fillOpacity: 0.04 });
  });
  // Seçili ile zoom yap
  if (provLayers[pi]) {
    try { map.fitBounds(provLayers[pi].getBounds(), { padding: [30, 30] }); } catch(e) {}
  }
}

export function getProvBounds(pi) {
  return provLayers[pi]?.getBounds();
}

// ----------------------------------------------------------------
// İLÇE KATMANI
// ----------------------------------------------------------------
export function getDistrictStyle(matches, idx) {
  const m = matches[String(idx)];
  if (!m)             return { color: '#94a3b8', weight: 1.2, fillColor: '#94a3b8', fillOpacity: 0.08, opacity: 0.6 };
  if (m.hasBuildings) return { color: '#059669', weight: 1.5, fillColor: '#059669', fillOpacity: 0.20, opacity: 0.9 };
  return                     { color: '#d97706', weight: 1.5, fillColor: '#d97706', fillOpacity: 0.18, opacity: 0.9 };
}

export function renderDistricts(features, matches, provBounds, onDistrictClick, provFeature) {
  polyLayers.forEach(l => { if (l) map.removeLayer(l); });
  polyLayers = [];

  const districtIdxs = [];

  features.forEach((feat, idx) => {
    try {
      const style = getDistrictStyle(matches, idx);
      const layer = L.geoJSON(feat, { style });
      const center = layer.getBounds().getCenter();

      // Önce bbox ile hızlı filtre, sonra gerçek polygon içi kontrolü
      if (!provBounds.contains(center)) return;
      if (provFeature && !pointInGeoJSON(center, provFeature)) return;

      layer.on('click',     () => onDistrictClick(idx));
      layer.on('mouseover', () => layer.setStyle({ fillOpacity: style.fillOpacity + 0.12, weight: 2 }));
      layer.on('mouseout',  () => layer.setStyle(getDistrictStyle(matches, idx)));

      const m = matches[String(idx)];
      if (m?.label) layer.bindTooltip(m.label, { sticky: true });
      layer.addTo(map);
      polyLayers[idx] = layer;
      districtIdxs.push(idx);
    } catch(e) {}
  });

  return districtIdxs;
}

// Nokta GeoJSON polygon içinde mi? (ray casting)
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

export function refreshDistrictLayer(matches, idx) {
  const layer = polyLayers[idx];
  if (!layer) return;
  const style = getDistrictStyle(matches, idx);
  layer.setStyle(style);
  layer.unbindTooltip();
  const m = matches[String(idx)];
  if (m?.label) layer.bindTooltip(m.label, { sticky: true });
}

export function highlightDistrict(prevIdx, idx, matches) {
  // Öncekini sıfırla
  if (prevIdx !== null && polyLayers[prevIdx]) {
    polyLayers[prevIdx].setStyle(getDistrictStyle(matches, prevIdx));
  }
  // Yenisini vurgula
  if (polyLayers[idx]) {
    const s = getDistrictStyle(matches, idx);
    polyLayers[idx].setStyle({ ...s, weight: 2.5, fillOpacity: s.fillOpacity + 0.15 });
    try { map.fitBounds(polyLayers[idx].getBounds(), { maxZoom: 12, padding: [40, 40] }); } catch(e) {}
  }

  // İl sınırını mor göster
  if (activeProvLayer) { map.removeLayer(activeProvLayer); activeProvLayer = null; }
  if (polyLayers[idx]) {
    const center = polyLayers[idx].getBounds().getCenter();
    // Hâlâ seçili provLayer üzerinden gidiyoruz, bunu app.js'de halledelim
  }
}

export function showProvHighlight(feat) {
  if (activeProvLayer) { map.removeLayer(activeProvLayer); activeProvLayer = null; }
  if (!feat) return;
  activeProvLayer = L.geoJSON(feat, {
    style: { color: '#7c3aed', weight: 3, fill: false, opacity: 0.9 },
    interactive: false
  }).addTo(map);
}

let adminMarkers = [];

export function showAdminMarker(lat, lng, label) {
  const icon = L.divIcon({
    className: '',
    html: `<div style="width:10px;height:10px;border-radius:50%;background:#7c3aed;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
    iconSize: [10, 10], iconAnchor: [5, 5]
  });
  const marker = L.marker([lat, lng], { icon, interactive: true })
    .bindTooltip(label || 'İdari merkez', { permanent: false, direction: 'top', offset: [0, -6] })
    .addTo(map);
  adminMarkers.push(marker);
}

export function removeAdminMarkers() {
  adminMarkers.forEach(m => map.removeLayer(m));
  adminMarkers = [];
}

export function getDistrictCenter(idx) {
  return polyLayers[idx]?.getBounds()?.getCenter();
}
