import { Rational } from "./Rational.js";
import { ParseError, describeType } from "./errors.js";

/**
 * Parses a plain integer string, e.g. "3" -> 3/1, "-7" -> -7/1.
 * @param {string} text
 * @returns {Rational}
 */
export function parseInteger(text) {
  if (typeof text !== "string") {
    throw new ParseError(`parseInteger() expects a string, received ${describeType(text)}.`);
  }

  const trimmed = text.trim();
  if (!/^[+-]?\d+$/.test(trimmed)) {
    throw new ParseError(`"${text}" is not a valid integer.`);
  }

  return new Rational(BigInt(trimmed));
}

/**
 * Parses a decimal string exactly, e.g. "3.25" -> 13/4, "0.125" -> 1/8.
 * @param {string} text
 * @returns {Rational}
 */
export function parseDecimal(text) {
  return Rational.fromDecimal(text);
}

/**
 * Parses a percentage string, e.g. "25%" -> 1/4, "7.5%" -> 3/40.
 * @param {string} text
 * @returns {Rational}
 */
export function parsePercentage(text) {
  return Rational.fromPercentage(text);
}

/**
 * Parses a fraction string, e.g. "3/4" -> 3/4, "-6/8" -> -3/4. Reads back
 * exactly what Rational#toString writes.
 * @param {string} text
 * @returns {Rational}
 */
export function parseFraction(text) {
  return Rational.fromFraction(text);
}

/**
 * Auto-detects the format of `text` and parses it: trailing "%" is treated
 * as a percentage, a "/" as a fraction, a "." as a decimal, otherwise as a
 * plain integer. So `parse(r.toString())` round-trips.
 * @param {string} text
 * @returns {Rational}
 */
export function parse(text) {
  if (typeof text !== "string") {
    throw new ParseError(`parse() expects a string, received ${describeType(text)}.`);
  }

  const trimmed = text.trim();

  if (trimmed.endsWith("%")) return parsePercentage(trimmed);
  if (trimmed.includes("/")) return parseFraction(trimmed);
  if (trimmed.includes(".")) return parseDecimal(trimmed);

  return parseInteger(trimmed);
}
