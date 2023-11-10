import { collection, query, where, getDocs } from 'firebase/firestore'; 
import { redirect } from "react-router-dom";
import { db } from '../firebase'; // Import your Firebase authentication and Firestore setup here
import SimpleLogin from '../views/SimpleLogin';

class AuthSingleton {
  constructor() {
    if (AuthSingleton.instance) {
      console.log("AuthSingleton.instance")
      return AuthSingleton.instance;
    }

    // Initialize with default values
    this.isAuthenticated = false;
    this.user = null;

    AuthSingleton.instance = this;
  }

  async login(username) {
    console.log('username ' + username);

    try {
      const snapshot = await getDocs(query( collection(db, 'TestUsers'), where('username', '==', username)));
      console.log(snapshot);

      if (snapshot.docs.length > 0) {
        const firstElement = snapshot.docs[0];

        // User exists, set isAuthenticated to true and populate user data
        this.isAuthenticated = true;
        this.user = firstElement.data();
        // const userData = firstElement.data();
        // this.user = new SimpleUser(userData.id, userData.username, userData.name);
        console.log(firstElement);

      } else {
        // User does not exist
        console.log('User not found');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  }

  logout() {
    console.log("Logout");
    this.isAuthenticated = false;
    this.user = null;
  }

  isAuthenticated() {
    return this.isAuthenticated;
  }

  getUser() {
    return this.user;
  }
}

// export default Object.freeze( new AuthSingleton());
export default new AuthSingleton();