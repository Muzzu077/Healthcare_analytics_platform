export type UserRole = 'admin' | 'doctor' | 'lab_tech' | 'receptionist' | 'analytics_dba' | 'patient';

export interface User {
  id: number;
  username: string;
  full_name: string;
  role: UserRole;
  department?: string;
  email?: string;
  is_active?: boolean;
  access_token?: string;
}

export interface Patient {
  id: number;
  patient_code: string;
  name: string;
  age: number;
  gender: string;
  blood_type: string;
  contact_number?: string;
  emergency_contact?: string;
  address?: string;
  status: 'active' | 'admitted' | 'discharged' | 'outpatient';
  created_at: string;
  updated_at?: string;
}

export interface Ward {
  id: number;
  name: string;
  department_id?: number;
  ward_type: string;
  total_beds: number;
  occupied_beds: number;
  floor?: string;
}

export interface Admission {
  id: number;
  patient_id: number;
  ward_id?: number;
  ward: string;
  bed_number: string;
  admission_date: string;
  discharge_date?: string;
  status: 'admitted' | 'discharged' | 'transferred';
  primary_diagnosis?: string;
  attending_doctor_name?: string;
  length_of_stay_days: number;
}

export interface Appointment {
  id: number;
  patient_id: number;
  doctor_id: number;
  appointment_date: string;
  status: 'scheduled' | 'checked_in' | 'completed' | 'cancelled';
  reason?: string;
  created_at?: string;
}

export interface Vital {
  id: number;
  patient_id: number;
  admission_id?: number;
  heart_rate: number;
  systolic_bp: number;
  diastolic_bp: number;
  temp_celsius: number;
  oxygen_saturation: number;
  respiratory_rate: number;
  blood_glucose_mgdl?: number;
  recorded_at: string;
  is_abnormal: boolean;
}

export interface LabResult {
  id: number;
  patient_id: number;
  admission_id?: number;
  test_name: string;
  category: string;
  result_value: number;
  unit: string;
  reference_range: string;
  status: 'normal' | 'abnormal' | 'critical';
  ordered_by_doctor_name?: string;
  recorded_at: string;
}

export interface Diagnosis {
  id: number;
  patient_id: number;
  admission_id?: number;
  icd10_code: string;
  description: string;
  severity: 'mild' | 'moderate' | 'severe' | 'critical';
  diagnosed_at: string;
}

export interface Prescription {
  id: number;
  patient_id: number;
  doctor_id?: number;
  medication_name: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date?: string;
  status: 'active' | 'completed' | 'discontinued';
}

export interface AlertItem {
  id: number;
  patient_id?: number;
  alert_type: string;
  category: 'critical_clinical' | 'high_clinical' | 'warning' | 'predictive' | 'db_performance' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  is_acknowledged?: boolean;
  is_resolved: boolean;
  resolved_at?: string;
  created_at: string;
}

export interface ExecutionPlanNode {
  "Node Type": string;
  "Relation Name"?: string;
  "Alias"?: string;
  "Index Name"?: string;
  "Startup Cost"?: number;
  "Total Cost"?: number;
  "Plan Rows"?: number;
  "Actual Total Time"?: number;
  "Actual Rows"?: number;
  "Filter"?: string;
  "Index Cond"?: string;
  "Shared Hit Blocks"?: number;
  "Shared Read Blocks"?: number;
  "Plans"?: ExecutionPlanNode[];
}

export interface QueryResult {
  success: boolean;
  error?: string;
  sql_query: string;
  query_fingerprint?: string;
  execution_time_ms: number;
  planning_time_ms: number;
  cost_estimate: number;
  rows_returned: number;
  buffers_hit?: number;
  buffers_read?: number;
  columns: string[];
  results: Record<string, any>[];
  ast_info: {
    tables: string[];
    columns: string[];
    join_types: string[];
    has_where: boolean;
    has_group_by: boolean;
    has_order_by: boolean;
    has_subquery: boolean;
    complexity_score: number;
  };
  scan_types: string[];
  join_types: string[];
  used_indexes: string[];
  execution_plan_tree: ExecutionPlanNode;
  has_bottleneck?: boolean;
  bottleneck_type?: string;
}

