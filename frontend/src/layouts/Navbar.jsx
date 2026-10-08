import { useAuth } from '../contexts/AuthContext';
import { LogOut } from 'lucide-react';

export default function Navbar() {
  const { logout, isDemo } = useAuth();
  return (
    <nav className="bg-surface/90 backdrop-blur-md border-b border-white/10 px-8 py-4 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-4 cursor-pointer group">
        <img 
          src="/Loga.png" 
          alt="SegPredict Logo" 
          className="h-20 w-auto object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] group-hover:scale-105 transition-transform duration-300" 
        />
        <h1 className="text-3xl font-black tracking-tighter bg-gradient-to-r from-white via-primary-300 to-primary-500 bg-clip-text text-transparent drop-shadow-sm group-hover:drop-shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all duration-300">
          SegPredict
        </h1>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 bg-surfaceLight/40 px-4 py-2 rounded-lg border border-white/5">
           <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
           <span className="text-xs font-semibold text-green-500 tracking-wider">SYSTEM ONLINE</span>
        </div>
        
        {isDemo ? (
          <span className="px-4 py-2 rounded-lg font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20">Demo mode</span>
        ) : (
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-500 rounded-lg font-bold hover:bg-rose-500/20 transition-colors border border-rose-500/20"
          >
            <LogOut size={16} /> Logout
          </button>
        )}
      </div>
    </nav>
  );
}
