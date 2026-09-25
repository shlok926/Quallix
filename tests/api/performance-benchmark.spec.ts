import { test, expect } from '../../src/fixtures';
import { ContactFactory } from '../../src/data/factories/contact.factory';
import { ActionFactory } from '../../src/data/factories/action.factory';
import { BenchmarkRunner } from '../../src/utils/benchmark';
import { logger } from '../../src/utils/logger';

test.describe('Performance / Latency Baseline Benchmarking (FIX-10)', () => {
  // ---------------------------------------------------------------------------
  // 1. Sequential Contact Creation Latency Benchmark
  // ---------------------------------------------------------------------------
  test('@performance @api PERF-01 — should measure Contact Creation sequential latency and throughput', async ({ contactClient }) => {
    const stats = await BenchmarkRunner.runSequential(
      'POST /api/v1/contacts',
      async () => {
        const payload = ContactFactory.build();
        const response = await contactClient.createContact(payload);
        expect(response.status()).toBe(201);
      },
      { warmupIterations: 5, measuredIterations: 20 }
    );

    logger.info(`[Benchmark] ${stats.operation} | Iterations: ${stats.iterations} | p50: ${stats.p50Ms}ms | p95: ${stats.p95Ms}ms | Max: ${stats.maxMs}ms | Avg: ${stats.avgMs}ms | RPS: ${stats.rps}`);

    // Verify benchmark completed and generated valid statistics
    expect(stats.iterations).toBe(20);
    expect(stats.avgMs).toBeGreaterThan(0);
    expect(stats.p95Ms).toBeGreaterThanOrEqual(stats.p50Ms);
    expect(stats.rps).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // 2. Sequential Contact Retrieval & List Benchmark
  // ---------------------------------------------------------------------------
  test('@performance @api PERF-02 — should measure Contact Retrieval (GET) latency', async ({ contactClient }) => {
    // Seed initial contact for ID retrieval
    const seedPayload = ContactFactory.build();
    const seedRes = await contactClient.createContact(seedPayload);
    const seededContact = await seedRes.json();

    const stats = await BenchmarkRunner.runSequential(
      'GET /api/v1/contacts/:id',
      async () => {
        const response = await contactClient.getContact(seededContact.id);
        expect(response.status()).toBe(200);
      },
      { warmupIterations: 5, measuredIterations: 20 }
    );

    logger.info(`[Benchmark] ${stats.operation} | Iterations: ${stats.iterations} | p50: ${stats.p50Ms}ms | p95: ${stats.p95Ms}ms | Max: ${stats.maxMs}ms | Avg: ${stats.avgMs}ms | RPS: ${stats.rps}`);

    expect(stats.iterations).toBe(20);
    expect(stats.avgMs).toBeGreaterThan(0);
    expect(stats.p95Ms).toBeGreaterThanOrEqual(stats.p50Ms);
    expect(stats.rps).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // 3. Sequential Action Lifecycle Latency Benchmark
  // ---------------------------------------------------------------------------
  test('@performance @api PERF-03 — should measure Action Creation & Status Update latency', async ({ contactClient, actionClient }) => {
    const seedPayload = ContactFactory.build();
    const seedRes = await contactClient.createContact(seedPayload);
    const seededContact = await seedRes.json();

    const stats = await BenchmarkRunner.runSequential(
      'POST & PATCH /api/v1/actions',
      async () => {
        const actionPayload = ActionFactory.build({ contact_id: seededContact.id });
        const createRes = await actionClient.createAction(actionPayload);
        expect(createRes.status()).toBe(201);
        const createdAction = await createRes.json();

        const patchRes = await actionClient.updateStatus(createdAction.id, 'completed');
        expect(patchRes.status()).toBe(200);
      },
      { warmupIterations: 5, measuredIterations: 15 }
    );

    logger.info(`[Benchmark] ${stats.operation} | Iterations: ${stats.iterations} | p50: ${stats.p50Ms}ms | p95: ${stats.p95Ms}ms | Max: ${stats.maxMs}ms | Avg: ${stats.avgMs}ms | RPS: ${stats.rps}`);

    expect(stats.iterations).toBe(15);
    expect(stats.avgMs).toBeGreaterThan(0);
    expect(stats.p95Ms).toBeGreaterThanOrEqual(stats.p50Ms);
    expect(stats.rps).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // 4. Bounded Concurrent Operations Benchmark (Parallelism & Safety)
  // ---------------------------------------------------------------------------
  test('@performance @api PERF-04 — should measure bounded concurrent Contact Creation (10 parallel requests)', async ({ contactClient }) => {
    const concurrencyLevel = 10;

    const stats = await BenchmarkRunner.runConcurrent(
      'Concurrent POST /api/v1/contacts (N=10)',
      async () => {
        const payload = ContactFactory.build();
        const response = await contactClient.createContact(payload);
        expect(response.status()).toBe(201);
      },
      concurrencyLevel
    );

    logger.info(`[Benchmark] ${stats.operation} | Total Duration: ${stats.totalDurationMs}ms | Concurrency: ${stats.concurrency} | RPS: ${stats.rps}`);

    expect(stats.iterations).toBe(concurrencyLevel);
    expect(stats.concurrency).toBe(concurrencyLevel);
    expect(stats.totalDurationMs).toBeGreaterThan(0);
  });
});
