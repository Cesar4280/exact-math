import test from "node:test";
import assert from "node:assert/strict";

import { gcd, lcm } from "../src/math/number-theory.js";

test("gcd de casos básicos", () => {
  assert.equal(gcd(48n, 18n), 6n);
  assert.equal(gcd(0n, 5n), 5n);
  assert.equal(gcd(5n, 0n), 5n);
  assert.equal(gcd(0n, 0n), 0n);
});

test("gcd ignora el signo", () => {
  assert.equal(gcd(-48n, 18n), 6n);
  assert.equal(gcd(48n, -18n), 6n);
  assert.equal(gcd(-48n, -18n), 6n);
});

test("lcm de casos básicos", () => {
  assert.equal(lcm(12n, 18n), 36n);
  assert.equal(lcm(4n, 6n), 12n);
  assert.equal(lcm(7n, 5n), 35n);
});

test("lcm(a, 0) = 0 por convención", () => {
  assert.equal(lcm(0n, 5n), 0n);
  assert.equal(lcm(5n, 0n), 0n);
});

test("lcm ignora el signo", () => {
  assert.equal(lcm(-12n, 18n), 36n);
  assert.equal(lcm(12n, -18n), 36n);
});

test("gcd(a,b) * lcm(a,b) === a * b (propiedad fundamental)", () => {
  for (const [a, b] of [
    [12n, 18n],
    [7n, 5n],
    [1000000n, 500000n],
    [999999999999999999999n, 3n]
  ]) {
    assert.equal(gcd(a, b) * lcm(a, b), a * b);
  }
});
