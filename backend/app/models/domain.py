from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, JSON,
    Index, UniqueConstraint, CheckConstraint, Enum
)
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base

# ==============================================================================
# ENUMS
# ==============================================================================

class UserRoleEnum(str, enum.Enum):
    ADMIN = "admin"
    DOCTOR = "doctor"
    LAB_TECH = "lab_tech"
    RECEPTIONIST = "receptionist"
    ANALYTICS_DBA = "analytics_dba"
    PATIENT = "patient"

class AlertSeverityEnum(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class AlertCategoryEnum(str, enum.Enum):
    CRITICAL_CLINICAL = "critical_clinical"
    HIGH_CLINICAL = "high_clinical"
    WARNING = "warning"
    PREDICTIVE = "predictive"
    DB_PERFORMANCE = "db_performance"
    SYSTEM = "system"

# ==============================================================================
# RBAC & USER IDENTITY
# ==============================================================================

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    role = Column(String(30), nullable=False, default=UserRoleEnum.DOCTOR.value, index=True)
    department = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    last_login_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    doctor_profile = relationship("Doctor", back_populates="user", uselist=False)
    audit_logs = relationship("AuditLog", back_populates="actor")
    query_history = relationship("QueryHistory", back_populates="user")

class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    code = Column(String(20), unique=True, nullable=False)
    floor = Column(String(20), nullable=True)
    head_doctor_name = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    doctors = relationship("Doctor", back_populates="department_rel")
    wards = relationship("Ward", back_populates="department_rel")

class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(100), nullable=False)
    specialization = Column(String(100), nullable=False)
    department = Column(String(100), nullable=False)
    contact_number = Column(String(30), nullable=True)
    license_number = Column(String(50), unique=True, nullable=True)
    is_available = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="doctor_profile")
    department_rel = relationship("Department", back_populates="doctors")
    appointments = relationship("Appointment", back_populates="doctor")
    encounters = relationship("Encounter", back_populates="doctor")
    prescriptions = relationship("Prescription", back_populates="doctor")

# ==============================================================================
# PATIENT MANAGEMENT & OPERATIONAL DOMAIN
# ==============================================================================

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    patient_code = Column(String(30), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False, index=True)
    age = Column(Integer, nullable=False)
    gender = Column(String(10), nullable=False)
    blood_type = Column(String(5), nullable=True)
    contact_number = Column(String(30), nullable=True)
    emergency_contact = Column(String(30), nullable=True)
    address = Column(Text, nullable=True)
    status = Column(String(20), default="active", index=True) # active, admitted, discharged, outpatient
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    appointments = relationship("Appointment", back_populates="patient", cascade="all, delete-orphan")
    encounters = relationship("Encounter", back_populates="patient", cascade="all, delete-orphan")
    admissions = relationship("Admission", back_populates="patient", cascade="all, delete-orphan")
    vitals = relationship("Vital", back_populates="patient", cascade="all, delete-orphan")
    lab_results = relationship("LabResult", back_populates="patient", cascade="all, delete-orphan")
    diagnoses = relationship("Diagnosis", back_populates="patient", cascade="all, delete-orphan")
    prescriptions = relationship("Prescription", back_populates="patient", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="patient", cascade="all, delete-orphan")
    predictions = relationship("ModelPrediction", back_populates="patient", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_patients_age_status", "age", "status"),
    )

class Ward(Base):
    __tablename__ = "wards"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    ward_type = Column(String(50), nullable=False) # ICU, General, Cardiology, Neurology, Surgical, Pediatric
    total_beds = Column(Integer, default=20)
    occupied_beds = Column(Integer, default=0)
    floor = Column(String(20), nullable=True)

    department_rel = relationship("Department", back_populates="wards")
    beds = relationship("Bed", back_populates="ward_rel")
    admissions = relationship("Admission", back_populates="ward_rel")

class Bed(Base):
    __tablename__ = "beds"

    id = Column(Integer, primary_key=True, index=True)
    bed_number = Column(String(20), nullable=False)
    ward_id = Column(Integer, ForeignKey("wards.id", ondelete="CASCADE"), nullable=False)
    is_occupied = Column(Boolean, default=False)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="SET NULL"), nullable=True)

    ward_rel = relationship("Ward", back_populates="beds")

    __table_args__ = (
        UniqueConstraint("ward_id", "bed_number", name="uq_ward_bed_number"),
    )

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False, index=True)
    appointment_date = Column(DateTime, nullable=False, index=True)
    status = Column(String(20), default="scheduled", index=True) # scheduled, checked_in, completed, cancelled
    reason = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="appointments")
    doctor = relationship("Doctor", back_populates="appointments")

class Encounter(Base):
    __tablename__ = "encounters"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="SET NULL"), nullable=True, index=True)
    encounter_type = Column(String(50), nullable=False) # Inpatient, Outpatient, Emergency, Telemetry
    encounter_date = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    chief_complaint = Column(Text, nullable=True)
    assessment_notes = Column(Text, nullable=True)

    patient = relationship("Patient", back_populates="encounters")
    doctor = relationship("Doctor", back_populates="encounters")

