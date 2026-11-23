import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import type {
  GeneratedScene3DSpec,
  Sim3DAnimationType,
  Sim3DObjectSpec,
  Sim3DParameter,
  Sim3DParamProperty,
  Sim3DPrimitiveShape,
  Sim3DReadoutFormula,
  Sim3DReadoutSpec,
  TutorConceptResponse,
} from "../src/types/simulation3d.ts";

export interface TutorExplainInput {
  question: string;
  subject: string;
  classLevel: string;
  board: string;
  language: string;
  imageBase64?: string;
  imageMimeType?: string;
}

export interface TutorSpeakInput {
  text: string;
  style?: string;
  language?: "English" | "Kannada" | "Hindi";
  voiceName?: "Puck" | "Charon" | "Kore" | "Fenrir" | "Zephyr";
}

export interface TutorSpeakResult {
  audioBase64: string;
  mimeType: string;
  model: string;
}

const DEFAULT_MODEL = "gemini-4-hydrogen";
const HUMAN_TTS_MODEL = "gemini-3.8-flash-tts";
const LITE_TTS_MODEL = "gemini-3.8-flash-lite-tts";

export type TtsVoiceName = "Puck" | "Charon" | "Kore" | "Fenrir" | "Zephyr";

const VALID_SHAPES = new Set<Sim3DPrimitiveShape>([
  "box",
  "sphere",
  "cylinder",
  "cone",
  "torus",
  "ring",
  "arrow",
  "beam",
  "helix",
  "wave",
  "particles",
  "orbit",
]);

const VALID_ANIMS = new Set<Sim3DAnimationType>([
  "none",
  "spin_y",
  "spin_x",
  "orbit",
  "bob",
  "oscillate_x",
  "oscillate_y",
  "pulse",
  "flow",
  "swing",
  "wave",
]);

const VALID_PARAM_PROPS = new Set<Sim3DParamProperty>([
  "none",
  "scale_y",
  "scale_all",
  "move_x",
  "move_y",
  "rotate_z",
  "rotate_y",
  "speed",
  "amplitude",
  "bend_angle",
  "emissive",
]);

const VALID_READOUT_FORMULAS = new Set<Sim3DReadoutFormula>([
  "direct",
  "ratio",
  "product",
  "sum",
  "snell_deg",
  "inverse",
  "pendulum_t",
]);

const VALID_LAB_STATIONS = new Set([
  "none",
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
  "titration",
  "electrolysis",
  "boyles",
  "displacement",
  "carbon",
  "haber",
  "galvanic",
  "photosynthesis",
  "microscope",
  "dna",
  "reflex",
  "mendel",
  "neuron",
  "pcr",
]);

export function isGeminiConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(key && key.trim().length > 0 && key !== "MY_GEMINI_API_KEY");
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!isGeminiConfigured() || !apiKey) {
    throw new Error("GEMINI_NOT_CONFIGURED");
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function clampNum(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === "number" && Number.isFinite(v) ? v : fallback;
  return Math.max(min, Math.min(max, n));
}

function sanitizeHex(v: unknown, fallback: string): string {
  if (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v.trim())) {
    return v.trim();
  }
  return fallback;
}

function sanitizeVec3(
  v: unknown,
  fallback: [number, number, number],
  min: number,
  max: number,
): [number, number, number] {
  if (Array.isArray(v) && v.length >= 3) {
    return [
      clampNum(v[0], min, max, fallback[0]),
      clampNum(v[1], min, max, fallback[1]),
      clampNum(v[2], min, max, fallback[2]),
    ];
  }
  return fallback;
}

