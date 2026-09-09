const baseUrl = (process.env.LOAD_BASE_URL || '').replace(/\/$/, '');
const virtualUsers = Math.min(100, Math.max(1, Number(process.env.LOAD_VUS || 20)));
const durationMs = Math.min(300_000, Math.max(5_000, Number(process.env.LOAD_DURATION_MS || 30_000)));
const p95LimitMs = Math.max(50, Number(process.env.LOAD_P95_LIMIT_MS || 1_000));

if (!baseUrl) throw new Error('LOAD_BASE_URL is required');
if (!baseUrl.startsWith('https://') && process.env.ALLOW_HTTP !== '1') {
  throw new Error('LOAD_BASE_URL must use HTTPS');
}

const latencies = [];
let requests = 0;
let errors = 0;
const deadline = Date.now() + durationMs;

async function worker() {
  while (Date.now() < deadline) {
    const started = performance.now();
    try {
      const response = await fetch(`${baseUrl}/health/live`, {
        signal: AbortSignal.timeout(5_000),
        headers: { 'User-Agent': 'skillforge-release-load-test/1' },
      });
      if (!response.ok) errors += 1;
      await response.arrayBuffer();
    } catch {
      errors += 1;
    } finally {
      requests += 1;
      latencies.push(performance.now() - started);
    }
  }
}

await Promise.all(Array.from({ length: virtualUsers }, () => worker()));
latencies.sort((a, b) => a - b);
const p95 = latencies[Math.max(0, Math.ceil(latencies.length * 0.95) - 1)] || 0;
const errorRate = requests ? errors / requests : 1;
const result = {
  baseUrl,
  virtualUsers,
  durationMs,
  requests,
  errors,
  errorRate,
  p95Ms: Math.round(p95 * 100) / 100,
  passed: errorRate <= 0.01 && p95 <= p95LimitMs,
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!result.passed) process.exit(1);
