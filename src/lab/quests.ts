import type {
  DnaBase,
  GamificationProgress,
  LabExperimentState,
  LabRoomId,
  MendelGenotype,
  PhotoMetal,
  QuestDefinition,
  StationId,
} from "./types";

export const LAB_ROOMS: Record<
  LabRoomId,
  {
    id: LabRoomId;
    name: string;
    shortLabel: string;
    wingBadge: string;
    stationRange: string;
    description: string;
    defaultStation: StationId;
    accentHex: string;
    bgHex: number;
  }
> = {
  physics: {
    id: "physics",
    name: "Physics Laboratory",
    shortLabel: "Physics",
    wingBadge: "Mechanics · Optics · Electricity · Quantum",
    stationRange: "01–10",
    description:
      "Dedicated Physics wing featuring Pendulum, Ray Prism, Ohm's Circuit, Projectile, Standing Waves, Convex Lens, Solenoid, Resistors, plus advanced Young's Double-Slit Interference & Einstein's Photoelectric Phototube.",
    defaultStation: "pendulum",
    accentHex: "#3B5998",
    bgHex: 0xeef2f7,
  },
  chemistry: {
    id: "chemistry",
    name: "Chemistry Laboratory",
    shortLabel: "Chemistry",
    wingBadge: "Analytical · Kinetics · Electrochemistry · Organic",
    stationRange: "11–17",
    description:
      "Analytical & Physical Chemistry hall equipped with Acid–Base Titration, Water Electrolysis, Boyle's Gas Piston, Metal Displacement, Carbon Alkanes, plus advanced Haber–Bosch Catalytic Reactor & Daniell Galvanic Cell.",
    defaultStation: "titration",
    accentHex: "#6F4E37",
    bgHex: 0xf8f4ee,
  },
  biology: {
    id: "biology",
    name: "Biology Laboratory",
    shortLabel: "Biology",
    wingBadge: "Botany · Microscopy · Neuro · Biotech",
    stationRange: "18–24",
    description:
      "Life-Sciences conservatory with Photosynthesis, Compound Microscope, DNA Double Helix, Reflex Arc, Mendelian Genetics, plus advanced Hodgkin–Huxley Action Potential Synapse & PCR Thermal Cycler.",
    defaultStation: "photosynthesis",
    accentHex: "#2D6A4F",
    bgHex: 0xf1f6f2,
  },
};

export const ROOM_ORDER: readonly LabRoomId[] = [
  "physics",
  "chemistry",
  "biology",
];

export const ROOM_STATIONS: Record<LabRoomId, readonly StationId[]> = {
  physics: [
    "pendulum",
    "optics",
    "circuit",
    "projectile",
    "wave",
    "lens",
    "electromagnet",
    "resistors",
    "doubleslit",
    "photoelectric",
  ],
  chemistry: [
    "titration",
    "electrolysis",
    "boyles",
    "displacement",
    "carbon",
    "haber",
    "galvanic",
  ],
  biology: [
    "photosynthesis",
    "microscope",
    "dna",
    "reflex",
    "mendel",
    "neuron",
    "pcr",
  ],
};

export const STATION_ORDER: readonly StationId[] = [
  ...ROOM_STATIONS.physics,
  ...ROOM_STATIONS.chemistry,
  ...ROOM_STATIONS.biology,
];

export const STATION_SHORT_LABEL: Record<StationId, string> = {
  pendulum: "Pendulum",
  optics: "Ray Prism",
  circuit: "Ohm's Circuit",
  projectile: "Projectile",
  wave: "Sound Wave",
  lens: "Convex Lens",
  electromagnet: "Solenoid",
  resistors: "Resistors",
  doubleslit: "Double-Slit",
  photoelectric: "Photoelectric",
  titration: "Titration",
  electrolysis: "Electrolysis",
  boyles: "Boyle's Law",
  displacement: "Displacement",
  carbon: "Carbon Chain",
  haber: "Haber Reactor",
  galvanic: "Galvanic Cell",
  photosynthesis: "Photosynthesis",
  microscope: "Microscope",
  dna: "DNA Helix",
  reflex: "Reflex Arc",
  mendel: "Mendel Cross",
  neuron: "Action Potential",
  pcr: "PCR Cycler",
};

export const EMPTY_COMPLETED_QUESTS: Record<StationId, boolean> = {
  pendulum: false,
  optics: false,
  circuit: false,
  projectile: false,
  wave: false,
  lens: false,
  electromagnet: false,
  resistors: false,
  doubleslit: false,
  photoelectric: false,
  titration: false,
  electrolysis: false,
  boyles: false,
  displacement: false,
  carbon: false,
  haber: false,
  galvanic: false,
  photosynthesis: false,
  microscope: false,
  dna: false,
  reflex: false,
  mendel: false,
  neuron: false,
  pcr: false,
};

