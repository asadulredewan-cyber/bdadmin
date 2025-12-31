/* =====================================================
   PRODUCT MANAGER — META / CATALOG (FULL)
===================================================== */

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "../core/firebase.js";

/* ================= DOM ================= */
const productsRoot = document.getElementById("productsRoot");
const addProductBtn = document.getElementById("addProductBtn");

let CATALOG = { products: [] };
let formActionsEl = null;
function calculateDiscount(price, oldPrice) {
  if (!price || !oldPrice) return null;
  if (oldPrice <= price) return null;

  const percent = Math.round(((oldPrice - price) / oldPrice) * 100);
  return percent > 0 ? `${percent}% OFF` : null;
}

/* ================= LOAD CATALOG ================= */
async function loadCatalog() {
  const ref = doc(db, "meta", "catalog");
  const snap = await getDoc(ref);
  if (snap.exists()) {
    CATALOG = snap.data();
    CATALOG.products ||= [];
  }
}
loadCatalog();

/* ================= CREATE FORM ================= */
function createProductForm() {
  const product = {
    id: crypto.randomUUID(),      // 🔑 AUTO system id
    productId: null,              // 🧾 MANUAL
    title: "",
    category: "",
    price: null,
    oldPrice: null,
    image: "",
    gallery: [],
    colorVariants: {},
    specifications: []
  };

  const box = document.createElement("div");
  box.className = "product-box";
  box.style.border = "1px solid #ddd";
  box.style.padding = "15px";
  box.style.marginBottom = "20px";

  box.innerHTML = `
    <h3>New Product</h3>

    <input placeholder="Product ID"><br>
    <input placeholder="Title"><br>
    <input placeholder="Category"><br>
    <input placeholder="Price"><br>
    <input placeholder="Old Price"><br>
    <input placeholder="Main Image URL"><br>

    <h4>Gallery</h4>
    <div class="gallery"></div>
    <button class="addGallery">+ Add Gallery</button>

    <h4>Colors</h4>
    <div class="colors"></div>
    <button class="addColor">+ Add Color</button>

    <h4>Specifications</h4>
    <div class="specs"></div>
    <button class="addSpec">+ Add Spec</button>
  `;

  const inputs = box.querySelectorAll("input");
  inputs[0].oninput = e => product.productId = Number(e.target.value);
  inputs[1].oninput = e => product.title = e.target.value;
  inputs[2].oninput = e => product.category = e.target.value;
  inputs[3].oninput = e => product.price = Number(e.target.value);
  inputs[4].oninput = e => product.oldPrice = Number(e.target.value);
  inputs[5].oninput = e => product.image = e.target.value;

  /* ================= GALLERY ================= */
  box.querySelector(".addGallery").onclick = () => {
    const row = document.createElement("div");
    const input = document.createElement("input");
    input.placeholder = "Image URL";
    const del = document.createElement("button");
    del.textContent = "Delete";

    input.oninput = e => {
      if (!product.gallery.includes(e.target.value)) {
        product.gallery.push(e.target.value);
      }
    };

    del.onclick = () => {
      product.gallery = product.gallery.filter(v => v !== input.value);
      row.remove();
    };

    row.append(input, del);
    box.querySelector(".gallery").appendChild(row);
  };

  /* ================= COLORS & SIZES ================= */
  box.querySelector(".addColor").onclick = () => {
    const colorBox = document.createElement("div");
    colorBox.style.border = "1px dashed #aaa";
    colorBox.style.padding = "10px";
    colorBox.style.margin = "10px 0";

    const name = document.createElement("input");
    name.placeholder = "Color name";

    const img = document.createElement("input");
    img.placeholder = "Color image URL";

    const sizesWrap = document.createElement("div");
    const addSize = document.createElement("button");
    addSize.textContent = "+ Add Size";

    const delColor = document.createElement("button");
    delColor.textContent = "Delete Color";

    let colorKey = "";

    name.oninput = e => {
      colorKey = e.target.value;
      product.colorVariants[colorKey] ||= { image: "", sizes: {} };
    };

    img.oninput = e => {
      if (colorKey) product.colorVariants[colorKey].image = e.target.value;
    };

    addSize.onclick = () => {
      if (!colorKey) return alert("Set color name first");

      const row = document.createElement("div");
      const s = document.createElement("input");
      s.placeholder = "Size";

      const p = document.createElement("input");
      p.placeholder = "Price";

      const o = document.createElement("input");
      o.placeholder = "Old Price";

      const del = document.createElement("button");
      del.textContent = "X";

      s.oninput = () => {
        product.colorVariants[colorKey].sizes[s.value] ||= {};
      };
      p.oninput = e => {
        product.colorVariants[colorKey].sizes[s.value].price = Number(e.target.value);
      };
      o.oninput = e => {
        product.colorVariants[colorKey].sizes[s.value].oldPrice = Number(e.target.value);
      };

      del.onclick = () => {
        delete product.colorVariants[colorKey].sizes[s.value];
        row.remove();
      };

      row.append(s, p, o, del);
      sizesWrap.appendChild(row);
    };

    delColor.onclick = () => {
      delete product.colorVariants[colorKey];
      colorBox.remove();
    };

    colorBox.append(name, img, addSize, sizesWrap, delColor);
    box.querySelector(".colors").appendChild(colorBox);
  };

  /* ================= SPECIFICATIONS ================= */
  box.querySelector(".addSpec").onclick = () => {
    const row = document.createElement("div");
    const label = document.createElement("input");
    label.placeholder = "Label";
    const value = document.createElement("textarea");
    value.placeholder = "Value";
    const del = document.createElement("button");
    del.textContent = "Delete";

    label.oninput = () => {
      product.specifications.push({ label: label.value, value: "" });
    };
    value.oninput = e => {
      const s = product.specifications.find(x => x.label === label.value);
      if (s) s.value = e.target.value;
    };
    del.onclick = () => {
      product.specifications =
        product.specifications.filter(x => x.label !== label.value);
      row.remove();
    };

    row.append(label, value, del);
    box.querySelector(".specs").appendChild(row);
  };

  productsRoot.appendChild(box);
  ensureActions(product);
}

/* ================= SAVE ================= */
async function saveProduct(product) {
  CATALOG.products.push({
    ...product,
    discount: calculateDiscount(product.price, product.oldPrice),
    meta: {
  createdAt: Date.now(),     // ✅ client time
  updatedAt: Date.now(),     // ✅ client time
  source: "admin-panel"
}

  });

  await setDoc(
  doc(db, "meta", "catalog"),
  { 
    ...CATALOG,
    updatedAt: serverTimestamp()   // ✅ ONLY here
  },
  { merge: true }
);

  alert("Product saved");
  location.reload();
}

/* ================= ACTION BAR ================= */
function ensureActions(product) {
  if (formActionsEl) return;

  formActionsEl = document.createElement("div");
  formActionsEl.style.marginTop = "20px";
  formActionsEl.innerHTML = `
    <button id="saveBtn" class="btn blue">Save Product</button>
  `;
  productsRoot.after(formActionsEl);

  document.getElementById("saveBtn").onclick = () => saveProduct(product);
}

/* ================= BIND ================= */
addProductBtn.onclick = createProductForm;
