import { AuditLogEntry, MfaSessionToken } from '../types';

export const GENESIS_PREV_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

// Compute SHA-256 using standard browser Web Crypto API
export async function computeSha256(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Deterministic fallback for environments without crypto.subtle
  let hash = 0x811c9dc5;
  for (let i = 0; i < content.length; i++) {
    hash ^= content.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  const hex = hash.toString(16).padStart(8, '0');
  return `${hex}${hex}${hex}${hex}${hex}${hex}${hex}${hex}`.slice(0, 64);
}

// Compute deterministic hash for an audit entry linking to prevHash
export async function computeAuditEntryHash(
  prevHash: string,
  timestamp: number,
  actor: string,
  action: string,
  details: string
): Promise<string> {
  const payload = `${prevHash}|${timestamp}|${actor}|${action}|${details}`;
  return computeSha256(payload);
}

// Verify complete Merkle hash chain from genesis to head
export async function verifyMerkleChain(
  entries: AuditLogEntry[]
): Promise<{ valid: boolean; totalChecked: number; brokenIndex?: number; error?: string }> {
  if (entries.length === 0) {
    return { valid: true, totalChecked: 0 };
  }

  // Chain ordered chronologically: entries[entries.length - 1] is genesis, entries[0] is newest (or vice versa)
  // Let's sort oldest first for chain validation
  const chronological = [...entries].sort((a, b) => a.timestamp - b.timestamp);

  for (let i = 0; i < chronological.length; i++) {
    const entry = chronological[i];
    const expectedPrev = i === 0 ? GENESIS_PREV_HASH : chronological[i - 1].hash;

    if (entry.prevHash !== expectedPrev) {
      return {
        valid: false,
        totalChecked: i,
        brokenIndex: i,
        error: `Broken hash link at entry [${entry.id}] (${entry.action}). Expected prevHash ${expectedPrev.slice(0, 16)}..., found ${entry.prevHash.slice(0, 16)}...`,
      };
    }

    const calculatedHash = await computeAuditEntryHash(
      entry.prevHash,
      entry.timestamp,
      entry.actor,
      entry.action,
      entry.details
    );

    if (calculatedHash !== entry.hash) {
      return {
        valid: false,
        totalChecked: i,
        brokenIndex: i,
        error: `Cryptographic digest mismatch at entry [${entry.id}]. Expected ${calculatedHash.slice(0, 16)}..., stored ${entry.hash.slice(0, 16)}...`,
      };
    }
  }

  return { valid: true, totalChecked: chronological.length };
}

// In-memory MFA short-lived token store
const activeMfaSessions = new Map<string, MfaSessionToken>();

export async function createMfaSessionToken(action: string, durationSeconds = 120): Promise<MfaSessionToken> {
  const expiresAt = Date.now() + durationSeconds * 1000;
  const raw = `mfa-auth:${action}:${expiresAt}:${Math.random().toString(36).slice(2)}`;
  const signature = await computeSha256(raw);
  const token: MfaSessionToken = {
    token: `mfa_tok_${signature.slice(0, 24)}`,
    expiresAt,
    action,
    signature,
  };
  activeMfaSessions.set(token.token, token);
  return token;
}

export function verifyMfaToken(tokenString: string, requiredAction: string): { valid: boolean; reason?: string } {
  if (!tokenString) {
    return { valid: false, reason: 'MFA session token missing. Authentication required.' };
  }
  const session = activeMfaSessions.get(tokenString);
  if (!session) {
    return { valid: false, reason: 'Invalid or revoked MFA session token.' };
  }
  if (Date.now() > session.expiresAt) {
    activeMfaSessions.delete(tokenString);
    return { valid: false, reason: 'MFA session token has expired (120s TTL). Please re-authenticate.' };
  }
  if (session.action !== '*' && session.action !== requiredAction) {
    return { valid: false, reason: `MFA session token granted for '${session.action}', but required '${requiredAction}'.` };
  }
  return { valid: true };
}
