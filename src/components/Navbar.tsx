import React from 'react';
import {
  Shield,
  ShieldAlert,
  Activity,
  CheckCircle2,
  FileCode,
  Terminal,
  KeyRound,
  History,
  Code2,
  SlidersHorizontal,
} from 'lucide-react';
import { ActiveTab, PolicyProfile } from '../types';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  pendingApprovalsCount: number;
  blockedCount: number;
  totalEventsCount: number;
  currentProfile: PolicyProfile;
  profiles: PolicyProfile[];
  onSelectProfile: (profile: PolicyProfile) => void;
  onOpenQuickSim: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  pendingApprovalsCount,
  blockedCount,
  totalEventsCount,
  currentProfile,
  profiles,
  onSelectProfile,
  onOpenQuickSim,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 shadow-md">
      {/* Top Banner with Stats & Profile */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20">
              <Shield className="w-6 h-6 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-white">
                  Agent<span className="text-emerald-400">Shield</span>
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5"></span>
                  RUNTIME ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Pre-Execution Action Interception & Policy Enforcement for AI Agents
              </p>
            </div>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex items-center space-x-3">
            {/* Active Policy Selector */}
            <div className="hidden md:flex items-center space-x-2 bg-slate-800/80 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-300">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400">Policy:</span>
              <select
                id="policy-profile-selector"
                value={currentProfile.id}
                onChange={(e) => {
                  const selected = profiles.find((p) => p.id === e.target.value);
                  if (selected) onSelectProfile(selected);
                }}
                className="bg-transparent text-emerald-300 font-medium focus:outline-none cursor-pointer"
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-slate-200">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Metrics Badges */}
            <div className="flex items-center space-x-2">
              <div
                title="Total Intercepted Actions"
                className="flex items-center space-x-1.5 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-md text-xs font-medium text-slate-300"
              >
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>{totalEventsCount}</span>
                <span className="text-slate-400 text-[10px] hidden sm:inline">actions</span>
              </div>

              {blockedCount > 0 && (
                <div
                  title="Blocked Threats"
                  className="flex items-center space-x-1.5 bg-rose-950/60 border border-rose-800/80 px-2.5 py-1 rounded-md text-xs font-semibold text-rose-300"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  <span>{blockedCount}</span>
                  <span className="text-rose-400 text-[10px] hidden sm:inline">blocked</span>
                </div>
              )}

              {pendingApprovalsCount > 0 && (
                <button
                  id="nav-pending-approvals-btn"
                  onClick={() => setActiveTab('approvals')}
                  className="flex items-center space-x-1.5 bg-amber-500/20 border border-amber-500/40 px-2.5 py-1 rounded-md text-xs font-bold text-amber-300 animate-pulse hover:bg-amber-500/30 transition-all cursor-pointer"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span>{pendingApprovalsCount}</span>
                  <span className="hidden sm:inline">Pending HITL</span>
                </button>
              )}
            </div>

            {/* Quick Launch Simulation */}
            <button
              id="nav-run-simulation-btn"
              onClick={onOpenQuickSim}
              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-semibold px-3 py-1.5 rounded-lg text-xs transition-all shadow-sm shadow-emerald-600/30 cursor-pointer"
            >
              <Terminal className="w-3.5 h-3.5 text-slate-950" />
              <span>Simulate Attack</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto pb-2 scrollbar-none text-xs sm:text-sm font-medium border-t border-slate-800/60 pt-2">
          <button
            id="tab-interceptor"
            onClick={() => setActiveTab('interceptor')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-md whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'interceptor'
                ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Action Interceptor</span>
          </button>

          <button
            id="tab-approvals"
            onClick={() => setActiveTab('approvals')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-md whitespace-nowrap transition-colors relative cursor-pointer ${
              activeTab === 'approvals'
                ? 'bg-slate-800 text-amber-400 border border-slate-700 shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-amber-400" />
            <span>Human Approvals (HITL)</span>
            {pendingApprovalsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px]">
                {pendingApprovalsCount}
              </span>
            )}
          </button>

          <button
            id="tab-simulator"
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-md whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'simulator'
                ? 'bg-slate-800 text-cyan-400 border border-slate-700 shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span>Agent Simulation Lab</span>
          </button>

          <button
            id="tab-policies"
            onClick={() => setActiveTab('policies')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-md whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'policies'
                ? 'bg-slate-800 text-indigo-400 border border-slate-700 shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <FileCode className="w-4 h-4 text-indigo-400" />
            <span>Policy Engine & Rules</span>
          </button>

          <button
            id="tab-secrets"
            onClick={() => setActiveTab('secrets')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-md whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'secrets'
                ? 'bg-slate-800 text-rose-400 border border-slate-700 shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <KeyRound className="w-4 h-4 text-rose-400" />
            <span>Secret Shield & DLP</span>
          </button>

          <button
            id="tab-audit"
            onClick={() => setActiveTab('audit')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-md whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-slate-800 text-purple-400 border border-slate-700 shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <History className="w-4 h-4 text-purple-400" />
            <span>Audit Trail & Forensics</span>
          </button>

          <button
            id="tab-sdk"
            onClick={() => setActiveTab('sdk')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-md whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'sdk'
                ? 'bg-slate-800 text-teal-400 border border-slate-700 shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Code2 className="w-4 h-4 text-teal-400" />
            <span>SDK & Middleware</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
