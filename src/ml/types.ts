export type Verdict = 'cat' | 'dog' | 'other' | 'human' | 'unknown';

export type Detection = {
  label: 'person' | 'cat' | 'dog' | 'other';
  name: string;
  score: number;
  box: [number, number, number, number];
};

export type BreedGuess = { name: string; score: number };

export type ClassifyResult = {
  verdict: Verdict;
  breed?: BreedGuess | null;
  confidence: number;
  scores: { human: number; cat: number; dog: number; other: number };
  withHuman: boolean;
  detections: Detection[];
  ms: number;
  backend: string;
};

export type EngineStatus =
  | { state: 'loading'; progress: number; stage: string }
  | { state: 'ready'; backend: string; cached: boolean }
  | { state: 'error'; message: string };
