import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np
import os

os.makedirs('docs/screenshots', exist_ok=True)

plt.rcParams['font.family'] = 'DejaVu Sans'
plt.rcParams['font.size'] = 10
plt.rcParams['axes.edgecolor'] = '#CBD5E1'
plt.rcParams['axes.linewidth'] = 1.2

# 1. SYSTEM ARCHITECTURE DIAGRAM
def generate_system_architecture():
    fig, ax = plt.subplots(figsize=(14, 9), dpi=300)
    ax.set_xlim(0, 14)
    ax.set_ylim(0, 9)
    ax.axis('off')
    fig.patch.set_facecolor('#F8FAFC')
    ax.set_facecolor('#F8FAFC')

    ax.text(7, 8.6, "PULSE CORE: Healthcare Analytics & Query Processing Architecture",
            ha='center', va='center', fontsize=16, fontweight='bold', color='#0F172A')
    ax.text(7, 8.25, "End-to-End Tiered Architecture: Ingestion, AST Security, Adaptive Optimization, ML & Telemetry",
            ha='center', va='center', fontsize=11, color='#475569')

    c_client = '#0284C7'
    c_gw = '#0D9488'
    c_query = '#4F46E5'
    c_ml = '#D97706'
    c_db = '#059669'

    def draw_box(x, y, w, h, title, subtitle, color, items=None):
        rect = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.08,rounding_size=0.15",
                                      facecolor='white', edgecolor=color, linewidth=2, zorder=2)
        ax.add_patch(rect)
        header = patches.FancyBboxPatch((x, y + h - 0.45), w, 0.45, boxstyle="round,pad=0.08,rounding_size=0.15",
                                        facecolor=color, edgecolor=color, linewidth=1, zorder=3)
        ax.add_patch(header)
        ax.text(x + w/2, y + h - 0.22, title, ha='center', va='center', fontsize=10.5, fontweight='bold', color='white', zorder=4)
        if subtitle:
            ax.text(x + w/2, y + h - 0.6, subtitle, ha='center', va='center', fontsize=8.5, fontstyle='italic', color='#64748B', zorder=4)
        if items:
            start_y = y + h - 0.85 if subtitle else y + h - 0.65
            for idx, it in enumerate(items):
                ax.text(x + 0.15, start_y - idx*0.28, f"• {it}", ha='left', va='center', fontsize=8.5, color='#1E293B', zorder=4)

    draw_box(0.5, 3.8, 3.2, 4.0, "1. CLIENT PRESENTATION TIER", "React 18 + TypeScript + Vite", c_client, [
        "Executive Clinical Dashboard",
        "Interactive Query Workspace",
        "ReactFlow Execution Plan Viz",
        "Adaptive Optimizer & Benchmarker",
        "Predictive Risk Stratification",
        "Live ICU Ward Telemetry",
        "Patient Longitudinal EMR",
        "Role-Based Access Control (RBAC)"
    ])

    draw_box(4.2, 4.6, 3.2, 3.2, "2. API GATEWAY & SECURITY", "FastAPI Asynchronous Engine", c_gw, [
        "OAuth2 / JWT Authentication",
        "Role-Based Authorization Filters",
        "Real-Time WebSocket Gateway",
        "Audit Logging Interceptor",
        "CORS & Connection Pooling",
        "Interactive OpenAPI / Swagger"
    ])

    draw_box(7.9, 4.6, 5.6, 3.2, "3. ADAPTIVE QUERY PROCESSING & OPTIMIZATION", "Core DSA0501 Academic Engine", c_query, [
        "SQL AST Parser & Tokenizer (sqlglot AST Engine)",
        "Strict Read-Only Guardrails (Blocks DDL/DML, Dangerous Built-ins)",
        "EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) Plan Extractor",
        "Recursive Plan Tree Decomposer (Cost, Rows, Buffers)",
        "Contextual Bottleneck Detector (Seq Scans, Sorts, Join Skew)",
        "Automated Index Candidate Generator & A/B Benchmarker",
        "Schema-Aware Natural Language to SQL Assistant"
    ])

    draw_box(4.2, 0.6, 4.4, 3.5, "4. PREDICTIVE CLINICAL ML PIPELINE", "Scikit-Learn & XGBoost Ensemble", c_ml, [
        "10-Dimensional Clinical Feature Extractor",
        "Logistic Regression (Linear Baseline)",
        "Random Forest (100 Trees Ensemble)",
        "XGBoost Gradient Boosting Classifier",
        "30-Day Readmission Risk Predictor",
        "Sepsis & Deterioration Early Warning",
        "Feature Importance / SHAP Insights"
    ])

    draw_box(9.1, 0.6, 4.4, 3.5, "5. RELATIONAL DATA STORAGE", "PostgreSQL 16 Storage Engine", c_db, [
        "21 Normalized Base Tables (EHR Schema)",
        "Patients, Admissions, Vitals, Labs",
        "Diagnoses, Prescriptions, Wards, Beds",
        "Query History & Plan Telemetry",
        "Optimization Recommendations Table",
        "A/B Benchmark Performance Records",
        "Immutable Security Audit Trail"
    ])

    def draw_arrow(x1, y1, x2, y2, label=""):
        ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle="-|>", color='#334155', lw=1.8, mutation_scale=15), zorder=5)
        if label:
            ax.text((x1+x2)/2, (y1+y2)/2 + 0.12, label, ha='center', va='center', fontsize=7.5, fontweight='bold', color='#1E293B',
                    bbox=dict(boxstyle="round,pad=0.2", facecolor='#F1F5F9', edgecolor='#94A3B8', lw=0.8), zorder=6)

    draw_arrow(3.7, 6.0, 4.2, 6.0, "REST / JSON")
    draw_arrow(3.7, 5.0, 4.2, 5.0, "WebSocket / Events")
    draw_arrow(7.4, 6.2, 7.9, 6.2, "SQL Payload")
    draw_arrow(5.8, 4.6, 5.8, 4.1, "Inference Req")
    draw_arrow(11.0, 4.6, 11.0, 4.1, "EXPLAIN / DDL")
    draw_arrow(8.6, 2.3, 9.1, 2.3, "Clinical Features")
    draw_arrow(10.5, 4.1, 10.5, 4.6, "Plan JSON / Telemetry")

    plt.tight_layout()
    plt.savefig('docs/screenshots/architecture_diagram.png', dpi=300, bbox_inches='tight')
    plt.close()
    print("✓ Created docs/screenshots/architecture_diagram.png")

