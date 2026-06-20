export type AlgorithmId = string;

export interface AlgorithmConfig {
  id: AlgorithmId;
  label: string;
  notation: string[];
  preview: {
    cameraAngle?: 'front' | 'top' | 'corner';
  };
}

export interface CategoryConfig {
  id: string;
  label: string;
  algorithms: AlgorithmConfig[];
}

export interface StepConfig {
  id: string;
  label: string;
  name: string;
  categories: CategoryConfig[];
  orientation?: { axis: 'x' | 'y'; angle: number }[];
}

export const LEARNING_STEPS: StepConfig[] = [
  {
    id: 'f2l',
    label: 'F2L',
    name: 'First Two Layers',
    orientation: [
      { axis: 'x', angle: Math.PI },
      {
        axis: 'y',
        angle: Math.PI / 2,
      },
    ],
    categories: [
      {
        id: 'basic',
        label: 'Basic',
        algorithms: [
          {
            id: 'f2l-basic-a',
            label: 'Algorithm A',
            notation: ["U'", "F'", 'U', 'F'],
            preview: { cameraAngle: 'corner' },
          },
          // {
          //   id: 'f2l-basic-b',
          //   label: 'Algorithm B',
          //   notation: ["U'", "L'", 'U', 'L'],
          //   preview: { cameraAngle: 'corner' },
          // },
          // {
          //   id: 'f2l-basic-c',
          //   label: 'Algorithm C',
          //   notation: ['R', "U'", "R'"],
          //   preview: { cameraAngle: 'corner' },
          // },
          // {
          //   id: 'f2l-basic-d',
          //   label: 'Algorithm D',
          //   notation: ["L'", 'U', 'L'],
          //   preview: { cameraAngle: 'corner' },
          // },
        ],
      },
      { id: 'white-lateral', label: 'White Lateral', algorithms: [] },
      { id: 'white-up', label: 'White Up', algorithms: [] },
    ],
  },
  {
    id: 'crux',
    label: 'Crux',
    name: 'Cross',
    categories: [],
    orientation: [{ axis: 'y', angle: Math.PI }],
  },
  { id: 'oll', label: 'OLL', name: 'Orient Last Layer', categories: [] },
  { id: 'pll', label: 'PLL', name: 'Permutate Last Layer', categories: [] },
];
