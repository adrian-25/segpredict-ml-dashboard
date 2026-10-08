import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { createClient } from '@supabase/supabase-js';

const AuthContext = createContext();
const demoMode = window.__APP_CONFIG__?.DEMO_MODE === true;
const demoUser = { id: 'demo-user', name: 'Demo User', email: 'demo@segpredict.app' };
const supabaseUrl = window.__APP_CONFIG__?.SUPABASE_URL;
const supabaseAnonKey = window.__APP_CONFIG__?.SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(demoMode ? demoUser : null);
    const [token, setToken] = useState(demoMode ? 'demo-session' : localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initializeAnonymousSession = async () => {
            if (demoMode || !supabase) return false;

            let { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                const { data, error } = await supabase.auth.signInAnonymously();
                if (error) throw error;
                session = data.session;
            }
            if (!session) throw new Error('Unable to create an anonymous session.');
            setToken(session.access_token);
            setUser({ id: session.user.id, name: 'Anonymous user', email: null });
            return true;
        };

        const initializeAuth = async () => {
          try {
            if (await initializeAnonymousSession()) return;
            if (token) {
                const decoded = jwtDecode(token);
                if (decoded.exp * 1000 < Date.now()) {
                    logout();
                } else {
                    const savedUser = localStorage.getItem('user');
                    if (savedUser) setUser(JSON.parse(savedUser));
                }
            }
          } catch (error) {
            console.error('Authentication initialization failed', error);
            logout();
          } finally {
            setLoading(false);
          }
        };

        initializeAuth();
    }, []);

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
