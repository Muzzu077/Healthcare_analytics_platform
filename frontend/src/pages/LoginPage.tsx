import React, { useState } from 'react';
import { loginApi } from '../services/api';
import { User, UserRole } from '../types';
import {
  HeartPulse, Shield, Stethoscope, Terminal,
  Activity, ArrowRight, Lock, User as UserIcon, AlertTriangle
} from 'lucide-react';

interface Props {
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<Props> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState<string>('doctor');
  const [role, setRole] = useState<string>('doctor');
  const [password, setPassword] = useState<string>('doctor123');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const demoAccounts = [
    { username: 'doctor', role: 'doctor', name: 'Dr. Marcus Vance, MD (Cardiologist)', icon: Stethoscope },
    { username: 'dba', role: 'analytics_dba', name: 'Alex Rivera (Database Architect / DBA)', icon: Terminal },
    { username: 'admin', role: 'admin', name: 'Chief Information Officer (Admin)', icon: Shield },
    { username: 'labtech', role: 'lab_tech', name: 'Elena Rostova (Lead Diagnostic Tech)', icon: Activity },
    { username: 'receptionist', role: 'receptionist', name: 'Sarah Jenkins (Admissions Desk)', icon: UserIcon }
  ];

  const handleSelectDemo = (acc: typeof demoAccounts[0]) => {
    setUsername(acc.username);
    setRole(acc.role);
    setPassword(`${acc.username}123`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const user = await loginApi(username, role);
      onLoginSuccess(user);
    } catch (e: any) {
      setErrorMsg(e.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 bg-white rounded-3xl border border-[#E2E8F0] shadow-2xl overflow-hidden animate-fade-in">
        {/* Left Clinical Brand Showcase */}
        <div className="bg-[#163A5F] p-8 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-6 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-white/10 text-[#06B6D4] backdrop-blur-xs border border-white/20">
                <HeartPulse className="w-7 h-7 text-[#06B6D4]" />
              </div>
              <div>
                <span className="text-xl font-black tracking-tight block">PULSE CORE</span>
                <span className="text-xs text-[#94A3B8] font-mono">Clinical Intelligence Platform</span>
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <span className="px-2.5 py-0.5 rounded-full bg-[#0E7490] text-white text-[10px] font-mono font-bold">
                ACADEMIC CAPSTONE ARCHITECTURE
              </span>
              <h2 className="text-xl font-bold leading-snug">
                Smart Healthcare Analytics with Adaptive Query Processing & XGBoost Predictive Risk
              </h2>
              <p className="text-xs text-[#CBD5E1] leading-relaxed">
                A high-throughput clinical operations portal delivering real-time telemetry streaming, strict read-only AST query optimization, and ML-powered 30-day readmission forecasting.
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10 text-[11px] text-[#94A3B8] font-mono relative z-10 flex items-center justify-between">
            <span>PostgreSQL 16 Engine</span>
            <span>FastAPI • React 18</span>
          </div>
        </div>

        {/* Right Authentication Form */}
        <div className="p-8 space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-[#163A5F]">Sign In to Hospital Portal</h3>
              <p className="text-xs text-[#64748B]">Select a role below or authenticate with staff credentials.</p>
            </div>

            {/* Quick Demo Role Selector */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-[#64748B] uppercase font-mono tracking-wider">
                Quick Demo Switcher
              </span>
              <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                {demoAccounts.map((acc) => {
                  const Icon = acc.icon;
                  const isSelected = username === acc.username;
                  return (
                    <div
                      key={acc.username}
                      onClick={() => handleSelectDemo(acc)}
                      className={`p-2 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                        isSelected
                          ? 'border-[#163A5F] bg-[#EFF6FF] text-[#163A5F] font-bold'
                          : 'border-[#E2E8F0] hover:bg-[#F5F7FA] text-[#0F172A]'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Icon className="w-3.5 h-3.5 text-[#0E7490] shrink-0" />
                        <span className="truncate">{acc.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#64748B] shrink-0 uppercase">{acc.role}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#B91C1C]/30 text-[#B91C1C] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-[#0F172A] font-semibold mb-1">Staff Username</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-[#64748B] absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#F5F7FA] border border-[#E2E8F0] focus:border-[#0E7490] text-[#0F172A] font-mono outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#0F172A] font-semibold mb-1">Access Token / Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#64748B] absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#F5F7FA] border border-[#E2E8F0] focus:border-[#0E7490] text-[#0F172A] font-mono outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-[#163A5F] hover:bg-[#0F2F4D] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md mt-2 disabled:opacity-50"
              >
                <span>{loading ? 'Authenticating Staff...' : 'Authorize Clinical Session'}</span>
                <ArrowRight className="w-4 h-4 text-[#06B6D4]" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