function sanitizeScene3D(raw: unknown, subject: string, fallbackTitle: string): GeneratedScene3DSpec {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const defaultBg =
    subject === "Chemistry"
      ? "#F8F4EE"
      : subject === "Biology"
        ? "#F1F6F2"
        : "#EEF2F7";

  const rawParams = Array.isArray(obj.parameters) ? obj.parameters : [];
  const parameters: Sim3DParameter[] = rawParams
    .slice(0, 3)
    .map((p, idx) => {
      const pr = (p && typeof p === "object" ? p : {}) as Record<string, unknown>;
      const min = clampNum(pr.min, -500, 500, 0);
      const rawMax = clampNum(pr.max, -499, 1000, 100);
      const max = rawMax > min ? rawMax : min + 10;
      const step = clampNum(pr.step, 0.01, (max - min) / 2 || 1, Number(((max - min) / 20).toFixed(2)) || 1);
      const defaultValue = clampNum(pr.defaultValue, min, max, (min + max) / 2);
      return {
        id: typeof pr.id === "string" && pr.id.trim() ? pr.id.trim() : `param_${idx}`,
        label: typeof pr.label === "string" && pr.label.trim() ? pr.label.trim() : `Parameter ${idx + 1}`,
        unit: typeof pr.unit === "string" ? pr.unit.trim() : "",
        min,
        max,
        step,
        defaultValue,
      };
    });

  if (parameters.length === 0) {
    parameters.push({
      id: "intensity",
      label: "Simulation Rate",
      unit: "x",
      min: 0.2,
      max: 2.5,
      step: 0.1,
      defaultValue: 1.0,
    });
  }

  const rawObjects = Array.isArray(obj.objects) ? obj.objects : [];
  const objects: Sim3DObjectSpec[] = rawObjects.slice(0, 22).map((item, idx) => {
    const it = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const shapeRaw = typeof it.shape === "string" ? it.shape.trim() : "box";
    const shape: Sim3DPrimitiveShape = VALID_SHAPES.has(shapeRaw as Sim3DPrimitiveShape)
      ? (shapeRaw as Sim3DPrimitiveShape)
      : "box";

    const animRaw = typeof it.animation === "string" ? it.animation.trim() : "none";
    const animation: Sim3DAnimationType = VALID_ANIMS.has(animRaw as Sim3DAnimationType)
      ? (animRaw as Sim3DAnimationType)
      : "none";

    const propRaw = typeof it.paramProperty === "string" ? it.paramProperty.trim() : "none";
    const paramProperty: Sim3DParamProperty = VALID_PARAM_PROPS.has(propRaw as Sim3DParamProperty)
      ? (propRaw as Sim3DParamProperty)
      : "none";

    const paramIdxRaw = typeof it.paramIndex === "number" ? Math.round(it.paramIndex) : -1;
    const paramIndex =
      paramIdxRaw >= 0 && paramIdxRaw < parameters.length ? paramIdxRaw : -1;

    return {
      name: typeof it.name === "string" && it.name.trim() ? it.name.trim() : `part_${idx}`,
      shape,
      position: sanitizeVec3(it.position, [0, 0.8, 0], -4.2, 4.2),
      rotation: sanitizeVec3(it.rotation, [0, 0, 0], -360, 360),
      scale: sanitizeVec3(it.scale, [0.5, 0.5, 0.5], 0.04, 4.5),
      color: sanitizeHex(it.color, "#6F4E37"),
      opacity: clampNum(it.opacity, 0.12, 1.0, 1.0),
      metalness: clampNum(it.metalness, 0.0, 1.0, 0.15),
      roughness: clampNum(it.roughness, 0.05, 1.0, 0.45),
      label: typeof it.label === "string" ? it.label.trim().slice(0, 34) : "",
      animation,
      animSpeed: clampNum(it.animSpeed, 0.0, 8.0, 1.2),
      animAmplitude: clampNum(it.animAmplitude, 0.0, 2.0, 0.25),
      orbitRadius: clampNum(it.orbitRadius, 0.1, 3.0, 0.9),
      paramIndex,
      paramProperty,
      paramFactor: clampNum(it.paramFactor, -3.0, 3.0, 0.8),
    };
  });

  const rawReadouts = Array.isArray(obj.readouts) ? obj.readouts : [];
  const readouts: Sim3DReadoutSpec[] = rawReadouts.slice(0, 3).map((r) => {
    const rr = (r && typeof r === "object" ? r : {}) as Record<string, unknown>;
    const fRaw = typeof rr.formulaType === "string" ? rr.formulaType.trim() : "direct";
    const formulaType: Sim3DReadoutFormula = VALID_READOUT_FORMULAS.has(
      fRaw as Sim3DReadoutFormula,
    )
      ? (fRaw as Sim3DReadoutFormula)
      : "direct";
    const paramA = clampNum(rr.paramA, 0, Math.max(0, parameters.length - 1), 0);
    const rawB = typeof rr.paramB === "number" ? Math.round(rr.paramB) : -1;
    const paramB = rawB >= 0 && rawB < parameters.length ? rawB : -1;
    return {
      label: typeof rr.label === "string" && rr.label.trim() ? rr.label.trim() : "Measured Value",
      unit: typeof rr.unit === "string" ? rr.unit.trim() : "",
      formulaType,
      paramA: Math.round(paramA),
      paramB,
      scale: clampNum(rr.scale, -100, 100, 1),
      offset: clampNum(rr.offset, -500, 500, 0),
    };
  });

  return {
    title:
      typeof obj.title === "string" && obj.title.trim()
        ? obj.title.trim()
        : fallbackTitle,
    subtitle:
      typeof obj.subtitle === "string" && obj.subtitle.trim()
        ? obj.subtitle.trim()
        : "Interactive 3D NCERT apparatus simulation — drag to orbit and adjust parameters below.",
    backgroundHex: sanitizeHex(obj.backgroundHex, defaultBg),
    cameraDistance: clampNum(obj.cameraDistance, 4.0, 9.5, 6.2),
    parameters,
    objects,
    readouts,
  };
}

