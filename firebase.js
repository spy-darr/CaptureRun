import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDj1IhTqlHxhjniN1NeGIyjaE1QuxkEk1o",
  authDomain: "capturerun-27ebc.firebaseapp.com",
  databaseURL: "https://capturerun-27ebc-default-rtdb.firebaseio.com",
  projectId: "capturerun-27ebc",
  storageBucket: "capturerun-27ebc.firebasestorage.app",
  messagingSenderId: "690859670858",
  appId: "1:690859670858:web:e62118f0bfab8f0c7c55b3",
  measurementId: "G-391DD6HVWL"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);

const auth = getAuth(app);

export let userId = null;

signInAnonymously(auth).then(res => {
  userId = res.user.uid;
});
