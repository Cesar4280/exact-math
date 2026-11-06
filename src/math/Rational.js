import { gcd, lcm } from "./number-theory.js";
import {
  DivisionByZeroError,
  InvalidNumberError,
  ParseError,
  PrecisionLimitError
} from "./errors.js";

/** An optionally signed run of ASCII decimal digits: the only integer-string grammar accepted. */
const INTEGER_STRING = /^[+-]?\d+$/;

/**
 * Coerces a bigint / safe integer number / integer string into a BigInt,
 * rejecting everything a real-money calculation must never silently accept:
 * NaN, Infinity, non-integers, null, undefined, objects, and integer numbers
 * beyond ±Number.MAX_SAFE_INTEGER. Those last ones are rejected because by the
 * time such a value reaches this function it may already have been rounded
 * (the literal 9007199254740993 arrives as 9007199254740992), and there is no
 * way to tell; bigints and integer strings carry any size exactly.
 *
 * @param {bigint|number|string} value
 * @param {string} label used in the error message
 * @returns {bigint}
 */
function toBigInt(value, label) {
  if (typeof value === "bigint") return value;

  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new InvalidNumberError(
        `${label} must be a safe integer number (got NaN, Infinity, a non-integer, or an ` +
          `integer beyond ±Number.MAX_SAFE_INTEGER that a number cannot hold exactly: ${value}). ` +
          `Pass a bigint or an integer string for larger values.`
      );
    }
    return BigInt(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!INTEGER_STRING.test(trimmed)) {
      throw new InvalidNumberError(`${label} must be an integer string, received "${value}".`);
    }
    return BigInt(trimmed);
  }

  throw new InvalidNumberError(
    `${label} must be a bigint, integer number, or integer string; received ${value === null ? "null" : typeof value}.`
  );
}

/**
 * Throws unless `value` is a Rational instance. Keeps operator semantics unambiguous.
 * @param {unknown} value
 * @param {string} paramName
 */
function assertRational(value, paramName) {
  if (!(value instanceof Rational)) {
    throw new InvalidNumberError(
      `${paramName} must be a Rational instance, received ${value === null ? "null" : typeof value}.`
    );
  }
}

/**
 * An exact, immutable rational number: numerator / denominator, both BigInt.
 * Always kept in lowest terms with a strictly positive denominator.
 *
 * This is the only numeric representation business logic should hold onto.
 * Converting to a JS `number` (via toDecimal/format) is a presentation-layer
 * operation only, never something to compute further with.
 */
export class Rational {
  #n;
  #d;

  /**
   * @param {bigint|number|string} numerator
   * @param {bigint|number|string} [denominator=1n]
   */
  constructor(numerator, denominator = 1n) {
    const n = toBigInt(numerator, "numerator");
    let d = toBigInt(denominator, "denominator");

    if (d === 0n) throw new DivisionByZeroError("Denominator cannot be zero.");

    let signedN = n;
    if (d < 0n) {
      signedN = -signedN;
      d = -d;
    }

    const g = gcd(signedN, d);

    this.#n = signedN / g;
    this.#d = d / g;
  }

  get numerator() {
    return this.#n;
  }

  get denominator() {
    return this.#d;
  }

  // ---- Factory methods ------------------------------------------------

  static zero() {
    return new Rational(0n);
  }

  static one() {
    return new Rational(1n);
  }

  /** @param {bigint|number|string} value */
  static fromInt(value) {
    return new Rational(toBigInt(value, "value"));
  }

  /** @param {bigint} value */
  static fromBigInt(value) {
    return new Rational(value);
  }

  /**
   * Parses an integer or decimal string exactly, e.g. "3" -> 3/1,
   * "3.25" -> 13/4, "0.125" -> 1/8. No floating-point ever touches the value.
   * @param {string} text
   */
  static fromDecimal(text) {
    if (typeof text !== "string") {
      throw new ParseError(`fromDecimal() expects a string, received ${typeof text}.`);
    }

    const trimmed = text.trim();
    const match = /^([+-]?)(\d+)?(?:\.(\d+))?$/.exec(trimmed);

    if (!match || (match[2] === undefined && match[3] === undefined)) {
      throw new ParseError(`"${text}" is not a valid decimal number.`);
    }

    const [, sign, intPart = "0", decPart = ""] = match;

    if (decPart.length === 0) {
      return new Rational(BigInt(sign + intPart));
    }

    const denominator = 10n ** BigInt(decPart.length);
    const numerator = BigInt(sign + intPart + decPart);

    return new Rational(numerator, denominator);
  }

