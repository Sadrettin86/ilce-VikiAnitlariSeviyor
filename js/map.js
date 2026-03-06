// map.js — Leaflet harita, il ve ilçe katmanları

export const map = L.map('map').setView([39, 35], 6);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '© OpenStreetMap © CARTO', maxZoom: 19
}).addTo(map);

let provLayers    = [];
let polyLayers    = [];
let activeProvLayer = null;

export function renderProvinces(provFeatures, onProvinceClick) {
  provLayers.forEach(l => { if (l) map.removeLayer(l); });
  provLayers = [];
  provFeatures.forEach((feat, pi) => {
    const layer = L.geoJSON(feat, {
      style: { color: '#475569', weight: 2, fillColor: '#64748b', fillOpacity: 0.06, opacity: 0.7 }
    });
    layer.on('click',     () => onProvinceClick(pi));
    layer.on('mouseover', () => layer.setStyle({ fillOpacity: 0.15, weight: 2.5, color: '#7c3aed' }));
    layer.on('mouseout',  () => layer.setStyle({ color: '#475569', weight: 2, fillOpacity: 0.06 }));
    layer.addTo(map);
    provLayers[pi] = layer;
  });
}

export function highlightProvLayer(pi) {
  provLayers.forEach((l, i) => {
    if (!l) return;
    if (i === pi) l.setStyle({ color: '#7c3aed', weight: 3, fillColor: '#7c3aed', fillOpacity: 0.08 });
    else          l.setStyle({ color: '#475569', weight: 2, fillColor: '#64748b', fillOpacity: 0.06 });
  });
}

export function getProvBounds(pi) {
  return provLayers[pi]?.getBounds();
}

export function getDistrictStyle(matches, idx) {
  const m = matches[String(idx)];
  if (!m)             return { color: '#94a3b8', weight: 1.2, fillColor: '#94a3b8', fillOpacity: 0.08, opacity: 0.6 };
  if (m.hasBuildings) return { color: '#059669', weight: 1.5, fillColor: '#059669', fillOpacity: 0.20, opacity: 0.9 };
  return                     { color: '#d97706', weight: 1.5, fillColor: '#d97706', fillOpacity: 0.18, opacity: 0.9 };
}

export function renderDistricts(features, matches, provBounds, onDistrictClick) {
  polyLayers.forEach(l => { if (l) map.removeLayer(l); });
  polyLayers = [];
  const districtIdxs = [];
  features.forEach((feat, idx) => {
    try {
      const style = getDistrictStyle(matches, idx);
      const layer = L.geoJSON(feat, { style });
      if (!provBounds.contains(layer.getBounds().getCenter())) return;
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

export function refreshDistrictLayer(matches, idx) {
  const layer = polyLayers[idx];
  if (!layer) return;
  layer.setStyle(getDistrictStyle(matches, idx));
  layer.unbindTooltip();
  const m = matches[String(idx)];
  if (m?.label) layer.bindTooltip(m.label, { sticky: true });
}

export function highlightDistrict(prevIdx, idx, matches) {
  if (prevIdx !== null && polyLayers[prevIdx]) {
    polyLayers[prevIdx].setStyle(getDistrictStyle(matches, prevIdx));
  }
  if (polyLayers[idx]) {
    const s = getDistrictStyle(matches, idx);
    polyLayers[idx].setStyle({ ...s, weight: 2.5, fillOpacity: s.fillOpacity + 0.15 });
    try { map.fitBounds(polyLayers[idx].getBounds(), { maxZoom: 12, padding: [40, 40] }); } catch(e) {}
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
let adminMarker = null;

export function showAdminMarker(lat, lng, label) {
  if (adminMarker) { map.removeLayer(adminMarker); adminMarker = null; }
  const icon = L.divIcon({
    className: '',
    html: `<div style="width:12px;height:12px;border-radius:50%;background:#7c3aed;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
    iconSize: [12, 12], iconAnchor: [6, 6]
  });
  adminMarker = L.marker([lat, lng], { icon, interactive: false })
    .bindTooltip(label || 'İdari merkez', { permanent: false, direction: 'top', offset: [0, -8] })
    .addTo(map);
}

export function removeAdminMarker() {
  if (adminMarker) { map.removeLayer(adminMarker); adminMarker = null; }
}
export function getDistrictCenter(idx) {
  return polyLayers[idx]?.getBounds()?.getCenter();
}
