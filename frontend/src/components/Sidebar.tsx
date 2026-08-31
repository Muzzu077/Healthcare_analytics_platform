import React from 'react';
import {
  LayoutDashboard, Users, Activity, Bell, Terminal,
  Zap, BrainCircuit, History, Shield, Server,
  BedDouble, Stethoscope, TestTube, UserPlus, Calendar
} from 'lucide-react';
import { UserRole } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  role: UserRole;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, role }) => {
  // Define role-specific navigation configuration
  const getNavSectionsForRole = () => {
    switch (role) {
      case 'doctor':
        return [
          {
            title: "PHYSICIAN CLINICAL PRACTICE",
            items: [
              { id: 'dashboard', label: 'Physician Dashboard', icon: LayoutDashboard },
              { id: 'patients', label: 'Patient Registry & EHR', icon: Users },
              { id: 'admissions', label: 'Inpatient Ward Census', icon: BedDouble },
              { id: 'live_monitoring', label: 'Live ICU Telemetry', icon: Activity, badge: 'LIVE' },
              { id: 'alerts', label: 'Clinical Alerts', icon: Bell },
              { id: 'data_management', label: 'Telemetry Ingestion', icon: Stethoscope },
            ]
          },
          {
            title: "CLINICAL INTELLIGENCE",
            items: [
              { id: 'query_workspace', label: 'AI Query & Record Finder', icon: Terminal, academic: true },
              { id: 'predictive_analytics', label: 'ML Readmission Risk', icon: BrainCircuit, badge: 'XGB' },
            ]
          }
        ];

      case 'analytics_dba':
        return [
          {
            title: "DATABASE & QUERY TELEMETRY",
            items: [
              { id: 'dashboard', label: 'DBA Query Dashboard', icon: LayoutDashboard },
              { id: 'query_workspace', label: 'SQL Query Workspace', icon: Terminal, academic: true },
              { id: 'optimizer', label: 'Adaptive Index Optimizer', icon: Zap, academic: true },
              { id: 'query_history', label: 'Execution Performance Log', icon: History },
            ]
          },
          {
            title: "GOVERNANCE & SYSTEM",
            items: [
              { id: 'system_admin', label: 'Database Health & Status', icon: Server },
              { id: 'audit_log', label: 'Security Audit Log', icon: Shield },
            ]
          }
        ];

      case 'lab_tech':
        return [
          {
            title: "DIAGNOSTIC LABORATORY",
            items: [
              { id: 'dashboard', label: 'Laboratory Dashboard', icon: LayoutDashboard },
              { id: 'query_workspace', label: 'AI Record Search', icon: Terminal },
              { id: 'data_management', label: 'Upload Lab Results', icon: TestTube, badge: 'PORTAL' },
              { id: 'alerts', label: 'Critical Diagnostic Alerts', icon: Bell },
              { id: 'patients', label: 'Patient Clinical Registry', icon: Users },
            ]
          }
        ];

      case 'receptionist':
        return [
          {
            title: "ADMISSIONS & DESK",
            items: [
              { id: 'dashboard', label: 'Admissions Desk Dashboard', icon: LayoutDashboard },
              { id: 'query_workspace', label: 'AI Patient Search', icon: Terminal },
              { id: 'patients', label: 'Patient Registration & List', icon: UserPlus },
              { id: 'admissions', label: 'Ward Bed Management', icon: BedDouble },
              { id: 'alerts', label: 'Operational Alerts', icon: Bell },
            ]
          }
        ];

      case 'patient':
        return [
          {
            title: "PATIENT PERSONAL PORTAL",
            items: [
              { id: 'dashboard', label: 'My Health Summary', icon: LayoutDashboard },
              { id: 'patients', label: 'My Medical Profile', icon: Users },
              { id: 'live_monitoring', label: 'My Monitored Vitals', icon: Activity },
            ]
          }
        ];

      case 'admin':
      default:
        // Hospital Administrator: Complete Executive View
        return [
          {
            title: "EXECUTIVE OPERATIONS",
            items: [
              { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
              { id: 'patients', label: 'Patient Registry', icon: Users },
              { id: 'admissions', label: 'Admissions & Beds', icon: BedDouble },
              { id: 'live_monitoring', label: 'Live ICU Monitoring', icon: Activity, badge: 'LIVE' },
              { id: 'alerts', label: 'Alerts Center', icon: Bell },
              { id: 'data_management', label: 'Telemetry Portal', icon: Stethoscope },
            ]
          },
          {
            title: "QUERY PROCESSING (ACADEMIC)",
            items: [
              { id: 'query_workspace', label: 'SQL Query Workspace', icon: Terminal, academic: true },
              { id: 'optimizer', label: 'Adaptive Optimizer', icon: Zap, academic: true },
              { id: 'query_history', label: 'Query Performance Log', icon: History },
            ]
          },
          {
            title: "SYSTEM & GOVERNANCE",
            items: [
              { id: 'predictive_analytics', label: 'ML Predictive Risk', icon: BrainCircuit, badge: 'XGB' },
              { id: 'audit_log', label: 'Security Audit Log', icon: Shield },
              { id: 'system_admin', label: 'System Administration', icon: Server },
            ]
          }
        ];
    }
  };

  const navSections = getNavSectionsForRole();

  return (
    <aside className="w-64 bg-white border-r border-[#E2E8F0] flex flex-col h-[calc(100vh-57px)] shrink-0 select-none shadow-xs">
      <div className="flex-1 overflow-y-auto p-3 space-y-5">
        {navSections.map((section, sidx) => (
          <div key={sidx} className="space-y-1">
            <div className="px-3 py-1 text-[10px] font-bold text-[#64748B] tracking-wider uppercase">
              {section.title}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#163A5F] text-white shadow-sm'
                        : 'text-[#0F172A]/80 hover:text-[#0F172A] hover:bg-[#F5F7FA]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#06B6D4]' : 'text-[#64748B]'}`} />
                      <span>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold font-mono ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : item.badge === 'LIVE' ? 'bg-[#EFF6FF] text-[#0E7490] border border-[#0E7490]/30' : 'bg-[#6D5CE7]/10 text-[#6D5CE7]'
                      }`}>
                        {item.badge}
                      </span>
                    )}

                    {item.academic && !isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0E7490]" title="Core Academic Module" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* System Status Footer */}
      <div className="p-3 border-t border-[#E2E8F0] bg-[#F5F7FA] text-[11px] text-[#64748B] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#15803D]" />
          <span className="font-mono text-[10px] uppercase">
            {role === 'doctor' ? 'Clinical Mode' : role === 'analytics_dba' ? 'DBA / Telemetry' : role === 'lab_tech' ? 'Lab Mode' : role === 'receptionist' ? 'Front Desk' : 'Executive'}
          </span>
        </div>
        <span className="text-[10px] font-mono text-[#64748B]">v2.0.0</span>
      </div>
    </aside>
  );
};
