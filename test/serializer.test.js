import test from "node:test";
import assert from "node:assert/strict";

import { Rational } from "../src/math/Rational.js";
import { toJSON, fromJSON } from "../src/math/Serializer.js";
import { format } from "../src/math/formatter.js";
import { DivisionByZeroError, InvalidNumberError, ParseError } from "../src/math/errors.js";

test("toJSON / fromJSON hacen round-trip exacto", () => {
  const r = new Rational(355n, 113n);
  const serialized = toJSON(r);

  assert.deepEqual(serialized, { numerator: "355", denominator: "113" });

  const restored = fromJSON(serialized);
  assert.ok(restored.equals(r));
});

test("nunca serializa como number", () => {
  const r = Rational.fromDecimal("0.1").add(Rational.fromDecimal("0.2"));
  const json = JSON.stringify(r);

  assert.equal(json, '{"numerator":"3","denominator":"10"}');
});

test("toJSON rechaza con InvalidNumberError lo que no es un Rational", () => {
  for (const value of [123, null, undefined, "3/4", { numerator: "3", denominator: "4" }]) {
    assert.throws(() => toJSON(value), InvalidNumberError, `value = ${String(value)}`);
  }
});

test("fromJSON conserva los errores de validación de Rational.fromJSON", () => {
  assert.throws(() => fromJSON(null), ParseError);
  assert.throws(() => fromJSON({ numerator: 3, denominator: 4 }), ParseError); // number, no string
  assert.throws(() => fromJSON({ numerator: "1.5", denominator: "1" }), ParseError);
  assert.throws(() => fromJSON({ numerator: "1", denominator: "0" }), DivisionByZeroError);
});

test("format aplica las reglas de redondeo de toDecimal (half-up, sin '-0')", () => {
  assert.equal(format(new Rational(1n, 2n), { scale: 0 }), "1");
  assert.equal(format(new Rational(-1n, 8n), { scale: 2 }), "-0.13");
  assert.equal(format(new Rational(-1n, 1000n), { scale: 2 }), "0");
});

test("format usa 5 decimales por defecto y admite scale configurable", () => {
  const r = new Rational(1n, 3n);

  assert.equal(format(r), "0.33333");
  assert.equal(format(r, { scale: 2 }), "0.33");
  assert.equal(format(new Rational(25n, 8n)), "3.125");
  assert.equal(format(new Rational(2n)), "2");
});

test("format rechaza con InvalidNumberError opciones que no son un objeto", () => {
  // Antes, `null` lanzaba un TypeError nativo al desestructurar y `[]` se aceptaba en silencio.
  const half = new Rational(1n, 2n);

  for (const options of [null, 5, "scale", true, []]) {
    assert.throws(() => format(half, options), InvalidNumberError, `options = ${String(options)}`);
  }
});

test("format delega la validación de scale en toDecimal", () => {
  const half = new Rational(1n, 2n);

  for (const scale of [-1, 1.5, "2", NaN]) {
    assert.throws(() => format(half, { scale }), InvalidNumberError, `scale = ${String(scale)}`);
  }
  assert.equal(format(half, undefined), "0.5"); // sin opciones: scale por defecto
});

test("format rechaza valores que no son Rational", () => {
  for (const value of [0.5, null, undefined, "1/2"]) {
    assert.throws(() => format(value), InvalidNumberError, `value = ${String(value)}`);
  }
});
