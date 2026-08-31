import React from 'react';
import { BenchmarkResult } from '../types';
import {
  TrendingUp, Zap, Clock, ShieldCheck,
  CheckCircle2, ArrowRight, Database, ChevronRight
} from 'lucide-react';
import { ReactFlowPlanVisualizer } from './ReactFlowPlanVisualizer';

interface Props {
  result: BenchmarkResult;
}

export const BenchmarkComparisonCard: React.FC<Props> = ({ result }) => {
  const { benchmark, applied_ddls } = result;

  return (
    <div className="clinical-card p-6 space-y-6 border-[#0E7490]/30 shadow-md">
      {/* Benchmark Summary Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#0E7490] border border-[#0E7490]/20 text-[10px] font-bold font-mono">
              ADAPTIVE MEASURED BENCHMARK
            </span>
            <h2 className="text-lg font-bold text-[#163A5F]">Execution Performance Comparison</h2>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Empirical PostgreSQL before-and-after query plan execution metrics
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-[#F0FDF4] border border-[#15803D]/30 text-right">
            <span className="text-[10px] font-bold text-[#15803D] uppercase block font-mono">SPEEDUP GAIN</span>
            <div className="text-2xl font-black text-[#15803D]">{benchmark.speedup_ratio}x</div>
          </div>

          <div className="p-3 rounded-xl bg-[#EFF6FF] border border-[#1F4E79]/20 text-right">
            <span className="text-[10px] font-bold text-[#1F4E79] uppercase block font-mono">COST REDUCTION</span>
            <div className="text-2xl font-black text-[#1F4E79]">{benchmark.cost_reduction_percentage}%</div>
          </div>
        </div>
      </div>

      {/* Applied DDL Statements */}
      {applied_ddls && applied_ddls.length > 0 && (
        <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5 font-mono text-xs">
          <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">
            Applied Index DDL:
          </span>
          {applied_ddls.map((ddl, idx) => (
            <div key={idx} className="p-2 rounded bg-white border border-[#E2E8F0] text-[#0E7490] font-semibold break-all">
              {ddl}
            </div>
          ))}
        </div>
      )}

      {/* Before vs After Telemetry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Baseline (Before) */}
        <div className="p-4 rounded-xl bg-[#FFFBEB]/40 border border-[#B45309]/30 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#B45309]/20">
            <span className="font-bold text-xs text-[#B45309] uppercase font-mono">1. Baseline Execution (Before)</span>
            <span className="text-[10px] text-[#B45309] font-mono">Sequential Scan</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-white border border-[#E2E8F0]">
              <span className="text-[#64748B] block text-[10px]">EXECUTION TIME:</span>
              <strong className="text-base text-[#0F172A]">{benchmark.before_execution_time_ms.toFixed(2)} ms</strong>
            </div>
            <div className="p-2.5 rounded-lg bg-white border border-[#E2E8F0]">
              <span className="text-[#64748B] block text-[10px]">ESTIMATED COST:</span>
              <strong className="text-base text-[#0F172A]">{benchmark.before_cost_estimate.toFixed(1)}</strong>
            </div>
          </div>
        </div>

        {/* Optimized (After) */}
        <div className="p-4 rounded-xl bg-[#F0FDF4]/50 border border-[#15803D]/30 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#15803D]/20">
            <span className="font-bold text-xs text-[#15803D] uppercase font-mono">2. Adaptive Execution (After)</span>
            <span className="text-[10px] text-[#15803D] font-mono">Indexed Scan</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-white border border-[#E2E8F0]">
              <span className="text-[#64748B] block text-[10px]">EXECUTION TIME:</span>
              <strong className="text-base text-[#15803D]">{benchmark.after_execution_time_ms.toFixed(2)} ms</strong>
            </div>
            <div className="p-2.5 rounded-lg bg-white border border-[#E2E8F0]">
              <span className="text-[#64748B] block text-[10px]">ESTIMATED COST:</span>
              <strong className="text-base text-[#15803D]">{benchmark.after_cost_estimate.toFixed(1)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Visualizer Comparison */}
      {benchmark.after_plan && (
        <div className="space-y-2">
          <span className="text-xs font-bold text-[#163A5F]">Optimized Execution Plan Tree</span>
          <ReactFlowPlanVisualizer planTree={benchmark.after_plan} />
        </div>
      )}
    </div>
  );
};
