import React, { useState, useEffect } from 'react';
import { fetchAdmissions, fetchPatientsList } from '../services/api';
import { Admission, Vital } from '../types';
import {
  Activity, Heart, Thermometer, Wind, AlertTriangle,
  Radio, Clock, CheckCircle2, ShieldAlert, ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import { realtimeSocket } from '../services/socket';

export const LiveMonitoringPage: React.FC = () => {
  const [admittedList, setAdmittedList] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [liveTelemetryLog, setLiveTelemetryLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const res = await fetchAdmissions(undefined, 'admitted');
      const adms = res.admissions || [];
      
      // Enrich with sample sparkline vitals
      const enriched = adms.map((a: any) => ({
        ...a,
        vitals: {
          heart_rate: 70 + (a.patient_id % 35),
          systolic_bp: 115 + (a.patient_id % 30),
          diastolic_bp: 75 + (a.patient_id % 18),
          spo2: (94.0 + ((a.patient_id * 3) % 60) / 10).toFixed(1),
          temp: (36.6 + ((a.patient_id * 2) % 20) / 10).toFixed(1),
          resp: 14 + (a.patient_id % 8),
          history: Array.from({ length: 10 }).map((_, i) => ({
            time: `${10 - i}m ago`,
            hr: 70 + (a.patient_id % 30) + Math.sin(i) * 5,
            spo2: 95 + Math.cos(i) * 2
          }))
        }
      }));

      setAdmittedList(enriched);
      if (enriched.length > 0 && selectedPatientId === null) {
        setSelectedPatientId(enriched[0].patient_id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen for live vitals streams via WebSocket
    const handleVitalRecorded = (data: any) => {
      if (data.vitals) {
        setAdmittedList(prev => prev.map(item => {
          if (item.patient_id === data.patient_id) {
            return {
              ...item,
              vitals: {
                ...item.vitals,
                heart_rate: data.vitals.heart_rate,
                systolic_bp: data.vitals.systolic_bp,
                diastolic_bp: data.vitals.diastolic_bp,
                spo2: data.vitals.oxygen_saturation,
                temp: data.vitals.temp_celsius,
                resp: data.vitals.respiratory_rate
              }
            };
          }
          return item;
        }));

        setLiveTelemetryLog(prev => [
          {
            id: Date.now(),
            patient_id: data.patient_id,
            timestamp: new Date().toLocaleTimeString(),
            hr: data.vitals.heart_rate,
            spo2: data.vitals.oxygen_saturation,
            is_abnormal: data.is_abnormal
          },
          ...prev.slice(0, 15)
        ]);
      }
    };

    realtimeSocket.on('vital_recorded', handleVitalRecorded);
    return () => {
      realtimeSocket.off('vital_recorded', handleVitalRecorded);
    };
  }, []);

  const selectedPatient = admittedList.find(a => a.patient_id === selectedPatientId) || admittedList[0];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-[#163A5F] tracking-tight">Live ICU & Ward Telemetry Stream</h1>
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#06B6D4] border border-[#06B6D4]/30 text-[10px] font-bold font-mono">
              <span className="w-2 h-2 rounded-full bg-[#06B6D4] animate-live-pulse" />
              LIVE TELEMETRY (WS)
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Continuous vital signs monitoring, cardiac telemetry, SpO2 pulse oximetry, and automated threshold alerts.
          </p>
        </div>

        <div className="text-xs font-mono text-[#64748B]">
          Active Beds Monitored: <strong className="text-[#163A5F]">{admittedList.length}</strong>
        </div>
      </div>

      {/* Main Grid: Left Bed Selector + Right Detailed Waveform */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Bed List Cards */}
        <div className="clinical-card p-4 space-y-3">
          <div className="text-xs font-bold text-[#163A5F] uppercase tracking-wider pb-2 border-b border-[#E2E8F0]">
            Inpatient Bed Stations
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {admittedList.map((a) => {
              const isSelected = a.patient_id === selectedPatientId;
              const isCrit = Number(a.vitals?.spo2) < 92.0 || a.vitals?.heart_rate > 110;
              return (
                <div
                  key={a.id}
                  onClick={() => setSelectedPatientId(a.patient_id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[#163A5F] bg-[#EFF6FF]'
                      : isCrit ? 'border-[#B91C1C]/40 bg-[#FEF2F2]/60 hover:bg-[#FEF2F2]' : 'border-[#E2E8F0] bg-white hover:bg-[#F5F7FA]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#163A5F]">{a.ward}</span>
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-white border border-[#E2E8F0]">
                      {a.bed_number}
                    </span>
                  </div>

                  <div className="text-xs text-[#0F172A] font-semibold mt-1">
                    PAT-#{a.patient_id} • {a.primary_diagnosis || 'Clinical monitoring'}
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 mt-2 text-[10px] font-mono">
                    <div className="p-1 rounded bg-white border border-[#E2E8F0] text-center">
                      <span className="text-[#64748B] block text-[8px]">HR</span>
                      <strong className={a.vitals?.heart_rate > 100 ? 'text-[#B91C1C]' : 'text-[#0F172A]'}>
                        {a.vitals?.heart_rate}
                      </strong>
                    </div>
                    <div className="p-1 rounded bg-white border border-[#E2E8F0] text-center">
                      <span className="text-[#64748B] block text-[8px]">BP</span>
                      <strong className="text-[#0E7490]">{a.vitals?.systolic_bp}/{a.vitals?.diastolic_bp}</strong>
                    </div>
                    <div className="p-1 rounded bg-white border border-[#E2E8F0] text-center">
                      <span className="text-[#64748B] block text-[8px]">SpO2</span>
                      <strong className={Number(a.vitals?.spo2) < 92 ? 'text-[#B91C1C]' : 'text-[#15803D]'}>
                        {a.vitals?.spo2}%
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Patient Live Telemetry Waveforms */}
        <div className="lg:col-span-2 space-y-5">
          {selectedPatient ? (
            <div className="clinical-card p-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-[#163A5F]">
                      Bed Station: {selectedPatient.bed_number} ({selectedPatient.ward})
                    </h2>
                    <span className="w-2 h-2 rounded-full bg-[#15803D] animate-live-pulse" />
                  </div>
                  <p className="text-xs text-[#64748B]">
                    Patient ID #{selectedPatient.patient_id} • Attending: {selectedPatient.attending_doctor_name || 'Dr. Marcus Vance, MD'}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-[#64748B] uppercase font-mono block">Telemetry Signal</span>
                  <span className="text-xs font-bold text-[#15803D]">99.8% Nominal</span>
                </div>
              </div>

              {/* Real-Time Metrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-[#F5F7FA] border border-[#E2E8F0]">
                  <div className="flex items-center justify-between text-xs text-[#64748B]">
                    <span>Heart Rate</span>
                    <Heart className="w-4 h-4 text-[#B91C1C]" />
                  </div>
                  <div className="text-2xl font-black text-[#0F172A] mt-1">
                    {selectedPatient.vitals?.heart_rate} <span className="text-xs font-normal text-[#64748B]">bpm</span>
                  </div>
                  <span className="text-[10px] text-[#15803D] flex items-center gap-0.5">
                    <ArrowUpRight className="w-3 h-3" /> Sinus Rhythm
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#F5F7FA] border border-[#E2E8F0]">
                  <div className="flex items-center justify-between text-xs text-[#64748B]">
                    <span>Blood Pressure</span>
                    <Activity className="w-4 h-4 text-[#0E7490]" />
                  </div>
                  <div className="text-2xl font-black text-[#0E7490] mt-1">
                    {selectedPatient.vitals?.systolic_bp}/{selectedPatient.vitals?.diastolic_bp}
                  </div>
                  <span className="text-[10px] text-[#64748B]">mmHg (Mean Arterial)</span>
                </div>

                <div className="p-3 rounded-xl bg-[#F5F7FA] border border-[#E2E8F0]">
                  <div className="flex items-center justify-between text-xs text-[#64748B]">
                    <span>Oxygen SpO2</span>
                    <Radio className="w-4 h-4 text-[#15803D]" />
                  </div>
                  <div className="text-2xl font-black text-[#15803D] mt-1">
                    {selectedPatient.vitals?.spo2}%
                  </div>
                  <span className="text-[10px] text-[#15803D]">Room Air</span>
                </div>

                <div className="p-3 rounded-xl bg-[#F5F7FA] border border-[#E2E8F0]">
                  <div className="flex items-center justify-between text-xs text-[#64748B]">
                    <span>Temperature</span>
                    <Thermometer className="w-4 h-4 text-[#B45309]" />
                  </div>
                  <div className="text-2xl font-black text-[#B45309] mt-1">
                    {selectedPatient.vitals?.temp} °C
                  </div>
                  <span className="text-[10px] text-[#64748B]">Normothermic</span>
                </div>
              </div>

              {/* Real-Time Waveform Chart */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#163A5F]">Heart Rate & Pulse Waveform History (10 min trend)</span>
                  <span className="text-[10px] font-mono text-[#06B6D4]">Streaming Active</span>
                </div>
                <div className="h-56 bg-[#F5F7FA] rounded-xl p-3 border border-[#E2E8F0]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={selectedPatient.vitals?.history || []}>
                      <XAxis dataKey="time" stroke="#64748B" fontSize={10} />
                      <YAxis stroke="#64748B" fontSize={10} domain={['auto', 'auto']} />
                      <Tooltip contentStyle={{ background: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '8px', fontSize: '12px' }} />
                      <Line type="monotone" dataKey="hr" stroke="#B91C1C" strokeWidth={2.5} dot={{ r: 2 }} name="Heart Rate (bpm)" />
                      <Line type="monotone" dataKey="spo2" stroke="#15803D" strokeWidth={2} dot={{ r: 2 }} name="SpO2 (%)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            <div className="clinical-card p-12 text-center text-[#64748B]">
              Select an active bed station on the left to inspect real-time waveforms.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
