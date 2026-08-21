import React, { useState } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCode,
  Terminal,
  Cpu,
  Lock,
  Sparkles,
  RefreshCw,
  Eye,
  Check,
  Ban,
  Radio,
} from 'lucide-react';
import { AgentActionInterceptEvent } from '../types';

interface HumanApprovalModalProps {
  event: AgentActionInterceptEvent | null;
  onClose: () => void;
  onApproveOnce: (event: AgentActionInterceptEvent, note?: string) => void;
  onApproveAndWhitelist: (event: AgentActionInterceptEvent, note?: string) => void;
  onSanitizeAndApprove: (event: AgentActionInterceptEvent, note?: string) => void;
  onDeny: (event: AgentActionInterceptEvent, reason?: string) => void;
  onQuarantine: (event: AgentActionInterceptEvent, reason?: string) => void;
  onRunGeminiAnalysis?: (event: AgentActionInterceptEvent) => Promise<void>;
  isAnalyzingAi?: boolean;
}

export const HumanApprovalModal: React.FC<HumanApprovalModalProps> = ({
  event,
  onClose,
  onApproveOnce,
  onApproveAndWhitelist,
  onSanitizeAndApprove,
  onDeny,
  onQuarantine,
  onRunGeminiAnalysis,
  isAnalyzingAi = false,
}) => {
  const [adminNote, setAdminNote] = useState('');
  const [activeTab, setActiveTab] = useState<'payload' | 'risk' | 'history'>('payload');

  if (!event) return null;

  const { evaluatedRisk } = event;
  const score = evaluatedRisk.totalScore;

  const getRiskColor = (s: number) => {
    if (s >= 80) return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
    if (s >= 55) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    if (s >= 25) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
    return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  };

  const getRiskBarColor = (score: number, max: number) => {
    const pct = (score / max) * 100;
    if (pct > 70) return 'bg-rose-500';
    if (pct > 40) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div
        id="hitl-approval-modal"
        className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-white">Human-in-the-Loop Action Review</h3>
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                  APPROVAL REQUIRED
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Agent <strong className="text-slate-200">{event.agent}</strong> is requesting execution permission
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border font-mono font-bold text-sm ${getRiskColor(score)}`}>
              <span>Risk Score:</span>
              <span>{score}/100</span>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 text-sm transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Agent Intent & Context Card */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/80 pb-2">
              <div className="flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-slate-200">{event.agent}</span>
                <span className="text-slate-500">({event.agentRole})</span>
              </div>
              <div className="font-mono text-slate-400">Action ID: {event.id}</div>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Stated Task & Prompt Objective:
              </span>
              <p className="text-sm text-slate-200 bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-800">
                "{event.context.task}"
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-xs text-slate-400 font-semibold block mb-0.5">Requested Operation:</span>
                <div className="inline-flex items-center space-x-1.5 bg-slate-900 border border-slate-700/80 px-2.5 py-1 rounded text-xs font-mono text-cyan-300">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>{event.action}</span>
                </div>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-semibold block mb-0.5">Target Resource:</span>
                <div className="font-mono text-xs text-amber-300 bg-slate-900 border border-slate-700/80 px-2.5 py-1 rounded truncate">
                  {event.target || 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Triggered Policy & Reasons */}
          {event.matchedPolicy && (
            <div className="bg-amber-950/30 border border-amber-800/50 rounded-xl p-4 space-y-2">
              <div className="flex items-center space-x-2 text-amber-300 text-xs font-bold uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Policy Triggered: {event.matchedPolicy.name}</span>
              </div>
              <p className="text-xs text-amber-200/90 leading-relaxed">
                {event.matchedPolicy.reason}
              </p>
            </div>
          )}

          {/* AI Threat Analysis Card if available */}
          {evaluatedRisk.aiThreatAnalysis && (
            <div className="bg-gradient-to-r from-indigo-950/40 to-purple-950/40 border border-indigo-800/40 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs font-bold text-indigo-300 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>Gemini 3.7 AI Threat Analysis</span>
                </div>
                <span className="text-[11px] font-semibold text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/30">
                  Confidence: {Math.round((evaluatedRisk.aiThreatAnalysis.confidence || 0.9) * 100)}%
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {evaluatedRisk.aiThreatAnalysis.reasoning}
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {evaluatedRisk.aiThreatAnalysis.threatVectors.map((v, i) => (
                  <span key={i} className="text-[10px] font-mono bg-indigo-900/60 text-indigo-200 px-2 py-0.5 rounded border border-indigo-700/50">
                    🛡️ {v}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tabs for Payload Diff vs Multi-Factor Risk Score vs Action History */}
          <div>
            <div className="flex border-b border-slate-800 space-x-4 mb-3">
              <button
                onClick={() => setActiveTab('payload')}
                className={`pb-2 text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'payload'
                    ? 'border-b-2 border-emerald-400 text-emerald-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Payload & Arguments
              </button>
              <button
                onClick={() => setActiveTab('risk')}
                className={`pb-2 text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'risk'
                    ? 'border-b-2 border-emerald-400 text-emerald-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Multi-Factor Risk Breakdown
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`pb-2 text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'history'
                    ? 'border-b-2 border-emerald-400 text-emerald-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Agent Action Trajectory ({event.context.previous_actions.length})
              </button>
            </div>

            {activeTab === 'payload' && (
              <div className="space-y-3">
                {event.payload.command && (
                  <div>
                    <span className="text-xs text-slate-400 font-semibold block mb-1">Terminal Command:</span>
                    <pre className="bg-slate-950 p-3 rounded-lg text-xs font-mono text-emerald-300 overflow-x-auto border border-slate-800">
                      $ {event.payload.command}
                    </pre>
                  </div>
                )}

                {event.payload.content && (
                  <div>
                    <span className="text-xs text-slate-400 font-semibold block mb-1">File Write Content:</span>
                    <pre className="bg-slate-950 p-3 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto border border-slate-800 max-h-48">
                      {event.payload.content}
                    </pre>
                  </div>
                )}

                {event.payload.url && (
                  <div>
                    <span className="text-xs text-slate-400 font-semibold block mb-1">Network Endpoint:</span>
                    <div className="bg-slate-950 p-3 rounded-lg text-xs font-mono text-cyan-300 border border-slate-800">
                      <span className="text-amber-400 font-bold">{event.payload.method || 'GET'}</span> {event.payload.url}
                    </div>
                  </div>
                )}

                {event.payload.package_name && (
                  <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-500 block">Package Name:</span>
                      <span className="font-mono text-emerald-300 font-bold">{event.payload.package_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Requested Version:</span>
                      <span className="font-mono text-slate-300">{event.payload.version || 'latest'}</span>
                    </div>
                  </div>
                )}

                {evaluatedRisk.detectedSecrets && evaluatedRisk.detectedSecrets.length > 0 && (
                  <div className="bg-rose-950/40 border border-rose-800/60 rounded-lg p-3 space-y-1.5">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-rose-300">
                      <Lock className="w-4 h-4 text-rose-400" />
                      <span>Secrets Discovered in Payload:</span>
                    </div>
                    <div className="space-y-1">
                      {evaluatedRisk.detectedSecrets.map((s, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs bg-slate-950/80 px-2.5 py-1 rounded border border-rose-900/40 font-mono">
                          <span className="text-rose-400">{s.type}</span>
                          <span className="text-slate-400">{s.masked} (Entropy: {s.entropy})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'risk' && (
              <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <div className="space-y-2.5">
                  {evaluatedRisk.factors.map((f, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-medium">{f.name}</span>
                        <span className="font-mono text-slate-400 font-bold">
                          {f.score} / {f.maxScore}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getRiskBarColor(f.score, f.maxScore)} transition-all duration-300`}
                          style={{ width: `${(f.score / f.maxScore) * 100}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-500">{f.description}</p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-800 pt-3">
                  <span className="text-xs font-semibold text-slate-400 block mb-1.5">Risk Factor Evaluation Notes:</span>
                  <ul className="space-y-1">
                    {evaluatedRisk.reasons.map((r, i) => (
                      <li key={i} className="text-xs text-amber-300/90 flex items-start space-x-1.5">
                        <span className="text-amber-500 mt-0.5">•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                {event.context.previous_actions.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No prior actions in this session (First turn).</p>
                ) : (
                  <div className="space-y-1.5">
                    {event.context.previous_actions.map((act, i) => (
                      <div key={i} className="flex items-center space-x-2 text-xs font-mono text-slate-400 bg-slate-900 px-3 py-1.5 rounded border border-slate-800">
                        <span className="text-slate-600 font-bold">{i + 1}.</span>
                        <span className="text-cyan-400">{act}</span>
                        <Check className="w-3.5 h-3.5 text-emerald-500 ml-auto" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Admin Note Input */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">
              Admin Decision Note / Audit Justification (Optional):
            </label>
            <input
              type="text"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="e.g. Verified package integrity on npmjs; standard update."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Modal Footer with Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-slate-800 bg-slate-900/95">
          {/* AI Re-analyze button */}
          {onRunGeminiAnalysis && (
            <button
              onClick={() => onRunGeminiAnalysis(event)}
              disabled={isAnalyzingAi}
              className="flex items-center space-x-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isAnalyzingAi ? 'animate-spin' : ''}`} />
              <span>{isAnalyzingAi ? 'Analyzing with Gemini...' : 'Analyze with Gemini AI'}</span>
            </button>
          )}

          <div className="flex flex-wrap items-center gap-2 ml-auto">
            {/* Quarantine Agent */}
            <button
              onClick={() => onQuarantine(event, adminNote)}
              className="flex items-center space-x-1.5 bg-purple-950/60 hover:bg-purple-900 text-purple-300 border border-purple-800 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              title="Block this and all future actions from this agent session"
            >
              <Radio className="w-3.5 h-3.5 text-purple-400" />
              <span>Quarantine Agent</span>
            </button>

            {/* Deny Action */}
            <button
              onClick={() => onDeny(event, adminNote)}
              className="flex items-center space-x-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              <Ban className="w-3.5 h-3.5 text-rose-400" />
              <span>Deny Action</span>
            </button>

            {/* Sanitize & Approve if secrets detected */}
            {evaluatedRisk.detectedSecrets && evaluatedRisk.detectedSecrets.length > 0 && (
              <button
                onClick={() => onSanitizeAndApprove(event, adminNote)}
                className="flex items-center space-x-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                title="Mask discovered secrets with redaction tokens and execute"
              >
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Sanitize & Approve</span>
              </button>
            )}

            {/* Approve & Whitelist */}
            <button
              onClick={() => onApproveAndWhitelist(event, adminNote)}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              title="Approve this action and add a policy rule to permit it in the future"
            >
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Approve & Whitelist</span>
            </button>

            {/* Approve Once */}
            <button
              onClick={() => onApproveOnce(event, adminNote)}
              className="flex items-center space-x-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-slate-950" />
              <span>Approve Once</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
