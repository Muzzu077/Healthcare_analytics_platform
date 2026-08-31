from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

from app.database import get_db
from app.models.domain import (
    Patient, Admission, Vital, LabResult, Appointment,
    Prescription, Diagnosis, Doctor, Ward, Bed, Alert,
    AlertCategoryEnum, User
)
from app.routers.auth import get_current_user, require_role
from app.services.event_service import event_manager
from app.services.ml_service import ml_engine
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/api/healthcare", tags=["Healthcare Operations & Clinical Registry"])

# ==============================================================================
# SCHEMAS
# ==============================================================================

class PatientCreate(BaseModel):
    name: str
    age: int
    gender: str
    blood_type: Optional[str] = "O+"
    contact_number: Optional[str] = None
    emergency_contact: Optional[str] = None
    address: Optional[str] = None

class VitalCreate(BaseModel):
    patient_id: int
    admission_id: Optional[int] = None
    heart_rate: int
    systolic_bp: int
    diastolic_bp: int
    temp_celsius: float
    oxygen_saturation: float
    respiratory_rate: int
    blood_glucose_mgdl: Optional[float] = None

class LabResultCreate(BaseModel):
    patient_id: int
    admission_id: Optional[int] = None
    test_name: str
    category: str
    result_value: float
    unit: str
    reference_range: str

class AdmissionCreate(BaseModel):
    patient_id: int
    ward: str
    bed_number: str
    primary_diagnosis: Optional[str] = None
    attending_doctor_name: Optional[str] = None

class AppointmentCreate(BaseModel):
    patient_id: int
    doctor_id: int
    appointment_date: datetime
    reason: Optional[str] = None

# ==============================================================================
# PATIENTS ENDPOINTS
# ==============================================================================

