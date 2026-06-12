import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";
import firebaseConfig from "../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const db = null; // Decoupled/removed from the app as requested.
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

googleProvider.addScope("email");
googleProvider.addScope("profile");
googleProvider.setCustomParameters({
  prompt: "select_account"
});

// Safely lazy-initialize Analytics
export let analytics: any = null;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
    console.log("[FIREBASE] Analytics initialized successfully.");
  }
}).catch((err) => {
  console.warn("[FIREBASE] Analytics not supported in this environment:", err);
});

export { signInWithPopup };
