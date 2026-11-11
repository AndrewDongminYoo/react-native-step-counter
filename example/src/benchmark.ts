// Opt in before a full Release rebuild. Logging/render controls live in logging.ts.
export const BENCHMARK_ENABLED: boolean = false;
export const BENCHMARK_WARMUP_MS = 10_000;
export const BENCHMARK_DURATION_MS = 60_000;

// RN provides this monotonic API; its strict generated surface omits the global type.
export const benchmarkNow = () =>
  (globalThis as unknown as { performance: { now(): number } }).performance.now();

export type Observation = {
  stage: "js_filter" | "example_commit";
  durationNs: number;
  accepted: boolean;
  coalesced: number;
};

/** JS monotonic observations only; never subtract a native or Unix timestamp. */
export class BenchmarkSession {
  private records: Observation[] = [];
  private omitted = 0;
  private stopped = false;

  constructor(
    private readonly startMs: number,
    private readonly warmupMs = BENCHMARK_WARMUP_MS,
    private readonly durationMs = BENCHMARK_DURATION_MS,
    private readonly capacity = 20_000
  ) {}

  observe(
    stage: Observation["stage"],
    beginMs: number,
    endMs: number,
    accepted = true,
    coalesced = 0
  ): void {
    if (
      this.stopped ||
      !Number.isFinite(beginMs) ||
      !Number.isFinite(endMs) ||
      endMs < beginMs ||
      beginMs < this.startMs + this.warmupMs ||
      endMs > this.startMs + this.warmupMs + this.durationMs
    )
      return;
    if (this.records.length >= this.capacity) {
      this.omitted++;
      return;
    }
    this.records.push({
      stage,
      durationNs: Math.round((endMs - beginMs) * 1e6),
      accepted,
      coalesced,
    });
  }

  finish(nowMs = benchmarkNow()) {
    this.stopped = true;
    return {
      records: this.records.slice(),
      omitted: this.omitted,
      windowComplete: nowMs >= this.startMs + this.warmupMs + this.durationMs,
    };
  }
}
