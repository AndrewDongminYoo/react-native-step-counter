# Accelerometer fallback optimization

Issue: #97.

Replace full ring scans and temporary vectors in the Android fallback with running sums and scalar arithmetic.
Keep Kotlin, existing thresholds, sampling, warm-up and strict greater-than-250ms refractory behavior.
Reset all accumulated state on session restart.
Use double running sums to limit accumulated cancellation error, retaining float projection arithmetic.

Acceptance: deterministic walking, rotation, stationary, zero and reset replays match the previous implementation's accepted sample indices.
Velocity estimates agree within 0.001 in the velocity estimate over the synthetic fixtures; exact threshold-adjacent equivalence for arbitrary input is not promised by floating-point reassociation.
A Linux-runnable JVM benchmark reports measured bytes/sample and ns/sample for both implementations, without a timing pass/fail threshold.
Android CI runs replay tests and the benchmark.
No CPU, battery or real-device accuracy claim follows from synthetic JVM results.