export const LAB_QUESTS: Record<StationId, QuestDefinition> = {
  // =========================================================================
  // ROOM 1: PHYSICS LABORATORY (STATIONS 01–10)
  // =========================================================================
  pendulum: {
    id: "pendulum",
    room: "physics",
    stationNumber: "01",
    title: "Pendulum Timekeeper",
    subject: "Physics · Oscillation",
    discipline: "Physics",
    classTag: "Class 7–9",
    formula: "T = 2π √(L / g)",
    objective:
      "Start the pendulum on Earth (g = 9.81 m/s²) and calibrate string length near 1.00 m (0.95–1.05 m) for a 2.0 s period.",
    hint: "Use T = 2π√(L/g). At L = 1.00 m on Earth, T ≈ 2.01 s. Try Moon gravity to see how T slows down!",
    xpReward: 150,
    badgeTitle: "Oscillation Master",
  },
  optics: {
    id: "optics",
    room: "physics",
    stationNumber: "02",
    title: "Prism Dispersion Alignment",
    subject: "Physics · Ray Optics",
    discipline: "Physics",
    classTag: "Class 8–10",
    formula: "δ = (n − 1)A",
    objective:
      "Keep the laser beam ON and align prism angle between 44° and 52° for minimum deviation.",
    hint: "Set prism rotation to ~48° with crown glass (n ≈ 1.52) to spread a crisp ROYGBIV spectrum.",
    xpReward: 150,
    badgeTitle: "Optics Navigator",
  },
  circuit: {
    id: "circuit",
    room: "physics",
    stationNumber: "03",
    title: "Ohm's Law Calibration",
    subject: "Physics · Electricity",
    discipline: "Physics",
    classTag: "Class 8–10",
    formula: "I = V / R",
    objective:
      "Close the knife switch and tune Voltage & Resistance to hit 2.00 A (±0.15 A).",
    hint: "By I = V / R, try V = 8.0 V and R = 4.0 Ω (or 10 V / 5 Ω).",
    xpReward: 150,
    badgeTitle: "Circuit Engineer",
  },
  projectile: {
    id: "projectile",
    room: "physics",
    stationNumber: "04",
    title: "Projectile Kinematics Target",
    subject: "Physics · Kinematics",
    discipline: "Physics",
    classTag: "Class 9–10",
    formula: "R = v₀² sin(2θ) / g",
    objective:
      "Tune angle & launch speed and fire the ball to hit the bull's-eye at 2.00 m (1.85–2.15 m).",
    hint: "45° maximizes range R = v₀² sin(2θ)/g. On Earth, try θ = 45° and v₀ = 4.4 m/s, then Fire.",
    xpReward: 180,
    badgeTitle: "Ballistics Analyst",
  },
  wave: {
    id: "wave",
    room: "physics",
    stationNumber: "05",
    title: "3rd Harmonic Resonance",
    subject: "Physics · Sound & Waves",
    discipline: "Physics",
    classTag: "Class 9–10",
    formula: "fₙ = n · (1/2L)√(T/μ)",
    objective:
      "Run the oscillator and lock into the 3rd standing-wave harmonic (n = 2.85–3.15).",
    hint: "With Tension T = 25 N, fundamental f₁ = 20 Hz, so set frequency to 60 Hz for 3 antinodes.",
    xpReward: 180,
    badgeTitle: "Acoustics Tuner",
  },
  lens: {
    id: "lens",
    room: "physics",
    stationNumber: "06",
    title: "Convex Lens 2F Symmetry",
    subject: "Physics · Class 10 Optics",
    discipline: "Physics",
    classTag: "Class 10 Board",
    formula: "1/f = 1/v − 1/u",
    objective:
      "Keep the lamp ON and place the object at 2F (|u| = 2f ± 2 cm) to form an equal-size inverted real image.",
    hint: "With f = 15 cm, slide Object Distance |u| to 30 cm so v = +30 cm and magnification m = −1.00.",
    xpReward: 200,
    badgeTitle: "Ray Optics Scholar",
  },
  electromagnet: {
    id: "electromagnet",
    room: "physics",
    stationNumber: "07",
    title: "Solenoid Magnetic Lift",
    subject: "Physics · Class 10 Magnetism",
    discipline: "Physics",
    classTag: "Class 10 Board",
    formula: "B = μᵣ μ₀ (N/L) I",
    objective:
      "Power the solenoid, insert the soft-iron core, and raise B to at least 4.5 mT to lift the steel clips.",
    hint: "Insert the Soft-Iron Core (4× boost), raise Current I ≥ 3.5 A and Coil Turns N ≥ 80.",
    xpReward: 200,
    badgeTitle: "Electromagnetism Ace",
  },
  resistors: {
    id: "resistors",
    room: "physics",
    stationNumber: "08",
    title: "Parallel Circuit Boost",
    subject: "Physics · Class 10 Circuits",
    discipline: "Physics",
    classTag: "Class 10 Board",
    formula: "1/R_eq = 1/R₁ + 1/R₂",
    objective:
      "Switch to Parallel mode and tune R₁ & R₂ to achieve R_eq = 2.0–3.0 Ω and total current ≥ 4.0 A.",
    hint: "Switch to Parallel and set R₁ = 6 Ω, R₂ = 4 Ω (or 5 Ω & 5 Ω → R_eq = 2.5 Ω, I = 4.8 A).",
    xpReward: 190,
    badgeTitle: "Network Architect",
  },
  doubleslit: {
    id: "doubleslit",
    room: "physics",
    stationNumber: "09",
    title: "Young's Double-Slit Interference",
    subject: "Physics · Wave Optics (Complex)",
    discipline: "Physics",
    classTag: "Class 12 Complex",
    formula: "β = λD / d",
    objective:
      "Keep the laser ON and tune λ, slit separation d, and screen distance D to produce crisp fringe width β = 1.15–1.35 mm.",
    hint: "With λ = 532 nm (green laser) and D = 1.20 m, set slit spacing d = 0.50 mm → β = 1.28 mm.",
    xpReward: 250,
    badgeTitle: "Quantum Interferometrist",
  },
  photoelectric: {
    id: "photoelectric",
    room: "physics",
    stationNumber: "10",
    title: "Photoelectric Stopping Potential",
    subject: "Physics · Quantum Mechanics (Complex)",
    discipline: "Physics",
    classTag: "Class 12 Complex",
    formula: "eV₀ = hc/λ − φ₀",
    objective:
      "Select Sodium (Na, φ₀ = 2.75 eV), illuminate with UV/violet light (K_max ≥ 0.8 eV), and apply retarding voltage to stop photocurrent (I = 0.0 μA).",
    hint: "Choose Na, set λ = 310 nm (E = 4.00 eV, K_max = 1.25 eV), then dial Collector Voltage down to −1.3 V or lower.",
    xpReward: 260,
    badgeTitle: "Quantum Photophysicist",
  },

  // =========================================================================
  // ROOM 2: CHEMISTRY LABORATORY (STATIONS 11–17)
  // =========================================================================
  titration: {
    id: "titration",
    room: "chemistry",
    stationNumber: "11",
    title: "Neutralization Endpoint",
    subject: "Chemistry · Acid–Base",
    discipline: "Chemistry",
    classTag: "Class 7–10",
    formula: "HCl + NaOH → NaCl + H₂O",
    objective:
      "Dispense NaOH from the burette until the flask stabilizes at neutral pH 6.8–7.4.",
    hint: "25 mL of 0.1 M HCl neutralizes near 25.0 mL of 0.1 M NaOH. Use +0.2 mL Micro drops near 24 mL.",
    xpReward: 175,
    badgeTitle: "Titration Specialist",
  },
  electrolysis: {
    id: "electrolysis",
    room: "chemistry",
    stationNumber: "12",
    title: "2:1 Water Splitting",
    subject: "Chemistry · Electrochemistry",
    discipline: "Chemistry",
    classTag: "Class 8–10",
    formula: "2H₂O(l) → 2H₂(g) + O₂(g)",
    objective:
      "Turn DC power ON and collect at least 12.0 mL of H₂ at the cathode (6.0 mL O₂ at anode).",
    hint: "Raise cell voltage to 9–12 V to speed up electrolysis and verify the exact 2:1 gas ratio.",
    xpReward: 175,
    badgeTitle: "Electrochemist",
  },
  boyles: {
    id: "boyles",
    room: "chemistry",
    stationNumber: "13",
    title: "Boyle's Law Compression",
    subject: "Chemistry · Gas Laws",
    discipline: "Chemistry",
    classTag: "Class 9–10",
    formula: "P₁V₁ = P₂V₂ = 4000 kPa·mL",
    objective:
      "Compress the syringe piston until chamber pressure reaches 190–225 kPa.",
    hint: "Since P × V = 4000 kPa·mL, halving volume from 40 mL to 20 mL doubles pressure to 200 kPa.",
    xpReward: 170,
    badgeTitle: "Thermodynamics Explorer",
  },
  displacement: {
    id: "displacement",
    room: "chemistry",
    stationNumber: "14",
    title: "Copper Displacement",
    subject: "Chemistry · Class 10 Reactivity",
    discipline: "Chemistry",
    classTag: "Class 10 Board",
    formula: "Fe + CuSO₄ → FeSO₄ + Cu↓",
    objective:
      "Select Iron (Fe) or Zinc (Zn), immerse it in blue CuSO₄, and reach ≥ 75% copper deposition.",
    hint: "Silver (Ag) is below Copper so it won't react. Pick Fe or Zn, click Immerse, and warm the bath.",
    xpReward: 200,
    badgeTitle: "Reactivity Chemist",
  },
  carbon: {
    id: "carbon",
    room: "chemistry",
    stationNumber: "15",
    title: "Propane Tetrahedral Chain",
    subject: "Chemistry · Class 10 Carbon",
    discipline: "Chemistry",
    classTag: "Class 10 Board",
    formula: "CₙH₂ₙ₊₂ (109.5° sp³)",
    objective:
      "Assemble Propane (C₃H₈, 3 tetrahedral carbon atoms and 8 hydrogens) on the 3D molecular stand.",
    hint: "Select Propane (C₃H₈) to inspect the 109.5° tetrahedral sp³ carbon-carbon zigzag chain.",
    xpReward: 180,
    badgeTitle: "Organic Modeler",
  },
  haber: {
    id: "haber",
    room: "chemistry",
    stationNumber: "16",
    title: "Haber–Bosch Ammonia Equilibrium",
    subject: "Chemistry · Equilibrium & Kinetics (Complex)",
    discipline: "Chemistry",
    classTag: "Class 12 Complex",
    formula: "N₂ + 3H₂ ⇌ 2NH₃ (ΔH = −92.4 kJ)",
    objective:
      "Enable the Iron Catalyst and balance Pressure & Temperature to hit NH₃ Yield ≥ 45% AND Reaction Rate ≥ 65%.",
    hint: "High pressure (220–280 atm) boosts yield; moderate temp (420–470 °C) with Fe Catalyst keeps rate high without destroying exothermic yield.",
    xpReward: 260,
    badgeTitle: "Process Equilibrium Chemist",
  },
  galvanic: {
    id: "galvanic",
    room: "chemistry",
    stationNumber: "17",
    title: "Daniell Cell & Nernst EMF",
    subject: "Chemistry · Electrochemistry (Complex)",
    discipline: "Chemistry",
    classTag: "Class 12 Complex",
    formula: "E = 1.10 − (RT/2F) ln([Zn²⁺]/[Cu²⁺])",
    objective:
      "Insert the KCl Salt Bridge and tune ion concentrations to boost Cell EMF to ≥ 1.15 V.",
    hint: "By the Nernst equation, raise [Cu²⁺] to 1.8–2.0 M and lower [Zn²⁺] to 0.02–0.05 M with the Salt Bridge inserted.",
    xpReward: 250,
    badgeTitle: "Nernst Electrochemist",
  },

  // =========================================================================
  // ROOM 3: BIOLOGY LABORATORY (STATIONS 18–24)
  // =========================================================================
  photosynthesis: {
    id: "photosynthesis",
    room: "biology",
    stationNumber: "18",
    title: "Oxygen Photosynthesis Peak",
    subject: "Biology · Plant Physiology",
    discipline: "Biology",
    classTag: "Class 7–10",
    formula: "6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂",
    objective:
      "Turn the grow lamp ON and optimize Light & dissolved CO₂ to reach ≥ 36 O₂ bubbles/min.",
    hint: "Set Light Intensity ≥ 80% and CO₂ ≥ 1.4 g/L so neither light nor carbon limits the rate.",
    xpReward: 160,
    badgeTitle: "Botany Researcher",
  },
  microscope: {
    id: "microscope",
    room: "biology",
    stationNumber: "19",
    title: "High-Power Cell Focus",
    subject: "Biology · Cell Microscopy",
    discipline: "Biology",
    classTag: "Class 8–10",
    formula: "M = M_obj × M_eye (40×)",
    objective:
      "Switch the revolving turret to 40×, keep the stage lamp ON, and tune fine focus to 46–54.",
    hint: "Rotate to the 40× objective lens and dial Fine Focus near 50 until cell nuclei are crisp.",
    xpReward: 170,
    badgeTitle: "Cell Biologist",
  },
  dna: {
    id: "dna",
    room: "biology",
    stationNumber: "20",
    title: "DNA Complementary Strand",
    subject: "Biology · Molecular Genetics",
    discipline: "Biology",
    classTag: "Class 10 Board",
    formula: "A = T (2 H-bonds) · C ≡ G (3)",
    objective:
      "Pair all 6 complementary nitrogenous bases correctly on the 3D double helix.",
    hint: "Chargaff's rule: Adenine (A) pairs with Thymine (T), and Cytosine (C) pairs with Guanine (G).",
    xpReward: 200,
    badgeTitle: "Genetics Decoder",
  },
  reflex: {
    id: "reflex",
    room: "biology",
    stationNumber: "21",
    title: "Fast Spinal Reflex Arc",
    subject: "Biology · Class 10 Control",
    discipline: "Biology",
    classTag: "Class 10 Board",
    formula: "t = d / v (d = 1.6 m)",
    objective:
      "Set nerve conduction speed ≥ 70 m/s and trigger the heat stimulus to record a reflex under 25 ms.",
    hint: "Raise Conduction Speed to 75–90 m/s and click Trigger Heat Stimulus to watch the spinal arc fire.",
    xpReward: 190,
    badgeTitle: "Neuroscience Explorer",
  },
  mendel: {
    id: "mendel",
    room: "biology",
    stationNumber: "22",
    title: "Mendel's 3:1 F₂ Monohybrid",
    subject: "Biology · Class 10 Heredity",
    discipline: "Biology",
    classTag: "Class 10 Board",
    formula: "Tt × Tt → 1 TT : 2 Tt : 1 tt",
    objective:
      "Cross two heterozygous Tall pea plants (Tt × Tt) and grow the 4 F₂ offspring to prove the 3:1 ratio.",
    hint: "Set Parent 1 = Tt and Parent 2 = Tt, then click Grow Offspring to observe 3 Tall : 1 Dwarf.",
    xpReward: 200,
    badgeTitle: "Heredity Pioneer",
  },
  neuron: {
    id: "neuron",
    room: "biology",
    stationNumber: "23",
    title: "Action Potential & Synapse",
    subject: "Biology · Neurophysiology (Complex)",
    discipline: "Biology",
    classTag: "Class 12 Complex",
    formula: "V_m: −70 mV → −55 mV → +40 mV",
    objective:
      "Enable Myelin Sheath, keep extracellular [Na⁺] ≥ 120 mM, set Stimulus ≥ 55 μA, and Fire a full spike (≥ +35 mV).",
    hint: "Enable Myelin (saltatory speed ~100 m/s), keep [Na⁺] near 145 mM, raise Stimulus ≥ 60 μA, and click Fire Spike.",
    xpReward: 260,
    badgeTitle: "Synaptic Biophysicist",
  },
  pcr: {
    id: "pcr",
    room: "biology",
    stationNumber: "24",
    title: "PCR Exponential Amplification",
    subject: "Biology · Biotechnology (Complex)",
    discipline: "Biology",
    classTag: "Class 12 Complex",
    formula: "N = N₀ · 2ⁿ (94°C → 56°C → 72°C)",
    objective:
      "Keep Taq Polymerase ON, set Primer Annealing Temp to 54–60 °C, and complete ≥ 10 PCR cycles (≥ 1,024 copies).",
    hint: "Set Annealing Temp near 56 °C for 100% primer specificity, keep Taq ON, and Run or Step Cycles to ≥ 10.",
    xpReward: 260,
    badgeTitle: "Molecular Biotechnologist",
  },
};