class Admission(Base):
    __tablename__ = "admissions"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    ward_id = Column(Integer, ForeignKey("wards.id", ondelete="SET NULL"), nullable=True)
    ward = Column(String(50), nullable=False, index=True)
    bed_number = Column(String(20), nullable=False)
    admission_date = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    discharge_date = Column(DateTime, nullable=True)
    status = Column(String(20), default="admitted", index=True) # admitted, discharged, transferred
    primary_diagnosis = Column(Text, nullable=True)
    attending_doctor_name = Column(String(100), nullable=True)
    length_of_stay_days = Column(Integer, default=0)
    notes = Column(Text, nullable=True)

    patient = relationship("Patient", back_populates="admissions")
    ward_rel = relationship("Ward", back_populates="admissions")
    vitals = relationship("Vital", back_populates="admission")
    lab_results = relationship("LabResult", back_populates="admission")

    __table_args__ = (
        Index("idx_admissions_patient_status", "patient_id", "status"),
        Index("idx_admissions_ward_status", "ward", "status"),
    )

# ==============================================================================
# CLINICAL TELEMETRY & LAB DATA
# ==============================================================================

class Vital(Base):
    __tablename__ = "vitals"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    admission_id = Column(Integer, ForeignKey("admissions.id", ondelete="SET NULL"), nullable=True, index=True)
    heart_rate = Column(Integer, nullable=False)
    systolic_bp = Column(Integer, nullable=False)
    diastolic_bp = Column(Integer, nullable=False)
    temp_celsius = Column(Float, nullable=False)
    oxygen_saturation = Column(Float, nullable=False)
    respiratory_rate = Column(Integer, nullable=False)
    blood_glucose_mgdl = Column(Float, nullable=True)
    is_abnormal = Column(Boolean, default=False, index=True)
    recorded_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    patient = relationship("Patient", back_populates="vitals")
    admission = relationship("Admission", back_populates="vitals")

    __table_args__ = (
        Index("idx_vitals_patient_recorded", "patient_id", "recorded_at"),
        Index("idx_vitals_abnormal_recorded", "is_abnormal", "recorded_at"),
    )

class LabResult(Base):
    __tablename__ = "lab_results"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    admission_id = Column(Integer, ForeignKey("admissions.id", ondelete="SET NULL"), nullable=True, index=True)
    test_name = Column(String(100), nullable=False, index=True)
    category = Column(String(50), nullable=False, index=True) # Hematology, Biochemistry, Immunology, Microbiology, Cardiology
    result_value = Column(Float, nullable=False)
    unit = Column(String(20), nullable=False)
    reference_range = Column(String(50), nullable=False)
    status = Column(String(20), default="normal", index=True) # normal, abnormal, critical
    ordered_by_doctor_name = Column(String(100), nullable=True)
    recorded_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    patient = relationship("Patient", back_populates="lab_results")
    admission = relationship("Admission", back_populates="lab_results")

    __table_args__ = (
        Index("idx_labs_patient_recorded", "patient_id", "recorded_at"),
        Index("idx_labs_status_category", "status", "category"),
    )

class Diagnosis(Base):
    __tablename__ = "diagnoses"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    admission_id = Column(Integer, ForeignKey("admissions.id", ondelete="SET NULL"), nullable=True)
    icd10_code = Column(String(20), nullable=False, index=True)
    description = Column(Text, nullable=False)
    severity = Column(String(20), default="moderate", index=True) # mild, moderate, severe, critical
    diagnosed_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    patient = relationship("Patient", back_populates="diagnoses")

class Medication(Base):
    __tablename__ = "medications"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    category = Column(String(50), nullable=False)
    dosage_form = Column(String(50), nullable=False)
    unit_strength = Column(String(50), nullable=True)
    stock_quantity = Column(Integer, default=100)

class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="SET NULL"), nullable=True, index=True)
    admission_id = Column(Integer, ForeignKey("admissions.id", ondelete="SET NULL"), nullable=True)
    medication_name = Column(String(100), nullable=False)
    dosage = Column(String(50), nullable=False)
    frequency = Column(String(50), nullable=False)
    start_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    end_date = Column(DateTime, nullable=True)
    status = Column(String(20), default="active", index=True) # active, completed, discontinued

    patient = relationship("Patient", back_populates="prescriptions")
    doctor = relationship("Doctor", back_populates="prescriptions")

# ==============================================================================
# ALERTS & NOTIFICATIONS
# ==============================================================================

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=True, index=True)
    alert_type = Column(String(50), nullable=False, index=True) # abnormal_vitals, critical_lab, high_risk_readmission, slow_query, missing_index
    category = Column(String(30), default=AlertCategoryEnum.WARNING.value, index=True)
    severity = Column(String(20), nullable=False, index=True) # low, medium, high, critical
    message = Column(Text, nullable=False)
    is_acknowledged = Column(Boolean, default=False, index=True)
    acknowledged_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)
    is_resolved = Column(Boolean, default=False, index=True)
    resolved_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    patient = relationship("Patient", back_populates="alerts")

    __table_args__ = (
        Index("idx_alerts_resolved_created", "is_resolved", "created_at"),
    )

