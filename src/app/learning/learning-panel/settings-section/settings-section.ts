import { Component, input, output, computed } from '@angular/core';
import { CubeColors, DEFAULT_CUBE_COLORS } from '../../../../cube-engine/cube-engine';

export type SpeedPreset = 0 | 1 | 2;

export interface ColorChange {
  face: keyof CubeColors;
  value: number;
}

const FACE_LABELS: { face: keyof CubeColors; name: string }[] = [
  { face: 'U', name: 'Up' },
  { face: 'D', name: 'Down' },
  { face: 'F', name: 'Front' },
  { face: 'R', name: 'Right' },
  { face: 'B', name: 'Back' },
  { face: 'L', name: 'Left' },
  { face: 'P', name: 'Plastic' },
];

const SPEED_OPTIONS: { label: string; value: SpeedPreset; sub: string }[] = [
  { label: 'Fast', value: 0, sub: '125 ms' },
  { label: 'Smooth', value: 1, sub: '200 ms' },
  { label: 'Bouncy', value: 2, sub: '300 ms' },
];

function numToHex(n: number): string {
  return '#' + n.toString(16).padStart(6, '0').toUpperCase();
}

function hexToNum(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

@Component({
  selector: 'app-settings-section',
  imports: [],
  templateUrl: './settings-section.html',
  styleUrl: './settings-section.scss',
})
export class SettingsSection {
  currentSpeed = input<SpeedPreset>(2);
  currentColors = input<CubeColors>(DEFAULT_CUBE_COLORS);

  speedChanged = output<SpeedPreset>();
  colorChanged = output<ColorChange>();

  readonly faceLabels = FACE_LABELS;
  readonly speedOptions = SPEED_OPTIONS;

  faceHex = computed(() => {
    const colors = this.currentColors();
    const map: Partial<Record<keyof CubeColors, string>> = {};
    for (const { face } of FACE_LABELS) {
      map[face] = numToHex(colors[face]);
    }
    return map as Record<keyof CubeColors, string>;
  });

  onSpeedClick(value: SpeedPreset): void {
    this.speedChanged.emit(value);
  }

  onColorInput(face: keyof CubeColors, event: Event): void {
    const hex = (event.target as HTMLInputElement).value;
    this.colorChanged.emit({ face, value: hexToNum(hex) });
  }
}
