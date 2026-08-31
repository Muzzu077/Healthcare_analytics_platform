import React, { useState, useEffect } from 'react';
import { fetchPatientProfile } from '../services/api';
import {
  User, Activity, Stethoscope, TestTube, AlertTriangle,
  FileText, Calendar, Clock, ArrowLeft, Heart,
  BrainCircuit, CheckCircle2, ShieldAlert, Pill,
  UserCheck, History, BedDouble, AlertCircle
} from 'lucide-react';
import { realtimeSocket } from '../services/socket';

interface Props {
  patientId: number;
  onBack: () => void;
}

export const PatientDetailsPage: React.FC<Props> = ({ patientId, onBack }) => {
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const data = await fetchPatientProfile(patientId);
      setProfile(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen for live vitals or labs for this patient via WebSocket
    const handleVitalUpdate = (data: any) => {
      if (data.patient_id === patientId) {
        loadData();
      }
    };
    const handleLabUpdate = (data: any) => {
      if (data.patient_id === patientId) {
        loadData();
      }
    };

    realtimeSocket.on('vital_recorded', handleVitalUpdate);
    realtimeSocket.on('lab_result_uploaded', handleLabUpdate);

    return () => {
      realtimeSocket.off('vital_recorded', handleVitalUpdate);
      realtimeSocket.off('lab_result_uploaded', handleLabUpdate);
    };
  }, [patientId]);

  if (loading || !profile || !profile.patient) {
    return (
      <div className="p-12 text-center text-[#64748B] flex flex-col items-center justify-center gap-3">
        <Activity className="w-6 h-6 text-[#0E7490] animate-spin" />
        <span className="text-xs font-mono">Retrieving EHR clinical record...</span>
      </div>
    );
  }

  const { patient, admissions, vitals, lab_results, diagnoses, prescriptions, appointments, alerts, predictions, active_prediction } = profile;

  const currentAdm = admissions && admissions.length > 0 ? admissions[0] : null;

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'Critical': return 'bg-[#FEF2F2] text-[#B91C1C] border-[#B91C1C]/40';
      case 'High': return 'bg-[#FFFBEB] text-[#B45309] border-[#B45309]/40';
      case 'Moderate': return 'bg-[#EFF6FF] text-[#1F4E79] border-[#E2E8F0]';
      default: return 'bg-[#F0FDF4] text-[#15803D] border-[#15803D]/40';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="px-3.5 py-1.5 rounded-xl bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] text-xs font-semibold text-[#0F172A] flex items-center gap-2 transition-all shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 text-[#163A5F]" />
          Back to Patient Registry
        </button>

        <span className="px-3 py-1 rounded-full bg-[#163A5F] text-white text-xs font-mono font-bold tracking-wide">
          EHR Code: {patient.patient_code}
        </span>
      </div>

      {/* Patient Header Card */}
      <div className="clinical-card p-6 flex flex-col lg:flex-row justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#163A5F] text-white font-bold text-xl flex items-center justify-center shadow-md shrink-0">
            {patient.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-[#163A5F] tracking-tight">{patient.name}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                patient.status === 'admitted' ? 'bg-[#163A5F] text-white' : 'bg-[#EFF6FF] text-[#1F4E79]'
              }`}>
                {patient.status === 'admitted' ? 'INPATIENT' : patient.status}
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#15803D] animate-live-pulse" title="Telemetry Streaming" />
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-[#64748B] mt-1.5 font-mono">
              <span>Age: <strong className="text-[#0F172A]">{patient.age} yrs</strong></span>
              <span>•</span>
              <span>Gender: <strong className="text-[#0F172A]">{patient.gender}</strong></span>
              <span>•</span>
              <span>Blood Type: <strong className="text-[#163A5F] font-bold">{patient.blood_type}</strong></span>
              <span>•</span>
              <span>Ward: <strong className="text-[#0E7490]">{currentAdm ? `${currentAdm.ward} (${currentAdm.bed_number})` : 'Outpatient'}</strong></span>
            </div>

            <div className="text-xs text-[#64748B] mt-2">
              Primary Contact: {patient.contact_number || '+1-555-0199'} • Emergency: {patient.emergency_contact || '+1-555-0198'} • Address: {patient.address}
            </div>
          </div>
        </div>

        {/* XGBoost 30-Day Readmission Risk Gauge */}
        {active_prediction && (
          <div className="p-4 rounded-xl bg-[#F5F7FA] border border-[#E2E8F0] text-right space-y-1 self-start min-w-[220px]">
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">
              30-Day Readmission Risk
            </span>
            <div className="text-3xl font-extrabold text-[#163A5F]">
              {active_prediction.readmission_risk_pct}%
            </div>
            <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase font-mono border ${getRiskBadge(active_prediction.risk_level)}`}>
              {active_prediction.risk_level} RISK (XGBoost)
            </span>
          </div>
        )}
      </div>

      {/* Profile Section Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-[#E2E8F0] pb-2 overflow-x-auto text-xs font-semibold">
        {[
          { id: 'overview', label: 'Clinical Overview' },
          { id: 'timeline', label: 'Medical Timeline' },
          { id: 'vitals', label: `Live Vitals (${vitals?.length || 0})` },
          { id: 'labs', label: `Diagnostic Labs (${lab_results?.length || 0})` },
          { id: 'diagnoses', label: `Diagnoses (${diagnoses?.length || 0})` },
          { id: 'prescriptions', label: `Formulary & Meds (${prescriptions?.length || 0})` },
          { id: 'prediction', label: 'XGBoost Risk Breakdown' },
          { id: 'alerts', label: `Alerts (${alerts?.length || 0})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-[#163A5F] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="clinical-card p-5 space-y-3">
            <h2 className="text-sm font-bold text-[#163A5F] flex items-center gap-2">
              <BedDouble className="w-4 h-4 text-[#0E7490]" />
              Current Admission
            </h2>
            {currentAdm ? (
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between p-2.5 rounded-lg bg-[#F5F7FA] border border-[#E2E8F0]">
                  <span className="text-[#64748B]">Ward:</span>
                  <strong className="text-[#163A5F]">{currentAdm.ward}</strong>
                </div>
                <div className="flex justify-between p-2.5 rounded-lg bg-[#F5F7FA] border border-[#E2E8F0]">
                  <span className="text-[#64748B]">Bed:</span>
                  <strong className="text-[#0E7490]">{currentAdm.bed_number}</strong>
                </div>
                <div className="flex justify-between p-2.5 rounded-lg bg-[#F5F7FA] border border-[#E2E8F0]">
                  <span className="text-[#64748B]">Primary Diagnosis:</span>
                  <strong className="text-[#0F172A]">{currentAdm.primary_diagnosis}</strong>
                </div>
                <div className="flex justify-between p-2.5 rounded-lg bg-[#F5F7FA] border border-[#E2E8F0]">
                  <span className="text-[#64748B]">Length of Stay:</span>
                  <strong className="text-[#15803D]">{currentAdm.length_of_stay_days} days</strong>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-[#64748B]">No active hospital admission.</div>
            )}
          </div>

          <div className="clinical-card p-5 space-y-3">
            <h2 className="text-sm font-bold text-[#163A5F] flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#06B6D4]" />
              Latest Vitals Telemetry
            </h2>
            {vitals && vitals.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-[#F5F7FA] border border-[#E2E8F0]">
                  <span className="text-[10px] text-[#64748B] block">HEART RATE</span>
                  <strong className="text-base text-[#0F172A]">{vitals[0].heart_rate} bpm</strong>
                </div>
                <div className="p-2.5 rounded-lg bg-[#F5F7FA] border border-[#E2E8F0]">
                  <span className="text-[10px] text-[#64748B] block">BLOOD PRESSURE</span>
                  <strong className="text-base text-[#0E7490]">{vitals[0].systolic_bp}/{vitals[0].diastolic_bp}</strong>
                </div>
                <div className="p-2.5 rounded-lg bg-[#F5F7FA] border border-[#E2E8F0]">
                  <span className="text-[10px] text-[#64748B] block">SpO2 OXYGEN</span>
                  <strong className="text-base text-[#15803D]">{vitals[0].oxygen_saturation}%</strong>
                </div>
                <div className="p-2.5 rounded-lg bg-[#F5F7FA] border border-[#E2E8F0]">
                  <span className="text-[10px] text-[#64748B] block">TEMP (°C)</span>
                  <strong className="text-base text-[#B45309]">{vitals[0].temp_celsius} °C</strong>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-[#64748B]">No recorded vitals.</div>
            )}
          </div>

          <div className="clinical-card p-5 space-y-3">
            <h2 className="text-sm font-bold text-[#163A5F] flex items-center gap-2">
              <Pill className="w-4 h-4 text-[#6D5CE7]" />
              Active Medications
            </h2>
            <div className="space-y-1.5 text-xs">
              {prescriptions?.slice(0, 3).map((p: any) => (
                <div key={p.id} className="p-2.5 rounded-lg bg-[#F5F7FA] border border-[#E2E8F0] flex justify-between items-center">
                  <div>
                    <strong className="text-[#0F172A] block">{p.medication_name}</strong>
                    <span className="text-[10px] text-[#64748B]">{p.dosage} • {p.frequency}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F0FDF4] text-[#15803D] border border-[#15803D]/20">Active</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Clinical Timeline */}
      {activeTab === 'timeline' && (
        <div className="clinical-card p-6 space-y-4">
          <h2 className="text-base font-bold text-[#163A5F] flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#0E7490]" />
            Chronological Patient Medical Timeline (Real-Time Synchronized)
          </h2>
          <div className="space-y-3 font-mono text-xs">
            {vitals?.slice(0, 5).map((v: any) => (
              <div key={`v-${v.id}`} className="p-3.5 rounded-xl bg-[#F5F7FA] border border-[#E2E8F0] flex items-start gap-3.5">
                <div className="p-2 rounded-lg bg-white border border-[#E2E8F0] text-[#06B6D4]">
                  <Heart className="w-4 h-4 text-[#B91C1C]" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <div className="text-sm font-bold text-[#0F172A]">Vitals Telemetry Stream Logged</div>
                  <p className="text-[#64748B]">HR {v.heart_rate} bpm, BP {v.systolic_bp}/{v.diastolic_bp}, SpO2 {v.oxygen_saturation}%, Temp {v.temp_celsius}°C</p>
                  <span className="text-[10px] text-[#0E7490] font-semibold">{new Date(v.recorded_at).toLocaleString()}</span>
                </div>
              </div>
            ))}
            {lab_results?.slice(0, 5).map((l: any) => (
              <div key={`l-${l.id}`} className="p-3.5 rounded-xl bg-[#F5F7FA] border border-[#E2E8F0] flex items-start gap-3.5">
                <div className="p-2 rounded-lg bg-white border border-[#E2E8F0] text-[#0E7490]">
                  <TestTube className="w-4 h-4 text-[#0E7490]" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <div className="text-sm font-bold text-[#0F172A]">Lab Diagnostic Test: {l.test_name}</div>
                  <p className="text-[#64748B]">Result: {l.result_value} {l.unit} (Ref: {l.reference_range}) • Status: {l.status.toUpperCase()}</p>
                  <span className="text-[10px] text-[#0E7490] font-semibold">{new Date(l.recorded_at).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Vitals */}
      {activeTab === 'vitals' && (
        <div className="clinical-card p-5">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#163A5F] text-white uppercase font-mono">
              <tr>
                <th className="p-3">Recorded Timestamp</th>
                <th className="p-3">Heart Rate</th>
                <th className="p-3">Blood Pressure</th>
                <th className="p-3">SpO2 Oxygen</th>
                <th className="p-3">Temperature</th>
                <th className="p-3">Anomaly Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {vitals?.map((v: any) => (
                <tr key={v.id} className="hover:bg-[#F5F7FA]">
                  <td className="p-3 font-mono text-[#64748B]">{new Date(v.recorded_at).toLocaleString()}</td>
                  <td className="p-3 font-bold text-[#0F172A]">{v.heart_rate} bpm</td>
                  <td className="p-3 text-[#0E7490] font-mono">{v.systolic_bp}/{v.diastolic_bp}</td>
                  <td className="p-3 font-bold text-[#15803D]">{v.oxygen_saturation}%</td>
                  <td className="p-3 text-[#B45309]">{v.temp_celsius} °C</td>
                  <td className="p-3">
                    {v.is_abnormal ? (
                      <span className="px-2 py-0.5 rounded bg-[#FEF2F2] text-[#B91C1C] font-bold border border-[#B91C1C]/30 text-[10px]">ABNORMAL</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-[#F0FDF4] text-[#15803D] font-bold text-[10px]">NORMAL</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 4: Labs */}
      {activeTab === 'labs' && (
        <div className="clinical-card p-5">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#163A5F] text-white uppercase font-mono">
              <tr>
                <th className="p-3">Test Name</th>
                <th className="p-3">Category</th>
                <th className="p-3">Measured Value</th>
                <th className="p-3">Reference Range</th>
                <th className="p-3">Diagnostic Status</th>
                <th className="p-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {lab_results?.map((l: any) => (
                <tr key={l.id} className="hover:bg-[#F5F7FA]">
                  <td className="p-3 font-semibold text-[#0F172A]">{l.test_name}</td>
                  <td className="p-3 text-[#64748B]">{l.category}</td>
                  <td className="p-3 font-mono font-bold text-[#0E7490]">{l.result_value} {l.unit}</td>
                  <td className="p-3 font-mono text-[#64748B]">{l.reference_range}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase font-mono ${
                      l.status === 'critical' ? 'bg-[#FEF2F2] text-[#B91C1C] border border-[#B91C1C]/40' :
                      l.status === 'abnormal' ? 'bg-[#FFFBEB] text-[#B45309] border border-[#B45309]/40' :
                      'bg-[#F0FDF4] text-[#15803D]'
                    }`}>
                      {l.status}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-[#64748B]">{new Date(l.recorded_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 7: XGBoost Risk Breakdown */}
      {activeTab === 'prediction' && active_prediction && (
        <div className="clinical-card p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
            <div>
              <h2 className="text-base font-bold text-[#163A5F]">XGBoost 30-Day Hospital Readmission Risk Breakdown</h2>
              <p className="text-xs text-[#64748B]">Feature importance contributions computed from active clinical telemetry</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-[#163A5F]">{active_prediction.readmission_risk_pct}%</div>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border ${getRiskBadge(active_prediction.risk_level)}`}>
                {active_prediction.risk_level} Risk
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Top Associated Risk Factors</h3>
            <div className="space-y-2">
              {active_prediction.feature_contributions?.map((fc: any, idx: number) => (
                <div key={idx} className="p-3 rounded-xl bg-[#F5F7FA] border border-[#E2E8F0] flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#0F172A]">{fc.feature}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
                      <div className="bg-[#6D5CE7] h-full" style={{ width: `${Math.min(100, fc.importance_pct * 3)}%` }} />
                    </div>
                    <span className="text-xs font-mono font-bold text-[#6D5CE7]">{fc.importance_pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#EFF6FF] border border-[#1F4E79]/20 text-xs text-[#1F4E79] space-y-1">
            <strong>Clinical Workflow Decision-Support Suggestion:</strong>
            <p>{active_prediction.clinical_recommendation}</p>
          </div>

          <div className="text-[10px] text-[#64748B] italic">
            * Disclaimer: {active_prediction.disclaimer}
          </div>
        </div>
      )}
    </div>
  );
};
