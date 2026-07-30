// Datos ilustrativos aproximados (no estadística oficial) para 8 ciudades de
// Colombia. Ver examples/weather-stats-live.js para la misma batería de
// cálculos usando temperatura/precipitación reales consultadas en vivo.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { Rational, ExactMath, format } from "../src/math/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const csvPath = join(__dirname, "..", "data", "weather.csv");

function readCities(path) {
  const [, ...lines] = readFileSync(path, "utf8").trim().split(/\r?\n/);
  return lines
    .filter((line) => line.length > 0)
    .map((line) => {
      const [name, avgTempC, precipitationMm, population] = line.split(",");
      return {
        name,
        temperature: Rational.fromDecimal(avgTempC.trim()),
        precipitation: Rational.fromDecimal(precipitationMm.trim()),
        population: Rational.fromInt(population.trim())
      };
    });
}

function printRow(cells, widths) {
  console.log(cells.map((c, i) => String(c).padEnd(widths[i])).join(""));
}

function section(title) {
  console.log(`\n${title}`);
  console.log("=".repeat(title.length));
}

const cities = readCities(csvPath);

section(`Ciudades (n = ${cities.length})`);
{
  const widths = [14, 10, 16, 12];
  printRow(["Ciudad", "Temp. °C", "Precip. mm", "Población"], widths);
  for (const c of cities) {
    printRow(
      [
        c.name,
        c.temperature.toDecimal(1),
        c.precipitation.toDecimal(0),
        c.population.numerator.toString()
      ],
      widths
    );
  }
}

section("Temperatura: promedio simple vs. ponderado por población");
{
  const simpleAverage = ExactMath.average(cities.map((c) => c.temperature));
  const weightedAverage = ExactMath.weightedAverage(
    cities.map((c) => ({ value: c.temperature, weight: c.population }))
  );

  console.log(`Promedio simple:              ${format(simpleAverage, { scale: 4 })} °C`);
  console.log(`Promedio ponderado por pobl.: ${format(weightedAverage, { scale: 4 })} °C`);
  console.log(
    "(difieren porque las ciudades más pobladas — Bogotá, fría — pesan más en el segundo cálculo)"
  );
}

section("Extremos");
{
  const temps = cities.map((c) => c.temperature);
  const precs = cities.map((c) => c.precipitation);

  const minTemp = ExactMath.min(...temps);
  const maxTemp = ExactMath.max(...temps);
  const minPrec = ExactMath.min(...precs);
  const maxPrec = ExactMath.max(...precs);

  const coldest = cities.find((c) => c.temperature.equals(minTemp));
  const hottest = cities.find((c) => c.temperature.equals(maxTemp));
  const driest = cities.find((c) => c.precipitation.equals(minPrec));
  const rainiest = cities.find((c) => c.precipitation.equals(maxPrec));

  console.log(`Más fría:  ${coldest.name} (${coldest.temperature.toDecimal(1)} °C)`);
  console.log(`Más cálida: ${hottest.name} (${hottest.temperature.toDecimal(1)} °C)`);
  console.log(`Más seca:  ${driest.name} (${driest.precipitation.toDecimal(0)} mm)`);
  console.log(`Más lluviosa: ${rainiest.name} (${rainiest.precipitation.toDecimal(0)} mm)`);

  const ratio = ExactMath.ratio(rainiest.precipitation, driest.precipitation);
  console.log(
    `${rainiest.name} recibe ${ratio.toString()} (≈ ${format(ratio, { scale: 2 })}×) la precipitación de ${driest.name}.`
  );
}

section("Distribución de la precipitación total (% exacto por ciudad)");
{
  const totalPrecipitation = ExactMath.sum(cities.map((c) => c.precipitation));

  const distribution = [...cities]
    .sort((a, b) => b.precipitation.compare(a.precipitation))
    .map((c) => ({
      name: c.name,
      percentage: ExactMath.percentage(c.precipitation, totalPrecipitation)
    }));

  let cumulative = Rational.zero();
  const widths = [14, 24, 10];
  printRow(["Ciudad", "% del total (exacto)", "% acum."], widths);
  for (const row of distribution) {
    cumulative = cumulative.add(row.percentage);
    printRow(
      [row.name, format(row.percentage, { scale: 2 }), format(cumulative, { scale: 2 })],
      widths
    );
  }

  const sumOfPercentages = ExactMath.sum(distribution.map((r) => r.percentage));
  console.log(
    `Suma de porcentajes: ${sumOfPercentages.toString()} ` +
      (sumOfPercentages.equals(Rational.fromInt(100))
        ? "→ exactamente 100, sin arrastre de error de punto flotante."
        : "→ (!) error de precisión.")
  );
}

section("Índice de confort (rango cómodo: 18–24 °C)");
{
  const comfortMin = Rational.fromInt(18);
  const comfortMax = Rational.fromInt(24);
  const widths = [14, 10, 14];

  printRow(["Ciudad", "Temp. °C", "Desviación"], widths);
  for (const c of cities) {
    const clamped = ExactMath.clamp(c.temperature, comfortMin, comfortMax);
    const deviation = c.temperature.subtract(clamped);
    const label = deviation.isZero() ? "en rango" : `${deviation.toDecimal(1)} °C`;
    printRow([c.name, c.temperature.toDecimal(1), label], widths);
  }
}
