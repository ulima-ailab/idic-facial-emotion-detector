import {auth, provider} from "./firebase"
import { useEffect, useState } from 'react';
import { signInWithPopup } from "firebase/auth";
import App from './App';

function Login() {
    const [isAuthenticated, updateAuth] = useState("")

    const handleClick =()=> {
        signInWithPopup(auth, provider)
        .then((data) => {
            updateAuth(data.user)
            localStorage.setItem("user", data.user)
        })
    }

    useEffect(() => {
        updateAuth(localStorage.getItem("user"))
    })

    return (
        <div>
            {isAuthenticated ?
            <App/>:
            <button onClick={handleClick}>Sign In With Google</button>

            }
        </div>
    );
}

export default Login;
