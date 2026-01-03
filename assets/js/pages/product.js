/* =====================================================
   PRODUCT MANAGER — META / CATALOG (FULL + IMAGE PICKER)
===================================================== */

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "../core/firebase.js";


import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ================= DOM ================= */
const productsRoot = document.getElementById("productsRoot");
const addProductBtn = document.getElementById("addProductBtn");
const CATEGORY_OPTIONS = [
  "Home & Kitchen",
  "Fashion",
  "Electronics",
  "Beauty",
  "Home Improvement",
  "Sports, Toys & Luggage",
  "Other"
];

/* ===== CURRENT USER (for history) ===== */
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { auth } from "../core/firebase.js";

let CURRENT_USER = null;

onAuthStateChanged(auth, async user => {
  if (!user) return;

  const snap = await getDoc(doc(db, "users", user.uid));
  if (snap.exists()) {
    CURRENT_USER = {
      uid: user.uid,
      ...snap.data()
    };
  }
});

/* ================= STATE ================= */
let CATALOG = { products: [] };
let CURRENT_PRODUCT = null;
let formActionsEl = null;







function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/* ================= HELPERS ================= */
function calculateDiscount(price, oldPrice) {
  if (!price || !oldPrice) return null;
  if (oldPrice <= price) return null;
  const percent = Math.round(((oldPrice - price) / oldPrice) * 100);
  return percent > 0 ? `${percent}% OFF` : null;
}

function getNextProductId() {
  if (!CATALOG.products.length) return 1;

  const ids = CATALOG.products
    .map(p => Number(p.productId))
    .filter(n => Number.isFinite(n));

  return ids.length ? Math.max(...ids) + 1 : 1;
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
await loadCatalog();

/* ================= CLEANERS ================= */
function cleanProduct(product) {
  const p = structuredClone(product);

  p.gallery = Array.isArray(p.gallery)
    ? p.gallery.filter(Boolean)
    : [];

  Object.keys(p.colorVariants).forEach(color => {

    const c = p.colorVariants[color];

    if (c.sizes && Object.keys(c.sizes).length === 0) delete c.sizes;
    if (!c.image && !c.sizes) delete p.colorVariants[color];
  });

  return p;
}

function cleanCatalog(cat) {
  const c = structuredClone(cat);
  if (!Array.isArray(c.products)) c.products = [];
  if (c.meta && Object.keys(c.meta).length === 0) delete c.meta;
  return c;
}

/* ================= CREATE FORM ================= */
function createProductForm() {
  const product = {
    id: generateUUID(),
   productId: getNextProductId(),

    title: "",
    category: "",
    price: null,
    oldPrice: null,
    image: "",
    gallery: [],
    colorVariants: {},
    details: "",
    specifications: []
  };

  CURRENT_PRODUCT = product;

  const box = document.createElement("div");
  box.className = "product-box";
  box.style.border = "1px solid #ddd";
  box.style.padding = "15px";
  box.style.marginBottom = "20px";

  box.innerHTML = `
    <h3>New Product</h3>

    <input placeholder="Product ID"><br>
    <input placeholder="Title"><br>
    <select class="category-select">
  <option value="">Select Category</option>
</select><br>

    <input placeholder="Price"><br>
    <input placeholder="Old Price"><br>
    <input placeholder="Main Image URL"><br>

    <h4>Gallery</h4>

<div class="gallery-grid"></div>

<div class="gallery-actions">
  <input class="gallery-url-input" placeholder="Paste image URL">
  <button class="gallery-add-url">Add</button>
  <button class="gallery-pick">Pick Images</button>
</div>


    <h4>Colors</h4>
    <div class="colors"></div>
    <button class="addColor">+ Add Color</button>

    <h4>Specifications</h4>
    <div class="specs"></div>
    <button class="addSpec">+ Add Spec</button>

    <h4>Product Details</h4>
    <div class="details-box"></div>
    <button class="addDetail">+ Product Details</button>
  `;

  const inputs = box.querySelectorAll("input");
inputs[0].value = product.productId;
inputs[0].readOnly = true;

  inputs[1].oninput = e => product.title = e.target.value;
  inputs[2].oninput = e => product.price = Number(e.target.value);
  inputs[3].oninput = e => product.oldPrice = Number(e.target.value);
  inputs[4].oninput = e => product.image = e.target.value;

  const categorySelect = box.querySelector(".category-select");

/* populate dropdown */
CATEGORY_OPTIONS.forEach(cat => {
  const opt = document.createElement("option");
  opt.value = cat;
  opt.textContent = cat;
  categorySelect.appendChild(opt);
});

/* bind to product state */
categorySelect.onchange = e => {
  product.category = e.target.value;
};

  /* ===== MAIN IMAGE PICKER ===== */
  const imageInput = box.querySelector('input[placeholder="Main Image URL"]');

const mainPick = document.createElement("button");
mainPick.textContent = "Pick Image";

mainPick.onclick = () =>
  openImagePicker({
    add: url => {
      imageInput.value = url;
      product.image = url;
    }
  });

imageInput.after(mainPick);


  /* ================= GALLERY ================= */
  /* ================= GALLERY (NEW) ================= */
const galleryGrid = box.querySelector(".gallery-grid");
const galleryUrlInput = box.querySelector(".gallery-url-input");
const addUrlBtn = box.querySelector(".gallery-add-url");
const pickBtn = box.querySelector(".gallery-pick");

/* manual URL add */
addUrlBtn.onclick = () => {
  const url = galleryUrlInput.value.trim();
  if (!url) return;

  if (!product.gallery.includes(url)) {
    product.gallery.push(url);
    renderGallery(galleryGrid, product);
  }

  galleryUrlInput.value = "";
};

if (galleryUrlInput && addUrlBtn) {
  galleryUrlInput.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      addUrlBtn.click();
    }
  });
}


