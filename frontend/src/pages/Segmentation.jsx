import { useEffect, useState } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

export default function Segmentation() {
    const [data, setData] = useState(null);

    useEffect(() => {
        axios.get('/clusters')
            .then((res) => {
                const formatted = Object.entries(res.data.distribution).map(([name, value]) => ({
                    name, value
                }));
                setData(formatted);
            })
            .catch((err) => console.error(err));
    }, []);

    if (!data) return (
        <div className="flex items-center justify-center p-20">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">Customer Segmentation</h1>
            <p className="text-lg text-textMuted mb-10">K-Means Clustering assignments based on purchasing behavior</p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                <div className="glass-card lg:col-span-2">
                    <h2 className="text-xl font-bold text-white mb-6">Audience Distribution</h2>
                    <div className="h-96">
                        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                            <PieChart>
                                <Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={90}
                                    outerRadius={140}
                                    paddingAngle={5}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                >
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '10px' }} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="space-y-6">
                    {data.map((seg, i) => (
                        <div key={seg.name} className="glass-card flex items-center p-4 border-l-4 transition-transform hover:-translate-y-1" style={{ borderLeftColor: COLORS[i % COLORS.length] }}>
                            <div className="flex-1">
                                <p className="font-bold text-white text-lg">{seg.name}</p>
                                <p className="text-sm text-textMuted mt-1">Total count: {seg.value}</p>
                            </div>
                        </div>
                    ))}

                    <div className="glass-card bg-primary-900/20 border-primary-500/30">
                        <h3 className="font-bold text-primary-400 mb-2">Strategy Tip</h3>
                        <p className="text-sm text-textMuted">Your High Value cluster should receive loyalty rewards as they drive the majority of consistent revenue. Monitor the At Risk segment with aggressive retention campaigns.</p>
                    </div>
                </div>

            </div>
        </div>
    );
}
