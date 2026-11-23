import type { TutorLanguage } from "../types/navigation";
import type { LabExperimentState, StationId } from "./types";
import {
  calculateCarbonAlkane,
  calculateDoubleSlitMetrics,
  calculateGalvanicMetrics,
  calculateHaberMetrics,
  calculateLensImage,
  calculateMendelOffspring,
  calculateNeuronMetrics,
  calculatePcrMetrics,
  calculatePhotoelectricMetrics,
  calculateReflexTimeMs,
  calculateResistorsNetwork,
  calculateSolenoidFieldMt,
  DNA_TEMPLATE_STRAND,
  evaluateDnaMatches,
  LAB_QUESTS,
} from "./quests";

export const LAB_LANGUAGE_OPTIONS: readonly {
  id: TutorLanguage;
  shortLabel: string;
  label: string;
}[] = [
  { id: "English", shortLabel: "EN", label: "English" },
  { id: "Kannada", shortLabel: "ಕನ್ನಡ", label: "ಕನ್ನಡ (Kannada)" },
  { id: "Hindi", shortLabel: "हिन्दी", label: "हिन्दी (Hindi)" },
];

export interface FormulaVariable {
  symbol: string;
  meaning: string;
}

export interface LiveObservationInsight {
  statusLabel: string;
  summary: string;
  nextStep: string;
}

export interface ExperimentExplainability {
  id: StationId;
  governingPrinciple: string;
  formula: string;
  variables: FormulaVariable[];
  whyItHappens: string;
  observationGuide: [string, string, string];
  realWorldApplication: string;
  interpretLiveState: (state: LabExperimentState) => LiveObservationInsight;
}

export const EXPERIMENT_EXPLAINABILITY: Record<
  StationId,
  ExperimentExplainability
