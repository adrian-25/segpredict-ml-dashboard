import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Settings } from 'lucide-react';

export default function CustomerManagement() {
    const { token } = useAuth();
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '', email: '', recency: '', frequency: '', monetary: '',
        avg_order_value: '', purchases_per_month: ''
    });

    const fetchCustomers = async () => {
        try {
            const res = await axios.get('http://localhost:8001/customers', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCustomers(res.data);
        } catch (e) {
            console.error("Failed to fetch customers");
        }
    };

    useEffect(() => {
        if (token) fetchCustomers();
    }, [token]);

    const handleInput = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const addCustomer = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const parsed = {
                ...formData,
                recency: Number(formData.recency),
                frequency: Number(formData.frequency),
                monetary: Number(formData.monetary),
                avg_order_value: Number(formData.avg_order_value),
                purchases_per_month: Number(formData.purchases_per_month),
            };
            await axios.post('http://localhost:8001/customers', parsed, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFormData({ name: '', email: '', recency: '', frequency: '', monetary: '', avg_order_value: '', purchases_per_month: '' });
            fetchCustomers();
        } catch (error) {
            alert('Failed to add customer');
        }
        setLoading(false);
    };

    const runPrediction = async (id) => {
        try {
            await axios.post(`http://localhost:8001/customers/${id}/predict`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchCustomers();
        } catch (e) {
            alert("Failed prediction");
        }
    };

    const sendEmail = async (id) => {
        try {
             await axios.post(`http://localhost:8001/send-email`, { customer_id: id }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchCustomers();
        } catch (e) {
            alert("Failed to send email");
        }
    };

    return (
        <div className="w-full flex gap-6">
            <div className="w-1/3 glass-card p-6">
                <h2 className="text-xl font-bold text-white mb-4">Add Customer</h2>
                <form onSubmit={addCustomer} className="flex flex-col gap-3">
                    <input name="name" value={formData.name} onChange={handleInput} placeholder="Name" required className="bg-surface p-2 rounded text-white border border-gray-700"/>
                    <input name="email" value={formData.email} onChange={handleInput} placeholder="Email" type="email" required className="bg-surface p-2 rounded text-white border border-gray-700"/>
                    <input name="recency" value={formData.recency} onChange={handleInput} placeholder="Recency (days)" type="number" required className="bg-surface p-2 rounded text-white border border-gray-700"/>
                    <input name="frequency" value={formData.frequency} onChange={handleInput} placeholder="Frequency (visits)" type="number" required className="bg-surface p-2 rounded text-white border border-gray-700"/>
                    <input name="monetary" value={formData.monetary} onChange={handleInput} placeholder="Monetary ($)" type="number" required className="bg-surface p-2 rounded text-white border border-gray-700"/>
                    <input name="avg_order_value" value={formData.avg_order_value} onChange={handleInput} placeholder="Avg Order Value ($)" type="number" required className="bg-surface p-2 rounded text-white border border-gray-700"/>
                    <input name="purchases_per_month" value={formData.purchases_per_month} onChange={handleInput} placeholder="Purchases/Month" type="number" step="0.1" required className="bg-surface p-2 rounded text-white border border-gray-700"/>
                    <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 py-2 rounded text-white font-bold mt-2">
                        {loading ? 'Adding...' : 'Add Customer'}
                    </button>
                </form>
            </div>
            <div className="w-2/3 glass-card p-6 overflow-x-auto">
                <h2 className="text-xl font-bold text-white mb-4">Customer Directory</h2>
                <table className="w-full text-left text-sm text-gray-400 border-collapse">
                    <thead className="bg-gray-800/50 text-gray-200">
                        <tr>
                            <th className="p-3 border-b border-gray-700">Name</th>
                            <th className="p-3 border-b border-gray-700">Email</th>
                            <th className="p-3 border-b border-gray-700">Label</th>
                            <th className="p-3 border-b border-gray-700">Email Status</th>
                            <th className="p-3 border-b border-gray-700">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {customers.map(c => (
                            <tr key={c.id} className="hover:bg-gray-800/30">
                                <td className="p-3 border-b border-gray-800 text-white truncate">{c.name}</td>
                                <td className="p-3 border-b border-gray-800">{c.email}</td>
                                <td className="p-3 border-b border-gray-800 font-semibold">{c.prediction_label || 'None'}</td>
                                <td className="p-3 border-b border-gray-800 relative">
                                     <span className={`px-2 py-1 text-xs rounded-full ${c.email_status === 'Approved' ? 'bg-green-500/20 text-green-400' : c.email_status === 'Sent' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                        {c.email_status}
                                     </span>
                                </td>
                                <td className="p-3 border-b border-gray-800 flex gap-2">
                                    <button onClick={() => runPrediction(c.id)} title="Run Prediction" className="p-2 bg-purple-600/20 text-purple-400 hover:bg-purple-600/40 rounded transition-colors"><Settings size={16}/></button>
                                    {(c.prediction_label === 'Medium Risk' || c.prediction_label === 'High Churn Risk') && c.email_status !== "Approved" && (
                                        <button onClick={() => sendEmail(c.id)} disabled={c.email_status === 'Sent'} title="Send Offer Email" className="p-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 rounded transition-colors disabled:opacity-50">
                                            <Mail size={16}/>
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {customers.length === 0 && <tr><td colSpan="5" className="p-4 text-center">No customers found.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
