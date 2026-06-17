import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
// Replace these with your actual Firebase config from Firebase Console
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAcYSqXSMcrwv3TdTGBDbbIJNI2rDXE5Ic",
  authDomain: "complaint-management-sys-fbbe7.firebaseapp.com",
  projectId: "complaint-management-sys-fbbe7",
  storageBucket: "complaint-management-sys-fbbe7.firebasestorage.app",
  messagingSenderId: "968316290390",
  appId: "1:968316290390:web:6f8d0d6942d8b1150902f7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

export default app;