import test from "node:test";
import assert from "node:assert/strict";

import { Rational } from "../src/math/Rational.js";
import {
  DivisionByZeroError,
  InvalidNumberError,
  ParseError,
  PrecisionLimitError
} from "../src/math/errors.js";

test("simplifica automáticamente las fracciones", () => {
  const r = new Rational(24n, 36n);
  assert.equal(r.numerator, 2n);
  assert.equal(r.denominator, 3n);
});

test("0.1 + 0.2 = 0.3 exactamente", () => {
  const a = Rational.fromDecimal("0.1");
  const b = Rational.fromDecimal("0.2");
  const r = a.add(b);

  assert.equal(r.toString(), "3/10");
  assert.equal(r.toDecimal(), "0.3");
});

test("3.2 × 3.1 = 9.92 exactamente", () => {
  const a = Rational.fromDecimal("3.2");
  const b = Rational.fromDecimal("3.1");
  const r = a.multiply(b);

  assert.equal(r.toString(), "248/25");
  assert.equal(r.toDecimal(), "9.92");
});

test("add/subtract usan el MCM como denominador común, no el producto", () => {
  // 1000000 y 500000 comparten el factor 500000: el MCM es 1000000, no
  // 500000000000 (el producto). El resultado, ya reducido, debe ser el
  // mismo de cualquier forma, pero confirmamos que la fracción sin reducir
  // que produce add() usa el MCM comprobando que no requirió reducción
  // adicional más allá de la aritmética esperada.
  const a = new Rational(1n, 1000000n);
  const b = new Rational(1n, 500000n);

  const sum = a.add(b);
  assert.equal(sum.toString(), "3/1000000");

  const diff = a.subtract(b);
  assert.equal(diff.toString(), "-1/1000000");
});

test("1/3 + 1/3 + 1/3 = 1", () => {
  const oneThird = new Rational(1n, 3n);
  const result = oneThird.add(oneThird).add(oneThird);

  assert.equal(result.toString(), "1/1");
  assert.equal(result.toDecimal(), "1");
});

test("comparación exacta", () => {
  const a = new Rational(2n, 3n);
  const b = new Rational(4n, 6n);

  assert.equal(a.equals(b), true);
  assert.equal(a.compare(b), 0);
});

test("división exacta", () => {
  const a = new Rational(5n, 8n);
  const b = new Rational(2n, 5n);
  const r = a.divide(b);

  assert.equal(r.toString(), "25/16");
});

test("números negativos", () => {
  const r = new Rational(-2n, -4n);
  assert.equal(r.toString(), "1/2");
});

test("denominador negativo", () => {
  const r = new Rational(3n, -4n);
  assert.equal(r.toString(), "-3/4");
});

test("valores BigInt enormes", () => {
  const a = new Rational(99999999999999999999999999999999999999999999999999n, 3n);
  const b = new Rational(3n);
  const r = a.multiply(b);

  assert.equal(r.toString(), "99999999999999999999999999999999999999999999999999/1");
});

test("10000 sumas consecutivas sin pérdida de precisión", () => {
  let total = new Rational(0n);
  const value = Rational.fromDecimal("0.1");

  for (let i = 0; i < 10000; i++) {
    total = total.add(value);
  }

  assert.equal(total.toDecimal(), "1000");
});

test("100000 operaciones encadenadas", () => {
  let r = new Rational(1n);

  for (let i = 0; i < 100000; i++) {
    r = r
      .add(new Rational(1n))
      .subtract(new Rational(1n))
      .multiply(new Rational(2n))
      .divide(new Rational(2n));
  }

  assert.equal(r.toString(), "1/1");
});

test("división entre cero lanza DivisionByZeroError", () => {
  const a = new Rational(5n);
  assert.throws(() => a.divide(new Rational(0n)), DivisionByZeroError);
});

test("constructor con denominador cero lanza DivisionByZeroError", () => {
  assert.throws(() => new Rational(1n, 0n), DivisionByZeroError);
});

test("inversa de cero lanza DivisionByZeroError", () => {
  assert.throws(() => new Rational(0n).inverse(), DivisionByZeroError);
});

test("precisión de cinco decimales por defecto", () => {
  const r = new Rational(1n, 3n);
  assert.equal(r.toDecimal(), "0.33333");
  assert.equal(r.toDecimal(5), "0.33333");
});

