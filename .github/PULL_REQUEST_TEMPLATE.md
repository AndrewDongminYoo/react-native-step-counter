## 🔍 Summary

Please provide a concise description of what this PR does and why.

- **What** did you change?
- **Why** is this change necessary?

## 🛠️ Changes

<!-- List of changes; e.g. -->

- Added `parseStepData` utility
- Fixed off-by-one error in `startStepCounterUpdate`
- Updated docs for new iOS API

## 🔗 Related Issue

<!-- If this PR closes or references an issue, use #issue_number -->

- Closes #\_\_

## ✅ Type of Change

<!-- Select one -->

- [ ] Bug fix (non-breaking change)
- [ ] New feature (non-breaking change)
- [ ] Breaking change (backwards-incompatible)
- [ ] Documentation update
- [ ] Chore / Refactoring

## 📋 Checklist

- [ ] My code follows the repository’s style guidelines
- [ ] I have added tests covering my changes
- [ ] I have run `trunk check` and `yarn jest` locally with no failures
- [ ] I have updated the README or relevant documentation
- [ ] I have provided version and environment details if applicable

## 🚀 How to Test

1. `git checkout <this-branch>`
2. `yarn`
3. `yarn prepare`
4. `yarn jest`
5. **Example Usage:**
   ```js
   import {
     isSensorWorking,
     isStepCountingSupported,
     parseStepData,
     startStepCounterUpdate,
     stopStepCounterUpdate,
     type ParsedStepCountData,
   } from '@dongminyu/react-native-step-counter';
   // …
   ```

## 📸 Screenshots (if applicable)

If your change adds UI or visual output, include before/after screenshots or GIFs.
