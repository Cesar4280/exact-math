/**
 * Base class for every error raised by this library. Lets callers do
 * `catch (e) { if (e instanceof ExactMathError) ... }` without knowing
 * about the specific subtype. `new.target.name` picks up whichever
 * subclass was actually constructed, so subclasses don't need to repeat
 * `this.name = "..."` themselves.
 */
export class ExactMathError extends Error {
  /** @param {string} [message] */
  constructor(message) {
    super(message);
    this.name = new.target.name;
  }
}

/** Raised when a denominator is (or would become) zero. */
export class DivisionByZeroError extends ExactMathError {
  constructor(message = "Division by zero.") {
    super(message);
  }
}

/**
 * Raised when a value cannot be treated as an exact integer/BigInt:
 * NaN, Infinity, null, undefined, non-integer numbers, integer numbers beyond
 * ±Number.MAX_SAFE_INTEGER, wrong types; and when a Rational is implicitly
 * coerced by an operator (`<`, `+`, `Number(r)`, ...).
 */
export class InvalidNumberError extends ExactMathError {}

/** Raised when a string cannot be parsed into a Rational. */
export class ParseError extends ExactMathError {}

/** Raised when a requested exact representation would exceed a configured size limit. */
export class PrecisionLimitError extends ExactMathError {}

/**
 * Names a value's type for error messages: like `typeof`, but reports `"null"`
 * and `"array"` instead of the `"object"` that `typeof` gives for both.
 *
 * Internal helper shared by every module's input validation; not part of the
 * public API (index.js does not re-export it).
 *
 * @param {unknown} value
 * @returns {string}
 */
export function describeType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}