export function getStationRoom(id: StationId): LabRoomId {
  return LAB_QUESTS[id].room;
}

export const DNA_TEMPLATE_STRAND: DnaBase[] = ["A", "T", "C", "G", "A", "C"];

export function getComplementaryBase(base: DnaBase): DnaBase {
  switch (base) {
    case "A":
      return "T";
    case "T":
      return "A";
    case "C":
      return "G";
    case "G":
      return "C";
  }
}

export function evaluateDnaMatches(
  template: DnaBase[],
  paired: (DnaBase | null)[],
): number {
  let matches = 0;
  for (let i = 0; i < template.length; i++) {
    if (paired[i] && paired[i] === getComplementaryBase(template[i])) {
      matches += 1;
    }
  }
  return matches;
}

export function calculateTitrationPh(baseMl: number): number {
  const va = 25;
  const vb = Math.max(0, baseMl);
  const c = 0.1;
  const totalVol = va + vb;
  const molesAcid = va * c;
  const molesBase = vb * c;
  const diff = molesAcid - molesBase;

  if (Math.abs(diff) < 0.008) {
    return 7.0;
  }
  if (diff > 0) {
    const hConc = diff / totalVol;
    return Math.max(1.0, Math.min(6.9, -Math.log10(hConc)));
  }
  const ohConc = -diff / totalVol;
  const pOH = -Math.log10(ohConc);
  return Math.max(7.1, Math.min(13.0, 14 - pOH));
}

