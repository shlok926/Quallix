import { performance } from 'perf_hooks';

export interface BenchmarkStats {
  operation: string;
  iterations: number;
  concurrency: number;
  minMs: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
  avgMs: number;
  totalDurationMs: number;
  rps: number;
}

export class BenchmarkRunner {
  /**
   * Executes an asynchronous operation across warm-up and measured iterations.
   * Collects individual latencies and calculates standard benchmark statistics.
   */
  static async runSequential(
    operationName: string,
    fn: (index: number) => Promise<void>,
    options: { warmupIterations?: number; measuredIterations?: number } = {}
  ): Promise<BenchmarkStats> {
    const warmup = options.warmupIterations ?? 5;
    const measured = options.measuredIterations ?? 20;

    // 1. Warm-up phase (prime route caches / in-memory store)
    for (let i = 0; i < warmup; i++) {
      await fn(i);
    }

    // 2. Measured phase
    const durations: number[] = [];
    const startTime = performance.now();

    for (let i = 0; i < measured; i++) {
      const iterStart = performance.now();
      await fn(i);
      const iterEnd = performance.now();
      durations.push(iterEnd - iterStart);
    }

    const totalDurationMs = performance.now() - startTime;
    return this.calculateStats(operationName, durations, totalDurationMs, 1);
  }

  /**
   * Executes a batch of concurrent operations and measures aggregated throughput.
   */
  static async runConcurrent(
    operationName: string,
    fn: (index: number) => Promise<void>,
    concurrency: number
  ): Promise<BenchmarkStats> {
    const durations: number[] = [];
    const startTime = performance.now();

    const tasks = Array.from({ length: concurrency }, async (_, i) => {
      const iterStart = performance.now();
      await fn(i);
      const iterEnd = performance.now();
      durations.push(iterEnd - iterStart);
    });

    await Promise.all(tasks);
    const totalDurationMs = performance.now() - startTime;

    return this.calculateStats(operationName, durations, totalDurationMs, concurrency);
  }

  /**
   * Computes statistical distribution percentiles (min, p50, p95, max, avg, RPS).
   */
  private static calculateStats(
    operation: string,
    durations: number[],
    totalDurationMs: number,
    concurrency: number
  ): BenchmarkStats {
    if (durations.length === 0) {
      throw new Error('No benchmark durations recorded');
    }

    const sorted = [...durations].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, v) => acc + v, 0);
    const avg = sum / sorted.length;
    const p50Index = Math.floor(sorted.length * 0.5);
    const p95Index = Math.min(Math.floor(sorted.length * 0.95), sorted.length - 1);
    const rps = totalDurationMs > 0 ? (sorted.length / (totalDurationMs / 1000)) : 0;

    return {
      operation,
      iterations: sorted.length,
      concurrency,
      minMs: Number(sorted[0].toFixed(2)),
      p50Ms: Number(sorted[p50Index].toFixed(2)),
      p95Ms: Number(sorted[p95Index].toFixed(2)),
      maxMs: Number(sorted[sorted.length - 1].toFixed(2)),
      avgMs: Number(avg.toFixed(2)),
      totalDurationMs: Number(totalDurationMs.toFixed(2)),
      rps: Number(rps.toFixed(2)),
    };
  }
}
