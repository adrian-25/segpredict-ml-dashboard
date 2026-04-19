import { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { ShieldCheck, Sparkles, Target, BarChart2, Repeat, Activity } from 'lucide-react';

// ── Static validation data (Jan–Mar 2026) ────────────────────────────────────
const VALIDATION_METRICS = {
  accuracy: { value: 74.3, training: 81.2 },
  precision: { value: 63.8, training: 76.5 },
  recall: { value: 54.1, training: 68.4 },
  f1: { value: 58.6, training: 72.3 },
};

const COMPARISON_CHART_DATA = [
  { metric: 'Accuracy', Training: 81.2, Validation: 74.3 },
  { metric: 'F1 Score', Training: 72.3, Validation: 58.6 },
  { metric: 'Precision', Training: 76.5, Validation: 63.8 },
  { metric: 'Recall', Training: 68.4, Validation: 54.1 },
];

// ─────────────────────────────────────────────────────────────────────────────

function ValidationSection() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 flex flex-col gap-5 w-full">

      {/* ── Section Header ── */}
      {/* <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3
                      bg-white/5 p-4 rounded-2xl border border-white/5 shadow-lg backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-bold text-white">Model Validation (Future Data)</h2>
            <span className="ml-1 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest
                             bg-emerald-500/15 text-emerald-400 border border-emerald-500/30
                             px-2.5 py-0.5 rounded-full">
              <Sparkles className="w-3 h-3" /> Time-based Validation
            </span>
          </div>
          <p className="text-sm text-textMuted">
            Evaluation of model performance on unseen data from&nbsp;
            <span className="text-white/70 font-medium">Jan–Mar 2026</span>
          </p>
        </div>
        <p className="text-[11px] text-slate-500 italic sm:text-right max-w-xs">
          Validation performed using unseen future transaction data (Jan–Mar 2026)
        </p>
      </div> */}

      {/* ── Metric Cards (StatsCard pattern) ── */}
      {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Accuracy"
          value={`${VALIDATION_METRICS.accuracy.value}%`}
          icon={<Target className="w-5 h-5" />}
          color="text-sky-400"
        />
        <StatsCard
          title="Precision"
          value={`${VALIDATION_METRICS.precision.value}%`}
          icon={<BarChart2 className="w-5 h-5" />}
          color="text-violet-400"
        />
        <StatsCard
          title="Recall"
          value={`${VALIDATION_METRICS.recall.value}%`}
          icon={<Repeat className="w-5 h-5" />}
          color="text-amber-400"
        />
        <StatsCard
          title="F1 Score"
          value={`${VALIDATION_METRICS.f1.value}%`}
          icon={<Activity className="w-5 h-5" />}
          color="text-emerald-400"
        />
      </div> */}

      {/* ── Comparison Bar Chart ── */}
      {/* <div className="glass-card flex flex-col p-5">
        <h3 className="text-base font-bold text-white mb-1">Training vs Validation Comparison</h3>
        <p className="text-xs text-textMuted mb-4">June–Dec 2025 (Training) vs Jan–Mar 2026 (Validation)</p>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={COMPARISON_CHART_DATA} margin={{ top: 5, right: 20, left: -10, bottom: 5 }} barGap={6}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.6} />
              <XAxis dataKey="metric" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} tickLine={false} />
              <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false}
                     domain={[40, 100]} unit="%" />
              <Tooltip
                cursor={{ fill: '#334155', opacity: 0.3 }}
                contentStyle={{
                  backgroundColor: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(8px)',
                  borderColor: 'rgba(255,255,255,0.08)', borderRadius: '12px', color: '#fff', fontSize: 13
                }}
                formatter={(v, name) => [`${v}%`, name]}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8', paddingTop: 8 }} />
              <Bar dataKey="Training"   name="Training (Jun–Dec 2025)" fill="#3b82f6" radius={[4,4,0,0]} barSize={28} />
              <Bar dataKey="Validation" name="Validation (Jan–Mar 2026)" fill="#10b981" radius={[4,4,0,0]} barSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div> */}

      {/* ── Insight Box ── */}
      {/* <div className="flex items-start gap-3 p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 backdrop-blur-sm">
        <span className="text-2xl mt-0.5">🔥</span>
        <div>
          <p className="text-sm font-bold text-amber-300 mb-0.5">Generalization Insight</p>
          <p className="text-sm text-slate-300 leading-relaxed">
            Model shows slightly lower performance on future data due to real-world variability,
            indicating <span className="text-amber-300 font-semibold">good generalization</span> and
            <span className="text-emerald-400 font-semibold"> absence of overfitting</span>.
            A ~6–13% drop across metrics is expected and acceptable for temporal validation.
          </p>
        </div>
      </div> */}

    </div>
  );
}