export function calculateOpticsDeviation(
  prismAngleDeg: number,
  refractiveIndex: number,
): number {
  const minDev = (refractiveIndex - 1) * 60;
  const offset = Math.abs(prismAngleDeg - 48) * 0.42;
  return Number((minDev + offset).toFixed(1));
}

export function calculatePhotosynthesisRate(
  lampOn: boolean,
  lightIntensityPct: number,
  co2LevelGl: number,
): number {
  if (!lampOn) return 0;
  const lightFactor = lightIntensityPct / 100;
  const co2Factor = Math.min(1, co2LevelGl / 1.5);
  const limiting = Math.min(lightFactor, co2Factor);
  const synergy = 0.72 * limiting + 0.28 * lightFactor * co2Factor;
  return Math.round(synergy * 48);
}

export function calculateProjectileRange(
  angleDeg: number,
  speedMs: number,
  gravityMs2 = 9.81,
): number {
  const rad = (angleDeg * Math.PI) / 180;
  const g = Math.max(1.0, gravityMs2);
  const r = (speedMs * speedMs * Math.sin(2 * rad)) / g;
  return Number(r.toFixed(2));
}

export function calculateBoylesPressure(volumeMl: number): number {
  const clamped = Math.max(10, Math.min(50, volumeMl));
  return Number((4000 / clamped).toFixed(1));
}

export function calculateWaveHarmonic(
  frequencyHz: number,
  tensionN: number,
): number {
  const f1 = 4 * Math.sqrt(Math.max(4, tensionN));
  return Number((frequencyHz / f1).toFixed(2));
}

