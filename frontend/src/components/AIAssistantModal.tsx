import React, { useState } from 'react';
import {
  Sparkles, X, Search, Copy, Check, Terminal,
  BrainCircuit, Table as TableIcon, ArrowRight, Play, AlertTriangle
} from 'lucide-react';
import { askAiSearchApi } from '../services/api';
import { AIQueryResult } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onNavigateWorkspace?: (initialQuery?: string) => void;
}

export const AIAssistantModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onNavigateWorkspace
}) => {
  const [prompt, setPrompt] = useState<string>('Find critical cardiac lab results with abnormal troponin or BNP');
  const [result, setResult] = useState<AIQueryResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const samplePrompts = [
    { label: "🫀 Critical Cardiac Labs", text: "Find critical cardiac lab results with abnormal troponin or BNP" },
    { label: "👴 Elderly Inpatients (>65)", text: "Show all patients older than 65 admitted with primary diagnosis" },
    { label: "🫁 Hypoxic Patients (SpO2 < 92%)", text: "Find patients with low oxygen saturation less than 92" },
    { label: "🏥 ICU Inpatients & Vitals", text: "Show all patients admitted in ICU with abnormal vitals" },
    { label: "🛏️ Ward Bed Availability", text: "Show hospital ward bed occupancy and available capacity" },
    { label: "💊 Active Lisinopril Rx", text: "Find active prescriptions for Lisinopril" },
  ];

  const handleSearch = async (overridePrompt?: string) => {
    const textToRun = overridePrompt || prompt;
    if (!textToRun.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await askAiSearchApi(textToRun);
      if (!res.success) {
        setErrorMsg(res.error || "AI database search failed.");
        setResult(null);
      } else {
        setResult(res);
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to search database via AI.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-4xl bg-white rounded-3xl border border-[#E2E8F0] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#163A5F] text-white shadow-xs">
              <Sparkles className="w-5 h-5 text-[#06B6D4]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#163A5F] flex items-center gap-2">
                AI Healthcare Record Finder & Natural Language Query Assistant
                <span className="px-2 py-0.2 rounded-full bg-[#15803D]/10 text-[#15803D] text-[9px] font-mono font-bold">
                  LIVE AI
                </span>
              </h2>
              <p className="text-xs text-[#64748B]">
                Ask any question in plain English. The AI automatically creates safe SQL and retrieves records from PostgreSQL.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-[#E2E8F0] text-[#64748B] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & Preset Chips */}
        <div className="p-6 border-b border-[#E2E8F0] space-y-3 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
              placeholder="e.g. Show all patients older than 65 admitted with Heart Failure..."
              className="w-full pl-10 pr-36 py-3 rounded-xl bg-[#F5F7FA] border border-[#E2E8F0] focus:border-[#0E7490] text-xs text-[#0F172A] font-medium outline-none transition-all"
            />
            <button
              disabled={loading || !prompt.trim()}
              onClick={() => handleSearch()}
              className="absolute right-1.5 top-1.5 bottom-1.5 px-4 rounded-lg bg-[#163A5F] hover:bg-[#0F2F4D] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#06B6D4]" />
              {loading ? 'Finding...' : 'Ask AI & Find'}
            </button>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-[10px] font-bold text-[#64748B] uppercase font-mono whitespace-nowrap">Suggested:</span>
            {samplePrompts.map((sp, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setPrompt(sp.text);
                  handleSearch(sp.text);
                }}
                className="px-2.5 py-1 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#0E7490] hover:text-[#0E7490] text-[11px] text-[#0F172A] font-medium whitespace-nowrap transition-all shadow-2xs"
              >
                {sp.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {errorMsg && (
            <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#B91C1C]/30 text-[#B91C1C] text-xs font-mono flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!result && !loading && (
            <div className="py-12 text-center text-[#64748B] space-y-2">
              <BrainCircuit className="w-10 h-10 text-[#0E7490] mx-auto opacity-70" />
              <h3 className="text-sm font-bold text-[#163A5F]">Ask a Clinical or Operational Question</h3>
              <p className="text-xs max-w-md mx-auto">
                Type questions about patients, diagnostic lab results, vitals telemetry, ward admissions, or medication prescriptions.
              </p>
            </div>
          )}

          {loading && (
            <div className="py-16 text-center text-[#64748B] space-y-3">
              <Sparkles className="w-8 h-8 text-[#0E7490] animate-spin mx-auto" />
              <span className="text-xs font-semibold block">Translating prompt, validating AST, and querying PostgreSQL...</span>
            </div>
          )}

          {result && (
            <div className="space-y-4 animate-fade-in">
              {/* AI Explanation */}
              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#163A5F] flex items-center gap-1.5">
                    <BrainCircuit className="w-4 h-4 text-[#6D5CE7]" />
                    AI Clinical Rationale & Search Strategy
                  </span>
                  <span className="text-[10px] font-mono text-[#15803D] font-bold">
                    ✓ AST Validated • Read-Only
                  </span>
                </div>
                <p className="text-xs text-[#0F172A] leading-relaxed">
                  {result.ai_explanation}
                </p>

                {/* Generated SQL */}
                <div className="space-y-1 pt-2">
                  <div className="flex items-center justify-between text-[11px] text-[#64748B] font-mono">
                    <span>Generated PostgreSQL Query:</span>
                    <button
                      onClick={() => handleCopy(result.sql_query)}
                      className="hover:text-[#163A5F] flex items-center gap-1"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-[#15803D]" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied' : 'Copy SQL'}
                    </button>
                  </div>
                  <pre className="p-3 rounded-xl bg-[#0F172A] text-[#38BDF8] text-xs font-mono overflow-x-auto border border-[#1E293B] leading-relaxed">
                    {result.sql_query}
                  </pre>
                </div>

                {/* Telemetry Metrics */}
                <div className="flex items-center justify-between pt-2 text-[11px] font-mono text-[#64748B] border-t border-[#E2E8F0]">
                  <span>Execution Time: <strong className="text-[#0E7490]">{result.execution_time_ms.toFixed(2)} ms</strong></span>
                  <span>Records Matched: <strong className="text-[#163A5F]">{result.rows_returned} rows</strong></span>
                  <span>Estimated Cost: <strong className="text-[#0F172A]">{result.cost_estimate?.toFixed(1) || '0.0'}</strong></span>
                </div>
              </div>

              {/* Data Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#163A5F] uppercase font-mono flex items-center gap-2">
                    <TableIcon className="w-4 h-4 text-[#0E7490]" />
                    Retrieved Records ({result.rows_returned})
                  </h3>

                  {onNavigateWorkspace && (
                    <button
                      onClick={() => {
                        onClose();
                        onNavigateWorkspace(result.sql_query);
                      }}
                      className="text-xs text-[#0E7490] hover:underline font-semibold flex items-center gap-1"
                    >
                      Open in Full SQL Workspace <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {result.results.length === 0 ? (
                  <div className="p-8 text-center text-[#64748B] text-xs">No records matched the specified query.</div>
                ) : (
                  <div className="overflow-x-auto max-h-60 border border-[#E2E8F0] rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold text-[#163A5F] uppercase font-mono sticky top-0">
                        <tr>
                          {result.columns.map((c) => (
                            <th key={c} className="p-2.5 whitespace-nowrap">{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0]">
                        {result.results.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-[#F5F7FA] font-mono text-[11px]">
                            {result.columns.map((c) => (
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
      </div>
    </div>
  );
};
