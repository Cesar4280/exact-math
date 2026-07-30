/**
 * Low-level number theory primitives used by Rational's normalization
 * (reduce to lowest terms) and arithmetic optimizations (cross-cancellation
 * in multiply, common denominator in add/subtract). Currently gcd and lcm;
 * this is the natural home for further primitives (e.g. primality,
 * factorization) if the library ever needs them.
 */

/**
 * Greatest common divisor via the Euclidean algorithm.
 *
 * Formula: gcd(a, b) = gcd(b, a mod b), gcd(a, 0) = a.
 * Complexity: O(log(min(|a|, |b|))) BigInt divisions.
 * Edge cases: gcd(0, 0) = 0 by convention (used as a no-op divisor guard
 * only ever happens transiently inside Rational, which always has a
 * non-zero denominator, so numerator can be 0 but not both at once with d=0).
 *
 * @param {bigint} a
 * @param {bigint} b
 * @returns {bigint} a non-negative BigInt
 */
export function gcd(a, b) {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;

  while (b !== 0n) {
    const t = b;
    b = a % b;
    a = t;
  }

  return a;
}

/**
 * Least common multiple, via lcm(a, b) = (a / gcd(a, b)) * b.
 * Dividing by the gcd first (rather than computing a*b and dividing after)
 * keeps the intermediate BigInt as small as the final result.
 *
 * Complexity: O(log(min(|a|, |b|))) for the gcd, plus one division and one
 * multiplication.
 * Edge case: lcm(0, n) = 0 by convention (0 is a multiple of everything, and
 * the smallest one).
 *
 * @param {bigint} a
 * @param {bigint} b
 * @returns {bigint} a non-negative BigInt
 */
export function lcm(a, b) {
  if (a === 0n || b === 0n) return 0n;

  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;

  return (a / gcd(a, b)) * b;
}
