import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { Rational, ExactMath, format } from "../src/math/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const csvPath = join(__dirname, "..", "data", "grades.csv");

function readGrades(path) {
  const [, ...lines] = readFileSync(path, "utf8").trim().split(/\r?\n/);
  return lines.filter((line) => line.length > 0).map((line) => Rational.fromDecimal(line.trim()));
}

function buildFrequencyTable(grades) {
  const total = Rational.fromInt(grades.length);

  const groups = new Map();
  for (const grade of grades) {
    const key = grade.toString();
    const group = groups.get(key) ?? { grade, count: 0 };
    group.count += 1;
    groups.set(key, group);
  }

  const sortedGroups = [...groups.values()].sort((a, b) => a.grade.compare(b.grade));

  let cumulativeCount = 0;

  return sortedGroups.map(({ grade, count }) => {
    cumulativeCount += count;

    const frequency = Rational.fromInt(count);
    const cumulativeFrequency = Rational.fromInt(cumulativeCount);

    return {
      grade,
      count,
      cumulativeCount,
      relativeFrequency: frequency.divide(total),
      percentage: ExactMath.percentage(frequency, total),
      cumulativePercentage: ExactMath.percentage(cumulativeFrequency, total)
    };
  });
}

function printTable(table, totalCount) {
  const columns = ["Nota", "Frec.", "Frec. relativa (exacta)", "%", "Frec. acum.", "% acum."];
  const widths = [6, 7, 26, 9, 13, 8];

  console.log(`Notas de examen (n = ${totalCount})\n`);
  console.log(columns.map((c, i) => c.padEnd(widths[i])).join(""));
  console.log("-".repeat(widths.reduce((a, b) => a + b, 0)));

  for (const row of table) {
    const cells = [
      row.grade.toDecimal(1),
      String(row.count),
      row.relativeFrequency.toString(),
      format(row.percentage, { scale: 2 }),
      String(row.cumulativeCount),
      format(row.cumulativePercentage, { scale: 2 })
    ];
    console.log(cells.map((c, i) => c.padEnd(widths[i])).join(""));
  }
}

const grades = readGrades(csvPath);
const table = buildFrequencyTable(grades);

printTable(table, grades.length);

const sumOfRelativeFrequencies = ExactMath.sum(table.map((row) => row.relativeFrequency));

console.log("-".repeat(69));
console.log(
  `Suma de frecuencias relativas: ${sumOfRelativeFrequencies.toString()} ` +
    (sumOfRelativeFrequencies.equals(Rational.one())
      ? "→ exactamente 1, sin error de punto flotante acumulado."
      : "→ (!) error de precisión.")
);