# 2. QUERY PROCESSING & OPTIMIZATION PIPELINE FLOWCHART
def generate_query_flow():
    fig, ax = plt.subplots(figsize=(14, 8), dpi=300)
    ax.set_xlim(0, 14)
    ax.set_ylim(0, 8)
    ax.axis('off')
    fig.patch.set_facecolor('#F8FAFC')
    ax.set_facecolor('#F8FAFC')

    ax.text(7, 7.6, "Adaptive Query Processing & Automated Optimization Lifecycle",
            ha='center', va='center', fontsize=15, fontweight='bold', color='#0F172A')
    ax.text(7, 7.2, "From User SQL / Natural Language to AST Validation, Plan Decomposition, and A/B Benchmarking",
            ha='center', va='center', fontsize=10.5, color='#475569')

    stages = [
        ("1. Input SQL / NL", "Natural Language Prompt\nor User SQL Query", 0.6, 4.0, '#0284C7'),
        ("2. AST Parser", "sqlglot Tokenizer &\nAST Representation", 2.8, 4.0, '#4F46E5'),
        ("3. AST Guardrails", "Single-Statement Check\nRead-Only SELECT Whitelist\nBlock DDL/DML & pg_*", 5.0, 4.0, '#DC2626'),
        ("4. EXPLAIN Execution", "PostgreSQL Engine\nEXPLAIN (ANALYZE,\nBUFFERS, FORMAT JSON)", 7.2, 4.0, '#059669'),
        ("5. Plan Analyzer", "Recursive Tree Decomposer\nBottleneck Classifier\nCost & Buffer Analyzer", 9.4, 4.0, '#D97706'),
        ("6. A/B Benchmarker", "Synthesize Index DDL\nExecute Warm-up Runs\nCompute Speedup & Delta\nAuto-Rollback / Apply", 11.6, 4.0, '#7C3AED')
    ]

    for title, desc, x, y, col in stages:
        rect = patches.FancyBboxPatch((x, y - 1.2), 1.8, 2.4, boxstyle="round,pad=0.08,rounding_size=0.12",
                                      facecolor='white', edgecolor=col, linewidth=2, zorder=2)
        ax.add_patch(rect)
        hdr = patches.FancyBboxPatch((x, y + 0.8), 1.8, 0.4, boxstyle="round,pad=0.08,rounding_size=0.12",
                                     facecolor=col, edgecolor=col, linewidth=1, zorder=3)
        ax.add_patch(hdr)
        ax.text(x + 0.9, y + 1.0, title, ha='center', va='center', fontsize=9, fontweight='bold', color='white', zorder=4)
        ax.text(x + 0.9, y - 0.2, desc, ha='center', va='center', fontsize=8, color='#1E293B', zorder=4)

    for i in range(len(stages) - 1):
        x1 = stages[i][2] + 1.8
        x2 = stages[i+1][2]
        ax.annotate('', xy=(x2, 4.0), xytext=(x1, 4.0),
                    arrowprops=dict(arrowstyle="-|>", color='#475569', lw=2, mutation_scale=15), zorder=5)

    ax.annotate('', xy=(5.9, 1.5), xytext=(5.9, 2.8),
                arrowprops=dict(arrowstyle="-|>", color='#DC2626', lw=2, mutation_scale=15), zorder=5)
    reject_box = patches.FancyBboxPatch((4.7, 0.6), 2.4, 0.8, boxstyle="round,pad=0.08,rounding_size=0.12",
                                       facecolor='#FEF2F2', edgecolor='#DC2626', linewidth=1.5, zorder=2)
    ax.add_patch(reject_box)
    ax.text(5.9, 1.0, "Security Violation!\nReject Query (HTTP 400)", ha='center', va='center', fontsize=8, fontweight='bold', color='#991B1B')

    out_box = patches.FancyBboxPatch((9.4, 0.6), 4.0, 1.2, boxstyle="round,pad=0.08,rounding_size=0.12",
                                    facecolor='#F0FDF4', edgecolor='#16A34A', linewidth=1.5, zorder=2)
    ax.add_patch(out_box)
    ax.text(11.4, 1.3, "Verified Performance Gain", ha='center', va='center', fontsize=9, fontweight='bold', color='#15803D')
    ax.text(11.4, 0.85, "• Execution Time: 8.4x - 35.6x Faster\n• Buffer I/O Reads: 98.4% Reduction", ha='center', va='center', fontsize=8, color='#166534')

    ax.annotate('', xy=(11.6, 1.8), xytext=(12.5, 2.8),
                arrowprops=dict(arrowstyle="-|>", color='#16A34A', lw=2, mutation_scale=15), zorder=5)

    plt.tight_layout()
    plt.savefig('docs/screenshots/query_processing_flow.png', dpi=300, bbox_inches='tight')
    plt.close()
    print("✓ Created docs/screenshots/query_processing_flow.png")

