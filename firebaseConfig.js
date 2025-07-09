import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMessaging } from '@react-native-firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyCrmDM-bRdXKE8nEyrtzGFgPRQzMkvmrwI",
  authDomain: "socialmediatdcproject.firebaseapp.com",
  databaseURL: "https://socialmediatdcproject-default-rtdb.firebaseio.com",
  projectId: "socialmediatdcproject",
  storageBucket: "socialmediatdcproject.appspot.com",
  messagingSenderId: "988543292431",
  appId: "1:878251601548:android:b26b272ad6f008acaed5a9"
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);

// Khởi tạo Firebase Auth với AsyncStorage
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Xuất các biến Firebase
export { app, auth };
export const database = getDatabase(app);
