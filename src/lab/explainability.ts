import type { TutorLanguage } from "../types/navigation";
import type { LabExperimentState, StationId } from "./types";
import {
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

  trig: {
    id: "trig",
    governingPrinciple: "Unit Circle Projections & Pythagorean Identity",
    formula: "x = cos θ   ·   y = sin θ   ·   sin²θ + cos²θ = 1",
    variables: [
      { symbol: "θ", meaning: "Counter-clockwise phasor angle from +X axis (° or rad)" },
      { symbol: "cos θ", meaning: "Horizontal projection onto the X-axis" },
      { symbol: "sin θ", meaning: "Vertical projection onto the Y-axis" },
    ],
    whyItHappens:
      "Any point on a circle of radius r = 1 forms a right triangle with hypotenuse 1, base cos θ, and height sin θ. By Pythagoras' theorem, the squared projections always sum to 1 regardless of quadrant.",
    observationGuide: [
      "Drag Phasor Angle (θ) or start Auto-Sweep to trace the radius arm around all 4 quadrants.",
      "Track the horizontal Mocha leg (cos θ) and vertical Lavender leg (sin θ) changing sign across quadrants.",
      "Set θ = 60° (π/3 rad) to verify cos(60°) = 0.500 and sin(60°) ≈ 0.866.",
    ],
    realWorldApplication:
      "Used in AC alternating-current phasors, GPS satellite triangulation, 3D graphics rotations, and signal processing (FFT).",
    interpretLiveState: (state) => {
      const deg = Math.round(state.trig.angleDeg);
      const rad = (deg * Math.PI) / 180;
      const cosVal = Math.cos(rad);
      const sinVal = Math.sin(rad);
      const near60 = Math.abs(deg - 60) <= 2;
      return {
        statusLabel: near60 ? "60° Verified" : "Phasor Projection",
        summary: `At θ = ${deg}° (${(rad / Math.PI).toFixed(2)}π rad): cos(θ) = ${cosVal.toFixed(3)}, sin(θ) = ${sinVal.toFixed(3)}, and sin²θ + cos²θ = ${(cosVal * cosVal + sinVal * sinVal).toFixed(3)}.`,
        nextStep: near60
          ? "Exact special-angle ratio verified! Toggle Auto-Sweep to inspect quadrants II–IV."
          : "Slide Phasor Angle directly to 60° (π/3 rad) to verify cos(60°) = 0.500.",
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
  trig:
    "Slide around the unit circle and you'll see a right triangle of radius one—<breath> sideways is cosine, height is sine.",
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
  trig: (state, name) =>
    `${name ? `${name}, ` : ""}ಇದು ತ್ರಿಕೋನಮಿತಿ ಏಕಮಾನ ವೃತ್ತ. <breath> ${Math.round(state.trig.angleDeg)} ಡಿಗ್ರಿ ಕೋನದಲ್ಲಿ ಅಡ್ಡ ದೂರ ಕಾಸ್ ತೀಟಾ ಮತ್ತು ಎತ್ತರ ಸೈನ್ ತೀಟಾ ತೋರಿಸುತ್ತದೆ.`,
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
  trig: (state, name) =>
    `${name ? `${name}, ` : ""}यह त्रिकोणमिति इकाई वृत्त है। <breath> ${Math.round(state.trig.angleDeg)} डिग्री कोण पर क्षैतिज दूरी कॉस थीटा और ऊंचाई साइन थीटा को दर्शाती है।`,
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