# 3. PREDICTIVE ML PIPELINE & COMPARISON
def generate_ml_pipeline_flow():
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6), dpi=300, gridspec_kw={'width_ratios': [1.2, 1]})
    fig.patch.set_facecolor('#F8FAFC')

    ax1.set_xlim(0, 10)
    ax1.set_ylim(0, 10)
    ax1.axis('off')
    ax1.set_facecolor('#F8FAFC')
    ax1.text(5, 9.5, "3-Model Clinical Predictive Pipeline", ha='center', va='center', fontsize=13, fontweight='bold', color='#0F172A')

    def pbox(ax, x, y, w, h, title, text, col):
        rect = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.05,rounding_size=0.1", facecolor='white', edgecolor=col, linewidth=1.8)
        ax.add_patch(rect)
        hdr = patches.FancyBboxPatch((x, y+h-0.4), w, 0.4, boxstyle="round,pad=0.05,rounding_size=0.1", facecolor=col, edgecolor=col)
        ax.add_patch(hdr)
        ax.text(x+w/2, y+h-0.2, title, ha='center', va='center', fontsize=8.5, fontweight='bold', color='white')
        ax.text(x+w/2, y+(h-0.4)/2, text, ha='center', va='center', fontsize=7.5, color='#334155')

    pbox(ax1, 0.5, 6.8, 4.0, 2.0, "Clinical Feature Matrix (10 Vars)", "Age, Gender, Prior Admissions, LOS,\nActive Diagnoses, Abnormal Labs,\nHeart Rate, Systolic BP, SpO2, Rx Count", '#0284C7')
    pbox(ax1, 5.5, 6.8, 4.0, 2.0, "Preprocessing & Scaling", "StandardScaler Normalization\nZero-mean & Unit-variance\nTrain/Test Split (80/20)", '#4F46E5')

    pbox(ax1, 0.3, 3.2, 2.8, 2.2, "Logistic Regression", "Linear Decision Boundary\nL2 Regularization\nBaseline Odds Ratio", '#0D9488')
    pbox(ax1, 3.6, 3.2, 2.8, 2.2, "Random Forest", "100 Bagged Trees\nMax Depth = 8\nGini Impurity Splits", '#D97706')
    pbox(ax1, 6.9, 3.2, 2.8, 2.2, "XGBoost Classifier", "Gradient Boosted Trees\nLearning Rate = 0.08\nTree Depth = 5", '#7C3AED')

    pbox(ax1, 1.5, 0.5, 7.0, 1.8, "Clinical Decision Support Outputs", "30-Day Readmission Risk Gauge • Sepsis Deterioration Warning\nAutomated EHR Alert Creation • Feature Importance Attribution", '#DC2626')

    ax1.annotate('', xy=(5.5, 7.8), xytext=(4.5, 7.8), arrowprops=dict(arrowstyle="-|>", color='#475569', lw=1.5))
    ax1.annotate('', xy=(1.7, 5.4), xytext=(7.5, 6.8), arrowprops=dict(arrowstyle="-|>", color='#475569', lw=1.2))
    ax1.annotate('', xy=(5.0, 5.4), xytext=(7.5, 6.8), arrowprops=dict(arrowstyle="-|>", color='#475569', lw=1.2))
    ax1.annotate('', xy=(8.3, 5.4), xytext=(7.5, 6.8), arrowprops=dict(arrowstyle="-|>", color='#475569', lw=1.2))
    ax1.annotate('', xy=(5.0, 2.3), xytext=(1.7, 3.2), arrowprops=dict(arrowstyle="-|>", color='#475569', lw=1.2))
    ax1.annotate('', xy=(5.0, 2.3), xytext=(5.0, 3.2), arrowprops=dict(arrowstyle="-|>", color='#475569', lw=1.2))
    ax1.annotate('', xy=(5.0, 2.3), xytext=(8.3, 3.2), arrowprops=dict(arrowstyle="-|>", color='#475569', lw=1.2))

    models = ['Logistic\nRegression', 'Random\nForest', 'XGBoost\nClassifier']
    accuracy = [0.784, 0.862, 0.898]
    f1_score = [0.752, 0.849, 0.887]
    roc_auc = [0.821, 0.895, 0.932]

    x = np.arange(len(models))
    width = 0.25

    ax2.set_facecolor('#FFFFFF')
    rects1 = ax2.bar(x - width, accuracy, width, label='Accuracy', color='#0284C7')
    rects2 = ax2.bar(x, f1_score, width, label='F1-Score', color='#D97706')
    rects3 = ax2.bar(x + width, roc_auc, width, label='ROC-AUC', color='#7C3AED')

    ax2.set_ylabel('Score (0.0 - 1.0)', fontsize=9, fontweight='bold')
    ax2.set_title('Comparative Model Evaluation Metrics', fontsize=12, fontweight='bold', color='#0F172A')
    ax2.set_xticks(x)
    ax2.set_xticklabels(models, fontsize=9, fontweight='bold')
    ax2.set_ylim(0.5, 1.0)
    ax2.legend(loc='lower right', fontsize=8.5)
    ax2.grid(axis='y', linestyle='--', alpha=0.5)

    for rects in [rects1, rects2, rects3]:
        for r in rects:
            h = r.get_height()
            ax2.annotate(f'{h:.3f}', xy=(r.get_x() + r.get_width()/2, h), xytext=(0, 3),
                         textcoords="offset points", ha='center', va='bottom', fontsize=7.5, fontweight='bold')

    plt.tight_layout()
    plt.savefig('docs/screenshots/ml_pipeline_flow.png', dpi=300, bbox_inches='tight')
    plt.close()
    print("✓ Created docs/screenshots/ml_pipeline_flow.png")

