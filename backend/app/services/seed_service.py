import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.routers.auth import hash_password
from app.models.domain import (
    User, UserRoleEnum, Department, Patient, Doctor, Appointment,
    Encounter, Admission, Ward, Bed, Vital, LabResult,
    Diagnosis, Prescription, Medication, Alert, AlertCategoryEnum,
    QueryHistory, ModelPrediction, BenchmarkHistory
)

def seed_initial_database_data(db: Session, scale_factor: int = 1):
    """Seed comprehensive, realistic clinical and query telemetry into PostgreSQL."""
    if db.query(User).count() > 0:
        print("Database already contains data. Ensuring seed integrity.")
        return

    print("Seeding departments and clinical units...")
    departments_data = [
        {"name": "Cardiology & Vascular", "code": "CARD", "floor": "3rd Floor", "head": "Dr. Marcus Vance"},
        {"name": "Neurology & Stroke Unit", "code": "NEUR", "floor": "4th Floor", "head": "Dr. Elena Rostova"},
        {"name": "Emergency & Trauma", "code": "EMRG", "floor": "1st Floor", "head": "Dr. Samantha Reed"},
        {"name": "Intensive Care Unit (ICU)", "code": "ICU", "floor": "2nd Floor", "head": "Dr. Gregory House"},
        {"name": "General Surgery", "code": "SURG", "floor": "5th Floor", "head": "Dr. Robert Chen"},
        {"name": "Pathology & Clinical Laboratory", "code": "PATH", "floor": "Basement 1", "head": "Dr. Alexander Hayes"},
    ]
    dept_objs = {}
    for d in departments_data:
        dept = Department(name=d["name"], code=d["code"], floor=d["floor"], head_doctor_name=d["head"])
        db.add(dept)
        db.flush()
        dept_objs[d["code"]] = dept

    print("Seeding hospital wards and clinical beds...")
    wards_data = [
        {"name": "Cardiac Intensive Care (CICU)", "dept": "CARD", "type": "ICU", "beds": 12, "floor": "3A"},
        {"name": "Cardiology Telemetry Ward", "dept": "CARD", "type": "Cardiology", "beds": 24, "floor": "3B"},
        {"name": "Main ICU Unit", "dept": "ICU", "type": "ICU", "beds": 16, "floor": "2A"},
        {"name": "Neuro-Stepdown Unit", "dept": "NEUR", "type": "Neurology", "beds": 18, "floor": "4A"},
        {"name": "Emergency Observation", "dept": "EMRG", "type": "Emergency", "beds": 20, "floor": "1A"},
        {"name": "Post-Op Surgical Recovery", "dept": "SURG", "type": "Surgical", "beds": 22, "floor": "5A"},
    ]
    ward_objs = []
    for w in wards_data:
        ward = Ward(
            name=w["name"],
            department_id=dept_objs[w["dept"]].id,
            ward_type=w["type"],
            total_beds=w["beds"],
            occupied_beds=random.randint(5, w["beds"] - 2),
            floor=w["floor"]
        )
        db.add(ward)
        db.flush()
        ward_objs.append(ward)

        # Generate beds for this ward
        for b_idx in range(1, w["beds"] + 1):
            bed = Bed(
                bed_number=f"{w['type'][:3]}-{100 + b_idx}",
                ward_id=ward.id,
                is_occupied=b_idx <= ward.occupied_beds
            )
            db.add(bed)

    print("Seeding RBAC users and doctor profiles...")
    users_data = [
        {"username": "admin", "full_name": "Dr. Sarah Connor (Chief Medical Officer)", "role": UserRoleEnum.ADMIN.value, "dept": "Executive Board"},
        {"username": "doctor", "full_name": "Dr. Marcus Vance, MD", "role": UserRoleEnum.DOCTOR.value, "dept": "Cardiology & Vascular"},
        {"username": "doctor2", "full_name": "Dr. Elena Rostova, MD", "role": UserRoleEnum.DOCTOR.value, "dept": "Neurology & Stroke Unit"},
        {"username": "doctor3", "full_name": "Dr. Samantha Reed, MD", "role": UserRoleEnum.DOCTOR.value, "dept": "Emergency & Trauma"},
        {"username": "labtech", "full_name": "Alexander Hayes, MLS", "role": UserRoleEnum.LAB_TECH.value, "dept": "Pathology & Clinical Laboratory"},
        {"username": "receptionist", "full_name": "Clara Oswald", "role": UserRoleEnum.RECEPTIONIST.value, "dept": "Admissions & Operations"},
        {"username": "dba", "full_name": "David Thorne (Database Administrator)", "role": UserRoleEnum.ANALYTICS_DBA.value, "dept": "Healthcare Informatics"},
        {"username": "patient", "full_name": "Robert Chen (Verified Patient)", "role": UserRoleEnum.PATIENT.value, "dept": "General Outpatient"},
    ]

    user_map = {}
    for u in users_data:
        pass_hash = hash_password(f"{u['username']}123")
        user_obj = User(
            username=u["username"],
            email=f"{u['username']}@pulse-hospital.org",
            password_hash=pass_hash,
            full_name=u["full_name"],
            role=u["role"],
            department=u["dept"]
        )
        db.add(user_obj)
        db.flush()
        user_map[u["username"]] = user_obj

    # Create Doctors
    doc1 = Doctor(user_id=user_map["doctor"].id, department_id=dept_objs["CARD"].id, name="Dr. Marcus Vance, MD", specialization="Interventional Cardiology", department="Cardiology", contact_number="+1-555-0101", license_number="MD-98421")
    doc2 = Doctor(user_id=user_map["doctor2"].id, department_id=dept_objs["NEUR"].id, name="Dr. Elena Rostova, MD", specialization="Vascular Neurology", department="Neurology", contact_number="+1-555-0102", license_number="MD-77123")
    doc3 = Doctor(user_id=user_map["doctor3"].id, department_id=dept_objs["EMRG"].id, name="Dr. Samantha Reed, MD", specialization="Emergency Medicine", department="Emergency", contact_number="+1-555-0103", license_number="MD-88319")
    db.add(doc1)
    db.add(doc2)
    db.add(doc3)
    db.flush()
    doctors = [doc1, doc2, doc3]

    print("Seeding hospital medication formulary...")
    med_names = [
        ("Lisinopril", "Antihypertensive", "Tablet", "10 mg"),
        ("Metoprolol Tartrate", "Beta Blocker", "Tablet", "25 mg"),
        ("Atorvastatin", "Statin / Lipid Lowering", "Tablet", "40 mg"),
        ("Metformin", "Antidiabetic", "Tablet", "500 mg"),
        ("Furosemide (Lasix)", "Diuretic", "Tablet", "20 mg"),
        ("Aspirin (Enteric Coated)", "Antiplatelet", "Tablet", "81 mg"),
        ("Clopidogrel (Plavix)", "Antiplatelet", "Tablet", "75 mg"),
        ("Albuterol Sulfate", "Bronchodilator", "Inhaler", "90 mcg"),
        ("Levothyroxine", "Thyroid Hormone", "Tablet", "50 mcg"),
        ("Amoxicillin / Clavulanate", "Antibiotic", "Tablet", "875 mg"),
    ]
    for mname, cat, dform, strength in med_names:
        med = Medication(name=mname, category=cat, dosage_form=dform, unit_strength=strength, stock_quantity=random.randint(100, 1000))
        db.add(med)

    print("Generating 800+ realistic clinical patient profiles...")
    first_names_m = ["James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Thomas", "Charles", "Daniel", "Matthew", "Anthony", "Donald", "Mark"]
    first_names_f = ["Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan", "Jessica", "Sarah", "Karen", "Nancy", "Lisa", "Betty", "Margaret", "Sandra"]
    last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"]
    blood_types = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]

    patient_objs = []
    for i in range(1, 801):
        gender = random.choice(["Male", "Female"])
        fname = random.choice(first_names_m if gender == "Male" else first_names_f)
        lname = random.choice(last_names)
        age = random.randint(18, 90)
        status_val = "admitted" if i <= 120 else ("active" if i <= 600 else "discharged")

        p = Patient(
            patient_code=f"PAT-{10000 + i}",
            name=f"{fname} {lname}",
            age=age,
            gender=gender,
            blood_type=random.choice(blood_types),
            contact_number=f"+1-555-{random.randint(100, 999)}-{random.randint(1000, 9999)}",
            emergency_contact=f"+1-555-{random.randint(100, 999)}-{random.randint(1000, 9999)}",
            address=f"{random.randint(100, 9999)} Healthcare Blvd, Suite {random.randint(1, 80)}",
            status=status_val,
            created_at=datetime.utcnow() - timedelta(days=random.randint(1, 180))
        )
        db.add(p)
        patient_objs.append(p)

    db.flush()

    print("Generating admissions, encounters, and appointments...")
    icd10_diagnoses = [
        ("I21.9", "Acute myocardial infarction, unspecified", "critical"),
        ("I50.9", "Heart failure, unspecified", "critical"),
        ("E11.9", "Type 2 diabetes mellitus without complications", "moderate"),
        ("I10", "Essential (primary) hypertension", "mild"),
        ("J44.9", "Chronic obstructive pulmonary disease, unspecified", "severe"),
        ("N17.9", "Acute kidney failure, unspecified", "critical"),
        ("J18.9", "Pneumonia, unspecified organism", "severe"),
        ("C34.9", "Malignant neoplasm of bronchus and lung", "critical"),
        ("G40.9", "Epilepsy, unspecified", "moderate")
    ]

    for p in patient_objs[:300]:
        doc = random.choice(doctors)
        target_ward = random.choice(ward_objs)
        is_admitted = p.status == "admitted"
        adm_days = random.randint(1, 14)
        adm_date = datetime.utcnow() - timedelta(days=adm_days if is_admitted else random.randint(15, 60))

        adm = Admission(
            patient_id=p.id,
            ward_id=target_ward.id,
            ward=target_ward.name,
            bed_number=f"{target_ward.ward_type[:3]}-{random.randint(101, 120)}",
            admission_date=adm_date,
            discharge_date=None if is_admitted else (adm_date + timedelta(days=adm_days)),
            status="admitted" if is_admitted else "discharged",
            primary_diagnosis=random.choice(icd10_diagnoses)[1],
            attending_doctor_name=doc.name,
            length_of_stay_days=adm_days
        )
        db.add(adm)
        db.flush()

        # Diagnoses
        diag = random.choice(icd10_diagnoses)
        db.add(Diagnosis(
            patient_id=p.id,
            admission_id=adm.id,
            icd10_code=diag[0],
            description=diag[1],
            severity=diag[2],
            diagnosed_at=adm_date
        ))

        # Prescriptions
        med_pick = random.choice(med_names)
        db.add(Prescription(
            patient_id=p.id,
            doctor_id=doc.id,
            admission_id=adm.id,
            medication_name=med_pick[0],
            dosage=med_pick[3],
            frequency="Twice Daily",
            start_date=adm_date,
            status="active" if is_admitted else "completed"
        ))

        # Appointments
        db.add(Appointment(
            patient_id=p.id,
            doctor_id=doc.id,
            appointment_date=datetime.utcnow() + timedelta(days=random.randint(1, 14)),
            status="scheduled",
            reason=f"Clinical follow-up for {diag[1]}"
        ))

    print("Generating 3,000+ vital telemetry records...")
    for p in patient_objs[:400]:
        for v_idx in range(random.randint(3, 8)):
            is_abnormal = random.random() < 0.22
            hr = random.randint(105, 138) if is_abnormal else random.randint(62, 88)
            sys_bp = random.randint(145, 185) if is_abnormal else random.randint(110, 130)
            dia_bp = random.randint(92, 110) if is_abnormal else random.randint(70, 85)
            spo2 = round(random.uniform(86.5, 91.5) if is_abnormal else random.uniform(95.0, 99.5), 1)
            temp = round(random.uniform(38.2, 39.4) if is_abnormal else random.uniform(36.5, 37.3), 1)

            rec_time = datetime.utcnow() - timedelta(hours=random.randint(1, 96))
            db.add(Vital(
                patient_id=p.id,
                heart_rate=hr,
                systolic_bp=sys_bp,
                diastolic_bp=dia_bp,
                temp_celsius=temp,
                oxygen_saturation=spo2,
                respiratory_rate=random.randint(18, 28) if is_abnormal else random.randint(12, 18),
                blood_glucose_mgdl=round(random.uniform(145, 240) if is_abnormal else random.uniform(85, 120), 1),
                is_abnormal=is_abnormal,
                recorded_at=rec_time
            ))

    print("Generating 2,000+ laboratory diagnostic tests...")
    lab_tests = [
        ("Troponin I (High Sensitivity)", "Cardiology", 0.02, 0.85, "ng/mL", "0.00 - 0.04"),
        ("B-Type Natriuretic Peptide (BNP)", "Cardiology", 80.0, 450.0, "pg/mL", "0 - 100"),
        ("Hemoglobin A1c (HbA1c)", "Biochemistry", 5.4, 9.2, "%", "4.0 - 5.6"),
        ("Serum Creatinine", "Biochemistry", 0.9, 3.4, "mg/dL", "0.7 - 1.3"),
        ("White Blood Cell Count (WBC)", "Hematology", 6.5, 18.2, "10^3/uL", "4.5 - 11.0"),
        ("D-Dimer Quantitative", "Hematology", 220.0, 1850.0, "ng/mL", "0 - 500")
    ]
    for p in patient_objs[:350]:
        for _ in range(random.randint(2, 5)):
            lt = random.choice(lab_tests)
            is_ab = random.random() < 0.25
            val = round(random.uniform(lt[3] * 0.8, lt[3] * 1.5) if is_ab else random.uniform(lt[2] * 0.9, lt[2] * 1.1), 2)
            st = "critical" if (is_ab and val > lt[3] * 1.2) else ("abnormal" if is_ab else "normal")

            db.add(LabResult(
                patient_id=p.id,
                test_name=lt[0],
                category=lt[1],
                result_value=val,
                unit=lt[4],
                reference_range=lt[5],
                status=st,
                ordered_by_doctor_name="Dr. Marcus Vance, MD",
                recorded_at=datetime.utcnow() - timedelta(hours=random.randint(2, 72))
            ))

    print("Generating clinical and query performance alerts...")
    sample_alerts = [
        (AlertCategoryEnum.CRITICAL_CLINICAL.value, "critical", "Critical SpO2 Desaturation: Patient oxygen saturation dropped to 88.5% in Cardiac ICU."),
        (AlertCategoryEnum.HIGH_CLINICAL.value, "high", "High Troponin I Elevation: Troponin measured 0.82 ng/mL (Reference: 0.00 - 0.04 ng/mL)."),
        (AlertCategoryEnum.PREDICTIVE.value, "high", "Predictive ML Alert: Patient readmission probability estimated at 82.4% (Critical Risk)."),
        (AlertCategoryEnum.DB_PERFORMANCE.value, "warning", "Database Telemetry Alert: Sequential scan detected on `vitals` table exceeding 15ms latency."),
        (AlertCategoryEnum.SYSTEM.value, "low", "System Information: Automated model weights recalibrated across 2,500 clinical cases.")
    ]
    for cat, sev, msg in sample_alerts:
        p_sel = random.choice(patient_objs)
        db.add(Alert(
            patient_id=p_sel.id,
            alert_type="clinical_telemetry" if "Clinical" in cat else "db_telemetry",
            category=cat,
            severity=sev,
            message=msg,
            is_acknowledged=False,
            is_resolved=False,
            created_at=datetime.utcnow() - timedelta(minutes=random.randint(5, 120))
        ))

    db.commit()
    print("✓ Initial database seeding completed successfully.")
