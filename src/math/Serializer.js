import { Rational, assertRational } from "./Rational.js";

/**
 * Serializes a Rational to a plain object with string fields, safe for
 * `JSON.stringify` and storage — never as a `number`, which would
 * reintroduce floating-point error.
 *
 * @param {Rational} rational
 * @returns {{ numerator: string, denominator: string }}
 */
export function toJSON(rational) {
  assertRational(rational, "toJSON() argument");

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
