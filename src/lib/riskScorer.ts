import {
  AgentActionType,
  AgentActionPayload,
  AgentContext,
  RiskBreakdown,
  RiskFactor,
  RiskLevel,
} from '../types';
import { isSecretFilePath, scanContentForSecrets } from './secretScanner';

/**
 * Calculates a multi-factor risk score (0-100) based on action sensitivity,
 * target sensitivity, privilege level, external communications, reversibility,
 * and contextual behavior anomalies.
 */
export function calculateRiskScore(
  action: AgentActionType,
  target: string,
  payload: AgentActionPayload,
  context: AgentContext
): RiskBreakdown {
  const reasons: string[] = [];

  // 1. Action Sensitivity (0-25)
  let actionSensitivity = 5;
  switch (action) {
    case 'read_file':
      actionSensitivity = 5;
      break;
    case 'write_file':
      actionSensitivity = 14;
      break;
    case 'install_package':
      actionSensitivity = 18;
      break;
    case 'git_push':
      actionSensitivity = 20;
      break;
    case 'database_operation':
      actionSensitivity = 22;
      break;
    case 'execute_command':
      actionSensitivity = 24;
      break;
    case 'access_secret':
      actionSensitivity = 25;
      break;
    case 'network_request':
      actionSensitivity = 16;
      break;
    default:
      actionSensitivity = 10;
  }

  // 2. Target Sensitivity (0-25)
  let targetSensitivity = 0;
  const targetLower = (target || '').toLowerCase();
  const secretCheck = isSecretFilePath(target);

  if (secretCheck.isSecret || targetLower.includes('.env') || targetLower.includes('id_rsa') || targetLower.includes('credentials')) {
    targetSensitivity = 25;
    reasons.push(`Target is a high-value credential file (${target})`);
  } else if (targetLower.includes('auth') || targetLower.includes('token') || targetLower.includes('secret') || targetLower.includes('crypto')) {
    targetSensitivity = 18;
    reasons.push(`Target involves security-critical codebase modules (${target})`);
  } else if (targetLower.includes('workflow') || targetLower.includes('.github') || targetLower.includes('dockerfile') || targetLower.includes('package.json')) {
    targetSensitivity = 15;
    reasons.push(`Target modifies project configuration or CI/CD pipelines (${target})`);
  } else if (targetLower.includes('readme') || targetLower.includes('.md') || targetLower.includes('license')) {
    targetSensitivity = 0;
  } else if (targetLower.startsWith('/etc') || targetLower.startsWith('/sys') || targetLower.startsWith('/proc')) {
    targetSensitivity = 25;
    reasons.push(`Target references protected operating system directories`);
  } else {
    targetSensitivity = 6;
  }

  // 3. Privilege Level (0-15)
  let privilegeLevel = 0;
  const cmd = (payload.command || payload.sql_query || '').toLowerCase();
  if (cmd.includes('sudo ') || cmd.includes('su -') || cmd.includes('chmod 777') || cmd.includes('chown root')) {
    privilegeLevel = 15;
    reasons.push('Elevated superuser privileges or permissive permission grants requested');
  } else if (cmd.includes('docker ') || cmd.includes('kubectl ') || cmd.includes('systemctl')) {
    privilegeLevel = 10;
    reasons.push('Container or daemon management privileges required');
  } else if (action === 'database_operation' && (cmd.includes('grant') || cmd.includes('create user'))) {
    privilegeLevel = 14;
    reasons.push('Database user privilege escalation attempted');
  } else {
    privilegeLevel = 2;
  }

  // 4. External Communication (0-15)
  let externalCommunication = 0;
  const url = (payload.url || '').toLowerCase();
  if (action === 'network_request' || cmd.includes('curl') || cmd.includes('wget') || cmd.includes('nc -e') || cmd.includes('bash -i >&')) {
    if (
      url.includes('webhook.site') ||
      url.includes('requestcatcher') ||
      url.includes('pastebin') ||
      url.includes('ngrok') ||
      cmd.includes('webhook.site') ||
      cmd.includes('pastebin') ||
      cmd.includes('ngrok')
    ) {
      externalCommunication = 15;
      reasons.push('Outbound connection to known anonymous webhook/exfiltration service');
    } else if (url.includes('github.com') || url.includes('npmjs.org') || url.includes('pypi.org')) {
      externalCommunication = 4;
    } else {
      externalCommunication = 10;
      reasons.push('Unverified external network connection');
    }
  } else if (action === 'git_push') {
    const remote = (payload.remote || '').toLowerCase();
    const branch = (payload.branch || '').toLowerCase();
    if (branch === 'main' || branch === 'master' || branch === 'production') {
      externalCommunication = 15;
      reasons.push(`Direct push to protected branch '${branch}' on remote '${remote || 'origin'}'`);
    } else {
      externalCommunication = 8;
    }
  }

  // 5. Reversibility & Destructiveness (0-10)
  let reversibility = 0;
  if (
    cmd.includes('rm -rf') ||
    cmd.includes('rm -r') ||
    cmd.includes('git push -f') ||
    cmd.includes('git push --force') ||
    cmd.includes('drop table') ||
    cmd.includes('drop database') ||
    cmd.includes('truncate')
  ) {
    reversibility = 10;
    reasons.push('Irreversible destructive operation with permanent data loss risk');
  } else if (action === 'write_file' || action === 'install_package') {
    reversibility = 4;
  } else if (action === 'read_file') {
    reversibility = 0;
  } else {
    reversibility = 3;
  }

  // 6. Behavioral Anomaly & Context Trajectory (0-10)
  let behavioralAnomaly = 0;
  const task = (context.task || '').toLowerCase();

  // If task is "Fix UI styling" but agent tries to read .env or execute bash
  if (task.includes('ui') || task.includes('css') || task.includes('frontend') || task.includes('color')) {
    if (action === 'execute_command' || action === 'access_secret' || secretCheck.isSecret) {
      behavioralAnomaly = 10;
      reasons.push('Action deviates sharply from stated benign frontend task');
    }
  }

  // Check if pipe-to-bash
  if (cmd.includes('| bash') || cmd.includes('| sh') || cmd.includes('| zsh') || cmd.includes('| python')) {
    behavioralAnomaly = 10;
    reasons.push('Piping remote output directly to interpreter shell');
  }

  // Detect secrets embedded in payload content or commands
  const allPayloadText = `${payload.command || ''} ${payload.content || ''} ${payload.body || ''} ${payload.sql_query || ''}`;
  const detectedSecrets = scanContentForSecrets(allPayloadText);
  if (detectedSecrets.length > 0) {
    targetSensitivity = Math.max(targetSensitivity, 24);
    reasons.push(`Embedded high-entropy secret detected in payload (${detectedSecrets.map((s) => s.type).join(', ')})`);
  }

  // Check for suspicious package typosquatting or obfuscation
  if (action === 'install_package') {
    const pkg = (payload.package_name || '').toLowerCase();
    if (['collorama', 'colors-fake', 'lodashe', 'express-auth-bypass', 'jsonwebtoken-vulnerable'].includes(pkg)) {
      behavioralAnomaly = 10;
      reasons.push(`Suspected typosquatted or malicious package name '${pkg}'`);
    }
  }

  // Sum factors
  let totalScore =
    actionSensitivity +
    targetSensitivity +
    privilegeLevel +
    externalCommunication +
    reversibility +
    behavioralAnomaly;

  // Clamp 0 to 100
  totalScore = Math.min(100, Math.max(0, totalScore));

  // Determine Risk Level
  let riskLevel: RiskLevel = 'low';
  if (totalScore >= 80) {
    riskLevel = 'critical';
  } else if (totalScore >= 55) {
    riskLevel = 'high';
  } else if (totalScore >= 25) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'low';
  }

  const factors: RiskFactor[] = [
    {
      name: 'Action Sensitivity',
      score: actionSensitivity,
      maxScore: 25,
      weight: 25,
      description: `Inherent risk of '${action}' operation.`,
    },
    {
      name: 'Target Sensitivity',
      score: targetSensitivity,
      maxScore: 25,
      weight: 25,
      description: target ? `Sensitivity assessment of '${target}'.` : 'General workspace resource.',
    },
    {
      name: 'Privilege Level',
      score: privilegeLevel,
      maxScore: 15,
      weight: 15,
      description: privilegeLevel > 5 ? 'Elevated process privileges detected.' : 'Standard non-privileged context.',
    },
    {
      name: 'External Communication',
      score: externalCommunication,
      maxScore: 15,
      weight: 15,
      description: externalCommunication > 5 ? 'Outbound network or remote sync involved.' : 'Local-only execution.',
    },
    {
      name: 'Reversibility',
      score: reversibility,
      maxScore: 10,
      weight: 10,
      description: reversibility > 5 ? 'Permanent filesystem/database alteration.' : 'Reversible or non-destructive.',
    },
    {
      name: 'Behavioral Anomaly',
      score: behavioralAnomaly,
      maxScore: 10,
      weight: 10,
      description: behavioralAnomaly > 0 ? 'Anomalous intent relative to session task context.' : 'Consistent with declared task.',
    },
  ];

  if (reasons.length === 0) {
    reasons.push('Standard low-risk development activity within bounds.');
  }

  return {
    totalScore,
    riskLevel,
    actionSensitivity,
    targetSensitivity,
    privilegeLevel,
    externalCommunication,
    reversibility,
    behavioralAnomaly,
    factors,
    reasons,
    detectedSecrets,
  };
}
