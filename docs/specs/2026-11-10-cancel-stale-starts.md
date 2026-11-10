# Cancel stale example starts

Refs #106.
The example must start only for the latest live operation, preserving the native capability result as the source of support and grant truth.
STOP, unmount, and a newer start invalidate pending capability and permission work.
Denied permission stays stopped; blocked permission may open Settings and waits for an inactive/background-to-active transition before checking again.
On iOS, the first prompt denial also returns blocked; only a block detected before START opens Settings, so the first denial stays in the app.
Initial capability rejection leaves a stopped state and records a diagnostic.
Public library APIs, native backends, dependencies, and layout are outside scope.

Acceptance requires controlled-promise regressions for cancellation at asynchronous boundaries, double start, rejection, and settings return, plus the declared Jest, TypeScript, and build gates.
Android/iOS manual settings-return checks remain required before issue completion; unit mocks cannot prove OS behavior.
