// ================================================================
// wikidata.js — Wikidata arama ve Commons P373 kontrolü
// ================================================================

export async function searchWikidata(q) {
  const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(q)}&language=tr&uselang=tr&type=item&limit=7&format=json&origin=*`;
  const data = await (await fetch(url)).json();
  return data.search || [];
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