@router.get("/patients")
def get_patients(
    search: Optional[str] = None,
    gender: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Retrieve paginated, filterable clinical patient registry."""
    query = db.query(Patient)

    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(
            (Patient.name.ilike(search_fmt)) | (Patient.patient_code.ilike(search_fmt))
        )
    if gender:
        query = query.filter(Patient.gender == gender)
    if status:
        query = query.filter(Patient.status == status)

    total_count = query.count()
    patients = query.order_by(Patient.created_at.desc()).offset(skip).limit(limit).all()

    return {
        "total": total_count,
        "skip": skip,
        "limit": limit,
        "items": patients
    }

@router.get("/patients/{patient_id}")
def get_patient_profile(patient_id: int, db: Session = Depends(get_db)):
    """Retrieve full 10-section clinical profile for a specific patient."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    admissions = db.query(Admission).filter(Admission.patient_id == patient_id).order_by(Admission.admission_date.desc()).all()
    vitals = db.query(Vital).filter(Vital.patient_id == patient_id).order_by(Vital.recorded_at.desc()).limit(20).all()
    labs = db.query(LabResult).filter(LabResult.patient_id == patient_id).order_by(LabResult.recorded_at.desc()).limit(20).all()
    diagnoses = db.query(Diagnosis).filter(Diagnosis.patient_id == patient_id).order_by(Diagnosis.diagnosed_at.desc()).all()
    prescriptions = db.query(Prescription).filter(Prescription.patient_id == patient_id).order_by(Prescription.start_date.desc()).all()
    appointments = db.query(Appointment).filter(Appointment.patient_id == patient_id).order_by(Appointment.appointment_date.desc()).all()
    alerts = db.query(Alert).filter(Alert.patient_id == patient_id).order_by(Alert.created_at.desc()).all()
    predictions = db.query(ModelPrediction).filter(ModelPrediction.patient_id == patient_id).order_by(ModelPrediction.created_at.desc()).limit(5).all()

    # Generate or retrieve active readmission risk prediction
    active_prediction = ml_engine.predict_patient_risk(db, patient_id)

    return {
        "patient": patient,
        "admissions": admissions,
        "vitals": vitals,
        "lab_results": labs,
        "diagnoses": diagnoses,
        "prescriptions": prescriptions,
        "appointments": appointments,
        "alerts": alerts,
        "predictions": predictions,
        "active_prediction": active_prediction
    }

@router.post("/patients")
async def create_patient(
    patient_in: PatientCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Register a new patient into the clinical registry."""
    code_idx = db.query(Patient).count() + 10001
    patient = Patient(
        patient_code=f"PAT-{code_idx}",
        name=patient_in.name,
        age=patient_in.age,
        gender=patient_in.gender,
        blood_type=patient_in.blood_type,
        contact_number=patient_in.contact_number,
        emergency_contact=patient_in.emergency_contact,
        address=patient_in.address,
        status="active",
        created_at=datetime.utcnow()
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)

    # Log audit event
    log_audit_event(
        db=db,
        action="REGISTER_PATIENT",
        resource_type="Patient",
        resource_id=str(patient.id),
        actor_user_id=current_user.id,
        actor_username=current_user.username,
        actor_role=current_user.role,
        ip_address=request.client.host if request.client else None,
        metadata={"patient_code": patient.patient_code, "name": patient.name}
    )

    # Broadcast real-time WebSocket event
    await event_manager.broadcast_event(
        event_type="patient_registered",
        payload={
            "id": patient.id,
            "patient_code": patient.patient_code,
            "name": patient.name,
            "age": patient.age,
            "gender": patient.gender,
            "blood_type": patient.blood_type,
            "status": patient.status,
            "created_at": patient.created_at.isoformat()
        },
        patient_id=patient.id,
        actor_user_id=current_user.id
    )

    return patient

# ==============================================================================
# TELEMETRY & LIVE VITALS
# ==============================================================================

@router.post("/vitals")
async def record_vitals(
    vital_in: VitalCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Record patient vitals telemetry with immediate WebSocket broadcast & anomaly alert evaluation."""
    is_abnormal = (
        vital_in.heart_rate > 100 or vital_in.heart_rate < 50 or
        vital_in.systolic_bp > 140 or vital_in.systolic_bp < 90 or
        vital_in.temp_celsius > 38.0 or vital_in.oxygen_saturation < 92.0
    )

    vital = Vital(
        patient_id=vital_in.patient_id,
        admission_id=vital_in.admission_id,
        heart_rate=vital_in.heart_rate,
        systolic_bp=vital_in.systolic_bp,
        diastolic_bp=vital_in.diastolic_bp,
        temp_celsius=vital_in.temp_celsius,
        oxygen_saturation=vital_in.oxygen_saturation,
        respiratory_rate=vital_in.respiratory_rate,
        blood_glucose_mgdl=vital_in.blood_glucose_mgdl,
        is_abnormal=is_abnormal,
        recorded_at=datetime.utcnow()
    )
    db.add(vital)
    db.flush()

    # If vitals abnormal, generate clinical alert
    if is_abnormal:
        severity_val = "critical" if vital_in.oxygen_saturation < 90.0 or vital_in.heart_rate > 120 else "high"
        alert = Alert(
            patient_id=vital_in.patient_id,
            alert_type="abnormal_vitals",
            category=AlertCategoryEnum.CRITICAL_CLINICAL.value if severity_val == "critical" else AlertCategoryEnum.HIGH_CLINICAL.value,
            severity=severity_val,
            message=f"Live Vitals Telemetry Alert: HR {vital_in.heart_rate} bpm, BP {vital_in.systolic_bp}/{vital_in.diastolic_bp}, SpO2 {vital_in.oxygen_saturation}%, Temp {vital_in.temp_celsius}°C.",
            created_at=datetime.utcnow()
        )
        db.add(alert)
        db.flush()

        await event_manager.broadcast_event(
            event_type="alert_created",
            payload={
                "id": alert.id,
                "patient_id": vital_in.patient_id,
                "alert_type": alert.alert_type,
                "category": alert.category,
                "severity": alert.severity,
                "message": alert.message,
                "created_at": alert.created_at.isoformat()
            },
            patient_id=vital_in.patient_id,
            actor_user_id=current_user.id,
            severity=severity_val
        )

    db.commit()
    db.refresh(vital)

    # Automatically recompute predictive risk
    updated_prediction = ml_engine.predict_patient_risk(db, vital_in.patient_id)

    # Broadcast vital_recorded event
    await event_manager.broadcast_event(
        event_type="vital_recorded",
        payload={
            "patient_id": vital_in.patient_id,
            "vitals": {
                "heart_rate": vital.heart_rate,
                "systolic_bp": vital.systolic_bp,
                "diastolic_bp": vital.diastolic_bp,
                "temp_celsius": vital.temp_celsius,
                "oxygen_saturation": vital.oxygen_saturation,
                "respiratory_rate": vital.respiratory_rate,
                "blood_glucose_mgdl": vital.blood_glucose_mgdl,
                "is_abnormal": vital.is_abnormal,
                "recorded_at": vital.recorded_at.isoformat()
            },
            "is_abnormal": is_abnormal,
            "updated_prediction": updated_prediction
        },
        patient_id=vital_in.patient_id,
        actor_user_id=current_user.id,
        severity="critical" if is_abnormal and vital_in.oxygen_saturation < 90.0 else "info"
    )

    return {"vital": vital, "prediction": updated_prediction}

# ==============================================================================
# LABORATORY MANAGEMENT
# ==============================================================================

@router.post("/lab-results")
async def upload_lab_result(
    lab_in: LabResultCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload laboratory diagnostic test result with automatic critical alert evaluation."""
    status_val = "normal"
    if "Troponin" in lab_in.test_name and lab_in.result_value > 0.04:
        status_val = "critical"
    elif "BNP" in lab_in.test_name and lab_in.result_value > 100.0:
        status_val = "critical"
    elif "HbA1c" in lab_in.test_name and lab_in.result_value > 7.0:
        status_val = "abnormal"
    elif lab_in.result_value > 100.0:
        status_val = "abnormal"

    lab = LabResult(
        patient_id=lab_in.patient_id,
        admission_id=lab_in.admission_id,
        test_name=lab_in.test_name,
        category=lab_in.category,
        result_value=lab_in.result_value,
        unit=lab_in.unit,
        reference_range=lab_in.reference_range,
        status=status_val,
        ordered_by_doctor_name=current_user.full_name,
        recorded_at=datetime.utcnow()
    )
    db.add(lab)

    if status_val in ["abnormal", "critical"]:
        alert = Alert(
            patient_id=lab_in.patient_id,
            alert_type="critical_lab",
            category=AlertCategoryEnum.CRITICAL_CLINICAL.value if status_val == "critical" else AlertCategoryEnum.HIGH_CLINICAL.value,
            severity=status_val,
            message=f"Lab Diagnostic Alert: {lab_in.test_name} = {lab_in.result_value} {lab_in.unit} ({status_val.upper()}). Reference: {lab_in.reference_range}.",
            created_at=datetime.utcnow()
        )
        db.add(alert)
        db.flush()

        await event_manager.broadcast_event(
            event_type="alert_created",
            payload={
                "id": alert.id,
                "patient_id": lab_in.patient_id,
                "alert_type": alert.alert_type,
                "category": alert.category,
                "severity": alert.severity,
                "message": alert.message,
                "created_at": alert.created_at.isoformat()
            },
            patient_id=lab_in.patient_id,
            actor_user_id=current_user.id,
            severity=status_val
        )

    db.commit()
    db.refresh(lab)

    await event_manager.broadcast_event(
        event_type="lab_result_uploaded",
        payload={
            "id": lab.id,
            "patient_id": lab.patient_id,
            "test_name": lab.test_name,
            "category": lab.category,
            "result_value": lab.result_value,
            "unit": lab.unit,
            "status": lab.status,
            "recorded_at": lab.recorded_at.isoformat()
        },
        patient_id=lab.patient_id,
        actor_user_id=current_user.id
    )

    return lab

# ==============================================================================
# ADMISSIONS & BED MANAGEMENT
# ==============================================================================

@router.get("/admissions")
def get_admissions(
    ward: Optional[str] = None,
    status: Optional[str] = "admitted",
    db: Session = Depends(get_db)
):
    """Retrieve hospital admissions and ward occupancy."""
    query = db.query(Admission)
    if status:
        query = query.filter(Admission.status == status)
    if ward:
        query = query.filter(Admission.ward == ward)

    admissions = query.order_by(Admission.admission_date.desc()).all()
    wards = db.query(Ward).all()

    return {
        "admissions": admissions,
        "wards": wards,
        "total_active": len(admissions)
    }

@router.post("/admissions")
async def create_admission(
    adm_in: AdmissionCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Admit patient to hospital ward and assign clinical bed."""
    patient = db.query(Patient).filter(Patient.id == adm_in.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    patient.status = "admitted"

    admission = Admission(
        patient_id=adm_in.patient_id,
        ward=adm_in.ward,
        bed_number=adm_in.bed_number,
        admission_date=datetime.utcnow(),
        status="admitted",
        primary_diagnosis=adm_in.primary_diagnosis,
        attending_doctor_name=adm_in.attending_doctor_name or current_user.full_name,
        length_of_stay_days=1
    )
    db.add(admission)
    db.commit()
    db.refresh(admission)

    await event_manager.broadcast_event(
        event_type="admission_created",
        payload={
            "id": admission.id,
            "patient_id": admission.patient_id,
            "patient_name": patient.name,
            "ward": admission.ward,
            "bed_number": admission.bed_number,
            "status": admission.status,
            "admission_date": admission.admission_date.isoformat()
        },
        patient_id=patient.id,
        actor_user_id=current_user.id
    )

    return admission

@router.put("/admissions/{admission_id}/discharge")
async def discharge_patient(
    admission_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Discharge patient from admission."""
    adm = db.query(Admission).filter(Admission.id == admission_id).first()
    if not adm:
        raise HTTPException(status_code=404, detail="Admission record not found")

    adm.status = "discharged"
    adm.discharge_date = datetime.utcnow()
    
    # Update patient status
    patient = db.query(Patient).filter(Patient.id == adm.patient_id).first()
    if patient:
        patient.status = "discharged"

    db.commit()

    await event_manager.broadcast_event(
        event_type="discharge_created",
        payload={
            "admission_id": adm.id,
            "patient_id": adm.patient_id,
            "patient_name": patient.name if patient else "Patient",
            "ward": adm.ward,
            "discharge_date": adm.discharge_date.isoformat()
        },
        patient_id=adm.patient_id,
        actor_user_id=current_user.id
    )

    return {"message": "Patient successfully discharged", "admission": adm}

# ==============================================================================
# APPOINTMENTS
# ==============================================================================

@router.get("/appointments")
def get_appointments(
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Retrieve hospital appointment schedule."""
    query = db.query(Appointment)
    if status:
        query = query.filter(Appointment.status == status)

    return query.order_by(Appointment.appointment_date.asc()).limit(100).all()

@router.post("/appointments")
async def create_appointment(
    apt_in: AppointmentCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Schedule a new clinical appointment."""
    appointment = Appointment(
        patient_id=apt_in.patient_id,
        doctor_id=apt_in.doctor_id,
        appointment_date=apt_in.appointment_date,
        status="scheduled",
        reason=apt_in.reason,
        created_at=datetime.utcnow()
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)

    await event_manager.broadcast_event(
        event_type="appointment_created",
        payload={
            "id": appointment.id,
            "patient_id": appointment.patient_id,
            "doctor_id": appointment.doctor_id,
            "appointment_date": appointment.appointment_date.isoformat(),
            "status": appointment.status
        },
        patient_id=appointment.patient_id,
        actor_user_id=current_user.id
    )

    return appointment
