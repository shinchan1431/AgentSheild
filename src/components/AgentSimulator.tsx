import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Play,
  RotateCcw,
  StepForward,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Sparkles,
  Cpu,
  Layers,
  Send,
  Code2,
  FileCode,
  Lock,
  ChevronRight,
  Radio,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  AgentScenario,
  AgentScenarioStep,
  AgentActionType,
  AgentActionInterceptEvent,
  PolicyProfile,
  AgentActionPayload,
  AgentContext,
} from '../types';
import { SIMULATION_SCENARIOS } from '../lib/scenarios';
import { evaluatePolicyRules } from '../lib/policyEngine';
import { calculateRiskScore } from '../lib/riskScorer';

interface AgentSimulatorProps {
  currentProfile: PolicyProfile;
  onEventIntercepted: (event: AgentActionInterceptEvent) => void;
  onOpenApprovalModal: (event: AgentActionInterceptEvent) => void;
}

export const AgentSimulator: React.FC<AgentSimulatorProps> = ({
  currentProfile,
  onEventIntercepted,
  onOpenApprovalModal,
}) => {
  const [selectedScenario, setSelectedScenario] = useState<AgentScenario>(SIMULATION_SCENARIOS[0]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [executionLog, setExecutionLog] = useState<{
    type: 'info' | 'agent' | 'interceptor' | 'block' | 'approval' | 'allow';
    message: string;
    timestamp: string;
    details?: any;
  }[]>([]);

  // Manual Sandbox state
  const [customAgentName, setCustomAgentName] = useState('CustomDevAgent');
  const [customRole, setCustomRole] = useState('Autonomous Coding Agent');
  const [customAction, setCustomAction] = useState<AgentActionType>('read_file');
  const [customTarget, setCustomTarget] = useState('.env');
  const [customCommand, setCustomCommand] = useState('cat .env');
  const [customTask, setCustomTask] = useState('Implement user login with OAuth and verify credentials');
  const [isEvaluatingCustom, setIsEvaluatingCustom] = useState(false);
  const [customResult, setCustomResult] = useState<AgentActionInterceptEvent | null>(null);

  // Auto-play interval
  useEffect(() => {
    let timer: any = null;
    if (isPlaying && currentStepIndex < selectedScenario.steps.length) {
      timer = setTimeout(() => {
        runNextStep();
      }, 1400);
    } else if (currentStepIndex >= selectedScenario.steps.length) {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStepIndex, selectedScenario]);

  const resetScenario = (scen: AgentScenario) => {
    setSelectedScenario(scen);
    setCurrentStepIndex(0);
    setIsPlaying(false);
    setExecutionLog([
      {
        type: 'info',
        message: `Initialized scenario: "${scen.title}" (${scen.steps.length} steps). AgentShield runtime active under policy "${currentProfile.name}".`,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  };

  const runNextStep = () => {
    if (currentStepIndex >= selectedScenario.steps.length) return;

    const step = selectedScenario.steps[currentStepIndex];
    const newIndex = currentStepIndex + 1;
    setCurrentStepIndex(newIndex);

    // 1. Log Agent Intent
    const timeStr = new Date().toLocaleTimeString();
    const agentMsg = `[Step ${newIndex}/${selectedScenario.steps.length}] Agent '${step.agent}' intends to execute '${step.action}' on target '${step.target}'`;

    // 2. Evaluate with AgentShield Policy Engine & Risk Scorer
    const risk = calculateRiskScore(step.action, step.target, step.payload, step.context);
    const policyResult = evaluatePolicyRules(step.action, step.target, step.payload, currentProfile);

    // Final decision combines policy rule and high risk threshold
    let finalDecision = policyResult.decision;
    if (risk.totalScore >= 85 && finalDecision === 'allow') {
      finalDecision = 'block';
    } else if (risk.totalScore >= 55 && finalDecision === 'allow') {
      finalDecision = 'require_approval';
    }

    const eventId = `evt_sim_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const event: AgentActionInterceptEvent = {
      id: eventId,
      timestamp: new Date().toISOString(),
      agent: step.agent,
      agentRole: step.agentRole,
      action: step.action,
      target: step.target,
      payload: step.payload,
      context: step.context,
      decision: finalDecision,
      status:
        finalDecision === 'allow'
          ? 'allowed'
          : finalDecision === 'block'
          ? 'blocked'
          : finalDecision === 'require_approval'
          ? 'pending_approval'
          : 'quarantined',
      evaluatedRisk: risk,
      matchedPolicy: policyResult.matchedRule,
      executionDurationMs: Math.floor(Math.random() * 45) + 12,
    };

    onEventIntercepted(event);

    // Update simulation log
    setExecutionLog((prev) => [
      ...prev,
      {
        type: 'agent',
        message: agentMsg,
        timestamp: timeStr,
        details: { narrative: step.narrative, payload: step.payload },
      },
      {
        type:
          finalDecision === 'allow'
            ? 'allow'
            : finalDecision === 'block'
            ? 'block'
            : 'approval',
        message: `🛡️ AgentShield Intercept: Decision [${finalDecision.toUpperCase()}] | Risk Score: ${risk.totalScore}/100 | ${policyResult.reason}`,
        timestamp: timeStr,
        details: { risk, policy: policyResult.matchedRule },
      },
    ]);

    // If requires approval and playing, pause auto-play to prompt user
    if (finalDecision === 'require_approval') {
      setIsPlaying(false);
      onOpenApprovalModal(event);
    }
  };

  const handleEvaluateCustom = async () => {
    setIsEvaluatingCustom(true);
    const payload: AgentActionPayload = {
      command: customCommand,
      filePath: customTarget,
      url: customAction === 'network_request' ? customTarget : undefined,
      package_name: customAction === 'install_package' ? customTarget : undefined,
    };

    const context: AgentContext = {
      task: customTask,
      previous_actions: ['setup_workspace', 'read_file:README.md'],
      agent_role: customRole,
    };

    // Calculate heuristic risk & policy
    const risk = calculateRiskScore(customAction, customTarget, payload, context);
    const policyResult = evaluatePolicyRules(customAction, customTarget, payload, currentProfile);

    let decision = policyResult.decision;
    if (risk.totalScore >= 85 && decision === 'allow') decision = 'block';
    else if (risk.totalScore >= 55 && decision === 'allow') decision = 'require_approval';

    // Optional Gemini AI threat analysis via server endpoint
    let aiAnalysis = undefined;
    try {
      const resp = await fetch('/api/gemini/analyze-threat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: customAction,
          target: customTarget,
          payload,
          context,
          heuristicRisk: risk.totalScore,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.analysis) {
          aiAnalysis = data.analysis;
          risk.aiThreatAnalysis = data.analysis;
        }
      }
    } catch (err) {
      console.warn('AI analysis call failed, proceeding with heuristic:', err);
    }

    const event: AgentActionInterceptEvent = {
      id: `evt_custom_${Date.now()}`,
      timestamp: new Date().toISOString(),
      agent: customAgentName,
      agentRole: customRole,
      action: customAction,
      target: customTarget,
      payload,
      context,
      decision,
      status:
        decision === 'allow'
          ? 'allowed'
          : decision === 'block'
          ? 'blocked'
          : 'pending_approval',
      evaluatedRisk: risk,
      matchedPolicy: policyResult.matchedRule,
      executionDurationMs: 38,
    };

    setCustomResult(event);
    onEventIntercepted(event);
    setIsEvaluatingCustom(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-white tracking-tight">Agent Simulation & Threat Testing Lab</h2>
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-cyan-500/10 text-cyan-400 rounded border border-cyan-500/30">
                Interactive Sandbox
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulate realistic autonomous agent workflows, adversarial attacks, and prompt injections to verify pre-execution interception and policy enforcement.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Scenario Selector & Live Controls */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              1. Select Simulation Scenario
            </span>

            <div className="space-y-2">
              {SIMULATION_SCENARIOS.map((scen) => {
                const isSelected = selectedScenario.id === scen.id;
                return (
                  <button
                    key={scen.id}
                    onClick={() => resetScenario(scen)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800/90 border-cyan-500/60 shadow-sm shadow-cyan-500/10'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white leading-tight">{scen.title}</span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase ${
                          scen.threatLevel === 'critical'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : scen.threatLevel === 'high'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {scen.threatLevel}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{scen.description}</p>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-800/60 font-mono">
                      <span>{scen.steps.length} Steps</span>
                      <span>Category: {scen.category}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Runner Controls */}
            <div className="pt-2 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-semibold">
                  Progress: Step {currentStepIndex} of {selectedScenario.steps.length}
                </span>
                <span className="text-slate-500 font-mono">
                  {Math.round((currentStepIndex / selectedScenario.steps.length) * 100)}% Complete
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300"
                  style={{ width: `${(currentStepIndex / selectedScenario.steps.length) * 100}%` }}
                />
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  disabled={currentStepIndex >= selectedScenario.steps.length}
                  className={`flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-40 ${
                    isPlaying
                      ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                      : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                  }`}
                >
                  <Play className={`w-3.5 h-3.5 ${isPlaying ? 'fill-current' : ''}`} />
                  <span>{isPlaying ? 'Pause Simulation' : 'Auto Play'}</span>
                </button>

                <button
                  onClick={runNextStep}
                  disabled={currentStepIndex >= selectedScenario.steps.length || isPlaying}
                  className="flex items-center space-x-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-40"
                >
                  <StepForward className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Step Next</span>
                </button>

                <button
                  onClick={() => resetScenario(selectedScenario)}
                  className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-lg text-xs transition-all cursor-pointer"
                  title="Reset Scenario"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Terminal Stream */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col h-[520px]">
            {/* Terminal Header */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-3">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                </div>
                <span className="text-xs font-mono text-slate-400 pl-2">
                  agentshield-runtime-interceptor.log
                </span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span>LISTENING</span>
              </span>
            </div>

            {/* Terminal Output */}
            <div className="flex-1 overflow-y-auto font-mono text-xs space-y-3 pr-2 scrollbar-thin">
              {executionLog.map((log, index) => {
                let colorClass = 'text-slate-300';
                let bgClass = 'bg-slate-900/60 border-slate-800';

                if (log.type === 'allow') {
                  colorClass = 'text-emerald-400';
                  bgClass = 'bg-emerald-950/20 border-emerald-900/40';
                } else if (log.type === 'block') {
                  colorClass = 'text-rose-400 font-bold';
                  bgClass = 'bg-rose-950/30 border-rose-900/50';
                } else if (log.type === 'approval') {
                  colorClass = 'text-amber-400 font-bold';
                  bgClass = 'bg-amber-950/30 border-amber-900/50';
                } else if (log.type === 'agent') {
                  colorClass = 'text-cyan-300';
                  bgClass = 'bg-cyan-950/20 border-cyan-900/40';
                }

                return (
                  <div key={index} className={`p-2.5 rounded-lg border text-[11px] leading-relaxed ${bgClass}`}>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                      <span>[{log.timestamp}]</span>
                      <span className="uppercase tracking-wider">{log.type}</span>
                    </div>
                    <div className={colorClass}>{log.message}</div>
                    {log.details?.narrative && (
                      <p className="text-slate-400 mt-1 italic text-[11px] font-sans">
                        ℹ️ Context: {log.details.narrative}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Custom Action Interception Sandbox */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-center space-x-2">
          <Code2 className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-bold text-white tracking-tight">
            Manual Action Interception & AI Threat Evaluator Sandbox
          </h3>
        </div>
        <p className="text-xs text-slate-400">
          Inject any synthetic agent tool call or command directly into AgentShield's real-time interception pipeline to test deterministic policy rules and Gemini 3.7 AI risk analysis.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Agent Name */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Agent Identifier:</label>
            <input
              type="text"
              value={customAgentName}
              onChange={(e) => setCustomAgentName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Action Type */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Action Type:</label>
            <select
              value={customAction}
              onChange={(e) => setCustomAction(e.target.value as AgentActionType)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
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

          {/* Target */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Target / Resource:</label>
            <input
              type="text"
              value={customTarget}
              onChange={(e) => setCustomTarget(e.target.value)}
              placeholder="e.g. .env, package.json, terminal, webhook.site"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-amber-300 font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Command / Content / Payload:</label>
            <textarea
              rows={3}
              value={customCommand}
              onChange={(e) => setCustomCommand(e.target.value)}
              placeholder="e.g. rm -rf /tmp/cache || curl https://webhook.site/leak"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-emerald-300 font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Agent Stated Context Task:</label>
            <textarea
              rows={3}
              value={customTask}
              onChange={(e) => setCustomTask(e.target.value)}
              placeholder="Describe the agent's stated task context"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleEvaluateCustom}
            disabled={isEvaluatingCustom}
            className="flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs transition-all shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>{isEvaluatingCustom ? 'Evaluating with Policy & AI...' : 'Evaluate Action Live'}</span>
          </button>
        </div>

        {/* Custom Evaluation Result Banner */}
        {customResult && (
          <div
            className={`mt-4 p-4 rounded-xl border space-y-3 ${
              customResult.decision === 'block'
                ? 'bg-rose-950/20 border-rose-800/50'
                : customResult.decision === 'require_approval'
                ? 'bg-amber-950/20 border-amber-800/50'
                : 'bg-emerald-950/20 border-emerald-800/50'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-200">Result:</span>
                <span
                  className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                    customResult.decision === 'block'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : customResult.decision === 'require_approval'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  {customResult.decision}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  Risk Score: <strong className="text-white">{customResult.evaluatedRisk.totalScore}/100</strong>
                </span>
              </div>

              {customResult.matchedPolicy && (
                <span className="text-xs text-slate-400">
                  Matched: <strong className="text-slate-200">{customResult.matchedPolicy.name}</strong>
                </span>
              )}
            </div>

            {customResult.evaluatedRisk.aiThreatAnalysis && (
              <div className="bg-indigo-950/40 border border-indigo-800/40 p-3 rounded-lg text-xs space-y-1">
                <div className="flex items-center space-x-1.5 text-indigo-300 font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Gemini 3.7 AI Threat Analysis:</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  {customResult.evaluatedRisk.aiThreatAnalysis.reasoning}
                </p>
                <div className="text-[11px] text-indigo-400 font-mono">
                  Recommendation: {customResult.evaluatedRisk.aiThreatAnalysis.recommendation}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
