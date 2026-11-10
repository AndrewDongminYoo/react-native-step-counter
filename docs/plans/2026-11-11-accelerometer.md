# Accelerometer fallback implementation

1. Add an independent legacy reference and replay/allocation regression using the actual fallback service.
2. Observe the allocation regression fail before changing production code.
3. Extract a pure Kotlin processor, use double running sums, bounded ring indices and scalar vectors, and remove unconditional step logging.
4. Run native tests and benchmark through the example Gradle project; wire benchmark results into Android CI.
5. Check documentation, TypeScript, Jest, package build and scoped lint; review the final diff before commit and hosted review.

Owned paths: Android fallback service and processor, Android replay/benchmark tests, native Android workflow, these contract documents and benchmark documentation.
No public API or dependency changes.
