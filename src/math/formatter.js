import { Rational, assertRational } from "./Rational.js";
import { InvalidNumberError, describeType } from "./errors.js";

/**
 * The only sanctioned way to turn a Rational into user-facing text.
 * Delegates to Rational#toDecimal, which rounds HALF_UP at a fixed scale.
 *
 * `options` must be a plain object when given (unknown keys are ignored);
 * `scale` is validated by toDecimal() itself, the single owner of that rule.
 *
 * @param {Rational} value
 * @param {{ scale?: number }} [options]
 * @returns {string}
 */
export function format(value, options = {}) {
  assertRational(value, "format() value");

  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new InvalidNumberError(
      `format() options must be an object, received ${describeType(options)}.`
    );
  }

  const { scale = 5 } = options;
  return value.toDecimal(scale);
}
