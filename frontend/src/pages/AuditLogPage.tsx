import React, { useState, useEffect } from 'react';
import { fetchAuditLogs } from '../services/api';
import { AuditLogItem } from '../types';
import {
  Shield, Search, Filter, Clock, CheckCircle2,
  ChevronLeft, ChevronRight, User, Terminal
} from 'lucide-react';

export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [actionFilter, setActionFilter] = useState<string>('');
  const [actorFilter, setActorFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(25);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const skip = (currentPage - 1) * pageSize;
      const res = await fetchAuditLogs(actionFilter, undefined, actorFilter, skip, pageSize);
      setLogs(res.items);
      setTotal(res.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [currentPage, actionFilter, actorFilter]);

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#163A5F] tracking-tight flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#0E7490]" />
              Security & Compliance Audit Log
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#0E7490] border border-[#0E7490]/20 text-[10px] font-bold font-mono">
              HIPAA COMPLIANCE TRAIL
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Immutable log of schema modifications, patient EHR accesses, telemetry submissions, and clinical alert resolutions.
          </p>
        </div>

        <span className="text-xs font-mono text-[#64748B]">
          {total} Total Audit Records Logged
        </span>
      </div>

      {/* Filter Bar */}
      <div className="clinical-card p-4 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-3" />
          <input
            type="text"
            value={actionFilter}
            onChange={e => { setActionFilter(e.target.value); setCurrentPage(1); }}
            placeholder="Search by Action (e.g. APPLY_INDEX, RECORD_VITALS, RESOLVE_ALERT)..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#F5F7FA] border border-[#E2E8F0] focus:border-[#0E7490] text-xs text-[#0F172A] outline-none"
          />
        </div>

        <input
          type="text"
          value={actorFilter}
          onChange={e => { setActorFilter(e.target.value); setCurrentPage(1); }}
          placeholder="Filter by Actor Username (e.g. dba, doctor)..."
          className="w-full md:w-64 px-3 py-2 rounded-xl bg-[#F5F7FA] border border-[#E2E8F0] focus:border-[#0E7490] text-xs text-[#0F172A] outline-none"
        />
      </div>

      {/* Audit Log Table */}
      <div className="clinical-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#163A5F] text-white uppercase">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Actor / Username</th>
                <th className="px-4 py-3">Action Performed</th>
                <th className="px-4 py-3">Resource Type</th>
                <th className="px-4 py-3">Resource ID</th>
                <th className="px-4 py-3">IP Address</th>
                <th className="px-4 py-3 text-right">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center text-[#64748B]">Loading security audit records...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-[#64748B]">No audit events matched the filter.</td></tr>
              ) : (
                logs.map((l, idx) => (
                  <tr
                    key={l.id}
                    onClick={() => setSelectedLog(l)}
                    className={`hover:bg-[#F5F7FA] cursor-pointer transition-all ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]'
                    }`}
                  >
                    <td className="px-4 py-3 text-[#64748B]">{new Date(l.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-3 font-bold text-[#163A5F]">
                      {l.actor_username || 'system'} <span className="text-[10px] text-[#64748B]">({l.actor_role})</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        l.action.includes('APPLY_INDEX') ? 'bg-[#EFF6FF] text-[#0E7490] border border-[#0E7490]/30' :
                        l.action.includes('RESOLVE') ? 'bg-[#F0FDF4] text-[#15803D]' : 'bg-[#F5F7FA] text-[#0F172A]'
                      }`}>
                        {l.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#0F172A]">{l.resource_type}</td>
                    <td className="px-4 py-3 text-[#64748B]">#{l.resource_id || 'N/A'}</td>
                    <td className="px-4 py-3 text-[#64748B]">{l.ip_address || '127.0.0.1'}</td>
                    <td className="px-4 py-3 text-right">
                      <button className="px-2.5 py-1 rounded bg-white hover:bg-[#163A5F] hover:text-white border border-[#E2E8F0] text-[10px] font-semibold transition-all">
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between text-xs text-[#64748B]">
          <div>
            Page <strong className="text-[#0F172A]">{currentPage}</strong> of <strong className="text-[#0F172A]">{totalPages}</strong>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg bg-white border border-[#E2E8F0] hover:bg-[#F5F7FA] disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg bg-white border border-[#E2E8F0] hover:bg-[#F5F7FA] disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Metadata Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] w-full max-w-lg space-y-4 shadow-2xl animate-fade-in font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
              <span className="font-bold text-sm text-[#163A5F]">Audit Trail Event #{selectedLog.id}</span>
              <button onClick={() => setSelectedLog(null)} className="text-[#64748B] hover:text-[#0F172A]">✕</button>
            </div>
            <div className="p-3.5 rounded-xl bg-[#0F172A] text-[#06B6D4] overflow-x-auto max-h-64">
              <pre>{JSON.stringify(selectedLog, null, 2)}</pre>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-[#163A5F] text-white font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
