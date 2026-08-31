import React, { useState, useEffect } from 'react';
import {
  fetchModelComparison, fetchPatientPrediction, fetchHighRiskPatients, fetchPatientsList
} from '../services/api';
import { ModelMetric, PredictionResult, Patient } from '../types';
import {
  BrainCircuit, Award, CheckCircle2, AlertTriangle, Users,
  Activity, ArrowRight, ShieldAlert, Cpu, ChevronRight, BarChart2
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

export const PredictiveAnalyticsPage: React.FC = () => {
  const [modelMetrics, setModelMetrics] = useState<ModelMetric[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('XGBoost Classifier');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number>(1);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [highRiskList, setHighRiskList] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [predicting, setPredicting] = useState<boolean>(false);

  useEffect(() => {
    const loadInit = async () => {
      try {
        const [models, pList, highRisk] = await Promise.all([
          fetchModelComparison(),
          fetchPatientsList('', '', '', 0, 30),
          fetchHighRiskPatients()
        ]);
        setModelMetrics(models);
        setPatients(pList.items);
        setHighRiskList(highRisk);
        if (pList.items.length > 0) {
          setSelectedPatientId(pList.items[0].id);
          const pred = await fetchPatientPrediction(pList.items[0].id);
          setPrediction(pred);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadInit();
  }, []);

  const handlePredict = async (pId: number) => {
    setSelectedPatientId(pId);
    setPredicting(true);
    try {
      const pred = await fetchPatientPrediction(pId);
      setPrediction(pred);
    } catch (e) {
      console.error(e);
    } finally {
      setPredicting(false);
    }
  };

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'Critical': return 'bg-[#FEF2F2] text-[#B91C1C] border-[#B91C1C]/40';
      case 'High': return 'bg-[#FFFBEB] text-[#B45309] border-[#B45309]/40';
      case 'Moderate': return 'bg-[#EFF6FF] text-[#1F4E79] border-[#E2E8F0]';
      default: return 'bg-[#F0FDF4] text-[#15803D] border-[#15803D]/40';
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-[#64748B] flex flex-col items-center justify-center gap-3">
        <BrainCircuit className="w-8 h-8 text-[#6D5CE7] animate-pulse" />
        <span className="text-xs font-mono">Evaluating Machine Learning Pipelines...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#163A5F] tracking-tight flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-[#6D5CE7]" />
              Predictive Clinical Risk & Multi-Model Evaluation
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#6D5CE7]/10 text-[#6D5CE7] border border-[#6D5CE7]/20 text-[10px] font-bold font-mono">
              3-MODEL BENCHMARK
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Comparative evaluation of Logistic Regression, Random Forest, and XGBoost with clinical decision support explainability.
          </p>
        </div>
      </div>

      {/* Model Benchmark Comparison Table */}
      <div className="clinical-card overflow-hidden">
        <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-[#6D5CE7]" />
            <span className="text-xs font-bold text-[#163A5F] uppercase font-mono">Supervised Model Comparison (30-Day Readmission Task)</span>
          </div>
          <span className="text-[10px] text-[#64748B] font-mono">Stratified 5-Fold Cross-Validation</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#163A5F] text-white uppercase">
              <tr>
                <th className="px-4 py-3">Algorithm</th>
                <th className="px-4 py-3">Accuracy</th>
                <th className="px-4 py-3">Precision</th>
                <th className="px-4 py-3">Recall</th>
                <th className="px-4 py-3">F1-Score</th>
                <th className="px-4 py-3">ROC-AUC</th>
                <th className="px-4 py-3 text-right">Primary Model</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {modelMetrics.map((m, idx) => {
                const isSelected = selectedModel === m.model_name;
                return (
                  <tr
                    key={m.model_name}
                    onClick={() => setSelectedModel(m.model_name)}
                    className={`cursor-pointer transition-all ${
                      isSelected ? 'bg-[#EFF6FF]' : idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]'
                    } hover:bg-[#F5F7FA]`}
                  >
                    <td className="px-4 py-3 font-bold text-[#0F172A] flex items-center gap-2">
                      <Cpu className="w-3.5 h-3.5 text-[#6D5CE7]" />
                      {m.model_name}
                    </td>
                    <td className="px-4 py-3 font-bold text-[#163A5F]">{(m.accuracy * 100).toFixed(1)}%</td>
                    <td className="px-4 py-3 text-[#64748B]">{(m.precision * 100).toFixed(1)}%</td>
                    <td className="px-4 py-3 text-[#64748B]">{(m.recall * 100).toFixed(1)}%</td>
                    <td className="px-4 py-3 font-bold text-[#0E7490]">{(m.f1_score * 100).toFixed(1)}%</td>
                    <td className="px-4 py-3 font-extrabold text-[#15803D]">{(m.roc_auc * 100).toFixed(1)}%</td>
                    <td className="px-4 py-3 text-right">
                      {m.is_primary ? (
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-[#6D5CE7] text-white">
                          DEPLOYED BEST
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#64748B]">Baseline</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Patient Risk Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient Selector */}
        <div className="clinical-card p-4 space-y-3">
          <div className="text-xs font-bold text-[#163A5F] uppercase font-mono pb-2 border-b border-[#E2E8F0]">
            Select Patient to Evaluate
          </div>
          <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1 text-xs">
            {patients.map(p => (
              <div
                key={p.id}
                onClick={() => handlePredict(p.id)}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                  selectedPatientId === p.id
                    ? 'border-[#6D5CE7] bg-[#EFF6FF]'
                    : 'border-[#E2E8F0] bg-white hover:bg-[#F5F7FA]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#0F172A]">{p.name}</span>
                  <span className="font-mono text-[10px] text-[#64748B]">{p.patient_code}</span>
                </div>
                <span className="text-[11px] text-[#64748B]">{p.age} yrs • {p.gender} • Status: {p.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Prediction Gauges & Feature Contributions */}
        <div className="lg:col-span-2 space-y-5">
          {prediction && (
            <div className="clinical-card p-6 space-y-6 border-[#6D5CE7]/30 shadow-md">
              {/* Summary Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
                <div>
                  <h2 className="text-lg font-bold text-[#163A5F]">
                    {prediction.patient_name} ({prediction.patient_code})
                  </h2>
                  <p className="text-xs text-[#64748B]">
                    30-Day Hospital Readmission Probability & Clinical Risk Assessment
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] text-[#64748B] uppercase font-mono block">Readmission Risk</span>
                    <div className="text-3xl font-black text-[#163A5F]">{prediction.readmission_risk_pct}%</div>
                  </div>
                  <span className={`px-3 py-1 rounded-xl text-xs font-bold uppercase font-mono border ${getRiskBadge(prediction.risk_level)}`}>
                    {prediction.risk_level} Risk
                  </span>
                </div>
              </div>

              {/* Feature Importance Contributions Chart */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#163A5F]">Key Biomarkers & Features Associated with Prediction</span>
                  <span className="text-[10px] text-[#64748B] font-mono">Relative Importance %</span>
                </div>

                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={prediction.feature_contributions} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
                      <XAxis type="number" domain={[0, 100]} stroke="#64748B" fontSize={10} unit="%" />
                      <YAxis type="category" dataKey="feature" stroke="#64748B" fontSize={10} width={90} />
                      <Tooltip contentStyle={{ background: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '8px', fontSize: '12px' }} />
                      <Bar dataKey="importance_pct" fill="#6D5CE7" radius={[0, 4, 4, 0]} name="Importance (%)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Clinical Decision Support Recommendation */}
              <div className="p-4 rounded-xl bg-[#EFF6FF] border border-[#1F4E79]/20 text-xs text-[#1F4E79] space-y-1">
                <strong>Decision Support Directive:</strong>
                <p>{prediction.clinical_recommendation}</p>
              </div>

              {/* Safety Disclaimer */}
              <div className="text-[10px] text-[#64748B] italic">
                * Clinical Safety Notice: {prediction.disclaimer || "Statistical model output for decision support only. Clinical judgment by licensed healthcare providers remains authoritative."}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