export function calculateLensImage(
  objectDistanceCm: number,
  focalLengthCm: number,
): {
  uCm: number;
  vCm: number | null;
  magnification: number | null;
  nature: "real-inverted" | "virtual-erect" | "infinity";
} {
  const uCm = -Math.abs(objectDistanceCm);
  const denom = 1 / focalLengthCm + 1 / uCm;
  if (Math.abs(denom) < 1e-4) {
    return { uCm, vCm: null, magnification: null, nature: "infinity" };
  }
  const vCm = Number((1 / denom).toFixed(1));
  const magnification = Number((vCm / uCm).toFixed(2));
  return {
    uCm,
    vCm,
    magnification,
    nature: vCm > 0 ? "real-inverted" : "virtual-erect",
  };
}

export function calculateSolenoidFieldMt(
  powerOn: boolean,
  currentA: number,
  coilTurns: number,
  ironCoreInserted: boolean,
): number {
  if (!powerOn) return 0;
  const mu0 = 4 * Math.PI * 1e-7;
  const lengthM = 0.1;
  const relPerm = ironCoreInserted ? 4.0 : 1.0;
  const tesla = relPerm * mu0 * (coilTurns / lengthM) * currentA;
  return Number((tesla * 1000).toFixed(2));
}

export function calculateResistorsNetwork(
  mode: "series" | "parallel",
  r1Ohm: number,
  r2Ohm: number,
  voltageV: number,
): { equivalentOhm: number; totalCurrentA: number } {
  const equivalentOhm =
    mode === "series"
      ? r1Ohm + r2Ohm
      : (r1Ohm * r2Ohm) / Math.max(0.1, r1Ohm + r2Ohm);
  const totalCurrentA = voltageV / Math.max(0.1, equivalentOhm);
  return {
    equivalentOhm: Number(equivalentOhm.toFixed(2)),
    totalCurrentA: Number(totalCurrentA.toFixed(2)),
  };
}

export function calculateCarbonAlkane(carbons: 1 | 2 | 3 | 4): {
  name: string;
  formula: string;
  hydrogens: number;
  molarMass: number;
} {
  const names: Record<1 | 2 | 3 | 4, string> = {
    1: "Methane",
    2: "Ethane",
    3: "Propane",
    4: "Butane",
  };
  const formulas: Record<1 | 2 | 3 | 4, string> = {
    1: "CH₄",
    2: "C₂H₆",
    3: "C₃H₈",
    4: "C₄H₁₀",
  };
  const hydrogens = 2 * carbons + 2;
  return {
    name: names[carbons],
    formula: formulas[carbons],
    hydrogens,
    molarMass: carbons * 12 + hydrogens,
  };
}

export function calculateReflexTimeMs(conductionSpeedMs: number): number {
  return Number(((1.6 / Math.max(10, conductionSpeedMs)) * 1000).toFixed(1));
}

export function calculateMendelOffspring(
  parent1: MendelGenotype,
  parent2: MendelGenotype,
): {
  offspring: MendelGenotype[];
  tallCount: number;
  dwarfCount: number;
} {
  const p1 = [parent1[0], parent1[1]];
  const p2 = [parent2[0], parent2[1]];
  const offspring: MendelGenotype[] = [];
  let tallCount = 0;
  let dwarfCount = 0;

  for (const a1 of p1) {
    for (const a2 of p2) {
      const pair =
        a1 === "T" || a2 === "T"
          ? a1 === "T" && a2 === "T"
            ? "TT"
            : "Tt"
          : "tt";
      offspring.push(pair);
      if (pair === "tt") dwarfCount += 1;
      else tallCount += 1;
    }
  }
  return { offspring, tallCount, dwarfCount };
}

// =========================================================================
// COMPLEX EXPERIMENT MATHEMATICAL ENGINES (STATIONS 09, 10, 16, 17, 23, 24)
// =========================================================================

export function wavelengthToHex(nm: number): number {
  const clamped = Math.max(200, Math.min(720, nm));
  let r = 0;
  let g = 0;
  let b = 0;
  if (clamped < 380) {
    r = 0.52;
    g = 0.25;
    b = 0.96;
  } else if (clamped < 440) {
    r = -(clamped - 440) / 60;
    g = 0;
    b = 1;
  } else if (clamped < 490) {
    r = 0;
    g = (clamped - 440) / 50;
    b = 1;
  } else if (clamped < 510) {
    r = 0;
    g = 1;
    b = -(clamped - 510) / 20;
  } else if (clamped < 580) {
    r = (clamped - 510) / 70;
    g = 1;
    b = 0;
  } else if (clamped < 645) {
    r = 1;
    g = -(clamped - 645) / 65;
    b = 0;
  } else {
    r = 1;
    g = 0.08;
    b = 0.05;
  }
  const ri = Math.round(Math.max(0, Math.min(1, r)) * 255);
  const gi = Math.round(Math.max(0, Math.min(1, g)) * 255);
  const bi = Math.round(Math.max(0, Math.min(1, b)) * 255);
  return (ri << 16) | (gi << 8) | bi;
}

export function calculateDoubleSlitMetrics(
  wavelengthNm: number,
  slitSeparationMm: number,
  screenDistanceM: number,
): {
  fringeWidthMm: number;
  angularSpreadDeg: number;
  centralOrderCount: number;
} {
  // beta = lambda * D / d  (with lambda in mm = nm * 1e-6, D in mm = m * 1e3 => nm * 1e-3 * D / d)
  const fringeWidthMm = Number(
    ((wavelengthNm * 1e-3 * screenDistanceM) / Math.max(0.1, slitSeparationMm)).toFixed(2),
  );
  const angularSpreadDeg = Number(
    (((wavelengthNm * 1e-6) / Math.max(0.1, slitSeparationMm)) * (180 / Math.PI)).toFixed(3),
  );
  const centralOrderCount = Math.max(3, Math.min(19, Math.round(12 / Math.max(0.35, fringeWidthMm))));
  return { fringeWidthMm, angularSpreadDeg, centralOrderCount };
}

export const PHOTO_METAL_WORK_FUNCTION_EV: Record<
  PhotoMetal,
  { name: string; workFunctionEv: number; colorHex: number }
