// ================================================================
// wikidata.js — Wikidata SPARQL sorguları
// ================================================================

// P131=ilçe QID'si olan, P11729 değeri bulunan öğeleri çek
// P18 (görsel) ve P373 (Commons kategorisi) de çek
export async function fetchDistrictItems(qid) {
  try {
    const sparql = `
      SELECT ?item ?itemLabel (SAMPLE(?p18) AS ?p18) (SAMPLE(?p373) AS ?p373) WHERE {
        ?item wdt:P131 wd:${qid} .
        ?item wdt:P11729 [] .
        OPTIONAL { ?item wdt:P18 ?p18 }
        OPTIONAL { ?item wdt:P373 ?p373 }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "tr,en". }
      }
      GROUP BY ?item ?itemLabel
      ORDER BY ?itemLabel
    `;
    const url  = 'https://query.wikidata.org/sparql?query=' + encodeURIComponent(sparql) + '&format=json';
    const data = await (await fetch(url, { headers: { 'Accept': 'application/sparql-results+json' } })).json();
    return (data.results?.bindings || []).map(b => ({
      qid:      b.item.value.replace('http://www.wikidata.org/entity/', ''),
      label:    b.itemLabel?.value || '',
      hasImage: !!b.p18,
      p18file:  b.p18?.value || null,
      p373:     b.p373?.value || null,
    }));
  } catch(e) { return []; }
}

// P131=ilçe QID'si, P11729 var, P625 koordinatını çek (harita işaretleyici)
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
    const url  = 'https://query.wikidata.org/sparql?query=' + encodeURIComponent(sparql) + '&format=json';
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
