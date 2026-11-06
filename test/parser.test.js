import test from "node:test";
import assert from "node:assert/strict";

import {
  parse,
  parseInteger,
  parseDecimal,
  parsePercentage,
  parseFraction
} from "../src/math/parser.js";
import { DivisionByZeroError, ParseError } from "../src/math/errors.js";
import { Rational } from "../src/math/Rational.js";

test("parseInteger", () => {
  assert.equal(parseInteger("3").toString(), "3/1");
  assert.equal(parseInteger("-42").toString(), "-42/1");
  assert.throws(() => parseInteger("3.5"), ParseError);
  assert.throws(() => parseInteger("abc"), ParseError);
});

test("parseDecimal", () => {
  assert.equal(parseDecimal("3").toString(), "3/1");
  assert.equal(parseDecimal("3.25").toString(), "13/4");
  assert.equal(parseDecimal("0.125").toString(), "1/8");
  assert.equal(parseDecimal("-0.5").toString(), "-1/2");
  assert.equal(parseDecimal(".5").toString(), "1/2");
  assert.throws(() => parseDecimal("abc"), ParseError);
  assert.throws(() => parseDecimal("1.2.3"), ParseError);
});

test("parsePercentage", () => {
  assert.equal(parsePercentage("25%").toString(), "1/4");
  assert.equal(parsePercentage("7.5%").toString(), "3/40");
  assert.equal(parsePercentage("100%").toString(), "1/1");
  assert.throws(() => parsePercentage("25"), ParseError);
});

test("parseFraction", () => {
  assert.equal(parseFraction("3/4").toString(), "3/4");
  assert.equal(parseFraction("-6/8").toString(), "-3/4"); // normaliza
  assert.equal(parseFraction("3/-4").toString(), "-3/4"); // el signo pasa al numerador
  assert.equal(parseFraction("+1/+2").toString(), "1/2");
  assert.equal(parseFraction("  1 / 2  ").toString(), "1/2");
});

test("parseFraction rechaza con ParseError lo que no es numerador/denominador", () => {
  for (const text of ["", "3", "3/", "/4", "3/4/5", "3//4", "3.5/2", "1/2.5", "a/b", "0x3/4"]) {
    assert.throws(() => parseFraction(text), ParseError, `"${text}"`);
  }
  assert.throws(() => parseFraction(3), ParseError);
});

test("parseFraction con denominador cero lanza DivisionByZeroError", () => {
  // El texto está bien formado; lo que no existe es el valor.
  assert.throws(() => parseFraction("1/0"), DivisionByZeroError);
});

test("parse auto-detecta el formato", () => {
  assert.equal(parse("3").toString(), "3/1");
  assert.equal(parse("3.25").toString(), "13/4");
  assert.equal(parse("25%").toString(), "1/4");
  assert.equal(parse("3/4").toString(), "3/4");
});

test("parse lee lo que produce toString() también con BigInt enormes", () => {
  // Complementa el round-trip exhaustivo de rational.test.js, que solo llega a |n| <= 60,
  // y pasa por parse() en vez de por Rational.fromFraction() directamente.
  const huge = 10n ** 60n + 7n;

  for (const value of [
    new Rational(huge, 3n),
    new Rational(-huge, huge + 2n),
    new Rational(1n, huge),
    new Rational(999999999999999999999999n, 7n),
    new Rational(2n ** 521n - 1n) // primo de Mersenne de 157 dígitos
  ]) {
    assert.ok(parse(value.toString()).equals(value), value.toString());
  }
});

test("parse ignora los espacios exteriores en todos los formatos", () => {
  assert.equal(parse("  -42  ").toString(), "-42/1");
  assert.equal(parse("  3.25  ").toString(), "13/4");
  assert.equal(parse("  25%  ").toString(), "1/4");
  assert.equal(parse("  3/4  ").toString(), "3/4");
  assert.equal(parse(".5").toString(), "1/2"); // la parte entera es opcional
});

test("parse rechaza con ParseError las entradas inválidas", () => {
  for (const text of ["", "   ", "abc", "1.2.3", "25%%", ".", "%", "1/2%", "1e3", "5."]) {
    assert.throws(() => parse(text), ParseError, `"${text}"`);
  }
  assert.throws(() => parse(42), ParseError);
});