  /**
   * Parses a percentage string, e.g. "25%" -> 1/4, "7.5%" -> 3/40.
   * @param {string} text
   */
  static fromPercentage(text) {
    if (typeof text !== "string") {
      throw new ParseError(`fromPercentage() expects a string, received ${typeof text}.`);
    }

    const trimmed = text.trim();
    if (!trimmed.endsWith("%")) {
      throw new ParseError(`"${text}" is not a valid percentage (missing '%').`);
    }

    const value = Rational.fromDecimal(trimmed.slice(0, -1).trim());
    return value.divide(new Rational(100n));
  }

  /**
   * Reconstructs a Rational from `{ numerator, denominator }` (strings).
   *
   * Each field must be a decimal integer string (same grammar as the
   * constructor: optional sign, ASCII digits, surrounding whitespace ignored).
   * Validated explicitly rather than handed to `BigInt()`, which would accept
   * `""` as 0 and `"0x10"` as 16, and throw a native `SyntaxError` outside the
   * `ExactMathError` hierarchy for `"1.5"` or `"1e3"`.
   *
   * @param {{numerator: string, denominator: string}} data
   */
  static fromJSON(data) {
    if (!data || typeof data.numerator !== "string" || typeof data.denominator !== "string") {
      throw new ParseError("fromJSON() expects { numerator: string, denominator: string }.");
    }

    for (const field of /** @type {const} */ (["numerator", "denominator"])) {
      if (!INTEGER_STRING.test(data[field].trim())) {
        throw new ParseError(
          `fromJSON() expects ${field} to be an integer string, received "${data[field]}".`
        );
      }
    }

    return new Rational(data.numerator, data.denominator);
  }

  // ---- Arithmetic -------------------------------------------------------

