type MethodStats = { count: number; errors: number; totalDurationMs: number };

const startedAt = Date.now();
const methods = new Map<string, MethodStats>();

export const telemetry = {
  observe(method: string, statusCode: number, durationMs: number) {
    const key = method.toUpperCase();
    const current = methods.get(key) ?? { count: 0, errors: 0, totalDurationMs: 0 };
    current.count += 1;
    current.errors += statusCode >= 500 ? 1 : 0;
    current.totalDurationMs += durationMs;
    methods.set(key, current);
  },
  snapshot() {
    return {
      startedAt: new Date(startedAt).toISOString(),
      methods: Object.fromEntries([...methods].map(([method, value]) => [method, {
        count: value.count,
        serverErrors: value.errors,
        averageDurationMs: value.count
          ? Math.round((value.totalDurationMs / value.count) * 100) / 100
          : 0,
      }])),
    };
  },
};
