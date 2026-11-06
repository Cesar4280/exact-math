# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html): while the version is `0.x`, a minor
bump may contain breaking changes, and those are always listed first.

## [0.2.0] - 2026-11-06

All changes landed in [#1](https://github.com/Cesar4280/exact-math/pull/1).

### ⚠ Breaking changes

- Integer `number`s beyond `±Number.MAX_SAFE_INTEGER` now throw `InvalidNumberError` in the
  constructor, `fromInt()` and `pow()`. Such a value may already have been rounded before
  reaching the library (`9007199254740993` arrives as `9007199254740992`). Pass a `bigint` or an
  integer string instead: `new Rational(10n ** 21n)` or `new Rational("1000000000000000000000")`.
- Implicitly coercing a `Rational` now throws `InvalidNumberError`. Operators used to fall back
  to `"n/d"` strings and answer wrongly (`new Rational(9n) < new Rational(10n)` was `false`).
  This covers `<`, `>`, `+`, `-`, `*`, unary `+`, `==` against a primitive, `Number()` and
  string concatenation with `+`. Use `compare()`, `add()` and the other methods for math, and a
  template literal or `toString()` for text.

### Added

- `parseFraction()` and `Rational.fromFraction()` read fractions such as `"3/4"` or `"-6/8"`.
  `parse()` detects them, so `parse(r.toString())` now round-trips.

### Fixed

- `toDecimal()` no longer returns `"-0"` when a negative value rounds to zero.
- `fromJSON()` rejects fields that are not decimal integers (`""`, `"0x10"`, `"1.5"`) with
  `ParseError`, instead of reading `""` as 0 and `"0x10"` as 16, or throwing a native
  `SyntaxError`.
- `ExactMath.clamp()` rejects `min > max` instead of returning one of the bounds.
- `format()` rejects non-object options, and `ExactMath.weightedAverage()` rejects non-object
  items, with `InvalidNumberError` instead of a native `TypeError`.
- Validation errors name the offending argument and its type: `null` and arrays are no longer
  reported as `object`, and the binary `ExactMath` wrappers report `b` instead of `other`.

### Security

- CI actions are pinned to full commit SHAs, the workflow token is read-only, checkout
  credentials are not persisted, and the newest patched Node 22 is resolved on every run.

### Changed

- Toolchain: pnpm 12.18.0, TypeScript 7.0.2 (the generated declarations are semantically
  unchanged) and prettier 3.9.10.

## [0.1.0] - 2026-07-30

- Initial release.

[0.2.0]: https://github.com/Cesar4280/exact-math/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Cesar4280/exact-math/releases/tag/v0.1.0