export default function ModelComparison() {
  const [data, setData] = useState(null);

  const fetchMetrics = () => {
    axios.get('http://localhost:8001/model-metrics')
      .then((res) => setData(res.data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (!data) return (
    <div className="flex items-center justify-center p-10">
      <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const modelsArray = data ? Object.entries(data).map(([name, metrics]) => ({
    name,
    accuracy: (metrics.accuracy * 100).toFixed(2),
    precision: (metrics.precision * 100).toFixed(2),
    recall: (metrics.recall * 100).toFixed(2),
    f1: (metrics.f1_score * 100).toFixed(2),
    rawImportance: metrics.feature_importance || {}
  })) : [];

  const bestModelIndex = modelsArray.length > 0 ? modelsArray.reduce((bestIdx, current, idx) =>
    parseFloat(current.f1) > parseFloat(modelsArray[bestIdx].f1) ? idx : bestIdx, 0) : 0;

  const bestModel = modelsArray[bestModelIndex] || null;

  const featureImp = bestModel ? Object.entries(bestModel.rawImportance)
    .map(([feat, val]) => ({ name: feat, value: parseFloat((val * 100).toFixed(2)) }))
    .sort((a, b) => b.value - a.value) : [];



  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-6 w-full">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5 shadow-lg backdrop-blur-sm">
        <div>
          <h2 className="text-xl font-bold text-white">Model Metrics & Evaluation</h2>
          <p className="text-sm text-textMuted">Compare algorithm efficiency across standard classification metrics.</p>
        </div>
      </div>

      {/* METRICS & CHARTS SPLIT */}
      {modelsArray.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full">
          <div className="overflow-x-auto w-full glass-card h-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-textMuted uppercase text-xs tracking-wider">
                  <th className="p-3">Model</th>
                  <th className="p-3">Acc (%)</th>
                  <th className="p-3">Prec (%)</th>
                  <th className="p-3">Rec (%)</th>
                  <th className="p-3 text-primary-400 font-bold">F1 (%)</th>
                </tr>
              </thead>
              <tbody>
                {modelsArray.map((model, idx) => (
                  <tr key={model.name} className={`border-b border-white/5 transition-colors hover:bg-white/5 ${idx === bestModelIndex ? 'bg-primary-900/10' : ''}`}>
                    <td className="p-3 font-medium flex items-center space-x-2">
                      {idx === bestModelIndex && <span className="w-2 h-2 rounded-full bg-primary-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>}
                      <span className="text-white text-sm">{model.name}</span>
                    </td>
                    <td className="p-3 text-sm">{model.accuracy}</td>
                    <td className="p-3 text-sm">{model.precision}</td>
                    <td className="p-3 text-sm">{model.recall}</td>
                    <td className="p-3 text-sm font-bold text-primary-400">{model.f1}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {featureImp.length > 0 && (
            <div className="glass-card w-full min-h-[350px] flex flex-col">
              <h3 className="text-lg font-bold text-white mb-6">Feature Importance ({bestModel.name})</h3>
              <div className="flex-grow min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <BarChart data={featureImp} layout="vertical" margin={{ left: -20, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                    <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                    <YAxis dataKey="name" type="category" stroke="#94a3b8" width={100} tick={{ fill: '#e2e8f0', fontSize: 11 }} />
                    <Tooltip cursor={{ fill: '#334155', opacity: 0.4 }} contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.9)', backdropFilter: 'blur(8px)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={16} isAnimationActive={true} animationDuration={1000} animationEasing="ease-out" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ MODEL VALIDATION SECTION (static, Jan–Mar 2026) ══ */}
      <ValidationSection />

    </div>
  );
}

function StatsCard({ title, value, icon, color }) {
  return (
    <div className="glass-card flex items-center justify-between hover:-translate-y-1 hover:shadow-xl hover:shadow-primary-500/10 cursor-pointer overflow-hidden relative group p-5">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <div>
        <p className="text-xs font-semibold text-textMuted uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-black text-white mt-1">{value}</p>
      </div>
      <div className={`p-3 rounded-lg bg-surfaceLight/50 ${color} shadow-inner`}>
        {icon}
      </div>
    </div>
  );
}