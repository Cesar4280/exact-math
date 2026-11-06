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

test("min y max rechazan una lista vacía", () => {
  assert.throws(() => ExactMath.min(), InvalidNumberError);
  assert.throws(() => ExactMath.max(), InvalidNumberError);
});

test("sum rechaza lo que no es un array de Rational", () => {
  assert.throws(() => ExactMath.sum([r(1n), 2]), InvalidNumberError);
  assert.throws(() => ExactMath.sum(null), InvalidNumberError);
});

test("clamp", () => {
  const min = r(0n);
  const max = r(10n);

  assert.equal(ExactMath.clamp(r(-5n), min, max).toString(), "0/1");
  assert.equal(ExactMath.clamp(r(15n), min, max).toString(), "10/1");
  assert.equal(ExactMath.clamp(r(5n), min, max).toString(), "5/1");
});

test("clamp incluye los extremos y admite min igual a max", () => {
  const min = r(0n);
  const max = r(10n);

  assert.ok(ExactMath.clamp(min, min, max).equals(min));
  assert.ok(ExactMath.clamp(max, min, max).equals(max));
  assert.ok(ExactMath.clamp(r(7n), r(3n), r(3n)).equals(r(3n)));
});

test("clamp rechaza con InvalidNumberError límites invertidos (min > max)", () => {
  // Sin validar, clamp(5, 10, 0) devolvía 10 en silencio.
  assert.throws(() => ExactMath.clamp(r(5n), r(10n), r(0n)), InvalidNumberError);
  assert.throws(() => ExactMath.clamp(r(5n), r(1n, 2n), r(1n, 3n)), InvalidNumberError);
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

test("weightedAverage es exacto con pesos fraccionarios", () => {
  // (10 · 1/3 + 20 · 2/3) / (1/3 + 2/3) = 50/3, sin ningún redondeo intermedio.
  const result = ExactMath.weightedAverage([
    { value: r(10n), weight: r(1n, 3n) },
    { value: r(20n), weight: r(2n, 3n) }
  ]);

  assert.equal(result.toString(), "50/3");
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

test("los wrappers binarios validan ambos operandos y nombran el inválido", () => {
  // Antes solo validaban `a`; un `b` inválido lo rechazaba el método de Rational con la
  // etiqueta "other", que no es ningún parámetro de ExactMath.
  const one = r(1n);

  for (const method of ["add", "subtract", "multiply", "divide", "compare", "equals"]) {
    assert.throws(
      () => ExactMath[method](5, one),
      { name: "InvalidNumberError", message: /^a must be a Rational instance, received number\.$/ },
      method
    );
    assert.throws(
      () => ExactMath[method](one, 5),
      { name: "InvalidNumberError", message: /^b must be a Rational instance, received number\.$/ },
      method
    );
  }
});

test("pow, inverse, abs, negate a través de ExactMath", () => {
  assert.equal(ExactMath.pow(r(2n, 3n), 2).toString(), "4/9");
  assert.equal(ExactMath.inverse(r(3n, 4n)).toString(), "4/3");
  assert.equal(ExactMath.abs(r(-3n, 4n)).toString(), "3/4");
  assert.equal(ExactMath.negate(r(3n, 4n)).toString(), "-3/4");
});