export async function generateConceptExplanation(
  input: TutorExplainInput,
): Promise<TutorConceptResponse> {
  const ai = getGeminiClient();

  const systemInstruction = [
    "You are Pocket Labs AI Tutor, an expert NCERT / CBSE & Karnataka State Board science teacher and 3D scientific simulation designer for Classes 6 to 12 (Physics, Chemistry, Biology).",
    `Target alignment: ${input.board}, ${input.classLevel}, Subject: ${input.subject}.`,
    `Write title, summary, explanation, observations, and realWorldApplication clearly in ${input.language}.`,
    "Keep 3D scene technical fields (shape, animation, paramProperty, formulaType, color hex, matchingLabStation) strictly in English schema tokens.",
    "Always design a rich, recognizable, scientifically faithful interactive 3D simulation (`scene3d`) tailored specifically to the student's NCERT experiment or concept!",
    "3D Spatial Design Rules for `scene3d.objects` (build 10 to 18 well-proportioned 3D parts):",
    "- The laboratory bench surface is at y = 0. Place stands, bases, trays, or beakers resting cleanly on y = 0 (center y = scale[1]/2), and apparatus components between x in [-3.0, 3.0], y in [0.05, 3.4], z in [-1.8, 1.8].",
    "- Use translucent glass/liquid materials (opacity 0.25 to 0.55, roughness 0.1) for beakers, prisms, lenses, glass slabs, flasks, water tanks, and cell membranes; use metallic materials (metalness 0.75, roughness 0.25) for brass stands, copper coils, iron cores, magnets, and electrodes.",
    "- Use `beam` for light rays / lasers / field vectors, `arrow` for forces / current / blood-flow direction, `helix` for coils / solenoids / springs / DNA, `wave` for transverse/sound waves, `particles` for moving alpha particles / electrons / gas bubbles / ions / RBCs / convection currents, and `orbit` for Bohr electron shells or planetary orbits.",
    "- Add concise 3D `label` strings (1–3 words) to the 4–6 most important apparatus parts (leave `label` empty `\"\"` on minor structural parts so the 3D view stays clean).",
    "- Design 2 or 3 meaningful scientific `parameters` (sliders) that actually control the phenomenon (e.g., Angle of Incidence & Refractive Index for glass slab refraction; Liquid Density & Object Density for buoyancy; Magnet Speed & Coil Turns for Faraday induction; Light Intensity & CO2 for photosynthesis).",
    "- Bind at least 3 key objects to those sliders via `paramIndex` (0, 1, or 2), `paramProperty`, and `paramFactor` so moving any slider visibly transforms the 3D simulation in real time!",
    "- For `matchingLabStation`, if the concept directly corresponds to one of these built-in 3D Lab benches, output its exact ID: pendulum, optics, circuit, projectile, wave, lens, electromagnet, resistors, doubleslit, photoelectric, titration, electrolysis, boyles, displacement, carbon, haber, galvanic, photosynthesis, microscope, dna, reflex, mendel, neuron, pcr. Otherwise output `none`.",
    "- Never invent fake NCERT page numbers; cite only genuine chapter/topic names.",
  ].join(" ");

  const userPromptText = input.question
    ? `NCERT Experiment / Concept Request: ${input.question}`
    : "Explain the NCERT science experiment or concept shown in the uploaded textbook image and generate an interactive 3D simulation of it.";

  const contents =
    input.imageBase64 && input.imageMimeType
      ? {
          parts: [
            {
              inlineData: {
                mimeType: input.imageMimeType,
                data: input.imageBase64,
              },
            },
            { text: userPromptText },
          ],
        }
      : userPromptText;

  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      thinkingConfig: {
        thinkingLevel: ThinkingLevel.LOW,
      },
      responseSchema: {
        type: Type.OBJECT,
        required: [
          "title",
          "ncertTag",
          "summary",
          "explanation",
          "formula",
          "observations",
          "realWorldApplication",
          "matchingLabStation",
          "scene3d",
        ],
        properties: {
          title: {
            type: Type.STRING,
            description: "Clear title of the NCERT experiment or science concept.",
          },
          ncertTag: {
            type: Type.STRING,
            description: "Short NCERT alignment tag, e.g. 'NCERT Class 10 · Science · Light'.",
          },
          summary: {
            type: Type.STRING,
            description: "2-3 sentence intuitive summary in the requested language.",
          },
          explanation: {
            type: Type.STRING,
            description: "Clear step-by-step scientific explanation in the requested language (3-5 short paragraphs or numbered steps).",
          },
          formula: {
            type: Type.STRING,
            description: "Key scientific formula, law, or balanced chemical equation.",
          },
          observations: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "3-4 concrete experimental observations students notice in this simulation.",
          },
          realWorldApplication: {
            type: Type.STRING,
            description: "1-2 sentences connecting the concept to everyday Indian/global technology or nature.",
          },
          matchingLabStation: {
            type: Type.STRING,
            description: "Matching built-in lab station ID or 'none'.",
          },
          scene3d: {
            type: Type.OBJECT,
            required: [
              "title",
              "subtitle",
              "backgroundHex",
              "cameraDistance",
              "parameters",
              "objects",
              "readouts",
            ],
            properties: {
              title: { type: Type.STRING },
              subtitle: { type: Type.STRING },
              backgroundHex: {
                type: Type.STRING,
                description: "Light studio background hex: #EEF2F7 for Physics, #F8F4EE for Chemistry, #F1F6F2 for Biology.",
              },
              cameraDistance: {
                type: Type.NUMBER,
                description: "Ideal 3D camera distance between 4.5 and 8.5.",
              },
              parameters: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  required: ["id", "label", "unit", "min", "max", "step", "defaultValue"],
                  properties: {
                    id: { type: Type.STRING },
                    label: { type: Type.STRING },
                    unit: { type: Type.STRING },
                    min: { type: Type.NUMBER },
                    max: { type: Type.NUMBER },
                    step: { type: Type.NUMBER },
                    defaultValue: { type: Type.NUMBER },
                  },
                },
              },
              objects: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  required: [
                    "name",
                    "shape",
                    "position",
                    "rotation",
                    "scale",
                    "color",
                    "opacity",
                    "metalness",
                    "roughness",
                    "label",
                    "animation",
                    "animSpeed",
                    "animAmplitude",
                    "orbitRadius",
                    "paramIndex",
                    "paramProperty",
                    "paramFactor",
                  ],
                  properties: {
                    name: { type: Type.STRING },
                    shape: {
                      type: Type.STRING,
                      description: "One of: box, sphere, cylinder, cone, torus, ring, arrow, beam, helix, wave, particles, orbit",
                    },
                    position: {
                      type: Type.ARRAY,
                      items: { type: Type.NUMBER },
                      description: "[x, y, z] in meters; floor is y=0.",
                    },
                    rotation: {
                      type: Type.ARRAY,
                      items: { type: Type.NUMBER },
                      description: "[rx, ry, rz] Euler angles in degrees.",
                    },
                    scale: {
                      type: Type.ARRAY,
                      items: { type: Type.NUMBER },
                      description: "[sx, sy, sz] dimensions in meters.",
                    },
                    color: { type: Type.STRING, description: "Hex color #RRGGBB." },
                    opacity: { type: Type.NUMBER, description: "0.15 to 1.0." },
                    metalness: { type: Type.NUMBER, description: "0.0 to 1.0." },
                    roughness: { type: Type.NUMBER, description: "0.05 to 1.0." },
                    label: { type: Type.STRING, description: "Short 3D callout label (or empty string)." },
                    animation: {
                      type: Type.STRING,
                      description: "One of: none, spin_y, spin_x, orbit, bob, oscillate_x, oscillate_y, pulse, flow, swing, wave",
                    },
                    animSpeed: { type: Type.NUMBER },
                    animAmplitude: { type: Type.NUMBER },
                    orbitRadius: { type: Type.NUMBER },
                    paramIndex: {
                      type: Type.INTEGER,
                      description: "-1 if unbound, or 0, 1, 2 to bind to parameters[index].",
                    },
                    paramProperty: {
                      type: Type.STRING,
                      description: "One of: none, scale_y, scale_all, move_x, move_y, rotate_z, rotate_y, speed, amplitude, bend_angle, emissive",
                    },
                    paramFactor: {
                      type: Type.NUMBER,
                      description: "Scaling factor (e.g. 0.5 to 1.5, or negative to invert).",
                    },
                  },
                },
              },
              readouts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  required: ["label", "unit", "formulaType", "paramA", "paramB", "scale", "offset"],
                  properties: {
                    label: { type: Type.STRING },
                    unit: { type: Type.STRING },
                    formulaType: {
                      type: Type.STRING,
                      description: "One of: direct, ratio, product, sum, snell_deg, inverse, pendulum_t",
                    },
                    paramA: { type: Type.INTEGER },
                    paramB: { type: Type.INTEGER },
                    scale: { type: Type.NUMBER },
                    offset: { type: Type.NUMBER },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const rawText = response.text?.trim();
  if (!rawText) {
    throw new Error("EMPTY_MODEL_RESPONSE");
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    throw new Error("INVALID_STRUCTURED_RESPONSE");
  }

  const title =
    typeof parsed.title === "string" && parsed.title.trim()
      ? parsed.title.trim()
      : input.question.slice(0, 60) || "NCERT Concept Simulation";

  const matchingRaw =
    typeof parsed.matchingLabStation === "string"
      ? parsed.matchingLabStation.trim().toLowerCase()
      : "none";

  return {
    title,
    ncertTag:
      typeof parsed.ncertTag === "string" && parsed.ncertTag.trim()
        ? parsed.ncertTag.trim()
        : `${input.board} · ${input.classLevel} · ${input.subject}`,
    summary:
      typeof parsed.summary === "string" && parsed.summary.trim()
        ? parsed.summary.trim()
        : "",
    explanation:
      typeof parsed.explanation === "string" && parsed.explanation.trim()
        ? parsed.explanation.trim()
        : "Explanation generated.",
    formula:
      typeof parsed.formula === "string" && parsed.formula.trim()
        ? parsed.formula.trim()
        : "",
    observations: Array.isArray(parsed.observations)
      ? parsed.observations
          .filter((o): o is string => typeof o === "string" && o.trim().length > 0)
          .slice(0, 5)
      : [],
    realWorldApplication:
      typeof parsed.realWorldApplication === "string"
        ? parsed.realWorldApplication.trim()
        : "",
    matchingLabStation: VALID_LAB_STATIONS.has(matchingRaw) ? matchingRaw : "none",
    scene3d: sanitizeScene3D(parsed.scene3d, input.subject, title),
    model: DEFAULT_MODEL,
  };
}

