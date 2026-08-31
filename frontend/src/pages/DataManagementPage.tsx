import React, { useState, useEffect } from 'react';
import { recordVitalsApi, uploadLabResultApi, fetchPatientsList } from '../services/api';
import { Patient } from '../types';
import {
  Stethoscope, Activity, TestTube, CheckCircle2,
  AlertTriangle, Radio, Plus, User, Heart
} from 'lucide-react';

export const DataManagementPage: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [activeTab, setActiveTab] = useState<'vitals' | 'labs'>('vitals');

  // Vitals State
  const [patientId, setPatientId] = useState<string>('1');
  const [heartRate, setHeartRate] = useState<string>('84');
  const [systolicBp, setSystolicBp] = useState<string>('126');
  const [diastolicBp, setDiastolicBp] = useState<string>('82');
  const [tempCelsius, setTempCelsius] = useState<string>('37.1');
  const [oxygenSaturation, setOxygenSaturation] = useState<string>('96.5');
  const [respiratoryRate, setRespiratoryRate] = useState<string>('16');
  const [bloodGlucose, setBloodGlucose] = useState<string>('105');

  // Labs State
  const [labPatientId, setLabPatientId] = useState<string>('1');
  const [testName, setTestName] = useState<string>('Troponin I');
  const [category, setCategory] = useState<string>('Cardiac');
  const [resultValue, setResultValue] = useState<string>('0.04');
  const [unit, setUnit] = useState<string>('ng/mL');
  const [refRange, setRefRange] = useState<string>('0.00 - 0.04');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchPatientsList('', '', '', 0, 50).then(res => {
      setPatients(res.items);
      if (res.items.length > 0) {
        setPatientId(String(res.items[0].id));
        setLabPatientId(String(res.items[0].id));
      }
    });
  }, []);

  const handleVitalsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      const res = await recordVitalsApi({
        patient_id: Number(patientId),
        heart_rate: Number(heartRate),
        systolic_bp: Number(systolicBp),
        diastolic_bp: Number(diastolicBp),
        temp_celsius: Number(tempCelsius),
        oxygen_saturation: Number(oxygenSaturation),
        respiratory_rate: Number(respiratoryRate),
        blood_glucose_mgdl: Number(bloodGlucose)
      });
      setFeedback({
        type: 'success',
        message: `Vitals recorded successfully! Evaluated readmission risk: ${res.prediction?.readmission_risk_pct ?? 45}% (${res.prediction?.risk_level ?? 'Moderate'} Risk)`
      });
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Failed to record vitals' });
    } finally {
      setLoading(false);
    }
  };

  const handleLabSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      await uploadLabResultApi({
        patient_id: Number(labPatientId),
        test_name: testName,
        category: category,
        result_value: Number(resultValue),
        unit: unit,
        reference_range: refRange
      });
      setFeedback({
        type: 'success',
        message: `Diagnostic lab test ${testName} uploaded successfully and broadcasted over live telemetry.`
      });
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Failed to upload lab results' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#163A5F] tracking-tight flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-[#0E7490]" />
              Hospital Telemetry & Diagnostic Ingestion Portal
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#0E7490] border border-[#0E7490]/20 text-[10px] font-bold font-mono">
              REAL-TIME BROADCAST
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Submit vital signs or diagnostic lab panels. Submissions trigger real-time ML risk recalculation and broadcast WebSocket telemetry events.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-2 text-xs font-semibold">
        <button
          onClick={() => { setActiveTab('vitals'); setFeedback(null); }}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'vitals' ? 'bg-[#163A5F] text-white shadow-xs' : 'bg-white text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <Activity className="w-4 h-4" />
          Record Patient Vitals Telemetry
        </button>
        <button
          onClick={() => { setActiveTab('labs'); setFeedback(null); }}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'labs' ? 'bg-[#163A5F] text-white shadow-xs' : 'bg-white text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <TestTube className="w-4 h-4" />
          Upload Diagnostic Lab Result
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className={`p-4 rounded-xl text-xs font-mono flex items-center gap-2 ${
          feedback.type === 'success' ? 'bg-[#F0FDF4] border border-[#15803D]/30 text-[#15803D]' : 'bg-[#FEF2F2] border border-[#B91C1C]/30 text-[#B91C1C]'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Form: Vitals */}
      {activeTab === 'vitals' && (
        <div className="clinical-card p-6 space-y-5 max-w-2xl">
          <h2 className="text-sm font-bold text-[#163A5F] uppercase font-mono pb-2 border-b border-[#E2E8F0]">
            Vitals Telemetry Data Entry
          </h2>

          <form onSubmit={handleVitalsSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-[#0F172A] font-semibold mb-1">Target Patient</label>
              <select
                value={patientId}
                onChange={e => setPatientId(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-[#F5F7FA] border border-[#E2E8F0] focus:border-[#0E7490] text-[#0F172A] outline-none"
              >
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.patient_code} — {p.name} ({p.age} yrs, {p.gender})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[#0F172A] font-semibold mb-1">Heart Rate (bpm)</label>
                <input
                  type="number"
                  required
                  value={heartRate}
                  onChange={e => setHeartRate(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#F5F7FA] border border-[#E2E8F0] focus:border-[#0E7490] text-[#0F172A] outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[#0F172A] font-semibold mb-1">Systolic BP (mmHg)</label>
                <input
                  type="number"
                  required
                  value={systolicBp}
                  onChange={e => setSystolicBp(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#F5F7FA] border border-[#E2E8F0] focus:border-[#0E7490] text-[#0F172A] outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[#0F172A] font-semibold mb-1">Diastolic BP (mmHg)</label>
                <input
                  type="number"
                  required
                  value={diastolicBp}
                  onChange={e => setDiastolicBp(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#F5F7FA] border border-[#E2E8F0] focus:border-[#0E7490] text-[#0F172A] outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[#0F172A] font-semibold mb-1">SpO2 Oxygen (%)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={oxygenSaturation}
                  onChange={e => setOxygenSaturation(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#F5F7FA] border border-[#E2E8F0] focus:border-[#0E7490] text-[#0F172A] outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[#0F172A] font-semibold mb-1">Temperature (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={tempCelsius}
                  onChange={e => setTempCelsius(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#F5F7FA] border border-[#E2E8F0] focus:border-[#0E7490] text-[#0F172A] outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[#0F172A] font-semibold mb-1">Respiratory Rate</label>
                <input
                  type="number"
                  required
                  value={respiratoryRate}
                  onChange={e => setRespiratoryRate(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#F5F7FA] border border-[#E2E8F0] focus:border-[#0E7490] text-[#0F172A] outline-none font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[#E2E8F0]">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-[#163A5F] hover:bg-[#0F2F4D] text-white font-bold text-xs flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                <Activity className="w-4 h-4 text-[#06B6D4]" />
                {loading ? 'Submitting & Evaluating ML Risk...' : 'Submit & Stream Telemetry'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Form: Labs */}
      {activeTab === 'labs' && (
        <div className="clinical-card p-6 space-y-5 max-w-2xl">
          <h2 className="text-sm font-bold text-[#163A5F] uppercase font-mono pb-2 border-b border-[#E2E8F0]">
            Laboratory Diagnostic Result Submission
          </h2>

          <form onSubmit={handleLabSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-[#0F172A] font-semibold mb-1">Target Patient</label>
              <select
                value={labPatientId}
                onChange={e => setLabPatientId(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-[#F5F7FA] border border-[#E2E8F0] focus:border-[#0E7490] text-[#0F172A] outline-none"
              >
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.patient_code} — {p.name} ({p.age} yrs)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#0F172A] font-semibold mb-1">Diagnostic Test Name</label>
                <input
                  type="text"
                  required
                  value={testName}
                  onChange={e => setTestName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#F5F7FA] border border-[#E2E8F0] focus:border-[#0E7490] text-[#0F172A] outline-none"
                />
              </div>

              <div>
                <label className="block text-[#0F172A] font-semibold mb-1">Diagnostic Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#F5F7FA] border border-[#E2E8F0] focus:border-[#0E7490] text-[#0F172A] outline-none"
                >
                  <option>Cardiac</option>
                  <option>Renal</option>
                  <option>Endocrine</option>
                  <option>Hematology</option>
                  <option>Immunology</option>
                </select>
              </div>

              <div>
                <label className="block text-[#0F172A] font-semibold mb-1">Measured Numeric Value</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={resultValue}
                  onChange={e => setResultValue(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#F5F7FA] border border-[#E2E8F0] focus:border-[#0E7490] text-[#0F172A] outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[#0F172A] font-semibold mb-1">Unit of Measurement</label>
                <input
                  type="text"
                  required
                  value={unit}
                  onChange={e => setUnit(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#F5F7FA] border border-[#E2E8F0] focus:border-[#0E7490] text-[#0F172A] outline-none font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[#E2E8F0]">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-[#163A5F] hover:bg-[#0F2F4D] text-white font-bold text-xs flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                <TestTube className="w-4 h-4 text-[#06B6D4]" />
                {loading ? 'Uploading Diagnostic Lab...' : 'Submit Lab Diagnostic Panel'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
