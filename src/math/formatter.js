import { Rational } from "./Rational.js";
import { InvalidNumberError } from "./errors.js";

/**
 * The only sanctioned way to turn a Rational into user-facing text.
 * Delegates to Rational#toDecimal, which rounds HALF_UP at a fixed scale.
 *
 * @param {Rational} value
 * @param {{ scale?: number }} [options]
 * @returns {string}
 */
export function format(value, { scale = 5 } = {}) {
  if (!(value instanceof Rational)) {
    throw new InvalidNumberError(`format() expects a Rational, received ${typeof value}.`);
  }

  return value.toDecimal(scale);
}