async function synthesizeWithModel(
  ai: GoogleGenAI,
  model: string,
  text: string,
  style: string,
  voiceName: TtsVoiceName,
): Promise<TutorSpeakResult> {
  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          {
            text,
            speechMetadata: {
              style,
            },
          },
        ],
      },
    ],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  });

  const part = response.candidates?.[0]?.content?.parts?.[0];
  const audioBase64 = part?.inlineData?.data;
  const mimeType = part?.inlineData?.mimeType || "audio/wav";

  if (!audioBase64) {
    throw new Error("EMPTY_AUDIO_RESPONSE");
  }

  return {
    audioBase64,
    mimeType,
    model,
  };
}

function resolveMentorSpeechStyle(
  style?: string,
  language?: "English" | "Kannada" | "Hindi",
): string {
  if (style && style.trim()) return style.trim();
  if (language === "Kannada") {
    return "Very natural, warm, friendly Indian science mentor speaking clear everyday Kannada face-to-face with a curious school student in a laboratory; genuine warmth, smooth native pronunciation, natural breathing pauses, never robotic";
  }
  if (language === "Hindi") {
    return "Very natural, warm, friendly Indian science mentor speaking clear everyday Hindi face-to-face with a curious school student in a laboratory; genuine warmth, smooth native pronunciation, natural breathing pauses, never robotic";
  }
  return "Very natural, warm, friendly human science mentor talking face-to-face with a curious student in a laboratory; genuine conversational warmth, gentle curiosity, natural breathing pauses and subtle smiles, never robotic or monotone";
}

