import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext();
const demoMode = window.__APP_CONFIG__?.DEMO_MODE === true;
const demoUser = { id: 'demo-user', name: 'Demo User', email: 'demo@segpredict.app' };

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(demoMode ? demoUser : null);
    const [token, setToken] = useState(localStorage.getItem('token') || (demoMode ? 'demo-session' : null));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            try {
                const decoded = jwtDecode(token);
                // Check if expired
                if (decoded.exp * 1000 < Date.now()) {
                    logout();
                } else {
                    // We decode just to enforce expiry, but the actual user info
                    // might be set from local storage or needs to be fetched
                    const savedUser = localStorage.getItem('user');
                    if (savedUser) setUser(JSON.parse(savedUser));
                }
            } catch (error) {
                logout();
            }
        }
        setLoading(false);
    }, [token]);

    const login = (newToken, userData) => {
        setToken(newToken);
        setUser(userData);
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(userData));
    };

    const logout = () => {
        if (demoMode) {
            setUser(demoUser);
            setToken('demo-session');
            return;
        }
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };

    return (
        <AuthContext.Provider value={{ user, token, isAuthenticated: demoMode || !!token, isDemo: demoMode, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
