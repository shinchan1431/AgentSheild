import React, { useState } from 'react';
import {
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  FileCode,
  Check,
  Copy,
  Plus,
  Trash2,
  Cpu,
  Fingerprint,
} from 'lucide-react';
import { DEFAULT_SECRET_FILE_PATTERNS, scanContentForSecrets, calculateShannonEntropy, redactAllSecrets } from '../lib/secretScanner';
import { DetectedSecret } from '../types';

export const SecretVault: React.FC = () => {
  const [testInput, setTestInput] = useState<string>(
    `// Configuration for Agent\nconst OPENAI_API_KEY = "sk-proj-98234jfa902384092348j09234j09234";\nconst AWS_ACCESS = "AKIAIOSFODNN7EXAMPLE";\nconst DATABASE_URL = "postgres://postgres:SuperSecretPassword123@prod-cluster.internal:5432/main";\n\nconsole.log("Connecting with token:", OPENAI_API_KEY);`
  );

  const [denyList, setDenyList] = useState<string[]>(DEFAULT_SECRET_FILE_PATTERNS);
  const [newPattern, setNewPattern] = useState('');
  const [copiedRedacted, setCopiedRedacted] = useState(false);

  const detectedSecrets = scanContentForSecrets(testInput, 'Test Editor');
  const { sanitized, count: redactedCount } = redactAllSecrets(testInput);
  const overallEntropy = calculateShannonEntropy(testInput);

  const handleAddPattern = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPattern.trim()) return;
    setDenyList([...denyList, newPattern.trim()]);
    setNewPattern('');
  };

  const handleRemovePattern = (idx: number) => {
    setDenyList(denyList.filter((_, i) => i !== idx));
  };

  const handleCopyRedacted = () => {
    navigator.clipboard.writeText(sanitized);
    setCopiedRedacted(true);
    setTimeout(() => setCopiedRedacted(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Secret Shield & Pre-Execution Data Loss Prevention (DLP)
              </h2>
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-rose-500/10 text-rose-400 rounded border border-rose-500/30">
                Active Scanner
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Intercepts and sanitizes secrets <strong>before</strong> they enter prompts, tool arguments, logs, or outbound network requests.
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Live Secret Scanner & Sanitizer Playground + Secret Deny List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live DLP Playground */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-200">
                <Fingerprint className="w-4 h-4 text-emerald-400" />
                <span>Live Secret Detection & Shannon Entropy Scanner</span>
              </div>
              <div className="text-[11px] font-mono text-slate-400">
                Buffer Entropy: <strong className="text-emerald-400">{overallEntropy}</strong>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-semibold block mb-1">
                Paste Code, Tool Arguments, or Prompts to Test Real-Time Sanitization:
              </label>
              <textarea
                rows={6}
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                placeholder="Paste code or tool payloads containing API keys, AWS credentials, JWTs..."
              />
            </div>

            {/* Detected Secrets Cards */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Discovered Secrets ({detectedSecrets.length})</span>
                {detectedSecrets.length > 0 && (
                  <span className="text-rose-400 font-bold flex items-center space-x-1">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Intercepted & Flagged</span>
                  </span>
                )}
              </div>

              {detectedSecrets.length === 0 ? (
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs text-slate-500 text-center">
                  No high-entropy secrets or private tokens detected in current buffer.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {detectedSecrets.map((s, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-950 p-3 rounded-lg border border-rose-900/50 flex items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-rose-400">{s.type}</span>
                          <span className="text-[10px] font-mono bg-rose-950 px-1.5 py-0.2 rounded text-rose-300 border border-rose-800/60">
                            Entropy: {s.entropy}
                          </span>
                        </div>
                        <div className="font-mono text-slate-400 text-[11px] mt-0.5">
                          Masked Representation: <strong className="text-slate-300">{s.masked}</strong>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold border border-emerald-500/20">
                        Shielded
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Redacted Stream Preview */}
            <div className="border-t border-slate-800 pt-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  Auto-Redacted Payload (Safe for LLMs, Logs & Telemetry):
                </span>
                <button
                  onClick={handleCopyRedacted}
                  className="flex items-center space-x-1 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  {copiedRedacted ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedRedacted ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-mono text-cyan-300 overflow-x-auto max-h-40">
                {sanitized}
              </pre>
            </div>
          </div>
        </div>

        {/* Right Column: Secret File Deny-Lists */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-200">
                <Lock className="w-4 h-4 text-rose-400" />
                <span>Protected File Deny-List</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">{denyList.length} Protected</span>
            </div>

            <p className="text-xs text-slate-400">
              Any attempt by an agent to read, write, or transmit matching file paths is immediately blocked by the AgentShield interception kernel.
            </p>

            {/* Add Pattern Form */}
            <form onSubmit={handleAddPattern} className="flex gap-2">
              <input
                type="text"
                value={newPattern}
                onChange={(e) => setNewPattern(e.target.value)}
                placeholder="e.g. **/.config/secrets.json"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
              >
                Add
              </button>
            </form>

            {/* List */}
            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {denyList.map((pat, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-slate-950 px-3 py-2 rounded-lg border border-slate-800/80 text-xs font-mono"
                >
                  <span className="text-amber-300">{pat}</span>
                  <button
                    onClick={() => handleRemovePattern(idx)}
                    className="text-slate-600 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                    title="Remove pattern"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
