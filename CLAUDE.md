# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`exact-math` is a zero-dependency exact rational arithmetic library. Every value is stored as a
`BigInt` numerator/denominator pair (`Rational`) instead of a JS `number`, so calculations never
suffer floating-point error (e.g. `0.1 + 0.2 === 0.3` exactly, not `0.30000000000000004`).
`Number`/`parseFloat`/`toFixed`/`Math.round`/`Math.floor`/`Math.ceil` must never be used inside
math logic — only `Rational.toDecimal()` / `format()` (presentation-layer only) may round.

## Commands

```bash
pnpm install          # install (prettier + typescript, both devDependencies only)
pnpm test             # run the full suite (node:test, no test framework dependency)
pnpm format           # prettier --write .
pnpm format:check     # prettier --check .
pnpm build:types      # regenerate types/*.d.ts from JSDoc (tsc --emitDeclarationOnly)
```

Formatting is enforced by `.prettierrc.json`; see [docs/prettier.md](docs/prettier.md) for the
rationale behind the option grouping/ordering before editing that file.

Run a single test file or a single test by name:

```bash
node --test test/rational.test.js
node --test --test-name-pattern="toDecimal propaga el acarreo" test/rational.test.js
```

There is no JavaScript build step or transpiler — the published JavaScript is the exact same
source that runs in Node, plain ESM (`"type": "module"`) run directly by Node's built-in test
runner. Requires Node >= 22 (BigInt, native `node:test`). TypeScript is a devDependency used only
to generate `.d.ts` declaration files from JSDoc (`tsc --emitDeclarationOnly`, see `tsconfig.json`
and `pnpm build:types`) — it never touches the JavaScript itself.

## Architecture

All source lives in `src/math/`, re-exported through `src/math/index.js`, built around one
stateful core (`Rational.js`) with thin adapters around it (`ExactMath.js`, `parser.js`,
`formatter.js`, `Serializer.js`, `errors.js`). See
[docs/architecture.md](docs/architecture.md) for the reasoning behind that split, the
one-way dependency direction, and the domain invariants (immutability, always-reduced,
positive denominator, no implicit `Number` coercion) — read it before restructuring any of
these modules or adding a new one.

## Testing conventions

Tests live in `test/*.test.js` using only `node:test` + `node:assert/strict` (no Jest/Mocha).
Beyond example-based cases, `test/rational.test.js` includes property-based checks (random
fractions verifying commutativity/associativity/distributivity/identities) and large-N stress
tests (10k–100k chained operations) to catch precision regressions — follow that pattern when
adding coverage for new operations rather than only testing hand-picked values.
