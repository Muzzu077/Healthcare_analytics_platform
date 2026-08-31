import React from 'react';
import { UserRole } from '../types';
import {
  Activity, Database, BrainCircuit, Shield, Zap,
  Layers, ArrowRight, HeartPulse, Terminal, Stethoscope, Server
} from 'lucide-react';

interface Props {
  onQuickLogin: (role: UserRole) => void;
  onOpenLoginModal?: () => void;
}

export const LandingPage: React.FC<Props> = ({ onQuickLogin }) => {
  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col justify-between p-8 relative overflow-hidden">
      {/* Background Subtle Gradient */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#EFF6FF] rounded-full blur-3xl pointer-events-none opacity-60" />

      {/* Header */}
      <header className="flex items-center justify-between z-10 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-2xl bg-[#163A5F] shadow-md flex items-center justify-center text-white">
            <HeartPulse className="w-6 h-6 text-[#06B6D4]" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-[#163A5F]">PULSE CORE</h1>
            <p className="text-xs text-[#64748B] font-mono">Clinical Intelligence & Data Operations</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full text-xs font-mono bg-white text-[#163A5F] border border-[#E2E8F0] shadow-2xs font-semibold">
            PostgreSQL 16 • XGBoost ML • WebSockets
          </span>
        </div>
      </header>

      {/* Hero Content */}
      <main className="z-10 max-w-5xl mx-auto w-full text-center space-y-8 my-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[#E2E8F0] text-xs text-[#163A5F] font-mono shadow-xs font-semibold">
          <Zap className="w-3.5 h-3.5 text-[#0E7490] animate-live-pulse" />
          Smart Healthcare Data Analytics Platform Using Adaptive Query Processing & Predictive Analytics
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-[#163A5F] tracking-tight leading-tight">
          Adaptive Clinical Query Processing & Predictive Intelligence
        </h1>

        <p className="text-base sm:text-lg text-[#64748B] max-w-3xl mx-auto leading-relaxed">
          Demonstrating high-performance PostgreSQL query plan cost estimation, sequential scan bottleneck detection, 
          safe index recommendation benchmarking, real-time WebSocket vitals telemetry, and XGBoost 30-day readmission risk forecasting.
        </p>

        {/* 3 Presentation Modules */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left pt-6">
          {/* Module 1 */}
          <div className="clinical-card p-6 space-y-3">
            <div className="p-3 w-fit rounded-xl bg-[#EFF6FF] text-[#0E7490]">
              <Activity className="w-6 h-6" />
            </div>
            <div className="text-[10px] font-bold text-[#0E7490] uppercase font-mono">Module 1</div>
            <h3 className="text-lg font-bold text-[#163A5F]">Healthcare Data & Real-Time Management</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Live patient registration, ICU bed allocation, vital signs telemetry streaming, and automated critical diagnostic alerts over full-duplex WebSockets.
            </p>
          </div>

          {/* Module 2 (Core Academic) */}
          <div className="clinical-card p-6 space-y-3 border-[#0E7490]/40 ring-2 ring-[#0E7490]/10">
            <div className="p-3 w-fit rounded-xl bg-[#EFF6FF] text-[#0E7490]">
              <Database className="w-6 h-6" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#0E7490] uppercase font-mono">Module 2 ⭐ Core</span>
              <span className="px-2 py-0.2 rounded text-[9px] font-bold bg-[#163A5F] text-white">ACADEMIC FOCUS</span>
            </div>
            <h3 className="text-lg font-bold text-[#163A5F]">Adaptive Query Processing & Optimizer</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Read-only AST query validation, PostgreSQL EXPLAIN ANALYZE telemetry, React Flow execution tree visualizer, and before/after indexing speedup benchmarks.
            </p>
          </div>

          {/* Module 3 */}
          <div className="clinical-card p-6 space-y-3">
            <div className="p-3 w-fit rounded-xl bg-[#6D5CE7]/10 text-[#6D5CE7]">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <div className="text-[10px] font-bold text-[#6D5CE7] uppercase font-mono">Module 3</div>
            <h3 className="text-lg font-bold text-[#163A5F]">Predictive Analytics & Alerts</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Multi-model comparison of Logistic Regression, Random Forest, and XGBoost with feature importance breakdown and clinical decision support.
            </p>
          </div>
        </div>

        {/* Quick Role Launch Bar */}
        <div className="clinical-card p-6 text-center space-y-4 max-w-3xl mx-auto mt-8 bg-white border-[#163A5F]/20 shadow-md">
          <div className="text-xs font-bold text-[#163A5F] uppercase font-mono tracking-wider">
            Explore System by Role (1-Click Authenticated Launch)
          </div>
          <div className="flex flex-wrap justify-center gap-2.5">
            <button
              onClick={() => onQuickLogin('doctor')}
              className="px-4 py-2.5 rounded-xl bg-[#163A5F] hover:bg-[#0F2F4D] text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-xs"
            >
              <Stethoscope className="w-4 h-4 text-[#06B6D4]" />
              Launch as Physician / Doctor
            </button>
            <button
              onClick={() => onQuickLogin('analytics_dba')}
              className="px-4 py-2.5 rounded-xl bg-[#0E7490] hover:bg-[#085a70] text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-xs"
            >
              <Terminal className="w-4 h-4 text-[#06B6D4]" />
              Launch as Analytics DBA
            </button>
            <button
              onClick={() => onQuickLogin('admin')}
              className="px-4 py-2.5 rounded-xl bg-[#1F4E79] hover:bg-[#163A5F] text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-xs"
            >
              <Shield className="w-4 h-4 text-white" />
              Launch as Administrator
            </button>
            <button
              onClick={() => onQuickLogin('lab_tech')}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#F5F7FA] border border-[#E2E8F0] text-[#0F172A] text-xs font-semibold flex items-center gap-2 transition-all shadow-2xs"
            >
              <Activity className="w-4 h-4 text-[#0E7490]" />
              Launch as Lab Tech
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="z-10 text-center text-xs text-[#64748B] font-mono">
        Smart Healthcare Data Analytics Platform Using Adaptive Query Processing and Predictive Analytics • Capstone 2026
      </footer>
    </div>
  );
};
