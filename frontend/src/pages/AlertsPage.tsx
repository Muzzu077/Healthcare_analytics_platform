import React, { useState, useEffect } from 'react';
import { fetchAlerts, acknowledgeAlertApi, resolveAlert } from '../services/api';
import { AlertItem } from '../types';
import {
  Bell, CheckCircle2, AlertTriangle, Activity, Database,
  BrainCircuit, RefreshCw, Filter, ShieldAlert, Check,
  Clock, ArrowRight
} from 'lucide-react';
import { realtimeSocket } from '../services/socket';

interface AlertsPageProps {
  onSelectPatient?: (patientId: number) => void;
}

export const AlertsPage: React.FC<AlertsPageProps> = ({ onSelectPatient }) => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showResolved, setShowResolved] = useState<boolean>(false);

  const loadAlerts = async () => {
    try {
      const data = await fetchAlerts(
        selectedCategory || undefined,
        undefined,
        showResolved
      );
      setAlerts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();

    // Listen for live alert events via WebSocket
    const handleNewAlert = () => loadAlerts();
    realtimeSocket.on("alert_created", handleNewAlert);
    realtimeSocket.on("alert_resolved", handleNewAlert);

    return () => {
      realtimeSocket.off("alert_created", handleNewAlert);
      realtimeSocket.off("alert_resolved", handleNewAlert);
    };
  }, [selectedCategory, showResolved]);

  const handleAcknowledge = async (id: number) => {
    try {
      await acknowledgeAlertApi(id);
      loadAlerts();
    } catch (e) {
      console.error(e);
    }
  };

  const handleResolve = async (id: number) => {
    try {
      await resolveAlert(id);
      loadAlerts();
    } catch (e) {
      console.error(e);
    }
  };

  const getAlertIcon = (category: string) => {
    switch (category) {
      case 'critical_clinical':
        return <Activity className="w-5 h-5 text-[#B91C1C]" />;
      case 'high_clinical':
        return <AlertTriangle className="w-5 h-5 text-[#B45309]" />;
      case 'predictive':
        return <BrainCircuit className="w-5 h-5 text-[#6D5CE7]" />;
      case 'db_performance':
        return <Database className="w-5 h-5 text-[#0E7490]" />;
      default:
        return <Bell className="w-5 h-5 text-[#163A5F]" />;
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'critical':
        return <span className="px-2.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold bg-[#FEF2F2] text-[#B91C1C] border border-[#B91C1C]/40">CRITICAL</span>;
      case 'high':
        return <span className="px-2.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold bg-[#FFFBEB] text-[#B45309] border border-[#B45309]/40">HIGH</span>;
      case 'medium':
        return <span className="px-2.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold bg-[#EFF6FF] text-[#1F4E79] border border-[#E2E8F0]">MEDIUM</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold bg-[#F5F7FA] text-[#64748B] border border-[#E2E8F0]">INFO</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#163A5F] tracking-tight flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#B91C1C]" />
              Clinical & System Alerts Center
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#FEF2F2] text-[#B91C1C] border border-[#B91C1C]/20 text-xs font-bold font-mono">
              {alerts.length} {showResolved ? 'Historical' : 'Active'} Alerts
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Real-time notifications for critical telemetry abnormalities, high-risk ML predictions, and database query bottlenecks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowResolved(!showResolved)}
            className={`px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              showResolved ? 'bg-[#163A5F] text-white border-[#163A5F]' : 'bg-[#F5F7FA] text-[#0F172A] border-[#E2E8F0]'
            }`}
          >
            {showResolved ? 'Showing Resolved History' : 'Show Resolved History'}
          </button>
          <button
            onClick={loadAlerts}
            className="p-2 rounded-xl bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] text-[#0F172A] transition-all shadow-xs"
            title="Refresh Alerts"
          >
            <RefreshCw className="w-4 h-4 text-[#0E7490]" />
          </button>
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold">
        {[
          { id: '', label: 'All Categories' },
          { id: 'critical_clinical', label: 'Critical Clinical' },
          { id: 'high_clinical', label: 'High Priority' },
          { id: 'predictive', label: 'Predictive ML Risk' },
          { id: 'db_performance', label: 'Database Telemetry' },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              selectedCategory === cat.id
                ? 'bg-[#163A5F] text-white shadow-xs'
                : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {loading ? (
          <div className="clinical-card p-12 text-center text-[#64748B]">Loading alert telemetry...</div>
        ) : alerts.length === 0 ? (
          <div className="clinical-card p-12 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-[#15803D] mx-auto" />
            <div className="text-base font-bold text-[#163A5F]">All Active Alerts Resolved</div>
            <p className="text-xs text-[#64748B]">No unacknowledged alerts present in the clinical and system telemetry streams.</p>
          </div>
        ) : (
          alerts.map((alt) => (
            <div
              key={alt.id}
              className={`clinical-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                alt.severity === 'critical' ? 'border-[#B91C1C]/40 bg-[#FEF2F2]/30' :
                alt.severity === 'high' ? 'border-[#B45309]/40 bg-[#FFFBEB]/30' :
                'border-[#E2E8F0] bg-white'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-white border border-[#E2E8F0] shadow-xs shrink-0">
                  {getAlertIcon(alt.category || alt.alert_type)}
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-sm font-bold text-[#0F172A]">{alt.message}</span>
                    {getSeverityBadge(alt.severity)}
                    {alt.is_acknowledged && !alt.is_resolved && (
                      <span className="px-2 py-0.2 rounded text-[9px] font-bold bg-[#EFF6FF] text-[#1F4E79] border border-[#E2E8F0]">
                        ACKNOWLEDGED
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#64748B] font-mono flex items-center gap-3">
                    <span>Logged: {new Date(alt.created_at).toLocaleString()}</span>
                    <span>•</span>
                    <span>Category: {alt.category || alt.alert_type}</span>
                    {alt.patient_id && (
                      <>
                        <span>•</span>
                        <span className="font-bold text-[#0E7490]">Patient ID: #{alt.patient_id}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                {!alt.is_acknowledged && !alt.is_resolved && (
                  <button
                    onClick={() => handleAcknowledge(alt.id)}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#F5F7FA] border border-[#E2E8F0] text-xs font-semibold text-[#0F172A] flex items-center gap-1.5 transition-all shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5 text-[#0E7490]" />
                    Acknowledge
                  </button>
                )}

                {!alt.is_resolved && (
                  <button
                    onClick={() => handleResolve(alt.id)}
                    className="px-3.5 py-1.5 rounded-xl bg-[#163A5F] hover:bg-[#0F2F4D] text-xs font-semibold text-white flex items-center gap-1.5 transition-all shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#06B6D4]" />
                    Resolve Alert
                  </button>
                )}

                {alt.is_resolved && (
                  <span className="px-3 py-1 rounded-lg bg-[#F0FDF4] text-[#15803D] border border-[#15803D]/30 text-xs font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
