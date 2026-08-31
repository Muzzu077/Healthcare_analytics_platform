import re
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from app.services.query_engine import process_and_execute_sql, validate_safe_readonly_sql

SCHEMA_CONTEXT = """
PostgreSQL Relational Tables & Schema:
- patients (id, patient_code, name, age, gender, blood_type, contact_number, status, created_at)
- admissions (id, patient_id, ward, bed_number, status ['admitted', 'discharged', 'transferred'], primary_diagnosis, length_of_stay_days, admission_date, discharge_date)
- vitals (id, patient_id, heart_rate, systolic_bp, diastolic_bp, temp_celsius, oxygen_saturation, respiratory_rate, blood_glucose_mgdl, is_abnormal, recorded_at)
- lab_results (id, patient_id, test_name, category ['Cardiac', 'Renal', 'Hematology', 'Endocrine', 'Immunology'], result_value, reference_range, unit, status ['normal', 'abnormal', 'critical'], recorded_at)
- diagnoses (id, patient_id, icd10_code, description, severity, diagnosed_at)
- prescriptions (id, patient_id, medication_name, dosage, frequency, status ['active', 'completed', 'discontinued'], start_date)
- wards (id, name, ward_type, total_beds, occupied_beds, floor)
- doctors (id, name, specialization, department, contact_number, license_number)
- alerts (id, patient_id, alert_type, severity ['critical', 'high', 'moderate', 'low'], message, is_resolved, created_at)
"""

