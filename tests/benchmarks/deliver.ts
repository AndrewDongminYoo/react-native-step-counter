/** Replay through the host task queue; this does not model a native bridge. */
export async function deliverBatches<T>(
  events: readonly T[],
  batchSize: number,
  consume: (batch: readonly T[]) => void
): Promise<void> {
  if (!Number.isSafeInteger(batchSize) || batchSize <= 0) throw new Error("Invalid batchSize");
  for (let offset = 0; offset < events.length; offset += batchSize) {
    await Promise.resolve();
    consume(events.slice(offset, offset + batchSize));
  }
}
