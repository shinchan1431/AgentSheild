import React, { useState } from 'react';
import {
  History,
  Download,
  Search,
  Filter,
  BarChart2,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Clock,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { AgentActionInterceptEvent } from '../types';

interface AuditLogViewProps {
  events: AgentActionInterceptEvent[];
  onInspectEvent: (event: AgentActionInterceptEvent) => void;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ events, onInspectEvent }) => {
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('all');

  const filtered = events.filter((e) => {
    if (filterAction !== 'all' && e.action !== filterAction) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        e.agent.toLowerCase().includes(q) ||
        e.target.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q) ||
        e.context.task.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalEvents = events.length;
  const blockedEvents = events.filter((e) => e.status === 'blocked' || e.status === 'denied').length;
  const approvedEvents = events.filter((e) => e.status === 'approved').length;
  const allowedEvents = events.filter((e) => e.status === 'allowed').length;
  const pendingEvents = events.filter((e) => e.status === 'pending_approval').length;

  const avgRiskScore =
    totalEvents > 0
      ? Math.round(events.reduce((acc, e) => acc + e.evaluatedRisk.totalScore, 0) / totalEvents)
      : 0;

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(events, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `agentshield_audit_log_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Timestamp', 'Agent', 'Action', 'Target', 'Status', 'Decision', 'RiskScore', 'PolicyRule'];
    const rows = events.map((e) => [
      e.id,
      e.timestamp,
      `"${e.agent}"`,
      e.action,
      `"${e.target}"`,
      e.status,
      e.decision,
      e.evaluatedRisk.totalScore,
      `"${e.matchedPolicy?.name || 'N/A'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', encodeURI(csvContent));
    downloadAnchor.setAttribute('download', `agentshield_audit_log_${Date.now()}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-white tracking-tight">Security Telemetry & Compliance Audit Trail</h2>
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-purple-500/10 text-purple-400 rounded border border-purple-500/30">
                Immutable Ledger
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Complete forensic history of intercepted autonomous agent actions, risk breakdowns, human approvals, and policy enforcements.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleExportJSON}
              className="flex items-center space-x-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>
          </div>
        </div>

        {/* Security Metric Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4 pt-4 border-t border-slate-800/80">
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 font-medium block">Total Evaluated</span>
            <span className="text-lg font-bold text-white font-mono">{totalEvents}</span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-rose-400 font-medium block">Threats Blocked</span>
            <span className="text-lg font-bold text-rose-400 font-mono">{blockedEvents}</span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-amber-400 font-medium block">HITL Approvals</span>
            <span className="text-lg font-bold text-amber-400 font-mono">{approvedEvents}</span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-emerald-400 font-medium block">Direct Allowed</span>
            <span className="text-lg font-bold text-emerald-400 font-mono">{allowedEvents}</span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-cyan-400 font-medium block">Mean Risk Score</span>
            <span className="text-lg font-bold text-cyan-400 font-mono">{avgRiskScore}/100</span>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row gap-3 justify-between items-center bg-slate-900/60">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search audit trail..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="text-xs text-slate-500">Action:</span>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
            >
              <option value="all">All Actions</option>
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
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Agent</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target / Resource</th>
                <th className="py-3 px-4">Decision</th>
                <th className="py-3 px-4">Risk</th>
                <th className="py-3 px-4">Policy Trigger</th>
                <th className="py-3 px-4 text-right">Forensics</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 font-sans">
                    No matching audit records in ledger.
                  </td>
                </tr>
              ) : (
                filtered.map((evt) => {
                  return (
                    <tr key={evt.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-4 text-slate-200 font-sans font-medium">{evt.agent}</td>
                      <td className="py-3 px-4 text-cyan-400">{evt.action}</td>
                      <td className="py-3 px-4 text-amber-300 max-w-xs truncate">{evt.target || 'N/A'}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            evt.status === 'blocked' || evt.status === 'denied'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : evt.status === 'approved'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : evt.status === 'pending_approval'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {evt.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={
                            evt.evaluatedRisk.totalScore > 75
                              ? 'text-rose-400 font-bold'
                              : evt.evaluatedRisk.totalScore > 40
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }
                        >
                          {evt.evaluatedRisk.totalScore}/100
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-sans truncate max-w-xs">
                        {evt.matchedPolicy?.name || 'Default Baseline'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => onInspectEvent(evt)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-sans transition-colors cursor-pointer"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