/* picker modal – multi select */
/* product.js এর গ্যালারি পিকার অংশ */
/* product.js এর পিকার বাটন */
pickBtn.onclick = () =>
  openImagePicker({
    multi: true,
    addMany: urls => {
      urls.forEach(url => {
        if (!product.gallery.includes(url)) {
          product.gallery.push(url);
        }
      });
      renderGallery(galleryGrid, product);
    }
  });


renderGallery(galleryGrid, product);


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

    const pickImg = document.createElement("button");
    pickImg.textContent = "Pick";

    const sizesWrap = document.createElement("div");
    const addSize = document.createElement("button");
    addSize.textContent = "+ Add Size";

    const delColor = document.createElement("button");
    delColor.textContent = "Delete Color";

    let colorKey = null;

    name.onblur = e => {
      const val = e.target.value.trim();
      if (!val) return;
      colorKey = val.toLowerCase();
      product.colorVariants[colorKey] ||= {
        label: val,
        image: "",
        sizes: {}
      };
    };

    img.oninput = e => {
      if (colorKey) product.colorVariants[colorKey].image = e.target.value;
    };

   pickImg.onclick = () =>
  openImagePicker({
    add: url => {
      img.value = url;
      if (colorKey) {
        product.colorVariants[colorKey].image = url;
      }
    }
  });


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
      del.textContent = "Delete Size";

      function ensureSize() {
        if (!s.value) return null;
        product.colorVariants[colorKey].sizes[s.value] ||= {};
        return product.colorVariants[colorKey].sizes[s.value];
      }

      s.onblur = ensureSize;
      p.oninput = e => {
        const size = ensureSize();
        if (size) size.price = Number(e.target.value);
      };
      o.oninput = e => {
        const size = ensureSize();
        if (size) size.oldPrice = Number(e.target.value);
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

    colorBox.append(name, img, pickImg, addSize, sizesWrap, delColor);
    box.querySelector(".colors").appendChild(colorBox);
  };

  /* ================= SPECS ================= */
  box.querySelector(".addSpec").onclick = () => {
    const row = document.createElement("div");
    const label = document.createElement("input");
    label.placeholder = "Label";
    const value = document.createElement("textarea");
    value.placeholder = "Value";
    const del = document.createElement("button");
    del.textContent = "Delete";

    label.onblur = () => {
      if (!label.value) return;
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

  /* ================= DETAILS ================= */
  const detailsWrap = box.querySelector(".details-box");
  const detailsArr = [];

  box.querySelector(".addDetail").onclick = () => {
    const row = document.createElement("div");
    const textarea = document.createElement("textarea");
    textarea.rows = 3;

    const del = document.createElement("button");
    del.textContent = "Delete";

    textarea.oninput = () => {
      product.details = detailsArr
        .flatMap(t => t.value.split(/\n+/).map(v => v.trim()).filter(Boolean))
        .map(v => `<p>${v}</p>`)
        .join("");
    };

    del.onclick = () => {
      const i = detailsArr.indexOf(textarea);
      if (i !== -1) detailsArr.splice(i, 1);
      row.remove();
      textarea.oninput();
    };

    detailsArr.push(textarea);
    row.append(textarea, del);
    detailsWrap.appendChild(row);
  };

  productsRoot.appendChild(box);
  ensureActions();
}

/* ================= SAVE ================= */
async function saveProduct() {
  try {
    if (!CURRENT_PRODUCT) return alert("No product");

    const product = cleanProduct({
      ...CURRENT_PRODUCT,
      discount: calculateDiscount(
        CURRENT_PRODUCT.price,
        CURRENT_PRODUCT.oldPrice
      ),
      meta: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        source: "admin-panel"
      }
    });


/* ===== ADD PRODUCT HISTORY (CREATE ONLY) ===== */
if (CURRENT_USER) {
  await addDoc(
    collection(db, "product_history"),
    {
      productId: product.id,
      action: "create",
      editedAt: serverTimestamp(),
      editedBy: {
        uid: CURRENT_USER.uid,
        name: CURRENT_USER.name,
        role: CURRENT_USER.role
      },
      changes: {
        created: true
      }
    }
  );
}

     
    const index = CATALOG.products.findIndex(p => p.id === product.id);
    if (index === -1) CATALOG.products.push(product);
    else CATALOG.products[index] = product;

    const safeCatalog = cleanCatalog(CATALOG);

    await setDoc(
      doc(db, "meta", "catalog"),
      { ...safeCatalog, meta: { updatedAt: serverTimestamp() } },
      { merge: true }
    );

    await setDoc(
      doc(db, "meta", "products_sync"),
      { lastUpdatedAt: serverTimestamp() },
      { merge: true }
    );

    alert("Product saved");
    location.reload();

  } catch (err) {
    console.error(err);
    alert("Save failed. Check console.");
  }
}

/* ================= ACTION BAR ================= */
function ensureActions() {
  if (formActionsEl) return;

  formActionsEl = document.createElement("div");
  formActionsEl.innerHTML = `
    <button id="saveBtn" class="btn blue">Save Product</button>
  `;
  productsRoot.after(formActionsEl);

  document.getElementById("saveBtn").onclick = saveProduct;
}





function renderGallery(grid, product) {
  grid.innerHTML = "";

  product.gallery.forEach(url => {
    const card = document.createElement("div");
    card.className = "gallery-card";

    const img = document.createElement("img");
    img.src = url;
    img.loading = "lazy";

    const del = document.createElement("button");
    del.className = "gallery-remove";
    del.textContent = "×";

    del.onclick = () => {
      product.gallery = product.gallery.filter(u => u !== url);
      renderGallery(grid, product);
    };

    card.append(img, del);
    grid.appendChild(card);
  });
}



/* imagepicker.js এর renderImageGrid ফাংশনের নিচে এই অংশটুকু চেক করুন */





if (addProductBtn) {
  addProductBtn.onclick = createProductForm;
}

