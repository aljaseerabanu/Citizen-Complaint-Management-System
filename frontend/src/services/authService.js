import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth';
import { auth } from '../config/firebase';
import api from './api';

export const authService = {
  // Register new user with Firebase
  register: async (userData) => {
    try {
      // Create user in Firebase
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        userData.email,
        userData.password
      );

      // Update Firebase profile with display name
      await updateProfile(userCredential.user, {
        displayName: userData.name
      });

      // Get Firebase ID token
      const idToken = await userCredential.user.getIdToken();

      // Send user data to backend with Firebase token
      const response = await api.post('/auth/register', {
        ...userData,
        firebaseUid: userCredential.user.uid,
        firebaseToken: idToken
      });

      return {
        success: true,
        user: response.data.user,
        token: response.data.token,
        firebaseUser: userCredential.user
      };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  // Login user with Firebase
  login: async (email, password, role) => {
    try {
      // Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // Get Firebase ID token
      const idToken = await userCredential.user.getIdToken();

      // Verify with backend
      const response = await api.post('/auth/login', {
        email,
        role,
        firebaseUid: userCredential.user.uid,
        firebaseToken: idToken
      });

      return {
        success: true,
        user: response.data.user,
        token: response.data.token,
        firebaseUser: userCredential.user
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  // Logout user
  logout: async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },

  // Get current Firebase user
  getCurrentFirebaseUser: () => {
    return auth.currentUser;
  },

  // Get Firebase ID token
  getFirebaseToken: async () => {
    const user = auth.currentUser;
    if (user) {
      return await user.getIdToken();
    }
    return null;
  }
};