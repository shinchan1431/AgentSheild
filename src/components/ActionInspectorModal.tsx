import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  FileCode,
  Terminal,
  Cpu,
  Lock,
  Sparkles,
  Check,
  Copy,
  Clock,
  Radio,
} from 'lucide-react';
import { AgentActionInterceptEvent } from '../types';

interface ActionInspectorModalProps {
  event: AgentActionInterceptEvent | null;
  onClose: () => void;
}

export const ActionInspectorModal: React.FC<ActionInspectorModalProps> = ({ event, onClose }) => {
  const [copiedRaw, setCopiedRaw] = useState(false);

  if (!event) return null;

  const handleCopyRaw = () => {
    navigator.clipboard.writeText(JSON.stringify(event, null, 2));
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div
        id="action-inspector-modal"
        className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-cyan-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white">Event Forensics & Action Inspection</h3>
                <span className="font-mono text-[11px] text-slate-500">{event.id}</span>
              </div>
              <p className="text-xs text-slate-400">
                Agent <strong className="text-slate-200">{event.agent}</strong> — {new Date(event.timestamp).toLocaleString()}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto text-xs">
          {/* Summary status pill */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center space-x-2">
              <span className="text-slate-400 font-semibold">Evaluation Status:</span>
              <span
                className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase ${
                  event.status === 'blocked' || event.status === 'denied'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : event.status === 'approved' || event.status === 'allowed'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}
              >
                {event.status}
              </span>
            </div>

            <div className="flex items-center space-x-2 font-mono">
              <span className="text-slate-500">Latency:</span>
              <span className="text-emerald-400">{event.executionDurationMs || 24} ms</span>
              <span className="text-slate-500 ml-2">Risk:</span>
              <span className="text-white font-bold">{event.evaluatedRisk.totalScore}/100</span>
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Agent Identifier:</span>
              <span className="text-slate-200 font-bold">{event.agent}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Action Type:</span>
              <span className="text-cyan-400 font-bold">{event.action}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Target Resource:</span>
              <span className="text-amber-300 truncate block">{event.target || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Policy Triggered:</span>
              <span className="text-slate-300 truncate block">{event.matchedPolicy?.name || 'Baseline Policy'}</span>
            </div>
          </div>

          {/* Task context */}
          <div>
            <span className="text-slate-400 font-semibold block mb-1">Declared Task Context:</span>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-slate-300">
              "{event.context.task}"
            </div>
          </div>

          {/* Payload */}
          {event.payload.command && (
            <div>
              <span className="text-slate-400 font-semibold block mb-1">Command String:</span>
              <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-emerald-300 font-mono overflow-x-auto">
                $ {event.payload.command}
              </pre>
            </div>
          )}

          {/* AI Analysis if present */}
          {event.evaluatedRisk.aiThreatAnalysis && (
            <div className="bg-indigo-950/40 border border-indigo-800/40 p-4 rounded-xl space-y-2">
              <div className="flex items-center space-x-1.5 text-indigo-300 font-bold">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>Gemini 3.7 AI Threat Analysis</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                {event.evaluatedRisk.aiThreatAnalysis.reasoning}
              </p>
              <div className="font-mono text-[11px] text-indigo-400">
                Directive: {event.evaluatedRisk.aiThreatAnalysis.recommendation}
              </div>
            </div>
          )}

          {/* Raw JSON viewer */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-400 font-semibold">Raw Structured Event Payload:</span>
              <button
                onClick={handleCopyRaw}
                className="flex items-center space-x-1 text-slate-400 hover:text-slate-200"
              >
                {copiedRaw ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedRaw ? 'Copied' : 'Copy JSON'}</span>
              </button>
            </div>
            <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-48">
              {JSON.stringify(event, null, 2)}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-3 border-t border-slate-800 bg-slate-900/95">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
