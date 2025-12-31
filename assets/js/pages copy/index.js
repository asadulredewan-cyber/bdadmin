/* ================= FIREBASE IMPORTS ================= */
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { auth } from "../core/firebase.js";

/* ================= ELEMENTS ================= */
const loginBox = document.getElementById("loginBox");
const dashboard = document.getElementById("dashboard");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

const openChangePassBtn = document.getElementById("openChangePass");
const changePasswordBox = document.getElementById("changePasswordBox");

const oldPasswordInput = document.getElementById("oldPassword");
const newPasswordInput = document.getElementById("newPassword");
const confirmPasswordInput = document.getElementById("confirmPassword");
const changePasswordBtn = document.getElementById("changePasswordBtn");

/* ================= AUTH STATE ================= */
onAuthStateChanged(auth, user => {
  if (user) {
    loginBox.style.display = "none";
    dashboard.style.display = "grid";
  } else {
    dashboard.style.display = "none";
    changePasswordBox.style.display = "none";
    loginBox.style.display = "block";
  }
});

/* ================= LOGIN ================= */
loginBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    alert("Email & password required");
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    console.error(err);
    alert("Login failed");
  }
});

/* ================= LOGOUT ================= */
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

/* ================= OPEN CHANGE PASSWORD ================= */
openChangePassBtn.addEventListener("click", () => {
  changePasswordBox.style.display = "block";
});

/* ================= CHANGE PASSWORD ================= */
changePasswordBtn.addEventListener("click", async () => {
  const user = auth.currentUser;

  const oldPass = oldPasswordInput.value;
  const newPass = newPasswordInput.value;
  const confirmPass = confirmPasswordInput.value;

  if (!oldPass || !newPass || !confirmPass) {
    alert("All fields are required");
    return;
  }

  if (newPass !== confirmPass) {
    alert("New passwords do not match");
    return;
  }

  if (newPass.length < 6) {
    alert("Password must be at least 6 characters");
    return;
  }

  try {
    const credential = EmailAuthProvider.credential(
      user.email,
      oldPass
    );

    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPass);

    alert("Password changed successfully");

    oldPasswordInput.value = "";
    newPasswordInput.value = "";
    confirmPasswordInput.value = "";
    changePasswordBox.style.display = "none";

  } catch (err) {
    console.error(err);

    if (err.code === "auth/wrong-password") {
      alert("Old password is incorrect");
    } else {
      alert("Password change failed");
    }
  }
});

/* ================= DASHBOARD NAVIGATION ================= */
document.querySelectorAll(".dash-btn[data-page]").forEach(btn => {
  btn.addEventListener("click", () => {
    const page = btn.dataset.page;

    if (page === "delivery") {
      window.open("delivery.html", "_blank");
    } else {
      window.location.href = page + ".html";
    }
  });
});
