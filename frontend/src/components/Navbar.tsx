import React, { useState, useEffect } from 'react';
import { User, AlertItem } from '../types';
import {
  Activity, Bell, Search, LogOut, Shield,
  Radio, CheckCircle2, AlertTriangle, Database,
  Cpu, HeartPulse, UserCheck, X, ChevronRight
} from 'lucide-react';
import { realtimeSocket } from '../services/socket';
import { fetchAlerts } from '../services/api';
import { AIAssistantModal } from './AIAssistantModal';

interface NavbarProps {
  user: User;
  onLogout: () => void;
  unreadAlertsCount: number;
  onNavigateTab: (tab: string) => void;
  onSelectPatient?: (patientId: number) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogout,
  unreadAlertsCount,
  onNavigateTab,
  onSelectPatient
}) => {
  const [connectionState, setConnectionState] = useState<'connected' | 'reconnecting' | 'disconnected'>('connected');
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);
  const [recentAlerts, setRecentAlerts] = useState<AlertItem[]>([]);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showAiAssistantModal, setShowAiAssistantModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const unsubscribe = realtimeSocket.onConnectionStateChange((state) => {
      setConnectionState(state);
    });
    return unsubscribe;
  }, []);

  const handleOpenAlerts = async () => {
    setShowAlertsDropdown(!showAlertsDropdown);
    if (!showAlertsDropdown) {
      try {
        const alist = await fetchAlerts(undefined, undefined, false);
        setRecentAlerts(alist.slice(0, 5));
      } catch (e) {}
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#163A5F] text-white tracking-wide uppercase">ADMIN</span>;
      case 'doctor':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0E7490]/10 text-[#0E7490] border border-[#0E7490]/30 tracking-wide uppercase">PHYSICIAN</span>;
      case 'analytics_dba':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#6D5CE7]/10 text-[#6D5CE7] border border-[#6D5CE7]/30 tracking-wide uppercase">DBA / ANALYST</span>;
      case 'lab_tech':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#B45309]/10 text-[#B45309] border border-[#B45309]/30 tracking-wide uppercase">LABORATORY</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E2E8F0] text-[#0F172A] uppercase">{role}</span>;
    }
  };

  return (
    <>
      <header className="bg-white border-b border-[#E2E8F0] sticky top-0 z-40 shadow-sm">
        <div className="px-6 py-2.5 flex items-center justify-between">
          {/* Brand & Hospital System */}
          <div className="flex items-center gap-3.5">
            <div className="p-2 rounded-xl bg-[#163A5F] text-white shadow-md flex items-center justify-center">
              <HeartPulse className="w-5 h-5 text-[#06B6D4]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-tight text-[#163A5F]">PULSE CORE</span>
                <span className="text-xs text-[#64748B] font-medium hidden sm:inline">| Clinical Data Operations</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#EFF6FF] text-[#1F4E79] border border-[#E2E8F0]">DEV</span>
              </div>
              <p className="text-[10px] text-[#64748B] font-mono leading-none mt-0.5">Adaptive Query Processing & Predictive Analytics</p>
            </div>
          </div>

          {/* Center Search & AI Trigger */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => setShowSearchModal(true)}
              className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-lg bg-[#F5F7FA] border border-[#E2E8F0] hover:border-[#CBD5E1] text-xs text-[#64748B] transition-all w-64"
            >
              <Search className="w-3.5 h-3.5 text-[#64748B]" />
              <span className="flex-1 text-left">Quick Search...</span>
              <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-white rounded border border-[#E2E8F0] text-[#64748B]">⌘K</kbd>
            </button>

            <button
              onClick={() => setShowAiAssistantModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EFF6FF] border border-[#0E7490]/30 hover:bg-[#0E7490] hover:text-white text-xs font-semibold text-[#0E7490] transition-all shadow-2xs"
            >
              <Activity className="w-3.5 h-3.5 text-[#06B6D4]" />
              <span>Ask AI Query</span>
            </button>
          </div>

          {/* Right Action Cluster */}
          <div className="flex items-center gap-3">
            {/* Live Connection Indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F5F7FA] border border-[#E2E8F0] text-[11px] font-medium">
              {connectionState === 'connected' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-[#15803D] animate-live-pulse" />
                  <span className="text-[#15803D] font-semibold">Live WS</span>
                </>
              ) : connectionState === 'reconnecting' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-[#B45309] animate-ping" />
                  <span className="text-[#B45309] font-semibold">Reconnecting</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-[#B91C1C]" />
                  <span className="text-[#B91C1C] font-semibold">Offline</span>
                </>
              )}
            </div>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={handleOpenAlerts}
                className="p-2 rounded-lg hover:bg-[#F5F7FA] text-[#64748B] hover:text-[#0F172A] relative transition-all border border-transparent hover:border-[#E2E8F0]"
                title="Alert Center Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadAlertsCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 px-1.5 py-0.2 min-w-[16px] h-4 rounded-full bg-[#B91C1C] text-white text-[9px] font-bold flex items-center justify-center animate-bounce">
                    {unreadAlertsCount}
                  </span>
                )}
              </button>

              {/* Alerts Dropdown Popover */}
              {showAlertsDropdown && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-[#E2E8F0] rounded-xl shadow-xl z-50 p-3 space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
                    <span className="text-xs font-bold text-[#0F172A]">Clinical & System Alerts</span>
                    <button
                      onClick={() => { setShowAlertsDropdown(false); onNavigateTab('alerts'); }}
                      className="text-[10px] text-[#0E7490] hover:underline font-semibold"
                    >
                      View All ({unreadAlertsCount})
                    </button>
                  </div>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {recentAlerts.length === 0 ? (
                      <div className="p-4 text-center text-xs text-[#64748B]">No active unacknowledged alerts.</div>
                    ) : (
                      recentAlerts.map(alt => (
                        <div
                          key={alt.id}
                          onClick={() => { setShowAlertsDropdown(false); onNavigateTab('alerts'); }}
                          className={`p-2.5 rounded-lg border text-xs cursor-pointer hover:bg-[#F5F7FA] transition-all ${
                            alt.severity === 'critical' ? 'bg-[#FEF2F2] border-[#B91C1C]/30 text-[#B91C1C]' :
                            alt.severity === 'high' ? 'bg-[#FFFBEB] border-[#B45309]/30 text-[#B45309]' :
                            'bg-[#F5F7FA] border-[#E2E8F0] text-[#0F172A]'
                          }`}
                        >
                          <div className="font-semibold line-clamp-1">{alt.message}</div>
                          <span className="text-[10px] text-[#64748B] font-mono mt-0.5 block">{new Date(alt.created_at).toLocaleTimeString()}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="h-5 w-px bg-[#E2E8F0]" />

            {/* User Profile & Role */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#163A5F] text-white font-bold text-xs flex items-center justify-center shadow-sm">
                {user.full_name.split(' ').map(n => n[0]).slice(0, 2).join('')}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold text-[#0F172A] leading-tight">{user.full_name}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {getRoleBadge(user.role)}
                  <span className="text-[10px] text-[#64748B] truncate max-w-[100px]">{user.department || 'Hospital'}</span>
                </div>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg text-[#64748B] hover:text-[#B91C1C] hover:bg-[#FEF2F2] transition-all ml-1"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Global Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-start justify-center pt-20 p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-[#E2E8F0] flex items-center gap-3">
              <Search className="w-5 h-5 text-[#0E7490]" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search patients (e.g. PAT-10042, Sarah), SQL queries, alerts..."
                className="w-full bg-transparent text-sm text-[#0F172A] placeholder-[#64748B] outline-none"
              />
              <button onClick={() => setShowSearchModal(false)} className="p-1 text-[#64748B] hover:text-[#0F172A]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto space-y-3 text-xs">
              <div className="font-semibold text-[#64748B] uppercase tracking-wider text-[10px]">Quick Navigation</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setShowSearchModal(false); onNavigateTab('patients'); }}
                  className="p-2.5 rounded-lg bg-[#F5F7FA] hover:bg-[#EFF6FF] border border-[#E2E8F0] text-left text-[#0F172A] font-semibold flex items-center justify-between"
                >
                  <span>Patient Clinical Registry</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#64748B]" />
                </button>
                <button
                  onClick={() => { setShowSearchModal(false); onNavigateTab('query_workspace'); }}
                  className="p-2.5 rounded-lg bg-[#F5F7FA] hover:bg-[#EFF6FF] border border-[#E2E8F0] text-left text-[#0F172A] font-semibold flex items-center justify-between"
                >
                  <span>SQL Query Workspace</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#64748B]" />
                </button>
                <button
                  onClick={() => { setShowSearchModal(false); onNavigateTab('live_monitoring'); }}
                  className="p-2.5 rounded-lg bg-[#F5F7FA] hover:bg-[#EFF6FF] border border-[#E2E8F0] text-left text-[#0F172A] font-semibold flex items-center justify-between"
                >
                  <span>Live ICU Monitoring</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#64748B]" />
                </button>
                <button
                  onClick={() => { setShowSearchModal(false); onNavigateTab('predictive_analytics'); }}
                  className="p-2.5 rounded-lg bg-[#F5F7FA] hover:bg-[#EFF6FF] border border-[#E2E8F0] text-left text-[#0F172A] font-semibold flex items-center justify-between"
                >
                  <span>ML Predictive Analytics</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#64748B]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global AI Assistant Modal */}
      <AIAssistantModal
        isOpen={showAiAssistantModal}
        onClose={() => setShowAiAssistantModal(false)}
        onNavigateWorkspace={(sqlQuery) => {
          setShowAiAssistantModal(false);
          onNavigateTab('query_workspace');
        }}
      />
    </>
  );
};
