import React, { useState } from 'react';
import {
  Code2,
  Copy,
  Check,
  Terminal,
  Layers,
  Sparkles,
  Shield,
  FileCode,
  Send,
} from 'lucide-react';

export const SdkDocs: React.FC = () => {
  const [activeLang, setActiveLang] = useState<'typescript' | 'python' | 'langchain' | 'openai'>('typescript');
  const [copied, setCopied] = useState(false);

  const snippets = {
    typescript: `import { AgentShield, createShieldedTool } from '@agentshield/sdk';

// 1. Initialize AgentShield Runtime Kernel
const shield = new AgentShield({
  endpoint: 'https://api.agentshield.dev', // or local self-hosted proxy
  apiKey: process.env.AGENTSHIELD_KEY,
  profile: 'coding_standard',
  autoRedactSecrets: true,
});

// 2. Wrap Agent Tools with Pre-Execution Interception
export const readFileTool = createShieldedTool({
  name: 'read_file',
  description: 'Read contents of a file',
  actionType: 'read_file',
  execute: async (targetPath: string) => {
    // Evaluation occurs BEFORE this executes!
    return await fs.promises.readFile(targetPath, 'utf-8');
  }
});

// 3. Intercept direct agent tool calls
const interceptionResult = await shield.intercept({
  agent: 'DevAgent',
  action: 'read_file',
  target: '.env',
  payload: { path: '.env' },
  context: {
    task: 'Fix authentication',
    previous_actions: ['read_file:README.md']
  }
});

if (interceptionResult.decision === 'block') {
  throw new Error(\`AgentShield Blocked: \${interceptionResult.reason}\`);
}
`,
    python: `from agentshield import AgentShield, ShieldedTool, PolicyDecision

# 1. Initialize AgentShield Engine
shield = AgentShield(
    profile="coding_standard",
    enable_ai_risk_scoring=True,
    hitl_callback_url="https://dashboard.agentshield.internal/approvals"
)

# 2. Decorator to intercept agent tool executions
@shield.intercept_action(action_type="execute_command")
def run_terminal_command(command: str):
    """Executes a bash command in subprocess after policy check."""
    import subprocess
    return subprocess.check_output(command, shell=True, text=True)

# 3. Explicit programmatic interception
decision = shield.evaluate_action(
    agent="DevAgent",
    action="read_file",
    target=".env",
    context={
        "task": "Fix authentication",
        "previous_actions": ["read_file:README.md"]
    }
)

if decision.is_blocked:
    print(f"Blocked by AgentShield: {decision.reason}")
elif decision.requires_approval:
    print(f"Awaiting human approval in AgentShield console...")
`,
    langchain: `from langchain.agents import AgentExecutor
from agentshield.integrations.langchain import AgentShieldCallbackHandler

# Attach AgentShield pre-execution interceptor callback
shield_handler = AgentShieldCallbackHandler(
    profile="strict_zero_trust",
    block_on_critical_risk=True,
    risk_threshold=70
)

# Pass into LangChain Agent Runner
agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    callbacks=[shield_handler], # Intercepts tool calls before execution!
    verbose=True
)
`,
    openai: `import OpenAI from 'openai';
import { withAgentShield } from '@agentshield/openai-tools';

const openai = new OpenAI();

// Wrap tools with AgentShield Policy Layer
const tools = withAgentShield([
  {
    type: 'function',
    function: {
      name: 'execute_command',
      description: 'Run terminal command',
      parameters: { /* ... */ }
    }
  }
], {
  agentName: 'DevAgent-OpenAI',
  taskContext: 'Update packages and build assets'
});
`,
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(snippets[activeLang]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                SDK & Tool Proxy Integration Guide
              </h2>
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-teal-500/10 text-teal-400 rounded border border-teal-500/30">
                Developer Ready
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Integrate AgentShield into autonomous agent frameworks (LangChain, CrewAI, AutoGen, OpenAI Assistants, or custom tool wrappers).
            </p>
          </div>
        </div>
      </div>

      {/* Code Snippets Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Language Tabs */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/60">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveLang('typescript')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeLang === 'typescript'
                  ? 'bg-slate-800 text-teal-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              TypeScript / Node.js
            </button>
            <button
              onClick={() => setActiveLang('python')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeLang === 'python'
                  ? 'bg-slate-800 text-teal-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Python SDK
            </button>
            <button
              onClick={() => setActiveLang('langchain')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeLang === 'langchain'
                  ? 'bg-slate-800 text-teal-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              LangChain Middleware
            </button>
            <button
              onClick={() => setActiveLang('openai')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeLang === 'openai'
                  ? 'bg-slate-800 text-teal-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              OpenAI Assistants
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center space-x-1 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied Snippet' : 'Copy Code'}</span>
          </button>
        </div>

        {/* Code Content */}
        <pre className="p-4 text-xs font-mono text-emerald-300 bg-slate-950 overflow-x-auto leading-relaxed">
          {snippets[activeLang]}
        </pre>
      </div>

      {/* REST API Interception Proxy Spec */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-200">
          <Terminal className="w-4 h-4 text-teal-400" />
          <span>HTTP / REST Tool-Proxy API Endpoint</span>
        </div>
        <p className="text-xs text-slate-400">
          For language-agnostic agent runners, send tool calls directly to AgentShield's pre-execution interceptor endpoint:
        </p>

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-mono text-cyan-300 space-y-2">
          <div className="text-amber-400 font-bold">POST /api/v1/intercept</div>
          <div className="text-slate-400 text-[11px]">
            {`curl -X POST https://your-agentshield.app/api/v1/intercept \\
  -H "Content-Type: application/json" \\
  -d '{
    "agent": "DevAgent",
    "action": "read_file",
    "target": ".env",
    "context": {
      "task": "Fix authentication",
      "previous_actions": ["read_file:README.md", "install_package:jsonwebtoken"]
    }
  }'`}
          </div>
        </div>
      </div>
    </div>
  );
};
