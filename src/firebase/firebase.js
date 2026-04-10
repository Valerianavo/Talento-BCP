// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDzivQwBvI4RoqiEEF_WjfOgz63N2_Us_w",
  authDomain: "talento-bcp.firebaseapp.com",
  projectId: "talento-bcp",
  storageBucket: "talento-bcp.firebasestorage.app",
  messagingSenderId: "620778737610",
  appId: "1:620778737610:web:f532ffe16602d2bfc70933",
  measurementId: "G-FP63X6HMX3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth();
export const provider = new GoogleAuthProvider();