import React, { useState, useEffect } from 'react';
import { executeSqlApi, askAiSearchApi, fetchQueryPresets, fetchSchemaExplorer } from '../services/api';
import { QueryResult, AIQueryResult } from '../types';
import {
  Terminal, Play, Zap, Database, Layers,
  CheckCircle2, AlertTriangle, Table as TableIcon,
  Code, Clock, HardDrive, ArrowRight, BookOpen, ChevronRight,
  Sparkles, MessageSquare, Search, Copy, Check, Filter, BrainCircuit
} from 'lucide-react';
import { ReactFlowPlanVisualizer } from '../components/ReactFlowPlanVisualizer';

interface Props {
  initialQuery?: string;
  onSendToOptimizer?: (query: string) => void;
}

export const QueryWorkspacePage: React.FC<Props> = ({ initialQuery, onSendToOptimizer }) => {
  const [workspaceMode, setWorkspaceMode] = useState<'ai' | 'sql'>('ai');
  const [aiPrompt, setAiPrompt] = useState<string>('Find critical cardiac lab results with abnormal troponin or BNP');
  const [aiResult, setAiResult] = useState<AIQueryResult | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  const [sql, setSql] = useState<string>(
    initialQuery ||
    `SELECT p.patient_code, p.name, p.age, v.heart_rate, v.systolic_bp, v.oxygen_saturation, v.recorded_at\nFROM vitals v\nJOIN patients p ON v.patient_id = p.id\nWHERE v.oxygen_saturation < 92.0 AND v.recorded_at > NOW() - INTERVAL '30 days'\nORDER BY v.recorded_at DESC\nLIMIT 50;`
  );
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [presets, setPresets] = useState<any[]>([]);
  const [schemaData, setSchemaData] = useState<Record<string, any>>({});
  const [showSchemaDrawer, setShowSchemaDrawer] = useState<boolean>(false);
  const [activeViewTab, setActiveViewTab] = useState<'results' | 'plan' | 'ast'>('results');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchQueryPresets().then(setPresets).catch(() => {});
    fetchSchemaExplorer().then(setSchemaData).catch(() => {});
  }, []);

  const handleExecuteSql = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await executeSqlApi(sql);
      if (!res.success) {
        setErrorMsg(res.error || "Query execution failed.");
        setQueryResult(null);
      } else {
        setQueryResult(res);
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to execute query.");
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteAi = async (customPrompt?: string) => {
    const promptToRun = customPrompt || aiPrompt;
    if (!promptToRun.trim()) return;
    setAiLoading(true);
    setErrorMsg(null);
    try {
      const res = await askAiSearchApi(promptToRun);
      if (!res.success) {
        setErrorMsg(res.error || "AI Query execution failed.");
        setAiResult(null);
      } else {
        setAiResult(res);
      }
    } catch (e: any) {
      setErrorMsg(e.message || "AI search failed.");
    } finally {
      setAiLoading(false);
    }
  };

  const samplePrompts = [
    { label: "🫀 Critical Cardiac Biomarkers", prompt: "Find critical cardiac lab results with abnormal troponin or BNP" },
    { label: "👴 Elderly Admitted Patients (>65)", prompt: "Show all patients older than 65 admitted with primary diagnosis" },
    { label: "🫁 Hypoxic Patients (SpO2 < 92%)", prompt: "Find patients with low oxygen saturation less than 92" },
    { label: "🏥 ICU Inpatients & Live Vitals", prompt: "Show all patients admitted in ICU with abnormal vitals" },
    { label: "🛏️ Hospital Ward Bed Occupancy", prompt: "Show hospital ward bed occupancy and available capacity" },
    { label: "💊 Active Lisinopril Prescriptions", prompt: "Find active prescriptions for Lisinopril" },
    { label: "🚨 Unresolved High Clinical Alerts", prompt: "Show all unresolved critical and high clinical alerts" }
  ];

  const handleCopySql = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#163A5F] tracking-tight flex items-center gap-2">
              <Terminal className="w-5 h-5 text-[#0E7490]" />
              Smart Query Processing & AI Natural Language Workspace
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#0E7490] border border-[#0E7490]/20 text-[10px] font-bold font-mono">
              CORE ACADEMIC ENGINE
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Auto-translate natural language questions into safe PostgreSQL read-only queries with AST validation and EXPLAIN ANALYZE telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center p-1 bg-[#F5F7FA] border border-[#E2E8F0] rounded-xl text-xs font-semibold">
            <button
              onClick={() => setWorkspaceMode('ai')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                workspaceMode === 'ai'
                  ? 'bg-[#163A5F] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#06B6D4]" />
              Ask AI Assistant
            </button>
            <button
              onClick={() => setWorkspaceMode('sql')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                workspaceMode === 'sql'
                  ? 'bg-[#163A5F] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              Raw SQL Editor
            </button>
          </div>

          <button
            onClick={() => setShowSchemaDrawer(!showSchemaDrawer)}
            className="px-3.5 py-2 rounded-xl bg-[#F5F7FA] border border-[#E2E8F0] hover:border-[#CBD5E1] text-xs font-semibold text-[#0F172A] flex items-center gap-2 transition-all shadow-xs"
          >
            <BookOpen className="w-4 h-4 text-[#0E7490]" />
            {showSchemaDrawer ? 'Hide Schema' : 'Schema Explorer'}
          </button>
        </div>
      </div>

      {/* Schema Explorer Drawer */}
      {showSchemaDrawer && (
        <div className="clinical-card p-5 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
            <span className="text-xs font-bold text-[#163A5F] uppercase font-mono">Relational Schema Catalog (PostgreSQL 16)</span>
            <span className="text-[10px] text-[#64748B] font-mono">{Object.keys(schemaData).length} Relational Tables</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 text-xs max-h-60 overflow-y-auto pr-1">
            {Object.entries(schemaData).map(([tbl, cols]: [string, any]) => (
              <div key={tbl} className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                <span className="font-bold text-[#163A5F] block font-mono text-[11px] truncate">{tbl}</span>
                <span className="text-[10px] text-[#64748B] block font-mono">{cols.length} columns</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 1: AI NATURAL LANGUAGE HEALTHCARE QUERY ASSISTANT                    */}
      {/* ========================================================================= */}
      {workspaceMode === 'ai' && (
        <div className="space-y-6">
          {/* AI Prompt Input Card */}
          <div className="clinical-card p-6 space-y-4 bg-white border-[#0E7490]/30 ring-1 ring-[#0E7490]/10 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#EFF6FF] text-[#0E7490]">
                  <Sparkles className="w-5 h-5 text-[#0E7490]" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#163A5F]">AI Healthcare Record Finder & Text-to-SQL</h2>
                  <p className="text-xs text-[#64748B]">Type any question in plain English. The AI generates safe, optimized SQL and queries PostgreSQL automatically.</p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#15803D]/10 text-[#15803D] border border-[#15803D]/20 text-[10px] font-bold font-mono">
                SCHEMA-AWARE AI ONLINE
              </span>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleExecuteAi(); }}
                placeholder="Ask anything (e.g. Show all patients older than 65 admitted with Heart Failure)..."
                className="w-full pl-10 pr-36 py-3 rounded-xl bg-[#F5F7FA] border border-[#E2E8F0] focus:border-[#0E7490] text-xs text-[#0F172A] font-medium outline-none transition-all"
              />
              <button
                disabled={aiLoading || !aiPrompt.trim()}
                onClick={() => handleExecuteAi()}
                className="absolute right-1.5 top-1.5 bottom-1.5 px-4 rounded-lg bg-[#163A5F] hover:bg-[#0F2F4D] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#06B6D4]" />
                {aiLoading ? 'Finding...' : 'Ask AI & Find'}
              </button>
            </div>

            {/* Suggested Prompt Chips */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold text-[#64748B] uppercase font-mono tracking-wider">
                Quick Prompt Presets (Click to Execute):
              </span>
              <div className="flex flex-wrap gap-2">
                {samplePrompts.map((sp, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setAiPrompt(sp.prompt);
                      handleExecuteAi(sp.prompt);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#0E7490] hover:text-[#0E7490] text-[11px] text-[#0F172A] font-medium transition-all shadow-2xs"
                  >
                    {sp.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* AI Result Card */}
          {aiResult && (
            <div className="space-y-4 animate-fade-in">
              {/* AI Explanation & Generated SQL Block */}
              <div className="clinical-card p-5 space-y-3 bg-[#F8FAFC] border-[#E2E8F0]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BrainCircuit className="w-4 h-4 text-[#6D5CE7]" />
                    <span className="text-xs font-bold text-[#163A5F]">AI Clinical Explanation & Query Rationale</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#15803D] font-bold">✓ Safe Read-Only AST Verified</span>
                </div>

                <p className="text-xs text-[#0F172A] bg-white p-3 rounded-xl border border-[#E2E8F0] leading-relaxed">
                  {aiResult.ai_explanation}
                </p>

                {/* Generated SQL Code Block */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-[#64748B] font-mono">
                    <span>Generated PostgreSQL 16 Query:</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopySql(aiResult.sql_query)}
                        className="hover:text-[#163A5F] flex items-center gap-1"
                      >
                        {copiedSql ? <Check className="w-3.5 h-3.5 text-[#15803D]" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedSql ? 'Copied' : 'Copy SQL'}
                      </button>
                      <button
                        onClick={() => {
                          setSql(aiResult.sql_query);
                          setWorkspaceMode('sql');
                        }}
                        className="text-[#0E7490] hover:underline font-semibold"
                      >
                        Edit in SQL Editor
                      </button>
                    </div>
                  </div>

                  <pre className="p-3 rounded-xl bg-[#0F172A] text-[#38BDF8] text-xs font-mono overflow-x-auto border border-[#1E293B] leading-relaxed">
                    {aiResult.sql_query}
                  </pre>
                </div>

                {/* Telemetry Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs font-mono">
                  <div className="p-2.5 rounded-lg bg-white border border-[#E2E8F0]">
                    <span className="text-[#64748B] text-[10px] block">EXECUTION TIME</span>
                    <strong className="text-sm text-[#0E7490]">{aiResult.execution_time_ms.toFixed(2)} ms</strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-[#E2E8F0]">
                    <span className="text-[#64748B] text-[10px] block">RECORDS MATCHED</span>
                    <strong className="text-sm text-[#163A5F]">{aiResult.rows_returned} rows</strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-[#E2E8F0]">
                    <span className="text-[#64748B] text-[10px] block">ESTIMATED COST</span>
                    <strong className="text-sm text-[#0F172A]">{aiResult.cost_estimate?.toFixed(1) || '0.0'}</strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-between">
                    <div>
                      <span className="text-[#64748B] text-[10px] block">OPTIMIZER ACTION</span>
                      <strong className="text-xs text-[#0E7490]">Empirical Benchmarking</strong>
                    </div>
                    {onSendToOptimizer && (
                      <button
                        onClick={() => onSendToOptimizer(aiResult.sql_query)}
                        className="p-1.5 rounded-lg bg-[#0E7490] hover:bg-[#085a70] text-white"
                        title="Send query to Optimizer"
                      >
                        <Zap className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <div className="clinical-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#163A5F] uppercase font-mono flex items-center gap-2">
                    <TableIcon className="w-4 h-4 text-[#0E7490]" />
                    Retrieved Hospital Records ({aiResult.rows_returned} items)
                  </h3>
                </div>

                {aiResult.results.length === 0 ? (
                  <div className="p-8 text-center text-[#64748B] text-xs">No records matched the specified criteria in PostgreSQL.</div>
                ) : (
                  <div className="overflow-x-auto max-h-96 border border-[#E2E8F0] rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold text-[#163A5F] uppercase font-mono sticky top-0">
                        <tr>
                          {aiResult.columns.map((c) => (
                            <th key={c} className="p-2.5 whitespace-nowrap">{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0]">
                        {aiResult.results.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-[#F5F7FA] font-mono text-[11px]">
                            {aiResult.columns.map((c) => (
                              <td key={c} className="p-2.5 whitespace-nowrap text-[#0F172A]">
                                {String(row[c] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: RAW SQL & EXPLAIN ANALYZE EDITOR                                  */}
      {/* ========================================================================= */}
      {workspaceMode === 'sql' && (
        <div className="space-y-6">
          {/* Presets Strip */}
          {presets.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <span className="text-[10px] font-bold text-[#64748B] uppercase font-mono whitespace-nowrap">Presets:</span>
              {presets.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSql(p.sql)}
                  className="px-3 py-1 rounded-lg bg-white border border-[#E2E8F0] hover:border-[#0E7490] hover:text-[#0E7490] text-[#0F172A] whitespace-nowrap transition-all font-mono text-[11px] shadow-2xs"
                >
                  {p.title || p.name}
                </button>
              ))}
            </div>
          )}

          {/* SQL Editor Panel */}
          <div className="clinical-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#163A5F] uppercase font-mono flex items-center gap-2">
                <Code className="w-4 h-4 text-[#0E7490]" />
                PostgreSQL Query Input (Read-Only AST Enforced)
              </span>
              <span className="text-[10px] text-[#64748B] font-mono">Dialect: Postgres 16</span>
            </div>

            <textarea
              rows={5}
              value={sql}
              onChange={e => setSql(e.target.value)}
              className="w-full p-3.5 rounded-xl bg-[#0F172A] text-[#F8FAFC] font-mono text-xs border border-[#1E293B] focus:border-[#06B6D4] outline-none transition-all leading-relaxed shadow-inner"
              placeholder="Enter SELECT query..."
            />

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-[#64748B]">
                * Mutation statements (INSERT/UPDATE/DELETE/DROP) are rejected by sqlglot AST validator.
              </span>

              <button
                disabled={loading}
                onClick={handleExecuteSql}
                className="px-5 py-2.5 rounded-xl bg-[#163A5F] hover:bg-[#0F2F4D] text-white font-bold text-xs flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
              >
                <Play className="w-4 h-4 text-[#06B6D4] fill-[#06B6D4]" />
                {loading ? 'Executing & Analyzing...' : 'Run EXPLAIN ANALYZE'}
              </button>
            </div>
          </div>

          {/* Query Execution Telemetry Results */}
          {queryResult && queryResult.success && (
            <div className="space-y-4">
              {/* Telemetry Metrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-3 rounded-xl bg-white border border-[#E2E8F0] shadow-2xs font-mono">
                  <span className="text-[#64748B] block text-[10px]">EXECUTION TIME:</span>
                  <strong className="text-base text-[#0E7490]">{queryResult.execution_time_ms.toFixed(2)} ms</strong>
                </div>
                <div className="p-3 rounded-xl bg-white border border-[#E2E8F0] shadow-2xs font-mono">
                  <span className="text-[#64748B] block text-[10px]">PLANNING TIME:</span>
                  <strong className="text-base text-[#163A5F]">{queryResult.planning_time_ms.toFixed(2)} ms</strong>
                </div>
                <div className="p-3 rounded-xl bg-white border border-[#E2E8F0] shadow-2xs font-mono">
                  <span className="text-[#64748B] block text-[10px]">ESTIMATED COST:</span>
                  <strong className="text-base text-[#0F172A]">{queryResult.cost_estimate.toFixed(1)}</strong>
                </div>
                <div className="p-3 rounded-xl bg-white border border-[#E2E8F0] shadow-2xs font-mono">
                  <span className="text-[#64748B] block text-[10px]">ROWS RETURNED:</span>
                  <strong className="text-base text-[#0F172A]">{queryResult.rows_returned}</strong>
                </div>
                <div className="p-3 rounded-xl bg-white border border-[#E2E8F0] shadow-2xs font-mono">
                  <span className="text-[#64748B] block text-[10px]">BUFFER HITS/READS:</span>
                  <strong className="text-base text-[#15803D]">{queryResult.buffers_hit ?? 0} / {queryResult.buffers_read ?? 0}</strong>
                </div>
                <div className="p-3 rounded-xl bg-white border border-[#E2E8F0] shadow-2xs font-mono flex items-center justify-between">
                  <div>
                    <span className="text-[#64748B] block text-[10px]">BOTTLENECK:</span>
                    <span className={`text-xs font-bold ${queryResult.has_bottleneck ? 'text-[#B45309]' : 'text-[#15803D]'}`}>
                      {queryResult.has_bottleneck ? 'Seq Scan' : 'Optimal'}
                    </span>
                  </div>
                  {onSendToOptimizer && (
                    <button
                      onClick={() => onSendToOptimizer(sql)}
                      className="p-1.5 rounded-lg bg-[#0E7490] hover:bg-[#085a70] text-white transition-all"
                      title="Send to Optimizer"
                    >
                      <Zap className="w-4 h-4 text-[#06B6D4]" />
                    </button>
                  )}
                </div>
              </div>

              {/* View Tabs */}
              <div className="flex border-b border-[#E2E8F0] gap-4 text-xs font-bold">
                <button
                  onClick={() => setActiveViewTab('results')}
                  className={`pb-2 flex items-center gap-1.5 transition-all ${
                    activeViewTab === 'results'
                      ? 'border-b-2 border-[#163A5F] text-[#163A5F]'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  Execution Results ({queryResult.rows_returned})
                </button>
                <button
                  onClick={() => setActiveViewTab('plan')}
                  className={`pb-2 flex items-center gap-1.5 transition-all ${
                    activeViewTab === 'plan'
                      ? 'border-b-2 border-[#163A5F] text-[#163A5F]'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  Interactive Plan Tree (React Flow)
                </button>
                <button
                  onClick={() => setActiveViewTab('ast')}
                  className={`pb-2 flex items-center gap-1.5 transition-all ${
                    activeViewTab === 'ast'
                      ? 'border-b-2 border-[#163A5F] text-[#163A5F]'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  <Code className="w-3.5 h-3.5" />
                  AST Metrics & Guardrails
                </button>
              </div>

              {/* Tab 1: Tabular Results */}
              {activeViewTab === 'results' && (
                <div className="clinical-card p-4">
                  {queryResult.results.length === 0 ? (
                    <div className="p-8 text-center text-[#64748B] text-xs">No records matched query criteria.</div>
                  ) : (
                    <div className="overflow-x-auto max-h-96 border border-[#E2E8F0] rounded-xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold text-[#163A5F] uppercase font-mono sticky top-0">
                          <tr>
                            {queryResult.columns.map((c) => (
                              <th key={c} className="p-2.5 whitespace-nowrap">{c}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E8F0]">
                          {queryResult.results.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-[#F5F7FA] font-mono text-[11px]">
                              {queryResult.columns.map((c) => (
                                <td key={c} className="p-2.5 whitespace-nowrap text-[#0F172A]">
                                  {String(row[c] ?? '')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: React Flow Execution Tree */}
              {activeViewTab === 'plan' && (
                <div className="clinical-card p-4">
                  <ReactFlowPlanVisualizer planRoot={queryResult.execution_plan_tree} />
                </div>
              )}

              {/* Tab 3: AST Metrics */}
              {activeViewTab === 'ast' && queryResult.ast_info && (
                <div className="clinical-card p-5 space-y-4 text-xs font-mono">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                      <span className="text-[#64748B] block text-[10px]">TABLES ACCESSED:</span>
                      <strong className="text-[#163A5F]">{queryResult.ast_info.tables.join(', ') || 'None'}</strong>
                    </div>
                    <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                      <span className="text-[#64748B] block text-[10px]">JOIN TYPES:</span>
                      <strong className="text-[#163A5F]">{queryResult.ast_info.join_types?.join(', ') || 'None'}</strong>
                    </div>
                    <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                      <span className="text-[#64748B] block text-[10px]">COMPLEXITY SCORE:</span>
                      <strong className="text-[#0E7490]">{queryResult.ast_info.complexity_score} / 100</strong>
                    </div>
                    <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                      <span className="text-[#64748B] block text-[10px]">SCAN TYPES DETECTED:</span>
                      <strong className="text-[#B45309]">{queryResult.scan_types?.join(', ') || 'N/A'}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Global Error Banner */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#B91C1C]/30 text-[#B91C1C] text-xs font-mono flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};
