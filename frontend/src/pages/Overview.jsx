import { useEffect, useState } from 'react';
import axios from 'axios';
import { Users, DollarSign, Activity, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Overview() {
  const [data, setData] = useState(null);
  const { token } = useAuth();

  useEffect(() => {
    if (token) {
        axios.get('/user-metrics', {
            headers: { Authorization: `Bearer ${token}` }
        })
          .then((res) => setData(res.data))
          .catch((err) => console.error(err));
    }
  }, [token]);

  if (!data) return (
    <div className="flex items-center justify-center p-10">
      <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Customers" value={data.total_customers?.toLocaleString() || '0'} icon={<Users className="w-5 h-5"/>} color="text-blue-400" />
        <StatsCard title="Total Revenue" value={`$${(data.total_revenue || 0).toLocaleString(undefined, {maximumFractionDigits:0})}`} icon={<DollarSign className="w-5 h-5"/>} color="text-green-400" />
        <StatsCard title="Transactions" value={(data.total_transactions || 0).toLocaleString()} icon={<Activity className="w-5 h-5"/>} color="text-purple-400" />
        <StatsCard title="Date Range" value={data.date_range || 'N/A'} icon={<Calendar className="w-5 h-5"/>} color="text-orange-400" />
      </div>
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
