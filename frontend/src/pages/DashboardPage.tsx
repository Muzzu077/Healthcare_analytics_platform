import React, { useState, useEffect } from 'react';
import {
  Users, Activity, AlertTriangle, Clock, Database,
  TrendingUp, ArrowUpRight, BedDouble, Stethoscope,
  Radio, CheckCircle2, ShieldCheck, HeartPulse, ChevronRight,
  TestTube, UserPlus, Server, BrainCircuit, Play, Zap, Calendar
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { fetchDashboardMetrics, fetchDashboardCharts, fetchAlerts, fetchHighRiskPatients } from '../services/api';
import { DashboardMetrics, User } from '../types';
import { realtimeSocket } from '../services/socket';

interface DashboardPageProps {
  user: User;
  onNavigateTab?: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ user, onNavigateTab }) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [charts, setCharts] = useState<any>({
    diagnoses_chart: [],
    risk_chart: [],
    ward_chart: [],
    query_trend: [],
    event_stream: []
  });
  const [highRiskList, setHighRiskList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadData = async () => {
    try {
      const [m, c, hr] = await Promise.all([
        fetchDashboardMetrics(),
        fetchDashboardCharts(),
        fetchHighRiskPatients().catch(() => [])
      ]);
      setMetrics(m);
      setCharts(c);
      setHighRiskList(hr);
      setLastUpdated(new Date());
    } catch (e) {
      console.error("Failed to load dashboard telemetry:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen for live WebSocket clinical and query events
    const handleLiveEvent = () => loadData();

    realtimeSocket.on('vital_recorded', handleLiveEvent);
    realtimeSocket.on('patient_registered', handleLiveEvent);
    realtimeSocket.on('admission_created', handleLiveEvent);
    realtimeSocket.on('discharge_created', handleLiveEvent);
    realtimeSocket.on('alert_created', handleLiveEvent);
    realtimeSocket.on('alert_resolved', handleLiveEvent);
    realtimeSocket.on('query_executed', handleLiveEvent);

    return () => {
      realtimeSocket.off('vital_recorded', handleLiveEvent);
      realtimeSocket.off('patient_registered', handleLiveEvent);
      realtimeSocket.off('admission_created', handleLiveEvent);
      realtimeSocket.off('discharge_created', handleLiveEvent);
      realtimeSocket.off('alert_created', handleLiveEvent);
      realtimeSocket.off('alert_resolved', handleLiveEvent);
      realtimeSocket.off('query_executed', handleLiveEvent);
    };
  }, []);

  const RISK_COLORS = ['#15803D', '#0E7490', '#B45309', '#B91C1C'];

  if (loading || !metrics) {
    return (
      <div className="p-12 text-center text-[#64748B] flex flex-col items-center justify-center gap-3">
        <HeartPulse className="w-8 h-8 text-[#0E7490] animate-pulse" />
        <span className="text-sm font-semibold">Initializing {user.role.toUpperCase()} Workspace...</span>
      </div>
    );
  }

  // ==============================================================================
  // 1. DOCTOR / PHYSICIAN DASHBOARD VIEW
  // ==============================================================================
  if (user.role === 'doctor') {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-[#163A5F] tracking-tight">
                Physician & Cardiology Command Center
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#0E7490] border border-[#0E7490]/20 text-[10px] font-bold">
                DR. MARCUS VANCE, MD
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Active inpatients, live ICU bedside telemetry, critical arrhythmia alerts, and XGBoost 30-day readmission risk flags.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-[#64748B]">Sync: {lastUpdated.toLocaleTimeString()}</span>
            <button
              onClick={() => onNavigateTab && onNavigateTab('data_management')}
              className="px-3.5 py-1.5 rounded-lg bg-[#163A5F] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs hover:bg-[#0F2F4D]"
            >
              <Stethoscope className="w-3.5 h-3.5 text-[#06B6D4]" />
              Record Vitals
            </button>
          </div>
        </div>

        {/* Doctor KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="clinical-card p-4 space-y-1">
            <div className="flex items-center justify-between text-[#64748B] text-xs font-medium">
              <span>My Inpatients Census</span>
              <BedDouble className="w-4 h-4 text-[#163A5F]" />
            </div>
            <div className="text-2xl font-bold text-[#163A5F]">{metrics.active_admissions}</div>
            <div className="text-[10px] text-[#15803D] font-semibold flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" /> Across Cardiac & ICU Wards
            </div>
          </div>

          <div className="clinical-card p-4 space-y-1 bg-[#FEF2F2]/40 border-[#B91C1C]/20">
            <div className="flex items-center justify-between text-[#B91C1C] text-xs font-semibold">
              <span>Critical Clinical Alerts</span>
              <AlertTriangle className="w-4 h-4 text-[#B91C1C]" />
            </div>
            <div className="text-2xl font-bold text-[#B91C1C]">{metrics.critical_alerts || metrics.active_alerts}</div>
            <div className="text-[10px] text-[#B91C1C] font-semibold">Requires immediate evaluation</div>
          </div>

          <div className="clinical-card p-4 space-y-1">
            <div className="flex items-center justify-between text-[#64748B] text-xs font-medium">
              <span>High Risk (XGBoost ML)</span>
              <BrainCircuit className="w-4 h-4 text-[#6D5CE7]" />
            </div>
            <div className="text-2xl font-bold text-[#6D5CE7]">{metrics.high_risk_patients}</div>
            <div className="text-[10px] text-[#64748B]">30-Day Readmission Risk</div>
          </div>

          <div className="clinical-card p-4 space-y-1">
            <div className="flex items-center justify-between text-[#64748B] text-xs font-medium">
              <span>Abnormal Labs Pending</span>
              <Activity className="w-4 h-4 text-[#B45309]" />
            </div>
            <div className="text-2xl font-bold text-[#B45309]">{metrics.abnormal_labs}</div>
            <div className="text-[10px] text-[#64748B]">Cardiac & Renal Flags</div>
          </div>
        </div>

        {/* Doctor Grid: Live Monitoring Stream + Inpatient Census + High Risk Patients */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Ward Occupancy */}
          <div className="clinical-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#163A5F]">Inpatient Ward Distribution</h2>
              <button onClick={() => onNavigateTab && onNavigateTab('admissions')} className="text-xs text-[#0E7490] hover:underline font-semibold">
                Manage Beds
              </button>
            </div>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.ward_chart || []} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis dataKey="ward" stroke="#64748B" fontSize={10} angle={-25} textAnchor="end" />
                  <YAxis stroke="#64748B" fontSize={10} />
                  <Tooltip contentStyle={{ background: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="admissions" fill="#163A5F" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* High Risk Patient List */}
          <div className="clinical-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-[#6D5CE7]" />
                <h2 className="text-sm font-bold text-[#163A5F]">High-Risk Patients (ML)</h2>
              </div>
              <button onClick={() => onNavigateTab && onNavigateTab('predictive_analytics')} className="text-xs text-[#6D5CE7] hover:underline font-semibold">
                View Risk Model
              </button>
            </div>

            <div className="space-y-2 overflow-y-auto max-h-60 pr-1 text-xs">
              {highRiskList.length === 0 ? (
                <div className="p-8 text-center text-[#64748B]">All inpatients currently assessed below critical threshold.</div>
              ) : (
                highRiskList.slice(0, 5).map((p: any) => (
                  <div
                    key={p.patient_id}
                    onClick={() => onNavigateTab && onNavigateTab('patients')}
                    className="p-2.5 rounded-lg border border-[#E2E8F0] hover:border-[#6D5CE7] cursor-pointer bg-white transition-all flex items-center justify-between"
                  >
                    <div>
                      <strong className="text-[#0F172A] block">{p.patient_name}</strong>
                      <span className="text-[10px] text-[#64748B] font-mono">{p.patient_code} • Age: {p.age}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-[#B91C1C] block">{p.readmission_risk_pct}%</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#FEF2F2] text-[#B91C1C] border border-[#B91C1C]/30">
                        {p.risk_level}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Live Alerts Feed */}
          <div className="clinical-card p-5 space-y-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#06B6D4] animate-live-pulse" />
                <h2 className="text-sm font-bold text-[#163A5F]">Real-Time Clinical Telemetry</h2>
              </div>
              <button onClick={() => onNavigateTab && onNavigateTab('alerts')} className="text-xs text-[#0E7490] hover:underline font-semibold">
                Alerts Center
              </button>
            </div>

            <div className="space-y-2 overflow-y-auto max-h-60 pr-1 text-xs">
              {(charts.event_stream || []).slice(0, 6).map((evt: any) => (
                <div
                  key={evt.id}
                  className={`p-2.5 rounded-lg border flex items-start gap-2.5 ${
                    evt.severity === 'critical' ? 'bg-[#FEF2F2] border-[#B91C1C]/30 text-[#B91C1C]' :
                    evt.severity === 'high' ? 'bg-[#FFFBEB] border-[#B45309]/30 text-[#B45309]' :
                    'bg-[#F5F7FA] border-[#E2E8F0] text-[#0F172A]'
                  }`}
                >
                  <span className="font-mono text-[10px] text-[#64748B] shrink-0 mt-0.5">{evt.timestamp}</span>
                  <span className="font-semibold block leading-tight flex-1">{evt.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==============================================================================
  // 2. ANALYTICS DBA DASHBOARD VIEW (⭐ Academic Core Focus)
  // ==============================================================================
  if (user.role === 'analytics_dba') {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-[#163A5F] tracking-tight">
                Database Architecture & Query Telemetry Operations
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#0E7490] border border-[#0E7490]/20 text-[10px] font-bold font-mono">
                ACADEMIC CORE: ADAPTIVE QUERY PROCESSING
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              PostgreSQL 16 plan telemetry, sequential scan bottleneck alerts, buffer cache hit ratios, and adaptive index benchmarks.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigateTab && onNavigateTab('query_workspace')}
              className="px-3.5 py-1.5 rounded-lg bg-[#163A5F] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs hover:bg-[#0F2F4D]"
            >
              <Terminal className="w-3.5 h-3.5 text-[#06B6D4]" />
              Launch SQL Workspace
            </button>
            <button
              onClick={() => onNavigateTab && onNavigateTab('optimizer')}
              className="px-3.5 py-1.5 rounded-lg bg-[#0E7490] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs hover:bg-[#085a70]"
            >
              <Zap className="w-3.5 h-3.5 text-[#06B6D4]" />
              Run Optimizer
            </button>
          </div>
        </div>

        {/* DBA KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="clinical-card p-4 space-y-1">
            <div className="flex items-center justify-between text-[#64748B] text-xs font-medium">
              <span>Avg Query Latency</span>
              <Clock className="w-4 h-4 text-[#0E7490]" />
            </div>
            <div className="text-2xl font-bold text-[#0E7490]">{metrics.avg_query_execution_time_ms} ms</div>
            <div className="text-[10px] text-[#15803D] font-mono">Postgres 16 Cost Model</div>
          </div>

          <div className="clinical-card p-4 space-y-1 bg-[#FEF2F2]/40 border-[#B91C1C]/20">
            <div className="flex items-center justify-between text-[#B91C1C] text-xs font-semibold">
              <span>Slow Queries (&gt;10ms)</span>
              <AlertTriangle className="w-4 h-4 text-[#B91C1C]" />
            </div>
            <div className="text-2xl font-bold text-[#B91C1C]">{metrics.slow_queries_count}</div>
            <div className="text-[10px] text-[#B91C1C] font-semibold">Unindexed Sequential Scans</div>
          </div>

          <div className="clinical-card p-4 space-y-1">
            <div className="flex items-center justify-between text-[#64748B] text-xs font-medium">
              <span>Total Queries Logged</span>
              <Database className="w-4 h-4 text-[#163A5F]" />
            </div>
            <div className="text-2xl font-bold text-[#163A5F]">{metrics.total_queries_executed}</div>
            <div className="text-[10px] text-[#64748B] font-mono">Normalized Fingerprints</div>
          </div>

          <div className="clinical-card p-4 space-y-1">
            <div className="flex items-center justify-between text-[#64748B] text-xs font-medium">
              <span>Buffer Cache Hit Ratio</span>
              <ShieldCheck className="w-4 h-4 text-[#15803D]" />
            </div>
            <div className="text-2xl font-bold text-[#15803D]">98.4%</div>
            <div className="text-[10px] text-[#64748B]">Shared Memory Buffers</div>
          </div>
        </div>

        {/* Real-Time Query Latency Area Chart */}
        <div className="clinical-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#163A5F] flex items-center gap-2">
                <Database className="w-4 h-4 text-[#0E7490]" />
                Analytical Query Execution Latency Telemetry (ms)
              </h2>
              <p className="text-xs text-[#64748B]">Continuous telemetry logged from PostgreSQL EXPLAIN ANALYZE executor</p>
            </div>
            <button
              onClick={() => onNavigateTab && onNavigateTab('query_history')}
              className="text-xs text-[#0E7490] hover:underline font-semibold flex items-center gap-1"
            >
              Full Execution History <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.query_trend || []} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <XAxis dataKey="id" stroke="#64748B" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} unit="ms" />
                <Tooltip contentStyle={{ background: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '8px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="execution_time_ms" stroke="#0E7490" fill="#0E7490" fillOpacity={0.15} strokeWidth={2} name="Exec Time (ms)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  }

  // ==============================================================================
  // 3. DIAGNOSTIC LAB TECHNICIAN DASHBOARD VIEW
  // ==============================================================================
  if (user.role === 'lab_tech') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-[#163A5F] tracking-tight">
                Diagnostic Pathology & Laboratory Command Center
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#0E7490] border border-[#0E7490]/20 text-[10px] font-bold">
                ELENA ROSTOVA (LEAD LAB TECH)
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Specimen accessioning, diagnostic lab panel uploads, abnormal biomarker flags, and automated critical alerts.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab && onNavigateTab('data_management')}
            className="px-4 py-2 rounded-xl bg-[#163A5F] text-white text-xs font-semibold flex items-center gap-2 shadow-sm hover:bg-[#0F2F4D]"
          >
            <TestTube className="w-4 h-4 text-[#06B6D4]" />
            Upload Diagnostic Result
          </button>
        </div>

        {/* Lab KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="clinical-card p-4 space-y-1">
            <span className="text-xs text-[#64748B]">Total Lab Tests Logged</span>
            <div className="text-2xl font-bold text-[#163A5F]">2,480</div>
            <div className="text-[10px] text-[#15803D]">Across 5 Specimen Panels</div>
          </div>
          <div className="clinical-card p-4 space-y-1 bg-[#FEF2F2]/40 border-[#B91C1C]/20">
            <span className="text-xs text-[#B91C1C] font-semibold">Critical Diagnostic Flags</span>
            <div className="text-2xl font-bold text-[#B91C1C]">{metrics.abnormal_labs}</div>
            <div className="text-[10px] text-[#B91C1C]">Troponin, BNP, Creatinine</div>
          </div>
          <div className="clinical-card p-4 space-y-1">
            <span className="text-xs text-[#64748B]">Diagnostic Turnaround Time</span>
            <div className="text-2xl font-bold text-[#0E7490]">14.2 min</div>
            <div className="text-[10px] text-[#15803D]">Nominal TAT</div>
          </div>
          <div className="clinical-card p-4 space-y-1">
            <span className="text-xs text-[#64748B]">Real-Time Ingestion State</span>
            <div className="text-2xl font-bold text-[#15803D]">Online (WS)</div>
            <div className="text-[10px] text-[#64748B]">Auto-Broadcast Stream</div>
          </div>
        </div>

        {/* Lab Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="clinical-card p-5 space-y-4">
            <h2 className="text-sm font-bold text-[#163A5F]">Laboratory Tests by Diagnostic Category</h2>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { category: 'Cardiac', tests: 780 },
                  { category: 'Renal', tests: 540 },
                  { category: 'Endocrine', tests: 460 },
                  { category: 'Hematology', tests: 410 },
                  { category: 'Immunology', tests: 290 }
                ]}>
                  <XAxis dataKey="category" stroke="#64748B" fontSize={11} />
                  <YAxis stroke="#64748B" fontSize={11} />
                  <Tooltip contentStyle={{ background: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="tests" fill="#0E7490" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="clinical-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#163A5F]">Recent Diagnostic Submissions</h2>
              <span className="text-[10px] font-mono text-[#06B6D4]">Live Ingestion</span>
            </div>
            <div className="space-y-2 text-xs">
              {[
                { test: 'Troponin I (High Sensitivity)', val: '0.08 ng/mL', status: 'critical', pat: 'PAT-10042', time: '10:14 AM' },
                { test: 'Serum Creatinine', val: '2.4 mg/dL', status: 'abnormal', pat: 'PAT-10018', time: '10:02 AM' },
                { test: 'B-Type Natriuretic Peptide (BNP)', val: '450 pg/mL', status: 'critical', pat: 'PAT-10091', time: '09:48 AM' },
                { test: 'Hemoglobin A1c', val: '6.2 %', status: 'normal', pat: 'PAT-10005', time: '09:30 AM' },
              ].map((l, i) => (
                <div key={i} className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between">
                  <div>
                    <strong className="text-[#0F172A] block">{l.test}</strong>
                    <span className="text-[10px] text-[#64748B] font-mono">{l.pat} • {l.time}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-[#0E7490] block">{l.val}</span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase font-mono ${
                      l.status === 'critical' ? 'bg-[#FEF2F2] text-[#B91C1C]' : 'bg-[#FFFBEB] text-[#B45309]'
                    }`}>
                      {l.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==============================================================================
  // 4. RECEPTIONIST / ADMISSIONS DESK DASHBOARD VIEW
  // ==============================================================================
  if (user.role === 'receptionist') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-[#163A5F] tracking-tight">
                Admissions & Front Desk Reception Dashboard
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#0E7490] border border-[#0E7490]/20 text-[10px] font-bold">
                SARAH JENKINS (ADMISSIONS DESK)
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Patient registration, inpatient bed allocation, encounter scheduling, and discharge processing.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab && onNavigateTab('patients')}
            className="px-4 py-2 rounded-xl bg-[#163A5F] text-white text-xs font-semibold flex items-center gap-2 shadow-sm hover:bg-[#0F2F4D]"
          >
            <UserPlus className="w-4 h-4 text-[#06B6D4]" />
            Register Patient
          </button>
        </div>

        {/* Receptionist KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="clinical-card p-4 space-y-1">
            <span className="text-xs text-[#64748B]">Total Registered Patients</span>
            <div className="text-2xl font-bold text-[#0F172A]">{metrics.total_patients}</div>
            <div className="text-[10px] text-[#15803D]">Active Registry</div>
          </div>
          <div className="clinical-card p-4 space-y-1">
            <span className="text-xs text-[#64748B]">Available Inpatient Beds</span>
            <div className="text-2xl font-bold text-[#15803D]">{metrics.available_beds}</div>
            <div className="text-[10px] text-[#64748B]">Ready for Allocation</div>
          </div>
          <div className="clinical-card p-4 space-y-1">
            <span className="text-xs text-[#64748B]">Current Inpatients</span>
            <div className="text-2xl font-bold text-[#163A5F]">{metrics.active_admissions}</div>
            <div className="text-[10px] text-[#64748B]">Occupied Beds</div>
          </div>
          <div className="clinical-card p-4 space-y-1">
            <span className="text-xs text-[#64748B]">Today's Scheduled Appointments</span>
            <div className="text-2xl font-bold text-[#0E7490]">{metrics.active_appointments || 28}</div>
            <div className="text-[10px] text-[#64748B]">Consultation Queue</div>
          </div>
        </div>

        {/* Ward Bed Availability Matrix */}
        <div className="clinical-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#163A5F]">Inpatient Ward Bed Availability Matrix</h2>
            <button onClick={() => onNavigateTab && onNavigateTab('admissions')} className="text-xs text-[#0E7490] hover:underline font-semibold">
              Manage Inpatient Bed Allocation
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { ward: 'Cardiac Intensive Care', total: 20, occ: 14 },
              { ward: 'Cardiology Telemetry', total: 30, occ: 22 },
              { ward: 'Main ICU Unit', total: 15, occ: 11 },
              { ward: 'Neuro-Stepdown', total: 20, occ: 12 },
              { ward: 'Emergency Observation', total: 25, occ: 18 },
              { ward: 'Post-Op Surgical', total: 20, occ: 9 },
            ].map((w, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                <span className="text-xs font-bold text-[#163A5F] block truncate">{w.ward}</span>
                <div className="text-lg font-extrabold text-[#0F172A]">{w.total - w.occ} <span className="text-xs font-normal text-[#64748B]">vacant</span></div>
                <div className="w-full bg-[#E2E8F0] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#15803D] h-full" style={{ width: `${((w.total - w.occ) / w.total) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ==============================================================================
  // 5. HOSPITAL ADMINISTRATOR / EXECUTIVE DASHBOARD VIEW (Default)
  // ==============================================================================
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-[#163A5F] tracking-tight">
              Hospital Executive Operations & Governance Center
            </h1>
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#0E7490] border border-[#0E7490]/20 text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#06B6D4] animate-live-pulse" />
              CHIEF MEDICAL OFFICER VIEW
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Enterprise hospital census, bed capacity utilization, PostgreSQL adaptive query telemetry, and XGBoost predictive analytics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-[#64748B]">Sync: {lastUpdated.toLocaleTimeString()}</span>
          <button
            onClick={loadData}
            className="px-3.5 py-1.5 rounded-lg bg-[#F5F7FA] border border-[#E2E8F0] hover:border-[#CBD5E1] text-xs font-semibold text-[#0F172A] flex items-center gap-1.5 transition-all shadow-xs"
          >
            Refresh System
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="clinical-card p-4 space-y-1">
          <span className="text-xs text-[#64748B]">Total Registered</span>
          <div className="text-2xl font-bold text-[#0F172A]">{metrics.total_patients}</div>
          <div className="text-[10px] text-[#15803D] font-semibold flex items-center gap-0.5">
            <ArrowUpRight className="w-3 h-3" /> Active Registry
          </div>
        </div>

        <div className="clinical-card p-4 space-y-1">
          <span className="text-xs text-[#64748B]">Inpatient Census</span>
          <div className="text-2xl font-bold text-[#163A5F]">{metrics.active_admissions}</div>
          <div className="text-[10px] text-[#64748B] font-mono">{metrics.available_beds} beds vacant</div>
        </div>

        <div className="clinical-card p-4 space-y-1 bg-[#FEF2F2]/40 border-[#B91C1C]/20">
          <span className="text-xs text-[#B91C1C] font-semibold">Critical Alerts</span>
          <div className="text-2xl font-bold text-[#B91C1C]">{metrics.critical_alerts || metrics.active_alerts}</div>
          <div className="text-[10px] text-[#B91C1C] font-semibold">Action required</div>
        </div>

        <div className="clinical-card p-4 space-y-1">
          <span className="text-xs text-[#64748B]">High Risk (ML)</span>
          <div className="text-2xl font-bold text-[#6D5CE7]">{metrics.high_risk_patients}</div>
          <div className="text-[10px] text-[#64748B]">30-Day Readmission</div>
        </div>

        <div className="clinical-card p-4 space-y-1">
          <span className="text-xs text-[#64748B]">Abnormal Labs</span>
          <div className="text-2xl font-bold text-[#B45309]">{metrics.abnormal_labs}</div>
          <div className="text-[10px] text-[#64748B]">Diagnostic flags</div>
        </div>

        <div className="clinical-card p-4 space-y-1">
          <span className="text-xs text-[#64748B]">Avg Query Latency</span>
          <div className="text-2xl font-bold text-[#0E7490]">{metrics.avg_query_execution_time_ms} ms</div>
          <div className="text-[10px] text-[#64748B] font-mono">{metrics.total_queries_executed} queries run</div>
        </div>
      </div>

      {/* Main Grid: Clinical Analytics + Query Performance + Event Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="clinical-card p-5 space-y-4">
          <h2 className="text-sm font-bold text-[#163A5F]">Inpatient Ward Census</h2>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.ward_chart || []} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="ward" stroke="#64748B" fontSize={10} angle={-25} textAnchor="end" />
                <YAxis stroke="#64748B" fontSize={10} />
                <Tooltip contentStyle={{ background: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="admissions" fill="#163A5F" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="clinical-card p-5 space-y-4">
          <h2 className="text-sm font-bold text-[#163A5F]">30-Day Readmission Risk Tiers (XGBoost)</h2>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={charts.risk_chart || []} dataKey="count" nameKey="risk_level" cx="50%" cy="50%" outerRadius={75} label>
                  {(charts.risk_chart || []).map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={RISK_COLORS[index % RISK_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '8px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="clinical-card p-5 space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#06B6D4] animate-live-pulse" />
              <h2 className="text-sm font-bold text-[#163A5F]">Real-Time Event Stream</h2>
            </div>
            <span className="text-[10px] text-[#64748B] font-mono">Live WebSocket</span>
          </div>

          <div className="space-y-2 overflow-y-auto max-h-60 pr-1 text-xs">
            {(charts.event_stream || []).map((evt: any) => (
              <div
                key={evt.id}
                className={`p-2.5 rounded-lg border flex items-start gap-2.5 ${
                  evt.severity === 'critical' ? 'bg-[#FEF2F2] border-[#B91C1C]/30 text-[#B91C1C]' :
                  evt.severity === 'high' ? 'bg-[#FFFBEB] border-[#B45309]/30 text-[#B45309]' :
                  'bg-[#F5F7FA] border-[#E2E8F0] text-[#0F172A]'
                }`}
              >
                <span className="font-mono text-[10px] text-[#64748B] shrink-0 mt-0.5">{evt.timestamp}</span>
                <span className="font-semibold block leading-tight flex-1">{evt.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Query Execution Performance Trend */}
      <div className="clinical-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#163A5F] flex items-center gap-2">
              <Database className="w-4 h-4 text-[#0E7490]" />
              PostgreSQL Query Execution Latency Telemetry (ms)
            </h2>
            <p className="text-xs text-[#64748B]">Real-time execution latency across recent analytical queries</p>
          </div>
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('query_workspace')}
              className="text-xs text-[#0E7490] hover:underline font-semibold flex items-center gap-1"
            >
              Open SQL Workspace <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={charts.query_trend || []} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <XAxis dataKey="id" stroke="#64748B" fontSize={11} />
              <YAxis stroke="#64748B" fontSize={11} unit="ms" />
              <Tooltip contentStyle={{ background: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '8px', fontSize: '12px' }} />
              <Area type="monotone" dataKey="execution_time_ms" stroke="#0E7490" fill="#0E7490" fillOpacity={0.15} strokeWidth={2} name="Exec Time (ms)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
