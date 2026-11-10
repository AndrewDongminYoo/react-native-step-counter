# Native compatibility implementation

Approved direction: implement #100 through the explicit PR-loop invocation, using the issue's tested-minimum option.

1. Inspect metadata, installation guides, native toolchain configuration and CI; identify the false RN 0.71 support promise.
2. Narrow peers and document the RN 0.88 / React 19.3 New Architecture contract and migration.
3. Add a disposable clean consumer generator using a packed library and the pinned official CLI/template; compile it in both native workflows.
4. Fix the requested JSDoc function name; regenerate the lockfile with `yarn install --immutable` semantics after metadata resolution.
5. Run JS tests, typecheck, package build, scoped formatting/lint and consumer generation; observe both native CI builds on the exact PR head.
6. Review the full candidate, commit metadata/CI/docs together and the separate JSDoc correction, then complete hosted review and gated merge.

Owned paths: package metadata/lockfile, README requirements, native compatibility docs, consumer script, native workflows and the single JSDoc example.
Content-only changes use manifest/source readers rather than tests that repeat text.
The consumer build is the executable compatibility check; failed generation or dependency installation is never counted as a native compilation result.
