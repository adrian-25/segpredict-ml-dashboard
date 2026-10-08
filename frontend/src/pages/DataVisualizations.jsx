import { useEffect, useState } from 'react';
import axios from 'axios';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function DataVisualizations() {
    const [scatterData, setScatterData] = useState(null);
    const [modelMetrics, setModelMetrics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [scatterRes, metricsRes] = await Promise.all([
                    axios.get('/scatter-data'),
                    axios.get('/model-metrics')
                ]);
                setScatterData(scatterRes.data);
                setModelMetrics(metricsRes.data);
            } catch (error) {
                console.error("Failed to fetch visualization data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
         return (
            <div className="w-full flex items-center justify-center p-20 glass-card mt-6">
                <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
         );
    }

    if (!scatterData || !modelMetrics) return null;

    // Determine the best model dynamically to show its confusion matrix and feature importance
    const modelsArray = Object.entries(modelMetrics).map(([name, metrics]) => ({
        name,
        f1: metrics.f1_score,
        cm: metrics.confusion_matrix,
        importances: metrics.feature_importance
    }));
    
    // Sort to find the highest F1 Score model
    modelsArray.sort((a, b) => b.f1 - a.f1);
    const bestModel = modelsArray[0];

    // Format Data for Recharts ScatterPlot
    const rechartsScatterData = scatterData.Recency.map((r, i) => ({
        recency: r,
        frequency: scatterData.Frequency[i],
        monetary: scatterData.Monetary[i],
        segment: scatterData.Segment[i],
        color: scatterData.Colors[i]
    }));

    // Custom Scatter Tooltip
    const ScatterTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-slate-900/95 border border-white/10 p-3 rounded-lg shadow-xl backdrop-blur-md">
                    <p className="font-bold text-white mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{backgroundColor: data.color}}></span>
                        {data.segment}
                    </p>
                    <div className="flex flex-col gap-1 text-sm bg-black/20 p-2 rounded border border-white/5">
                        <p className="text-slate-300 flex justify-between gap-4">Recency: <span className="font-mono text-white">{data.recency.toFixed(0)} days</span></p>
                        <p className="text-slate-300 flex justify-between gap-4">Frequency: <span className="font-mono text-white">{data.frequency.toFixed(0)}</span></p>
                        <p className="text-slate-300 flex justify-between gap-4">Monetary: <span className="font-mono text-emerald-400">${data.monetary.toFixed(2)}</span></p>
                    </div>
                </div>
            );
        }
        return null;
    };

    // Extract Confusion Matrix [ [TN, FP], [FN, TP] ]
    const cm = bestModel.cm;
    const tn = cm[0][0], fp = cm[0][1];
    const fn = cm[1][0], tp = cm[1][1];

    return (
        <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500 mb-10">
            <h2 className="text-3xl font-extrabold text-white mt-8 tracking-tight">Advanced Data Visualizations</h2>
            <p className="text-textMuted mb-2 text-lg">In-depth statistical mappings of customer behavioral models.</p>
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 w-full">
                
                {/* 2D SCATTER PLOT */}
                <div className="glass-card relative min-h-[500px] flex flex-col p-6">
                    <h3 className="text-xl font-bold text-white mb-1">2D Customer Segmentation Space</h3>
                    <p className="text-sm text-textMuted mb-6">Mapping of customer clusters across Recency and Frequency metrics.</p>
                    <div className="flex-1 w-full bg-slate-950/30 rounded-xl border border-white/5 p-4 relative z-0 min-h-[400px]">
                        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                            <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                                <XAxis 
                                    type="number" 
                                    dataKey="recency" 
                                    name="Recency" 
                                    stroke="#94a3b8" 
                                    tick={{fontSize: 12, fill: '#94a3b8'}}
                                    tickMargin={10}
                                    label={{ value: 'Recency (Days)', position: 'insideBottom', offset: -15, fill: '#64748b', fontSize: 13 }} 
                                />
                                <YAxis 
                                    type="number" 
                                    dataKey="frequency" 
                                    name="Frequency" 
                                    stroke="#94a3b8" 
                                    tick={{fontSize: 12, fill: '#94a3b8'}}
                                    tickMargin={10}
                                    label={{ value: 'Frequency (Orders)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 13 }} 
                                />
                                <Tooltip content={<ScatterTooltip />} cursor={{strokeDasharray: '3 3', stroke: '#475569'}} />
                                <Scatter data={rechartsScatterData} name="Customers">
                                    {rechartsScatterData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} opacity={0.7} />
                                    ))}
                                </Scatter>
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* CONFUSION MATRIX (CSS Grid) */}
                <div className="glass-card relative min-h-[500px] flex flex-col p-6">
                    <h3 className="text-xl font-bold text-white mb-1">Confusion Matrix</h3>
                    <p className="text-sm text-textMuted mb-6">Classification performance evaluated on test split ({bestModel.name}).</p>
                    
                    <div className="flex-1 w-full bg-slate-950/30 rounded-xl border border-white/5 flex flex-col justify-center items-center py-8">
                        <div className="flex flex-col items-center">
                            <p className="text-sm text-slate-400 mb-3 font-bold uppercase tracking-wider">Predicted Class</p>
                            
                            <div className="flex items-center">
                                <div className="flex flex-col justify-center items-center mr-4 w-6 h-full relative">
                                    <p className="text-sm text-slate-400 font-bold uppercase tracking-wider -rotate-90 absolute whitespace-nowrap">Actual Class</p>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3 text-center text-white">
                                    {/* Column Headers */}
                                    <div className="bg-slate-800/80 p-2 rounded text-xs font-bold text-slate-300">Predicted Neg</div>
                                    <div className="bg-slate-800/80 p-2 rounded text-xs font-bold text-slate-300">Predicted Pos</div>
                                    
                                    {/* True Negative */}
                                    <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-6 flex flex-col justify-center items-center h-32 w-36 sm:w-40 relative group hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all duration-300">
                                        <span className="text-[10px] text-slate-400 absolute top-2 left-2 uppercase font-bold tracking-wider">Actual Neg</span>
                                        <span className="text-4xl font-black mt-2 text-white">{tn}</span>
                                        <span className="text-xs text-emerald-400 mt-2 uppercase tracking-widest font-bold">True Neg</span>
                                    </div>
                                    
                                    {/* False Positive */}
                                    <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-6 flex flex-col justify-center items-center h-32 w-36 sm:w-40 relative group hover:border-rose-500/50 hover:bg-rose-500/10 transition-all duration-300">
                                        <span className="text-[10px] text-slate-400 absolute top-2 left-2 uppercase font-bold tracking-wider">Actual Neg</span>
                                        <span className="text-4xl font-black mt-2 text-white">{fp}</span>
                                        <span className="text-xs text-rose-400 mt-2 uppercase tracking-widest font-bold">False Pos</span>
                                    </div>

                                    {/* False Negative */}
                                    <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-6 flex flex-col justify-center items-center h-32 w-36 sm:w-40 relative group hover:border-rose-500/50 hover:bg-rose-500/10 transition-all duration-300">
                                        <span className="text-[10px] text-slate-400 absolute top-2 left-2 uppercase font-bold tracking-wider">Actual Pos</span>
                                        <span className="text-4xl font-black mt-2 text-white">{fn}</span>
                                        <span className="text-xs text-rose-400 mt-2 uppercase tracking-widest font-bold">False Neg</span>
                                    </div>
                                    
                                    {/* True Positive */}
                                    <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-6 flex flex-col justify-center items-center h-32 w-36 sm:w-40 relative group hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all duration-300">
                                        <span className="text-[10px] text-slate-400 absolute top-2 left-2 uppercase font-bold tracking-wider">Actual Pos</span>
                                        <span className="text-4xl font-black mt-2 text-white">{tp}</span>
                                        <span className="text-xs text-emerald-400 mt-2 uppercase tracking-widest font-bold">True Pos</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
