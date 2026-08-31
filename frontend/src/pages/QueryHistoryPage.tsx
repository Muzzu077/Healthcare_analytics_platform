import React, { useState, useEffect } from 'react';
import { fetchQueryHistory, fetchQueryPerformanceStats } from '../services/api';
import { QueryHistoryItem } from '../types';
import {
  History, Database, Clock, Zap, AlertTriangle,
  Search, Filter, CheckCircle2, ChevronRight
} from 'lucide-react';

export const QueryHistoryPage: React.FC = () => {
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [search, setSearch] = useState<string>('');
  const [filterSlow, setFilterSlow] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = async () => {
    try {
      const [hist, st] = await Promise.all([
        fetchQueryHistory(),
        fetchQueryPerformanceStats()
      ]);
      setHistory(hist);
      setStats(st);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredHistory = history.filter(item => {
    const matchesSearch = item.sql_query.toLowerCase().includes(search.toLowerCase()) ||
      (item.query_fingerprint && item.query_fingerprint.toLowerCase().includes(search.toLowerCase()));
    const matchesSlow = filterSlow ? item.execution_time_ms > 10.0 : true;
    return matchesSearch && matchesSlow;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#163A5F] tracking-tight flex items-center gap-2">
              <History className="w-5 h-5 text-[#0E7490]" />
              Query Performance & Execution History Log
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#0E7490] border border-[#0E7490]/20 text-[10px] font-bold font-mono">
              {history.length} Queries Logged
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Real-time execution telemetry, normalized query fingerprints, buffer hits/reads, and plan scan types.
          </p>
        </div>
      </div>

      {/* KPI Stats Strip */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="clinical-card p-4 space-y-1">
            <span className="text-xs text-[#64748B]">Total Queries Executed</span>
            <div className="text-2xl font-bold text-[#0F172A]">{stats.total_queries_logged}</div>
          </div>
          <div className="clinical-card p-4 space-y-1">
            <span className="text-xs text-[#64748B]">Average Execution Time</span>
            <div className="text-2xl font-bold text-[#0E7490]">{stats.avg_execution_time_ms} ms</div>
          </div>
          <div className="clinical-card p-4 space-y-1">
            <span className="text-xs text-[#64748B]">Slow Queries (&gt;10ms)</span>
            <div className="text-2xl font-bold text-[#B91C1C]">{stats.slow_queries_count}</div>
          </div>
          <div className="clinical-card p-4 space-y-1">
            <span className="text-xs text-[#64748B]">Sequential Scans Logged</span>
            <div className="text-2xl font-bold text-[#B45309]">{stats.sequential_scans_logged}</div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="clinical-card p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by SQL statement or MD5 fingerprint..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#F5F7FA] border border-[#E2E8F0] focus:border-[#0E7490] text-xs text-[#0F172A] outline-none"
          />
        </div>

        <button
          onClick={() => setFilterSlow(!filterSlow)}
          className={`px-4 py-2 rounded-xl border text-xs font-semibold transition-all whitespace-nowrap ${
            filterSlow ? 'bg-[#FEF2F2] border-[#B91C1C]/40 text-[#B91C1C]' : 'bg-[#F5F7FA] border-[#E2E8F0] text-[#0F172A]'
          }`}
        >
          {filterSlow ? 'Showing Slow Queries Only (>10ms)' : 'Filter Slow Queries (>10ms)'}
        </button>
      </div>

      {/* Query History Table */}
      <div className="clinical-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#163A5F] text-white uppercase">
              <tr>
                <th className="px-4 py-3">Query ID</th>
                <th className="px-4 py-3">SQL Statement</th>
                <th className="px-4 py-3">Exec Time</th>
                <th className="px-4 py-3">Plan Cost</th>
                <th className="px-4 py-3">Scan Type</th>
                <th className="px-4 py-3">Fingerprint</th>
                <th className="px-4 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center text-[#64748B]">Loading query history...</td></tr>
              ) : filteredHistory.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-[#64748B]">No queries matched the search criteria.</td></tr>
              ) : (
                filteredHistory.map((item, idx) => (
                  <tr key={item.id} className={`hover:bg-[#F5F7FA] ${idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]'}`}>
                    <td className="px-4 py-3 font-bold text-[#0E7490]">#Q{item.id}</td>
                    <td className="px-4 py-3 font-semibold text-[#0F172A] max-w-xs truncate" title={item.sql_query}>
                      {item.sql_query}
                    </td>
                    <td className={`px-4 py-3 font-bold ${
                      item.execution_time_ms > 10.0 ? 'text-[#B91C1C]' : 'text-[#0E7490]'
                    }`}>
                      {item.execution_time_ms.toFixed(2)} ms
                    </td>
                    <td className="px-4 py-3 text-[#64748B]">{item.cost_estimate?.toFixed(1) ?? 'N/A'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                        item.scan_type?.includes('Seq') ? 'bg-[#FFFBEB] text-[#B45309] border border-[#B45309]/30' : 'bg-[#F0FDF4] text-[#15803D]'
                      }`}>
                        {item.scan_type || 'Seq Scan'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#64748B] text-[10px]">{item.query_fingerprint || 'N/A'}</td>
                    <td className="px-4 py-3 text-[#64748B]">{new Date(item.timestamp).toLocaleTimeString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
