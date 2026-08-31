import {
  User, Patient, Admission, Appointment, Vital, LabResult,
  AlertItem, QueryResult, OptimizationAnalysis, BenchmarkResult,
  BenchmarkHistoryItem, PredictionResult, ModelMetric, DashboardMetrics,
  QueryHistoryItem, AuditLogItem, SystemStatusResponse, UserRole
} from '../types';

const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:8088/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

// ==============================================================================
// AUTHENTICATION & IDENTITY
// ==============================================================================

export async function loginApi(username: string, role: string): Promise<User> {
  const formData = new URLSearchParams();
  formData.append('username', username);
  formData.append('password', `${username}123`);

  const res = await fetch(`${API_BASE}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString()
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Authentication failed' }));
    throw new Error(err.detail || 'Login failed');
  }

  const data = await res.json();
  localStorage.setItem('token', data.access_token);
  return {
    id: 1,
    username: data.username,
    full_name: data.full_name,
    role: data.role as UserRole,
    department: data.department,
    access_token: data.access_token
  };
}

export async function getMeApi(): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch user session');
  return res.json();
}

export async function fetchUsersList(): Promise<User[]> {
  const res = await fetch(`${API_BASE}/auth/users`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) return [];
  return res.json();
}

// ==============================================================================
// CLINICAL OPERATIONS & PATIENTS
// ==============================================================================

export async function fetchPatientsList(
  search: string = '',
  gender: string = '',
  status: string = '',
  skip: number = 0,
  limit: number = 50
): Promise<{ total: number; items: Patient[] }> {
  const params = new URLSearchParams({
    skip: String(skip),
    limit: String(limit)
  });
  if (search) params.append('search', search);
  if (gender) params.append('gender', gender);
  if (status) params.append('status', status);

  const res = await fetch(`${API_BASE}/healthcare/patients?${params.toString()}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch patient registry');
  const data = await res.json();
  if (Array.isArray(data)) {
    return { total: data.length, items: data };
  }
  return data;
}

export async function fetchPatientProfile(patientId: number): Promise<any> {
  const res = await fetch(`${API_BASE}/healthcare/patients/${patientId}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error(`Failed to fetch clinical profile for patient ${patientId}`);
  return res.json();
}

export async function registerPatientApi(patientData: Partial<Patient>): Promise<Patient> {
  const res = await fetch(`${API_BASE}/healthcare/patients`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(patientData)
  });
  if (!res.ok) throw new Error('Failed to register patient');
  return res.json();
}

export async function recordVitalsApi(vitalsData: {
  patient_id: number;
  admission_id?: number;
  heart_rate: number;
  systolic_bp: number;
  diastolic_bp: number;
  temp_celsius: number;
  oxygen_saturation: number;
  respiratory_rate: number;
  blood_glucose_mgdl?: number;
}): Promise<{ vital: Vital; prediction: PredictionResult }> {
  const res = await fetch(`${API_BASE}/healthcare/vitals`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(vitalsData)
  });
  if (!res.ok) throw new Error('Failed to record vitals');
  return res.json();
}

export async function uploadLabResultApi(labData: {
  patient_id: number;
  admission_id?: number;
  test_name: string;
  category: string;
  result_value: number;
  unit: string;
  reference_range: string;
}): Promise<LabResult> {
  const res = await fetch(`${API_BASE}/healthcare/lab-results`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(labData)
  });
  if (!res.ok) throw new Error('Failed to upload lab result');
  return res.json();
}

export async function fetchAdmissions(ward?: string, status: string = 'admitted'): Promise<any> {
  const params = new URLSearchParams();
  if (ward) params.append('ward', ward);
  if (status) params.append('status', status);

  const res = await fetch(`${API_BASE}/healthcare/admissions?${params.toString()}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch admissions');
  return res.json();
}

export async function createAdmissionApi(admData: Partial<Admission>): Promise<Admission> {
  const res = await fetch(`${API_BASE}/healthcare/admissions`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(admData)
  });
  if (!res.ok) throw new Error('Failed to create admission');
  return res.json();
}

export async function dischargePatientApi(admissionId: number): Promise<any> {
  const res = await fetch(`${API_BASE}/healthcare/admissions/${admissionId}/discharge`, {
    method: 'PUT',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to discharge patient');
  return res.json();
}

export async function fetchAppointments(status?: string): Promise<Appointment[]> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);

  const res = await fetch(`${API_BASE}/healthcare/appointments?${params.toString()}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) return [];
  return res.json();
}

export async function createAppointmentApi(aptData: any): Promise<Appointment> {
  const res = await fetch(`${API_BASE}/healthcare/appointments`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(aptData)
  });
  if (!res.ok) throw new Error('Failed to create appointment');
  return res.json();
}

// ==============================================================================
// ALERTS CENTER
// ==============================================================================

export async function fetchAlerts(
  category?: string,
  severity?: string,
  resolved: boolean = false
): Promise<AlertItem[]> {
  const params = new URLSearchParams({
    resolved: String(resolved)
  });
  if (category) params.append('category', category);
  if (severity) params.append('severity', severity);

  const res = await fetch(`${API_BASE}/alerts?${params.toString()}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) return [];
  return res.json();
}

export async function acknowledgeAlertApi(alertId: number): Promise<any> {
  const res = await fetch(`${API_BASE}/alerts/${alertId}/acknowledge`, {
    method: 'PUT',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to acknowledge alert');
  return res.json();
}

export async function resolveAlert(alertId: number): Promise<any> {
  const res = await fetch(`${API_BASE}/alerts/${alertId}/resolve`, {
    method: 'PUT',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to resolve alert');
  return res.json();
}

// ==============================================================================
// QUERY WORKSPACE & EXPLAIN ANALYZE
// ==============================================================================

export async function executeSqlApi(sqlQuery: string): Promise<QueryResult> {
  const res = await fetch(`${API_BASE}/query/execute`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ sql_query: sqlQuery })
  });
  return res.json();
}

export async function askAiSearchApi(prompt: string): Promise<any> {
  const res = await fetch(`${API_BASE}/query/ai-search`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ prompt })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'AI query processing failed' }));
    throw new Error(err.detail || 'AI query search failed');
  }
  return res.json();
}