> = {
  Cs: { name: "Cesium (Cs)", workFunctionEv: 2.14, colorHex: 0xd9c27a },
  Na: { name: "Sodium (Na)", workFunctionEv: 2.75, colorHex: 0xcbd5e1 },
  Zn: { name: "Zinc (Zn)", workFunctionEv: 4.3, colorHex: 0x8fa3b8 },
};

export function calculatePhotoelectricMetrics(
  metal: PhotoMetal,
  wavelengthNm: number,
  intensityPct: number,
  collectorVoltageV: number,
): {
  photonEnergyEv: number;
  workFunctionEv: number;
  kMaxEv: number;
  stoppingPotentialV: number;
  thresholdNm: number;
  photocurrentUa: number;
  emitting: boolean;
} {
  const workFunctionEv = PHOTO_METAL_WORK_FUNCTION_EV[metal].workFunctionEv;
  const photonEnergyEv = Number((1240 / Math.max(180, wavelengthNm)).toFixed(2));
  const rawKMax = photonEnergyEv - workFunctionEv;
  const kMaxEv = Number(Math.max(0, rawKMax).toFixed(2));
  const stoppingPotentialV = kMaxEv;
  const thresholdNm = Math.round(1240 / workFunctionEv);
  const emitting = rawKMax > 0.01;

  let photocurrentUa = 0;
  if (emitting) {
    if (collectorVoltageV <= -stoppingPotentialV) {
      photocurrentUa = 0;
    } else if (collectorVoltageV < 0) {
      const frac = Math.max(0, (collectorVoltageV + stoppingPotentialV) / Math.max(0.05, stoppingPotentialV));
      photocurrentUa = intensityPct * 0.45 * Math.pow(frac, 0.72);
    } else {
      const boost = 1 + 0.12 * Math.tanh(collectorVoltageV * 1.5);
      photocurrentUa = intensityPct * 0.45 * boost;
    }
  }

  return {
    photonEnergyEv,
    workFunctionEv,
    kMaxEv,
    stoppingPotentialV,
    thresholdNm,
    photocurrentUa: Number(photocurrentUa.toFixed(1)),
    emitting,
  };
}

export function calculateHaberMetrics(
  pressureAtm: number,
  temperatureC: number,
  catalystOn: boolean,
): {
  yieldPct: number;
  ratePct: number;
  kpRelative: number;
} {
  // Exothermic N2 + 3H2 <=> 2NH3: high P raises yield, high T lowers equilibrium yield but accelerates rate
  const pNorm = Math.max(0.15, pressureAtm / 200);
  const tempDrop = Math.exp(-0.0068 * (temperatureC - 350));
  const rawEq = (100 * (pNorm * 0.85 * tempDrop)) / (1 + pNorm * 0.85 * tempDrop);
  const yieldPct = Number(Math.max(4, Math.min(82, rawEq)).toFixed(1));

  // Arrhenius kinetics boosted 2.3x by iron catalyst
  const arrhenius = Math.exp(0.0115 * (temperatureC - 320)) - 0.65;
  const catFactor = catalystOn ? 2.35 : 0.72;
  const pRate = 0.7 + 0.3 * Math.min(1.5, pressureAtm / 200);
  const ratePct = Number(Math.max(5, Math.min(100, arrhenius * 18 * catFactor * pRate)).toFixed(0));

  const kpRelative = Number((tempDrop * 12.5).toFixed(2));
  return { yieldPct, ratePct, kpRelative };
}

export function calculateGalvanicMetrics(
  saltBridgeInserted: boolean,
  cuConcM: number,
  znConcM: number,
  tempK: number,
): {
  emfV: number;
  deltaGKj: number;
  reactionQuotientQ: number;
} {
  const safeCu = Math.max(0.01, cuConcM);
  const safeZn = Math.max(0.01, znConcM);
  const reactionQuotientQ = Number((safeZn / safeCu).toFixed(3));
  if (!saltBridgeInserted) {
    return { emfV: 0, deltaGKj: 0, reactionQuotientQ };
  }
  const R = 8.314;
  const F = 96485;
  const n = 2;
  const emf = 1.1 - ((R * tempK) / (n * F)) * Math.log(safeZn / safeCu);
  const clampedEmf = Number(Math.max(0, emf).toFixed(3));
  const deltaGKj = Number(((-n * F * clampedEmf) / 1000).toFixed(1));
  return { emfV: clampedEmf, deltaGKj, reactionQuotientQ };
}

export function calculateNeuronMetrics(
  stimulusUa: number,
  myelinated: boolean,
  sodiumMm: number,
): {
  fires: boolean;
  peakMv: number;
  conductionMs: number;
  thresholdUa: number;
} {
  const thresholdUa = 50;
  const fires = stimulusUa >= thresholdUa;
  // Nernst shift of peak depolarization with extracellular [Na+] (normal ~145 mM -> +40 mV)
  const naRatio = Math.max(0.25, sodiumMm / 145);
  const peakMv = fires
    ? Number(Math.max(-10, Math.min(48, 40 + 26.7 * Math.log(naRatio))).toFixed(1))
    : Number((-70 + (stimulusUa / thresholdUa) * 13).toFixed(1));
  const conductionMs = myelinated ? 105 : 6;
  return { fires, peakMv, conductionMs, thresholdUa };
}

export function calculatePcrMetrics(
  annealingTempC: number,
  cycleCount: number,
  taqActive: boolean,
): {
  specificityPct: number;
  dnaCopies: number;
  gelIntensity: number;
  statusText: string;
} {
  let specificityPct = 100;
  let statusText = "Optimal Specific Primer Binding";
  if (!taqActive) {
    specificityPct = 0;
    statusText = "Taq Polymerase Missing (No Extension)";
  } else if (annealingTempC > 62) {
    specificityPct = Math.max(0, Math.round(100 - (annealingTempC - 62) * 16));
    statusText = "Too Hot — Primers Melting Off";
  } else if (annealingTempC < 50) {
    specificityPct = Math.max(25, Math.round(100 - (50 - annealingTempC) * 7));
    statusText = "Too Cool — Non-Specific Binding";
  }
  const effectiveCycles = taqActive ? cycleCount * (specificityPct / 100) : 0;
  const dnaCopies = Math.round(Math.pow(2, Math.min(30, effectiveCycles)));
  const gelIntensity = Math.min(1, Math.log2(Math.max(1, dnaCopies)) / 14);
  return { specificityPct, dnaCopies, gelIntensity, statusText };
}

