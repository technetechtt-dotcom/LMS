const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'refreshtoken',
  'accesstoken',
  'secret',
  'totpsecret',
  'authorization',
  'idnumber',
  'nationalid',
  'rsaid',
  'email',
]);

export function redactAuditValue(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[truncated]';
  if (value == null) return value;
  if (typeof value === 'function' || typeof value === 'symbol') return undefined;
  if (typeof value === 'string') {
    if (value.length > 500) return `${value.slice(0, 80)}…[redacted length ${value.length}]`;
    return value;
  }
  if (typeof value !== 'object') return value;
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof (value as { toJSON?: () => unknown }).toJSON === 'function') {
    return redactAuditValue((value as { toJSON: () => unknown }).toJSON(), depth);
  }
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((v) => redactAuditValue(v, depth + 1));
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (k === 'constructor' || typeof v === 'function' || typeof v === 'symbol') {
      continue;
    }
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      out[k] = '[redacted]';
    } else {
      out[k] = redactAuditValue(v, depth + 1);
    }
  }
  return out;
}
