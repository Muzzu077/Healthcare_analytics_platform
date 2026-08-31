import React, { useState, useEffect } from 'react';
import {
  analyzeQueryApi, applyIndexApi, runBenchmarkApi, fetchBenchmarkHistory
} from '../services/api';
import { OptimizationAnalysis, BenchmarkResult, BenchmarkHistoryItem, OptimizationRecommendation } from '../types';
import {
  Zap, Play, CheckCircle2, AlertTriangle, Database,
  TrendingUp, Clock, History, ChevronRight, ShieldCheck,
  Code, ArrowRight, X
} from 'lucide-react';
import { BenchmarkComparisonCard } from '../components/BenchmarkComparisonCard';

interface Props {
  initialQuery?: string;
}

export const AdaptiveOptimizerPage: React.FC<Props> = ({ initialQuery }) => {
  const [sql, setSql] = useState<string>(
    initialQuery ||
    `SELECT v.id, v.patient_id, v.heart_rate, v.systolic_bp, v.oxygen_saturation, v.recorded_at\nFROM vitals v\nWHERE v.oxygen_saturation < 92.0 AND v.is_abnormal = true\nORDER BY v.recorded_at DESC;`
  );
  const [analysis, setAnalysis] = useState<OptimizationAnalysis | null>(null);
  const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkResult | null>(null);
  const [benchmarkHistory, setBenchmarkHistory] = useState<BenchmarkHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [benchmarking, setBenchmarking] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // SQL Review Modal State
  const [selectedRecForReview, setSelectedRecForReview] = useState<OptimizationRecommendation | null>(null);
  const [applyingIndex, setApplyingIndex] = useState<boolean>(false);
  const [applySuccessMsg, setApplySuccessMsg] = useState<string | null>(null);

  const loadHistory = async () => {
    try {
      const hist = await fetchBenchmarkHistory();
      setBenchmarkHistory(hist);
    } catch (e) {}
  };

  useEffect(() => {
    loadHistory();
    if (sql) {
      handleAnalyze();
    }
  }, []);

  const handleAnalyze = async () => {
    setLoading(true);
    setErrorMsg(null);
    setApplySuccessMsg(null);
    try {
      const res = await analyzeQueryApi(sql);
      setAnalysis(res);
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to analyze query plan.");
    } finally {
      setLoading(false);
    }
  };

  const handleApplySingleIndex = async (ddl: string) => {
    setApplyingIndex(true);
    try {
      await applyIndexApi(ddl);
      setApplySuccessMsg(`Successfully created index: ${ddl}`);
      setSelectedRecForReview(null);
      handleAnalyze();
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to apply index DDL.");
    } finally {
      setApplyingIndex(false);
    }
  };

  const handleRunFullBenchmark = async () => {
    if (!analysis || analysis.recommendations.length === 0) return;
    setBenchmarking(true);
    setErrorMsg(null);
    try {
      const ddls = analysis.recommendations.map(r => r.suggested_sql);
      const res = await runBenchmarkApi(sql, ddls);
      setBenchmarkResult(res);
      loadHistory();
    } catch (e: any) {
      setErrorMsg(e.message || "Benchmark failed.");
    } finally {
      setBenchmarking(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#163A5F] tracking-tight flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#0E7490]" />
              Adaptive Query Optimizer & Empirical Benchmark
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#0E7490] border border-[#0E7490]/20 text-[10px] font-bold font-mono">
              CORE ACADEMIC MODULE
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Contextual bottleneck identification, safe DDL index synthesis, and empirical speedup ratio verification.
          </p>
        </div>
      </div>

      {/* Query Input Panel */}
      <div className="clinical-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#163A5F] uppercase font-mono">Query to Analyze & Optimize</span>
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="px-4 py-1.5 rounded-xl bg-[#163A5F] hover:bg-[#0F2F4D] text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs"
          >
            <Play className="w-3.5 h-3.5 text-[#06B6D4]" />
            {loading ? 'Analyzing Plan...' : 'Analyze Query Bottlenecks'}
          </button>
        </div>

        <textarea
          rows={4}
          value={sql}
          onChange={e => setSql(e.target.value)}
          className="w-full p-3 rounded-xl bg-[#0F172A] text-[#F8FAFC] font-mono text-xs border border-[#1E293B] focus:border-[#06B6D4] outline-none"
        />
      </div>

      {/* Notification Messages */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#B91C1C]/30 text-[#B91C1C] text-xs font-mono flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {applySuccessMsg && (
        <div className="p-4 rounded-xl bg-[#F0FDF4] border border-[#15803D]/30 text-[#15803D] text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{applySuccessMsg}</span>
        </div>
      )}

      {/* Recommendations List */}
      {analysis && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#163A5F]">
                Adaptive Optimization Recommendations ({analysis.total_recommendations})
              </span>
              <span className="px-2 py-0.2 rounded text-[10px] font-mono font-bold bg-[#EFF6FF] text-[#0E7490] border border-[#E2E8F0]">
                Index Synthesis Engine
              </span>
            </div>

            {analysis.recommendations.length > 0 && (
              <button
                disabled={benchmarking}
                onClick={handleRunFullBenchmark}
                className="px-4 py-2 rounded-xl bg-[#0E7490] hover:bg-[#085a70] text-white font-bold text-xs flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
              >
                <TrendingUp className="w-4 h-4 text-[#06B6D4]" />
                {benchmarking ? 'Running Benchmark Trial...' : 'Run Measured Speedup Benchmark'}
              </button>
            )}
          </div>

          {analysis.recommendations.length === 0 ? (
            <div className="clinical-card p-8 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-[#15803D] mx-auto" />
              <div className="text-sm font-bold text-[#163A5F]">Query Plan is Already Optimal</div>
              <p className="text-xs text-[#64748B]">PostgreSQL execution engine utilizes existing index scans with nominal buffer hits.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analysis.recommendations.map((rec) => (
                <div key={rec.id} className="clinical-card p-5 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[#163A5F]">{rec.title}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        rec.severity === 'HIGH' ? 'bg-[#FEF2F2] text-[#B91C1C] border border-[#B91C1C]/30' : 'bg-[#EFF6FF] text-[#1F4E79]'
                      }`}>
                        {rec.severity} PRIORITY
                      </span>
                    </div>
                    <p className="text-xs text-[#64748B]">{rec.description}</p>
                    <div className="p-2.5 rounded-lg bg-[#0F172A] text-[#06B6D4] font-mono text-[11px] break-all">
                      {rec.suggested_sql}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0]">
                    <span className="text-[10px] text-[#15803D] font-mono font-bold">
                      Est. Impact: {rec.impact_estimate}
                    </span>
                    <button
                      onClick={() => setSelectedRecForReview(rec)}
                      className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#163A5F] hover:text-white border border-[#E2E8F0] text-[#163A5F] font-semibold text-xs transition-all shadow-2xs"
                    >
                      Review & Apply DDL
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Benchmark Results Card */}
      {benchmarkResult && (
        <BenchmarkComparisonCard result={benchmarkResult} />
      )}

      {/* Historical Benchmark Log Table */}
      {benchmarkHistory.length > 0 && (
        <div className="clinical-card overflow-hidden">
          <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
            <span className="text-xs font-bold text-[#163A5F] uppercase font-mono flex items-center gap-2">
              <History className="w-4 h-4 text-[#0E7490]" />
              Historical Empirical Benchmark Trials
            </span>
            <span className="text-[10px] text-[#64748B] font-mono">{benchmarkHistory.length} Benchmarks Stored</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#163A5F] text-white uppercase">
                <tr>
                  <th className="px-4 py-2.5">Trial ID</th>
                  <th className="px-4 py-2.5">Speedup Gain</th>
                  <th className="px-4 py-2.5">Cost Reduction</th>
                  <th className="px-4 py-2.5">Before Exec (ms)</th>
                  <th className="px-4 py-2.5">After Exec (ms)</th>
                  <th className="px-4 py-2.5">Scan Transition</th>
                  <th className="px-4 py-2.5">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {benchmarkHistory.map((item, idx) => (
                  <tr key={item.id} className={`hover:bg-[#F5F7FA] ${idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]'}`}>
                    <td className="px-4 py-2 text-[#0E7490] font-bold">#BM-{item.id}</td>
                    <td className="px-4 py-2 font-black text-[#15803D]">{item.speedup_ratio}x</td>
                    <td className="px-4 py-2 text-[#1F4E79]">{item.cost_reduction_pct}%</td>
                    <td className="px-4 py-2 text-[#64748B]">{item.before_execution_time_ms.toFixed(2)} ms</td>
                    <td className="px-4 py-2 text-[#15803D]">{item.after_execution_time_ms.toFixed(2)} ms</td>
                    <td className="px-4 py-2 text-[#0F172A]">Seq {item.before_seq_scans} → Idx {item.after_index_scans}</td>
                    <td className="px-4 py-2 text-[#64748B]">{new Date(item.created_at).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SQL Review Modal */}
      {selectedRecForReview && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] w-full max-w-lg space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#0E7490]" />
                <h3 className="text-base font-bold text-[#163A5F]">DBA Review: Apply Index DDL</h3>
              </div>
              <button onClick={() => setSelectedRecForReview(null)} className="text-[#64748B] hover:text-[#0F172A]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-[#64748B]">
                This action will execute a PostgreSQL schema modification statement on the relational storage engine:
              </p>

              <div className="p-3.5 rounded-xl bg-[#0F172A] text-[#06B6D4] font-mono break-all leading-relaxed">
                {selectedRecForReview.suggested_sql}
              </div>

              <div className="p-3 rounded-lg bg-[#EFF6FF] border border-[#1F4E79]/20 text-[#1F4E79] space-y-1">
                <strong>Target Relation:</strong> <span className="font-mono">{selectedRecForReview.target_table}</span><br />
                <strong>Target Attribute(s):</strong> <span className="font-mono">{selectedRecForReview.target_column}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setSelectedRecForReview(null)}
                className="px-4 py-2 rounded-xl bg-[#F5F7FA] border border-[#E2E8F0] text-[#64748B] hover:bg-[#E2E8F0]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={applyingIndex}
                onClick={() => handleApplySingleIndex(selectedRecForReview.suggested_sql)}
                className="px-5 py-2 rounded-xl bg-[#163A5F] hover:bg-[#0F2F4D] text-white font-bold text-xs flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {applyingIndex ? 'Executing DDL...' : 'Confirm & Execute Index DDL'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
