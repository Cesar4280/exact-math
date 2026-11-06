import { Rational } from "./Rational.js";
import { InvalidNumberError } from "./errors.js";

/**
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
 * @param {unknown} values
 * @param {string} methodName
 */
function assertNonEmpty(values, methodName) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new InvalidNumberError(`${methodName}() requires a non-empty array of Rational values.`);
  }
  values.forEach((v, i) => assertRational(v, `values[${i}]`));
}

/**
 * Functional-style, stateless wrappers around Rational's instance methods.
 * Useful for `values.reduce(ExactMath.add)`-style code, or when a static
 * call reads better than a fluent chain. Every method here works purely on
 * Rational and never touches `number`.
 */
export class ExactMath {
  /**
   * @param {Rational} a
   * @param {Rational} b
   * @returns {Rational}
   */
  static add(a, b) {
    assertRational(a, "a");
    return a.add(b);
  }

  /**
   * @param {Rational} a
   * @param {Rational} b
   * @returns {Rational}
   */
  static subtract(a, b) {
    assertRational(a, "a");
    return a.subtract(b);
  }

  /**
   * @param {Rational} a
   * @param {Rational} b
   * @returns {Rational}
   */
  static multiply(a, b) {
    assertRational(a, "a");
    return a.multiply(b);
  }

  /**
   * @param {Rational} a
   * @param {Rational} b
   * @returns {Rational}
   */
  static divide(a, b) {
    assertRational(a, "a");
    return a.divide(b);
  }

  /**
   * @param {Rational} base
   * @param {bigint|number} exponent
   * @returns {Rational}
   */
  static pow(base, exponent) {
    assertRational(base, "base");
    return base.pow(exponent);
  }

  /**
   * @param {Rational} value
   * @returns {Rational}
   */
  static inverse(value) {
    assertRational(value, "value");
    return value.inverse();
  }

  /**
   * @param {Rational} value
   * @returns {Rational}
   */
  static abs(value) {
    assertRational(value, "value");
    return value.abs();
  }

  /**
   * @param {Rational} value
   * @returns {Rational}
   */
  static negate(value) {
    assertRational(value, "value");
    return value.negate();
  }

  /**
   * @param {Rational} a
   * @param {Rational} b
   * @returns {-1|0|1}
   */
  static compare(a, b) {
    assertRational(a, "a");
    return a.compare(b);
  }

  /**
   * @param {Rational} a
   * @param {Rational} b
   * @returns {boolean}
   */
  static equals(a, b) {
    assertRational(a, "a");
    return a.equals(b);
  }

  /**
   * @param {...Rational} values
   * @returns {Rational}
   */
  static min(...values) {
    assertNonEmpty(values, "min");
    return values.reduce((a, b) => (a.compare(b) <= 0 ? a : b));
  }

  /**
   * @param {...Rational} values
   * @returns {Rational}
   */
  static max(...values) {
    assertNonEmpty(values, "max");
    return values.reduce((a, b) => (a.compare(b) >= 0 ? a : b));
  }

  /**
   * Sum of a list of Rationals. Returns Rational.zero() for an empty list.
   * @param {Rational[]} values
   * @returns {Rational}
   */
  static sum(values) {
    if (!Array.isArray(values)) {
      throw new InvalidNumberError(`sum() expects an array, received ${typeof values}.`);
    }
    values.forEach((v, i) => assertRational(v, `values[${i}]`));
    return values.reduce((a, b) => a.add(b), Rational.zero());
  }

  /**
   * Arithmetic mean. Requires a non-empty array (there is no exact average of nothing).
   * @param {Rational[]} values
   * @returns {Rational}
   */
  static average(values) {
    assertNonEmpty(values, "average");
    return ExactMath.sum(values).divide(Rational.fromInt(values.length));
  }

  /**
   * Weighted average: sum(value_i * weight_i) / sum(weight_i).
   * @param {{ value: Rational, weight: Rational }[]} items
   * @returns {Rational}
   */
  static weightedAverage(items) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new InvalidNumberError(
        "weightedAverage() requires a non-empty array of { value, weight } items."
      );
    }

    let weightedSum = Rational.zero();
    let weightTotal = Rational.zero();

    for (const [i, item] of items.entries()) {
      if (item === null || typeof item !== "object") {
        throw new InvalidNumberError(
          `items[${i}] must be a { value, weight } object, received ${item === null ? "null" : typeof item}.`
        );
      }

      const { value, weight } = item;
      assertRational(value, `items[${i}].value`);
      assertRational(weight, `items[${i}].weight`);
      weightedSum = weightedSum.add(value.multiply(weight));
      weightTotal = weightTotal.add(weight);
    }

    if (weightTotal.isZero()) {
      throw new InvalidNumberError("weightedAverage() cannot divide by a zero total weight.");
    }

    return weightedSum.divide(weightTotal);
  }

  /**
   * `part` as a percentage of `total`, e.g. percentage(1/4, 1) -> 25/1 (meaning 25%).
   * @param {Rational} part
   * @param {Rational} total
   * @returns {Rational}
   */
  static percentage(part, total) {
    assertRational(part, "part");
    assertRational(total, "total");
    return part.divide(total).multiply(new Rational(100n));
  }

  /**
   * Plain ratio of `a` to `b` (no *100), e.g. ratio(1, 2) -> 1/2.
   * @param {Rational} a
   * @param {Rational} b
   * @returns {Rational}
   */
  static ratio(a, b) {
    assertRational(a, "a");
    assertRational(b, "b");
    return a.divide(b);
  }

  /**
   * Clamps `value` to the inclusive [min, max] range.
   * @param {Rational} value
   * @param {Rational} min
   * @param {Rational} max
   * @returns {Rational}
   */
  static clamp(value, min, max) {
    assertRational(value, "value");
    assertRational(min, "min");
    assertRational(max, "max");

    if (value.compare(min) < 0) return min;
    if (value.compare(max) > 0) return max;
    return value;
  }
}
