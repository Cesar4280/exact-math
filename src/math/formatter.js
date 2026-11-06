import { Rational, assertRational } from "./Rational.js";

/**
 * The only sanctioned way to turn a Rational into user-facing text.
 * Delegates to Rational#toDecimal, which rounds HALF_UP at a fixed scale.
 *
 * @param {Rational} value
 * @param {{ scale?: number }} [options]
 * @returns {string}
 */
export function format(value, { scale = 5 } = {}) {
  assertRational(value, "format() value");

  return value.toDecimal(scale);
}
