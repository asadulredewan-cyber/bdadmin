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
let PAGE_MODE = "idle"; 
// values: "idle" | "load" | "add"

let CATALOG = { products: [] };
let actionBar = null;

/* ================= DOM ================= */
const productsRoot = document.getElementById("productsRoot");
const loadBtn = document.getElementById("loadpro");
const CATEGORY_OPTIONS = [
  "Home & Kitchen",
  "Fashion",
  "Electronics",
  "Beauty",
  "Home Improvement",
  "Sports, Toys & Luggage",
  "Other"
];


function calculateDiscount(price, oldPrice) {
  if (!price || !oldPrice) return null;
  if (oldPrice <= price) return null;

  const percent = Math.round(((oldPrice - price) / oldPrice) * 100);
  return percent > 0 ? `${percent}% OFF` : null;
}

/* ================= LOAD PRODUCTS ================= */
async function loadProducts() {
  PAGE_MODE = "load";

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
  DRAFT_PRODUCTS = []; // add drafts clear

}

/* ================= ACTION BUTTONS ================= */
function renderActionButtons() {
  if (actionBar) return;

  actionBar = document.createElement("div");
  actionBar.className = "product-action-bar";
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
    {
      products: [...CATALOG.products],
      meta: {
        updatedAt: serverTimestamp()
      }
    }
  );
await setDoc(
    doc(db, "meta", "products_sync"),
    { lastUpdatedAt: serverTimestamp() },
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

   <input id="pid" value="${product.productId || ""}" placeholder="Product ID" readonly><br>
    <input id="t" value="${product.title || ""}" placeholder="Title"><br>
    <select id="c">
  <option value="">Select Category</option>
</select><br>
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
<h4>Product Details</h4>
<div id="detailsRoot"></div>
<button id="addDetail">+ Product Details</button>

    <br><br>
    <button id="update">Update</button>
    <button id="cancel">Cancel</button>
  `;

  productsRoot.appendChild(box);

/* ===== CATEGORY DROPDOWN (EDIT) ===== */
const categorySelect = box.querySelector("#c");

CATEGORY_OPTIONS.forEach(cat => {
  const opt = document.createElement("option");
  opt.value = cat;
  opt.textContent = cat;

  if (cat === product.category) {
    opt.selected = true;
  }

  categorySelect.appendChild(opt);
});

  /* ===== MAIN IMAGE PICKER (EDIT) ===== */
  const imgInput = box.querySelector("#img");

  const pickBtn = document.createElement("button");
  pickBtn.textContent = "Select Image";
  pickBtn.style.marginLeft = "8px";

  pickBtn.onclick = () =>
    openImagePicker({
      type: "main",
      input: imgInput
    });

  imgInput.after(pickBtn);

  /* ================= GALLERY ================= */
  const galleryRoot = box.querySelector("#galleryRoot");
  function renderGallery() {
    galleryRoot.innerHTML = "";

    gallery.forEach((g, i) => {
      const row = document.createElement("div");

      const input = document.createElement("input");
      input.value = g;
      input.oninput = e => gallery[i] = e.target.value;

      const pick = document.createElement("button");
      pick.textContent = "Pick";

      pick.onclick = () =>
        openImagePicker({
          type: "gallery",
          add: url => {
            gallery[i] = url;
            renderGallery(); // UI refresh
          }
        });

      const del = document.createElement("button");
      del.textContent = "x";
      del.onclick = () => {
        gallery.splice(i, 1);
        renderGallery();
      };

      row.append(input, pick, del);
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
  const detailsRoot = box.querySelector("#detailsRoot");
  const detailsArr = [];

  // existing <p>...</p> → textarea
  if (product.details) {
    const temp = document.createElement("div");
    temp.innerHTML = product.details;

    temp.querySelectorAll("p").forEach(p => {
      addDetailBox(p.textContent);
    });
  }

  box.querySelector("#addDetail").onclick = () => {
    addDetailBox("");
  };

  function addDetailBox(text) {
    const row = document.createElement("div");
    row.className = "detail-row";

    const textarea = document.createElement("textarea");
    textarea.value = text;

    const del = document.createElement("button");
    del.innerHTML = "&times;";
    del.className = "detail-del";

    textarea.oninput = buildDetailsHTML;
    del.onclick = () => {
      detailsArr.splice(detailsArr.indexOf(textarea), 1);
      row.remove();
      buildDetailsHTML();
    };

    detailsArr.push(textarea);
    row.append(textarea, del);
    detailsRoot.appendChild(row);
  }
  function buildDetailsHTML() {
    product.details = detailsArr
      .flatMap(t =>
        t.value
          .split(/\n+/)
          .map(v => v.trim())
          .filter(Boolean)
      )
      .map(v => `<p>${v}</p>`)
      .join("");
  }


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
        { 
            ...CATALOG, 
            // এই নিচের updatedat টি মেইন মেটা আপডেট করবে
            meta: {
                updatedAt: serverTimestamp() 
            }
        },
        { merge: true }
    );
    await setDoc(
      doc(db, "meta", "products_sync"),
      { lastUpdatedAt: serverTimestamp() },
      { merge: true }
    );

    loadProducts();
  };

  box.querySelector("#cancel").onclick = loadProducts;
}

/* ================= BIND ================= */
loadBtn.onclick = loadProducts;
