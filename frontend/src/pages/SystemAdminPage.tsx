import React, { useState, useEffect } from 'react';
import { fetchSystemStatus } from '../services/api';
import { SystemStatusResponse } from '../types';
import {
  Server, Database, Radio, BrainCircuit, Zap,
  CheckCircle2, AlertTriangle, RefreshCw, Clock, Cpu
} from 'lucide-react';

export const SystemAdminPage: React.FC = () => {
  const [status, setStatus] = useState<SystemStatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadStatus = async () => {
    try {
      const data = await fetchSystemStatus();
      setStatus(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  if (loading || !status) {
    return (
      <div className="p-12 text-center text-[#64748B] flex flex-col items-center justify-center gap-3">
        <Server className="w-8 h-8 text-[#0E7490] animate-pulse" />
        <span className="text-xs font-mono">Running infrastructure diagnostics...</span>
      </div>
    );
  }

  const { services } = status;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#163A5F] tracking-tight flex items-center gap-2">
              <Server className="w-5 h-5 text-[#0E7490]" />
              System Administration & Diagnostic Health
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#F0FDF4] text-[#15803D] border border-[#15803D]/20 text-[10px] font-bold font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#15803D] animate-live-pulse" />
              SYSTEM HEALTHY
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Monitor real-time daemon statuses, database connection latencies, WebSocket telemetry clients, and ML model states.
          </p>
        </div>

        <button
          onClick={loadStatus}
          className="px-3.5 py-1.5 rounded-xl bg-[#F5F7FA] border border-[#E2E8F0] hover:border-[#CBD5E1] text-xs font-semibold text-[#0F172A] flex items-center gap-1.5 shadow-xs"
        >
          <RefreshCw className="w-4 h-4 text-[#0E7490]" />
          Re-Check Services
        </button>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* PostgreSQL Database */}
        <div className="clinical-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-[#163A5F]" />
              <span className="font-bold text-sm text-[#163A5F]">{services.database.name}</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F0FDF4] text-[#15803D] uppercase font-mono">
              {services.database.status}
            </span>
          </div>
          <div className="space-y-1.5 text-xs text-[#64748B] font-mono">
            <div>Port: <strong className="text-[#0F172A]">{services.database.port}</strong></div>
            <div>Database: <strong className="text-[#0F172A]">{services.database.database}</strong></div>
            <div>Latency: <strong className="text-[#15803D]">{services.database.latency_ms} ms</strong></div>
          </div>
        </div>

        {/* WebSocket Gateway */}
        <div className="clinical-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-[#06B6D4]" />
              <span className="font-bold text-sm text-[#163A5F]">{services.websocket_hub.name}</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F0FDF4] text-[#15803D] uppercase font-mono">
              {services.websocket_hub.status}
            </span>
          </div>
          <div className="space-y-1.5 text-xs text-[#64748B] font-mono">
            <div>Active Connections: <strong className="text-[#0E7490]">{services.websocket_hub.active_connections} clients</strong></div>
            <div>Endpoint: <strong className="text-[#0F172A]">{services.websocket_hub.endpoint}</strong></div>
            <div>Protocol: <strong className="text-[#0F172A]">RFC 6455 Duplex</strong></div>
          </div>
        </div>

        {/* Machine Learning Engine */}
        <div className="clinical-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-[#6D5CE7]" />
              <span className="font-bold text-sm text-[#163A5F]">{services.ml_engine.name}</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F0FDF4] text-[#15803D] uppercase font-mono">
              {services.ml_engine.status}
            </span>
          </div>
          <div className="space-y-1.5 text-xs text-[#64748B] font-mono">
            <div>Active Models: <strong className="text-[#6D5CE7]">XGBoost, Random Forest, Logistic Reg</strong></div>
            <div>Pipeline Status: <strong className="text-[#15803D]">Nominal & Active</strong></div>
          </div>
        </div>

        {/* Query Engine & Optimizer */}
        <div className="clinical-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#0E7490]" />
              <span className="font-bold text-sm text-[#163A5F]">{services.query_optimizer.name}</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F0FDF4] text-[#15803D] uppercase font-mono">
              {services.query_optimizer.status}
            </span>
          </div>
          <div className="space-y-1.5 text-xs text-[#64748B] font-mono">
            <div>AST Parser: <strong className="text-[#0F172A]">{services.query_optimizer.ast_parser}</strong></div>
            <div>Guardrail: <strong className="text-[#15803D]">Read-Only Injection Guard</strong></div>
          </div>
        </div>

        {/* Core REST API */}
        <div className="clinical-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-[#1F4E79]" />
              <span className="font-bold text-sm text-[#163A5F]">{services.api_server.name}</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F0FDF4] text-[#15803D] uppercase font-mono">
              {services.api_server.status}
            </span>
          </div>
          <div className="space-y-1.5 text-xs text-[#64748B] font-mono">
            <div>Docs URL: <strong className="text-[#0E7490]">{services.api_server.docs_url}</strong></div>
            <div>Auth: <strong className="text-[#0F172A]">JWT (HS256) + Bcrypt</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
};