function cleanTagsForLiteTts(text: string): string {
  return text
    .replace(/<breath>/gi, ",")
    .replace(/<(laugh|gasp)>/gi, "")
    .replace(/\s+,/g, ",")
    .replace(/\s{2,}/g, " ")
    .trim();
}

const MAX_TTS_CACHE_ENTRIES = 40;
const ttsUnaryCache = new Map<string, TutorSpeakResult>();
const ttsPcmCache = new Map<string, Buffer>();
let ttsQuotaCooldownUntil = 0;

function getTtsCacheKey(
  text: string,
  style: string,
  voiceName: TtsVoiceName,
  language?: string,
): string {
  return `${voiceName}::${language || "English"}::${style}::${text}`;
}

function setBoundedCache<T>(cache: Map<string, T>, key: string, value: T): void {
  if (cache.size >= MAX_TTS_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, value);
}

function isQuotaOrAuthError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return (
    msg.includes("429") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("403") ||
    msg.includes("PERMISSION_DENIED")
  );
}

function isModelNotFoundError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return (
    msg.includes("404") ||
    msg.includes("NOT_FOUND") ||
    msg.includes("not found")
  );
}

function noteQuotaErrorIfNeeded(err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
    ttsQuotaCooldownUntil = Date.now() + 60 * 1000;
  }
}

