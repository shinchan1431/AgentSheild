import {
  AgentActionType,
  PolicyDecision,
  SecurityPolicyRule,
  PolicyProfile,
  AgentActionPayload,
} from '../types';
import { isSecretFilePath } from './secretScanner';

export const STANDARD_POLICY_RULES: SecurityPolicyRule[] = [
  {
    id: 'pol_block_env_secrets',
    name: 'Block Credential & Secret File Access',
    enabled: true,
    action: 'read_file',
    targetPattern: '.env*|*credentials*|*id_rsa*|*.pem|*secrets.*',
    decision: 'block',
    reason: 'Credential and environment secret files are strictly prohibited from agent read access.',
    severity: 'critical',
    tags: ['secrets', 'zero-trust', 'compliance'],
  },
  {
    id: 'pol_block_destructive_commands',
    name: 'Block Destructive Filesystem Deletions',
    enabled: true,
    action: 'execute_command',
    commandPattern: '(rm\\s+-(?:rf|fr|r|f)\\s+[/~*]|rmdir\\s+-(?:p|s)|mkfs|dd\\s+if=|:\\(\\)\\{|chmod\\s+-[rwx]*777)',
    decision: 'block',
    reason: 'Destructive system deletion commands and fork bomb patterns are unconditionally blocked.',
    severity: 'critical',
    tags: ['filesystem', 'anti-malware', 'rce'],
  },
  {
    id: 'pol_block_piped_bash_execution',
    name: 'Block Remote Piped Shell Execution',
    enabled: true,
    action: 'execute_command',
    commandPattern: '(curl|wget|fetch)\\s+.*\\|\\s*(bash|sh|zsh|python|perl|eval)',
    decision: 'block',
    reason: 'Piping remote web content directly into shell interpreters is a high-risk RCE vector.',
    severity: 'critical',
    tags: ['rce', 'network', 'anti-exploit'],
  },
  {
    id: 'pol_require_approval_package_install',
    name: 'Require Approval for Package Installation',
    enabled: true,
    action: 'install_package',
    decision: 'require_approval',
    reason: 'External dependencies introduce supply chain risks and require human oversight.',
    severity: 'medium',
    tags: ['supply-chain', 'dependencies', 'hitl'],
  },
  {
    id: 'pol_require_approval_git_push',
    name: 'Require Approval for Remote Git Push',
    enabled: true,
    action: 'git_push',
    decision: 'require_approval',
    reason: 'Direct remote pushes can alter production code and bypass review safeguards.',
    severity: 'high',
    tags: ['git', 'code-integrity', 'hitl'],
  },
  {
    id: 'pol_block_drop_database_tables',
    name: 'Block Destructive Database Operations',
    enabled: true,
    action: 'database_operation',
    commandPattern: '(?i)(DROP\\s+DATABASE|DROP\\s+TABLE|TRUNCATE\\s+TABLE|ALTER\\s+TABLE.*DROP)',
    decision: 'block',
    reason: 'Destructive SQL queries that drop database tables or entire databases are prohibited.',
    severity: 'critical',
    tags: ['database', 'data-loss'],
  },
  {
    id: 'pol_block_exfiltration_endpoints',
    name: 'Block Data Exfiltration Endpoints',
    enabled: true,
    action: 'network_request',
    targetPattern: '.*(?:webhook\\.site|requestcatcher|pastebin|transfer\\.sh|ngrok\\.io|localtunnel|pipedream).*',
    decision: 'block',
    reason: 'Outbound network requests to known anonymous exfiltration and tunnelling domains are prohibited.',
    severity: 'critical',
    tags: ['network', 'exfiltration', 'dlp'],
  },
  {
    id: 'pol_require_approval_workflow_write',
    name: 'Require Approval for CI/CD Workflow Modifications',
    enabled: true,
    action: 'write_file',
    targetPattern: '.github/workflows/*|.gitlab-ci.yml|jenkins*|*.circleci/*',
    decision: 'require_approval',
    reason: 'Modifications to CI/CD pipeline definitions can lead to supply-chain tampering.',
    severity: 'high',
    tags: ['cicd', 'pipeline', 'hitl'],
  },
  {
    id: 'pol_allow_safe_documentation_read',
    name: 'Allow Safe Documentation & Manifest Reads',
    enabled: true,
    action: 'read_file',
    targetPattern: 'README.md|package.json|tsconfig.json|LICENSE|*.md|src/**',
    decision: 'allow',
    reason: 'Standard workspace code and documentation reads are permitted without friction.',
    severity: 'low',
    tags: ['developer-experience', 'permissive'],
  },
];