> = {
  pendulum: {
    id: "pendulum",
    governingPrinciple: "Isochronism & Simple Harmonic Motion",
    formula: "T = 2π √(L / g)",
    variables: [
      { symbol: "T", meaning: "Time period for one full oscillation (s)" },
      { symbol: "L", meaning: "Effective string length from pivot to bob center (m)" },
      { symbol: "g", meaning: "Gravitational acceleration (9.81 m/s²)" },
    ],
    whyItHappens:
      "Gravity pulls the displaced bob toward equilibrium. Because the restoring torque grows proportionally with displacement for small angles, the period depends only on string length and gravity—not on the bob's mass or small release angle.",
    observationGuide: [
      "Adjust String Length (L) and watch how a longer string slows the angular frequency ω = √(g / L).",
      "Change Release Angle (θ) between 6° and 30° and note that Time Period (T) stays unchanged.",
      "Calibrate L near 1.00 m and let the bob complete one full swing to hit the 2.0 s target.",
    ],
    realWorldApplication:
      "Used in precision pendulum clocks, Foucault pendulums demonstrating Earth's rotation, and seismic accelerometers.",
    interpretLiveState: (state) => {
      const { running, lengthM, measuredPeriodS, elapsedOscillations } =
        state.pendulum;
      if (!running) {
        return {
          statusLabel: "Paused",
          summary: `Oscillation is paused at L = ${lengthM.toFixed(2)} m (theoretical T = ${measuredPeriodS.toFixed(2)} s).`,
          nextStep: "Start the swing to observe restoring motion and count completed periods.",
        };
      }
      if (lengthM >= 0.95 && lengthM <= 1.05) {
        return {
          statusLabel: elapsedOscillations >= 1 ? "Calibrated" : "Stabilizing",
          summary: `At L = ${lengthM.toFixed(2)} m, the period T = ${measuredPeriodS.toFixed(2)} s matches a classic 2-second seconds pendulum (${elapsedOscillations} swings logged).`,
          nextStep:
            elapsedOscillations >= 1
              ? "Try varying Release Angle (θ) to verify period independence."
              : "Allow one full back-and-forth swing to complete calibration.",
        };
      }
      const comparison = lengthM < 0.95 ? "shorter, so it swings faster" : "longer, so it swings slower";
      return {
        statusLabel: "Observing",
        summary: `At L = ${lengthM.toFixed(2)} m, T = ${measuredPeriodS.toFixed(2)} s—your string is ${comparison} than the 1.00 m benchmark.`,
        nextStep: "Slide String Length toward 1.00 m to bring T close to 2.01 s.",
      };
    },
  },

  optics: {
    id: "optics",
    governingPrinciple: "Refraction, Snell's Law & Chromatic Dispersion",
    formula: "n = sin((A + δm) / 2) / sin(A / 2)",
    variables: [
      { symbol: "n", meaning: "Refractive index of the glass prism" },
      { symbol: "A", meaning: "Apex angle of the equilateral prism (60°)" },
      { symbol: "δm", meaning: "Angle of minimum deviation (°)" },
    ],
    whyItHappens:
      "Light slows down upon entering dense optical glass, bending toward the normal. Shorter violet wavelengths slow down slightly more than longer red wavelengths, separating white light into a continuous spectrum.",
    observationGuide: [
      "Switch the collimator beam ON so parallel white rays strike the left prism face.",
      "Rotate the prism smoothly between 20° and 70° and watch the dispersed spectrum rise and fall.",
      "Increase Refractive Index (n) to widen the angular separation between red and violet rays.",
    ],
    realWorldApplication:
      "Forms the core optical principle behind prism spectrometers, binoculars, periscopes, and wavelength-division fiber networks.",
    interpretLiveState: (state) => {
      const { beamOn, prismAngleDeg, refractiveIndex, deviationDeg } =
        state.optics;
      if (!beamOn) {
        return {
          statusLabel: "Beam Off",
          summary: "The collimator light source is currently off, so no refraction occurs inside the glass prism.",
          nextStep: "Turn the light beam ON to trace incident and dispersed rays.",
        };
      }
      const inWindow = prismAngleDeg >= 44 && prismAngleDeg <= 52;
      return {
        statusLabel: inWindow ? "Minimum Deviation" : "Dispersing",
        summary: `With n = ${refractiveIndex.toFixed(2)} and prism rotation ${prismAngleDeg}°, total beam deviation is δ = ${deviationDeg.toFixed(1)}°.`,
        nextStep: inWindow
          ? "Rays pass nearly symmetrically through the prism—try raising n to widen spectral spread."
          : "Sweep the prism angle toward 48° to reach symmetrical minimum deviation.",
      };
    },
  },

  titration: {
    id: "titration",
    governingPrinciple: "Acid–Base Neutralization & Equivalence Point",
    formula: "HCl(aq) + NaOH(aq) → NaCl(aq) + H₂O(l)",
    variables: [
      { symbol: "pH", meaning: "Negative log of hydronium ion concentration (−log[H⁺])" },
      { symbol: "V_base", meaning: "Volume of NaOH titrant dispensed (mL)" },
      { symbol: "V_eq", meaning: "Equivalence point (25.0 mL for equal molarity)" },
    ],
    whyItHappens:
      "Hydroxide ions (OH⁻) from the burette react 1:1 with hydrogen ions (H⁺) in the 25 mL acid flask to form neutral water. Near the 25.0 mL equivalence point, even a single 0.2 mL drop triggers a sharp jump in pH and indicator color.",
    observationGuide: [
      "Watch the flask start acidic (red/warm tint) at low base volume.",
      "Add +5 mL or +1 mL increments until base volume approaches 23–24 mL.",
      "Switch to +0.2 mL micro-drops near 25.0 mL to catch neutral pH 6.7–7.3 without overshooting.",
    ],
    realWorldApplication:
      "Routine analytical method in pharmaceutical quality control, blood-gas monitoring, soil testing, and municipal water treatment.",
    interpretLiveState: (state) => {
      const { baseAddedMl, currentPh } = state.titration;
      if (currentPh >= 6.7 && currentPh <= 7.3) {
        return {
          statusLabel: "Neutral Equivalence",
          summary: `At ${baseAddedMl.toFixed(1)} mL of NaOH, [H⁺] equals [OH⁻] and pH is ${currentPh.toFixed(2)}—complete stoichiometric neutralization.`,
          nextStep: "Add one more drop to witness how steeply pH climbs into the basic region.",
        };
      }
      if (currentPh < 6.7) {
        const remaining = Math.max(0, 25 - baseAddedMl);
        return {
          statusLabel: "Acidic Excess",
          summary: `Flask pH is ${currentPh.toFixed(2)} (${baseAddedMl.toFixed(1)} mL added): excess H⁺ ions remain in solution.`,
          nextStep: `Dispense ~${remaining.toFixed(1)} mL more NaOH (use +0.2 mL drops near 25 mL).`,
        };
      }
      return {
        statusLabel: "Basic Excess",
        summary: `Flask pH is ${currentPh.toFixed(2)} (${baseAddedMl.toFixed(1)} mL added): excess OH⁻ ions have turned the indicator violet-basic.`,
        nextStep: "Reset the flask to practice catching the sharp pH 7.0 transition cleanly.",
      };
    },
  },

  circuit: {
    id: "circuit",
    governingPrinciple: "Ohm's Law & Resistive Power Dissipation",
    formula: "I = V / R   ·   P = V · I",
    variables: [
      { symbol: "V", meaning: "DC supply potential difference (Volts)" },
      { symbol: "R", meaning: "Load resistance opposing charge flow (Ohms, Ω)" },
      { symbol: "I", meaning: "Steady-state electric current (Amperes, A)" },
    ],
    whyItHappens:
      "Closing the knife switch completes a closed conducting path. Voltage pushes electrons around the loop while collisions inside the resistor limit drift speed, converting electrical energy into thermal glow (P = I²R).",
    observationGuide: [
      "Ensure the knife switch is closed so the closed loop allows current to flow.",
      "Raise Voltage (V) to see current and electron speed increase proportionally.",
      "Increase Resistance (R) to throttle current and verify I = V / R on the analog 0–6 A dial.",
    ],
    realWorldApplication:
      "Foundational rule behind household circuit breakers, phone chargers, LED current-limiting resistors, and electric heating coils.",
    interpretLiveState: (state) => {
      const { switchClosed, voltageV, resistanceOhm, currentA } = state.circuit;
      if (!switchClosed) {
        return {
          statusLabel: "Open Circuit",
          summary: `Switch is open at V = ${voltageV.toFixed(1)} V, R = ${resistanceOhm.toFixed(1)} Ω, so current is 0.00 A.`,
          nextStep: "Close the knife switch to complete the circuit loop.",
        };
      }
      const powerW = voltageV * currentA;
      const onTarget = Math.abs(currentA - 1.5) <= 0.08;
      return {
        statusLabel: onTarget ? "Target Current" : "Closed Loop",
        summary: `I = ${voltageV.toFixed(1)} V / ${resistanceOhm.toFixed(1)} Ω = ${currentA.toFixed(2)} A, dissipating ${powerW.toFixed(1)} W in the load resistor.`,
        nextStep: onTarget
          ? "You hit 1.50 A—try doubling both V and R to prove the ratio stays constant."
          : "Tune Voltage and Resistance so their ratio V / R equals 1.50 A.",
      };
    },
  },

  electrolysis: {
    id: "electrolysis",
    governingPrinciple: "Faraday's Laws & Stoichiometric Water Splitting",
    formula: "2H₂O(l) → 2H₂(g) + O₂(g)",
    variables: [
      { symbol: "V", meaning: "Applied DC electrolysis voltage (V)" },
      { symbol: "H₂", meaning: "Hydrogen gas collected at the negative cathode (mL)" },
      { symbol: "O₂", meaning: "Oxygen gas collected at the positive anode (mL)" },
    ],
    whyItHappens:
      "Direct current supplies electrons at the cathode to reduce water into hydrogen gas (H₂) and removes electrons at the anode to oxidize water into oxygen gas (O₂). Because each water molecule has two H atoms per O atom, H₂ volume is always twice O₂.",
    observationGuide: [
      "Keep the DC power cell active while attending the electrolysis station.",
      "Increase DC Voltage (8–12 V) to raise current and accelerate bubble evolution.",
      "Compare both inverted collection tubes to verify the exact 2 : 1 H₂-to-O₂ gas volume ratio.",
    ],
    realWorldApplication:
      "Powers green hydrogen fuel production, industrial chlorine/aluminum refining, and oxygen life-support on submarines and spacecraft.",
    interpretLiveState: (state) => {
      const { powerOn, voltageV, h2VolumeMl, o2VolumeMl } = state.electrolysis;
      if (!powerOn) {
        return {
          statusLabel: "Cell Paused",
          summary: `Collected ${h2VolumeMl.toFixed(1)} mL H₂ and ${o2VolumeMl.toFixed(1)} mL O₂ (exact 2:1 molar volume ratio).`,
          nextStep: "Turn DC power ON to resume water splitting at the electrodes.",
        };
      }
      return {
        statusLabel: h2VolumeMl >= 16 ? "Target Collected" : "Evolving Gas",
        summary: `At ${voltageV.toFixed(0)} V DC, water splits into ${h2VolumeMl.toFixed(1)} mL H₂ at the cathode and ${o2VolumeMl.toFixed(1)} mL O₂ at the anode.`,
        nextStep:
          h2VolumeMl >= 16
            ? "Notice H₂ remains double O₂ at every voltage; reset tubes anytime to re-measure."
            : "Keep power active (raise voltage for faster bubbles) until H₂ reaches 16.0 mL.",
      };
    },
  },

  photosynthesis: {
    id: "photosynthesis",
    governingPrinciple: "Limiting Factors in Photochemical Oxygen Evolution",
    formula: "6CO₂ + 6H₂O —(light)→ C₆H₁₂O₆ + 6O₂",
    variables: [
      { symbol: "I_light", meaning: "Incident lamp irradiance (%)" },
      { symbol: "[CO₂]", meaning: "Dissolved carbon dioxide concentration (g/L)" },
      { symbol: "Rate", meaning: "Photosynthetic O₂ bubbles evolved per minute" },
    ],
    whyItHappens:
      "Chlorophyll inside aquatic Elodea leaves absorbs light energy to split water and fix dissolved CO₂ into glucose, releasing O₂ bubbles. When one factor is scarce, it caps the overall reaction rate regardless of how high the other is raised (Law of Limiting Factors).",
    observationGuide: [
      "Ensure the growth lamp is ON so light-dependent reactions can begin.",
      "Raise Light Intensity while keeping CO₂ low to observe saturation plateauing.",
      "Increase both Light Intensity (≥ 80%) and Dissolved CO₂ (≥ 1.2 g/L) to reach ≥ 32 O₂ bubbles/min.",
    ],
    realWorldApplication:
      "Guides greenhouse CO₂ enrichment, vertical farming LED spectra, and algal biofuel/carbon-capture bioreactors.",
    interpretLiveState: (state) => {
      const { lampOn, lightIntensityPct, co2LevelGl, bubblesPerMin } =
        state.photosynthesis;
      if (!lampOn) {
        return {
          statusLabel: "Dark Phase",
          summary: "With the lamp off, light-dependent water photolysis halts and O₂ output drops to 0 bubbles/min.",
          nextStep: "Switch the growth lamp ON to supply photons to chlorophyll.",
        };
      }
      const limiting =
        lightIntensityPct / 100 < co2LevelGl / 2.0 ? "Light intensity" : "Dissolved CO₂";
      return {
        statusLabel: bubblesPerMin >= 32 ? "Peak Assimilation" : "Rate Limited",
        summary: `Current rate is ${bubblesPerMin} O₂ bubbles/min (Light ${lightIntensityPct}%, CO₂ ${co2LevelGl.toFixed(1)} g/L). ${limiting} is currently the stronger limiting factor.`,
        nextStep:
          bubblesPerMin >= 32
            ? "Observe how lowering either variable immediately throttles O₂ bubble output."
            : "Raise both Light Intensity and CO₂ levels to push output past 32 bubbles/min.",
      };
    },
  },

  microscope: {
    id: "microscope",
    governingPrinciple: "Compound Optical Magnification & Focal Plane Convergence",
    formula: "M_total = M_eyepiece × M_objective",
    variables: [
      { symbol: "M_obj", meaning: "Selected objective turret lens (4x, 10x, or 40x)" },
      { symbol: "Focus", meaning: "Stage focal plane alignment (sharpest at 50 / 100)" },
      { symbol: "Blur", meaning: "Circle of confusion proportional to |Focus − 50|" },
    ],
    whyItHappens:
      "Light from the sub-stage illuminator passes through the translucent specimen, is magnified by the objective lens to form an intermediate image, and is enlarged again by the eyepiece. Adjusting the stage focus brings the specimen exactly onto the objective's focal plane.",
    observationGuide: [
      "Turn on the sub-stage illuminator and compare Onion, Stomata, and Cheek cell slides.",
      "Switch from 4x scanning to 40x high-power magnification to inspect cell nuclei and guard cells.",
      "Dial Fine Focus smoothly toward 50 / 100 until optical blur disappears.",
    ],
    realWorldApplication:
      "Essential in clinical pathology (blood smears), microbiology diagnostics, and plant cytology research.",
    interpretLiveState: (state) => {
      const { illuminatorOn, magnification, focusValue, specimen } =
        state.microscope;
      const specimenName =
        specimen === "onion"
          ? "Onion Epidermal Cells (cell walls & nuclei)"
          : specimen === "stomata"
            ? "Leaf Stomata (guard cells & pore)"
            : "Human Cheek Cells (flexible membrane & nucleus)";
      if (!illuminatorOn) {
        return {
          statusLabel: "Unlit Field",
          summary: `Sub-stage lamp is off; ${specimenName} cannot transmit light through the ${magnification}x objective.`,
          nextStep: "Turn the stage illuminator ON to view the specimen.",
        };
      }
      const focusError = Math.abs(focusValue - 50);
      const sharp = focusError <= 4;
      return {
        statusLabel: sharp ? "Crisp Focal Plane" : "Out of Focus",
        summary: `Viewing ${specimenName} at ${magnification}x objective. Focus is ${focusValue}/100 (${sharp ? "razor sharp" : focusValue < 50 ? "stage too low" : "stage too high"}).`,
        nextStep:
          magnification === 40 && sharp
            ? "Switch between Onion, Stomata, and Cheek slides to compare plant vs. animal cell structures."
            : "Select the 40x objective lens and dial Fine Focus toward 50.",
      };
    },
  },

  projectile: {
    id: "projectile",
    governingPrinciple: "2D Parabolic Kinematics Under Constant Gravity",
    formula: "R = (v₀² · sin 2θ) / g",
    variables: [
      { symbol: "v₀", meaning: "Initial launch speed (m/s)" },
      { symbol: "θ", meaning: "Launch elevation angle (°)" },
      { symbol: "R", meaning: "Horizontal landing range (m)" },
    ],
    whyItHappens:
      "Horizontal velocity (v₀ cos θ) stays constant in the absence of air drag, while vertical velocity (v₀ sin θ) decelerates at g = 9.81 m/s² until reaching peak height and falling back down—tracing a symmetric quadratic parabola.",
    observationGuide: [
      "Adjust Launch Angle (θ) and Launch Speed (v₀) to preview the dashed parabolic trajectory.",
      "Notice that complementary angles (like 30° and 60°) yield identical horizontal ranges at the same speed.",
      "Fire the projectile so it lands inside the 2.00 m (±0.15 m) target ring.",
    ],
    realWorldApplication:
      "Applies to sports ballistics, water-jet fountain design, firefighting streams, and orbital insertion trajectories.",
    interpretLiveState: (state) => {
      const { angleDeg, speedMs, rangeM, lastLandedRangeM } = state.projectile;
      const hitTarget =
        lastLandedRangeM !== null && Math.abs(lastLandedRangeM - 2.0) <= 0.15;
      if (hitTarget) {
        return {
          statusLabel: "Direct Hit",
          summary: `Last shot landed at ${lastLandedRangeM!.toFixed(2)} m inside the 2.00 m target ring (θ = ${angleDeg}°, v₀ = ${speedMs.toFixed(1)} m/s).`,
          nextStep: "Try finding a second complementary angle (e.g., 30° vs 60°) that reaches the same range.",
        };
      }
      return {
        statusLabel: "Aiming",
        summary: `Predicted range R = ${rangeM.toFixed(2)} m at θ = ${angleDeg}°, v₀ = ${speedMs.toFixed(1)} m/s${lastLandedRangeM !== null ? ` (last landed ${lastLandedRangeM.toFixed(2)} m)` : ""}.`,
        nextStep:
          Math.abs(rangeM - 2.0) <= 0.15
            ? "Predicted trajectory aligns with 2.00 m—press Fire Projectile to confirm!"
            : rangeM < 2.0
              ? "Increase Launch Speed or move θ closer to 45° to extend range toward 2.00 m."
              : "Reduce Launch Speed or shift θ away from 45° to shorten range toward 2.00 m.",
      };
    },
  },

  boyles: {
    id: "boyles",
    governingPrinciple: "Boyle's Isothermal Ideal Gas Law",
    formula: "P₁V₁ = P₂V₂ = k  (at constant T)",
    variables: [
      { symbol: "P", meaning: "Absolute gas pressure inside cylinder (kPa)" },
      { symbol: "V", meaning: "Confined gas volume below piston (mL)" },
      { symbol: "k", meaning: "Isothermal constant (4,000 kPa·mL)" },
    ],
    whyItHappens:
      "At constant temperature, gas molecules keep the same average kinetic speed. Squeezing them into half the volume doubles how frequently they collide with each square centimeter of the piston walls—doubling pressure.",
    observationGuide: [
      "Observe gas particles rebounding inside the 40 mL starting chamber at 100 kPa.",
      "Compress the piston down to 20.0 mL and watch particle collision speed & pressure gauge climb.",
      "Verify that P × V stays locked at 4,000 kPa·mL across every volume setting.",
    ],
    realWorldApplication:
      "Explains human lung diaphragm breathing, scuba diving pressure shifts, pneumatic brakes, and medical syringes.",
    interpretLiveState: (state) => {
      const { volumeMl, pressureKpa } = state.boyles;
      const compressed = volumeMl <= 20 && pressureKpa >= 200;
      return {
        statusLabel: compressed ? "2× Compressed" : "Isothermal",
        summary: `At V = ${volumeMl.toFixed(1)} mL, gas pressure is ${pressureKpa.toFixed(1)} kPa (P × V = ${Math.round(pressureKpa * volumeMl)} kPa·mL).`,
        nextStep: compressed
          ? "Halving volume from 40 mL to 20 mL doubled pressure to 200 kPa. Drag to 10 mL to see 400 kPa!"
          : "Compress the piston down to ≤ 20.0 mL so pressure doubles to ≥ 200 kPa.",
      };
    },
  },

  wave: {
    id: "wave",
    governingPrinciple: "Standing Wave Harmonics on a Tensioned String",
    formula: "fₙ = n · f₁   ·   v = √(T / μ)",
    variables: [
      { symbol: "f", meaning: "Oscillator driving frequency (Hz)" },
      { symbol: "T", meaning: "String tension force (N)" },
      { symbol: "n", meaning: "Harmonic mode / number of vibrating half-wave loops" },
    ],
    whyItHappens:
      "Waves sent by the oscillator reflect off the fixed clamp and interfere with incoming waves. Whenever frequency hits an integer multiple of the fundamental mode f₁ = 4√T, stationary nodes (zero motion) and antinodes (peak amplitude) lock into resonance.",
    observationGuide: [
      "Keep the oscillator running and inspect how fixed endpoints force nodes at both ends.",
      "Set Tension (T) to 25 N (fundamental f₁ = 20 Hz) or 16 N (f₁ = 16 Hz).",
      "Tune Frequency until harmonic ratio n reaches 3.00 to form three clean standing-wave loops.",
    ],
    realWorldApplication:
      "Governs guitar and violin string tuning, architectural bridge wind resonance, and laser optical cavities.",
    interpretLiveState: (state) => {
      const { running, frequencyHz, tensionN, harmonicNumber } = state.wave;
      if (!running) {
        return {
          statusLabel: "Oscillator Stopped",
          summary: `Wave driver paused at f = ${frequencyHz} Hz and T = ${tensionN} N (n = ${harmonicNumber.toFixed(2)}).`,
          nextStep: "Start the wave oscillator to observe standing nodes and antinodes.",
        };
      }
      const near3rd = Math.abs(harmonicNumber - 3.0) <= 0.12;
      return {
        statusLabel: near3rd ? "3rd Harmonic Lock" : "Driving String",
        summary: `At f = ${frequencyHz} Hz and T = ${tensionN} N, the string vibrates at harmonic ratio n = ${harmonicNumber.toFixed(2)}.`,
        nextStep: near3rd
          ? "Notice 3 glowing antinode loops separated by 2 stationary internal nodes!"
          : "Adjust Frequency (e.g., 60 Hz at T = 25 N) until n aligns near 3.00.",
      };
    },
  },

  dna: {
    id: "dna",
    governingPrinciple: "Chargaff's Base-Pairing & Antiparallel Double Helix",
    formula: "A ↔ T (2 H-bonds)   ·   G ↔ C (3 H-bonds)",
    variables: [
      { symbol: "A / G", meaning: "Purines: Adenine & Guanine (two-ring bases)" },
      { symbol: "T / C", meaning: "Pyrimidines: Thymine & Cytosine (single-ring bases)" },
      { symbol: "5' → 3'", meaning: "Antiparallel sugar-phosphate backbone direction" },
    ],
    whyItHappens:
      "A purine always pairs with its specific pyrimidine across the helix so the sugar-phosphate diameter stays constant (~2 nm) and complementary hydrogen bonds lock cleanly—allowing exact semi-conservative DNA replication.",
    observationGuide: [
      "Read each template nucleotide along the 5' → 3' strand (A, T, G, C, A, G).",
      "Click each complementary slot to cycle A / T / C / G until every rung satisfies A↔T or G↔C.",
      "Observe the helix turn smoothly once all 6 hydrogen-bonded rungs are matched.",
    ],
    realWorldApplication:
      "Underpins PCR diagnostics, CRISPR gene editing, forensic DNA profiling, and mRNA vaccine engineering.",
    interpretLiveState: (state) => {
      const matches = evaluateDnaMatches(
        DNA_TEMPLATE_STRAND,
        state.dna.pairedStrand,
      );
      if (matches === DNA_TEMPLATE_STRAND.length) {
        return {
          statusLabel: "Helix Validated",
          summary: "All 6/6 complementary base pairs satisfy Chargaff's rules (A=T, G≡C) with uniform helix width.",
          nextStep: "Watch the antiparallel backbones spin smoothly—click any base to test mismatch effects.",
        };
      }
      return {
        statusLabel: "Pairing Strand",
        summary: `${matches} of ${DNA_TEMPLATE_STRAND.length} base rungs are correctly matched along the 5' → 3' template.`,
        nextStep: "Click mismatched slots to pair Adenine (A) ↔ Thymine (T) and Guanine (G) ↔ Cytosine (C).",
      };
    },
  },

  lens: {
    id: "lens",
    governingPrinciple: "Thin Convex Lens Equation & Optical Magnification",
    formula: "1/f = 1/v − 1/u , m = v / u",
    variables: [
      { symbol: "f", meaning: "Focal length of the convex lens (cm)" },
      { symbol: "u", meaning: "Object distance from optical center (cm, negative)" },
      { symbol: "v", meaning: "Image distance on screen (cm)" },
    ],
    whyItHappens:
      "A convex lens converges parallel light rays to its principal focus F. Depending on where the object sits relative to F and 2F, rays intersect on the far side to form a real inverted image—or appear to diverge from a magnified virtual image.",
    observationGuide: [
      "Keep the illuminated object lamp ON and slide Object Distance u toward 2f.",
      "Watch the screen glide to v = +2f as the inverted image becomes the exact same size (|m| = 1.00).",
      "Move the object closer than f to see why real image rays stop converging onto the screen.",
    ],
    realWorldApplication:
      "Governs camera lenses, classroom projectors, magnifying glasses, and corrective spectacles for hypermetropia.",
    interpretLiveState: (state) => {
      const img = calculateLensImage(
        state.lens.objectDistanceCm,
        state.lens.focalLengthCm,
      );
      if (!state.lens.lampOn) {
        return {
          statusLabel: "Lamp Off",
          summary: "The illuminated object source is off.",
          nextStep: "Turn the lamp ON and move u to twice the focal length (2F).",
        };
      }
      if (img.nature === "real-inverted" && img.vCm !== null && img.magnification !== null) {
        const at2F = Math.abs(Math.abs(img.magnification) - 1.0) <= 0.08;
        return {
          statusLabel: at2F ? "2F Equal Image" : "Real Image",
          summary: `u = ${img.uCm} cm, f = ${state.lens.focalLengthCm} cm gives a real inverted image at v = +${img.vCm} cm (m = ${img.magnification}).`,
          nextStep: at2F
            ? "Equal-size real image at 2F verified! Try moving closer toward F to magnify it."
            : `Slide Object Distance toward ${(state.lens.focalLengthCm * 2).toFixed(0)} cm (2F) so |m| reaches 1.00.`,
        };
      }
      return {
        statusLabel: img.nature === "infinity" ? "At Focus F" : "Virtual Image",
        summary: `At u = ${img.uCm} cm with f = ${state.lens.focalLengthCm} cm, rays do not form a real image on the screen.`,
        nextStep: `Increase Object Distance beyond ${state.lens.focalLengthCm} cm to project a real inverted image.`,
      };
    },
  },

  electromagnet: {
    id: "electromagnet",
    governingPrinciple: "Magnetic Field Inside a Current-Carrying Solenoid",
    formula: "B = μᵣ · μ₀ · (N / L) · I",
    variables: [
      { symbol: "B", meaning: "Magnetic flux density inside the solenoid (mT)" },
      { symbol: "N", meaning: "Number of copper coil turns" },
      { symbol: "I", meaning: "Electric current flowing through the coil (A)" },
    ],
    whyItHappens:
      "Every loop of current produces a circular magnetic field that adds constructively down the solenoid axis. Sliding a soft-iron core inside aligns its magnetic domains, dramatically multiplying field strength and deflecting the nearby compass needle.",
    observationGuide: [
      "Switch power ON and raise Current (I) and Coil Turns (N) while watching the compass needle deflect.",
      "Insert the Soft-Iron Core to amplify the magnetic flux density fourfold.",
      "Tune I and N with the core inserted to push magnetic flux past 12.0 mT.",
    ],
    realWorldApplication:
      "Powers electric bells, MRI superconducting coils, scrapyard cranes, relays, and speakers.",
    interpretLiveState: (state) => {
      const bMt = calculateSolenoidFieldMt(
        state.electromagnet.powerOn,
        state.electromagnet.currentA,
        state.electromagnet.coilTurns,
        state.electromagnet.ironCoreInserted,
      );
      if (!state.electromagnet.powerOn) {
        return {
          statusLabel: "Power Off",
          summary: "Current is off so the solenoid produces 0.00 mT.",
          nextStep: "Turn Power ON and insert the soft-iron core to energize the electromagnet.",
        };
      }
      const strong = state.electromagnet.ironCoreInserted && bMt >= 12;
      return {
        statusLabel: strong ? "High Flux" : "Energized",
        summary: `B = ${bMt.toFixed(2)} mT at I = ${state.electromagnet.currentA.toFixed(1)} A, N = ${state.electromagnet.coilTurns} turns (${state.electromagnet.ironCoreInserted ? "iron core inserted" : "air core"}).`,
        nextStep: strong
          ? "Strong 12+ mT solenoid field achieved!"
          : "Insert the soft-iron core and raise Current & Turns until B reaches at least 12.0 mT.",
      };
    },
  },

  resistors: {
    id: "resistors",
    governingPrinciple: "Series vs Parallel Combination of Resistors",
    formula: "Series: R = R₁ + R₂ · Parallel: 1/R = 1/R₁ + 1/R₂",
    variables: [
      { symbol: "R₁, R₂", meaning: "Individual branch resistances (Ω)" },
      { symbol: "R", meaning: "Equivalent total circuit resistance (Ω)" },
      { symbol: "I", meaning: "Total current drawn from 12 V supply (A)" },
    ],
    whyItHappens:
      "In series, electrons must pass through both resistors sequentially so resistances add up. In parallel, current splits across two paths, reducing equivalent resistance below even the smallest resistor and brightening the bulb.",
    observationGuide: [
      "Compare the bulb brightness and electron speed in Series versus Parallel mode.",
      "Switch to Parallel mode and note how R_eq drops below both R₁ and R₂.",
      "Lower R₁ and R₂ in parallel so R_eq ≤ 2.50 Ω.",
    ],
    realWorldApplication:
      "Home electrical appliances are wired in parallel so every socket gets full mains voltage and operates independently.",
    interpretLiveState: (state) => {
      const net = calculateResistorsNetwork(
        state.resistors.mode,
        state.resistors.r1Ohm,
        state.resistors.r2Ohm,
        state.resistors.voltageV,
      );
      const goalMet = state.resistors.mode === "parallel" && net.equivalentOhm <= 2.5;
      return {
        statusLabel: goalMet ? "Low-R Parallel" : state.resistors.mode === "parallel" ? "Parallel" : "Series",
        summary: `${state.resistors.mode === "parallel" ? "Parallel" : "Series"} combination of ${state.resistors.r1Ohm} Ω and ${state.resistors.r2Ohm} Ω yields R_eq = ${net.equivalentOhm.toFixed(2)} Ω and I = ${net.totalCurrentA.toFixed(2)} A.`,
        nextStep: goalMet
          ? "Parallel network verified! Notice how current surges when paths run side by side."
          : "Switch to Parallel mode and lower R₁ and R₂ until equivalent resistance is 2.50 Ω or below.",
      };
    },
  },

  displacement: {
    id: "displacement",
    governingPrinciple: "Single Displacement & Metal Reactivity Series",
    formula: "Fe(s) + CuSO₄(aq) → FeSO₄(aq) + Cu(s)",
    variables: [
      { symbol: "Fe", meaning: "More reactive iron strip displacing copper" },
      { symbol: "CuSO₄", meaning: "Blue aqueous copper(II) sulfate solution" },
      { symbol: "FeSO₄", meaning: "Pale green aqueous iron(II) sulfate formed" },
    ],
    whyItHappens:
      "Iron sits above copper in the reactivity series, so iron atoms donate electrons to Cu²⁺ ions in solution—turning blue CuSO₄ pale green FeSO₄ while depositing reddish-brown metallic copper onto the strip. Silver is less reactive than copper and shows no reaction.",
    observationGuide: [
      "Select Iron (Fe) and click Immerse Strip to dip it into blue CuSO₄.",
      "Watch the solution fade toward pale green while reddish-brown copper coats the strip.",
      "Compare with Silver (Ag) to verify that less-reactive metals cannot displace copper.",
    ],
    realWorldApplication:
      "Used in hydrometallurgical copper extraction, electroplating pretreatment, and thermite rail welding.",
    interpretLiveState: (state) => {
      const { metal, immersed, progressPct } = state.displacement;
      if (metal === "Ag") {
        return {
          statusLabel: "No Reaction",
          summary: "Silver (Ag) is below copper in the reactivity series, so blue CuSO₄ remains unchanged.",
          nextStep: "Switch the strip to Iron (Fe) and immerse it to observe real displacement.",
        };
      }
      if (!immersed) {
        return {
          statusLabel: "Ready",
          summary: `${metal} strip is suspended above blue CuSO₄ (${Math.round(progressPct)}% reacted).`,
          nextStep: "Click Immerse Strip to start the single displacement reaction.",
        };
      }
      const done = metal === "Fe" && progressPct >= 85;
      return {
        statusLabel: done ? "Displaced" : "Reacting",
        summary: `${metal} is displacing Cu²⁺ ions (${Math.round(progressPct)}% complete) with reddish-brown copper plating on the strip.`,
        nextStep: done
          ? "Iron displacement complete! Try testing Silver (Ag) to compare reactivity."
          : "Let the iron strip react until displacement passes 85%.",
      };
    },
  },

  carbon: {
    id: "carbon",
    governingPrinciple: "Catenation & Homologous Alkane Series",
    formula: "CₙH₂ₙ₊₂ (Saturated Hydrocarbons)",
    variables: [
      { symbol: "n", meaning: "Number of carbon atoms in the backbone chain" },
      { symbol: "2n+2", meaning: "Number of single-bonded hydrogen atoms" },
      { symbol: "109.5°", meaning: "Tetrahedral covalent bond angle around carbon" },
    ],
    whyItHappens:
      "Carbon is tetravalent (4 valence electrons) and forms strong single covalent C–C chains via catenation. Each successive alkane member differs by one –CH₂– unit and 14 u of molecular mass.",
    observationGuide: [
      "Step carbon count n from 1 (Methane) up to 4 (Butane) and verify the 2n+2 hydrogen count.",
      "Inspect the 3D zig-zag tetrahedral geometry around every charcoal carbon atom.",
      "Select n = 3 (Propane, C₃H₈) with rotation ON to complete the build.",
    ],
    realWorldApplication:
      "Methane (CNG), propane and butane (LPG cooking fuel) form clean-burning domestic and industrial fuels.",
    interpretLiveState: (state) => {
      const alk = calculateCarbonAlkane(state.carbon.carbons);
      const isPropane = state.carbon.carbons === 3 && state.carbon.rotating;
      return {
        statusLabel: alk.formula,
        summary: `${alk.name} (${alk.formula}) has ${state.carbon.carbons} carbon atoms, ${alk.hydrogens} hydrogens, and molar mass ${alk.molarMass} g/mol.`,
        nextStep: isPropane
          ? "Propane C₃H₈ verified! Notice each carbon forms exactly four covalent bonds."
          : "Select n = 3 (Propane) with rotation enabled to inspect its 3-carbon tetrahedral chain.",
      };
    },
  },

  reflex: {
    id: "reflex",
    governingPrinciple: "Spinal Reflex Arc & Myelinated Nerve Conduction",
    formula: "t = d / v (Reflex Latency)",
    variables: [
      { symbol: "t", meaning: "Total reflex latency from stimulus to muscle twitch (ms)" },
      { symbol: "d", meaning: "Total sensory + motor axon arc distance (~1.6 m)" },
      { symbol: "v", meaning: "Action-potential conduction velocity (m/s)" },
    ],
    whyItHappens:
      "When a heat receptor detects danger, sensory neurons fire directly to the spinal cord's relay interneuron, which immediately commands motor neurons to contract the muscle—protecting the body milliseconds before the conscious brain reacts.",
    observationGuide: [
      "Click Trigger Stimulus and follow the golden action potential from heat pad to spinal cord to muscle.",
      "Raise Nerve Speed toward 80–100 m/s to model myelinated saltatory conduction.",
      "Trigger again at ≥ 80 m/s to record a reflex latency under 20 ms.",
    ],
    realWorldApplication:
      "Explains automatic withdrawal from hot objects, knee-jerk clinical neurological exams, and pupil light reflexes.",
    interpretLiveState: (state) => {
      const tMs = calculateReflexTimeMs(state.reflex.conductionSpeedMs);
      const fast = state.reflex.lastReactionMs !== null && state.reflex.lastReactionMs <= 20;
      return {
        statusLabel: fast ? "Fast Reflex" : `${tMs.toFixed(1)} ms`,
        summary: `At v = ${state.reflex.conductionSpeedMs} m/s across the 1.6 m spinal arc, theoretical reflex time is ${tMs.toFixed(1)} ms.`,
        nextStep: fast
          ? "Fast myelinated reflex under 20 ms completed!"
          : "Slide Nerve Conduction Speed to at least 80 m/s and click Trigger Stimulus.",
      };
    },
  },

  mendel: {
    id: "mendel",
    governingPrinciple: "Mendel's Law of Dominance & Segregation (Monohybrid Cross)",
    formula: "Tt × Tt → 1 TT : 2 Tt : 1 tt (3 Tall : 1 Dwarf)",
    variables: [
      { symbol: "T", meaning: "Dominant allele for Tall pea stem" },
      { symbol: "t", meaning: "Recessive allele for Dwarf pea stem" },
      { symbol: "F₂", meaning: "Second filial generation offspring tray" },
    ],
    whyItHappens:
      "Each parent passes one randomly segregated allele to each gamete. Because T is dominant over t, both TT and Tt offspring grow tall, while only homozygous recessive tt produces a dwarf pea plant—revealing the hidden recessive trait in F₂.",
    observationGuide: [
      "Choose genotypes for Parent 1 and Parent 2 (TT, Tt, or tt).",
      "Click Grow F₂ Plants to sprout the 4 Punnett-square pea pots in 3D.",
      "Cross Tt × Tt to observe 3 tall plants and 1 dwarf plant (3:1 phenotypic ratio).",
    ],
    realWorldApplication:
      "Forms the foundation of crop breeding, genetic counseling, and inherited trait prediction.",
    interpretLiveState: (state) => {
      const res = calculateMendelOffspring(state.mendel.parent1, state.mendel.parent2);
      const goalMet =
        state.mendel.grown &&
        state.mendel.parent1 === "Tt" &&
        state.mendel.parent2 === "Tt";
      return {
        statusLabel: state.mendel.grown
          ? `${res.tallCount} Tall : ${res.dwarfCount} Dwarf`
          : "Seeds Ready",
        summary: `Cross ${state.mendel.parent1} × ${state.mendel.parent2} yields [${res.offspring.join(", ")}] (${res.tallCount} Tall, ${res.dwarfCount} Dwarf).`,
        nextStep: goalMet
          ? "Classic 3:1 Mendelian F₂ ratio verified!"
          : "Set both Parent 1 and Parent 2 to Tt, then click Grow F₂ Plants.",
      };
    },
  },

  doubleslit: {
    id: "doubleslit",
    governingPrinciple: "Wave Superposition & Young's Double-Slit Interference",
    formula: "β = λD / d · I(y) = I₀ cos²(πdy / λD)",
    variables: [
      { symbol: "λ", meaning: "Monochromatic laser wavelength (nm)" },
      { symbol: "d", meaning: "Center-to-center slit separation (mm)" },
      { symbol: "D", meaning: "Distance from double slit to screen (m)" },
      { symbol: "β", meaning: "Fringe width between consecutive bright maxima (mm)" },
    ],
    whyItHappens:
      "Coherent light passing through two narrow slits diffracts into overlapping cylindrical waves. Where path difference equals nλ, waves interfere constructively to form bright fringes; where it equals (n + ½)λ, they cancel into dark bands.",
    observationGuide: [
      "Change wavelength from violet (400 nm) to red (680 nm) and watch the fringes spread wider.",
      "Narrow the slit separation d to see fringe spacing β grow inversely.",
      "Tune λ, d, and D to lock fringe width β between 1.15 mm and 1.35 mm.",
    ],
    realWorldApplication:
      "Drives optical interferometers like LIGO gravitational-wave detectors, holography, and anti-reflective lens coatings.",
    interpretLiveState: (state) => {
      const m = calculateDoubleSlitMetrics(
        state.doubleslit.wavelengthNm,
        state.doubleslit.slitSeparationMm,
        state.doubleslit.screenDistanceM,
      );
      const hit = state.doubleslit.laserOn && m.fringeWidthMm >= 1.15 && m.fringeWidthMm <= 1.35;
      return {
        statusLabel: state.doubleslit.laserOn ? `β = ${m.fringeWidthMm.toFixed(2)} mm` : "Laser Off",
        summary: `At λ = ${state.doubleslit.wavelengthNm} nm, d = ${state.doubleslit.slitSeparationMm.toFixed(2)} mm, D = ${state.doubleslit.screenDistanceM.toFixed(2)} m, fringe spacing β = ${m.fringeWidthMm.toFixed(2)} mm.`,
        nextStep: hit
          ? "Target interference fringe spacing locked in!"
          : "Keep Laser ON and tune λ, d, or D until β lands between 1.15 and 1.35 mm.",
      };
    },
  },

  photoelectric: {
    id: "photoelectric",
    governingPrinciple: "Einstein's Photoelectric Equation & Energy Quantization",
    formula: "K_max = hc/λ − φ₀ = eV₀",
    variables: [
      { symbol: "hν", meaning: "Incident photon energy = 1240 / λ(nm) in eV" },
      { symbol: "φ₀", meaning: "Metal work function threshold (eV)" },
      { symbol: "V₀", meaning: "Stopping potential required to halt the fastest electrons (V)" },
    ],
    whyItHappens:
      "Light arrives in discrete packets (photons). Only photons with energy above the metal's work function φ₀ can eject electrons; raising intensity increases electron count (current), whereas only shorter wavelength raises their maximum kinetic energy and stopping potential.",
    observationGuide: [
      "Switch between Cesium (2.14 eV), Sodium (2.75 eV), and Zinc (4.30 eV) to compare thresholds.",
      "Shorten wavelength below the threshold to watch blue photoelectrons stream across the vacuum tube.",
      "Apply negative Collector Voltage to find the exact Stopping Potential where electrons turn around.",
    ],
    realWorldApplication:
      "Powers solar photovoltaic panels, digital camera CMOS sensors, night-vision tubes, and automatic streetlights.",
    interpretLiveState: (state) => {
      const pe = calculatePhotoelectricMetrics(
        state.photoelectric.metal,
        state.photoelectric.wavelengthNm,
        state.photoelectric.intensityPct,
        state.photoelectric.collectorVoltageV,
      );
      const goal = state.photoelectric.metal === "Na" && pe.kMaxEv >= 0.8 && pe.photocurrentUa === 0;
      return {
        statusLabel: pe.emitting ? `I = ${pe.photocurrentUa} μA` : "Below Threshold",
        summary: `Photon E = ${pe.photonEnergyEv} eV vs φ₀(${state.photoelectric.metal}) = ${pe.workFunctionEv} eV → K_max = ${pe.kMaxEv} eV, V₀ = ${pe.stoppingPotentialV} V, Current = ${pe.photocurrentUa} μA.`,
        nextStep: goal
          ? "Stopping potential cutoff verified on Sodium!"
          : "Pick Sodium (Na), lower λ so K_max ≥ 0.8 eV, and dial Collector Voltage negative until I = 0.0 μA.",
      };
    },
  },

  haber: {
    id: "haber",
    governingPrinciple: "Le Chatelier's Principle & Industrial Reaction Kinetics",
    formula: "N₂(g) + 3H₂(g) ⇌ 2NH₃(g),  ΔH = −92.4 kJ/mol",
    variables: [
      { symbol: "P", meaning: "Reactor pressure (atm) — shifts 4 mol gas toward 2 mol NH₃" },
      { symbol: "T", meaning: "Reactor temperature (°C) — trades exothermic yield for faster kinetics" },
      { symbol: "Fe", meaning: "Porous Iron catalyst — accelerates rate without changing equilibrium" },
    ],
    whyItHappens:
      "Because ammonia synthesis is exothermic and reduces gas moles from 4 to 2, high pressure increases yield while high temperature pushes equilibrium backward. Industrial plants use an Iron catalyst with a compromise temperature (~450 °C) and high pressure (~250 atm).",
    observationGuide: [
      "Toggle the Iron Catalyst bed ON and watch molecule velocity jump without lowering yield.",
      "Raise Pressure above 220 atm to shift green NH₃ molecules upward.",
      "Balance Temperature (~430–470 °C) to achieve Yield ≥ 45% AND Rate ≥ 65% simultaneously.",
    ],
    realWorldApplication:
      "The Haber–Bosch process produces ammonia fertilizers that sustain nearly half of the world's agricultural food supply.",
    interpretLiveState: (state) => {
      const m = calculateHaberMetrics(
        state.haber.pressureAtm,
        state.haber.temperatureC,
        state.haber.catalystOn,
      );
      const goal = state.haber.catalystOn && m.yieldPct >= 45 && m.ratePct >= 65;
      return {
        statusLabel: `Yield ${m.yieldPct}% · Rate ${m.ratePct}%`,
        summary: `At ${state.haber.pressureAtm} atm, ${state.haber.temperatureC} °C (${state.haber.catalystOn ? "Fe Catalyst ON" : "No Catalyst"}), NH₃ yield is ${m.yieldPct}% with kinetic rate ${m.ratePct}%.`,
        nextStep: goal
          ? "Optimal Haber–Bosch industrial compromise achieved!"
          : "Turn Iron Catalyst ON, raise Pressure ≥ 220 atm, and tune Temperature ~440–470 °C.",
      };
    },
  },

  galvanic: {
    id: "galvanic",
    governingPrinciple: "Daniell Galvanic Cell & Nernst Electrochemical Potential",
    formula: "E_cell = 1.10 V − (RT / 2F) ln([Zn²⁺] / [Cu²⁺])",
    variables: [
      { symbol: "E°", meaning: "Standard cell EMF = +1.10 V at 1 M, 298 K" },
      { symbol: "Q", meaning: "Reaction quotient [Zn²⁺] / [Cu²⁺]" },
      { symbol: "ΔG", meaning: "Gibbs free energy change = −nFE_cell (kJ/mol)" },
    ],
    whyItHappens:
      "Zinc oxidizes at the anode (releasing electrons to the external wire) while Cu²⁺ reduces onto the Copper cathode. The KCl salt bridge maintains electrical neutrality by migrating K⁺ and Cl⁻ ions; raising reactant [Cu²⁺] and lowering product [Zn²⁺] increases EMF above 1.10 V.",
    observationGuide: [
      "Remove the KCl Salt Bridge to observe the circuit immediately drop to 0.000 V.",
      "Re-insert the Salt Bridge and watch electrons flow from Zn → Cu while ions migrate.",
      "Raise [Cu²⁺] near 2.0 M and lower [Zn²⁺] near 0.02 M to push EMF ≥ 1.15 V.",
    ],
    realWorldApplication:
      "Underpins lithium-ion EV batteries, alkaline cells, pH meters, and corrosion protection engineering.",
    interpretLiveState: (state) => {
      const m = calculateGalvanicMetrics(
        state.galvanic.saltBridgeInserted,
        state.galvanic.cuConcM,
        state.galvanic.znConcM,
        state.galvanic.tempK,
      );
      const goal = state.galvanic.saltBridgeInserted && m.emfV >= 1.15;
      return {
        statusLabel: state.galvanic.saltBridgeInserted ? `${m.emfV.toFixed(3)} V` : "Open Circuit",
        summary: `Q = ${m.reactionQuotientQ}, T = ${state.galvanic.tempK} K → E_cell = ${m.emfV.toFixed(3)} V, ΔG = ${m.deltaGKj} kJ/mol.`,
        nextStep: goal
          ? "High-EMF Nernst concentration gradient verified!"
          : "Insert Salt Bridge, raise [Cu²⁺] high and lower [Zn²⁺] so E_cell reaches ≥ 1.15 V.",
      };
    },
  },

  neuron: {
    id: "neuron",
    governingPrinciple: "Hodgkin–Huxley All-or-None Action Potential & Synaptic Transmission",
    formula: "V_m: −70 mV (Rest) → −55 mV (Threshold) → +40 mV (Na⁺ Influx)",
    variables: [
      { symbol: "I_stim", meaning: "Injected depolarizing stimulus current (μA)" },
      { symbol: "[Na⁺]ₒ", meaning: "Extracellular sodium concentration driving depolarization peak (mM)" },
      { symbol: "Myelin", meaning: "Insulating Schwann sheath enabling 105 m/s saltatory conduction" },
    ],
    whyItHappens:
      "Once stimulus depolarizes the axon past −55 mV, voltage-gated Na⁺ channels snap open, flooding positive ions inward to +40 mV. K⁺ channels then repolarize the membrane, while the wave triggers neurotransmitter vesicle release across the synaptic cleft.",
    observationGuide: [
      "Fire with Stimulus < 50 μA to see a failed sub-threshold blip on the oscilloscope.",
      "Enable Myelin Sheath to jump conduction velocity from 6 m/s to 105 m/s.",
      "Raise Stimulus ≥ 55 μA with [Na⁺] ≥ 120 mM and Fire Spike to watch vesicles cross the synapse.",
    ],
    realWorldApplication:
      "Explains human cognition, local anesthetics (which block Na⁺ channels), and neurological diagnostics like ECG/EEG.",
    interpretLiveState: (state) => {
      const m = calculateNeuronMetrics(
        state.neuron.stimulusUa,
        state.neuron.myelinated,
        state.neuron.sodiumMm,
      );
      const goal =
        state.neuron.myelinated &&
        state.neuron.sodiumMm >= 120 &&
        state.neuron.lastPeakMv !== null &&
        state.neuron.lastPeakMv >= 35;
      return {
        statusLabel: m.fires ? `Spike +${m.peakMv} mV` : "Sub-Threshold",
        summary: `Stimulus ${state.neuron.stimulusUa} μA (${state.neuron.myelinated ? "Myelinated 105 m/s" : "Unmyelinated 6 m/s"}), [Na⁺] = ${state.neuron.sodiumMm} mM → predicted peak ${m.peakMv} mV.`,
        nextStep: goal
          ? "Full myelinated action potential & synaptic burst verified!"
          : "Enable Myelin Sheath, set Stimulus ≥ 55 μA with [Na⁺] ≥ 120 mM, and click Fire Spike.",
      };
    },
  },

  pcr: {
    id: "pcr",
    governingPrinciple: "Polymerase Chain Reaction (Thermal Cycling DNA Amplification)",
    formula: "N = N₀ · 2ⁿ  (94°C Denature → 56°C Anneal → 72°C Extend)",
    variables: [
      { symbol: "T_anneal", meaning: "Primer binding temperature (°C; optimal 54–60 °C)" },
      { symbol: "n", meaning: "Completed thermal cycles (each cycle doubles target DNA)" },
      { symbol: "Taq", meaning: "Thermostable DNA polymerase from Thermus aquaticus" },
    ],
    whyItHappens:
      "Heating to 94 °C breaks hydrogen bonds to unzip double-stranded DNA. Cooling to ~56 °C lets forward & reverse primers bind specifically, and warming to 72 °C lets heat-stable Taq polymerase synthesize two new complementary strands—doubling copies exponentially every cycle.",
    observationGuide: [
      "Watch the 3D DNA strands unzip (red 94 °C), bind primers (cyan 56 °C), and extend with Taq (green 72 °C).",
      "Tune Annealing Temp into 54–60 °C so primer specificity reaches 100%.",
      "Run or step through ≥ 10 cycles to amplify >1,024 copies and light up the UV agarose gel band.",
    ],
    realWorldApplication:
      "Used worldwide in medical diagnostics (RT-PCR), forensic DNA fingerprinting, and genetic research.",
    interpretLiveState: (state) => {
      const m = calculatePcrMetrics(
        state.pcr.annealingTempC,
        state.pcr.cycleCount,
        state.pcr.taqActive,
      );
      const goal =
        state.pcr.taqActive &&
        state.pcr.annealingTempC >= 54 &&
        state.pcr.annealingTempC <= 60 &&
        state.pcr.cycleCount >= 10;
      return {
        statusLabel: `Cycle ${state.pcr.cycleCount} · ${m.dnaCopies.toLocaleString()}×`,
        summary: `Annealing ${state.pcr.annealingTempC} °C (${m.specificityPct}% specific), Cycle ${state.pcr.cycleCount} → ${m.dnaCopies.toLocaleString()} DNA copies (${m.statusText}).`,
        nextStep: goal
          ? "Exponential PCR amplification & UV gel band confirmed!"
          : "Set Annealing Temp to 54–60 °C with Taq ON and run at least 10 cycles.",
      };
    },
  },
};

