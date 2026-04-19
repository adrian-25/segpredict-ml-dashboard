import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Play, TrendingUp, AlertTriangle, Target, Lightbulb, Loader2, CheckCircle, Send, Users, RefreshCw, Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const API = 'http://localhost:8001';

const emailStatusBadge = (status) => {
  const map = {
    'Approved': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    'Sent': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'Not Sent': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };
  return map[status] || map['Not Sent'];
};

const riskBadge = (label) => {
  if (!label || label === 'None') return 'bg-gray-500/20 text-gray-400';
  if (label === 'High Churn Risk') return 'bg-rose-500/20 text-rose-400';
  if (label === 'Medium Risk') return 'bg-amber-500/20 text-amber-400';
  return 'bg-emerald-500/20 text-emerald-400';
};

export default function ModelTest() {
  const { token } = useAuth();

  /* ── Form state ── */
  const [formData, setFormData] = useState({
    Name: '', Email: '',
    Recency: '', Frequency: '', Monetary: '', AvgOrderValue: '', PurchaseFreqPerMonth: ''
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [showSuccessMsg, setShowSuccessMsg] = useState(false);
  const [currentCustomerId, setCurrentCustomerId] = useState(null);
  const [emailStatus, setEmailStatus] = useState('');

  /* ── Customer list state ── */
  const [customers, setCustomers] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [predictingId, setPredictingId] = useState(null);
  const [sendingEmailId, setSendingEmailId] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null); // customer loaded from table

  /* ── Fetch customer list ── */
  const fetchCustomers = useCallback(async () => {
    if (!token) return;
    setListLoading(true);
    try {
      const res = await axios.get(`${API}/customers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCustomers(res.data);
    } catch (e) {
      console.error('Failed to fetch customers', e);
    } finally {
      setListLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  /* ── Input Handling ── */
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'Name' || name === 'Email') {
      setFormData(prev => ({ ...prev, [name]: value }));
      return;
    }
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const blockInvalidChars = (e) => {
    if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
  };

  /* ── Load a saved customer into the form when their row is clicked ── */
  const loadCustomerIntoForm = (c) => {
    setSelectedCustomer(c);
    setCurrentCustomerId(c.id);
    setEmailStatus(c.email_status || '');
    setResult(null);
    setError('');
    setFormData({
      Name: c.name,
      Email: c.email,
      Recency: String(c.recency),
      Frequency: String(c.frequency),
      Monetary: String(c.monetary),
      AvgOrderValue: String(c.avg_order_value),
      PurchaseFreqPerMonth: String(c.purchases_per_month),
    });
    // Scroll form into view
    document.getElementById('predict-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /* ── Form submit: upsert customer then predict ── */
  const handlePredict = async (e) => {
    e.preventDefault();
    setError('');

    for (const [key, val] of Object.entries(formData)) {
      if (key === 'Name' || key === 'Email') {
        if (!String(val).trim()) { setError(`Please enter a valid ${key}.`); return; }
        continue;
      }
      const num = parseFloat(val);
      if (isNaN(num) || num <= 0) {
        setError(`Please enter a valid number > 0 for ${key.replace(/([A-Z])/g, ' $1').trim()}.`);
        return;
      }
    }

    setLoading(true);
    setResult(null);

    const payload = {
      Recency: parseFloat(formData.Recency),
      Frequency: parseFloat(formData.Frequency),
      Monetary: parseFloat(formData.Monetary),
      AvgOrderValue: parseFloat(formData.AvgOrderValue),
      PurchaseFreqPerMonth: parseFloat(formData.PurchaseFreqPerMonth)
    };

    try {
      // Always call POST /customers — backend upserts by email, so no duplicates
      const createRes = await axios.post(`${API}/customers`, {
        name: formData.Name, email: formData.Email,
        recency: payload.Recency, frequency: payload.Frequency,
        monetary: payload.Monetary, avg_order_value: payload.AvgOrderValue,
        purchases_per_month: payload.PurchaseFreqPerMonth
      }, { headers: { Authorization: `Bearer ${token}` } });

      const custId = createRes.data.id;
      setCurrentCustomerId(custId);
      if (!selectedCustomer) setEmailStatus('');

      // Run prediction
      const res = await axios.post(`${API}/predict/manual`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResult(res.data);
      setShowSuccessMsg(true);
      setTimeout(() => setShowSuccessMsg(false), 3000);

      // Store label in DB then refresh list
      axios.post(`${API}/customers/${custId}/predict`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(() => fetchCustomers()).catch(console.error);

    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(detail ? `Error: ${detail}` : 'Failed to fetch prediction. Check backend logs.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Re-run prediction on existing customer ── */
  const runPredictionOnCustomer = async (customer) => {
    setPredictingId(customer.id);
    try {
      await axios.post(`${API}/customers/${customer.id}/predict`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchCustomers();
    } catch (e) {
      console.error('Prediction failed', e);
    } finally {
      setPredictingId(null);
    }
  };

  /* ── Send email for an existing customer ── */
  const sendEmailForCustomer = async (customer) => {
    setSendingEmailId(customer.id);
    try {
      await axios.post(`${API}/send-email`, { customer_id: customer.id }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchCustomers();
    } catch (e) {
      console.error('Email send failed', e);
    } finally {
      setSendingEmailId(null);
    }
  };

  /* ── Email send for NEW prediction result ── */
  const handleSendEmail = async () => {
    if (!currentCustomerId) return;
    setEmailStatus('sending');
    try {
      await axios.post(`${API}/send-email`, { customer_id: currentCustomerId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmailStatus('sent');
      fetchCustomers();
    } catch (err) {
      console.error(err);
      setEmailStatus('error');
    }
  };

  /* ── Insight engine ── */
  const generateInsights = (data) => {
    const insights = [];
    const r = parseFloat(data.Recency) || 0;
    const f = parseFloat(data.Frequency) || 0;
    const m = parseFloat(data.Monetary) || 0;
    if (r < 10 && f > 5) insights.push('Highly engaged customer. Strong upsell opportunity detected.');
    if (f < 2 && m > 500) insights.push('High-value but inactive user. Re-engagement recommended.');
    if (r > 60) insights.push('Customer inactive for long period. High churn probability.');
    if (m > 0 && m < 100) insights.push('Low spending customer. Consider promotional targeting.');
    return insights;
  };
  const currentInsights = generateInsights(formData);

  const getCustomerTypeInfo = (prob) => {
    if (prob >= 0.65) return { type: 'High Value', textClass: 'text-emerald-500', bgClass: 'bg-emerald-500/20', borderClass: 'border-t-emerald-500', shadowClass: 'shadow-[0_0_30px_rgba(16,185,129,0.15)]', riskLevel: 'Low', icon: <TrendingUp className="w-10 h-10 text-emerald-500 mr-4" /> };
    if (prob >= 0.35) return { type: 'Medium Value', textClass: 'text-amber-500', bgClass: 'bg-amber-500/20', borderClass: 'border-t-amber-500', shadowClass: 'shadow-[0_0_30px_rgba(245,158,11,0.15)]', riskLevel: 'Medium', icon: <Target className="w-10 h-10 text-amber-500 mr-4" /> };
    return { type: 'Churn Risk', textClass: 'text-rose-500', bgClass: 'bg-rose-500/20', borderClass: 'border-t-rose-500', shadowClass: 'shadow-[0_0_30px_rgba(244,63,94,0.15)]', riskLevel: 'High', icon: <AlertTriangle className="w-10 h-10 text-rose-500 mr-4" /> };
  };
  const resultInfo = result ? getCustomerTypeInfo(result.probability) : null;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-8">

      {/* ── BOTTOM SECTION: Customer List ── */}
      <div className="glass-card">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-400" /> Your Saved Customers
          </h2>
          <button onClick={fetchCustomers} disabled={listLoading}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white/5 hover:bg-white/10 text-textMuted rounded-lg border border-white/10 transition-colors">
            <RefreshCw size={14} className={listLoading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {listLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-12 text-textMuted text-sm">
            No customers yet. Add one above to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-textMuted border-b border-white/10">
                  <th className="pb-3 pr-4 font-semibold">Name</th>
                  <th className="pb-3 pr-4 font-semibold">Email</th>
                  <th className="pb-3 pr-4 font-semibold">Recency</th>
                  <th className="pb-3 pr-4 font-semibold">Frequency</th>
                  <th className="pb-3 pr-4 font-semibold">Monetary</th>
                  <th className="pb-3 pr-4 font-semibold">Risk Label</th>
                  <th className="pb-3 pr-4 font-semibold">Email Status</th>
                  <th className="pb-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {customers.map(c => (
                  <tr
                    key={c.id}
                    onClick={() => loadCustomerIntoForm(c)}
                    className={`cursor-pointer transition-colors ${
                      selectedCustomer?.id === c.id
                        ? 'bg-primary-500/10 border-l-2 border-primary-400'
                        : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    <td className="py-3 pr-4 font-medium text-white">{c.name}</td>
                    <td className="py-3 pr-4 text-textMuted truncate max-w-[160px]">{c.email}</td>
                    <td className="py-3 pr-4 text-textMuted">{c.recency}d</td>
                    <td className="py-3 pr-4 text-textMuted">{c.frequency}</td>
                    <td className="py-3 pr-4 text-textMuted">${c.monetary?.toFixed(0)}</td>
                    <td className="py-3 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${riskBadge(c.prediction_label)}`}>
                        {c.prediction_label || 'Unscored'}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${emailStatusBadge(c.email_status)}`}>
                        {c.email_status || 'Not Sent'}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        {/* Re-run prediction */}
                        <button
                          onClick={(e) => { e.stopPropagation(); runPredictionOnCustomer(c); }}
                          disabled={predictingId === c.id}
                          title="Run Model Prediction"
                          className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20 transition-colors disabled:opacity-50"
                        >
                          {predictingId === c.id
                            ? <Loader2 size={14} className="animate-spin" />
                            : <Play size={14} />}
                        </button>

                        {/* Send email — only for risky customers not yet approved */}
                        {(c.prediction_label === 'Medium Risk' || c.prediction_label === 'High Churn Risk') &&
                          c.email_status !== 'Approved' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); sendEmailForCustomer(c); }}
                              disabled={sendingEmailId === c.id || c.email_status === 'Sent'}
                              title="Send Offer Email"
                              className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 transition-colors disabled:opacity-50"
                            >
                              {sendingEmailId === c.id
                                ? <Loader2 size={14} className="animate-spin" />
                                : <Mail size={14} />}
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── TOP SECTION: form + results ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* INPUT FORM */}
        <div className="flex flex-col gap-6">
          <form id="predict-form" onSubmit={handlePredict} className="glass-card space-y-6 relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Manual Prediction Engine</h2>
                {selectedCustomer && (
                  <p className="text-xs text-primary-400 mt-1 font-medium">
                    Editing: <span className="font-bold">{selectedCustomer.name}</span>
                    <button onClick={() => { setSelectedCustomer(null); setFormData({ Name:'', Email:'', Recency:'', Frequency:'', Monetary:'', AvgOrderValue:'', PurchaseFreqPerMonth:'' }); setResult(null); }}
                      type="button" className="ml-2 text-textMuted hover:text-white underline text-xs">Clear</button>
                  </p>
                )}
              </div>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-textMuted mb-2">Customer Name</label>
                <input type="text" name="Name" value={formData.Name} onChange={handleChange} placeholder="Jane Doe" className="input-field w-full" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-textMuted mb-2">Customer Email</label>
                <input type="email" name="Email" value={formData.Email} onChange={handleChange} placeholder="jane@example.com" className="input-field w-full" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-textMuted mb-2">Recency (Days)</label>
                <input type="number" name="Recency" value={formData.Recency} onChange={handleChange} onKeyDown={blockInvalidChars} placeholder="30" min="1" step="1" className="input-field w-full" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-textMuted mb-2">Frequency (Count)</label>
                <input type="number" name="Frequency" value={formData.Frequency} onChange={handleChange} onKeyDown={blockInvalidChars} placeholder="5" min="1" step="1" className="input-field w-full" required />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-textMuted mb-2">Monetary Value ($)</label>
                <input type="number" name="Monetary" value={formData.Monetary} onChange={handleChange} onKeyDown={blockInvalidChars} placeholder="1200" min="0.01" step="0.01" className="input-field w-full" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-textMuted mb-2">Avg Order Value</label>
                <input type="number" name="AvgOrderValue" value={formData.AvgOrderValue} onChange={handleChange} onKeyDown={blockInvalidChars} placeholder="240" min="0.01" step="0.01" className="input-field w-full" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-textMuted mb-2">Purchases/Month</label>
                <input type="number" name="PurchaseFreqPerMonth" value={formData.PurchaseFreqPerMonth} onChange={handleChange} onKeyDown={blockInvalidChars} placeholder="1.2" min="0.01" step="0.01" className="input-field w-full" required />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full flex justify-center items-center mt-4">
              {loading ? (<><Loader2 className="w-5 h-5 mr-3 animate-spin" />Processing Prediction...</>) : (<>Run Model / Predict <Play className="ml-2 w-5 h-5 fill-current" /></>)}
            </button>

            {error && <div className="text-rose-400 bg-rose-500/10 p-4 rounded-lg text-sm font-bold border border-rose-500/20 text-center">{error}</div>}
          </form>

          {/* Smart Insights */}
          <div className="glass-card border-l-4 border-l-blue-400">
            <h3 className="text-white font-bold mb-3 flex items-center"><Lightbulb className="w-5 h-5 text-blue-400 mr-2" />Smart Insights</h3>
            <div className="space-y-2">
              {currentInsights.length > 0
                ? currentInsights.map((ins, i) => <p key={i} className="text-sm text-textMuted bg-white/5 p-3 rounded-lg border border-white/5 font-medium leading-relaxed">{ins}</p>)
                : <p className="text-sm text-textMuted p-3">Adjust inputs to generate real-time insights.</p>}
            </div>
          </div>
        </div>

        {/* RESULTS PANEL */}
        <div className="h-full flex flex-col relative tracking-wide">
          {showSuccessMsg && (
            <div className="absolute top-0 right-0 z-10 animate-in fade-in slide-in-from-top-4 duration-300">
              <span className="bg-emerald-500/90 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center shadow-lg backdrop-blur-md">
                <CheckCircle className="w-3.5 h-3.5 mr-1" /> Model analysis complete
              </span>
            </div>
          )}

          {result ? (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500 h-full flex flex-col pt-2">
              <div className={`glass-card border-t-4 ${resultInfo.borderClass} ${resultInfo.shadowClass}`}>
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center">
                    {resultInfo.icon}
                    <div className="flex flex-col">
                      <span className="text-textMuted uppercase tracking-widest text-xs font-bold mb-1">Customer Type</span>
                      <span className="text-3xl font-black text-white leading-none">{resultInfo.type}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center space-x-4">
                      <span className={`px-4 py-1.5 rounded-full text-sm font-bold border border-white/5 ${resultInfo.bgClass} ${resultInfo.textClass}`}>
                        Confidence: {(result.probability * 100).toFixed(1)}%
                      </span>
                      <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-white/5 border border-white/5 text-gray-300">
                        Risk Level: <span className={resultInfo.textClass}>{resultInfo.riskLevel}</span>
                      </span>
                    </div>

                    {resultInfo.riskLevel !== 'Low' && (
                      <button onClick={handleSendEmail} disabled={emailStatus === 'sending' || emailStatus === 'sent'}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-bold text-sm transition-all shadow-lg shadow-blue-500/20">
                        {emailStatus === 'sending' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        {emailStatus === 'sent' ? 'Offer Sent!' : 'Send Offer Email'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className={`glass-card ${resultInfo.bgClass.replace('/20', '/5')} border-l-4 ${resultInfo.borderClass.replace('border-t-', 'border-l-')} flex-grow shadow-lg`}>
                <h3 className={`uppercase tracking-widest text-xs font-bold mb-3 ${resultInfo.textClass}`}>Recommended Action</h3>
                <p className="text-white font-bold text-xl mb-4">{result.recommendations.strategy}</p>
                <div className="space-y-2">
                  <p className="text-xs text-textMuted uppercase font-bold tracking-wider">Suggested Steps</p>
                  <ul className="list-disc pl-5 text-sm text-gray-300 space-y-2">
                    {result.recommendations.offers.map((o, i) => <li key={i}>{o}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card h-full min-h-[400px] flex flex-col items-center justify-center p-8 border-white/5 bg-surfaceLight/20">
              <div className="w-16 h-16 rounded-full border-4 border-dashed border-white/10 mb-6 flex items-center justify-center relative">
                <div className="absolute inset-0 bg-primary-500/10 rounded-full blur-md" />
                <Target className="w-6 h-6 text-textMuted opacity-50" />
              </div>
              <p className="text-textMuted text-sm">Fill in customer details and run the model to see predictions.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