  /**
   * Uses the LCM of both denominators as the common denominator (rather
   * than their raw product) so that when they share a large common factor,
   * the intermediate numerator/denominator stay as small as the final
   * reduced result instead of carrying that shared factor through an extra
   * multiplication just to be divided back out during reduction.
   * @param {Rational} other
   */
  add(other) {
    assertRational(other, "other");

    const commonDenominator = lcm(this.#d, other.#d);
    const thisScale = commonDenominator / this.#d;
    const otherScale = commonDenominator / other.#d;

    return new Rational(this.#n * thisScale + other.#n * otherScale, commonDenominator);
  }

  /** @param {Rational} other */
  subtract(other) {
    assertRational(other, "other");

    const commonDenominator = lcm(this.#d, other.#d);
    const thisScale = commonDenominator / this.#d;
    const otherScale = commonDenominator / other.#d;

    return new Rational(this.#n * thisScale - other.#n * otherScale, commonDenominator);
  }

  /**
   * Cross-cancels common factors before multiplying (gcd(a.n, b.d) and
   * gcd(b.n, a.d)) so intermediate numerator/denominator stay as small as
   * possible instead of exploding and then being reduced afterwards.
   * @param {Rational} other
   */
  multiply(other) {
    assertRational(other, "other");

    const g1 = gcd(this.#n, other.#d);
    const g2 = gcd(other.#n, this.#d);

    return new Rational((this.#n / g1) * (other.#n / g2), (this.#d / g2) * (other.#d / g1));
  }

  /** @param {Rational} other */
  divide(other) {
    assertRational(other, "other");
    if (other.#n === 0n) {
      throw new DivisionByZeroError("Cannot divide by zero.");
    }
    return this.multiply(new Rational(other.#d, other.#n));
  }

  inverse() {
    if (this.#n === 0n) {
      throw new DivisionByZeroError("Cannot invert zero.");
    }
    return new Rational(this.#d, this.#n);
  }

  /**
   * Raises this rational to an integer power (positive, negative, or zero).
   * Negative exponents invert the base first, matching x^-n = (1/x)^n.
   * @param {bigint|number} exponent
   */
  pow(exponent) {
    const exp = toBigInt(exponent, "exponent");

    if (exp === 0n) {
      return Rational.one();
    }

    if (exp > 0n) {
      return new Rational(this.#n ** exp, this.#d ** exp);
    }

    if (this.#n === 0n) {
      throw new DivisionByZeroError("Cannot raise zero to a negative power.");
    }

    const positiveExp = -exp;
    return new Rational(this.#d ** positiveExp, this.#n ** positiveExp);
  }

  negate() {
    return new Rational(-this.#n, this.#d);
  }

  abs() {
    return new Rational(this.#n < 0n ? -this.#n : this.#n, this.#d);
  }

  // ---- Comparisons --------------------------------------------------

  /**
   * Structural equality (both sides already in lowest terms, so this is exact).
   * @param {Rational} other
   */
  equals(other) {
    assertRational(other, "other");
    return this.#n === other.#n && this.#d === other.#d;
  }

  /**
   * Compares by cross-multiplication (a/b vs c/d <=> ad vs cb), never by
   * converting to a floating-point number.
   * @param {Rational} other
   * @returns {-1|0|1}
   */
  compare(other) {
    assertRational(other, "other");

    const left = this.#n * other.#d;
    const right = other.#n * this.#d;

    if (left < right) return -1;
    if (left > right) return 1;
    return 0;
  }

  isZero() {
    return this.#n === 0n;
  }

  isPositive() {
    return this.#n > 0n;
  }

  isNegative() {
    return this.#n < 0n;
  }

  /** @returns {-1|0|1} */
  sign() {
    if (this.#n > 0n) return 1;
    if (this.#n < 0n) return -1;
    return 0;
  }

  // ---- Presentation / serialization -----------------------------------

  /**
   * Converts to a fixed-precision decimal string using HALF_UP rounding.
   *
   * Formula: let s = scale, factor = 10^s. Compute
   *   scaled = |numerator| * factor
   *   quotient = scaled / denominator, remainder = scaled % denominator
   *   if 2*remainder >= denominator: quotient += 1   (round half away from zero)
   * quotient now represents value*factor as one integer; splitting it into
   * integer/fractional digits handles a rounding carry (e.g. 0.9999 -> "1"
   * at scale 3) correctly, unlike rounding the last digit of a
   * digit-by-digit expansion, which does not propagate the carry.
   *
   * The sign is decided *after* rounding: a negative value whose magnitude
   * rounds to zero (e.g. -0.001 at scale 2) yields `"0"`, never `"-0"`.
   *
   * Complexity: O(scale) for the BigInt exponentiation and one division.
   *
   * @param {number} [scale=5] number of decimal digits to keep
   * @returns {string}
   */
  toDecimal(scale = 5) {
    if (!Number.isInteger(scale) || scale < 0) {
      throw new InvalidNumberError(`scale must be a non-negative integer, received ${scale}.`);
    }

    const isNegative = this.#n < 0n;
    const n = isNegative ? -this.#n : this.#n;

    const factor = 10n ** BigInt(scale);
    const scaledNumerator = n * factor;

    let quotient = scaledNumerator / this.#d;
    const remainder = scaledNumerator % this.#d;

    if (remainder * 2n >= this.#d) quotient += 1n;

    const sign = isNegative && quotient !== 0n ? "-" : "";
    const integerPart = quotient / factor;
    let fractionPart = (quotient % factor).toString().padStart(scale, "0");
    fractionPart = fractionPart.replace(/0+$/, "");

    if (fractionPart.length === 0) return `${sign}${integerPart}`;

    return `${sign}${integerPart}.${fractionPart}`;
  }

  /**
   * Classifies the base-10 decimal expansion without generating a single
   * digit of it: `"terminating"`, `"pure-periodic"`, or `"mixed-periodic"`.
   *
   * Based on the classical result that a reduced fraction terminates in
   * base 10 iff its denominator's only prime factors are 2 and 5; if any
   * other prime factor remains, the expansion is periodic, and it starts
   * repeating immediately after the decimal point (pure) unless the
   * denominator also had a factor of 2 or 5, in which case there's a
   * non-repeating prefix first (mixed). No factorization is needed beyond
   * dividing out 2s and 5s — `this.#d` is already in lowest terms by
   * construction, so unlike a standalone version of this algorithm, there
   * is no separate gcd/reduce step to do first.
   *
   * Complexity: O(log(denominator)), independent of how long the actual
   * period would be — this is the cheap check to run before deciding
   * whether `toRepeatingDecimal()`'s O(period length) is worth paying for.
   *
   * @returns {"terminating"|"pure-periodic"|"mixed-periodic"}
   */
  decimalExpansionType() {
    let hasTwoOrFiveFactor = false;
    let remainingFactor = this.#d;

    while (remainingFactor % 2n === 0n) {
      remainingFactor /= 2n;
      hasTwoOrFiveFactor = true;
    }

    while (remainingFactor % 5n === 0n) {
      remainingFactor /= 5n;
      hasTwoOrFiveFactor = true;
    }

    if (remainingFactor === 1n) return "terminating";

    return hasTwoOrFiveFactor ? "mixed-periodic" : "pure-periodic";
  }

  /**
   * Converts to the *exact* decimal expansion: every terminating expansion
   * in full (no rounding), and every repeating expansion with its period
   * marked in parentheses, e.g. `1/8` -> `"0.125"`, `1/3` -> `"0.(3)"`,
   * `1/6` -> `"0.1(6)"`, `22/7` -> `"3.(142857)"`. This is only possible
   * because the value is stored exactly as numerator/denominator; a
   * float-backed decimal type has no way to know a period exists at all.
   *
   * Algorithm: long division, tracking the digit index at which each
   * remainder was first seen. A remainder of 0 means the expansion
   * terminates. A remainder repeating a previously-seen value means the
   * digits from that earlier position onward form the repeating period
   * (this is guaranteed to happen within `denominator - 1` steps, since
   * there are only that many possible non-zero remainders).
   *
   * Complexity: O(period length), bounded by `maxPeriodLength` to avoid
   * unbounded work for denominators whose period is astronomically long.
   *
   * @param {number} [maxPeriodLength=1000] safety cap on digits generated
   *   before giving up on finding a terminating or repeating expansion
   * @returns {string}
   */
  toRepeatingDecimal(maxPeriodLength = 1000) {
    if (!Number.isInteger(maxPeriodLength) || maxPeriodLength <= 0) {
      throw new InvalidNumberError(
        `maxPeriodLength must be a positive integer, received ${maxPeriodLength}.`
      );
    }

    const sign = this.#n < 0n ? "-" : "";
    const n = this.#n < 0n ? -this.#n : this.#n;

    const integerPart = n / this.#d;
    let remainder = n % this.#d;

    if (remainder === 0n) {
      return `${sign}${integerPart}`;
    }

    const firstSeenAt = new Map();
    const digits = [];

    while (remainder !== 0n && !firstSeenAt.has(remainder)) {
      if (digits.length >= maxPeriodLength) {
        throw new PrecisionLimitError(
          `toRepeatingDecimal() did not find a terminating or repeating expansion within ` +
            `maxPeriodLength=${maxPeriodLength} digits for denominator ${this.#d}.`
        );
      }

      firstSeenAt.set(remainder, digits.length);
      remainder *= 10n;
      digits.push((remainder / this.#d).toString());
      remainder %= this.#d;
    }

    if (remainder === 0n) {
      return `${sign}${integerPart}.${digits.join("")}`;
    }

    const periodStart = firstSeenAt.get(remainder);
    const nonRepeating = digits.slice(0, periodStart).join("");
    const repeating = digits.slice(periodStart).join("");

    return `${sign}${integerPart}.${nonRepeating}(${repeating})`;
  }

  toString() {
    return `${this.#n}/${this.#d}`;
  }

  /** Enables `JSON.stringify(rational)` without losing precision to `number`. */
  toJSON() {
    return { numerator: this.#n.toString(), denominator: this.#d.toString() };
  }

  /**
   * Blocks implicit coercion. Without this, operators fall back to
   * `toString()` and silently work on `"n/d"` strings:
   * `new Rational(9n) < new Rational(10n)` is `false` ("9/1" > "10/1"
   * lexicographically) and `a + b` concatenates. So every numeric or default
   * hint (`<`, `>`, `+`, `-`, `*`, unary `+`, `Number(r)`, `r == "1/2"`,
   * `"x" + r`) throws; only string contexts (`${r}`, `String(r)`,
   * `[r].join()`) get `toString()`.
   *
   * @param {string} hint
   * @returns {string}
   */
  [Symbol.toPrimitive](hint) {
    if (hint === "string") return this.toString();

    throw new InvalidNumberError(
      "A Rational cannot be implicitly converted to a primitive (operators like <, + and * " +
        'would silently compare or concatenate "n/d" strings). Use compare()/equals()/add()/... ' +
        "for math, and toString(), toDecimal() or a template literal for text."
    );
  }
}
