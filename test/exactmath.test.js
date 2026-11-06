import test from "node:test";
import assert from "node:assert/strict";

import { Rational } from "../src/math/Rational.js";
import { ExactMath } from "../src/math/ExactMath.js";
import { InvalidNumberError } from "../src/math/errors.js";

function r(n, d = 1n) {
  return new Rational(n, d);
}

test("sum y average", () => {
  const values = [r(1n, 3n), r(1n, 3n), r(1n, 3n)];

  assert.equal(ExactMath.sum(values).toString(), "1/1");
  assert.equal(ExactMath.average(values).toString(), "1/3");
});

test("average lanza con lista vacía", () => {
  assert.throws(() => ExactMath.average([]), InvalidNumberError);
});

test("sum de lista vacía devuelve cero", () => {
  assert.equal(ExactMath.sum([]).toString(), "0/1");
});

test("percentage: 1 de 4 es 25%", () => {
  const result = ExactMath.percentage(r(1n), r(4n));
  assert.equal(result.toString(), "25/1");
  assert.equal(result.toDecimal(0), "25");
});

test("ratio: sin multiplicar por 100", () => {
  const result = ExactMath.ratio(r(1n), r(4n));
  assert.equal(result.toString(), "1/4");
});

test("min y max", () => {
  const values = [r(3n, 4n), r(1n, 2n), r(9n, 8n)];

  assert.ok(ExactMath.min(...values).equals(r(1n, 2n)));
  assert.ok(ExactMath.max(...values).equals(r(9n, 8n)));
});

test("clamp", () => {
  const min = r(0n);
  const max = r(10n);

  assert.equal(ExactMath.clamp(r(-5n), min, max).toString(), "0/1");
  assert.equal(ExactMath.clamp(r(15n), min, max).toString(), "10/1");
  assert.equal(ExactMath.clamp(r(5n), min, max).toString(), "5/1");
});

test("weightedAverage", () => {
  const items = [
    { value: r(90n), weight: r(1n) },
    { value: r(80n), weight: r(3n) }
  ];

  // (90*1 + 80*3) / (1+3) = 330/4 = 82.5
  const result = ExactMath.weightedAverage(items);
  assert.equal(result.toDecimal(1), "82.5");
});

test("weightedAverage lanza si el peso total es cero", () => {
  const items = [
    { value: r(1n), weight: r(1n) },
    { value: r(2n), weight: r(-1n) }
  ];

  assert.throws(() => ExactMath.weightedAverage(items), InvalidNumberError);
});

test("weightedAverage rechaza con InvalidNumberError items que no son objetos", () => {
  // Antes, desestructurar null/undefined lanzaba un TypeError nativo fuera de ExactMathError.
  assert.throws(() => ExactMath.weightedAverage([null]), InvalidNumberError);
  assert.throws(() => ExactMath.weightedAverage([undefined]), InvalidNumberError);
  assert.throws(() => ExactMath.weightedAverage([5]), InvalidNumberError);
  assert.throws(
    () => ExactMath.weightedAverage([{ value: r(1n), weight: r(1n) }, null]),
    InvalidNumberError
  );
});

test("pow, inverse, abs, negate a través de ExactMath", () => {
  assert.equal(ExactMath.pow(r(2n, 3n), 2).toString(), "4/9");
  assert.equal(ExactMath.inverse(r(3n, 4n)).toString(), "4/3");
  assert.equal(ExactMath.abs(r(-3n, 4n)).toString(), "3/4");
  assert.equal(ExactMath.negate(r(3n, 4n)).toString(), "-3/4");
});