export async function translateTextToSqlApi(prompt: string): Promise<{ sql: string; explanation: string }> {
  const res = await fetch(`${API_BASE}/query/text-to-sql`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ prompt })
  });
  if (!res.ok) throw new Error('Failed to translate prompt to SQL');
  return res.json();
}

export async function fetchQueryPresets(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/query/presets`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchSchemaExplorer(): Promise<Record<string, Array<{ column_name: string; data_type: string; is_nullable: boolean }>>> {
  const res = await fetch(`${API_BASE}/query/schema`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) return {};
  return res.json();
}

export async function fetchQueryHistory(): Promise<QueryHistoryItem[]> {
  const res = await fetch(`${API_BASE}/query/history`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchQueryPerformanceStats(): Promise<any> {
  const res = await fetch(`${API_BASE}/query/performance-stats`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) return {};
  return res.json();
}

// ==============================================================================
// ADAPTIVE OPTIMIZER & BENCHMARKING
// ==============================================================================

export async function analyzeQueryApi(sqlQuery: string): Promise<OptimizationAnalysis> {
  const res = await fetch(`${API_BASE}/optimizer/recommend`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ sql_query: sqlQuery })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to analyze query plan' }));
    throw new Error(err.detail || 'Optimization recommendation failed');
  }
  return res.json();
}

export async function applyIndexApi(ddlStatement: string): Promise<any> {
  const res = await fetch(`${API_BASE}/optimizer/apply-index`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ ddl_statement: ddlStatement })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to apply index' }));
    throw new Error(err.detail || 'Apply index failed');
  }
  return res.json();
}

export async function runBenchmarkApi(sqlQuery: string, ddlStatements: string[]): Promise<BenchmarkResult> {
  const res = await fetch(`${API_BASE}/optimizer/benchmark`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      sql_query: sqlQuery,
      ddl_statements: ddlStatements
    })
  });
  if (!res.ok) throw new Error('Benchmark execution failed');
  return res.json();
}

export async function fetchBenchmarkHistory(): Promise<BenchmarkHistoryItem[]> {
  const res = await fetch(`${API_BASE}/optimizer/benchmarks`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) return [];
  return res.json();
}

// ==============================================================================
// PREDICTIVE ANALYTICS & MACHINE LEARNING
// ==============================================================================

export async function fetchModelComparison(): Promise<ModelMetric[]> {
  const res = await fetch(`${API_BASE}/analytics/model-comparison`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchPatientPrediction(patientId: number): Promise<PredictionResult> {
  const res = await fetch(`${API_BASE}/analytics/predict/${patientId}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Prediction service error');
  return res.json();
}

export async function fetchHighRiskPatients(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/analytics/high-risk-patients`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchRiskDistribution(): Promise<any> {
  const res = await fetch(`${API_BASE}/analytics/risk-distribution`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) return { critical: 0, high: 0, moderate: 0, low: 0 };
  return res.json();
}

// ==============================================================================
// COMMAND CENTER DASHBOARD & AUDIT LOGS
// ==============================================================================

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const res = await fetch(`${API_BASE}/dashboard/metrics`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to load dashboard metrics');
  return res.json();
}

export async function fetchDashboardCharts(): Promise<any> {
  const res = await fetch(`${API_BASE}/dashboard/charts`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) return {};
  return res.json();
}

export async function fetchAuditLogs(
  action?: string,
  resourceType?: string,
  actor?: string,
  skip: number = 0,
  limit: number = 50
): Promise<{ total: number; items: AuditLogItem[] }> {
  const params = new URLSearchParams({
    skip: String(skip),
    limit: String(limit)
  });
  if (action) params.append('action', action);
  if (resourceType) params.append('resource_type', resourceType);
  if (actor) params.append('actor_username', actor);

  const res = await fetch(`${API_BASE}/audit?${params.toString()}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) return { total: 0, items: [] };
  return res.json();
}

export async function fetchSystemStatus(): Promise<SystemStatusResponse> {
  const res = await fetch(`${API_BASE}/system/status`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to load system diagnostics');
  return res.json();
}
