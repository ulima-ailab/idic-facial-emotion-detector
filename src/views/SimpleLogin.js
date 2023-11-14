import React, { useState, useEffect } from 'react';
import AuthSingleton from '../services/AuthSingleton'; 
import EmotionDetector from './emotionDetector/EmotionDetector';

function SimpleLogin() {
  const [username, setUsername] = useState(''); // State to hold the username input
  const [user, setUser] = useState(null); // State to hold the username input
  
  useEffect(() => {
    console.log("AuthSingleton.isAuthenticated: " + AuthSingleton.isAuthenticated)
    if (AuthSingleton.isAuthenticated) {
      console.log('Authentication successful');
      const user = AuthSingleton.getUser();
      setUser(user)
    } 

  }, []);
  const handleLogin = async () => {
    // Call the login method with the provided username
    await AuthSingleton.login(username);

    // Check if authentication was successful
    if (AuthSingleton.isAuthenticated) {
      console.log('Authentication successful');
      const user = AuthSingleton.getUser();
      setUser(user)
      console.log('User data:', user);
    } else {
      console.log('Authentication failed');
    }
  };

  const handleSignOut = () => {
    AuthSingleton.logout()
    window.location.reload(false);
  };

  const LoginComponent = (
    <div style={{ textAlign: 'center', padding: '80px' }}>
      <h2>Login</h2>
      <label>
        Username:&nbsp;
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </label>
      &nbsp;
      <button onClick={handleLogin} style={{ cursor: 'pointer', backgroundColor: 'green', color: 'white', padding: '4px', fontSize: '14px', border: 'none', borderRadius: '4px' }} >Login</button>
    </div>
  )

  return (
    <div>
      {user
          ? <EmotionDetector signOut={handleSignOut} currentUser={user}/> 
          : LoginComponent                    
      }
  </div>
  );
}

export default SimpleLogin;
