/* =====================================================
   PRODUCT LOAD + EDIT — META / CATALOG (FULL)
===================================================== */

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "../core/firebase.js";

/* ================= STATE ================= */
let CATALOG = { products: [] };
let actionBar = null;

/* ================= DOM ================= */
const productsRoot = document.getElementById("productsRoot");
const loadBtn = document.getElementById("loadpro");


function calculateDiscount(price, oldPrice) {
  if (!price || !oldPrice) return null;
  if (oldPrice <= price) return null;

  const percent = Math.round(((oldPrice - price) / oldPrice) * 100);
  return percent > 0 ? `${percent}% OFF` : null;
}

/* ================= LOAD PRODUCTS ================= */
async function loadProducts() {
  productsRoot.innerHTML = "Loading products...";

  const snap = await getDoc(doc(db, "meta", "catalog"));
  if (!snap.exists()) {
    productsRoot.innerHTML = "<p>No products found</p>";
    return;
  }

  CATALOG = snap.data();
  CATALOG.products ||= [];

  renderActionButtons();
  renderProductTable(CATALOG.products);
}

/* ================= ACTION BUTTONS ================= */
function renderActionButtons() {
  if (actionBar) return;

  actionBar = document.createElement("div");
  actionBar.style.display = "flex";
  actionBar.style.gap = "12px";
  actionBar.style.margin = "15px 0";
  actionBar.style.flexWrap = "wrap";

  actionBar.innerHTML = `
    <button id="reloadBtn" class="btn gray">Reload</button>

    <button id="exportProductsBtn" class="btn gray">
      Export products.json
    </button>

    <button id="viewProductsBtn" class="btn gray">
      View products.json
    </button>
  `;

  productsRoot.before(actionBar);

  document.getElementById("reloadBtn").onclick = loadProducts;
  document.getElementById("exportProductsBtn").onclick = exportProductsJSON;
  document.getElementById("viewProductsBtn").onclick = viewProductsJSON;
}

/* ================= EXPORT PRODUCTS JSON ================= */
function exportProductsJSON() {
  const data = CATALOG.products || [];

  const blob = new Blob(
    [JSON.stringify(data, null, 2)],
    { type: "application/json" }
  );

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "products.json";
  a.click();
}

/* ================= VIEW PRODUCTS JSON ================= */
function viewProductsJSON() {
  const data = CATALOG.products || [];
  const win = window.open();
  win.document.write(
    `<pre>${JSON.stringify(data, null, 2)}</pre>`
  );
}

