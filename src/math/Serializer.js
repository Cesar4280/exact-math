import { Rational } from "./Rational.js";
import { InvalidNumberError } from "./errors.js";

/**
 * Serializes a Rational to a plain object with string fields, safe for
 * `JSON.stringify` and storage — never as a `number`, which would
 * reintroduce floating-point error.
 *
 * @param {Rational} rational
 * @returns {{ numerator: string, denominator: string }}
 */
export function toJSON(rational) {
  if (!(rational instanceof Rational)) {
    throw new InvalidNumberError(`toJSON() expects a Rational, received ${typeof rational}.`);
  }
  return rational.toJSON();
}

/**
 * Reconstructs a Rational from the shape produced by {@link toJSON}.
 * @param {{ numerator: string, denominator: string }} data
 * @returns {Rational}
 */
export function fromJSON(data) {
  return Rational.fromJSON(data);
}