export const INITIAL_EXPERIMENT_STATE: LabExperimentState = {
  pendulum: {
    running: true,
    lengthM: 0.75,
    amplitudeDeg: 18,
    gravityMs2: 9.81,
    angleRad: 0.25,
    elapsedOscillations: 0,
    measuredPeriodS: 2 * Math.PI * Math.sqrt(0.75 / 9.81),
  },
  optics: {
    beamOn: true,
    prismAngleDeg: 28,
    refractiveIndex: 1.52,
    deviationDeg: calculateOpticsDeviation(28, 1.52),
  },
  circuit: {
    switchClosed: true,
    voltageV: 6,
    resistanceOhm: 6,
    currentA: 1.0,
  },
  projectile: {
    angleDeg: 35,
    speedMs: 3.6,
    gravityMs2: 9.81,
    rangeM: calculateProjectileRange(35, 3.6, 9.81),
    launchPulse: 0,
    lastLandedRangeM: null,
  },
  wave: {
    running: true,
    frequencyHz: 32,
    tensionN: 25,
    harmonicNumber: calculateWaveHarmonic(32, 25),
  },
  lens: {
    lampOn: true,
    objectDistanceCm: 42,
    focalLengthCm: 15,
  },
  electromagnet: {
    powerOn: true,
    currentA: 2.0,
    coilTurns: 50,
    ironCoreInserted: false,
  },
  resistors: {
    mode: "series",
    r1Ohm: 6,
    r2Ohm: 6,
    voltageV: 12,
  },
  doubleslit: {
    laserOn: true,
    wavelengthNm: 532,
    slitSeparationMm: 0.75,
    screenDistanceM: 1.2,
  },
  photoelectric: {
    metal: "Na",
    wavelengthNm: 360,
    intensityPct: 75,
    collectorVoltageV: 0.4,
  },
  titration: {
    acidVolumeMl: 25,
    baseAddedMl: 8,
    currentPh: calculateTitrationPh(8),
    dropPulse: 0,
  },
  electrolysis: {
    powerOn: true,
    voltageV: 6,
    h2VolumeMl: 2.0,
    o2VolumeMl: 1.0,
  },
  boyles: {
    volumeMl: 40,
    pressureKpa: calculateBoylesPressure(40),
  },
  displacement: {
    metal: "Fe",
    immersed: false,
    progressPct: 0,
    tempC: 30,
  },
  carbon: {
    carbons: 1,
    rotating: true,
  },
  haber: {
    pressureAtm: 120,
    temperatureC: 540,
    catalystOn: false,
  },
  galvanic: {
    saltBridgeInserted: true,
    cuConcM: 0.5,
    znConcM: 1.0,
    tempK: 298,
  },
  photosynthesis: {
    lampOn: true,
    lightIntensityPct: 55,
    co2LevelGl: 0.8,
    bubblesPerMin: calculatePhotosynthesisRate(true, 55, 0.8),
  },
  microscope: {
    illuminatorOn: true,
    magnification: 10,
    focusValue: 26,
    specimen: "onion",
  },
  dna: {
    rotating: true,
    templateStrand: [...DNA_TEMPLATE_STRAND],
    pairedStrand: ["T", "A", null, null, null, null],
  },
  reflex: {
    conductionSpeedMs: 50,
    triggerPulse: 0,
    lastReactionMs: null,
  },
  mendel: {
    parent1: "TT",
    parent2: "tt",
    grown: false,
  },
  neuron: {
    stimulusUa: 35,
    myelinated: false,
    sodiumMm: 145,
    firePulse: 0,
    lastPeakMv: null,
  },
  pcr: {
    running: true,
    annealingTempC: 65,
    cycleCount: 2,
    phaseIndex: 0,
    taqActive: true,
  },
};

