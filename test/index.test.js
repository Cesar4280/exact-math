import test from "node:test";
import assert from "node:assert/strict";

// Se importa por el nombre del paquete, no por ruta: Node resuelve esta auto-referencia
// con el campo "exports" de package.json, así que se prueba el mismo punto de entrada
// que recibe quien instala la librería desde npm, no solo src/math/index.js.
import * as api from "@cesar4280/exact-math";
import { Rational } from "../src/math/Rational.js";
import { ExactMathError } from "../src/math/errors.js";

/**
 * La API pública completa. Añadir o quitar un nombre aquí es un cambio de contrato
 * deliberado: debe ir acompañado del README y del número de versión correspondiente.
 */
const PUBLIC_API = [
  "DivisionByZeroError",
  "ExactMath",
  "ExactMathError",
  "InvalidNumberError",
  "ParseError",
  "PrecisionLimitError",
  "Rational",
  "format",
  "fromJSON",
  "gcd",
  "lcm",
  "parse",
  "parseDecimal",
  "parseFraction",
  "parseInteger",
  "parsePercentage",
  "toJSON"
];

test("la API pública exporta exactamente estos nombres, ni más ni menos", () => {
  // Detecta tanto un export olvidado como un helper interno publicado por accidente.
  assert.deepEqual(Object.keys(api).sort(), PUBLIC_API);
});

test("el punto de entrada público comparte las clases de los módulos internos", () => {
  // Si fueran copias, `instanceof` fallaría entre valores creados por rutas distintas.
  assert.equal(api.Rational, Rational);
  assert.equal(api.ExactMathError, ExactMathError);
  assert.ok(api.parse("0.5") instanceof Rational);
});

test("flujo completo por la API pública: parsear, operar, formatear y serializar", () => {
  const sum = api.parse("0.1").add(api.parse("0.2"));

  assert.equal(api.format(sum), "0.3");
  assert.ok(api.fromJSON(JSON.parse(JSON.stringify(sum))).equals(sum));
  assert.ok(api.parse(sum.toString()).equals(sum));
});