export function buildAiPromptContext(
  stationId: StationId,
  state: LabExperimentState,
): string {
  const quest = LAB_QUESTS[stationId];
  const info = EXPERIMENT_EXPLAINABILITY[stationId];
  const live = info.interpretLiveState(state);
  return `Explain the "${quest.title}" (${quest.subject}) experiment clearly for a student. Governing principle: ${info.governingPrinciple}. Formula: ${info.formula}. Current live observation in the virtual lab: ${live.summary} Explain why these numbers happen, what changes if we vary the main control, and give 1 real-life example.`;
}

export function normalizeForSpeech(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/H₂O/g, "water")
    .replace(/H₂/g, "hydrogen gas")
    .replace(/O₂/g, "oxygen gas")
    .replace(/CO₂/g, "carbon dioxide")
    .replace(/OH⁻/g, "hydroxide ions")
    .replace(/H⁺/g, "hydrogen ions")
    .replace(/C₆H₁₂O₆/g, "glucose")
    .replace(/P₁V₁\s*=\s*P₂V₂/g, "P 1 V 1 equals P 2 V 2")
    .replace(/sin²θ\s*\+\s*cos²θ\s*=\s*1/g, "sine squared theta plus cosine squared theta equals 1")
    .replace(/v₀²/g, "v naught squared")
    .replace(/v₀/g, "initial speed v naught")
    .replace(/fₙ/g, "f sub n")
    .replace(/f₁/g, "fundamental frequency f 1")
    .replace(/δm/g, "minimum deviation delta m")
    .replace(/δ/g, "delta")
    .replace(/θ/g, "theta")
    .replace(/π/g, "pi")
    .replace(/ω/g, "omega")
    .replace(/μ/g, "mu")
    .replace(/√/g, "square root of ")
    .replace(/Ω/g, " ohms")
    .replace(/°/g, " degrees")
    .replace(/↔/g, " pairs with ")
    .replace(/→/g, " yields ")
    .replace(/≥/g, "at least ")
    .replace(/≤/g, "at most ")
    .replace(/±/g, "plus or minus ")
    .replace(/·/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
}

