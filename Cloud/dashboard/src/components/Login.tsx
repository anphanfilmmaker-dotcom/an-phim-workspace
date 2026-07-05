import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, ArrowRight, ShieldAlert } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (token: string) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      onLoginSuccess(data.token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0C0E] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans select-none">
      {/* Background Cinematic Glows */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-emerald-900/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-emerald-900/5 rounded-full blur-[120px] pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-[400px] relative z-10"
      >
        <div className="bg-[#0C1014]/80 backdrop-blur-xl border border-[#1e2329] rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          {/* Top accent line */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#10B981] to-transparent opacity-50"></div>
          
          <div className="text-center mb-8 flex flex-col items-center">
            <div className="relative w-16 h-16 mb-4 flex items-center justify-center">
               <div className="absolute inset-0 bg-[#10B981]/10 rounded-xl animate-pulse pointer-events-none" />
               <div className="w-12 h-12 rounded-xl bg-emerald-950/40 border border-[#10B981]/30 flex items-center justify-center text-[#10B981]">
                 <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
               </div>
            </div>
            <h1 className="text-sm font-sans font-extrabold tracking-widest text-[#10B981] uppercase leading-none">
              AN PHIM WORKSPACE
            </h1>
            <span className="text-[10px] font-mono font-medium text-neutral-500 block mt-2 uppercase tracking-widest">
              SYSTEM AUTHENTICATION
            </span>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-600 group-focus-within:text-[#10B981] transition-colors">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-[#0E1012] border border-[#1e2329] rounded-xl text-neutral-200 text-sm font-mono tracking-widest placeholder-neutral-600 focus:ring-1 focus:ring-[#10B981]/50 focus:border-[#10B981]/50 transition-all outline-none"
                  placeholder="ENTER SECURE KEY"
                  required
                />
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                className="flex items-center space-x-2 text-red-400 text-xs font-mono bg-red-950/20 border border-red-900/30 rounded-lg p-3"
              >
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-2 py-3.5 px-4 bg-[#10B981]/10 hover:bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30 font-mono text-xs font-bold tracking-widest rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group uppercase"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-[#10B981]/30 border-t-[#10B981] rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Initialize</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>
        
        <div className="text-center mt-8">
          <p className="text-[9px] font-mono text-neutral-600 tracking-widest uppercase">
            © 2026 An Phim. All rights reserved.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