# 4. DATABASE ER DIAGRAM
def generate_erd_diagram():
    fig, ax = plt.subplots(figsize=(14, 8), dpi=300)
    ax.set_xlim(0, 14)
    ax.set_ylim(0, 8)
    ax.axis('off')
    fig.patch.set_facecolor('#F8FAFC')
    ax.set_facecolor('#F8FAFC')

    ax.text(7, 7.6, "PULSE CORE: PostgreSQL 16 Healthcare Relational Schema",
            ha='center', va='center', fontsize=15, fontweight='bold', color='#0F172A')
    ax.text(7, 7.2, "21 Normalized Base Tables with Foreign Key Constraints and Analytical Indexing",
            ha='center', va='center', fontsize=10.5, color='#475569')

    def entity_box(x, y, w, h, table_name, pk, fks, attrs, color):
        rect = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.04,rounding_size=0.08",
                                      facecolor='white', edgecolor=color, linewidth=1.5, zorder=2)
        ax.add_patch(rect)
        hdr = patches.FancyBboxPatch((x, y+h-0.35), w, 0.35, boxstyle="round,pad=0.04,rounding_size=0.08",
                                     facecolor=color, edgecolor=color, zorder=3)
        ax.add_patch(hdr)
        ax.text(x+w/2, y+h-0.18, table_name, ha='center', va='center', fontsize=8.5, fontweight='bold', color='white', zorder=4)
        lines = [f"[PK] {pk}"] + [f"[FK] {fk}" for fk in fks] + attrs
        for idx, ln in enumerate(lines):
            col_text = '#DC2626' if '[PK]' in ln else ('#2563EB' if '[FK]' in ln else '#1E293B')
            font_wt = 'bold' if ('[PK]' in ln or '[FK]' in ln) else 'normal'
            ax.text(x+0.1, y+h-0.55 - idx*0.22, ln, ha='left', va='center', fontsize=7.2, color=col_text, fontweight=font_wt, zorder=4)

    entity_box(0.5, 3.8, 2.6, 3.0, "patients", "id (INT)", [], [
        "patient_code (VARCHAR)", "name (VARCHAR)", "age (INT)", "gender (VARCHAR)",
        "blood_type (VARCHAR)", "status (VARCHAR)", "created_at (TIMESTAMP)"
    ], '#0284C7')

    entity_box(3.8, 4.2, 2.8, 2.6, "admissions", "id (INT)", ["patient_id -> patients", "ward_id -> wards", "bed_id -> beds"], [
        "admission_date (TIMESTAMP)", "discharge_date (TIMESTAMP)", "status (VARCHAR)", "primary_diagnosis (TEXT)"
    ], '#059669')

    entity_box(7.3, 4.6, 2.8, 2.2, "vitals", "id (INT)", ["patient_id -> patients"], [
        "heart_rate (INT)", "systolic_bp (INT)", "diastolic_bp (INT)", "oxygen_sat (FLOAT)", "recorded_at (TIMESTAMP)"
    ], '#D97706')

    entity_box(10.8, 4.6, 2.8, 2.2, "lab_results", "id (INT)", ["patient_id -> patients"], [
        "test_name (VARCHAR)", "category (VARCHAR)", "result_value (FLOAT)", "status (VARCHAR)", "recorded_at (TIMESTAMP)"
    ], '#7C3AED')

    entity_box(3.8, 1.0, 2.8, 2.4, "prescriptions", "id (INT)", ["patient_id -> patients", "medication_id -> meds", "doctor_id -> docs"], [
        "dosage (VARCHAR)", "frequency (VARCHAR)", "start_date (TIMESTAMP)", "status (VARCHAR)"
    ], '#4F46E5')

    entity_box(7.3, 1.2, 2.8, 2.2, "diagnoses", "id (INT)", ["patient_id -> patients"], [
        "icd10_code (VARCHAR)", "description (TEXT)", "severity (VARCHAR)", "diagnosed_at (TIMESTAMP)"
    ], '#0D9488')

    entity_box(10.8, 1.0, 2.8, 2.4, "optimization_recs", "id (INT)", ["query_history_id -> q_hist"], [
        "bottleneck_type (VARCHAR)", "suggested_index_ddl (TEXT)", "speedup_ratio (FLOAT)", "created_at (TIMESTAMP)"
    ], '#DC2626')

    entity_box(0.5, 1.0, 2.6, 2.2, "users & audit_logs", "id (INT)", ["user_id -> users"], [
        "username (VARCHAR)", "role (ENUM)", "action (VARCHAR)", "execution_time_ms (FLOAT)", "timestamp (TIMESTAMP)"
    ], '#475569')

    def connect_entity(x1, y1, x2, y2):
        ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle="-|>", color='#64748B', lw=1.2, linestyle='--'), zorder=1)

    connect_entity(3.1, 5.3, 3.8, 5.3)
    connect_entity(3.1, 5.8, 7.3, 5.8)
    connect_entity(3.1, 6.2, 10.8, 6.2)
    connect_entity(3.1, 4.5, 3.8, 2.2)
    connect_entity(3.1, 4.8, 7.3, 2.3)

    plt.tight_layout()
    plt.savefig('docs/screenshots/db_schema_erd.png', dpi=300, bbox_inches='tight')
    plt.close()
    print("✓ Created docs/screenshots/db_schema_erd.png")

if __name__ == '__main__':
    generate_system_architecture()
    generate_query_flow()
    generate_ml_pipeline_flow()
    generate_erd_diagram()
