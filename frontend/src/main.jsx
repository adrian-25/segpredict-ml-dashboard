import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

import { BrowserRouter } from "react-router-dom";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from "./contexts/AuthContext";
import axios from "axios";

const appConfig = window.__APP_CONFIG__ || {};
const demoMode = appConfig.DEMO_MODE === true;
const supabaseMode = Boolean(appConfig.SUPABASE_URL && appConfig.SUPABASE_ANON_KEY);
axios.defaults.baseURL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:8001" : "");

const clientId = appConfig.GOOGLE_CLIENT_ID || import.meta.env.VITE_GOOGLE_CLIENT_ID;
const app = (
  <AuthProvider>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </AuthProvider>
);

ReactDOM.createRoot(document.getElementById("root")).render(
  demoMode || supabaseMode ? app : <GoogleOAuthProvider clientId={clientId}>{app}</GoogleOAuthProvider>
);
