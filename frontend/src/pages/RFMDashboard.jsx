import { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';

export default function RFMDashboard() {
    const [data, setData] = useState(null);

    useEffect(() => {
        axios.get('/clusters')
            .then((res) => {
                // Prepare data for bar chart
                const formatted = res.data.rfm_averages.map(d => ({
                    name: d.Segment,
                    Recency: Math.round(d.Recency),
                    Frequency: Math.round(d.Frequency),
                    Monetary: Math.round(d.Monetary)
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
            <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">RFM Analytics</h1>
            <p className="text-lg text-textMuted mb-10">Average Recency, Frequency, and Monetary values split by cluster segment</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                <div className="glass-card">
                    <h2 className="text-xl font-bold text-white mb-6">Monetary Value by Segment</h2>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                            <BarChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="name" stroke="#94a3b8" />
                                <YAxis stroke="#94a3b8" />
                                <Tooltip cursor={{ fill: '#334155', opacity: 0.4 }} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '10px' }} />
                                <Bar dataKey="Monetary" fill="#10b981" radius={[4, 4, 0, 0]} barSize={50} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass-card">
                    <h2 className="text-xl font-bold text-white mb-6">Recency (Days) by Segment</h2>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                            <BarChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="name" stroke="#94a3b8" />
                                <YAxis stroke="#94a3b8" />
                                <Tooltip cursor={{ fill: '#334155', opacity: 0.4 }} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '10px' }} />
                                <Bar dataKey="Recency" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={50} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass-card lg:col-span-2">
                    <h2 className="text-xl font-bold text-white mb-6">Frequency (Purchases) by Segment</h2>
                    <div className="h-80 w-full lg:w-1/2 mx-auto">
                        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                            <BarChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="name" stroke="#94a3b8" />
                                <YAxis stroke="#94a3b8" />
                                <Tooltip cursor={{ fill: '#334155', opacity: 0.4 }} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '10px' }} />
                                <Bar dataKey="Frequency" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={50} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </div>
    );
}
