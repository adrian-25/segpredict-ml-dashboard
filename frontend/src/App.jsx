import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from './layouts/Navbar';
import Overview from './pages/Overview';
import ModelTest from './pages/ModelTest';
import ModelComparison from './pages/ModelComparison';
import DataVisualizations from './pages/DataVisualizations';
import Login from './pages/Login';
import CustomerManagement from './pages/CustomerManagement';
import UploadAndTrain from './pages/UploadAndTrain';
import { useAuth } from './contexts/AuthContext';

function PrivateRoute({ children }) {
    const { isAuthenticated, loading } = useAuth();
    if (loading) return <div>Loading...</div>;
    return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { isAuthenticated, token } = useAuth();
  const [hasTrainedModel, setHasTrainedModel] = useState(false);

  // Check if user has trained a model by fetching their metrics
  useEffect(() => {
    if (!token) { setHasTrainedModel(false); return; }
    axios.get('http://localhost:8001/user-metrics', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        // Metrics exist and have content → user has uploaded & trained a model
        setHasTrainedModel(!!(res.data && res.data.total_customers > 0));
      })
      .catch(() => setHasTrainedModel(false));
  }, [token]);

  return (
    <div className="min-h-screen bg-background text-text flex flex-col font-sans relative overflow-x-hidden">
      {/* Background aesthetics */}
      <div className="absolute top-0 left-0 w-full h-96 bg-primary-900/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>

      {isAuthenticated && <Navbar />}

      <main className={`flex-1 ${isAuthenticated ? 'p-4 md:p-6' : ''} w-full max-w-[1800px] mx-auto relative z-10 flex flex-col gap-6`}>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/dashboard" element={
            <PrivateRoute>
              <>
                <Overview />
                <UploadAndTrain />
                <div className="w-full flex flex-col xl:flex-row gap-6">
                    <div className="flex-1 min-w-[50%]">
                        <ModelTest />
                    </div>
                </div>

                {/* Only show when the user has uploaded data and trained a model */}
                {hasTrainedModel && (
                  <>
                    <div className="w-full">
                      <div className="glass-card p-6">
                        <h2 className="text-xl font-bold text-white mb-4">Model Performance Metrics</h2>
                        <ModelComparison />
                      </div>
                    </div>
                    <div className="w-full">
                      <DataVisualizations />
                    </div>
                  </>
                )}
              </>
            </PrivateRoute>
          } />

          <Route path="/customers" element={
            <PrivateRoute>
               <CustomerManagement />
            </PrivateRoute>
          } />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}