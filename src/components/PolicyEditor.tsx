import React, { useState } from 'react';
import {
  FileCode,
  SlidersHorizontal,
  Plus,
  Trash2,
  Check,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Code2,
  Copy,
  Download,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import {
  PolicyProfile,
  SecurityPolicyRule,
  AgentActionType,
  PolicyDecision,
  RiskLevel,
} from '../types';

interface PolicyEditorProps {
  currentProfile: PolicyProfile;
  profiles: PolicyProfile[];
  onSelectProfile: (profile: PolicyProfile) => void;
  onUpdateRuleToggle: (ruleId: string, enabled: boolean) => void;
  onAddRule: (rule: SecurityPolicyRule) => void;
  onDeleteRule: (ruleId: string) => void;
}

export const PolicyEditor: React.FC<PolicyEditorProps> = ({
  currentProfile,
  profiles,
  onSelectProfile,
  onUpdateRuleToggle,
  onAddRule,
  onDeleteRule,
}) => {
  const [viewMode, setViewMode] = useState<'visual' | 'yaml'>('visual');
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [copiedYaml, setCopiedYaml] = useState(false);

  // New Rule Form State
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleAction, setNewRuleAction] = useState<AgentActionType | '*'>('read_file');
  const [newRuleTarget, setNewRuleTarget] = useState('');
  const [newRuleCommand, setNewRuleCommand] = useState('');
  const [newRuleDecision, setNewRuleDecision] = useState<PolicyDecision>('block');
  const [newRuleSeverity, setNewRuleSeverity] = useState<RiskLevel>('high');
  const [newRuleReason, setNewRuleReason] = useState('');
  const [newRuleTags, setNewRuleTags] = useState('custom, security');

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim() || !newRuleReason.trim()) return;

    const rule: SecurityPolicyRule = {
      id: `rule_custom_${Date.now()}`,
      name: newRuleName.trim(),
      enabled: true,
      action: newRuleAction,
      targetPattern: newRuleTarget.trim() || undefined,
      commandPattern: newRuleCommand.trim() || undefined,
      decision: newRuleDecision,
      reason: newRuleReason.trim(),
      severity: newRuleSeverity,
      tags: newRuleTags.split(',').map((t) => t.trim()).filter(Boolean),
      isCustom: true,
    };

    onAddRule(rule);
    setIsAddingRule(false);
    // Reset form
    setNewRuleName('');
    setNewRuleTarget('');
    setNewRuleCommand('');
    setNewRuleReason('');
  };

  const generateYaml = () => {
    return `# AgentShield Security Policy Configuration
version: "1.0.0"
profile: "${currentProfile.id}"
profile_name: "${currentProfile.name}"
default_decision: "${currentProfile.defaultDecision}"

secret_deny_list:
${currentProfile.secretDenyList.map((s) => `  - "${s}"`).join('\n')}

policies:
${currentProfile.rules
  .map(
    (r) => `  - id: "${r.id}"
    name: "${r.name}"
    enabled: ${r.enabled}
    action: "${r.action}"
${r.targetPattern ? `    target: "${r.targetPattern}"\n` : ''}${r.commandPattern ? `    command_pattern: "${r.commandPattern}"\n` : ''}    decision: "${r.decision}"
    severity: "${r.severity}"
    reason: "${r.reason}"
    tags: [${r.tags.map((t) => `"${t}"`).join(', ')}]`
  )
  .join('\n\n')}
`;
  };

  const handleCopyYaml = () => {
    navigator.clipboard.writeText(generateYaml());
    setCopiedYaml(true);
    setTimeout(() => setCopiedYaml(false), 2000);
  };

  const getDecisionBadge = (decision: PolicyDecision) => {
    switch (decision) {
      case 'allow':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            ALLOW
          </span>
        );
      case 'block':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            BLOCK
          </span>
        );
      case 'require_approval':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
            REQUIRE APPROVAL
          </span>
        );
      case 'quarantine':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/30">
            QUARANTINE
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-white tracking-tight">Deterministic Policy Engine & Rules</h2>
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 rounded border border-indigo-500/30">
                {currentProfile.rules.length} Rules Active
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Deterministic, explainable security policies evaluated prior to agent execution. Avoids reliance on unverified LLM security self-assessment.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {/* View Mode Toggle */}
            <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setViewMode('visual')}
                className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  viewMode === 'visual'
                    ? 'bg-slate-800 text-emerald-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Visual Rules
              </button>
              <button
                onClick={() => setViewMode('yaml')}
                className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  viewMode === 'yaml'
                    ? 'bg-slate-800 text-emerald-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                YAML Config
              </button>
            </div>

            <button
              onClick={() => setIsAddingRule(true)}
              className="flex items-center space-x-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3.5 py-1.5 rounded-lg text-xs transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4 text-slate-950" />
              <span>Add Custom Rule</span>
            </button>
          </div>
        </div>

        {/* Profile Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-800/80">
          {profiles.map((prof) => {
            const isSelected = prof.id === currentProfile.id;
            return (
              <button
                key={prof.id}
                onClick={() => onSelectProfile(prof)}
                className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800 border-indigo-500/60 shadow-sm shadow-indigo-500/10'
                    : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{prof.name}</span>
                  {isSelected && <span className="w-2 h-2 rounded-full bg-emerald-400"></span>}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{prof.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Add Custom Rule Form Modal */}
      {isAddingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <form
            onSubmit={handleCreateRule}
            className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Create Custom Security Policy Rule</h3>
              <button
                type="button"
                onClick={() => setIsAddingRule(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Rule Name:</label>
                <input
                  type="text"
                  required
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  placeholder="e.g. Block Database Migration Rollback"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Action Type:</label>
                  <select
                    value={newRuleAction}
                    onChange={(e) => setNewRuleAction(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="*">* Any Action</option>
                    <option value="read_file">read_file</option>
                    <option value="write_file">write_file</option>
                    <option value="execute_command">execute_command</option>
                    <option value="install_package">install_package</option>
                    <option value="network_request">network_request</option>
                    <option value="access_secret">access_secret</option>
                    <option value="git_push">git_push</option>
                    <option value="database_operation">database_operation</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Enforcement Decision:</label>
                  <select
                    value={newRuleDecision}
                    onChange={(e) => setNewRuleDecision(e.target.value as PolicyDecision)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="block">block</option>
                    <option value="require_approval">require_approval</option>
                    <option value="allow">allow</option>
                    <option value="quarantine">quarantine</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Target Match Pattern (Glob / Regex):</label>
                <input
                  type="text"
                  value={newRuleTarget}
                  onChange={(e) => setNewRuleTarget(e.target.value)}
                  placeholder="e.g. *.sql|migrations/*|src/crypto/**"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono text-amber-300 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Command Regex Pattern (Optional):</label>
                <input
                  type="text"
                  value={newRuleCommand}
                  onChange={(e) => setNewRuleCommand(e.target.value)}
                  placeholder="e.g. (?i)(DROP\\s+TABLE|ALTER\\s+TABLE)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono text-emerald-300 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Policy Rationale / Reason:</label>
                <textarea
                  rows={2}
                  required
                  value={newRuleReason}
                  onChange={(e) => setNewRuleReason(e.target.value)}
                  placeholder="Explain why this policy decision is enforced"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsAddingRule(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs hover:bg-emerald-400 transition-colors"
              >
                Save Policy Rule
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Rules Content */}
      {viewMode === 'visual' ? (
        <div className="space-y-3">
          {currentProfile.rules.map((rule) => {
            return (
              <div
                key={rule.id}
                className={`bg-slate-900 border rounded-xl p-4 transition-all ${
                  rule.enabled ? 'border-slate-800' : 'border-slate-800/50 opacity-60'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-white">{rule.name}</span>
                      {getDecisionBadge(rule.decision)}
                      <span className="px-2 py-0.5 rounded bg-slate-950 text-slate-300 font-mono text-[10px] border border-slate-800">
                        action: {rule.action}
                      </span>
                      {rule.tags.map((t, idx) => (
                        <span key={idx} className="text-[10px] text-slate-500 bg-slate-800/80 px-1.5 py-0.2 rounded">
                          #{t}
                        </span>
                      ))}
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">{rule.reason}</p>

                    <div className="flex flex-wrap gap-2 text-xs pt-1">
                      {rule.targetPattern && (
                        <div className="font-mono text-[11px] text-amber-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          target: {rule.targetPattern}
                        </div>
                      )}
                      {rule.commandPattern && (
                        <div className="font-mono text-[11px] text-emerald-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          pattern: /{rule.commandPattern}/
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0 pt-2 sm:pt-0">
                    {/* Enable / Disable Toggle */}
                    <button
                      onClick={() => onUpdateRuleToggle(rule.id, !rule.enabled)}
                      className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                      title={rule.enabled ? 'Disable Rule' : 'Enable Rule'}
                    >
                      {rule.enabled ? (
                        <ToggleRight className="w-6 h-6 text-emerald-400" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-slate-600" />
                      )}
                    </button>

                    {rule.isCustom && (
                      <button
                        onClick={() => onDeleteRule(rule.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                        title="Delete Rule"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-mono text-slate-400">agentshield-policy.yaml</span>
            <button
              onClick={handleCopyYaml}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              {copiedYaml ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedYaml ? 'Copied YAML' : 'Copy YAML'}</span>
            </button>
          </div>
          <pre className="text-xs font-mono text-emerald-300 overflow-x-auto p-2 max-h-[500px]">
            {generateYaml()}
          </pre>
        </div>
      )}
    </div>
  );
};
