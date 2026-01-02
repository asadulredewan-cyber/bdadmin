/* =====================================================
   IMAGE PICKER — GALLERY MULTI-SELECT (FINAL)
===================================================== */

let IMAGE_PICKER_CALLBACK = null;
let IMAGE_JSON = null;
let SELECTED_IMAGES = new Set();

/* ===== LOAD JSON ===== */
async function loadImageLibrary() {
  try {
    const res = await fetch("./assets/json/cloudinary.json");
    IMAGE_JSON = await res.json();
    renderImageGrid();
  } catch (err) {
    console.error("Image JSON load failed", err);
  }
}

/* ===== OPEN PICKER ===== */
window.openImagePicker = function ({
  input,
  add,
  addMany,
  multi = false
}) {
  IMAGE_PICKER_CALLBACK = { input, add, addMany, multi };
  SELECTED_IMAGES.clear();

  const modal = document.getElementById("imagePickerModal");
  modal.style.display = "flex";
/* ===== INJECT HEADER (JS ONLY) ===== */
const modalBox = modal.querySelector("div"); // modal-এর first child

let header = modalBox.querySelector(".picker-header");
if (!header) {
  header = document.createElement("div");
  header.className = "picker-header";

  const title = document.createElement("div");
  title.className = "picker-title";
  title.textContent = "Select Images";

  const actions = document.createElement("div");
  actions.className = "picker-actions";

  const closeBtn = document.createElement("button");
  closeBtn.className = "btn gray";
  closeBtn.textContent = "Close";
  closeBtn.onclick = closeImagePicker;

  const okBtn = document.createElement("button");
  okBtn.className = "btn blue";
  okBtn.textContent = "OK";
  okBtn.onclick = confirmImageSelection;

  actions.append(closeBtn, okBtn);
  header.append(title, actions);

  modalBox.prepend(header);
}

  if (!IMAGE_JSON) loadImageLibrary();
  else renderImageGrid();
};

/* ===== CLOSE ===== */
window.closeImagePicker = function () {
  const modal = document.getElementById("imagePickerModal");
  modal.style.display = "none";
  IMAGE_PICKER_CALLBACK = null;
  SELECTED_IMAGES.clear();
};

/* ===== IMAGE CLICK ===== */
window.toggleSelectImage = function (url, el) {
  if (!IMAGE_PICKER_CALLBACK) return;

  // Single select (main image / color image)
  if (!IMAGE_PICKER_CALLBACK.multi) {
    if (IMAGE_PICKER_CALLBACK.input)
      IMAGE_PICKER_CALLBACK.input.value = url;
    if (IMAGE_PICKER_CALLBACK.add)
      IMAGE_PICKER_CALLBACK.add(url);

    closeImagePicker();
    return;
  }

  // Multi select (gallery)
  if (SELECTED_IMAGES.has(url)) {
    SELECTED_IMAGES.delete(url);
    el.classList.remove("selected");
  } else {
    SELECTED_IMAGES.add(url);
    el.classList.add("selected");
  }
};

/* ===== CONFIRM (GALLERY ONLY) ===== */
window.confirmImageSelection = function () {
  if (!IMAGE_PICKER_CALLBACK) return;

  if (IMAGE_PICKER_CALLBACK.multi && IMAGE_PICKER_CALLBACK.addMany) {
    IMAGE_PICKER_CALLBACK.addMany([...SELECTED_IMAGES]);
  }

  closeImagePicker();
};
function renderImageGrid() {
  const grid = document.getElementById("imagePickerGrid");
  if (!grid || !IMAGE_JSON) return;

  // scroll enable
  grid.style.overflowY = "auto";
  grid.style.flex = "1";

  let html = "";

  IMAGE_JSON.folders.forEach(folder => {
    html += `<h4 style="grid-column:1/-1">${folder.folder}</h4>`;
    folder.images.forEach(img => {
      html += `
        <div class="picker-item"
             onclick="toggleSelectImage('${img.url}', this)">
          <img src="${img.url}" />
        </div>
      `;
    });
  });

  grid.innerHTML = html;
}

