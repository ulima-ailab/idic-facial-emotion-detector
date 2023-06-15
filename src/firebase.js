// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBrtZgO3x0tPMGG09hmENYtreDksQaNjlo",
  authDomain: "idic-9d432.firebaseapp.com",
  databaseURL: "https://idic-9d432-default-rtdb.firebaseio.com",
  projectId: "idic-9d432",
  storageBucket: "idic-9d432.appspot.com",
  messagingSenderId: "976444897592",
  appId: "1:976444897592:web:71cba7a72f4d9508ac69cd",
  measurementId: "G-Q1HPX90Z2V"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app)
const provider = new GoogleAuthProvider();

export { auth, provider }