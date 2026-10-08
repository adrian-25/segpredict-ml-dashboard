import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Navigate } from 'react-router-dom';

const Login = () => {
    const { login, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    const handleGoogleSuccess = async (credentialResponse) => {
        try {
            const res = await axios.post('/auth/google', {
                token: credentialResponse.credential
            });
            
            // Backend returns access_token and user info
            const { access_token, user } = res.data;
            login(access_token, user);
            navigate('/dashboard');
        } catch (error) {
            console.error('Login Failed', error);
            alert("Login failed, please try again.");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 relative overflow-hidden">
            {/* Background elements aligned with existing aesthetic */}
            <div className="absolute top-0 left-0 w-full h-full bg-primary-900/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
            
            <div className="glass-card p-10 flex flex-col items-center max-w-md w-full border border-gray-800 rounded-2xl shadow-xl z-10 bg-gray-900/50 backdrop-blur-md">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-6 border border-blue-500/40">
                    <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                    </svg>
                </div>
                
                <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
                <p className="text-gray-400 mb-8 text-center">Sign in to your SegPredict Analytics Dashboard</p>
                
                <div className="w-full flex justify-center">
                    <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={() => console.log('Login Failed')}
                        theme="filled_black"
                        shape="pill"
                    />
                </div>
                
                <p className="text-xs text-gray-500 mt-8 text-center px-4">
                    By signing in, you agree to our Terms of Service and Privacy Policy.
                </p>
            </div>
        </div>
    );
};

export default Login;