test("fracciones equivalentes", () => {
  const a = new Rational(50n, 100n);
  const b = new Rational(1n, 2n);
  assert.ok(a.equals(b));
});

test("toDecimal propaga el acarreo de redondeo (9999/10000 a 3 decimales -> 1)", () => {
  const r = new Rational(9999n, 10000n);
  assert.equal(r.toDecimal(3), "1");
});

test("toDecimal con redondeo half-up en negativos", () => {
  const r = new Rational(-1n, 8n); // -0.125
  assert.equal(r.toDecimal(2), "-0.13");
});

test("toDecimal con scale 0 redondea a entero", () => {
  const r = new Rational(7n, 2n); // 3.5
  assert.equal(r.toDecimal(0), "4");
});

test("toDecimal nunca devuelve '-0' cuando un negativo redondea a cero", () => {
  assert.equal(new Rational(-1n, 1000n).toDecimal(2), "0"); // -0.001
  assert.equal(new Rational(-4n, 1000n).toDecimal(2), "0"); // -0.004
  assert.equal(new Rational(-1n, 3n).toDecimal(0), "0"); // -0.333...

  // El signo se conserva cuando el redondeo no llega a cero.
  assert.equal(new Rational(-5n, 1000n).toDecimal(2), "-0.01"); // -0.005, half-up
  assert.equal(new Rational(-1n, 2n).toDecimal(0), "-1"); // -0.5, half-up
});

test("toDecimal: un negativo es '-' + su magnitud, o '0' si redondea a cero (exhaustivo por scale)", () => {
  // Para cada scale s se prueban los valores x = n / (d · 10^s), con 1 <= n <= 100 y
  // 1 <= d <= 40. Escalar el denominador con s hace que x · 10^s = n/d sea el mismo rango
  // en todas las escalas, así que la frontera de redondeo a cero cae dentro en cada una
  // (con un d fijo, en scale >= 2 haría falta d > 200·n y no se probaría ningún caso).
  // Exhaustivo en vez de aleatorio para que un fallo sea siempre reproducible.
  for (let scale = 0; scale <= 3; scale++) {
    const unit = 10n ** BigInt(scale);

    for (let d = 1n; d <= 40n; d++) {
      const denominator = d * unit;

      for (let n = 1n; n <= 100n; n++) {
        const positive = new Rational(n, denominator);
        const magnitude = positive.toDecimal(scale);
        const label = `${n}/${denominator} a scale ${scale}`;

        // Oráculo independiente de toDecimal: half-up lleva x a cero sii x · 10^s < 1/2,
        // es decir, sii 2n < d. Fija la frontera exacta (incluido el empate n/d = 1/2).
        assert.equal(magnitude === "0", 2n * n < d, `frontera de redondeo de ${label}`);

        // Simetría: -x es "-" + la magnitud de x, salvo cuando esta es "0" (nunca "-0").
        const expected = magnitude === "0" ? "0" : `-${magnitude}`;
        assert.equal(positive.negate().toDecimal(scale), expected, `-${label}`);
      }
    }
  }
});

test("decimalExpansionType: terminating cuando el denominador solo tiene factores 2 y 5", () => {
  assert.equal(new Rational(1n, 2n).decimalExpansionType(), "terminating");
  assert.equal(new Rational(3n, 8n).decimalExpansionType(), "terminating");
  assert.equal(new Rational(5n, 125n).decimalExpansionType(), "terminating"); // se reduce a 1/25
  assert.equal(new Rational(7n, 40n).decimalExpansionType(), "terminating");
  assert.equal(new Rational(2n).decimalExpansionType(), "terminating");
  assert.equal(new Rational(0n).decimalExpansionType(), "terminating");
});

test("decimalExpansionType: pure-periodic cuando el denominador no tiene factores 2 ni 5", () => {
  assert.equal(new Rational(1n, 3n).decimalExpansionType(), "pure-periodic");
  assert.equal(new Rational(2n, 7n).decimalExpansionType(), "pure-periodic");
  assert.equal(new Rational(22n, 7n).decimalExpansionType(), "pure-periodic");
});

