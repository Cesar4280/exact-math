# Architecture

## Why `Rational` is the core

`Rational` (`src/math/Rational.js`) is the only stateful class in the library. Every other module
(`parser.js`, `formatter.js`, `Serializer.js`, `ExactMath.js`) is a thin adapter around it rather
than an independent implementation, because letting parsing/formatting/serialization each carry
their own numeric logic would create multiple places where a rounding or simplification bug could
be introduced and drift out of sync. Centralizing in one class means:

- there is exactly one place that reduces to lowest terms using `gcd()` from
  `number-theory.js` and normalizes the denominator sign. Every `Rational` in
  the system is the unique canonical representation of its value, which is what
  makes `equals()` a cheap structural comparison instead of a numeric one;
- there is exactly one rounding algorithm (`toDecimal()`), so "how do we go from exact to display
  precision" is answered once, not reimplemented per call site;
- validation of inputs (rejecting `NaN`/`Infinity`/non-integers/`null`/`undefined`, integer
  `number`s beyond `±Number.MAX_SAFE_INTEGER` — which may already have been rounded before they
  arrive, so their exact value is unknowable — and requiring operands to already be `Rational`
  instances) happens in one constructor and one `assertRational` helper, so it can't be silently
  skipped by going through a different entry point.

`number-theory.js` backs both of the library's two size-control optimizations: `multiply()` cross-cancels
common factors (`gcd(a.n, b.d)`, `gcd(b.n, a.d)`) before multiplying, and `add()`/`subtract()` use
`lcm(a.d, b.d)` (also in `number-theory.js`, defined as `(a / gcd(a, b)) * b`) as the common denominator
instead of the raw product `a.d * b.d`. Both exist for the same reason: when the two denominators
share a large common factor, working with the product instead of the LCM would carry that shared
factor through an extra multiplication only to divide it back out during the constructor's
reduction step — correct either way, but needlessly larger intermediate BigInts.

## Dependency direction

Imports are one-way: `parser.js`, `formatter.js`, and `Serializer.js` depend on `Rational.js`, and
`Rational.js` depends on nothing above it (only `number-theory.js` and `errors.js`). Concretely:

- `parseDecimal()` / `parsePercentage()` in `parser.js` simply call `Rational.fromDecimal()` /
  `Rational.fromPercentage()` — the actual parsing regex and BigInt arithmetic live as static
  methods on `Rational`, not in `parser.js`.
- `format()` in `formatter.js` calls `Rational#toDecimal()`.
- `toJSON()`/`fromJSON()` in `Serializer.js` call `Rational#toJSON()` / `Rational.fromJSON()`.

This is deliberate, not incidental: if `Rational.js` ever imported back from `parser.js` (e.g. to
reuse a regex), Node's ESM loader would still resolve it, but reasoning about "what does
constructing a `Rational` from a string actually do" would require jumping across three files
instead of one. Keeping the heavy logic on `Rational` and the module-level functions as
pass-throughs also means `parser.js`/`formatter.js`/`Serializer.js` can be extended with
project-specific convenience functions later without ever touching the numeric core.

When adding a new capability, ask "does this belong on `Rational` (a general operation on the
value itself) or on one of the thin modules (a convenience wrapper for one call site)?" — default
to putting logic on `Rational` unless it's purely about string/JSON shape.

## Why `parser`/`formatter`/`Serializer` stay thin

Each of these modules exists to give the _concept_ (parsing, formatting, serialization) a stable,
discoverable entry point and name, independent of whether the implementation happens to live on
`Rational` today. They intentionally do not:

- hold any state,
- implement arithmetic,
- know about each other (no cross-imports between `parser.js`, `formatter.js`, `Serializer.js`).

`ExactMath.js` follows the same pattern for arithmetic: it is a static-method façade over
`Rational` instance methods (`ExactMath.add(a, b)` → `a.add(b)`), useful for functional-style call
sites (`values.reduce(ExactMath.add)`) without duplicating any logic.

## Domain invariants

These hold for every `Rational` instance at all times, not just after construction — every method
that returns a new `Rational` goes through the same constructor, so the invariants are enforced in
one place:

