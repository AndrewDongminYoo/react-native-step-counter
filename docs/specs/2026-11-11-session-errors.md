# Structured native session errors

Issue: #107.
Expose serializable errors with stable code, message, platform, sessionId, operation and fatal fields through the existing typed emitter.
Keep existing JS start arguments valid; add an optional session-scoped error callback and an additive native start method carrying a unique session token.
Android reports denied permission, missing sensors and failed registration only after fallback is exhausted.
iOS query errors remain recoverable; update errors terminate the session.
Preserve native error details in optional nativeCode and nativeDomain strings.
Ignore stale-session errors and remove owned error listeners during cleanup.
The example returns to its existing stopped state on fatal errors.

## Acceptance

JS tests exercise listener ownership, stale delivery and synchronous rollback.
Android tests exercise permission denial, missing sensors, registration false and security exceptions through generated transport.
iOS tests exercise query/update errors, JSON serialization and generation ownership.
No dependency or visual design change is required; physical sensor delivery remains a device verification limit.
