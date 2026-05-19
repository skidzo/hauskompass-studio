export type SurfaceClassificationInput = {
  upwardNormalShare?: number;
  pitchDeg?: number;
};

export type SurfaceClassification = 'roof' | 'flat-roof' | 'wall' | 'unknown';

export function classifySurface(input: SurfaceClassificationInput): SurfaceClassification {
  if (input.pitchDeg === undefined || input.upwardNormalShare === undefined) {
    return 'unknown';
  }

  if (input.upwardNormalShare > 0.65 && input.pitchDeg >= 10) {
    return 'roof';
  }

  if (input.upwardNormalShare > 0.8 && input.pitchDeg < 10) {
    return 'flat-roof';
  }

  if (input.upwardNormalShare < 0.2) {
    return 'wall';
  }

  return 'unknown';
}
