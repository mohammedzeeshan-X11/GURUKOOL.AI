export type LabRoomId = "physics" | "chemistry" | "biology";

export type StationId =
  // Physics Lab Room (01–10)
  | "pendulum"
  | "optics"
  | "circuit"
  | "projectile"
  | "wave"
  | "lens"
  | "electromagnet"
  | "resistors"
  | "doubleslit"
  | "photoelectric"
  // Chemistry Lab Room (11–17)
  | "titration"
  | "electrolysis"
  | "boyles"
  | "displacement"
  | "carbon"
  | "haber"
  | "galvanic"
  // Biology Lab Room (18–24)
  | "photosynthesis"
  | "microscope"
  | "dna"
  | "reflex"
  | "mendel"
  | "neuron"
  | "pcr";

export type LabViewMode =
  | "orbit"
  | "walk"
  | "kid-control"
  | "vr-preview"
  | "vr-xr"
  | "ar-camera"
  | "ar-xr";

export type MicroscopeSpecimen = "onion" | "stomata" | "cheek";
export type DnaBase = "A" | "T" | "C" | "G";
export type DisplacementMetal = "Fe" | "Zn" | "Ag";
export type MendelGenotype = "TT" | "Tt" | "tt";
export type PhotoMetal = "Cs" | "Na" | "Zn";

export interface PendulumState {
  running: boolean;
  lengthM: number;
  amplitudeDeg: number;
  gravityMs2: number;
  angleRad: number;
  elapsedOscillations: number;
  measuredPeriodS: number;
}

export interface OpticsState {
  beamOn: boolean;
  prismAngleDeg: number;
  refractiveIndex: number;
  deviationDeg: number;
}

export interface CircuitState {
  switchClosed: boolean;
  voltageV: number;
  resistanceOhm: number;
  currentA: number;
}

export interface ProjectileState {
  angleDeg: number;
  speedMs: number;
  gravityMs2: number;
  rangeM: number;
  launchPulse: number;
  lastLandedRangeM: number | null;
}

export interface WaveState {
  running: boolean;
  frequencyHz: number;
  tensionN: number;
  harmonicNumber: number;
}

export interface LensState {
  lampOn: boolean;
  objectDistanceCm: number;
  focalLengthCm: number;
}

export interface ElectromagnetState {
  powerOn: boolean;
  currentA: number;
  coilTurns: number;
  ironCoreInserted: boolean;
}

export interface ResistorsState {
  mode: "series" | "parallel";
  r1Ohm: number;
  r2Ohm: number;
  voltageV: number;
}

export interface DoubleSlitState {
  laserOn: boolean;
  wavelengthNm: number;
  slitSeparationMm: number;
  screenDistanceM: number;
}

export interface PhotoelectricState {
  metal: PhotoMetal;
  wavelengthNm: number;
  intensityPct: number;
  collectorVoltageV: number;
}

export interface TitrationState {
  acidVolumeMl: number;
  baseAddedMl: number;
  currentPh: number;
  dropPulse: number;
}

export interface ElectrolysisState {
  powerOn: boolean;
  voltageV: number;
  h2VolumeMl: number;
  o2VolumeMl: number;
}

export interface BoylesState {
  volumeMl: number;
  pressureKpa: number;
}

export interface DisplacementState {
  metal: DisplacementMetal;
  immersed: boolean;
  progressPct: number;
  tempC: number;
}

export interface CarbonState {
  carbons: 1 | 2 | 3 | 4;
  rotating: boolean;
}

export interface HaberState {
  pressureAtm: number;
  temperatureC: number;
  catalystOn: boolean;
}

export interface GalvanicState {
  saltBridgeInserted: boolean;
  cuConcM: number;
  znConcM: number;
  tempK: number;
}

export interface PhotosynthesisState {
  lampOn: boolean;
  lightIntensityPct: number;
  co2LevelGl: number;
  bubblesPerMin: number;
}

export interface MicroscopeState {
  illuminatorOn: boolean;
  magnification: 4 | 10 | 40;
  focusValue: number;
  specimen: MicroscopeSpecimen;
}

export interface DnaState {
  rotating: boolean;
  templateStrand: DnaBase[];
  pairedStrand: (DnaBase | null)[];
}

export interface ReflexState {
  conductionSpeedMs: number;
  triggerPulse: number;
  lastReactionMs: number | null;
}

export interface MendelState {
  parent1: MendelGenotype;
  parent2: MendelGenotype;
  grown: boolean;
}

export interface NeuronState {
  stimulusUa: number;
  myelinated: boolean;
  sodiumMm: number;
  firePulse: number;
  lastPeakMv: number | null;
}

export interface PcrState {
  running: boolean;
  annealingTempC: number;
  cycleCount: number;
  phaseIndex: 0 | 1 | 2;
  taqActive: boolean;
}

export interface LabExperimentState {
  pendulum: PendulumState;
  optics: OpticsState;
  circuit: CircuitState;
  projectile: ProjectileState;
  wave: WaveState;
  lens: LensState;
  electromagnet: ElectromagnetState;
  resistors: ResistorsState;
  doubleslit: DoubleSlitState;
  photoelectric: PhotoelectricState;
  titration: TitrationState;
  electrolysis: ElectrolysisState;
  boyles: BoylesState;
  displacement: DisplacementState;
  carbon: CarbonState;
  haber: HaberState;
  galvanic: GalvanicState;
  photosynthesis: PhotosynthesisState;
  microscope: MicroscopeState;
  dna: DnaState;
  reflex: ReflexState;
  mendel: MendelState;
  neuron: NeuronState;
  pcr: PcrState;
}

export interface QuestDefinition {
  id: StationId;
  room: LabRoomId;
  stationNumber: string;
  title: string;
  subject: string;
  discipline: "Physics" | "Chemistry" | "Biology";
  classTag: string;
  formula: string;
  objective: string;
  hint: string;
  xpReward: number;
  badgeTitle: string;
}

export interface GamificationProgress {
  xp: number;
  rankTitle: string;
  completedQuests: Record<StationId, boolean>;
}
