import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyC1NQ36ufF2NCL2Z9AnPIlY4TYVY6qW8aM",
    authDomain: "oauincidentreport.firebaseapp.com",
    projectId: "oauincidentreport",
    storageBucket: "oauincidentreport.firebasestorage.app",
    messagingSenderId: "693716607958",
    appId: "1:693716607958:web:5d99195d83e78ad9ef7a77",
    measurementId: "G-VFYXWMHS9M"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);