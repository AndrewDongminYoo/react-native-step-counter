# Style and Conventions

## Formatting

- Use 2-space indentation, UTF-8, LF endings (`.editorconfig`)
- Trim trailing whitespace and keep final newline
- Prettier config highlights:
  - `semi: true`
  - `singleQuote: false`
  - `printWidth: 100`
  - `tabWidth: 2`

## Naming

- `PascalCase`: types/interfaces/classes
- `camelCase`: functions/variables
- `UPPER_SNAKE_CASE`: exported constants

## Code Organization

- JS/TS public API and cross-platform behavior in `src/`
- Platform-specific behavior in `android/` and `ios/`
- Treat `lib/` as generated output (avoid manual edits)

## Testing Conventions

- Jest with `react-native` preset (`jest.config.js`)
- Test file names: `*.test.ts` or `*.test.tsx`
- Prefer colocated tests or `src/__tests__/`

## Commit/PR Conventions

- Conventional Commit + gitmoji style observed in repo:
  - `feat: ✨ ...`
  - `fix: ♻️ ...`
  - `docs: 📝 ...`
  - `chore: 🔨 ...`
- Keep PRs focused and use `.github/PULL_REQUEST_TEMPLATE.md`
