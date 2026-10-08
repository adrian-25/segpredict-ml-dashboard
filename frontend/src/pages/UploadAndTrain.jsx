import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function UploadAndTrain() {
    const { token } = useAuth();
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [trainingResults, setTrainingResults] = useState(null);

    const handleFileChange = (e) => {
        if (e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            toast.error("Please select a CSV file first");
            return;
        }
        
        const formData = new FormData();
        formData.append('file', file);
        
        setLoading(true);
        try {
            const res = await axios.post('/upload-csv', formData, {
                headers: { 
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}` 
                }
            });
            setTrainingResults(res.data.training_results);
            toast.success("Model trained successfully!");
            // Quick reload to update dashboard metrics
            setTimeout(() => window.location.reload(), 2000);
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.detail || "Upload & Training failed.");
        }
        setLoading(false);
    };

    return (
        <div className="glass-card p-8 w-full">
            <Toaster position="top-right" />
            <h2 className="text-2xl font-bold text-white mb-2">Build Your Custom Model</h2>
            <p className="text-gray-400 mb-6">Upload your historical customer dataset to train an exclusive ML model adapted to your exact retail attributes.</p>
            
            <div className="border-2 border-dashed border-gray-700 rounded-xl p-10 flex flex-col items-center justify-center bg-surfaceLight/10 hover:bg-surfaceLight/30 transition-colors">
                <Upload className="w-12 h-12 text-blue-500 mb-4" />
                <input 
                    type="file" 
                    accept=".csv" 
                    onChange={handleFileChange} 
                    className="mb-4 text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-500/20 file:text-blue-400 hover:file:bg-blue-500/30"
                />
                
                <button 
                    onClick={handleUpload}
                    disabled={!file || loading}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-bold flex items-center gap-2 mt-4"
                >
                    {loading ? (
                       <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Training...</>
                    ) : (
                       "Upload & Train Model"
                    )}
                </button>
            </div>
            
            {trainingResults && (
                <div className="mt-8 p-6 bg-green-900/20 border border-green-500/30 rounded-xl">
                    <h3 className="text-lg font-bold text-green-400 flex items-center gap-2 mb-4">
                        <CheckCircle size={20} /> Training Complete
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-surface p-4 rounded-lg border border-gray-700">
                            <p className="text-xs text-gray-400 uppercase tracking-wide">Best Model</p>
                            <p className="text-lg font-bold text-white">{trainingResults.best_model}</p>
                        </div>
                        <div className="bg-surface p-4 rounded-lg border border-gray-700">
                            <p className="text-xs text-gray-400 uppercase tracking-wide">Accuracy</p>
                            <p className="text-lg font-bold text-blue-400">{(trainingResults.accuracy * 100).toFixed(1)}%</p>
                        </div>
                        <div className="bg-surface p-4 rounded-lg border border-gray-700">
                            <p className="text-xs text-gray-400 uppercase tracking-wide">F1-Score</p>
                            <p className="text-lg font-bold text-purple-400">{(trainingResults.f1_score * 100).toFixed(1)}%</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
