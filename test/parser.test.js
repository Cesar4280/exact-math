import test from "node:test";
import assert from "node:assert/strict";

import { parse, parseInteger, parseDecimal, parsePercentage } from "../src/math/parser.js";
import { ParseError } from "../src/math/errors.js";

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

test("parse auto-detecta el formato", () => {
  assert.equal(parse("3").toString(), "3/1");
  assert.equal(parse("3.25").toString(), "13/4");
  assert.equal(parse("25%").toString(), "1/4");
});