export async function generateSpokenExplanation(
  input: TutorSpeakInput,
): Promise<TutorSpeakResult> {
  const style = resolveMentorSpeechStyle(input.style, input.language);
  const voiceName: TtsVoiceName = input.voiceName || "Zephyr";
  const cacheKey = getTtsCacheKey(input.text, style, voiceName, input.language);
  const cached = ttsUnaryCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  if (Date.now() < ttsQuotaCooldownUntil) {
    throw new Error("429 RESOURCE_EXHAUSTED: Gemini TTS quota cooldown active.");
  }

  const ai = getGeminiClient();

  try {
    const result = await synthesizeWithModel(
      ai,
      HUMAN_TTS_MODEL,
      input.text,
      style,
      voiceName,
    );
    setBoundedCache(ttsUnaryCache, cacheKey, result);
    return result;
  } catch (err) {
    noteQuotaErrorIfNeeded(err);
    if (isQuotaOrAuthError(err)) {
      throw err;
    }
    if (isModelNotFoundError(err)) {
      const fallbackResult = await synthesizeWithModel(
        ai,
        LITE_TTS_MODEL,
        cleanTagsForLiteTts(input.text),
        style,
        voiceName,
      );
      setBoundedCache(ttsUnaryCache, cacheKey, fallbackResult);
      return fallbackResult;
    }
    throw err;
  }
}