class AIHealthcareQueryEngine:
    """
    Intelligent Schema-Aware Natural Language to SQL AI Engine for Healthcare Records.
    Translates free-form clinical and operational prompts into safe, optimized PostgreSQL queries.
    """

    def translate_prompt_to_sql(self, prompt: str) -> Dict[str, Any]:
        """
        Translates a natural language question into a safe PostgreSQL read-only query
        with clinical explanation and intent classification.
        """
        clean = prompt.lower().strip()

        # 1. Patients by Age / Demographics
        if "older than" in clean or "age >" in clean or "elderly" in clean or "seniors" in clean or "over age" in clean:
            age_match = re.search(r'(?:older than|age >|over age|age over|aged over|above age)\s*(\d+)', clean)
            target_age = int(age_match.group(1)) if age_match else 65

            if "admit" in clean or "ward" in clean or "diagnosis" in clean:
                sql = f"""SELECT p.patient_code, p.name, p.age, p.gender, p.blood_type, a.ward, a.bed_number, a.primary_diagnosis, a.length_of_stay_days 
FROM patients p 
JOIN admissions a ON p.id = a.patient_id 
WHERE p.age > {target_age} AND a.status = 'admitted' 
ORDER BY p.age DESC 
LIMIT 50;"""
                explanation = f"Searching for currently admitted patients over age {target_age}, joining demographics with inpatient ward assignments and primary diagnoses."
            else:
                sql = f"""SELECT id, patient_code, name, age, gender, blood_type, contact_number, created_at 
FROM patients 
WHERE age > {target_age} 
ORDER BY age DESC 
LIMIT 50;"""
                explanation = f"Locating patient records where age exceeds {target_age} years, sorted by highest age."
            return {"sql": sql, "explanation": explanation}

        # 2. Critical or Abnormal Lab Results
        if "lab" in clean or "troponin" in clean or "creatinine" in clean or "potassium" in clean or "glucose" in clean or "bnp" in clean:
            if "critical" in clean or "urgent" in clean or "emergency" in clean:
                sql = """SELECT p.patient_code, p.name, p.age, l.test_name, l.category, l.result_value, l.unit, l.reference_range, l.status, l.recorded_at 
FROM patients p 
JOIN lab_results l ON p.id = l.patient_id 
WHERE l.status = 'critical' 
ORDER BY l.recorded_at DESC 
LIMIT 50;"""
                explanation = "Querying all critical laboratory diagnostic biomarker findings connected with patient identity and recording timestamps."
            elif "cardiac" in clean or "troponin" in clean or "bnp" in clean:
                sql = """SELECT p.patient_code, p.name, l.test_name, l.result_value, l.unit, l.status, l.recorded_at 
FROM patients p 
JOIN lab_results l ON p.id = l.patient_id 
WHERE l.category = 'Cardiac' OR l.test_name ILIKE '%troponin%' OR l.test_name ILIKE '%bnp%' 
ORDER BY l.recorded_at DESC 
LIMIT 50;"""
                explanation = "Finding cardiac biomarker results (Troponin, BNP) for cardiovascular risk evaluation."
            else:
                sql = """SELECT p.patient_code, p.name, l.test_name, l.category, l.result_value, l.unit, l.status, l.recorded_at 
FROM patients p 
JOIN lab_results l ON p.id = l.patient_id 
WHERE l.status IN ('abnormal', 'critical') 
ORDER BY l.recorded_at DESC 
LIMIT 50;"""
                explanation = "Retrieving abnormal and critical diagnostic lab results across all specimen categories."
            return {"sql": sql, "explanation": explanation}

        # 3. ICU & Bed Monitoring / Oxygen Saturation / Vitals
        if "icu" in clean or "oxygen" in clean or "heart rate" in clean or "hypoxia" in clean or "tachycardia" in clean or "vital" in clean or "bp" in clean or "blood pressure" in clean:
            if "oxygen" in clean or "hypoxia" in clean or "spo2" in clean:
                sql = """SELECT p.patient_code, p.name, p.age, v.oxygen_saturation, v.heart_rate, v.systolic_bp, v.diastolic_bp, v.recorded_at 
FROM patients p 
JOIN vitals v ON p.id = v.patient_id 
WHERE v.oxygen_saturation < 92.0 
ORDER BY v.oxygen_saturation ASC 
LIMIT 50;"""
                explanation = "Identifying hypoxic patients with oxygen saturation (SpO2) below 92% requiring respiratory support."
            elif "heart rate" in clean or "tachycardia" in clean:
                sql = """SELECT p.patient_code, p.name, p.age, v.heart_rate, v.systolic_bp, v.diastolic_bp, v.temp_celsius, v.recorded_at 
FROM patients p 
JOIN vitals v ON p.id = v.patient_id 
WHERE v.heart_rate > 100 
ORDER BY v.heart_rate DESC 
LIMIT 50;"""
                explanation = "Locating patients exhibiting tachycardia (heart rate > 100 bpm)."
            elif "icu" in clean:
                sql = """SELECT p.patient_code, p.name, p.age, a.ward, a.bed_number, a.primary_diagnosis, v.heart_rate, v.oxygen_saturation, v.systolic_bp 
FROM patients p 
JOIN admissions a ON p.id = a.patient_id 
LEFT JOIN vitals v ON p.id = v.patient_id 
WHERE a.ward ILIKE '%ICU%' AND a.status = 'admitted' 
ORDER BY a.admission_date DESC 
LIMIT 50;"""
                explanation = "Querying all active ICU admissions cross-referenced with recent bedside vitals."
            else:
                sql = """SELECT p.patient_code, p.name, v.heart_rate, v.systolic_bp, v.diastolic_bp, v.oxygen_saturation, v.temp_celsius, v.blood_glucose_mgdl, v.recorded_at 
FROM patients p 
JOIN vitals v ON p.id = v.patient_id 
WHERE v.is_abnormal = true 
ORDER BY v.recorded_at DESC 
LIMIT 50;"""
                explanation = "Finding telemetry vitals flagged as clinically abnormal."
            return {"sql": sql, "explanation": explanation}

        # 4. Inpatient Wards & Bed Occupancy
        if "ward" in clean or "bed" in clean or "occupancy" in clean or "census" in clean or "capacity" in clean:
            sql = """SELECT name as ward_name, ward_type, total_beds, occupied_beds, (total_beds - occupied_beds) as available_beds, ROUND((occupied_beds::numeric / NULLIF(total_beds,0) * 100), 1) as occupancy_pct, floor 
FROM wards 
ORDER BY occupancy_pct DESC;"""
            explanation = "Calculating hospital ward occupancy percentages, occupied beds, and current available capacity."
            return {"sql": sql, "explanation": explanation}

        # 5. Diagnoses / Specific Medical Conditions
        if "diagnosis" in clean or "diagnosed" in clean or "condition" in clean or "heart failure" in clean or "diabetes" in clean or "stroke" in clean or "hypertension" in clean:
            condition = "Heart Failure"
            if "diabetes" in clean: condition = "Diabetes"
            elif "stroke" in clean: condition = "Stroke"
            elif "hypertension" in clean: condition = "Hypertension"
            elif "pneumonia" in clean: condition = "Pneumonia"
            elif "myocardial" in clean or "infarction" in clean or "heart attack" in clean: condition = "Myocardial Infarction"

            sql = f"""SELECT p.patient_code, p.name, p.age, p.gender, d.icd10_code, d.description, d.severity, d.diagnosed_at 
FROM patients p 
JOIN diagnoses d ON p.id = d.patient_id 
WHERE d.description ILIKE '%{condition}%' 
ORDER BY d.diagnosed_at DESC 
LIMIT 50;"""
            explanation = f"Locating patient records diagnosed with {condition} (ICD-10 clinical records)."
            return {"sql": sql, "explanation": explanation}

        # 6. Prescriptions & Medications
        if "medication" in clean or "prescription" in clean or "drug" in clean or "taking" in clean or "lisinopril" in clean or "metformin" in clean or "aspirin" in clean:
            med_name = ""
            for m in ["lisinopril", "metformin", "atorvastatin", "metoprolol", "furosemide", "aspirin", "clopidogrel", "albuterol"]:
                if m in clean:
                    med_name = m.capitalize()
                    break

            if med_name:
                sql = f"""SELECT p.patient_code, p.name, p.age, pr.medication_name, pr.dosage, pr.frequency, pr.status, pr.start_date 
FROM patients p 
JOIN prescriptions pr ON p.id = pr.patient_id 
WHERE pr.medication_name ILIKE '%{med_name}%' AND pr.status = 'active' 
ORDER BY pr.start_date DESC 
LIMIT 50;"""
                explanation = f"Retrieving active clinical prescriptions for medication '{med_name}'."
            else:
                sql = """SELECT pr.medication_name, COUNT(*) as total_prescriptions, COUNT(DISTINCT pr.patient_id) as patient_count, pr.dosage, pr.status 
FROM prescriptions pr 
WHERE pr.status = 'active' 
GROUP BY pr.medication_name, pr.dosage, pr.status 
ORDER BY total_prescriptions DESC 
LIMIT 50;"""
                explanation = "Aggregating active medication prescriptions across hospital inpatient and outpatient formulary."
            return {"sql": sql, "explanation": explanation}

        # 7. Unresolved Clinical or Performance Alerts
        if "alert" in clean or "warning" in clean or "alarm" in clean:
            sql = """SELECT a.id, a.alert_type, a.severity, a.message, a.is_resolved, a.created_at, p.patient_code, p.name as patient_name 
FROM alerts a 
LEFT JOIN patients p ON a.patient_id = p.id 
WHERE a.is_resolved = false 
ORDER BY CASE WHEN a.severity = 'critical' THEN 1 WHEN a.severity = 'high' THEN 2 WHEN a.severity = 'moderate' THEN 3 ELSE 4 END, a.created_at DESC 
LIMIT 50;"""
            explanation = "Fetching unresolved hospital alerts prioritized by severity (Critical, High, Moderate, Low)."
            return {"sql": sql, "explanation": explanation}

        # 8. Multi-Table Complex Analytical Join
        if "join" in clean or "complex" in clean or "comprehensive" in clean or "overview" in clean:
            sql = """SELECT p.patient_code, p.name, p.age, p.gender, a.ward, a.bed_number, a.primary_diagnosis, v.heart_rate, v.oxygen_saturation, l.test_name, l.result_value as lab_value, l.status as lab_status 
FROM patients p 
JOIN admissions a ON p.id = a.patient_id 
JOIN vitals v ON p.id = v.patient_id 
JOIN lab_results l ON p.id = l.patient_id 
WHERE a.status = 'admitted' AND (v.is_abnormal = true OR l.status = 'critical') 
ORDER BY a.admission_date DESC 
LIMIT 50;"""
            explanation = "3-Way Relational Join linking patient demographics, inpatient ward admission, live telemetry vitals, and diagnostic lab biomarkers."
            return {"sql": sql, "explanation": explanation}

        # 9. Generic Patient Discovery Fallback
        sql = """SELECT id, patient_code, name, age, gender, blood_type, contact_number, created_at 
FROM patients 
ORDER BY created_at DESC 
LIMIT 50;"""
        explanation = f"General patient database record lookup matching query intent '{prompt}'."
        return {"sql": sql, "explanation": explanation}

    def execute_ai_query(self, prompt: str, db: Session, user_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Translates prompt, validates read-only security via AST, executes query on PostgreSQL,
        and returns both execution plan telemetry and formatted tabular results.
        """
        translation = self.translate_prompt_to_sql(prompt)
        sql = translation["sql"]
        explanation = translation["explanation"]

        exec_res = process_and_execute_sql(sql_query=sql, db_session=db, user_id=user_id)

        return {
            "success": exec_res.get("success", True),
            "prompt": prompt,
            "sql_query": sql,
            "ai_explanation": explanation,
            "execution_time_ms": exec_res.get("execution_time_ms", 0.0),
            "planning_time_ms": exec_res.get("planning_time_ms", 0.0),
            "cost_estimate": exec_res.get("cost_estimate", 0.0),
            "rows_returned": exec_res.get("rows_returned", len(exec_res.get("results", []))),
            "columns": exec_res.get("columns", []),
            "results": exec_res.get("results", []),
            "ast_info": exec_res.get("ast_info", {}),
            "scan_types": exec_res.get("scan_types", []),
            "error": exec_res.get("error")
        }

ai_query_engine = AIHealthcareQueryEngine()