export interface AIQueryResult {
  success: boolean;
  prompt: string;
  sql_query: string;
  ai_explanation: string;
  execution_time_ms: number;
  planning_time_ms?: number;
  cost_estimate?: number;
  rows_returned: number;
  columns: string[];
  results: Record<string, any>[];
  ast_info?: any;
  scan_types?: string[];
  error?: string;
}

export interface OptimizationRecommendation {
  id: string;
  category: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  title: string;
  description: string;
  suggested_sql: string;
  target_table?: string;
  target_column?: string;
  impact_estimate: string;
}

export interface OptimizationAnalysis {
  query: string;
  recommendations: OptimizationRecommendation[];
  total_recommendations: number;
}

export interface BenchmarkResult {
  applied_ddls: string[];
  ddl_errors: string[];
  benchmark: {
    before_execution_time_ms: number;
    after_execution_time_ms: number;
    before_cost_estimate: number;
    after_cost_estimate: number;
    before_seq_scans?: number;
    after_seq_scans?: number;
    before_index_scans?: number;
    after_index_scans?: number;
    speedup_ratio: number;
    cost_reduction_percentage: number;
    before_plan: ExecutionPlanNode;
    after_plan: ExecutionPlanNode;
  };
}

export interface BenchmarkHistoryItem {
  id: number;
  query_text: string;
  applied_ddls: string[];
  before_execution_time_ms: number;
  after_execution_time_ms: number;
  speedup_ratio: number;
  before_cost: number;
  after_cost: number;
  cost_reduction_pct: number;
  before_seq_scans: number;
  after_seq_scans: number;
  before_index_scans: number;
  after_index_scans: number;
  created_at: string;
}

export interface FeatureContribution {
  feature: string;
  importance_pct: number;
  impact_level: 'High' | 'Medium' | 'Low';
}

export interface PredictionResult {
  patient_id: number;
  patient_code?: string;
  patient_name: string;
  age: number;
  gender?: string;
  readmission_risk_score: number;
  readmission_risk_pct: number;
  risk_level: 'Low' | 'Moderate' | 'High' | 'Critical';
  confidence_score: number;
  feature_contributions: FeatureContribution[];
  clinical_recommendation: string;
  disclaimer?: string;
}

export interface ModelMetric {
  model_name: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  roc_auc: number;
  confusion_matrix?: number[][];
  is_primary?: boolean;
}

export interface DashboardMetrics {
  total_patients: number;
  total_admissions: number;
  active_admissions: number;
  available_beds: number;
  total_beds: number;
  active_appointments: number;
  abnormal_labs: number;
  active_alerts: number;
  critical_alerts: number;
  high_risk_patients: number;
  avg_query_execution_time_ms: number;
  slow_queries_count: number;
  total_queries_executed: number;
}

export interface QueryHistoryItem {
  id: number;
  sql_query: string;
  query_fingerprint?: string;
  execution_time_ms: number;
  planning_time_ms?: number;
  cost_estimate?: number;
  rows_affected: number;
  buffers_hit?: number;
  buffers_read?: number;
  scan_type?: string;
  join_type?: string;
  used_indexes?: string;
  has_bottleneck?: boolean;
  bottleneck_type?: string;
  timestamp: string;
}

export interface AuditLogItem {
  id: number;
  actor_user_id?: number;
  actor_username?: string;
  actor_role?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  ip_address?: string;
  metadata_json?: Record<string, any>;
  timestamp: string;
}

export interface SystemStatusResponse {
  app_name: string;
  version: string;
  environment: string;
  server_timestamp: string;
  services: {
    database: { name: string; status: string; latency_ms: number; port: string; database: string };
    api_server: { name: string; status: string; docs_url: string };
    websocket_hub: { name: string; status: string; active_connections: number; endpoint: string };
    ml_engine: { name: string; status: string; models_trained: number; is_active: boolean };
    query_optimizer: { name: string; status: string; ast_parser: string };
  };
  overall_status: 'healthy' | 'degraded' | 'offline';
}

export interface WsEvent {
  event_id: string;
  event_type: string;
  timestamp: string;
  patient_id?: number;
  actor_user_id?: number;
  severity: 'info' | 'warning' | 'critical';
  payload: Record<string, any>;
}