async function streamWithModel(
  ai: GoogleGenAI,
  model: string,
  text: string,
  style: string,
  voiceName: TtsVoiceName,
  onPcmChunk: (chunk: Buffer) => void,
  signal?: AbortSignal,
): Promise<boolean> {
  const responseStream = await ai.models.generateContentStream({
    model,
    contents: [
      {
        role: "user",
        parts: [
          {
            text,
            speechMetadata: {
              style,
            },
          },
        ],
      },
    ],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  });

  let emittedAny = false;
  for await (const chunk of responseStream) {
    if (signal?.aborted) break;
    const data = chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (data) {
      emittedAny = true;
      onPcmChunk(Buffer.from(data, "base64"));
    }
  }
  return emittedAny;
}

export async function streamSpokenExplanation(
  input: TutorSpeakInput,
  onPcmChunk: (chunk: Buffer) => void,
  signal?: AbortSignal,
): Promise<{ model: string }> {
  const style = resolveMentorSpeechStyle(input.style, input.language);
  const voiceName: TtsVoiceName = input.voiceName || "Zephyr";
  const liteText = cleanTagsForLiteTts(input.text);
  const cacheKey = getTtsCacheKey(liteText, style, voiceName, input.language);

  const cachedPcm = ttsPcmCache.get(cacheKey);
  if (cachedPcm && cachedPcm.length > 0) {
    if (!signal?.aborted) {
      onPcmChunk(cachedPcm);
    }
    return { model: `${LITE_TTS_MODEL} (cached)` };
  }

  if (Date.now() < ttsQuotaCooldownUntil) {
    throw new Error("429 RESOURCE_EXHAUSTED: Gemini TTS quota cooldown active.");
  }

  const ai = getGeminiClient();
  const collectedChunks: Buffer[] = [];
  const emitAndCollect = (chunk: Buffer) => {
    collectedChunks.push(chunk);
    onPcmChunk(chunk);
  };

  try {
    const ok = await streamWithModel(
      ai,
      LITE_TTS_MODEL,
      liteText,
      style,
      voiceName,
      emitAndCollect,
      signal,
    );
    if (!ok && !signal?.aborted) {
      throw new Error("EMPTY_AUDIO_RESPONSE");
    }
    if (collectedChunks.length > 0 && !signal?.aborted) {
      setBoundedCache(ttsPcmCache, cacheKey, Buffer.concat(collectedChunks));
    }
    return { model: LITE_TTS_MODEL };
  } catch (err) {
    if (signal?.aborted) {
      return { model: LITE_TTS_MODEL };
    }
    noteQuotaErrorIfNeeded(err);

    // Never cascade retries on quota exhaustion (429) or auth failure (403)
    if (isQuotaOrAuthError(err)) {
      throw err;
    }

    if (isModelNotFoundError(err)) {
      try {
        const fallbackChunks: Buffer[] = [];
        const ok = await streamWithModel(
          ai,
          HUMAN_TTS_MODEL,
          input.text,
          style,
          voiceName,
          (chunk) => {
            fallbackChunks.push(chunk);
            onPcmChunk(chunk);
          },
          signal,
        );
        if (ok || signal?.aborted) {
          if (fallbackChunks.length > 0 && !signal?.aborted) {
            setBoundedCache(ttsPcmCache, cacheKey, Buffer.concat(fallbackChunks));
          }
          return { model: HUMAN_TTS_MODEL };
        }
      } catch (fallbackErr) {
        noteQuotaErrorIfNeeded(fallbackErr);
        if (isQuotaOrAuthError(fallbackErr)) {
          throw fallbackErr;
        }
      }
    }

    const unary = await generateSpokenExplanation(input);
    const wavBytes = Buffer.from(unary.audioBase64, "base64");
    const pcmBytes =
      wavBytes.length > 44 && wavBytes.subarray(0, 4).toString("ascii") === "RIFF"
        ? wavBytes.subarray(44)
        : wavBytes;
    if (pcmBytes.length > 0 && !signal?.aborted) {
      setBoundedCache(ttsPcmCache, cacheKey, pcmBytes);
      onPcmChunk(pcmBytes);
    }
    return { model: unary.model };
  }
}
