import { db } from "../core/firebase.js";
import {
    collection,
    getDocs,
    doc,
    deleteDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ================= STATE ================= */
let LOADED_PRODUCTS = [];
let actionBar = null;

/* ================= DOM ================= */
const productsRoot = document.getElementById("productsRoot");
const loadBtn = document.getElementById("loadpro");

/* ================= LOAD PRODUCTS ================= */
async function loadProducts() {
    productsRoot.innerHTML = "Loading products...";

    const snap = await getDocs(collection(db, "products"));

    LOADED_PRODUCTS = snap.docs.map(d => ({
        _docId: d.id,
        ...d.data()
    }));

    LOADED_PRODUCTS.sort((a, b) => (a.id || 0) - (b.id || 0));

    renderActionButtons();
    renderProductTable(LOADED_PRODUCTS);
}

/* ================= ACTION BUTTONS ================= */
function renderActionButtons() {
    if (actionBar) return;

    actionBar = document.createElement("div");
    actionBar.style.display = "flex";
    actionBar.style.gap = "12px";
    actionBar.style.margin = "15px 0";

    actionBar.innerHTML = `
    <button id="downloadJsonBtn" class="btn gray">Download JSON</button>
    <button id="viewJsonBtn" class="btn gray">View JSON</button>
  `;

    productsRoot.before(actionBar);

    document.getElementById("downloadJsonBtn").onclick = downloadJSON;
    document.getElementById("viewJsonBtn").onclick = viewJSON;
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
          <th>#</th>
          <th>Image</th>
          <th>Title</th>
          <th>Price</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        ${list.map((p, i) => `
          <tr>
            <td>${p.id}</td>
            <td><img src="${p.image || ""}" width="50"></td>
            <td>${p.title || "-"}</td>
            <td>৳${p.price ?? "-"}</td>
            <td>
              <button onclick="editProduct('${p._docId}')">Edit</button>
              <button onclick="deleteProduct('${p._docId}')">Delete</button>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

/* ================= DELETE ================= */
window.deleteProduct = async function (docId) {
    if (!confirm("Delete this product?")) return;
    await deleteDoc(doc(db, "products", docId));
    loadProducts();
};

/* ================= EDIT ================= */
window.editProduct = function (docId) {
    const product = LOADED_PRODUCTS.find(p => p._docId === docId);
    if (!product) return alert("Product not found");

    productsRoot.innerHTML = "";
    openEditForm(product);
};

/* ================= EDIT FORM ================= */
function openEditForm(product) {
    const box = document.createElement("div");
    box.className = "edit-box";

    const colorVariants = structuredClone(product.colorVariants || {});

    box.innerHTML = `
    <h3>Edit Product</h3>

     <div class="f-field">
    <input id="pid" value="${product.id || ""}" placeholder=" ">
    <label>Product ID</label>
  </div>

    
  <div class="f-field">
    <input id="t" value="${product.title || ""}" placeholder=" ">
    <label>Title</label>
  </div>

  <div class="f-field">
    <input id="c" value="${product.category || ""}" placeholder=" ">
    <label>Category</label>
  </div>

  <div class="f-field">
    <input id="p" value="${product.price || ""}" placeholder=" ">
    <label>Price</label>
  </div>

  <div class="f-field">
    <input id="op" value="${product.oldPrice || ""}" placeholder=" ">
    <label>Old Price</label>
  </div>

  <div class="f-field">
    <input id="img" value="${product.image || ""}" placeholder=" ">
    <label>Main Image URL</label>
  </div>


    <h4>Colors & Sizes</h4>
    <div id="colorRoot"></div>
    <button id="addColor">+ Add Color</button>

    <br><br>
    <button id="update">Update</button>
    <button id="cancel">Cancel</button>
  `;

    productsRoot.appendChild(box);

    const colorRoot = box.querySelector("#colorRoot");

    renderColors();

    box.querySelector("#cancel").onclick = loadProducts;

    box.querySelector("#addColor").onclick = () => {
        const c = prompt("Color name?");
        if (!c) return;
        colorVariants[c] = { image: "", sizes: {} };
        renderColors();
    };

    box.querySelector("#update").onclick = async () => {
        await updateDoc(doc(db, "products", product._docId), {
         id: Number(box.querySelector("#pid").value) || null,
            title: box.querySelector("#t").value,
            category: box.querySelector("#c").value,
            price: Number(box.querySelector("#p").value) || null,
            oldPrice: Number(box.querySelector("#op").value) || null,
            image: box.querySelector("#img").value,
            colorVariants: sanitizeColors(colorVariants),
            "meta.updatedAt": new Date()
        });

        loadProducts();
    };

    function renderColors() {
        colorRoot.innerHTML = "";

        Object.entries(colorVariants).forEach(([color, cData]) => {
            const div = document.createElement("div");
            div.innerHTML = `
       <b>${color}</b>

<div class="f-field">
  <input value="${cData.image || ""}" placeholder=" ">
  <label>Color Image</label>
</div>

<div class="sizes"></div>

        <button class="addSize">+ Size</button>
        <button class="delColor">Delete Color</button>
      `;

            div.querySelector("input").oninput = e =>
                cData.image = e.target.value;

            const sizesDiv = div.querySelector(".sizes");

            Object.entries(cData.sizes || {}).forEach(([s, sData]) => {
                const row = document.createElement("div");
                row.innerHTML = `
          <span>${s}</span>

<div class="f-field">
  <input value="${sData.price || ""}" placeholder=" ">
  <label>Price</label>
</div>

<div class="f-field">
  <input value="${sData.oldPrice || ""}" placeholder=" ">
  <label>Old Price</label>
</div>

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
}

/* ================= SANITIZER ================= */
function sanitizeColors(colors) {
    const clean = {};
    for (const [c, cData] of Object.entries(colors)) {
        const sizes = {};
        for (const [s, sData] of Object.entries(cData.sizes || {})) {
            if (sData.price != null || sData.oldPrice != null) {
                sizes[s] = {
                    ...(sData.price != null && { price: sData.price }),
                    ...(sData.oldPrice != null && { oldPrice: sData.oldPrice })
                };
            }
        }
        if (Object.keys(sizes).length) {
            clean[c] = { ...(cData.image && { image: cData.image }), sizes };
        }
    }
    return clean;
}

/* ================= JSON ================= */
function downloadJSON() {
    const clean = LOADED_PRODUCTS.map(({ _docId, ...rest }) => rest);
    const blob = new Blob([JSON.stringify(clean, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "products.json";
    a.click();
}

function viewJSON() {
    const clean = LOADED_PRODUCTS.map(({ _docId, ...rest }) => rest);
    const win = window.open();
    win.document.write(`<pre>${JSON.stringify(clean, null, 2)}</pre>`);
}

/* ================= BIND ================= */
loadBtn.onclick = loadProducts;
