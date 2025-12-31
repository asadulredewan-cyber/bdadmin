import { db } from "../core/firebase.js";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ================= STATE ================= */
let HEROES = [];
let EDIT_ID = null;

/* ================= DOM ================= */
const heroRoot = document.getElementById("heroRoot");
const loadBtn = document.getElementById("loadHeroBtn");
const addBtn = document.getElementById("addHeroBtn");

/* ================= LOAD HERO ================= */
async function loadHeroes() {
  heroRoot.innerHTML = "Loading hero items...";

  const snap = await getDocs(collection(db, "hero"));
  HEROES = snap.docs.map(d => ({
    _docId: d.id,
    ...d.data()
  }));

  renderHeroList();
  renderJSONButtons();
}

/* ================= LIST ================= */
function renderHeroList() {
  if (!HEROES.length) {
    heroRoot.innerHTML = "<p>No hero items found</p>";
    return;
  }

  heroRoot.innerHTML = `
    <table class="product-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Image</th>
          <th>Title</th>
          <th>Offer</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        ${HEROES.map((h, i) => `
          <tr>
            <td>${i + 1}</td>
            <td><img src="${h.image || ""}" width="60"></td>
            <td>${h.title || "-"}</td>
            <td>${h.offer || "-"}</td>
            <td>
              <button onclick="editHero('${h._docId}')">Edit</button>
              <button onclick="deleteHero('${h._docId}')">Delete</button>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

/* ================= FORM ================= */
function renderForm(data = {}) {
  heroRoot.innerHTML = `
    <div class="edit-box">
      <h3>${EDIT_ID ? "Edit Hero" : "Add Hero"}</h3>

      <input id="h_title" placeholder="Title" value="${data.title || ""}">
      <input id="h_sub" placeholder="Subtitle" value="${data.subtitle || ""}">
      <input id="h_offer" placeholder="Offer" value="${data.offer || ""}">
      <input id="h_image" placeholder="Image URL" value="${data.image || ""}">
      <input id="h_bg" placeholder="Background Color" value="${data.bgColor || ""}">
      <input id="h_type" placeholder="Type (product/category)" value="${data.type || ""}">
      <input id="h_id" placeholder="Target ID" value="${data.id || ""}">

      <br><br>
      <button id="saveHero">Save</button>
      <button id="cancelHero">Cancel</button>
    </div>
  `;

  document.getElementById("cancelHero").onclick = () => {
    EDIT_ID = null;
    loadHeroes();
  };

  document.getElementById("saveHero").onclick = saveHero;
}

/* ================= SAVE ================= */
async function saveHero() {
  const payload = {
    title: document.getElementById("h_title").value,
    subtitle: document.getElementById("h_sub").value,
    offer: document.getElementById("h_offer").value,
    image: document.getElementById("h_image").value,
    bgColor: document.getElementById("h_bg").value,
    type: document.getElementById("h_type").value,
    id: document.getElementById("h_id").value
  };

  if (EDIT_ID) {
    // 🔄 UPDATE EXISTING HERO
    await updateDoc(doc(db, "hero", EDIT_ID), {
      ...payload,
      "meta.updatedAt": serverTimestamp()
    });
  } else {
    // ➕ ADD NEW HERO
    await addDoc(collection(db, "hero"), {
      ...payload,
      meta: {
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
    });
  }

  EDIT_ID = null;
  loadHeroes();
}


/* ================= EDIT ================= */
window.editHero = function (docId) {
  const hero = HEROES.find(h => h._docId === docId);
  if (!hero) return alert("Hero not found");

  EDIT_ID = docId;
  renderForm(hero);
};

/* ================= DELETE ================= */
window.deleteHero = async function (docId) {
  if (!confirm("Delete this hero?")) return;
  await deleteDoc(doc(db, "hero", docId));
  loadHeroes();
};

/* ================= JSON ================= */
function renderJSONButtons() {
  if (document.getElementById("heroJsonBtns")) return;

  const div = document.createElement("div");
  div.id = "heroJsonBtns";
  div.style.margin = "15px 0";
  div.innerHTML = `
    <button id="heroDownload" class="btn gray">Download JSON</button>
    <button id="heroView" class="btn gray">View JSON</button>
  `;

  heroRoot.before(div);

  document.getElementById("heroDownload").onclick = downloadJSON;
  document.getElementById("heroView").onclick = viewJSON;
}

function downloadJSON() {
  const clean = HEROES.map(({ _docId, meta, ...rest }) => rest);
  const blob = new Blob([JSON.stringify(clean, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "hero.json";
  a.click();
}

function viewJSON() {
  const clean = HEROES.map(({ _docId, meta, ...rest }) => rest);
  const win = window.open();
  win.document.write(`<pre>${JSON.stringify(clean, null, 2)}</pre>`);
}

/* ================= BIND ================= */
loadBtn.onclick = loadHeroes;
addBtn.onclick = () => {
  EDIT_ID = null;
  renderForm();
};
