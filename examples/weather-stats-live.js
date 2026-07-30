// Misma batería de cálculos que examples/weather-stats.js, pero con
// temperatura y precipitación reales del momento, consultadas en vivo a
// Open-Meteo (https://open-meteo.com, API pública, sin API key).
//
// Deliberadamente NO usa JSON.parse: el cuerpo de la respuesta se escanea
// con regex para extraer los dígitos exactos de cada campo numérico como
// string, y esos strings van directo a Rational.fromDecimal(). Un
// JSON.parse normal materializaría cada medición como un `number` de punto
// flotante antes de que tuviéramos oportunidad de convertirla — justo lo
// que esta librería existe para evitar en la lógica de negocio (ver
// CLAUDE.md). Aquí la frontera de "nunca usar Number" se estira hasta el
// propio parseo de la respuesta HTTP.
import { Rational, ExactMath, format } from "../src/math/index.js";

const CITIES = [
  { name: "Bogota", lat: 4.711, lon: -74.0721, population: 7412566 },
  { name: "Medellin", lat: 6.2442, lon: -75.5812, population: 2427129 },
  { name: "Cali", lat: 3.4516, lon: -76.532, population: 2227642 },
  { name: "Barranquilla", lat: 10.9639, lon: -74.7964, population: 1274250 },
  { name: "Cartagena", lat: 10.391, lon: -75.4794, population: 1028736 },
  { name: "Bucaramanga", lat: 7.1193, lon: -73.1227, population: 581130 },
  { name: "Pereira", lat: 4.8087, lon: -75.6906, population: 476805 },
  { name: "Manizales", lat: 5.0689, lon: -75.5174, population: 434403 }
];

async function fetchRawWeather() {
  const latitude = CITIES.map((c) => c.lat).join(",");
  const longitude = CITIES.map((c) => c.lon).join(",");
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    `&current=temperature_2m&daily=precipitation_sum&forecast_days=1&timezone=auto`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Open-Meteo respondió ${response.status} ${response.statusText}`);
  }
  return response.text();
}

/** Every `"fieldName":123.4` occurrence, as the exact source digit string. */
function extractScalarField(rawText, fieldName) {
  const pattern = new RegExp(`"${fieldName}"\\s*:\\s*(-?\\d+(?:\\.\\d+)?)`, "g");
  return [...rawText.matchAll(pattern)].map((m) => m[1]);
}

/** Every `"fieldName":[123.4]` single-element array occurrence, same idea. */
function extractSingletonArrayField(rawText, fieldName) {
  const pattern = new RegExp(`"${fieldName}"\\s*:\\s*\\[\\s*(-?\\d+(?:\\.\\d+)?)\\s*\\]`, "g");
  return [...rawText.matchAll(pattern)].map((m) => m[1]);
}

function printRow(cells, widths) {
  console.log(cells.map((c, i) => String(c).padEnd(widths[i])).join(""));
}

function section(title) {
  console.log(`\n${title}`);
  console.log("=".repeat(title.length));
}

async function main() {
  const rawText = await fetchRawWeather();

  const temperatures = extractScalarField(rawText, "temperature_2m");
  const precipitations = extractSingletonArrayField(rawText, "precipitation_sum");

  if (temperatures.length !== CITIES.length || precipitations.length !== CITIES.length) {
    throw new Error(
      `Se esperaban ${CITIES.length} ciudades en la respuesta de Open-Meteo, ` +
        `se encontraron ${temperatures.length} temperaturas y ${precipitations.length} precipitaciones.`
    );
  }

  const cities = CITIES.map((city, i) => ({
    name: city.name,
    temperature: Rational.fromDecimal(temperatures[i]),
    precipitation: Rational.fromDecimal(precipitations[i]),
    population: Rational.fromInt(city.population)
  }));

  section(`Clima en vivo (n = ${cities.length}, vía Open-Meteo, ${new Date().toISOString()})`);
  {
    const widths = [14, 10, 16];
    printRow(["Ciudad", "Temp. °C", "Precip. hoy mm"], widths);
    for (const c of cities) {
      printRow([c.name, c.temperature.toDecimal(1), c.precipitation.toDecimal(1)], widths);
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
  }

  section("Extremos");
  {
    const temps = cities.map((c) => c.temperature);
    const minTemp = ExactMath.min(...temps);
    const maxTemp = ExactMath.max(...temps);

    const coldest = cities.find((c) => c.temperature.equals(minTemp));
    const hottest = cities.find((c) => c.temperature.equals(maxTemp));

    console.log(`Más fría ahora:  ${coldest.name} (${coldest.temperature.toDecimal(1)} °C)`);
    console.log(`Más cálida ahora: ${hottest.name} (${hottest.temperature.toDecimal(1)} °C)`);
  }

  section("Distribución de la precipitación de hoy (% exacto por ciudad)");
  {
    const totalPrecipitation = ExactMath.sum(cities.map((c) => c.precipitation));

    if (totalPrecipitation.isZero()) {
      console.log(
        "No hay precipitación registrada hoy en ninguna ciudad — no aplica un % de distribución."
      );
    } else {
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
  }
}

main().catch((error) => {
  console.error(`No se pudo completar la consulta en vivo: ${error.message}`);
  process.exitCode = 1;
});
