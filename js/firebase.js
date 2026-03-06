import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDocs, collection } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { firebaseConfig } from "./config.js";

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

export async function loadMatches() {
  const snap = await getDocs(collection(db, 'matches'));
  const matches = {};
  snap.docs.forEach(d => { const data = d.data(); if (data.qid) matches[d.id] = data; });
  return matches;
}

export async function saveMatch(idx, data) {
  await setDoc(doc(db, 'matches', String(idx)), data);
}

export async function deleteMatch(idx) {
  await setDoc(doc(db, 'matches', String(idx)), { deleted: true });
}