export const PRESET_PROFILES: PolicyProfile[] = [
  {
    id: 'coding_standard',
    name: 'Coding Agent Standard',
    description: 'Balanced enterprise posture: blocks secrets and destructive commands, requires approval for installs and pushes, allows standard coding.',
    defaultDecision: 'allow',
    rules: STANDARD_POLICY_RULES,
    secretDenyList: ['.env', '.env.*', 'credentials.json', 'id_rsa', '*.pem', 'secrets.*'],
    blockedPackages: ['event-stream-malicious', 'collorama', 'colors-fake', 'cross-env-typo'],
    allowedDomains: ['registry.npmjs.org', 'pypi.org', 'github.com', 'api.github.com', 'raw.githubusercontent.com'],
  },
  {
    id: 'zero_trust_strict',
    name: 'Strict Zero-Trust',
    description: 'Maximum hardening: blocks all filesystem writes outside /tmp, enforces human approval for all external calls, packages, and code changes.',
    defaultDecision: 'require_approval',
    rules: [
      ...STANDARD_POLICY_RULES.map((r) =>
        r.decision === 'allow' && r.action !== 'read_file' ? { ...r, decision: 'require_approval' as PolicyDecision } : r
      ),
      {
        id: 'pol_zt_write_approval',
        name: 'Require Approval for All Code Writes',
        enabled: true,
        action: 'write_file',
        decision: 'require_approval',
        reason: 'Zero-trust profile requires manual human review for all code modifications.',
        severity: 'medium',
        tags: ['zero-trust', 'code-review'],
      },
    ],
    secretDenyList: ['.env', '.env.*', 'credentials.json', 'id_rsa', '*.pem', 'secrets.*', 'config/*', '.aws/*'],
    blockedPackages: ['*'],
    allowedDomains: ['registry.npmjs.org', 'pypi.org'],
  },
  {
    id: 'permissive_dev',
    name: 'Permissive Sandbox (Dev)',
    description: 'Low-friction local dev mode: only blocks active secret extraction and cataclysmic deletion.',
    defaultDecision: 'allow',
    rules: STANDARD_POLICY_RULES.map((r) =>
      r.id === 'pol_require_approval_package_install' || r.id === 'pol_require_approval_git_push'
        ? { ...r, decision: 'allow' as PolicyDecision }
        : r
    ),
    secretDenyList: ['.env', 'id_rsa'],
    blockedPackages: [],
    allowedDomains: ['*'],
  },
];

/**
 * Matches wildcard target patterns like "*.pem", "src/**", "README.md|.env*"
 */
export function matchTargetPattern(target: string, pattern?: string): boolean {
  if (!pattern || !target) return false;
  const subPatterns = pattern.split('|').map((p) => p.trim());
  const normalizedTarget = target.toLowerCase().replace(/\\/g, '/');

  for (const sub of subPatterns) {
    if (sub === '*') return true;
    const cleanSub = sub.toLowerCase();

    // Check glob style
    if (cleanSub.startsWith('**') || cleanSub.startsWith('*')) {
      const ends = cleanSub.replace(/^\*+/, '');
      if (normalizedTarget.endsWith(ends)) return true;
    }
    if (cleanSub.endsWith('*')) {
      const starts = cleanSub.replace(/\*+$/, '');
      if (normalizedTarget.startsWith(starts) || normalizedTarget.includes(starts)) return true;
    }
    if (normalizedTarget === cleanSub || normalizedTarget.endsWith('/' + cleanSub) || normalizedTarget.includes(cleanSub)) {
      return true;
    }

    try {
      const regexStr = '^' + cleanSub.replace(/\./g, '\\.').replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*') + '$';
      if (new RegExp(regexStr, 'i').test(normalizedTarget)) {
        return true;
      }
    } catch {
      // fallback to inclusion
      if (normalizedTarget.includes(cleanSub)) return true;
    }
  }

  return false;
}

/**
 * Matches regex command patterns
 */
export function matchCommandPattern(command: string, pattern?: string): boolean {
  if (!pattern || !command) return false;
  try {
    const regex = new RegExp(pattern, 'i');
    return regex.test(command);
  } catch (err) {
    console.warn('Invalid regex pattern in policy rule:', pattern, err);
    return command.includes(pattern);
  }
}

/**
 * Evaluates an intended agent action against policy rules
 */
export function evaluatePolicyRules(
  action: AgentActionType,
  target: string,
  payload: AgentActionPayload,
  profile: PolicyProfile
): { matchedRule?: SecurityPolicyRule; decision: PolicyDecision; reason: string } {
  // 1. Direct Secret File Check
  if (action === 'read_file' || action === 'write_file' || action === 'access_secret') {
    const secretCheck = isSecretFilePath(target, profile.secretDenyList);
    if (secretCheck.isSecret) {
      return {
        matchedRule: profile.rules.find((r) => r.id === 'pol_block_env_secrets'),
        decision: 'block',
        reason: `Access to prohibited secret file '${target}' is blocked by security policy.`,
      };
    }
  }

  // 2. Iterate through active rules
  const activeRules = profile.rules.filter((r) => r.enabled);

  // Check critical/block rules first
  for (const rule of activeRules) {
    if (rule.action !== '*' && rule.action !== action) {
      continue;
    }

    let isMatch = false;

    // Check target matching
    if (rule.targetPattern && target) {
      if (matchTargetPattern(target, rule.targetPattern)) {
        isMatch = true;
      }
    }

    // Check command matching
    const commandText = payload?.command || payload?.sql_query || payload?.url || '';
    if (rule.commandPattern && commandText) {
      if (matchCommandPattern(commandText, rule.commandPattern)) {
        isMatch = true;
      }
    }

    // If both pattern types are absent and action matches
    if (!rule.targetPattern && !rule.commandPattern && (rule.action === action || rule.action === '*')) {
      isMatch = true;
    }

    if (isMatch) {
      return {
        matchedRule: rule,
        decision: rule.decision,
        reason: rule.reason,
      };
    }
  }

  // 3. Fallback to profile default decision
  return {
    decision: profile.defaultDecision,
    reason: `Action evaluated under default policy '${profile.defaultDecision}'.`,
  };
}
