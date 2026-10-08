import { useState } from 'react';
import axios from 'axios';
import { Search, User, Target, Gift, TrendingUp } from 'lucide-react';

export default function CustomerDetail() {
    const [customerId, setCustomerId] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!customerId) return;

        setLoading(true);
        setError('');

        try {
            const res = await axios.get(`/recommend/${customerId}`);
            setResult(res.data);
        } catch (err) {
            setError(err.response?.data?.detail || "Customer not found or error occurred.");
            setResult(null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-5xl">
            <h1 className="text-4xl font-extrabold text-gray-800 mb-2 tracking-tight">Customer Insights</h1>
            <p className="text-lg text-textMuted mb-10">Real-time prediction and actionable business recommendations per customer.</p>

            <form onSubmit={handleSearch} className="mb-8">
                <div className="relative flex items-center gap-4">
                    <div className="relative flex-grow">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                            <Search className="w-5 h-5" />
                        </span>

                        <input
                            type="text"
                            value={customerId}
                            onChange={(e) => setCustomerId(e.target.value)}
                            placeholder="Enter the customer id..."
                            className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg bg-white/5 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all text-gray-800"
                            disabled={loading}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading || !customerId}
                        className="px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-md transition-all whitespace-nowrap"
                    >
                        {loading ? 'Searching...' : 'Search'}
                    </button>
                </div>
                {error && (
                    <div className="mt-3 text-red-500 text-sm font-medium bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                        {error}
                    </div>
                )}
            </form>

            {result && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-bottom-8 fade-in duration-500 fade-in zoom-in-95">
                    {/* Customer Profile */}
                    <div className="glass-card">
                        <div className="flex items-center space-x-3 border-b border-white/10 pb-4 mb-4">
                            <div className="p-3 bg-primary-500/20 rounded-full text-primary-400">
                                <User />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">ID: {result.customer_id}</h2>
                                <span className="text-xs uppercase tracking-wider font-semibold text-textMuted">Profile Context</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-white/5">
                                <span className="text-textMuted">Segment</span>
                                <span className="px-3 py-1 bg-surfaceLight rounded-full text-white font-medium text-sm border border-white/10 shadow-sm">{result.prediction_context.segment}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-white/5">
                                <span className="text-textMuted">Recency</span>
                                <span className="text-gray-800 font-bold">{Math.round(result.prediction_context.rfm.Recency)} Days</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-white/5">
                                <span className="text-textMuted">Frequency</span>
                                <span className="text-gray-800 font-bold">{Math.round(result.prediction_context.rfm.Frequency)} Purchases</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-white/5">
                                <span className="text-textMuted">Monetary</span>
                                <span className="text-gray-800 font-bold text-green-400">${Math.round(result.prediction_context.rfm.Monetary)}</span>
                            </div>
                        </div>
                    </div>

                    {/* AI Prediction & Recs */}
                    <div className="space-y-8">
                        <div className="glass-card relative overflow-hidden">
                            <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl -z-10 rounded-full ${result.prediction_context.predicted_purchase_next_30_days ? 'bg-green-500/20' : 'bg-red-500/20'}`}></div>
                            <h2 className="text-lg font-bold text-gray-800 flex items-center mb-4">
                                <Target className="w-5 h-5 mr-2 text-primary-400" />
                                30-Day Predictive Status
                            </h2>
                            <div className="flex items-center space-x-4 p-4 rounded-xl bg-surfaceLight/30 border border-white/5">
                                {result.prediction_context.predicted_purchase_next_30_days ? (
                                    <span className="text-green-400 font-extrabold text-2xl tracking-wide flex items-center">
                                        EXPECTED TO BUY <TrendingUp className="w-6 h-6 ml-2" />
                                    </span>
                                ) : (
                                    <span className="text-orange-400 font-extrabold text-2xl tracking-wide">
                                        HIGH FLIGHT RISK
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="glass-card border-t-4 border-t-blue-500 shadow-blue-500/10">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center mb-4">
                                <Gift className="w-5 h-5 mr-2 text-blue-400" />
                                Actionable AI Strategy
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs text-textMuted uppercase tracking-wider mb-1">Recommended Approach</p>
                                    <p className="text-gray-800 font-medium text-lg">{result.recommendations.strategy}</p>
                                </div>

                                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                    <p className="text-xs text-blue-300 uppercase tracking-wider mb-2 font-bold">Suggested Offers</p>
                                    <ul className="list-disc pl-5 space-y-1 text-gray-800">
                                        {result.recommendations.offers.map((off, i) => (
                                            <li key={i}>{off}</li>
                                        ))}
                                    </ul>
                                </div>

                                {result.recommendations.upsell_cross_sell && (
                                    <div>
                                        <p className="text-xs text-textMuted uppercase tracking-wider mb-1 mt-2">Upsell Opportunity</p>
                                        <p className="text-gray-800 font-medium flex items-center">
                                            <TrendingUp className="w-4 h-4 mr-2 text-green-400" />
                                            {result.recommendations.upsell_cross_sell}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}
