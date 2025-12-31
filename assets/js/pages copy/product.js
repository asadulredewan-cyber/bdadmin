/* =====================================================
   PRODUCT MANAGER — STEP 1 + 2 + 3 + 4 (FINAL)
===================================================== */

/* ================= FIREBASE ================= */
import {
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { db } from "../core/firebase.js";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =====================================================
   DOM READY
===================================================== */
document.addEventListener("DOMContentLoaded", () => {

  /* ================= ELEMENTS ================= */
  
  const productsRoot = document.getElementById("productsRoot");
  const addProductBtn = document.getElementById("addProductBtn");
 
  if (!productsRoot || !addProductBtn) {
    console.error("Required DOM elements missing");
    return;
  }

  /* ================= STATE ================= */
  const productsState = [];
let formActionsEl = null;

  /* =====================================================
     CREATE PRODUCT FORM
  ===================================================== */
  function createProductForm() {
    const product = {
      id: null,
      title: "",
      category: "",
      price: null,
      oldPrice: null,
      image: "",
      gallery: [],
      colorVariants: {},
      specifications: []
    };

    productsState.push(product);

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

    inputs[0].oninput = e => product.id = Number(e.target.value);
    inputs[1].oninput = e => product.title = e.target.value;
    inputs[2].oninput = e => product.category = e.target.value;
    inputs[3].oninput = e => product.price = Number(e.target.value);
    inputs[4].oninput = e => product.oldPrice = Number(e.target.value);
    inputs[5].oninput = e => product.image = e.target.value;

    /* ================= GALLERY ================= */
    box.querySelector(".addGallery").onclick = () => {
      const row = document.createElement("div");

      const input = document.createElement("input");
      input.placeholder = "Gallery image URL";

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

    /* ================= COLORS ================= */
    box.querySelector(".addColor").onclick = () => {
      const colorBox = document.createElement("div");
      colorBox.style.border = "1px dashed #aaa";
      colorBox.style.margin = "10px 0";
      colorBox.style.padding = "10px";

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

        const sizeRow = document.createElement("div");

        const sName = document.createElement("input");
        sName.placeholder = "Size";

        const price = document.createElement("input");
        price.placeholder = "Price";

        const old = document.createElement("input");
        old.placeholder = "Old Price";

        const del = document.createElement("button");
        del.textContent = "Delete Size";

        sName.oninput = () => {
          product.colorVariants[colorKey].sizes[sName.value] ||= {};
        };

        price.oninput = e => {
          product.colorVariants[colorKey].sizes[sName.value].price =
            Number(e.target.value);
        };

        old.oninput = e => {
          product.colorVariants[colorKey].sizes[sName.value].oldPrice =
            Number(e.target.value);
        };

        del.onclick = () => {
          delete product.colorVariants[colorKey].sizes[sName.value];
          sizeRow.remove();
        };

        sizeRow.append(sName, price, old, del);
        sizesWrap.appendChild(sizeRow);
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
        const spec = product.specifications.find(s => s.label === label.value);
        if (spec) spec.value = e.target.value;
      };

      del.onclick = () => {
        product.specifications =
          product.specifications.filter(s => s.label !== label.value);
        row.remove();
      };

      row.append(label, value, del);
      box.querySelector(".specs").appendChild(row);
    };

    productsRoot.appendChild(box);
    ensureFormActions();
  }

  /* =====================================================
     STEP 2 — COLLECT & NORMALIZE
  ===================================================== */
  function collectAllProducts() {
    return productsState.map(p => ({
      ...p,
      gallery: p.gallery.filter(Boolean)
    }));
  }

  /* =====================================================
     STEP 3 — POST TO FIREBASE
  ===================================================== */
 async function postToFirebase() {
  const data = collectAllProducts();
  const ref = collection(db, "products");

  for (const product of data) {
    await addDoc(ref, {
      ...product,
      meta: {
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        source: "admin-panel"
      }
    });
  }

  // 🔥 IMPORTANT: update sync meta ONLY when product changes
  await setDoc(
    doc(db, "meta", "products_sync"),
    { lastUpdatedAt: serverTimestamp() },
    { merge: true }
  );

  alert("Products saved & sync meta updated");
}



  /* =====================================================
     STEP 4 — EXPORT JSON
  ===================================================== */
  async function exportJSON() {
    const snap = await getDocs(collection(db, "products"));
    const data = snap.docs.map(d => d.data());

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json"
    });

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "products.json";
    a.click();
  }

  /* ================= BUTTON BIND ================= */
  addProductBtn.addEventListener("click", createProductForm);


  /* ================= INIT ================= */
  function ensureFormActions() {
  if (formActionsEl) return;

  formActionsEl = document.createElement("div");
  formActionsEl.className = "form-actions";
  formActionsEl.style.marginTop = "20px";
  formActionsEl.style.display = "flex";
  formActionsEl.style.gap = "12px";

  formActionsEl.innerHTML = `
    <button id="loadBtn" class="btn blue">Post to Firebase</button>
    <button id="exportBtn" class="btn blue">Export JSON</button>
  `;

  productsRoot.after(formActionsEl);

  document
    .getElementById("loadBtn")
    .addEventListener("click", postToFirebase);

  document
    .getElementById("exportBtn")
    .addEventListener("click", exportJSON);
}


  /* Debug */
  window.collectAllProducts = collectAllProducts;
});
