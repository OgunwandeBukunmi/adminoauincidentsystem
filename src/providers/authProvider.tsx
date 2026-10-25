// This is a wrapper that covers the admin dashboard and won't allow unauthenticated users to access it.
// It calls the backend's POST /api/admin/verify-token endpoint to validate the token in localStorage.

import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const BACKEND_URL = 'http://localhost:5000';

type AuthStatus = 'pending' | 'authenticated' | 'unauthenticated';

interface AuthProviderProps {
  children: ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('pending');
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('token');
    console.log(token)

    if (!token) {
      setAuthStatus('unauthenticated');
      return;
    }

    const verifyToken = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/admin/verify-token`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();

        console.log(data)
        if (response.ok && data.authenticated === true) {
          setAuthStatus('authenticated');
        } else {
          // Token is invalid or expired — clear it
          localStorage.removeItem('token');
          localStorage.removeItem('uid');
          setAuthStatus('unauthenticated');
        }
      } catch (error) {
        console.error('Token verification failed:', error);
        // Network error — treat as unauthenticated
        setAuthStatus('unauthenticated');
      }
    };

    verifyToken();
  }, []);

  if (authStatus === 'pending') {
    // Render a minimal loading screen while we verify
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#0f0f1a',
        color: 'rgba(255,255,255,0.5)',
        fontFamily: 'Inter, sans-serif',
        fontSize: '0.9rem',
        letterSpacing: '0.05em',
      }}>
        Verifying session…
      </div>
    );
  }

  if (authStatus === 'unauthenticated') {
    // Redirect to login, preserving the intended destination
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Authenticated — render the protected content
  return <>{children}</>;
}