const HUMAN_MENTOR_HOOKS: Record<StationId, string> = {
  pendulum:
    "Watch the brass pendulum swing—its timing depends on the string length, <breath> not the bob's weight or release angle.",
  optics:
    "As white light enters this glass prism, violet slows down more than red, <breath> fanning the beam into a crisp spectrum.",
  titration:
    "Base drops neutralize the acid one-to-one here, <breath> and right near twenty-five milliliters a single drop flips the pH color.",
  circuit:
    "Voltage pushes electrons around this loop while resistance slows them down, <breath> so doubling resistance cuts the current in half.",
  electrolysis:
    "Electric current is splitting water into bubbles right at the electrodes—<breath> giving you twice as much hydrogen gas as oxygen.",
  photosynthesis:
    "Chlorophyll uses light to split water and release oxygen bubbles, <breath> while low light or low carbon dioxide slows it down.",
  microscope:
    "Light passes up through the slide and two glass lenses, <breath> and tuning the fine focus brings those cell structures razor sharp.",
  projectile:
    "Once launched, sideways speed stays constant while gravity pulls the ball down, <breath> tracing a clean parabola to the target.",
  boyles:
    "Gas molecules keep bouncing inside that cylinder, <breath> so squeezing the piston to half its space doubles the pressure right away.",
  wave:
    "Waves bouncing off the clamp overlap along the string—<breath> hit a natural harmonic and glowing standing loops lock in place.",
  dna:
    "Each rung across this double helix keeps the same width <breath> because adenine always pairs with thymine and guanine with cytosine.",
  lens:
    "Watch parallel light rays bend through this convex glass lens—<breath> place the glowing arrow at twice the focal length and an equal-size inverted image snaps into focus on the screen.",
  electromagnet:
    "Current looping through these copper coils builds a magnetic field down the axis—<breath> slide in the soft-iron core and watch the magnetic flux jump fourfold and lift the steel paperclips.",
  resistors:
    "In series, current squeezes through both resistors one after another, <breath> but flip to parallel and electrons split across two paths, dropping resistance and making the bulb shine brighter.",
  displacement:
    "Iron is more reactive than copper in the reactivity series, <breath> so dipping the iron strip turns blue copper sulfate pale green while metallic copper plates right onto the surface.",
  carbon:
    "Carbon forms four strong covalent bonds and links into chains—<breath> every step from methane to butane adds one carbon and two hydrogens in a neat tetrahedral zig-zag.",
  reflex:
    "When the heat pad fires, the nerve signal zips straight through the spinal cord to twitch the muscle—<breath> faster myelinated axons complete the protective reflex in under twenty milliseconds.",
  mendel:
    "Because the tall allele dominates over dwarf, crossing two hybrid Tt pea plants <breath> brings back the hidden recessive dwarf trait in a clean three-to-one ratio.",
  doubleslit:
    "Coherent laser light splits through two microscopic slits and overlaps like ripples on water, <breath> carving bright constructive bands and dark cancellations across the screen.",
  photoelectric:
    "Each light photon packs a quantum punch inversely proportional to its wavelength—<breath> cross the metal's work function and electrons leap across the vacuum tube until the stopping voltage halts them.",
  haber:
    "In the Haber reactor, high pressure pushes nitrogen and hydrogen into ammonia, <breath> while the iron catalyst lets us run fast at moderate temperature without destroying equilibrium yield.",
  galvanic:
    "Zinc gives up electrons that race across the wire to reduce copper ions, <breath> while the potassium chloride salt bridge balances charge and the Nernst equation tunes the exact cell voltage.",
  neuron:
    "Cross the minus fifty-five millivolt threshold and sodium channels snap open in a flash—<breath> firing an all-or-none spike down the myelinated axon to burst neurotransmitters across the synapse.",
  pcr:
    "Ninety-four degrees unzips the DNA helix, fifty-six snaps primers into place, <breath> and at seventy-two degrees Taq polymerase doubles your target DNA every single thermal cycle.",
};

