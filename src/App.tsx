import { useState } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import './App.css'
import AuthProvider from './providers/authProvider'
import Dashboard from './pages/dashboard'
import { signInWithEmailAndPassword } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  limit,
} from "firebase/firestore";
import { auth, db } from "./config/firebase.js";


function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [usernameFocused, setUsernameFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)

  async function loginWithUsername(username, password) {
    const normalizedUsername = username.trim().toLowerCase();

    // Find the username in Firestore
    const usernameQuery = query(
      collection(db, "users"),
      where("username", "==", normalizedUsername),
      limit(1)
    );

    const snapshot = await getDocs(usernameQuery);

    if (snapshot.empty) {
      throw new Error("Invalid username or password");
    }

    // Get the associated email
    const account = snapshot.docs[0].data();
    const email = account.email;

    if (!email) {
      throw new Error("Account configuration error");
    }

    // Sign in with Firebase Authentication
    console.log(email)
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    // Get the ID token for future backend requests
    const token = await userCredential.user.getIdToken();
    console.log(token)

    return {
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      token,
    };
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.')
      return
    }

    setIsLoading(true)
    try {
      const userCredential = await loginWithUsername(username, password)
      console.log(userCredential)
      localStorage.setItem('uid', userCredential.uid)
      localStorage.setItem('token', userCredential.token)
      navigate('/admin/dashboard')
      setIsLoading(false)
    } catch (error: any) {
      console.log(error)
      setIsLoading(false)
      setError(error.message)
    }
  }

  return (
    <div className="login-root">
      {/* Background decoration */}
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />

      <main className="login-center">
        {/* Card */}
        <div className="login-card">

          {/* Header */}
          <div className="login-header">
            <div className="login-logo">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="28" height="28" rx="8" fill="#4f46e5" />
                <path d="M14 6L19 10V14C19 17.3 16.8 20.4 14 21C11.2 20.4 9 17.3 9 14V10L14 6Z" fill="white" fillOpacity="0.9" />
                <circle cx="14" cy="14" r="2.5" fill="#4f46e5" />
              </svg>
            </div>
            <h1 className="login-title">Incident Review Portal</h1>
            <p className="login-subtitle">Admin Access</p>
            <p className="login-description">Sign in to review and manage reported incidents</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="login-error" role="alert">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="#ef4444" strokeWidth="1.5" />
                <path d="M8 5v4M8 11v.5" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              {error}
            </div>
          )}

          {/* Form */}
          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {/* Username field */}
            <div className={`form-group ${usernameFocused || username ? 'active' : ''}`}>
              <label htmlFor="username" className="form-label">Username</label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <circle cx="9" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M3 15c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </span>
                <input
                  id="username"
                  type="text"
                  className="form-input"
                  placeholder="Enter your username"
                  value={username}
                  autoComplete="username"
                  onChange={e => setUsername(e.target.value)}
                  onFocus={() => setUsernameFocused(true)}
                  onBlur={() => setUsernameFocused(false)}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password field */}
            <div className={`form-group ${passwordFocused || password ? 'active' : ''}`}>
              <div className="label-row">
                <label htmlFor="password" className="form-label">Password</label>
              </div>
              <div className="input-wrapper">
                <span className="input-icon">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <rect x="3" y="8" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M6 8V6a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  autoComplete="current-password"
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(p => !p)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M2 9s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.5" />
                      <circle cx="9" cy="9" r="2" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M2 2l14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M2 9s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.5" />
                      <circle cx="9" cy="9" r="2" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              className={`login-btn ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign In
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="login-footer">
            Authorised personnel only &mdash; all access is logged and monitored.
          </p>
        </div>
      </main>
    </div>
  )
}


export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route
        path="/admin/dashboard"
        element={
          <AuthProvider>
            <Dashboard />
          </AuthProvider>
        }
      />
    </Routes>
  )
}
