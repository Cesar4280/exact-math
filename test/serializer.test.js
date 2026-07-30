import test from "node:test";
import assert from "node:assert/strict";

import { Rational } from "../src/math/Rational.js";
import { toJSON, fromJSON } from "../src/math/Serializer.js";
import { format } from "../src/math/formatter.js";

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

test("format usa 5 decimales por defecto y admite scale configurable", () => {
  const r = new Rational(1n, 3n);

  assert.equal(format(r), "0.33333");
  assert.equal(format(r, { scale: 2 }), "0.33");
  assert.equal(format(new Rational(25n, 8n)), "3.125");
  assert.equal(format(new Rational(2n)), "2");
});
