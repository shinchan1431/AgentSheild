import { DetectedSecret } from '../types';

// Built-in secret file patterns that should be strictly protected
export const DEFAULT_SECRET_FILE_PATTERNS = [
  '**/.env*',
  '**/*.env',
  '**/credentials.json',
  '**/secrets.json',
  '**/secrets.yml',
  '**/secrets.yaml',
  '**/*id_rsa*',
  '**/*id_ed25519*',
  '**/*.pem',
  '**/*.key',
  '**/*.p12',
  '**/*.pfx',
  '**/.aws/*',
  '**/.gcp/*',
  '**/.kube/config',
  '**/shadow',
  '**/passwd',
  '**/.npmrc',
  '**/.pypirc',
  '**/.netrc',
  '**/token.json',
];

// Regex rules for active token & key patterns
const SECRET_REGEX_PATTERNS: { type: string; regex: RegExp; entropyThreshold: number }[] = [
  {
    type: 'OpenAI / AI Secret API Key',
    regex: /sk-[a-zA-Z0-9_-]{20,64}/g,
    entropyThreshold: 3.5,
  },
  {
    type: 'Anthropic API Key',
    regex: /sk-ant-[a-zA-Z0-9_-]{30,80}/g,
    entropyThreshold: 3.5,
  },
  {
    type: 'Google / Gemini API Key',
    regex: /AIza[0-9A-Za-z-_]{35}/g,
    entropyThreshold: 3.4,
  },
  {
    type: 'AWS Access Key ID',
    regex: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g,
    entropyThreshold: 3.0,
  },
  {
    type: 'AWS Secret Access Key',
    regex: /aws_secret_access_key\s*[:=]\s*["']?([A-Za-z0-9/+=]{40})["']?/gi,
    entropyThreshold: 4.2,
  },
  {
    type: 'GitHub Personal Access Token',
    regex: /gh[pousr]_[0-9a-zA-Z]{36,40}/g,
    entropyThreshold: 3.5,
  },
  {
    type: 'JSON Web Token (JWT)',
    regex: /eyJ[A-Za-z0-9-_=]+\.eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_.+/=]+/g,
    entropyThreshold: 4.0,
  },
  {
    type: 'RSA / EC / OpenSSH Private Key',
    regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g,
    entropyThreshold: 3.0,
  },
  {
    type: 'Generic High-Entropy Bearer Token',
    regex: /Bearer\s+([a-zA-Z0-9_\-\.]{24,})/gi,
    entropyThreshold: 3.8,
  },
  {
    type: 'Database Connection String with Password',
    regex: /(?:postgres|postgresql|mysql|mongodb(?:\+srv)?|redis):\/\/[a-zA-Z0-9_\-]+:([^@\s]+)@[a-zA-Z0-9_\-\.]+/gi,
    entropyThreshold: 3.2,
  },
];

/**
 * Calculates Shannon Entropy of a string to identify cryptographic random secrets
 */
export function calculateShannonEntropy(str: string): number {
  if (!str || str.length === 0) return 0;
  const freq: Record<string, number> = {};
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    freq[char] = (freq[char] || 0) + 1;
  }
  let entropy = 0;
  const len = str.length;
  for (const char in freq) {
    const p = freq[char] / len;
    entropy -= p * Math.log2(p);
  }
  return Number(entropy.toFixed(2));
}

/**
 * Checks if a target file path matches secret file patterns
 */
export function isSecretFilePath(path: string, customPatterns?: string[]): { isSecret: boolean; matchedPattern?: string } {
  if (!path) return { isSecret: false };
  const patterns = customPatterns && customPatterns.length > 0 ? customPatterns : DEFAULT_SECRET_FILE_PATTERNS;

  const normalized = path.toLowerCase().replace(/\\/g, '/');

  for (const pattern of patterns) {
    const cleanPat = pattern.toLowerCase().replace(/\*\*\//g, '').replace(/\*/g, '');
    if (normalized.includes(cleanPat) || (pattern.includes('.env') && (normalized.endsWith('.env') || normalized.includes('/.env')))) {
      return { isSecret: true, matchedPattern: pattern };
    }
  }

  // Quick fallback checks
  if (/(^\.env|\/\.env|id_rsa|id_ed25519|\.pem$|\.key$|\.aws\/|credentials\.json)/i.test(normalized)) {
    return { isSecret: true, matchedPattern: 'default_credential_pattern' };
  }

  return { isSecret: false };
}

/**
 * Scans arbitrary string content for leaked credentials, private keys, and high-entropy secrets
 */
export function scanContentForSecrets(content: string, locationContext: string = 'payload'): DetectedSecret[] {
  if (!content || typeof content !== 'string') return [];

  const detected: DetectedSecret[] = [];
  const seenMatches = new Set<string>();

  for (const { type, regex, entropyThreshold } of SECRET_REGEX_PATTERNS) {
    // Reset regex index
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      const matchText = match[0];
      if (seenMatches.has(matchText)) continue;
      seenMatches.add(matchText);

      const entropy = calculateShannonEntropy(matchText);
      const masked = maskSecretString(matchText);

      detected.push({
        type,
        match: matchText,
        masked,
        entropy,
        location: locationContext,
      });
    }
  }

  // Generic high-entropy scanner for string assignments like API_KEY = "xyz"
  const assignmentRegex = /(?:key|secret|token|password|auth|credential|api_key|priv_key|private_key)\s*[:=]\s*["']([A-Za-z0-9_-]{16,})["']/gi;
  let assignMatch: RegExpExecArray | null;
  while ((assignMatch = assignmentRegex.exec(content)) !== null) {
    const rawSecret = assignMatch[1];
    if (rawSecret && !seenMatches.has(rawSecret)) {
      const entropy = calculateShannonEntropy(rawSecret);
      if (entropy >= 3.3) {
        seenMatches.add(rawSecret);
        detected.push({
          type: 'High-Entropy Secret Variable',
          match: rawSecret,
          masked: maskSecretString(rawSecret),
          entropy,
          location: locationContext,
        });
      }
    }
  }

  return detected;
}

/**
 * Safely masks secret values with standard security redaction
 */
export function maskSecretString(secret: string): string {
  if (!secret) return '';
  if (secret.length <= 8) {
    return '••••••••';
  }
  const prefix = secret.slice(0, 4);
  const suffix = secret.slice(-3);
  return `${prefix}••••••••${suffix}`;
}

/**
 * Redacts all discovered secrets from input text before displaying or forwarding
 */
export function redactAllSecrets(text: string): { sanitized: string; count: number } {
  if (!text) return { sanitized: '', count: 0 };
  let count = 0;
  let sanitized = text;

  const secrets = scanContentForSecrets(text);
  for (const item of secrets) {
    if (sanitized.includes(item.match)) {
      sanitized = sanitized.replaceAll(item.match, `[AGENTSHIELD_REDACTED_${item.type.toUpperCase().replace(/\s+/g, '_')}]`);
      count++;
    }
  }

  return { sanitized, count };
}
