import React, { useState, useEffect } from 'react';
import { fetchPatientsList, registerPatientApi } from '../services/api';
import { Patient } from '../types';
import {
  Users, UserPlus, Search, ChevronRight,
  Filter, ChevronLeft, ArrowUpDown, X, CheckCircle2
} from 'lucide-react';
import { PatientDetailsPage } from './PatientDetailsPage';
import { realtimeSocket } from '../services/socket';

export const PatientsPage: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [age, setAge] = useState('45');
  const [gender, setGender] = useState('Male');
  const [blood, setBlood] = useState('O+');
  const [phone, setPhone] = useState('+1-555-0188');
  const [emergency, setEmergency] = useState('+1-555-0189');

  const loadPatients = async () => {
    setLoading(true);
    try {
      const skip = (currentPage - 1) * pageSize;
      const res = await fetchPatientsList(search, genderFilter, statusFilter, skip, pageSize);
      setPatients(res.items);
      setTotalCount(res.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();

    const handleNewPatient = () => {
      loadPatients();
    };

    realtimeSocket.on('patient_registered', handleNewPatient);
    return () => {
      realtimeSocket.off('patient_registered', handleNewPatient);
    };
  }, [currentPage, search, statusFilter, genderFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await registerPatientApi({
        name,
        age: Number(age),
        gender,
        blood_type: blood,
        contact_number: phone,
        emergency_contact: emergency,
        address: "742 Evergreen Terrace, Medical District"
      });
      setShowAddModal(false);
      setName('');
      loadPatients();
    } catch (err) {
      console.error(err);
    }
  };

  if (selectedPatientId !== null) {
    return <PatientDetailsPage patientId={selectedPatientId} onBack={() => setSelectedPatientId(null)} />;
  }

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'admitted':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#163A5F] text-white">INPATIENT</span>;
      case 'active':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EFF6FF] text-[#1F4E79] border border-[#E2E8F0]">ACTIVE</span>;
      case 'discharged':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F5F7FA] text-[#64748B] border border-[#E2E8F0]">DISCHARGED</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F5F7FA] text-[#0F172A]">{st}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#163A5F] tracking-tight">Patient Clinical Registry</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#F5F7FA] text-[#64748B] border border-[#E2E8F0] text-xs font-mono font-semibold">
              {totalCount.toLocaleString()} Patients Logged
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Search, filter, and inspect comprehensive clinical EHR profiles, active admissions, and ML readmission risk assessments.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-xl bg-[#163A5F] hover:bg-[#0F2F4D] text-white font-semibold text-xs flex items-center gap-2 transition-all shadow-sm"
        >
          <UserPlus className="w-4 h-4 text-[#06B6D4]" />
          Register Patient
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="clinical-card p-4 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Search by Patient Name or Code (e.g. PAT-10042, Sarah, Johnson)..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#F5F7FA] border border-[#E2E8F0] focus:border-[#0E7490] text-xs text-[#0F172A] outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 rounded-xl bg-[#F5F7FA] border border-[#E2E8F0] text-xs text-[#0F172A] outline-none"
          >
            <option value="">All Statuses</option>
            <option value="admitted">Admitted (Inpatient)</option>
            <option value="active">Active</option>
            <option value="discharged">Discharged</option>
          </select>

          <select
            value={genderFilter}
            onChange={e => { setGenderFilter(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 rounded-xl bg-[#F5F7FA] border border-[#E2E8F0] text-xs text-[#0F172A] outline-none"
          >
            <option value="">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>
      </div>

      {/* Patient Table */}
      <div className="clinical-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#163A5F] text-white uppercase font-mono border-b border-[#E2E8F0]">
              <tr>
                <th className="px-4 py-3">Patient Code</th>
                <th className="px-4 py-3">Patient Name</th>
                <th className="px-4 py-3">Age / Gender</th>
                <th className="px-4 py-3">Blood Group</th>
                <th className="px-4 py-3">Clinical Status</th>
                <th className="px-4 py-3">Registered At</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-[#0F172A] bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[#64748B] font-mono">
                    Loading clinical patient records...
                  </td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[#64748B]">
                    No patient records matched the search criteria.
                  </td>
                </tr>
              ) : (
                patients.map((p, i) => (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedPatientId(p.id)}
                    className={`hover:bg-[#F5F7FA] transition-all cursor-pointer ${
                      i % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]'
                    }`}
                  >
                    <td className="px-4 py-3 font-bold font-mono text-[#0E7490]">{p.patient_code}</td>
                    <td className="px-4 py-3 font-semibold text-[#0F172A]">{p.name}</td>
                    <td className="px-4 py-3 text-[#64748B]">{p.age} yrs ({p.gender})</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded bg-[#EFF6FF] text-[#1F4E79] font-bold border border-[#E2E8F0]">
                        {p.blood_type || 'O+'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(p.status)}</td>
                    <td className="px-4 py-3 text-[#64748B] font-mono">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <button className="px-3 py-1 rounded-lg bg-white hover:bg-[#163A5F] hover:text-white border border-[#E2E8F0] text-[#163A5F] font-semibold text-[11px] inline-flex items-center gap-1 transition-all shadow-2xs">
                        <span>Open Record</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between text-xs text-[#64748B]">
          <div>
            Showing Page <strong className="text-[#0F172A]">{currentPage}</strong> of <strong className="text-[#0F172A]">{totalPages}</strong> ({totalCount} total)
          </div>
          <div className="flex items-center gap-1.5">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="p-1.5 rounded-lg bg-white border border-[#E2E8F0] hover:bg-[#F5F7FA] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="p-1.5 rounded-lg bg-white border border-[#E2E8F0] hover:bg-[#F5F7FA] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Patient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] w-full max-w-md space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
              <h3 className="text-base font-bold text-[#163A5F]">Register New Clinical Patient</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#64748B] hover:text-[#0F172A]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#0F172A] font-semibold mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#F5F7FA] border border-[#E2E8F0] focus:border-[#0E7490] text-[#0F172A] outline-none"
                  placeholder="e.g. Eleanor Vance"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#0F172A] font-semibold mb-1">Age</label>
                  <input
                    type="number"
                    required
                    value={age}
                    onChange={e => setAge(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#F5F7FA] border border-[#E2E8F0] focus:border-[#0E7490] text-[#0F172A] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#0F172A] font-semibold mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={e => setGender(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#F5F7FA] border border-[#E2E8F0] focus:border-[#0E7490] text-[#0F172A] outline-none"
                  >
                    <option>Male</option>
                    <option>Female</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#0F172A] font-semibold mb-1">Blood Type</label>
                  <select
                    value={blood}
                    onChange={e => setBlood(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#F5F7FA] border border-[#E2E8F0] focus:border-[#0E7490] text-[#0F172A] outline-none"
                  >
                    <option>O+</option>
                    <option>O-</option>
                    <option>A+</option>
                    <option>A-</option>
                    <option>B+</option>
                    <option>B-</option>
                    <option>AB+</option>
                    <option>AB-</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#0F172A] font-semibold mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#F5F7FA] border border-[#E2E8F0] focus:border-[#0E7490] text-[#0F172A] outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#F5F7FA] border border-[#E2E8F0] text-[#64748B] hover:bg-[#E2E8F0]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#163A5F] hover:bg-[#0F2F4D] text-white font-semibold"
                >
                  Submit Registration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