# ==============================================================================
# MACHINE LEARNING PREDICTIONS & EXPLAINABILITY
# ==============================================================================

class ModelPrediction(Base):
    __tablename__ = "model_predictions"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    prediction_type = Column(String(50), nullable=False, default="30_day_readmission_risk")
    model_name = Column(String(100), default="XGBoost Readmission Classifier")
    risk_score = Column(Float, nullable=False) # 0.0 to 1.0 probability
    risk_level = Column(String(20), nullable=False, index=True) # Low, Moderate, High, Critical
    confidence_score = Column(Float, nullable=False, default=0.92)
    feature_importance_json = Column(JSON, nullable=True) # Feature contributions
    clinical_recommendation = Column(Text, nullable=True) # Decision-support insight
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    patient = relationship("Patient", back_populates="predictions")

    __table_args__ = (
        Index("idx_predictions_patient_created", "patient_id", "created_at"),
    )

# ==============================================================================
# QUERY PROCESSING, PLAN METRICS & OPTIMIZATION BENCHMARK
# ==============================================================================

class QueryHistory(Base):
    __tablename__ = "query_history"

    id = Column(Integer, primary_key=True, index=True)
    sql_query = Column(Text, nullable=False)
    query_fingerprint = Column(String(64), nullable=True, index=True) # Normalized hash
    execution_time_ms = Column(Float, nullable=False, index=True)
    planning_time_ms = Column(Float, nullable=True)
    cost_estimate = Column(Float, nullable=True)
    rows_affected = Column(Integer, default=0)
    buffers_hit = Column(Integer, default=0)
    buffers_read = Column(Integer, default=0)
    scan_type = Column(String(50), nullable=True)
    join_type = Column(String(50), nullable=True)
    used_indexes = Column(Text, nullable=True)
    plan_tree_json = Column(JSON, nullable=True)
    has_bottleneck = Column(Boolean, default=False, index=True)
    bottleneck_type = Column(String(100), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    user = relationship("User", back_populates="query_history")

    __table_args__ = (
        Index("idx_query_history_time_cost", "execution_time_ms", "cost_estimate"),
    )

class OptimizationRecommendation(Base):
    __tablename__ = "optimization_recommendations"

    id = Column(Integer, primary_key=True, index=True)
    query_fingerprint = Column(String(64), nullable=False, index=True)
    recommendation_type = Column(String(50), nullable=False) # index, query_rewrite, stats_refresh, filter_pushdown
    severity = Column(String(20), nullable=False) # LOW, MEDIUM, HIGH
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    suggested_sql = Column(Text, nullable=False)
    target_table = Column(String(100), nullable=True)
    target_column = Column(String(100), nullable=True)
    is_applied = Column(Boolean, default=False)
    applied_at = Column(DateTime, nullable=True)
    applied_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class BenchmarkHistory(Base):
    __tablename__ = "benchmark_history"

    id = Column(Integer, primary_key=True, index=True)
    query_text = Column(Text, nullable=False)
    applied_ddls = Column(JSON, nullable=False)
    before_execution_time_ms = Column(Float, nullable=False)
    after_execution_time_ms = Column(Float, nullable=False)
    speedup_ratio = Column(Float, nullable=False)
    before_cost = Column(Float, nullable=False)
    after_cost = Column(Float, nullable=False)
    cost_reduction_pct = Column(Float, nullable=False)
    before_seq_scans = Column(Integer, default=1)
    after_seq_scans = Column(Integer, default=0)
    before_index_scans = Column(Integer, default=0)
    after_index_scans = Column(Integer, default=1)
    tested_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

# ==============================================================================
# AUDIT LOGGING & SYSTEM EVENTS
# ==============================================================================

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    actor_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    actor_username = Column(String(100), nullable=True)
    actor_role = Column(String(50), nullable=True)
    action = Column(String(100), nullable=False, index=True) # LOGIN, REGISTER_PATIENT, RECORD_VITAL, APPLY_INDEX, etc.
    resource_type = Column(String(50), nullable=False, index=True) # Patient, Vital, Index, Query, Alert
    resource_id = Column(String(100), nullable=True)
    ip_address = Column(String(50), nullable=True)
    metadata_json = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    actor = relationship("User", back_populates="audit_logs")

    __table_args__ = (
        Index("idx_audit_actor_timestamp", "actor_user_id", "timestamp"),
        Index("idx_audit_action_resource", "action", "resource_type"),
    )

class SystemEvent(Base):
    __tablename__ = "system_events"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String(64), unique=True, nullable=False, index=True) # UUID
    event_type = Column(String(64), nullable=False, index=True)
    patient_id = Column(Integer, nullable=True, index=True)
    actor_user_id = Column(Integer, nullable=True)
    severity = Column(String(20), default="info")
    payload = Column(JSON, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