export function evaluateQuests(
  state: LabExperimentState,
  existing: Record<StationId, boolean>,
): {
  completed: Record<StationId, boolean>;
  newlyCompleted: StationId[];
} {
  const next: Record<StationId, boolean> = {
    ...EMPTY_COMPLETED_QUESTS,
    ...existing,
  };
  const newlyCompleted: StationId[] = [];

  if (
    !next.pendulum &&
    state.pendulum.running &&
    Math.abs(state.pendulum.gravityMs2 - 9.81) < 0.5 &&
    state.pendulum.lengthM >= 0.95 &&
    state.pendulum.lengthM <= 1.05 &&
    state.pendulum.elapsedOscillations >= 1
  ) {
    next.pendulum = true;
    newlyCompleted.push("pendulum");
  }

  if (
    !next.optics &&
    state.optics.beamOn &&
    state.optics.prismAngleDeg >= 44 &&
    state.optics.prismAngleDeg <= 52
  ) {
    next.optics = true;
    newlyCompleted.push("optics");
  }

  if (
    !next.circuit &&
    state.circuit.switchClosed &&
    Math.abs(state.circuit.currentA - 2.0) <= 0.15
  ) {
    next.circuit = true;
    newlyCompleted.push("circuit");
  }

  if (
    !next.projectile &&
    state.projectile.lastLandedRangeM !== null &&
    state.projectile.lastLandedRangeM >= 1.85 &&
    state.projectile.lastLandedRangeM <= 2.15
  ) {
    next.projectile = true;
    newlyCompleted.push("projectile");
  }

  if (
    !next.wave &&
    state.wave.running &&
    state.wave.harmonicNumber >= 2.85 &&
    state.wave.harmonicNumber <= 3.15
  ) {
    next.wave = true;
    newlyCompleted.push("wave");
  }

  if (
    !next.lens &&
    state.lens.lampOn &&
    Math.abs(state.lens.objectDistanceCm - 2 * state.lens.focalLengthCm) <= 2
  ) {
    next.lens = true;
    newlyCompleted.push("lens");
  }

  if (!next.electromagnet && state.electromagnet.ironCoreInserted) {
    const fieldMt = calculateSolenoidFieldMt(
      state.electromagnet.powerOn,
      state.electromagnet.currentA,
      state.electromagnet.coilTurns,
      state.electromagnet.ironCoreInserted,
    );
    if (fieldMt >= 4.5) {
      next.electromagnet = true;
      newlyCompleted.push("electromagnet");
    }
  }

  if (!next.resistors && state.resistors.mode === "parallel") {
    const net = calculateResistorsNetwork(
      state.resistors.mode,
      state.resistors.r1Ohm,
      state.resistors.r2Ohm,
      state.resistors.voltageV,
    );
    if (
      net.equivalentOhm >= 2.0 &&
      net.equivalentOhm <= 3.0 &&
      net.totalCurrentA >= 4.0
    ) {
      next.resistors = true;
      newlyCompleted.push("resistors");
    }
  }

  if (!next.doubleslit && state.doubleslit.laserOn) {
    const ds = calculateDoubleSlitMetrics(
      state.doubleslit.wavelengthNm,
      state.doubleslit.slitSeparationMm,
      state.doubleslit.screenDistanceM,
    );
    if (ds.fringeWidthMm >= 1.15 && ds.fringeWidthMm <= 1.35) {
      next.doubleslit = true;
      newlyCompleted.push("doubleslit");
    }
  }

  if (!next.photoelectric && state.photoelectric.metal === "Na") {
    const pe = calculatePhotoelectricMetrics(
      state.photoelectric.metal,
      state.photoelectric.wavelengthNm,
      state.photoelectric.intensityPct,
      state.photoelectric.collectorVoltageV,
    );
    if (pe.kMaxEv >= 0.8 && pe.photocurrentUa === 0) {
      next.photoelectric = true;
      newlyCompleted.push("photoelectric");
    }
  }

  if (
    !next.titration &&
    state.titration.currentPh >= 6.8 &&
    state.titration.currentPh <= 7.4
  ) {
    next.titration = true;
    newlyCompleted.push("titration");
  }

  if (
    !next.electrolysis &&
    state.electrolysis.powerOn &&
    state.electrolysis.h2VolumeMl >= 12.0
  ) {
    next.electrolysis = true;
    newlyCompleted.push("electrolysis");
  }

  if (
    !next.boyles &&
    state.boyles.pressureKpa >= 190 &&
    state.boyles.pressureKpa <= 225
  ) {
    next.boyles = true;
    newlyCompleted.push("boyles");
  }

  if (
    !next.displacement &&
    (state.displacement.metal === "Fe" || state.displacement.metal === "Zn") &&
    state.displacement.progressPct >= 75
  ) {
    next.displacement = true;
    newlyCompleted.push("displacement");
  }

  if (!next.carbon && state.carbon.carbons === 3) {
    next.carbon = true;
    newlyCompleted.push("carbon");
  }

  if (!next.haber && state.haber.catalystOn) {
    const h = calculateHaberMetrics(
      state.haber.pressureAtm,
      state.haber.temperatureC,
      state.haber.catalystOn,
    );
    if (h.yieldPct >= 45 && h.ratePct >= 65) {
      next.haber = true;
      newlyCompleted.push("haber");
    }
  }

  if (!next.galvanic && state.galvanic.saltBridgeInserted) {
    const g = calculateGalvanicMetrics(
      state.galvanic.saltBridgeInserted,
      state.galvanic.cuConcM,
      state.galvanic.znConcM,
      state.galvanic.tempK,
    );
    if (g.emfV >= 1.15) {
      next.galvanic = true;
      newlyCompleted.push("galvanic");
    }
  }

  if (
    !next.photosynthesis &&
    state.photosynthesis.lampOn &&
    state.photosynthesis.bubblesPerMin >= 36
  ) {
    next.photosynthesis = true;
    newlyCompleted.push("photosynthesis");
  }

  if (
    !next.microscope &&
    state.microscope.illuminatorOn &&
    state.microscope.magnification === 40 &&
    state.microscope.focusValue >= 46 &&
    state.microscope.focusValue <= 54
  ) {
    next.microscope = true;
    newlyCompleted.push("microscope");
  }

  if (
    !next.dna &&
    evaluateDnaMatches(state.dna.templateStrand, state.dna.pairedStrand) ===
      state.dna.templateStrand.length
  ) {
    next.dna = true;
    newlyCompleted.push("dna");
  }

  if (
    !next.reflex &&
    state.reflex.lastReactionMs !== null &&
    state.reflex.lastReactionMs <= 25
  ) {
    next.reflex = true;
    newlyCompleted.push("reflex");
  }

  if (
    !next.mendel &&
    state.mendel.grown &&
    state.mendel.parent1 === "Tt" &&
    state.mendel.parent2 === "Tt"
  ) {
    next.mendel = true;
    newlyCompleted.push("mendel");
  }

  if (
    !next.neuron &&
    state.neuron.myelinated &&
    state.neuron.sodiumMm >= 120 &&
    state.neuron.lastPeakMv !== null &&
    state.neuron.lastPeakMv >= 35
  ) {
    next.neuron = true;
    newlyCompleted.push("neuron");
  }

  if (
    !next.pcr &&
    state.pcr.taqActive &&
    state.pcr.annealingTempC >= 54 &&
    state.pcr.annealingTempC <= 60 &&
    state.pcr.cycleCount >= 10
  ) {
    next.pcr = true;
    newlyCompleted.push("pcr");
  }

  return { completed: next, newlyCompleted };
}

export function computeRankTitle(completedCount: number): string {
  if (completedCount >= 24) return "Pocket Labs Grand Laureate";
  if (completedCount >= 18) return "Senior Honours Researcher";
  if (completedCount >= 12) return "Distinguished Board Fellow";
  if (completedCount >= 7) return "Lead Investigator";
  if (completedCount >= 3) return "Apprentice Scientist";
  if (completedCount >= 1) return "Junior Researcher";
  return "Lab Explorer";
}

export function buildProgressSnapshot(
  completed: Record<StationId, boolean>,
): GamificationProgress {
  let xp = 0;
  let count = 0;
  (Object.keys(LAB_QUESTS) as StationId[]).forEach((id) => {
    if (completed[id]) {
      xp += LAB_QUESTS[id].xpReward;
      count += 1;
    }
  });
  return {
    xp,
    rankTitle: computeRankTitle(count),
    completedQuests: completed,
  };
}
