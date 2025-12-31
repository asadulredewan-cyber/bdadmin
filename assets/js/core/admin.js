import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ================= ELEMENTS ================= */
const homeBtn   = document.getElementById("homeBtn");
const logoutBtn = document.getElementById("logoutBtn");

/* ================= HOME CLICK ================= */
homeBtn.addEventListener("click", () => {
  window.location.href = "index.html";
});

/* ================= LOGOUT CLICK ================= */
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});

/* ================= ADMIN GUARD ================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    // Login নাই
    window.location.href = "index.html";
    return;
  }

  try {
    const snap = await getDoc(doc(db, "users", user.uid));

    if (!snap.exists() || snap.data().role !== "admin") {
      // Admin না
      await signOut(auth);
      window.location.href = "index.html";
    }

  } catch (err) {
    await signOut(auth);
    window.location.href = "index.html";
  }
});
