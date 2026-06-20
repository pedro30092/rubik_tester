const INVERSE: Record<string, string> = {
  R: "R'",
  "R'": 'R',
  U: "U'",
  "U'": 'U',
  L: "L'",
  "L'": 'L',
  D: "D'",
  "D'": 'D',
  F: "F'",
  "F'": 'F',
  B: "B'",
  "B'": 'B',
};

export function invertAlgorithm(notation: string[]): string[] {
  return [...notation].reverse().map((m) => INVERSE[m] ?? m);
}