/* ================= TABLE ================= */
function renderProductTable(list) {
  if (!list.length) {
    productsRoot.innerHTML = "<p>No products found</p>";
    return;
  }

  productsRoot.innerHTML = `
    <table class="product-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Image</th>
          <th>Title</th>
          <th>Price</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        ${list.map(p => `
          <tr>
            <td>${p.productId ?? "-"}</td>
            <td><img src="${p.image || ""}" width="50"></td>
            <td>${p.title || "-"}</td>
            <td>৳${p.price ?? "-"}</td>
            <td>
              <button onclick="editProduct('${p.id}')">Edit</button>
              <button onclick="deleteProduct('${p.id}')">Delete</button>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

/* ================= DELETE ================= */
window.deleteProduct = async function (id) {
  if (!confirm("Delete this product?")) return;

  CATALOG.products = CATALOG.products.filter(p => p.id !== id);

  await setDoc(
    doc(db, "meta", "catalog"),
    { ...CATALOG, updatedAt: serverTimestamp() },
    { merge: true }
  );

  loadProducts();
};

/* ================= EDIT ================= */
window.editProduct = function (id) {
  const product = CATALOG.products.find(p => p.id === id);
  if (!product) return alert("Product not found");

  productsRoot.innerHTML = "";
  openEditForm(product);
};

/* ================= EDIT FORM ================= */
function openEditForm(product) {
  const box = document.createElement("div");
  box.className = "edit-box";

  const gallery = [...(product.gallery || [])];
  const colorVariants = structuredClone(product.colorVariants || {});
  const specs = structuredClone(product.specifications || []);

  box.innerHTML = `
    <h3>Edit Product</h3>

    <input id="pid" value="${product.productId || ""}" placeholder="Product ID"><br>
    <input id="t" value="${product.title || ""}" placeholder="Title"><br>
    <input id="c" value="${product.category || ""}" placeholder="Category"><br>
    <input id="p" value="${product.price || ""}" placeholder="Price"><br>
    <input id="op" value="${product.oldPrice || ""}" placeholder="Old Price"><br>
    <input id="img" value="${product.image || ""}" placeholder="Main Image URL"><br>

    <h4>Gallery</h4>
    <div id="galleryRoot"></div>
    <button id="addGallery">+ Add Gallery</button>

    <h4>Colors</h4>
    <div id="colorRoot"></div>
    <button id="addColor">+ Add Color</button>

    <h4>Specifications</h4>
    <div id="specRoot"></div>
    <button id="addSpec">+ Add Spec</button>

    <br><br>
    <button id="update">Update</button>
    <button id="cancel">Cancel</button>
  `;

  productsRoot.appendChild(box);

  /* ================= GALLERY ================= */
  const galleryRoot = box.querySelector("#galleryRoot");
  function renderGallery() {
    galleryRoot.innerHTML = "";
    gallery.forEach((g, i) => {
      const row = document.createElement("div");
      row.innerHTML = `
        <input value="${g}">
        <button>x</button>
      `;
      row.querySelector("input").oninput = e => gallery[i] = e.target.value;
      row.querySelector("button").onclick = () => {
        gallery.splice(i, 1);
        renderGallery();
      };
      galleryRoot.appendChild(row);
    });
  }
  renderGallery();
  box.querySelector("#addGallery").onclick = () => {
    gallery.push("");
    renderGallery();
  };

  /* ================= COLORS & SIZES ================= */
  const colorRoot = box.querySelector("#colorRoot");
  function renderColors() {
    colorRoot.innerHTML = "";
    Object.entries(colorVariants).forEach(([color, cData]) => {
      const div = document.createElement("div");
      div.innerHTML = `
        <b>${color}</b>
        <input value="${cData.image || ""}" placeholder="Color Image"><br>
        <div class="sizes"></div>
        <button class="addSize">+ Size</button>
        <button class="delColor">Delete Color</button>
      `;

      div.querySelector("input").oninput = e => cData.image = e.target.value;

      const sizesDiv = div.querySelector(".sizes");
      Object.entries(cData.sizes || {}).forEach(([s, sData]) => {
        const row = document.createElement("div");
        row.innerHTML = `
          <span>${s}</span>
          <input value="${sData.price || ""}" placeholder="Price">
          <input value="${sData.oldPrice || ""}" placeholder="Old Price">
          <button>x</button>
        `;
        row.querySelectorAll("input")[0].oninput =
          e => cData.sizes[s].price = Number(e.target.value) || null;
        row.querySelectorAll("input")[1].oninput =
          e => cData.sizes[s].oldPrice = Number(e.target.value) || null;
        row.querySelector("button").onclick = () => {
          delete cData.sizes[s];
          renderColors();
        };
        sizesDiv.appendChild(row);
      });

      div.querySelector(".addSize").onclick = () => {
        const s = prompt("Size?");
        if (!s) return;
        cData.sizes[s] = {};
        renderColors();
      };

      div.querySelector(".delColor").onclick = () => {
        delete colorVariants[color];
        renderColors();
      };

      colorRoot.appendChild(div);
    });
  }
  renderColors();

  box.querySelector("#addColor").onclick = () => {
    const c = prompt("Color?");
    if (!c) return;
    colorVariants[c] = { image: "", sizes: {} };
    renderColors();
  };

  /* ================= SPECIFICATIONS ================= */
  const specRoot = box.querySelector("#specRoot");
  function renderSpecs() {
    specRoot.innerHTML = "";
    specs.forEach((s, i) => {
      const row = document.createElement("div");
      row.innerHTML = `
        <input value="${s.label}" placeholder="Label">
        <input value="${s.value}" placeholder="Value">
        <button>x</button>
      `;
      row.querySelectorAll("input")[0].oninput = e => specs[i].label = e.target.value;
      row.querySelectorAll("input")[1].oninput = e => specs[i].value = e.target.value;
      row.querySelector("button").onclick = () => {
        specs.splice(i, 1);
        renderSpecs();
      };
      specRoot.appendChild(row);
    });
  }
  renderSpecs();
  box.querySelector("#addSpec").onclick = () => {
    specs.push({ label: "", value: "" });
    renderSpecs();
  };

  /* ================= UPDATE ================= */
  box.querySelector("#update").onclick = async () => {
    product.productId = Number(box.querySelector("#pid").value) || null;
    product.title = box.querySelector("#t").value;
    product.category = box.querySelector("#c").value;
    product.price = Number(box.querySelector("#p").value) || null;
    product.oldPrice = Number(box.querySelector("#op").value) || null;
    product.image = box.querySelector("#img").value;

    product.gallery = gallery.filter(Boolean);
    product.colorVariants = colorVariants;
    product.specifications = specs.filter(s => s.label || s.value);
product.discount = calculateDiscount(product.price, product.oldPrice);
    product.meta.updatedAt = Date.now();

    await setDoc(
      doc(db, "meta", "catalog"),
      { ...CATALOG, updatedAt: serverTimestamp() },
      { merge: true }
    );

    loadProducts();
  };

  box.querySelector("#cancel").onclick = loadProducts;
}

/* ================= BIND ================= */
loadBtn.onclick = loadProducts;
