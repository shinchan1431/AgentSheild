import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy initialization of Gemini client
let genAIClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIClient;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'AgentShield Runtime Security Engine',
    version: '1.0.0',
    geminiAvailable: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// AI Threat Analysis Endpoint using Gemini 3.7 Flash
app.post('/api/gemini/analyze-threat', async (req, res) => {
  try {
    const { action, target, payload, context, heuristicRisk } = req.body;

    const ai = getGeminiClient();
    if (!ai) {
      // Fallback heuristic explanation if no API key is set
      return res.json({
        success: true,
        source: 'heuristic',
        analysis: {
          threatLevel: heuristicRisk > 70 ? 'CRITICAL' : heuristicRisk > 40 ? 'MEDIUM' : 'LOW',
          reasoning: `Heuristic evaluation detected ${heuristicRisk > 70 ? 'high risk sensitivity on action or target' : 'standard development action pattern'}.`,
          threatVectors: [
            heuristicRisk > 70 ? 'Potential Unauthorized Access' : 'Normal Operational Execution',
            action === 'execute_command' ? 'Subprocess Execution' : action === 'read_file' ? 'Filesystem Read' : 'Tool Execution',
          ],
          confidence: 0.85,
          recommendation: heuristicRisk > 70 ? 'Block or require human approval before execution.' : 'Allow under standard policy constraints.',
        },
      });
    }

    const prompt = `You are AgentShield AI Risk Analyzer, an enterprise runtime security evaluator for Autonomous AI Agents.
Evaluate the following intended agent action before execution.

AGENT ACTION PAYLOAD:
- Action Type: ${action}
- Target: ${target || 'N/A'}
- Payload: ${JSON.stringify(payload || {})}
- Context Task: ${context?.task || 'N/A'}
- Previous Actions: ${JSON.stringify(context?.previous_actions || [])}
- Initial Heuristic Risk Score: ${heuristicRisk}/100

Perform deep behavioral security evaluation:
1. Is there potential for data exfiltration, privilege escalation, destructive filesystem modification, prompt injection, or supply chain poisoning?
2. Does the action align logically with the stated task, or does it exhibit anomalous or deceptive lateral movement?
3. What is the recommended decision (allow, require_approval, block)?

Respond ONLY in valid JSON matching this structure:
{
  "threatLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "reasoning": "Concise 1-2 sentence security rationale explaining the threat or safety justification.",
  "threatVectors": ["vector 1", "vector 2"],
  "confidence": 0.95,
  "recommendation": "Brief actionable directive (e.g. 'Block: Agent is reading credentials without task justification.')",
  "riskScoreAdjustment": number between -20 and +30
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    let parsedResult = null;
    try {
      parsedResult = JSON.parse(response.text || '{}');
    } catch {
      parsedResult = {
        threatLevel: 'MEDIUM',
        reasoning: response.text || 'Analyzed by AgentShield engine.',
        threatVectors: ['Contextual Evaluation'],
        confidence: 0.8,
        recommendation: 'Verify intended parameters with human administrator.',
        riskScoreAdjustment: 0,
      };
    }

    res.json({
      success: true,
      source: 'gemini-3.7-flash',
      analysis: parsedResult,
    });
  } catch (error: any) {
    console.error('Gemini threat analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Threat analysis failed',
      fallback: {
        threatLevel: 'MEDIUM',
        reasoning: 'Server-side AI threat evaluation encountered an error. Applied strict fallback policy.',
        threatVectors: ['Evaluation Error'],
        confidence: 0.5,
        recommendation: 'Review manually in Human-in-the-Loop interface.',
      },
    });
  }
});

// AgentShield Interception Proxy Endpoint for SDK clients
app.post('/api/v1/intercept', (req, res) => {
  const { agent, action, target, payload, context } = req.body;

  if (!agent || !action) {
    return res.status(400).json({
      error: 'Missing required parameters: agent and action are required.',
    });
  }

  // Basic validation check
  const isEnvOrSecret = target && /(\.env|id_rsa|\.pem|credentials\.json|\.aws)/i.test(target);
  const isDestructive = payload?.command && /(rm\s+-rf|mkfs|dd\s+if=|>\s*\/dev\/sda)/i.test(payload.command);

  let decision = 'allow';
  let reason = 'Action passed all security policies';
  let riskScore = 15;

  if (isEnvOrSecret) {
    decision = 'block';
    reason = `Access to secret target '${target}' is prohibited by AgentShield zero-trust policy.`;
    riskScore = 98;
  } else if (isDestructive) {
    decision = 'block';
    reason = 'Destructive command pattern detected.';
    riskScore = 100;
  } else if (action === 'git_push' || action === 'install_package') {
    decision = 'require_approval';
    reason = `Action '${action}' requires human verification.`;
    riskScore = 55;
  }

  res.json({
    id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    agent,
    action,
    target,
    decision,
    riskScore,
    reason,
    timestamp: new Date().toISOString(),
    allowed: decision === 'allow',
    requiresApproval: decision === 'require_approval',
    blocked: decision === 'block',
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🛡️ AgentShield Security Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
