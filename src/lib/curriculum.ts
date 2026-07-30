// Curriculum unit picker for the lesson "Resumo" — 45 classes with a test
// after classes 7, 13, 20, 26, 33, 39 and 45.
const TEST_AFTER = new Set([7, 13, 20, 26, 33, 39, 45]);

export const curriculumUnits: string[] = (() => {
  const units: string[] = [];
  let testCount = 0;
  for (let n = 1; n <= 45; n++) {
    units.push(`Aula ${n}`);
    if (TEST_AFTER.has(n)) {
      testCount++;
      units.push(`Teste ${testCount}`);
    }
  }
  return units;
})();

export const classFocusOptions = [
  "Revisão",
  "Conversação",
  "Etapa 1",
  "Etapa 2",
  "Etapa 3",
  "Gramática",
] as const;
