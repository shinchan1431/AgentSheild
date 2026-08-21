/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { EventFeed } from './components/EventFeed';
import { HumanApprovalModal } from './components/HumanApprovalModal';
import { AgentSimulator } from './components/AgentSimulator';
import { PolicyEditor } from './components/PolicyEditor';
import { SecretVault } from './components/SecretVault';
import { AuditLogView } from './components/AuditLogView';
import { SdkDocs } from './components/SdkDocs';
import { ActionInspectorModal } from './components/ActionInspectorModal';
import {
  ActiveTab,
  AgentActionInterceptEvent,
  PolicyProfile,
  SecurityPolicyRule,
} from './types';
import { PRESET_PROFILES } from './lib/policyEngine';
import { calculateRiskScore } from './lib/riskScorer';
import { evaluatePolicyRules } from './lib/policyEngine';

// Seed Initial Intercepted Events for immediate richness
const INITIAL_EVENTS: AgentActionInterceptEvent[] = [
  {
    id: 'evt_init_001',
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    agent: 'DevAgent',
    agentRole: 'Fullstack Autonomous Coder',
    action: 'read_file',
    target: 'README.md',
    payload: { filePath: 'README.md' },
    context: {
      task: 'Fix authentication and implement JWT verification middleware',
      previous_actions: [],
    },
    decision: 'allow',
    status: 'allowed',
    evaluatedRisk: calculateRiskScore('read_file', 'README.md', { filePath: 'README.md' }, { task: 'Fix auth', previous_actions: [] }),
    executionDurationMs: 14,
  },
  {
    id: 'evt_init_002',
    timestamp: new Date(Date.now() - 1000 * 60 * 9).toISOString(),
    agent: 'DevAgent',
    agentRole: 'Fullstack Autonomous Coder',
    action: 'install_package',
    target: 'jsonwebtoken@9.0.2',
    payload: { package_name: 'jsonwebtoken', version: '9.0.2', registry: 'https://registry.npmjs.org' },
    context: {
      task: 'Fix authentication and implement JWT verification middleware',
      previous_actions: ['read_file:README.md'],
    },
    decision: 'require_approval',
    status: 'pending_approval',
    evaluatedRisk: calculateRiskScore('install_package', 'jsonwebtoken@9.0.2', { package_name: 'jsonwebtoken' }, { task: 'Fix auth', previous_actions: ['read_file:README.md'] }),
    matchedPolicy: PRESET_PROFILES[0].rules.find((r) => r.id === 'pol_require_approval_package_install'),
    executionDurationMs: 28,
  },
  {
    id: 'evt_init_003',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    agent: 'DevAgent',
    agentRole: 'Fullstack Autonomous Coder',
    action: 'read_file',
    target: '.env',
    payload: { filePath: '.env' },
    context: {
      task: 'Fix authentication and implement JWT verification middleware',
      previous_actions: ['read_file:README.md', 'install_package:jsonwebtoken'],
    },
    decision: 'block',
    status: 'blocked',
    evaluatedRisk: calculateRiskScore('read_file', '.env', { filePath: '.env' }, { task: 'Fix auth', previous_actions: ['read_file:README.md'] }),
    matchedPolicy: PRESET_PROFILES[0].rules.find((r) => r.id === 'pol_block_env_secrets'),
    executionDurationMs: 18,
  },
  {
    id: 'evt_init_004',
    timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    agent: 'PipelineAgent',
    agentRole: 'CI/CD Automation Agent',
    action: 'execute_command',
    target: 'terminal',
    payload: { command: 'rm -rf *' },
    context: {
      task: 'Clean workspace cache prior to build',
      previous_actions: [],
    },
    decision: 'block',
    status: 'blocked',
    evaluatedRisk: calculateRiskScore('execute_command', 'terminal', { command: 'rm -rf *' }, { task: 'Clean workspace', previous_actions: [] }),
    matchedPolicy: PRESET_PROFILES[0].rules.find((r) => r.id === 'pol_block_destructive_commands'),
    executionDurationMs: 22,
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('interceptor');
  const [profiles, setProfiles] = useState<PolicyProfile[]>(PRESET_PROFILES);
  const [currentProfile, setCurrentProfile] = useState<PolicyProfile>(PRESET_PROFILES[0]);
  const [events, setEvents] = useState<AgentActionInterceptEvent[]>(INITIAL_EVENTS);

  const [selectedApprovalEvent, setSelectedApprovalEvent] = useState<AgentActionInterceptEvent | null>(null);
  const [selectedInspectEvent, setSelectedInspectEvent] = useState<AgentActionInterceptEvent | null>(null);
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const pendingApprovalsCount = events.filter((e) => e.status === 'pending_approval').length;
  const blockedCount = events.filter((e) => e.status === 'blocked' || e.status === 'denied').length;

  const handleEventIntercepted = (event: AgentActionInterceptEvent) => {
    setEvents((prev) => [event, ...prev]);
    if (event.decision === 'require_approval') {
      showToast(`⚠️ Action Intercepted: Agent ${event.agent} requires human approval for '${event.action}'`);
    } else if (event.decision === 'block') {
      showToast(`🛑 Action Blocked: Prohibited operation '${event.action}' on '${event.target}'`);
    }
  };

  const handleApproveOnce = (event: AgentActionInterceptEvent, note?: string) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === event.id
          ? {
              ...e,
              status: 'approved',
              approvalDetails: {
                decidedBy: 'Admin User (HITL)',
                decidedAt: new Date().toISOString(),
                decision: 'approved',
                note,
              },
            }
          : e
      )
    );
    setSelectedApprovalEvent(null);
    showToast(`✅ Action Approved: Agent ${event.agent} permitted to execute '${event.action}'`);
  };

  const handleApproveAndWhitelist = (event: AgentActionInterceptEvent, note?: string) => {
    // 1. Approve event
    handleApproveOnce(event, note);

    // 2. Add whitelist rule to current profile
    const whitelistRule: SecurityPolicyRule = {
      id: `rule_whitelist_${Date.now()}`,
      name: `Allowlist: ${event.action} -> ${event.target}`,
      enabled: true,
      action: event.action,
      targetPattern: event.target,
      decision: 'allow',
      reason: `Auto-whitelisted by admin approval: ${note || 'Admin permitted'}`,
      severity: 'low',
      tags: ['whitelisted', 'hitl-approved'],
      isCustom: true,
    };

    const updatedRules = [whitelistRule, ...currentProfile.rules];
    const updatedProfile = { ...currentProfile, rules: updatedRules };

    setCurrentProfile(updatedProfile);
    setProfiles((prev) => prev.map((p) => (p.id === currentProfile.id ? updatedProfile : p)));
    showToast(`🛡️ Whitelist Rule Created: Permitted future ${event.action} on '${event.target}'`);
  };

  const handleSanitizeAndApprove = (event: AgentActionInterceptEvent, note?: string) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === event.id
          ? {
              ...e,
              status: 'approved',
              approvalDetails: {
                decidedBy: 'Admin User (Sanitized)',
                decidedAt: new Date().toISOString(),
                decision: 'approved',
                note: `Secrets auto-redacted before approval. ${note || ''}`,
              },
            }
          : e
      )
    );
    setSelectedApprovalEvent(null);
    showToast(`🔒 Sanitized & Approved: Secrets masked before execution permitted.`);
  };

  const handleDeny = (event: AgentActionInterceptEvent, reason?: string) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === event.id
          ? {
              ...e,
              status: 'denied',
              approvalDetails: {
                decidedBy: 'Admin User (HITL)',
                decidedAt: new Date().toISOString(),
                decision: 'denied',
                note: reason || 'Operation denied by security administrator.',
              },
            }
          : e
      )
    );
    setSelectedApprovalEvent(null);
    showToast(`🛑 Action Denied: Interception prevented execution.`);
  };

  const handleQuarantine = (event: AgentActionInterceptEvent, reason?: string) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.agent === event.agent
          ? {
              ...e,
              status: 'quarantined',
              approvalDetails: {
                decidedBy: 'Admin User (Quarantine)',
                decidedAt: new Date().toISOString(),
                decision: 'quarantined',
                note: reason || 'Agent session quarantined due to suspicious lateral activity.',
              },
            }
          : e
      )
    );
    setSelectedApprovalEvent(null);
    showToast(`🚨 Agent Quarantined: All operations from '${event.agent}' are suspended.`);
  };

  const handleRunGeminiAnalysis = async (event: AgentActionInterceptEvent) => {
    setIsAnalyzingAi(true);
    try {
      const resp = await fetch('/api/gemini/analyze-threat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: event.action,
          target: event.target,
          payload: event.payload,
          context: event.context,
          heuristicRisk: event.evaluatedRisk.totalScore,
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.analysis) {
          const updatedEvent: AgentActionInterceptEvent = {
            ...event,
            evaluatedRisk: {
              ...event.evaluatedRisk,
              aiThreatAnalysis: data.analysis,
            },
          };

          setEvents((prev) => prev.map((e) => (e.id === event.id ? updatedEvent : e)));
          setSelectedApprovalEvent(updatedEvent);
          showToast(`✨ Gemini 3.7 AI Threat Analysis complete.`);
        }
      }
    } catch (err) {
      console.error('Gemini analysis error:', err);
      showToast('⚠️ AI Threat Analysis encountered an issue.');
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  const handleUpdateRuleToggle = (ruleId: string, enabled: boolean) => {
    const updatedRules = currentProfile.rules.map((r) => (r.id === ruleId ? { ...r, enabled } : r));
    const updatedProfile = { ...currentProfile, rules: updatedRules };
    setCurrentProfile(updatedProfile);
    setProfiles((prev) => prev.map((p) => (p.id === currentProfile.id ? updatedProfile : p)));
    showToast(`Policy Rule ${enabled ? 'Enabled' : 'Disabled'}`);
  };

  const handleAddRule = (rule: SecurityPolicyRule) => {
    const updatedRules = [rule, ...currentProfile.rules];
    const updatedProfile = { ...currentProfile, rules: updatedRules };
    setCurrentProfile(updatedProfile);
    setProfiles((prev) => prev.map((p) => (p.id === currentProfile.id ? updatedProfile : p)));
    showToast(`Custom Rule '${rule.name}' added to policy.`);
  };

  const handleDeleteRule = (ruleId: string) => {
    const updatedRules = currentProfile.rules.filter((r) => r.id !== ruleId);
    const updatedProfile = { ...currentProfile, rules: updatedRules };
    setCurrentProfile(updatedProfile);
    setProfiles((prev) => prev.map((p) => (p.id === currentProfile.id ? updatedProfile : p)));
    showToast(`Rule deleted.`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 border border-slate-700 text-slate-100 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-medium flex items-center space-x-2 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingApprovalsCount={pendingApprovalsCount}
        blockedCount={blockedCount}
        totalEventsCount={events.length}
        currentProfile={currentProfile}
        profiles={profiles}
        onSelectProfile={(p) => {
          setCurrentProfile(p);
          showToast(`Active Policy Profile: ${p.name}`);
        }}
        onOpenQuickSim={() => setActiveTab('simulator')}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'interceptor' && (
          <EventFeed
            events={events}
            onReviewEvent={(evt) => setSelectedApprovalEvent(evt)}
            onInspectEvent={(evt) => setSelectedInspectEvent(evt)}
            onQuickApprove={(evt) => handleApproveOnce(evt)}
            onQuickDeny={(evt) => handleDeny(evt)}
            onClearEvents={() => setEvents([])}
          />
        )}

        {activeTab === 'approvals' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Human-in-the-Loop (HITL) Approvals Queue
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Medium- and high-risk agent operations paused at runtime awaiting administrator review before tool invocation.
              </p>
            </div>

            {events.filter((e) => e.status === 'pending_approval').length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 font-bold">
                  ✓
                </div>
                <h3 className="text-base font-semibold text-slate-200">No Pending Approvals</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  All intercepted agent actions have been processed. Trigger an attack scenario in the Agent Simulation Lab to test the approval workflow.
                </p>
              </div>
            ) : (
              <EventFeed
                events={events.filter((e) => e.status === 'pending_approval')}
                onReviewEvent={(evt) => setSelectedApprovalEvent(evt)}
                onInspectEvent={(evt) => setSelectedInspectEvent(evt)}
                onQuickApprove={(evt) => handleApproveOnce(evt)}
                onQuickDeny={(evt) => handleDeny(evt)}
                onClearEvents={() => setEvents([])}
              />
            )}
          </div>
        )}

        {activeTab === 'simulator' && (
          <AgentSimulator
            currentProfile={currentProfile}
            onEventIntercepted={handleEventIntercepted}
            onOpenApprovalModal={(evt) => setSelectedApprovalEvent(evt)}
          />
        )}

        {activeTab === 'policies' && (
          <PolicyEditor
            currentProfile={currentProfile}
            profiles={profiles}
            onSelectProfile={setCurrentProfile}
            onUpdateRuleToggle={handleUpdateRuleToggle}
            onAddRule={handleAddRule}
            onDeleteRule={handleDeleteRule}
          />
        )}

        {activeTab === 'secrets' && <SecretVault />}

        {activeTab === 'audit' && (
          <AuditLogView events={events} onInspectEvent={(evt) => setSelectedInspectEvent(evt)} />
        )}

        {activeTab === 'sdk' && <SdkDocs />}
      </main>

      {/* HITL Modal */}
      {selectedApprovalEvent && (
        <HumanApprovalModal
          event={selectedApprovalEvent}
          onClose={() => setSelectedApprovalEvent(null)}
          onApproveOnce={handleApproveOnce}
          onApproveAndWhitelist={handleApproveAndWhitelist}
          onSanitizeAndApprove={handleSanitizeAndApprove}
          onDeny={handleDeny}
          onQuarantine={handleQuarantine}
          onRunGeminiAnalysis={handleRunGeminiAnalysis}
          isAnalyzingAi={isAnalyzingAi}
        />
      )}

      {/* Forensic Inspection Modal */}
      {selectedInspectEvent && (
        <ActionInspectorModal
          event={selectedInspectEvent}
          onClose={() => setSelectedInspectEvent(null)}
        />
      )}
    </div>
  );
}
