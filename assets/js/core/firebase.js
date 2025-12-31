// assets/js/core/firebase.js

import { initializeApp } from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

import { getAuth } from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { getFirestore } from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ===== ADMIN FIREBASE CONFIG ===== */
const firebaseConfig = {
  apiKey: "AIzaSyD_6lpkZKFXA8v0_92rp8QHqV0-M1QHuvE",
  authDomain: "ecom-hero-7a72d.firebaseapp.com",
  projectId: "ecom-hero-7a72d",
  storageBucket: "ecom-hero-7a72d.firebasestorage.app",
  messagingSenderId: "523961213374",
  appId: "1:523961213374:web:0e378400ba25a0610659ef",
  measurementId: "G-QLWKJSP2EW"
};

/* ===== INIT ===== */
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
