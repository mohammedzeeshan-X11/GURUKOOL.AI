import { GoogleGenAI, ThinkingLevel } from "@google/genai";

export interface TutorExplainInput {
  question: string;
  subject: string;
  classLevel: string;
  board: string;
  language: string;
}

export interface TutorExplainResult {
  explanation: string;
  model: string;
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

export async function generateConceptExplanation(
  input: TutorExplainInput,
): Promise<TutorExplainResult> {
  const ai = getGeminiClient();

  const systemInstruction = [
    "You are an academic STEM tutor for school students in Classes 6 to 10.",
    `Target curriculum alignment: ${input.board}, ${input.classLevel}, Subject: ${input.subject}.`,
    `Respond clearly in ${input.language}.`,
    "Keep explanations accurate, age-appropriate, structured with clear conceptual steps, and free of unverified curriculum page numbers.",
  ].join(" ");

  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: input.question,
    config: {
      systemInstruction,
      thinkingConfig: {
        thinkingLevel: ThinkingLevel.LOW,
      },
    },
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error("EMPTY_MODEL_RESPONSE");
  }

  return {
    explanation: text,
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

function isModelRetryableError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return (
    msg.includes("404") ||
    msg.includes("NOT_FOUND") ||
    msg.includes("not found") ||
    msg.includes("429") ||
    msg.includes("RESOURCE_EXHAUSTED")
  );
}

export async function generateSpokenExplanation(
  input: TutorSpeakInput,
): Promise<TutorSpeakResult> {
  const ai = getGeminiClient();
  const style = resolveMentorSpeechStyle(input.style, input.language);
  const voiceName: TtsVoiceName = input.voiceName || "Zephyr";

  try {
    return await synthesizeWithModel(
      ai,
      HUMAN_TTS_MODEL,
      input.text,
      style,
      voiceName,
    );
  } catch (err) {
    if (isModelRetryableError(err)) {
      return await synthesizeWithModel(
        ai,
        LITE_TTS_MODEL,
        cleanTagsForLiteTts(input.text),
        style,
        voiceName,
      );
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
  const ai = getGeminiClient();
  const style = resolveMentorSpeechStyle(input.style, input.language);
  const voiceName: TtsVoiceName = input.voiceName || "Zephyr";
  const liteText = cleanTagsForLiteTts(input.text);

  // High-efficiency low-latency TTS is preferred for rapid multilingual streaming;
  // falls back to flagship TTS or unary synthesis if needed.
  try {
    const ok = await streamWithModel(
      ai,
      LITE_TTS_MODEL,
      liteText,
      style,
      voiceName,
      onPcmChunk,
      signal,
    );
    if (!ok && !signal?.aborted) {
      throw new Error("EMPTY_AUDIO_RESPONSE");
    }
    return { model: LITE_TTS_MODEL };
  } catch (err) {
    if (signal?.aborted) {
      return { model: LITE_TTS_MODEL };
    }
    if (isModelRetryableError(err)) {
      try {
        const ok = await streamWithModel(
          ai,
          HUMAN_TTS_MODEL,
          input.text,
          style,
          voiceName,
          onPcmChunk,
          signal,
        );
        if (ok || signal?.aborted) {
          return { model: HUMAN_TTS_MODEL };
        }
      } catch {
        // Fall through to unary WAV -> PCM extraction below
      }
    }

    // Last-resort unary synthesis (strip 44-byte WAV RIFF header to emit raw 24kHz PCM)
    const unary = await generateSpokenExplanation(input);
    const wavBytes = Buffer.from(unary.audioBase64, "base64");
    const pcmBytes =
      wavBytes.length > 44 && wavBytes.subarray(0, 4).toString("ascii") === "RIFF"
        ? wavBytes.subarray(44)
        : wavBytes;
    if (pcmBytes.length > 0 && !signal?.aborted) {
      onPcmChunk(pcmBytes);
    }
    return { model: unary.model };
  }
}