- **Immutable** — `#n`/`#d` are private fields with no setters; every operation returns a new
  instance.
- **Always reduced** — numerator and denominator are divided by their GCD (Euclidean algorithm,
  `number-theory.js`) before the constructor returns.
- **Denominator strictly positive** — sign always lives on the numerator; `3/-4` normalizes to
  `-3/4`, never `3/-4` or `-3/-4`.
- **No implicit `Number` coercion** — arithmetic methods require the other operand to already be
  a `Rational` (enforced via `assertRational()`); there is no `add(5)` shorthand. Comparisons
  (`compare()`/`equals()`) cross-multiply instead of converting either side to a float.
- **`Number`/`number` only ever appears at the boundary** — `toDecimal()`/`format()` produce a
  _string_, not a `number`, and are the only place rounding happens; nothing upstream of them ever
  calls `Math.round`/`Math.floor`/`Math.ceil`/`parseFloat`/`toFixed`. See the root
  [CLAUDE.md](../CLAUDE.md) for this rule — it's a cross-cutting constraint, not something local
  to this file.

`toRepeatingDecimal()` exists alongside `toDecimal()` rather than replacing or being folded into
it: `toDecimal(scale)` is a rounded approximation at a fixed scale (used for everyday display,
default 5 — that default is an intentional API decision, not something to "fix" by raising it),
while `toRepeatingDecimal()` is the _exact_ decimal expansion, marking the repeating period in
parentheses (`1/3` -> `"0.(3)"`) when one exists. Detecting that period is only possible because
the value is stored exactly as numerator/denominator; it has no equivalent in a float- or
BigDecimal-backed type. It takes a `maxPeriodLength` safety cap (default 1000) and throws
`PrecisionLimitError` rather than hanging or allocating unbounded memory for a denominator whose
period turns out to be extremely long.

`decimalExpansionType()` answers "terminating / pure-periodic / mixed-periodic" without
generating any digits, based on the classical result that a reduced fraction terminates in base
10 iff its denominator's only prime factors are 2 and 5 — it just divides `this.#d` by 2 and 5
until neither divides evenly, in O(log denominator). It doesn't need to reduce the fraction first
(unlike a standalone version of this algorithm) because `this.#d` is already in lowest terms by
the class invariant. This is the cheap check to run before deciding whether
`toRepeatingDecimal()`'s O(period length) — bounded by `maxPeriodLength`, but potentially up to
`denominator - 1` digits — is worth paying for.

## API stability

```text
Public API                    Internal implementation

src/math/index.js       ──▶   Rational.js
                               ExactMath.js
                               parser.js
                               formatter.js
                               Serializer.js
                               number-theory.js
                               errors.js
```

Only what `index.js` re-exports is the public API. This isn't just a convention — `package.json`'s
`exports` field enforces it at the module-resolution level: `import { Rational } from
"@cesar4280/exact-math"` resolves, `import { Rational } from
"@cesar4280/exact-math/src/math/Rational.js"` does not. That means any internal file can be
renamed, split, or have its module boundaries redrawn (e.g. moving a helper out of `Rational.js`
into `number-theory.js`, as already happened once) without it being a breaking change, as long as
what `index.js` exports keeps behaving the same. Treat a change to `index.js`'s export list, or to
the observable behavior of anything it exports, as the actual API surface to reason about
compatibility for — not the internal file layout.

## Compatibility

- **Runtime**: Node.js >= 22 only (native `BigInt`, ESM). Not tested against browsers, Deno, or
  Bun — nothing in the implementation is Node-specific, but nothing has been verified there either.
- **Module system**: ESM only (`"type": "module"`, `exports` field with no `require` condition).
  No CommonJS build is published.
- **TypeScript**: `.d.ts` declarations are generated from JSDoc and published alongside the
  JavaScript (see [prettier.md](prettier.md) for the sibling doc on the formatting side of the
  toolchain, and the root [CLAUDE.md](../CLAUDE.md) for why there's no JS build step even though
  `tsc` runs).
