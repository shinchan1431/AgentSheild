export type AgentActionType =
  | 'read_file'
  | 'write_file'
  | 'execute_command'
  | 'install_package'
  | 'network_request'
  | 'access_secret'
  | 'git_push'
  | 'database_operation';

export type PolicyDecision = 'allow' | 'require_approval' | 'block' | 'quarantine';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface DetectedSecret {
  type: string;
  match: string;
  masked: string;
  entropy: number;
  location: string;
}

export interface RiskFactor {
  name: string;
  score: number;
  maxScore: number;
  weight: number;
  description: string;
}

export interface RiskBreakdown {
  totalScore: number; // 0 to 100
  riskLevel: RiskLevel;
  actionSensitivity: number; // 0 to 25
  targetSensitivity: number; // 0 to 25
  privilegeLevel: number; // 0 to 15
  externalCommunication: number; // 0 to 15
  reversibility: number; // 0 to 10
  behavioralAnomaly: number; // 0 to 10
  factors: RiskFactor[];
  reasons: string[];
  detectedSecrets: DetectedSecret[];
  aiThreatAnalysis?: {
    threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    reasoning: string;
    threatVectors: string[];
    confidence: number;
    recommendation: string;
    riskScoreAdjustment?: number;
  };
}

export interface SecurityPolicyRule {
  id: string;
  name: string;
  enabled: boolean;
  action: AgentActionType | '*';
  targetPattern?: string; // e.g. ".env", "*.pem", "src/auth/**"
  commandPattern?: string; // regex pattern like "rm -rf .*", "curl.*|.*bash"
  decision: PolicyDecision;
  reason: string;
  severity: RiskLevel;
  tags: string[];
  isCustom?: boolean;
}

export interface PolicyProfile {
  id: string;
  name: string;
  description: string;
  rules: SecurityPolicyRule[];
  defaultDecision: PolicyDecision;
  secretDenyList: string[];
  blockedPackages: string[];
  allowedDomains: string[];
}

export interface AgentActionPayload {
  command?: string;
  content?: string;
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  package_name?: string;
  version?: string;
  registry?: string;
  secret_name?: string;
  sql_query?: string;
  database?: string;
  branch?: string;
  remote?: string;
  diff?: string;
  filePath?: string;
}

export interface AgentContext {
  task: string;
  previous_actions: string[];
  agent_role?: string;
  session_id?: string;
  prompt_intent?: string;
}

export interface AgentActionInterceptEvent {
  id: string;
  timestamp: string;
  agent: string;
  agentRole: string;
  action: AgentActionType;
  target: string;
  payload: AgentActionPayload;
  context: AgentContext;
  decision: PolicyDecision;
  status: 'allowed' | 'blocked' | 'pending_approval' | 'approved' | 'denied' | 'quarantined';
  evaluatedRisk: RiskBreakdown;
  matchedPolicy?: SecurityPolicyRule;
  approvalDetails?: {
    decidedBy: string;
    decidedAt: string;
    decision: 'approved' | 'denied' | 'quarantined';
    note?: string;
    whitelistedRuleId?: string;
  };
  sanitizedPayload?: AgentActionPayload;
  executionDurationMs?: number;
}

export interface AgentScenarioStep {
  agent: string;
  agentRole: string;
  action: AgentActionType;
  target: string;
  payload: AgentActionPayload;
  context: AgentContext;
  narrative: string;
  expectedOutcome: 'allow' | 'require_approval' | 'block';
}

export interface AgentScenario {
  id: string;
  title: string;
  category: 'malicious' | 'suspicious' | 'benign' | 'prompt_injection' | 'supply_chain';
  description: string;
  threatLevel: RiskLevel;
  steps: AgentScenarioStep[];
}

export type ActiveTab = 'interceptor' | 'approvals' | 'policies' | 'simulator' | 'secrets' | 'audit' | 'sdk';
