# Task Completion Checklist

When finishing code changes in this repository:

1. Run `yarn typecheck`.
2. Run tests (`yarn jest` or `yarn jest --coverage` when coverage is needed).
3. Run `trunk check` and resolve issues.
4. Run `trunk fmt` if formatting fixes are needed.
5. For native changes, validate in example app on affected platform(s):
   - `yarn example android`
   - `yarn example ios`
6. If distributable output is needed for release validation, run `yarn prepare`.
7. Ensure PR content follows template and includes test steps / issue linkage.