const KANNADA_MENTOR_SCRIPTS: Record<
  StationId,
  (state: LabExperimentState, name?: string) => string
> = {
  pendulum: (state, name) =>
    `${name ? `${name}, ` : ""}ಇದು ಸರಳ ಲೋಲಕ ಪ್ರಯೋಗ. <breath> ಲೋಲಕದ ಆವರ್ತಕಾಲವು ದಾರದ ಉದ್ದ ${state.pendulum.lengthM.toFixed(2)} ಮೀಟರ್ ಮೇಲೆ ಅವಲಂಬಿತವಾಗಿರುತ್ತದೆ, ಭಾರದ ಮೇಲೆ ಅಲ್ಲ. <breath> ಒಂದು ಮೀಟರ್ ಉದ್ದಕ್ಕೆ ಸರಿಸುಮಾರು ಎರಡು ಸೆಕೆಂಡು ಸಿಗುತ್ತದೆ ನೋಡಿ.`,
  optics: (state, name) =>
    `${name ? `${name}, ` : ""}ಇದು ಪ್ರಿಸಮ್ ಬೆಳಕಿನ ವಕ್ರೀಭವನ ಪ್ರಯೋಗ. <breath> ಬಿಳಿ ಬೆಳಕು ಗಾಜಿನ ಪ್ರಿಸಮ್ ಒಳಗೆ ಹೋದಾಗ ನೇರಳೆ ಬಣ್ಣ ಹೆಚ್ಚು ಬಾಗಿ ಏಳು ಬಣ್ಣಗಳ ವರ್ಣಪಟಲ ಮೂಡುತ್ತದೆ. <breath> ಪ್ರಿಸಮ್ ಕೋನ ${state.optics.prismAngleDeg} ಡಿಗ್ರಿ ಇದೆ.`,
  titration: (state, name) =>
    `${name ? `${name}, ` : ""}ಇದು ಆಮ್ಲ-ಕ್ಷಾರ ಟೈಟ್ರೇಶನ್ ಪ್ರಯೋಗ. <breath> ಈಗ ಪಿಎಚ್ ${state.titration.currentPh.toFixed(1)} ಇದೆ; 25 ಮಿಲಿಲೀಟರ್ ಹತ್ತಿರ ಒಂದೇ ಹನಿ ಹಾಕಿದರೂ ದ್ರಾವಣ ತಟಸ್ಥ ಪಿಎಚ್ ಏಳಕ್ಕೆ ಬರುತ್ತದೆ.`,
  circuit: (state, name) =>
    `${name ? `${name}, ` : ""}ಇದು ಓಮ್ ನಿಯಮದ ವಿದ್ಯುತ್ ಮಂಡಲ. <breath> ವೋಲ್ಟೇಜ್ ${state.circuit.voltageV.toFixed(1)} ವೋಲ್ಟ್ ಮತ್ತು ರೋಧ ${state.circuit.resistanceOhm.toFixed(1)} ಓಮ್ ಇರುವುದರಿಂದ ವಿದ್ಯುತ್ ಪ್ರವಾಹ ${state.circuit.currentA.toFixed(2)} ಆಂಪಿಯರ್ ಹರಿಯುತ್ತಿದೆ.`,
  electrolysis: (state, name) =>
    `${name ? `${name}, ` : ""}ಇದು ನೀರಿನ ವಿದ್ಯುದ್ವಿಭಜನೆ ಪ್ರಯೋಗ. <breath> ವಿದ್ಯುತ್ ಹರಿಸಿದಾಗ ನೀರು ವಿಭಜನೆಯಾಗಿ ಹೈಡ್ರೋಜನ್ ಅನಿಲ ${state.electrolysis.h2VolumeMl.toFixed(1)} ಎಂಎಲ್ ಮತ್ತು ಆಕ್ಸಿಜನ್ ಅದರ ಅರ್ಧದಷ್ಟು ಎರಡು ಅನುಪಾತ ಒಂದರಲ್ಲಿ ಸಂಗ್ರಹವಾಗುತ್ತದೆ.`,
  photosynthesis: (state, name) =>
    `${name ? `${name}, ` : ""}ಇದು ದ್ಯುತಿಸಂಶ್ಲೇಷಣೆ ಪ್ರಯೋಗ. <breath> ಎಲೋಡಿಯಾ ಸಸ್ಯ ಬೆಳಕು ಮತ್ತು ಕಾರ್ಬನ್ ಡೈಆಕ್ಸೈಡ್ ಬಳಸಿ ನಿಮಿಷಕ್ಕೆ ${state.photosynthesis.bubblesPerMin} ಆಕ್ಸಿಜನ್ ಗುಳ್ಳೆಗಳನ್ನು ಬಿಡುಗಡೆ ಮಾಡುತ್ತಿದೆ.`,
  microscope: (state, name) =>
    `${name ? `${name}, ` : ""}ಇದು ಸಂಯುಕ್ತ ಸೂಕ್ಷ್ಮದರ್ಶಕ. <breath> ಈಗ ${state.microscope.magnification} ಪಟ್ಟು ವರ್ಧನೆಯಲ್ಲಿ ಜೀವಕೋಶ ಕಾಣುತ್ತಿದೆ; ಫೋಕಸ್ ಅನ್ನು 50ರ ಹತ್ತಿರ ತಿರುಗಿಸಿದರೆ ಕೋಶಕೇಂದ್ರ ಸ್ಪಷ್ಟವಾಗಿ ಕಾಣುತ್ತದೆ.`,
  projectile: (state, name) =>
    `${name ? `${name}, ` : ""}ಇದು ಪ್ರಕ್ಷೇಪಕ ಚಲನೆ ಪ್ರಯೋಗ. <breath> ಗುರುತ್ವಾಕರ್ಷಣೆಯಿಂದ ಚೆಂಡು ಪರವಲಯ ಪಥದಲ್ಲಿ ಸಾಗಿ ${state.projectile.rangeM.toFixed(2)} ಮೀಟರ್ ದೂರ ಬೀಳುತ್ತದೆ; 45 ಡಿಗ್ರಿಯಲ್ಲಿ ಗರಿಷ್ಠ ದೂರ ಸಿಗುತ್ತದೆ.`,
  boyles: (state, name) =>
    `${name ? `${name}, ` : ""}ಇದು ಬಾಯ್ಲ್ ಅನಿಲ ನಿಯಮ. <breath> ಪಿಸ್ಟನ್ ಅನ್ನು ಒತ್ತಿ ಗಾತ್ರ ${state.boyles.volumeMl.toFixed(0)} ಎಂಎಲ್ ಮಾಡಿದರೆ ಅನಿಲದ ಅಣುಗಳ ಘರ್ಷಣೆ ಹೆಚ್ಚಾಗಿ ಒತ್ತಡ ${state.boyles.pressureKpa.toFixed(0)} ಕಿಲೋಪಾಸ್ಕಲ್ ಆಗುತ್ತದೆ.`,
  wave: (state, name) =>
    `${name ? `${name}, ` : ""}ಇದು ಸ್ಥಾಯಿ ತರಂಗ ಪ್ರಯೋಗ. <breath> ${state.wave.frequencyHz} ಹರ್ಟ್ಜ್ ಆವೃತ್ತಿಯಲ್ಲಿ ತಂತಿಯಲ್ಲಿ ಪ್ರತಿಧ್ವನಿ ಉಂಟಾಗಿ ಪೂರ್ಣ ಸಂಖ್ಯೆಯ ಹಾರ್ಮೋನಿಕ್ ಅಲೆಗಳು ಸ್ಥಿರವಾಗಿ ಕಾಣುತ್ತವೆ.`,
  dna: (_state, name) =>
    `${name ? `${name}, ` : ""}ಇದು ಡಿಎನ್ಎ ದ್ವಿ-ಸುರುಳಿ ಮಾದರಿ. <breath> ಚಾರ್ಗಾಫ್ ನಿಯಮದಂತೆ ಅಡೆನಿನ್ ಯಾವಾಗಲೂ ಥೈಮಿನ್ ಜೊತೆ ಮತ್ತು ಗ್ವಾನಿನ್ ಸೈಟೋಸಿನ್ ಜೊತೆ ಜೋಡಿಯಾಗುವುದರಿಂದ ಸುರುಳಿಯ ಅಗಲ ಸಮವಾಗಿರುತ್ತದೆ.`,
  lens: (state, name) =>
    `${name ? `${name}, ` : ""}ಇದು ಹತ್ತನೇ ತರಗತಿಯ ಪೀನ ಮಸೂರ ಪ್ರಯೋಗ. <breath> ವಸ್ತುವನ್ನು ಫೋಕಲ್ ಉದ್ದ ${state.lens.focalLengthCm} ಸೆಂಟಿಮೀಟರ್ ನ ಎರಡರಷ್ಟು ದೂರದಲ್ಲಿ ಇಟ್ಟಾಗ ಪರದೆಯ ಮೇಲೆ ಸಮಾನ ಗಾತ್ರದ ತಲೆಕೆಳಗಾದ ನೈಜ ಪ್ರತಿಬಿಂಬ ಮೂಡುತ್ತದೆ.`,
  electromagnet: (state, name) =>
    `${name ? `${name}, ` : ""}ಇದು ಸೊಲೆನಾಯ್ಡ್ ವಿದ್ಯುತ್ಕಾಂತ ಪ್ರಯೋಗ. <breath> ತಾಮ್ರದ ಸುರುಳಿಯಲ್ಲಿ ${state.electromagnet.currentA.toFixed(1)} ಆಂಪಿಯರ್ ವಿದ್ಯುತ್ ಹರಿಸಿ ಮೆದು ಕಬ್ಬಿಣದ ತಿರುಳು ಹಾಕಿದಾಗ ಕಾಂತಕ್ಷೇತ್ರ ನಾಲ್ಕು ಪಟ್ಟು ಹೆಚ್ಚಾಗಿ ದಿಕ್ಸೂಚಿ ತಿರುಗುತ್ತದೆ.`,
  resistors: (state, name) =>
    `${name ? `${name}, ` : ""}ಇದು ಸರಣಿ ಮತ್ತು ಸಮಾಂತರ ರೋಧಕಗಳ ಮಂಡಲ. <breath> ಸಮಾಂತರ ಜೋಡಣೆಯಲ್ಲಿ ವಿದ್ಯುತ್ ಎರಡು ದಾರಿಗಳಲ್ಲಿ ಹರಿದು ಒಟ್ಟು ರೋಧ ಕಡಿಮೆಯಾಗುತ್ತದೆ ಮತ್ತು ಬಲ್ಬ್ ಹೆಚ್ಚು ಪ್ರಕಾಶಮಾನವಾಗಿ ಉರಿಯುತ್ತದೆ.`,
  displacement: (state, name) =>
    `${name ? `${name}, ` : ""}ಇದು ಲೋಹದ ಸ್ಥಾನಪಲ್ಲಟ ರಾಸಾಯನಿಕ ಕ್ರಿಯೆ. <breath> ಕಬ್ಬಿಣವು ತಾಮ್ರಕ್ಕಿಂತ ಹೆಚ್ಚು ಕ್ರಿಯಾಶೀಲವಾಗಿರುವುದರಿಂದ ನೀಲಿ ಕಾಪರ್ ಸಲ್ಫೇಟ್ ದ್ರಾವಣ ತಿಳಿ ಹಸಿರು ಬಣ್ಣಕ್ಕೆ ತಿರುಗಿ ತಾಮ್ರದ ಪದರ ಸಂಗ್ರಹವಾಗುತ್ತದೆ.`,
  carbon: (state, name) =>
    `${name ? `${name}, ` : ""}ಇದು ಕಾರ್ಬನ್ ಆಲ್ಕೇನ್ ಅಣು ಮಾದರಿ. <breath> ಈಗ ${state.carbon.carbons} ಕಾರ್ಬನ್ ಪರಮಾಣುಗಳ ಸರಪಳಿ ಕಾಣುತ್ತಿದೆ; ಪ್ರತಿಯೊಂದು ಕಾರ್ಬನ್ ನಾಲ್ಕು ಸಹವೇಲೆನ್ಸಿಯ ಬಂಧಗಳನ್ನು ನಿರ್ಮಿಸುತ್ತದೆ.`,
  reflex: (state, name) =>
    `${name ? `${name}, ` : ""}ಇದು ಪರಾವರ್ತಿತ ಕ್ರಿಯೆಯ ನರಮಾರ್ಗ. <breath> ಬಿಸಿ ತಾಗಿದ ತಕ್ಷಣ ಸಂವೇದಿ ನರದಿಂದ ಬೆನ್ನುಹುರಿಗೆ ಸಂದೇಶ ಹೋಗಿ ${calculateReflexTimeMs(state.reflex.conductionSpeedMs).toFixed(0)} ಮಿಲಿಸೆಕೆಂಡ್ ಒಳಗೆ ಸ್ನಾಯು ತಕ್ಷಣ ಪ್ರತಿಕ್ರಿಯಿಸುತ್ತದೆ.`,
  mendel: (state, name) =>
    `${name ? `${name}, ` : ""}ಇದು ಮೆಂಡೆಲ್ ಏಕತಳಿ ಸಂಕರಣ ಪ್ರಯೋಗ. <breath> ಎರಡು ಮಿಶ್ರ ತಳಿ ಬಟಾಣಿ ಸಸ್ಯಗಳನ್ನು ಸಂಕರಿಸಿದಾಗ ಮೂರು ಎತ್ತರದ ಮತ್ತು ಒಂದು ಗಿಡ್ಡ ಸಸ್ಯ ಮೂರು ಅನುಪಾತ ಒಂದರಲ್ಲಿ ಬೆಳೆಯುತ್ತವೆ.`,
  doubleslit: (state, name) =>
    `${name ? `${name}, ` : ""}ಇದು ಯಂಗ್ ದ್ವಿ-ಸೀಳು ವ್ಯತಿಕರಣ ಪ್ರಯೋಗ. <breath> ${state.doubleslit.wavelengthNm} ನ್ಯಾನೋಮೀಟರ್ ಲೇಸರ್ ಬೆಳಕು ಎರಡು ಸೀಳುಗಳ ಮೂಲಕ ಹಾದುಹೋಗಿ ಪರದೆಯ ಮೇಲೆ ಪ್ರಕಾಶಮಾನ ಮತ್ತು ಕತ್ತಲೆ ಪಟ್ಟೆಗಳನ್ನು ನಿರ್ಮಿಸುತ್ತದೆ.`,
  photoelectric: (state, name) =>
    `${name ? `${name}, ` : ""}ಇದು ಐನ್‌ಸ್ಟೈನ್ ದ್ಯುತಿವಿದ್ಯುತ್ ಪರಿಣಾಮ ಪ್ರಯೋಗ. <breath> ಫೋಟಾನ್ ಶಕ್ತಿ ಲೋಹದ ಕಾರ್ಯಫಲನಕ್ಕಿಂತ ಹೆಚ್ಚಾದಾಗ ಮಾತ್ರ ಎಲೆಕ್ಟ್ರಾನ್‌ಗಳು ಹೊರಬರುತ್ತವೆ; ತಡೆ ವೋಲ್ಟೇಜ್ ಹೆಚ್ಚಿಸಿದರೆ ಅವು ನಿಲ್ಲುತ್ತವೆ.`,
  haber: (state, name) =>
    `${name ? `${name}, ` : ""}ಇದು ಹೇಬರ್ ಅಮೋನಿಯಾ ರಿಯಾಕ್ಟರ್. <breath> ಹೆಚ್ಚಿನ ಒತ್ತಡ ${state.haber.pressureAtm} ಎಟಿಎಂ ಮತ್ತು ಕಬ್ಬಿಣದ ವೇಗವರ್ಧಕ ಬಳಸಿ ಅಮೋನಿಯಾ ಉತ್ಪಾದನೆ ಮತ್ತು ವೇಗ ಎರಡನ್ನೂ ಸಮತೋಲನಗೊಳಿಸಬಹುದು.`,
  galvanic: (state, name) =>
    `${name ? `${name}, ` : ""}ಇದು ಡೇನಿಯಲ್ ಗ್ಯಾಲ್ವನಿಕ್ ಕೋಶ. <breath> ಜಿಂಕ್ ಆನೋಡ್ ನಿಂದ ಕಾಪರ್ ಕ್ಯಾಥೋಡ್ ಗೆ ಎಲೆಕ್ಟ್ರಾನ್ ಹರಿಯುತ್ತವೆ ಮತ್ತು ಲವಣ ಸೇತುವೆ ವಿದ್ಯುತ್ ಸಮತೋಲನ ಕಾಪಾಡುತ್ತದೆ.`,
  neuron: (state, name) =>
    `${name ? `${name}, ` : ""}ಇದು ನರಕೋಶದ ಆಕ್ಷನ್ ಪೊಟೆನ್ಷಿಯಲ್ ಪ್ರಯೋಗ. <breath> ಸೋಡಿಯಂ ಚಾನೆಲ್‌ಗಳು ತೆರೆದ ತಕ್ಷಣ ವಿದ್ಯುತ್ ಸಂಕೇತ ಮೈಲಿನ್ ಕವಚದ ಮೂಲಕ ವೇಗವಾಗಿ ಸಾಗಿ ಸಿನಾಪ್ಸ್ ದಾಟುತ್ತದೆ.`,
  pcr: (state, name) =>
    `${name ? `${name}, ` : ""}ಇದು ಪಿಸಿಆರ್ ಡಿಎನ್ಎ ವರ್ಧನೆ ಪ್ರಯೋಗ. <breath> 94 ಡಿಗ್ರಿಯಲ್ಲಿ ಡಿಎನ್ಎ ಬಿಚ್ಚಿ, ${state.pcr.annealingTempC} ಡಿಗ್ರಿಯಲ್ಲಿ ಪ್ರೈಮರ್ ಸೇರಿ, 72 ಡಿಗ್ರಿಯಲ್ಲಿ ಟ್ಯಾಕ್ ಪಾಲಿಮರೇಸ್ ಪ್ರತಿ ಸುತ್ತಿಗೂ ಡಿಎನ್ಎ ದ್ವಿಗುಣಗೊಳಿಸುತ್ತದೆ.`,
};

