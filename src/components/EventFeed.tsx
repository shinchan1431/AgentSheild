import React, { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCode,
  Terminal,
  Search,
  Filter,
  ArrowRight,
  Eye,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Radio,
  Sparkles,
  Lock,
  ChevronRight,
  Clock,
  Cpu,
} from 'lucide-react';
import {
  AgentActionInterceptEvent,
  AgentActionType,
  RiskLevel,
} from '../types';

interface EventFeedProps {
  events: AgentActionInterceptEvent[];
  onReviewEvent: (event: AgentActionInterceptEvent) => void;
  onInspectEvent: (event: AgentActionInterceptEvent) => void;
  onQuickApprove: (event: AgentActionInterceptEvent) => void;
  onQuickDeny: (event: AgentActionInterceptEvent) => void;
  onClearEvents: () => void;
}

export const EventFeed: React.FC<EventFeedProps> = ({
  events,
  onReviewEvent,
  onInspectEvent,
  onQuickApprove,
  onQuickDeny,
  onClearEvents,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredEvents = events.filter((evt) => {
    if (filterStatus !== 'all' && evt.status !== filterStatus) return false;
    if (filterAction !== 'all' && evt.action !== filterAction) return false;
    if (filterRisk !== 'all' && evt.evaluatedRisk.riskLevel !== filterRisk) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTarget = evt.target?.toLowerCase().includes(q);
      const matchAgent = evt.agent?.toLowerCase().includes(q);
      const matchTask = evt.context?.task?.toLowerCase().includes(q);
      const matchCmd = evt.payload?.command?.toLowerCase().includes(q);
      const matchPolicy = evt.matchedPolicy?.name?.toLowerCase().includes(q);
      return matchTarget || matchAgent || matchTask || matchCmd || matchPolicy;
    }

    return true;
  });

  const getActionIcon = (action: AgentActionType) => {
    switch (action) {
      case 'read_file':
        return <FileCode className="w-3.5 h-3.5 text-cyan-400" />;
      case 'write_file':
        return <FileCode className="w-3.5 h-3.5 text-emerald-400" />;
      case 'execute_command':
        return <Terminal className="w-3.5 h-3.5 text-amber-400" />;
      case 'install_package':
        return <Activity className="w-3.5 h-3.5 text-purple-400" />;
      case 'network_request':
        return <Radio className="w-3.5 h-3.5 text-indigo-400" />;
      case 'access_secret':
        return <Lock className="w-3.5 h-3.5 text-rose-400" />;
      case 'git_push':
        return <ChevronRight className="w-3.5 h-3.5 text-teal-400" />;
      case 'database_operation':
        return <Cpu className="w-3.5 h-3.5 text-yellow-400" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const getStatusBadge = (status: AgentActionInterceptEvent['status']) => {
    switch (status) {
      case 'allowed':
      case 'approved':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="w-3 h-3" />
            <span className="uppercase">{status === 'approved' ? 'HITL Approved' : 'Allowed'}</span>
          </span>
        );
      case 'blocked':
      case 'denied':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <ShieldX className="w-3 h-3" />
            <span className="uppercase">{status === 'denied' ? 'HITL Denied' : 'Blocked'}</span>
          </span>
        );
      case 'pending_approval':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
            <ShieldAlert className="w-3 h-3" />
            <span>PENDING HITL</span>
          </span>
        );
      case 'quarantined':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
            <Radio className="w-3 h-3" />
            <span>QUARANTINED</span>
          </span>
        );
    }
  };

  const getRiskScorePill = (score: number, level: RiskLevel) => {
    let colorClass = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (score >= 80) colorClass = 'text-rose-400 bg-rose-500/10 border-rose-500/30 font-bold';
    else if (score >= 55) colorClass = 'text-amber-400 bg-amber-500/10 border-amber-500/30 font-semibold';
    else if (score >= 25) colorClass = 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';

    return (
      <div className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs border font-mono ${colorClass}`}>
        <span>Risk:</span>
        <span className="font-bold">{score}/100</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-white tracking-tight">Live Action Interception Stream</h2>
              <span className="px-2 py-0.5 text-[11px] font-mono bg-slate-800 text-slate-300 rounded border border-slate-700">
                {events.length} Total Logged
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time pre-execution evaluation for agent tools, subprocess calls, network requests, and filesystem access.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClearEvents}
              className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800/80 transition-colors cursor-pointer"
            >
              Clear Log
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800/80 text-xs">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search target, command, agent..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent text-slate-200 font-medium focus:outline-none w-full cursor-pointer"
            >
              <option value="all" className="bg-slate-900">All Statuses</option>
              <option value="pending_approval" className="bg-slate-900">Pending Approval</option>
              <option value="allowed" className="bg-slate-900">Allowed</option>
              <option value="blocked" className="bg-slate-900">Blocked</option>
              <option value="approved" className="bg-slate-900">Approved</option>
              <option value="denied" className="bg-slate-900">Denied</option>
              <option value="quarantined" className="bg-slate-900">Quarantined</option>
            </select>
          </div>

          {/* Action Filter */}
          <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5">
            <span className="text-slate-500">Action:</span>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="bg-transparent text-slate-200 font-medium focus:outline-none w-full cursor-pointer"
            >
              <option value="all" className="bg-slate-900">All Actions</option>
              <option value="read_file" className="bg-slate-900">read_file</option>
              <option value="write_file" className="bg-slate-900">write_file</option>
              <option value="execute_command" className="bg-slate-900">execute_command</option>
              <option value="install_package" className="bg-slate-900">install_package</option>
              <option value="network_request" className="bg-slate-900">network_request</option>
              <option value="access_secret" className="bg-slate-900">access_secret</option>
              <option value="git_push" className="bg-slate-900">git_push</option>
              <option value="database_operation" className="bg-slate-900">database_operation</option>
            </select>
          </div>

          {/* Risk Level Filter */}
          <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5">
            <span className="text-slate-500">Risk:</span>
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
              className="bg-transparent text-slate-200 font-medium focus:outline-none w-full cursor-pointer"
            >
              <option value="all" className="bg-slate-900">All Risk Levels</option>
              <option value="critical" className="bg-slate-900">Critical (80-100)</option>
              <option value="high" className="bg-slate-900">High (55-79)</option>
              <option value="medium" className="bg-slate-900">Medium (25-54)</option>
              <option value="low" className="bg-slate-900">Low (0-24)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Events List */}
      {filteredEvents.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <Activity className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-semibold text-slate-300">No Intercepted Events Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            No agent actions match the active filter criteria. Run an attack scenario in the Agent Simulation Lab or submit custom agent actions to watch AgentShield evaluate operations live.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEvents.map((evt) => {
            const isPending = evt.status === 'pending_approval';
            const isBlocked = evt.status === 'blocked' || evt.status === 'denied';

            return (
              <div
                key={evt.id}
                id={`event-card-${evt.id}`}
                className={`bg-slate-900 border rounded-xl p-4 transition-all hover:border-slate-700 shadow-sm ${
                  isPending
                    ? 'border-amber-500/50 bg-amber-950/10 shadow-amber-500/5'
                    : isBlocked
                    ? 'border-rose-900/40'
                    : 'border-slate-800'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  {/* Event Left Side Info */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {/* Timestamp */}
                      <span className="text-slate-500 font-mono text-[11px] flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-slate-600" />
                        <span>{new Date(evt.timestamp).toLocaleTimeString()}</span>
                      </span>

                      {/* Agent Badge */}
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-medium text-[11px] border border-slate-700">
                        <Cpu className="w-3 h-3 text-emerald-400" />
                        <span>{evt.agent}</span>
                      </span>

                      {/* Action Pill */}
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-950 text-cyan-300 font-mono text-[11px] border border-slate-800">
                        {getActionIcon(evt.action)}
                        <span>{evt.action}</span>
                      </span>

                      {/* Status */}
                      {getStatusBadge(evt.status)}

                      {/* Risk Score */}
                      {getRiskScorePill(evt.evaluatedRisk.totalScore, evt.evaluatedRisk.riskLevel)}

                      {evt.evaluatedRisk.detectedSecrets.length > 0 && (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[11px] font-semibold border border-rose-500/40">
                          <Lock className="w-3 h-3" />
                          <span>Secret Detected</span>
                        </span>
                      )}

                      {evt.evaluatedRisk.aiThreatAnalysis && (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[11px] font-semibold border border-indigo-500/40">
                          <Sparkles className="w-3 h-3" />
                          <span>AI Analyzed</span>
                        </span>
                      )}
                    </div>

                    {/* Target & Command / Payload snippet */}
                    <div className="space-y-1">
                      <div className="flex items-baseline space-x-2">
                        <span className="text-xs font-semibold text-slate-400">Target:</span>
                        <span className="font-mono text-xs text-amber-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 truncate max-w-xl">
                          {evt.target || evt.payload.filePath || 'N/A'}
                        </span>
                      </div>

                      {evt.payload.command && (
                        <div className="flex items-center space-x-2 font-mono text-xs text-slate-300 bg-slate-950 px-2.5 py-1 rounded border border-slate-800/80 truncate">
                          <span className="text-emerald-400 font-bold">$</span>
                          <span className="truncate">{evt.payload.command}</span>
                        </div>
                      )}

                      {/* Policy rule reason */}
                      {evt.matchedPolicy && (
                        <p className="text-xs text-slate-400 leading-tight">
                          <span className="text-slate-300 font-medium">Policy: {evt.matchedPolicy.name}</span> —{' '}
                          <span className={isBlocked ? 'text-rose-300' : 'text-slate-400'}>{evt.matchedPolicy.reason}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions & Buttons */}
                  <div className="flex items-center space-x-2 shrink-0 pt-2 lg:pt-0">
                    {isPending ? (
                      <>
                        <button
                          onClick={() => onQuickDeny(evt)}
                          className="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Deny
                        </button>
                        <button
                          onClick={() => onQuickApprove(evt)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => onReviewEvent(evt)}
                          className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors shadow-sm cursor-pointer"
                        >
                          Review (HITL)
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => onInspectEvent(evt)}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                        <span>Inspect Forensics</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
