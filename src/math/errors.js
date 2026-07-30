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
 * NaN, Infinity, null, undefined, non-integer numbers, wrong types.
 */
export class InvalidNumberError extends ExactMathError {}

/** Raised when a string cannot be parsed into a Rational. */
export class ParseError extends ExactMathError {}

/** Raised when a requested exact representation would exceed a configured size limit. */
export class PrecisionLimitError extends ExactMathError {}
