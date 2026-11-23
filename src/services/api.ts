import type { TutorConceptResponse } from "../types/simulation3d";

export interface HealthStatusResponse {
  status: string;
  service: string;
  geminiConfigured: boolean;
  timestamp: string;
}

export interface TutorExplainRequest {
  question: string;
  subject: string;
  classLevel: string;
  board: string;
  language: string;
  imageBase64?: string;
  imageMimeType?: string;
}

export async function fetchHealthStatus(
  signal?: AbortSignal,
): Promise<HealthStatusResponse> {
  const response = await fetch("/api/health", { signal });
  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }
  return (await response.json()) as HealthStatusResponse;
}

export async function requestTutorExplanation(
  payload: TutorExplainRequest,
): Promise<TutorConceptResponse> {
  const response = await fetch("/api/tutor/explain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => ({}))) as Partial<TutorConceptResponse> & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(
      data.error || `Request failed with status ${response.status}`,
    );
  }

  if (!data.explanation || !data.scene3d) {
    throw new Error("Server returned an incomplete concept simulation.");
  }

  return data as TutorConceptResponse;
}

export type MentorVoiceName = "Zephyr" | "Puck" | "Kore" | "Charon" | "Fenrir";

export interface TutorSpeakRequest {
  text: string;
  style?: string;
  language?: "English" | "Kannada" | "Hindi";
  voiceName?: MentorVoiceName;
}

export interface TutorSpeakResponse {
  audioBase64: string;
  mimeType: string;
  model: string;
}

export async function requestTutorSpeech(
  payload: TutorSpeakRequest,
): Promise<TutorSpeakResponse> {
  const response = await fetch("/api/tutor/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => ({}))) as {
    audioBase64?: string;
    mimeType?: string;
    model?: string;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(
      data.error || `Speech request failed with status ${response.status}`,
    );
  }

  if (!data.audioBase64) {
    throw new Error("Server returned empty speech audio.");
  }

  return {
    audioBase64: data.audioBase64,
    mimeType: data.mimeType || "audio/wav",
    model: data.model || "gemini-3.8-flash-lite-tts",
  };
}

export async function requestTutorSpeechStream(
  payload: TutorSpeakRequest,
  onPcmChunk: (chunk: Uint8Array) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch("/api/tutor/speak-stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(
      data.error || `Speech stream failed with status ${response.status}`,
    );
  }

  if (!response.body) {
    throw new Error("Streaming response body is unavailable.");
  }

  const reader = response.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value && value.byteLength > 0) {
      onPcmChunk(value);
    }
  }
}
