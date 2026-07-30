# exact-math

Zero-dependency exact rational arithmetic for JavaScript. Every value is stored as a `BigInt`
numerator/denominator pair (`Rational`) instead of a JS `number`, so calculations never suffer
floating-point error:

```js
import { Rational } from "@cesar4280/exact-math";

Rational.fromDecimal("0.1").add(Rational.fromDecimal("0.2")).toDecimal();
// "0.3" — not "0.30000000000000004"
```

## Install

```bash
pnpm add @cesar4280/exact-math
# or: npm install @cesar4280/exact-math
```

Requires Node.js >= 22 (native `BigInt`, ESM-only, no build step).

## Why

`Number` is a 64-bit float. Any arithmetic that must be exact — money, percentages, statistics,
anything where `0.1 + 0.2 !== 0.3` is unacceptable — needs a representation that never rounds
until you explicitly ask it to. `Rational` keeps every value as an exact fraction, always reduced
to lowest terms, and only converts to a decimal string at the very end, as a deliberate,
presentation-layer step.

## Quick start

```js
import { Rational, ExactMath, format } from "@cesar4280/exact-math";

const a = Rational.fromDecimal("3.2");
const b = Rational.fromDecimal("3.1");

a.multiply(b).toString(); // "248/25"
a.multiply(b).toDecimal(); // "9.92"

const occupancy = ExactMath.percentage(Rational.fromInt(342), Rational.fromInt(400));
format(occupancy, { scale: 2 }); // "85.5"

Rational.fromInt(1).divide(Rational.fromInt(3)).toRepeatingDecimal(); // "0.(3)"
```

## API

- **`Rational`** — the core. Immutable, always reduced, denominator always positive.
  `add`/`subtract`/`multiply`/`divide`/`pow`/`inverse`/`abs`/`negate`/`compare`/`equals`, factory
  methods (`fromInt`, `fromDecimal`, `fromPercentage`, `zero`, `one`, `fromJSON`), and
  presentation methods (`toDecimal(scale)`, `toRepeatingDecimal()`, `decimalExpansionType()`,
  `toString()`, `toJSON()`).
- **`ExactMath`** — stateless static wrappers for functional-style call sites
  (`ExactMath.average(values)`, `.percentage(part, total)`, `.weightedAverage(items)`, `.clamp`,
  `.min`/`.max`, `.sum`, ...).
- **`parse` / `parseInteger` / `parseDecimal` / `parsePercentage`** — exact string → `Rational`
  parsing (`"3.25"` → `13/4`, `"25%"` → `1/4`), never through `parseFloat`.
- **`format(value, { scale })`** — the only sanctioned `Rational` → string presentation path.
- **`toJSON` / `fromJSON`** — round-trip as `{ numerator: string, denominator: string }`, never as
  a lossy `number`.
- **`gcd` / `lcm`** — the Euclidean-algorithm primitives the library optimizes its own arithmetic
  with, exported because their signature is stable and they're useful on their own.
- Typed errors: `DivisionByZeroError`, `InvalidNumberError`, `ParseError`, `PrecisionLimitError`,
  all extending `ExactMathError`.

Full design rationale — why `Rational` is the single stateful core, the one-way dependency
direction, and the domain invariants — is in
[docs/architecture.md](https://github.com/Cesar4280/exact-math/blob/main/docs/architecture.md).

## Examples

Runnable, self-contained scripts under [`examples/`](examples):

```bash
pnpm example:frequency-table      # exact percentages over sample grade data
pnpm example:weather-stats        # weighted averages, ratios, distributions
pnpm example:weather-stats-live   # same, fetched live from a public weather API
```

## TypeScript

Type declarations are generated from JSDoc and published alongside the package — no separate
`@types` package needed.

## Testing

```bash
pnpm test
```

Uses only `node:test` + `node:assert/strict` — no test framework dependency. Includes
property-based checks (random fractions verifying algebraic identities) and large-N stress tests
(10k–100k chained operations) to catch precision regressions.

## License

[MIT](LICENSE) © Cesar J. Fajardo Ortiz
