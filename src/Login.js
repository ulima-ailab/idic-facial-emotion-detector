import {auth, provider} from "./firebase"
import { useEffect, useState } from 'react';
import { signInWithPopup, signOut } from "firebase/auth";

import EmotionDetector from "./emotionDetector/EmotionDetector";

function Login() {
    const [isAuthenticated, updateAuth] = useState("")

    const handleSignIn =()=> {
        signInWithPopup(auth, provider)
        .then((data) => {
            updateAuth(data.user)
            localStorage.setItem("user", data.user)
        })
    }

    const handleSignOut = () => {
        signOut(auth)
          .then(() => {
            updateAuth(null)
            localStorage.removeItem("user");
            
          })
          .catch((error) => {
            console.log(error);
          });
      };

    useEffect(() => {
        updateAuth(localStorage.getItem("user"))
    })

    const SignInButton = (
        <div style={{ textAlign: 'center', padding: '10px' }}>
            <button onClick={handleSignIn} style={{ cursor: 'pointer', backgroundColor: 'green', color: 'white', padding: '15px', fontSize: '25px', border: 'none', borderRadius: '10px' }}>
            Sign In With Google
            </button>
        </div>
    )

    const SignOutButton = (
        <div style={{ textAlign: 'left', padding: '10px' }}>
            <button onClick={handleSignOut} style={{ cursor: 'pointer', backgroundColor: 'green', color: 'white', padding: '15px', fontSize: '25px', border: 'none', borderRadius: '10px' }}>
            LogOut
            </button>
        </div>
    )

    return (
        <div>
    
            {isAuthenticated 
                ? <EmotionDetector signOut={handleSignOut}/> 
                : SignInButton                    
            }
        </div>
    );
}

export default Login;