const HINDI_MENTOR_SCRIPTS: Record<
  StationId,
  (state: LabExperimentState, name?: string) => string
> = {
  pendulum: (state, name) =>
    `${name ? `${name}, ` : ""}यह सरल लोलक प्रयोग है। <breath> लोलक का आवर्तकाल केवल रस्सी की लंबाई ${state.pendulum.lengthM.toFixed(2)} मीटर पर निर्भर करता है, गोलक के वजन पर नहीं। <breath> एक मीटर लंबाई पर यह दो सेकंड में एक पूरा दोलन करता है।`,
  optics: (state, name) =>
    `${name ? `${name}, ` : ""}यह प्रिज्म प्रकाश अपवर्तन प्रयोग है। <breath> सफेद रोशनी कांच के प्रिज्म से गुजरते समय बैंगनी रंग सबसे ज्यादा मुड़ता है और सात रंगों का स्पेक्ट्रम बनता है। <breath> अभी प्रिज्म कोण ${state.optics.prismAngleDeg} डिग्री है।`,
  titration: (state, name) =>
    `${name ? `${name}, ` : ""}यह अम्ल-क्षार अनुमापन प्रयोग है। <breath> अभी पीएच ${state.titration.currentPh.toFixed(1)} है; पच्चीस मिलीलीटर के पास एक छोटी बूंद से भी घोल उदासीन पीएच सात पर पहुंच जाता है।`,
  circuit: (state, name) =>
    `${name ? `${name}, ` : ""}यह ओम के नियम का विद्युत परिपथ है। <breath> ${state.circuit.voltageV.toFixed(1)} वोल्ट और ${state.circuit.resistanceOhm.toFixed(1)} ओम प्रतिरोध पर अभी ${state.circuit.currentA.toFixed(2)} एम्पियर धारा बह रही है।`,
  electrolysis: (state, name) =>
    `${name ? `${name}, ` : ""}यह जल विद्युत-अपघटन प्रयोग है। <breath> विद्युत धारा पानी को तोड़कर दो अनुपात एक में गैस बनाती है—अभी ${state.electrolysis.h2VolumeMl.toFixed(1)} मिलीलीटर हाइड्रोजन और उसकी आधी ऑक्सीजन जमा हुई है।`,
  photosynthesis: (state, name) =>
    `${name ? `${name}, ` : ""}यह प्रकाश संश्लेषण प्रयोग है। <breath> जलीय पौधा रोशनी और कार्बन डाइऑक्साइड लेकर प्रति मिनट ${state.photosynthesis.bubblesPerMin} ऑक्सीजन के बुलबुले छोड़ रहा है।`,
  microscope: (state, name) =>
    `${name ? `${name}, ` : ""}यह संयुक्त सूक्ष्मदर्शी है। <breath> अभी ${state.microscope.magnification} गुना आवर्धन पर स्लाइड दिख रही है; फाइन फोकस को 50 के पास लाने पर कोशिकाएं बिल्कुल साफ दिखती हैं।`,
  projectile: (state, name) =>
    `${name ? `${name}, ` : ""}यह प्रक्षेप्य गति प्रयोग है। <breath> गुरुत्वाकर्षण के कारण गेंद परवलय पथ पर चलकर ${state.projectile.rangeM.toFixed(2)} मीटर दूर गिरती है; पैंतालीस डिग्री कोण पर सबसे लंबी दूरी मिलती है।`,
  boyles: (state, name) =>
    `${name ? `${name}, ` : ""}यह बॉयल का गैस नियम है। <breath> पिस्टन दबाकर आयतन ${state.boyles.volumeMl.toFixed(0)} मिलीलीटर करने पर अणुओं के टकराने से दाब बढ़कर ${state.boyles.pressureKpa.toFixed(0)} किलोपास्कल हो गया है।`,
  wave: (state, name) =>
    `${name ? `${name}, ` : ""}यह अप्रगामी तरंग प्रयोग है। <breath> ${state.wave.frequencyHz} हर्ट्ज़ आवृत्ति पर डोरी में अनुनाद होता है और चमकदार स्थायी तरंग लूप बन जाते हैं।`,
  dna: (_state, name) =>
    `${name ? `${name}, ` : ""}यह डीएनए डबल हेलिक्स मॉडल है। <breath> चारगाफ के नियम के अनुसार एडेनिन हमेशा थायमिन से और ग्वानिन साइटोसिन से जुड़ता है, जिससे हेलिक्स की चौड़ाई एक जैसी रहती है।`,
  lens: (state, name) =>
    `${name ? `${name}, ` : ""}यह दसवीं कक्षा का उत्तल लेंस प्रयोग है। <breath> वस्तु को फोकस दूरी ${state.lens.focalLengthCm} सेंटीमीटर के दोगुने पर रखने पर पर्दे पर बराबर आकार का वास्तविक और उल्टा प्रतिबिंब बनता है।`,
  electromagnet: (state, name) =>
    `${name ? `${name}, ` : ""}यह परिनालिका विद्युत चुंबक प्रयोग है। <breath> तांबे की कुंडली में ${state.electromagnet.currentA.toFixed(1)} एम्पियर धारा बहाकर नरम लोहे का क्रोड डालने पर चुंबकीय क्षेत्र चार गुना बढ़ जाता है।`,
  resistors: (state, name) =>
    `${name ? `${name}, ` : ""}यह श्रेणी और समांतर प्रतिरोधक परिपथ है। <breath> समांतर क्रम में धारा दो रास्तों में बंटती है जिससे कुल प्रतिरोध कम हो जाता है और बल्ब अधिक तेज चमकता है।`,
  displacement: (state, name) =>
    `${name ? `${name}, ` : ""}यह धातु विस्थापन अभिक्रिया है। <breath> लोहा तांबे से अधिक अभिक्रियाशील होने के कारण नीले कॉपर सल्फेट को हल्के हरे रंग में बदल देता है और पट्टी पर भूरा तांबा जम जाता है।`,
  carbon: (state, name) =>
    `${name ? `${name}, ` : ""}यह कार्बन एल्केन अणु मॉडल है। <breath> अभी ${state.carbon.carbons} कार्बन परमाणुओं की श्रृंखला दिख रही है; हर कार्बन चार सहसंयोजक बंध बनाकर चतुष्फलकीय आकार लेता है।`,
  reflex: (state, name) =>
    `${name ? `${name}, ` : ""}यह प्रतिवर्ती चाप तंत्रिका मार्ग है। <breath> गर्मी लगते ही संवेदी तंत्रिका मेरुरज्जु को संकेत भेजती है और लगभग ${calculateReflexTimeMs(state.reflex.conductionSpeedMs).toFixed(0)} मिलीसेकंड में मांसपेशी तुरंत सिकुड़ जाती है।`,
  mendel: (state, name) =>
    `${name ? `${name}, ` : ""}यह मेंडल का एकसंकर संकरण प्रयोग है। <breath> दो संकर लंबे मटर पौधों का संकरण करने पर दूसरी पीढ़ी में तीन लंबे और एक बौना पौधा तीन अनुपात एक में उगता है।`,
  doubleslit: (state, name) =>
    `${name ? `${name}, ` : ""}यह यंग का डबल-स्लिट व्यतिकरण प्रयोग है। <breath> ${state.doubleslit.wavelengthNm} नैनोमीटर लेजर तरंगें दो स्लिट से गुजरकर पर्दे पर चमकीली और काली फ्रिंज बनाती हैं।`,
  photoelectric: (state, name) =>
    `${name ? `${name}, ` : ""}यह आइंस्टीन का प्रकाश-विद्युत प्रभाव प्रयोग है। <breath> जब फोटॉन की ऊर्जा धातु के कार्य-फलन से अधिक होती है तभी इलेक्ट्रॉन बाहर निकलते हैं।`,
  haber: (state, name) =>
    `${name ? `${name}, ` : ""}यह हैबर अमोनिया रिएक्टर है। <breath> ${state.haber.pressureAtm} एटीएम उच्च दाब और लोहे के उत्प्रेरक से अमोनिया की उपज और अभिक्रिया दर दोनों संतुलित होती हैं।`,
  galvanic: (state, name) =>
    `${name ? `${name}, ` : ""}यह डेनियल गैल्वेनिक सेल है। <breath> जिंक एनोड से कॉपर कैथोड की ओर इलेक्ट्रॉन बहते हैं और लवण सेतु आयन संतुलन बनाए रखता है।`,
  neuron: (state, name) =>
    `${name ? `${name}, ` : ""}यह न्यूरॉन एक्शन पोटेंशियल प्रयोग है। <breath> थ्रेशहोल्ड पार होते ही सोडियम चैनल खुलते हैं और विद्युत आवेग मायलिन अक्षतंतु से सिनैप्स तक दौड़ता है।`,
  pcr: (state, name) =>
    `${name ? `${name}, ` : ""}यह पीसीआर डीएनए प्रवर्धन प्रयोग है। <breath> 94 डिग्री पर डीएनए खुलता है, ${state.pcr.annealingTempC} डिग्री पर प्राइमर जुड़ते हैं और 72 डिग्री पर टैक पॉलीमरेज़ हर चक्र में प्रतियाँ दोगुनी करता है।`,
};

export function buildSpokenExplanationScript(
  stationId: StationId,
  state: LabExperimentState,
  studentName?: string,
  language: TutorLanguage = "English",
): string {
  const name = studentName?.trim();

  if (language === "Kannada") {
    return KANNADA_MENTOR_SCRIPTS[stationId](state, name);
  }

  if (language === "Hindi") {
    return HINDI_MENTOR_SCRIPTS[stationId](state, name);
  }

  const quest = LAB_QUESTS[stationId];
  const info = EXPERIMENT_EXPLAINABILITY[stationId];
  const live = info.interpretLiveState(state);
  const greeting = name
    ? `Hey ${name}, here's ${quest.title}.`
    : `Here's ${quest.title}.`;

  const rawScript = [
    greeting,
    HUMAN_MENTOR_HOOKS[stationId],
    live.nextStep,
  ].join(" ");

  return normalizeForSpeech(rawScript);
}
