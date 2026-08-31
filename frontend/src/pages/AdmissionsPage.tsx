import React, { useState, useEffect } from 'react';
import { fetchAdmissions, createAdmissionApi, dischargePatientApi, fetchPatientsList } from '../services/api';
import { Admission, Ward, Patient } from '../types';
import {
  BedDouble, UserCheck, Plus, CheckCircle2,
  Clock, ArrowRight, X, Search, Filter
} from 'lucide-react';
import { realtimeSocket } from '../services/socket';

export const AdmissionsPage: React.FC = () => {
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWard, setSelectedWard] = useState<string>('');
  const [showAdmitModal, setShowAdmitModal] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);

  // Admit Form
  const [patientId, setPatientId] = useState<string>('1');
  const [wardName, setWardName] = useState<string>('Cardiac Intensive Care (CICU)');
  const [bedNumber, setBedNumber] = useState<string>('ICU-104');
  const [diagnosis, setDiagnosis] = useState<string>('Acute Myocardial Infarction');

  const loadData = async () => {
    try {
      const res = await fetchAdmissions(selectedWard || undefined);
      setAdmissions(res.admissions || []);
      setWards(res.wards || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen for live admission and discharge events
    const handleAdmEvent = () => loadData();
    realtimeSocket.on('admission_created', handleAdmEvent);
    realtimeSocket.on('discharge_created', handleAdmEvent);

    return () => {
      realtimeSocket.off('admission_created', handleAdmEvent);
      realtimeSocket.off('discharge_created', handleAdmEvent);
    };
  }, [selectedWard]);

  const handleOpenAdmitModal = async () => {
    try {
      const res = await fetchPatientsList('', '', '', 0, 50);
      setPatients(res.items);
      if (res.items.length > 0) setPatientId(String(res.items[0].id));
      setShowAdmitModal(true);
    } catch (e) {}
  };

  const handleAdmitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAdmissionApi({
        patient_id: Number(patientId),
        ward: wardName,
        bed_number: bedNumber,
        primary_diagnosis: diagnosis,
        attending_doctor_name: "Dr. Marcus Vance, MD"
      });
      setShowAdmitModal(false);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDischarge = async (admId: number) => {
    try {
      await dischargePatientApi(admId);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#163A5F] tracking-tight">Admissions & Bed Management</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#0E7490] border border-[#0E7490]/20 text-xs font-bold font-mono">
              {admissions.length} Inpatients
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Manage hospital ward occupancy, allocate clinical beds, track length of stay, and process inpatient discharges.
          </p>
        </div>

        <button
          onClick={handleOpenAdmitModal}
          className="px-4 py-2 rounded-xl bg-[#163A5F] hover:bg-[#0F2F4D] text-white font-semibold text-xs flex items-center gap-2 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4 text-[#06B6D4]" />
          Admit Patient
        </button>
      </div>

      {/* Ward Cards Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {wards.map((w) => (
          <div
            key={w.id}
            onClick={() => setSelectedWard(selectedWard === w.name ? '' : w.name)}
            className={`clinical-card p-4 space-y-1.5 cursor-pointer transition-all ${
              selectedWard === w.name ? 'border-[#163A5F] ring-2 ring-[#163A5F]/20' : ''
            }`}
          >
            <div className="text-xs font-bold text-[#163A5F] truncate">{w.name}</div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-extrabold text-[#0F172A]">{w.occupied_beds}</span>
              <span className="text-[10px] text-[#64748B] font-mono">/ {w.total_beds} beds</span>
            </div>
            <div className="w-full bg-[#E2E8F0] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#0E7490] h-full"
                style={{ width: `${Math.min(100, (w.occupied_beds / w.total_beds) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Active Admissions Table */}
      <div className="clinical-card overflow-hidden">
        <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#163A5F]">Current Inpatient Census</h2>
          {selectedWard && (
            <button onClick={() => setSelectedWard('')} className="text-xs text-[#0E7490] hover:underline font-semibold">
              Clear Filter ({selectedWard})
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#163A5F] text-white uppercase font-mono">
              <tr>
                <th className="px-4 py-3">Patient ID</th>
                <th className="px-4 py-3">Ward & Bed</th>
                <th className="px-4 py-3">Primary Diagnosis</th>
                <th className="px-4 py-3">Attending Doctor</th>
                <th className="px-4 py-3">Admitted At</th>
                <th className="px-4 py-3">Length of Stay</th>
                <th className="px-4 py-3 text-right">Discharge Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center text-[#64748B]">Loading admission census...</td></tr>
              ) : admissions.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-[#64748B]">No active admissions in selected ward.</td></tr>
              ) : (
                admissions.map((adm, i) => (
                  <tr key={adm.id} className={`hover:bg-[#F5F7FA] ${i % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]'}`}>
                    <td className="px-4 py-3 font-mono font-bold text-[#0E7490]">PAT-#{adm.patient_id}</td>
                    <td className="px-4 py-3 font-semibold text-[#0F172A]">
                      {adm.ward} <span className="font-mono text-[#64748B]">({adm.bed_number})</span>
                    </td>
                    <td className="px-4 py-3 text-[#0F172A]">{adm.primary_diagnosis || 'Clinical evaluation'}</td>
                    <td className="px-4 py-3 text-[#64748B]">{adm.attending_doctor_name || 'Dr. Marcus Vance, MD'}</td>
                    <td className="px-4 py-3 font-mono text-[#64748B]">{new Date(adm.admission_date).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded bg-[#EFF6FF] text-[#1F4E79] font-mono font-bold">
                        {adm.length_of_stay_days || 1} days
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDischarge(adm.id)}
                        className="px-3 py-1 rounded-lg bg-[#FEF2F2] hover:bg-[#B91C1C] hover:text-white text-[#B91C1C] border border-[#B91C1C]/30 font-semibold text-[11px] transition-all"
                      >
                        Process Discharge
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admit Patient Modal */}
      {showAdmitModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] w-full max-w-md space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
              <h3 className="text-base font-bold text-[#163A5F]">Admit Patient to Clinical Bed</h3>
              <button onClick={() => setShowAdmitModal(false)} className="text-[#64748B] hover:text-[#0F172A]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAdmitSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#0F172A] font-semibold mb-1">Select Patient</label>
                <select
                  value={patientId}
                  onChange={e => setPatientId(e.target.value)}
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
                  <label className="block text-[#0F172A] font-semibold mb-1">Target Ward</label>
                  <select
                    value={wardName}
                    onChange={e => setWardName(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#F5F7FA] border border-[#E2E8F0] focus:border-[#0E7490] text-[#0F172A] outline-none"
                  >
                    <option>Cardiac Intensive Care (CICU)</option>
                    <option>Cardiology Telemetry Ward</option>
                    <option>Main ICU Unit</option>
                    <option>Neuro-Stepdown Unit</option>
                    <option>Emergency Observation</option>
                    <option>Post-Op Surgical Recovery</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#0F172A] font-semibold mb-1">Bed Number</label>
                  <input
                    type="text"
                    required
                    value={bedNumber}
                    onChange={e => setBedNumber(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#F5F7FA] border border-[#E2E8F0] focus:border-[#0E7490] text-[#0F172A] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#0F172A] font-semibold mb-1">Primary Admission Diagnosis</label>
                <input
                  type="text"
                  required
                  value={diagnosis}
                  onChange={e => setDiagnosis(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#F5F7FA] border border-[#E2E8F0] focus:border-[#0E7490] text-[#0F172A] outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowAdmitModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#F5F7FA] border border-[#E2E8F0] text-[#64748B] hover:bg-[#E2E8F0]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#163A5F] hover:bg-[#0F2F4D] text-white font-semibold"
                >
                  Confirm Admission
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