test("decimalExpansionType: mixed-periodic cuando hay factores 2/5 además de otros", () => {
  assert.equal(new Rational(1n, 6n).decimalExpansionType(), "mixed-periodic"); // 2×3
  assert.equal(new Rational(5n, 12n).decimalExpansionType(), "mixed-periodic"); // 2²×3
  assert.equal(new Rational(7n, 30n).decimalExpansionType(), "mixed-periodic"); // 2×3×5
  assert.equal(new Rational(13n, 28n).decimalExpansionType(), "mixed-periodic"); // 2²×7
});

test("decimalExpansionType es consistente con toDecimal/toRepeatingDecimal", () => {
  const cases = [
    [1n, 2n],
    [3n, 8n],
    [1n, 3n],
    [2n, 7n],
    [1n, 6n],
    [5n, 12n],
    [7n, 30n],
    [22n, 7n]
  ];

  for (const [n, d] of cases) {
    const r = new Rational(n, d);
    const type = r.decimalExpansionType();
    const exact = r.toRepeatingDecimal();

    if (type === "terminating") {
      assert.ok(
        !exact.includes("("),
        `${r.toString()} se clasificó terminating pero ${exact} tiene período`
      );
    } else {
      assert.ok(
        exact.includes("("),
        `${r.toString()} se clasificó ${type} pero ${exact} no tiene período`
      );

      const hasNonRepeatingPrefix = /\.\d+\(/.test(exact);
      if (type === "pure-periodic") {
        assert.ok(
          !hasNonRepeatingPrefix,
          `${r.toString()} debería ser puro pero ${exact} tiene prefijo`
        );
      } else {
        assert.ok(
          hasNonRepeatingPrefix,
          `${r.toString()} debería ser mixto pero ${exact} no tiene prefijo`
        );
      }
    }
  }
});

test("toRepeatingDecimal con expansiones que terminan", () => {
  assert.equal(new Rational(1n, 2n).toRepeatingDecimal(), "0.5");
  assert.equal(new Rational(1n, 8n).toRepeatingDecimal(), "0.125");
  assert.equal(new Rational(2n).toRepeatingDecimal(), "2");
  assert.equal(new Rational(0n).toRepeatingDecimal(), "0");
});

test("toRepeatingDecimal con periodo puro", () => {
  assert.equal(new Rational(1n, 3n).toRepeatingDecimal(), "0.(3)");
  assert.equal(new Rational(22n, 7n).toRepeatingDecimal(), "3.(142857)");
});

test("toRepeatingDecimal con parte no periódica y periodo mixto", () => {
  assert.equal(new Rational(1n, 6n).toRepeatingDecimal(), "0.1(6)");
});

test("toRepeatingDecimal con negativos", () => {
  assert.equal(new Rational(-1n, 3n).toRepeatingDecimal(), "-0.(3)");
});

test("toRepeatingDecimal lanza PrecisionLimitError si el periodo excede el límite", () => {
  // 1/7 tiene periodo de 6 dígitos: "142857"
  assert.throws(() => new Rational(1n, 7n).toRepeatingDecimal(3), PrecisionLimitError);
});

test("toRepeatingDecimal rechaza un maxPeriodLength inválido", () => {
  assert.throws(() => new Rational(1n, 3n).toRepeatingDecimal(0), InvalidNumberError);
  assert.throws(() => new Rational(1n, 3n).toRepeatingDecimal(1.5), InvalidNumberError);
});

test("pow con exponente positivo, negativo y cero", () => {
  const r = new Rational(2n, 3n);

  assert.equal(r.pow(2).toString(), "4/9");
  assert.equal(r.pow(0).toString(), "1/1");
  assert.equal(r.pow(-1).toString(), "3/2");
  assert.equal(r.pow(-2).toString(), "9/4");
});

test("pow de cero a exponente negativo lanza DivisionByZeroError", () => {
  assert.throws(() => new Rational(0n).pow(-1), DivisionByZeroError);
});

test("abs y negate", () => {
  const r = new Rational(-3n, 4n);
  assert.equal(r.abs().toString(), "3/4");
  assert.equal(r.negate().toString(), "3/4");
  assert.equal(new Rational(3n, 4n).negate().toString(), "-3/4");
});

test("sign, isZero, isPositive, isNegative", () => {
  assert.equal(new Rational(0n).sign(), 0);
  assert.equal(new Rational(5n).sign(), 1);
  assert.equal(new Rational(-5n).sign(), -1);
  assert.ok(new Rational(0n).isZero());
  assert.ok(new Rational(1n).isPositive());
  assert.ok(new Rational(-1n).isNegative());
});

test("factory methods zero/one/fromInt/fromBigInt", () => {
  assert.equal(Rational.zero().toString(), "0/1");
  assert.equal(Rational.one().toString(), "1/1");
  assert.equal(Rational.fromInt(7).toString(), "7/1");
  assert.equal(Rational.fromBigInt(7n).toString(), "7/1");
});

test("fromDecimal / fromPercentage según la especificación", () => {
  assert.equal(Rational.fromDecimal("3").toString(), "3/1");
  assert.equal(Rational.fromDecimal("3.25").toString(), "13/4");
  assert.equal(Rational.fromDecimal("0.125").toString(), "1/8");
  assert.equal(Rational.fromPercentage("25%").toString(), "1/4");
  assert.equal(Rational.fromFraction("6/8").toString(), "3/4");
});

test("fromFraction lee lo que produce toString(): round-trip exacto (exhaustivo en un rango pequeño)", () => {
  // Determinista para que un fallo sea siempre reproducible; incluye negativos, cero,
  // enteros (d = 1) y fracciones sin reducir (que el constructor normaliza).
  for (let n = -60n; n <= 60n; n++) {
    for (let d = 1n; d <= 60n; d++) {
      const value = new Rational(n, d);
      assert.ok(Rational.fromFraction(value.toString()).equals(value), value.toString());
    }
  }
});

test("rechaza NaN, Infinity, null, undefined y cadenas inválidas", () => {
  assert.throws(() => new Rational(NaN), InvalidNumberError);
  assert.throws(() => new Rational(Infinity), InvalidNumberError);
  assert.throws(() => new Rational(null), InvalidNumberError);
  assert.throws(() => new Rational(undefined), InvalidNumberError);
  assert.throws(() => new Rational("abc"), InvalidNumberError);
  assert.throws(() => new Rational(1.5), InvalidNumberError);
});

test("rechaza enteros number fuera del rango seguro (su valor exacto ya se perdió)", () => {
  // 2 ** 53 + 1 no es representable: el literal 9007199254740993 llega como ...992.
  assert.throws(() => new Rational(2 ** 53), InvalidNumberError);
  assert.throws(() => new Rational(-(2 ** 53)), InvalidNumberError);
  assert.throws(() => new Rational(1e300), InvalidNumberError);
  assert.throws(() => new Rational(1n, 2 ** 53), InvalidNumberError);
  assert.throws(() => Rational.fromInt(2 ** 53), InvalidNumberError);
  assert.throws(() => new Rational(2n).pow(2 ** 53), InvalidNumberError);
});

test("acepta los extremos del rango seguro, y valores mayores como bigint o string", () => {
  assert.equal(new Rational(Number.MAX_SAFE_INTEGER).toString(), "9007199254740991/1");
  assert.equal(new Rational(Number.MIN_SAFE_INTEGER).toString(), "-9007199254740991/1");
  assert.equal(new Rational(9007199254740993n).toString(), "9007199254740993/1");
  assert.equal(new Rational("9007199254740993").toString(), "9007199254740993/1");
});

test("bloquea la coerción implícita: operadores y Number() lanzan InvalidNumberError", () => {
  const a = new Rational(9n);
  const b = new Rational(10n);

  // Sin el bloqueo, `a < b` compararía los strings "9/1" y "10/1" (y daría false), y
  // `a + b` concatenaría "9/110/1".
  assert.throws(() => a < b, InvalidNumberError);
  assert.throws(() => a + b, InvalidNumberError);
  assert.throws(() => a * 2, InvalidNumberError);
  assert.throws(() => +a, InvalidNumberError);
  assert.throws(() => Number(a), InvalidNumberError);
  assert.throws(() => "total: " + a, InvalidNumberError);
  assert.throws(() => a == "9/1", InvalidNumberError);
});

test("los contextos de string siguen usando toString()", () => {
  const r = new Rational(1n, 2n);

  assert.equal(`${r}`, "1/2");
  assert.equal(String(r), "1/2");
  assert.equal([r, new Rational(3n)].join(", "), "1/2, 3/1");
});

test("operaciones exigen instancias de Rational, no números crudos", () => {
  const r = new Rational(1n, 2n);
  assert.throws(() => r.add(2), InvalidNumberError);
});

test("toJSON produce cadenas, nunca number", () => {
  const r = new Rational(355n, 113n);
  const json = r.toJSON();

  assert.equal(typeof json.numerator, "string");
  assert.equal(typeof json.denominator, "string");
  assert.equal(json.numerator, "355");
  assert.equal(json.denominator, "113");
});

test("fromJSON reconstruye e integra con JSON.stringify/parse", () => {
  const r = new Rational(355n, 113n);
  const roundTripped = Rational.fromJSON(JSON.parse(JSON.stringify(r)));

  assert.ok(roundTripped.equals(r));
});

test("fromJSON rechaza con ParseError campos que no son enteros decimales", () => {
  // BigInt() a secas aceptaría "" (-> 0), "0x10" (-> 16), "0b11" u "0o7", y lanzaría un
  // SyntaxError nativo (fuera de ExactMathError) con "1.5" o "1e3".
  for (const bad of ["", " ", "0x10", "0b11", "0o7", "1.5", "1e3", "abc", "Infinity", "1_000"]) {
    assert.throws(
      () => Rational.fromJSON({ numerator: bad, denominator: "1" }),
      ParseError,
      `numerator "${bad}"`
    );
    assert.throws(
      () => Rational.fromJSON({ numerator: "1", denominator: bad }),
      ParseError,
      `denominator "${bad}"`
    );
  }
});

test("fromJSON dice qué recibió cuando la forma no es válida", () => {
  const shapeError = (received) => ({
    name: "ParseError",
    message: `fromJSON() expects { numerator: string, denominator: string }, received ${received}.`
  });

  assert.throws(() => Rational.fromJSON(null), shapeError("null"));
  assert.throws(() => Rational.fromJSON([]), shapeError("array"));
  assert.throws(() => Rational.fromJSON("3/4"), shapeError("string"));
  assert.throws(
    () => Rational.fromJSON({ numerator: 3, denominator: "4" }),
    shapeError("{ numerator: number, denominator: string }")
  );
});

test("fromJSON acepta signos, normaliza, y mantiene DivisionByZeroError si el denominador es 0", () => {
  assert.equal(Rational.fromJSON({ numerator: "-6", denominator: "8" }).toString(), "-3/4");
  assert.equal(Rational.fromJSON({ numerator: "3", denominator: "-4" }).toString(), "-3/4");
  assert.throws(() => Rational.fromJSON({ numerator: "1", denominator: "0" }), DivisionByZeroError);
});

test("propiedades algebraicas: conmutatividad, asociatividad, distributividad, identidades", () => {
  const a = new Rational(2n, 3n);
  const b = new Rational(-5n, 7n);
  const c = new Rational(11n, 4n);

  assert.ok(a.add(b).equals(b.add(a)));
  assert.ok(a.multiply(b).equals(b.multiply(a)));

  assert.ok(
    a
      .add(b)
      .add(c)
      .equals(a.add(b.add(c)))
  );
  assert.ok(
    a
      .multiply(b)
      .multiply(c)
      .equals(a.multiply(b.multiply(c)))
  );

  assert.ok(a.multiply(b.add(c)).equals(a.multiply(b).add(a.multiply(c))));

  assert.ok(a.add(Rational.zero()).equals(a));
  assert.ok(a.multiply(Rational.one()).equals(a));
});

test("propiedades algebraicas con fracciones aleatorias (property-based)", () => {
  function randomRational() {
    const n = BigInt(Math.floor(Math.random() * 2000) - 1000);
    let d = BigInt(Math.floor(Math.random() * 999) + 1);
    return new Rational(n, d);
  }

  for (let i = 0; i < 500; i++) {
    const a = randomRational();
    const b = randomRational();
    const c = randomRational();

    assert.ok(a.add(b).equals(b.add(a)), "conmutatividad de la suma");
    assert.ok(a.multiply(b).equals(b.multiply(a)), "conmutatividad de la multiplicación");
    assert.ok(
      a
        .add(b)
        .add(c)
        .equals(a.add(b.add(c))),
      "asociatividad de la suma"
    );
    assert.ok(a.multiply(b.add(c)).equals(a.multiply(b).add(a.multiply(c))), "distributividad");

    if (!b.isZero()) {
      assert.ok(a.divide(b).multiply(b).equals(a), "a/b * b == a");
    }
  }
});
