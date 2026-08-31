import React, { useState, useEffect } from 'react';
import { User, UserRole } from './types';
import { loginApi, fetchAlerts, getMeApi } from './services/api';
import { realtimeSocket } from './services/socket';

import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';

import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { PatientsPage } from './pages/PatientsPage';
import { AdmissionsPage } from './pages/AdmissionsPage';
import { LiveMonitoringPage } from './pages/LiveMonitoringPage';
import { AlertsPage } from './pages/AlertsPage';
import { DataManagementPage } from './pages/DataManagementPage';
import { QueryWorkspacePage } from './pages/QueryWorkspacePage';
import { AdaptiveOptimizerPage } from './pages/AdaptiveOptimizerPage';
import { QueryHistoryPage } from './pages/QueryHistoryPage';
import { PredictiveAnalyticsPage } from './pages/PredictiveAnalyticsPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { SystemAdminPage } from './pages/SystemAdminPage';

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [showLanding, setShowLanding] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [optimizerQuery, setOptimizerQuery] = useState<string>('');
  const [unreadAlertsCount, setUnreadAlertsCount] = useState<number>(0);

  useEffect(() => {
    realtimeSocket.connect();

    // Check existing session
    const token = localStorage.getItem('token');
    if (token) {
      getMeApi()
        .then(u => {
          setUser(u);
          setShowLanding(false);
        })
        .catch(() => {
          localStorage.removeItem('token');
        });
    }

    const updateAlertsCount = async () => {
      try {
        const alist = await fetchAlerts(undefined, undefined, false);
        setUnreadAlertsCount(alist.length);
      } catch (e) {}
    };

    updateAlertsCount();
    const interval = setInterval(updateAlertsCount, 10000);

    const handleNewAlert = () => updateAlertsCount();
    realtimeSocket.on('alert_created', handleNewAlert);
    realtimeSocket.on('alert_resolved', handleNewAlert);

    return () => {
      clearInterval(interval);
      realtimeSocket.off('alert_created', handleNewAlert);
      realtimeSocket.off('alert_resolved', handleNewAlert);
    };
  }, []);

  // Role-based route guardrail
  useEffect(() => {
    if (!user) return;
    const allowedMap: Record<string, string[]> = {
      doctor: ['dashboard', 'patients', 'admissions', 'live_monitoring', 'alerts', 'data_management', 'predictive_analytics', 'query_workspace'],
      analytics_dba: ['dashboard', 'query_workspace', 'optimizer', 'query_history', 'system_admin', 'audit_log'],
      lab_tech: ['dashboard', 'data_management', 'alerts', 'patients', 'query_workspace'],
      receptionist: ['dashboard', 'patients', 'admissions', 'alerts', 'query_workspace'],
      patient: ['dashboard', 'patients', 'live_monitoring', 'query_workspace'],
      admin: ['dashboard', 'patients', 'admissions', 'live_monitoring', 'alerts', 'data_management', 'query_workspace', 'optimizer', 'query_history', 'predictive_analytics', 'audit_log', 'system_admin']
    };
    const allowed = allowedMap[user.role] || allowedMap.admin;
    if (!allowed.includes(activeTab)) {
      setActiveTab('dashboard');
    }
  }, [user, activeTab]);

  const handleQuickLoginFromLanding = async (role: UserRole) => {
    try {
      const usernameMap: Record<string, string> = {
        admin: 'admin',
        doctor: 'doctor',
        analytics_dba: 'dba',
        lab_tech: 'labtech',
        receptionist: 'receptionist',
        patient: 'patient'
      };
      const u = await loginApi(usernameMap[role] || 'doctor', role);
      setUser(u);
      setShowLanding(false);
      setActiveTab('dashboard');
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setShowLanding(true);
  };

  const handleNavigateOptimizer = (sql: string) => {
    setOptimizerQuery(sql);
    setActiveTab('optimizer');
  };

  if (showLanding && !user) {
    return <LandingPage onQuickLogin={handleQuickLoginFromLanding} />;
  }

  if (!user) {
    return <LoginPage onLoginSuccess={(u) => { setUser(u); setShowLanding(false); }} />;
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#0F172A] flex flex-col font-sans">
      <Navbar
        user={user}
        onLogout={handleLogout}
        unreadAlertsCount={unreadAlertsCount}
        onNavigateTab={setActiveTab}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          role={user.role}
        />

        <main className="flex-1 overflow-y-auto p-6 md:p-8 max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && <DashboardPage user={user} onNavigateTab={setActiveTab} />}
          {activeTab === 'patients' && <PatientsPage />}
          {activeTab === 'admissions' && <AdmissionsPage />}
          {activeTab === 'live_monitoring' && <LiveMonitoringPage />}
          {activeTab === 'alerts' && <AlertsPage />}
          {activeTab === 'data_management' && <DataManagementPage />}
          {activeTab === 'query_workspace' && <QueryWorkspacePage initialQuery={optimizerQuery} onSendToOptimizer={handleNavigateOptimizer} />}
          {activeTab === 'optimizer' && <AdaptiveOptimizerPage initialQuery={optimizerQuery} />}
          {activeTab === 'query_history' && <QueryHistoryPage />}
          {activeTab === 'predictive_analytics' && <PredictiveAnalyticsPage />}
          {activeTab === 'audit_log' && <AuditLogPage />}
          {activeTab === 'system_admin' && <SystemAdminPage />}
        </main>
      </div>
    </div>
  );
}

export default App;
