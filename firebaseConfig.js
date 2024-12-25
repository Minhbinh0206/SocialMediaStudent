import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyA_B5SzWxHRv7PxmB4Wak39rHIzHT4EQX0",
  authDomain: "nckh-38507.firebaseapp.com",
  databaseURL: "https://nckh-38507-default-rtdb.firebaseio.com",
  projectId: "nckh-38507",
  storageBucket: "nckh-38507.appspot.com",
  messagingSenderId: "988543292431",
  appId: "1:988543292431:android:59fbf61097a72f59f3bf7a"
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);
