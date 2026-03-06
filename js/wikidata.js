// ================================================================
// wikidata.js — Wikidata arama, Commons ve SPARQL sorguları
// ================================================================

export async function searchWikidata(q) {
  const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(q)}&language=tr&uselang=tr&type=item&limit=7&format=json&origin=*`;
  const data = await (await fetch(url)).json();
  return data.search || [];
}

// P131=ilçe QID'si, P11729 (Kültür Envanteri ID) var, P625 koordinatını çek
export async function fetchAdminPoints(qid) {
  try {
    const sparql = `
      SELECT ?item ?itemLabel ?coord WHERE {
        ?item wdt:P131 wd:${qid} .
        ?item wdt:P11729 [] .
        ?item wdt:P625 ?coord .
        SERVICE wikibase:label { bd:serviceParam wikibase:language "tr,en". }
      }
    `;
    const url = 'https://query.wikidata.org/sparql?query=' + encodeURIComponent(sparql) + '&format=json';
    const data = await (await fetch(url, { headers: { 'Accept': 'application/sparql-results+json' } })).json();
    return (data.results?.bindings || []).map(b => {
      const m = b.coord.value.match(/Point\(([^ ]+) ([^)]+)\)/);
      return {
        qid:   b.item.value.replace('http://www.wikidata.org/entity/', ''),
        label: b.itemLabel?.value || '',
        lat:   parseFloat(m?.[2]),
        lng:   parseFloat(m?.[1]),
      };
    }).filter(p => !isNaN(p.lat) && !isNaN(p.lng));
  } catch(e) { return []; }
}

export async function checkCommons(qid) {
  try {
    const wdData = await (await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`)).json();
    const entity = wdData.entities[qid];
    const p373   = entity?.claims?.P373?.[0]?.mainsnak?.datavalue?.value;
    if (!p373) return {};
    const buildingsCat = `Buildings in ${p373}`;
    const cmData = await (await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&titles=Category:${encodeURIComponent(buildingsCat)}&format=json&origin=*`
    )).json();
    const pages  = cmData.query?.pages || {};
    const exists = !Object.keys(pages).some(k => k === '-1');
    return { commonsCategory: p373, hasBuildings: exists, buildingsCat: exists ? buildingsCat : null };
  } catch(e) { return {}; }
}
