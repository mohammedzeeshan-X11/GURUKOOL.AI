import { useSyncExternalStore } from "react";
import {
  type MentorVoiceName,
  requestTutorSpeech,
  requestTutorSpeechStream,
} from "../services/api";

export type VoiceEngineMode = "ai" | "device";
export type VoiceNarratorStatus = "idle" | "loading" | "speaking";

export interface VoiceNarratorSnapshot {
  status: VoiceNarratorStatus;
  activeKey: string | null;
  engine: VoiceEngineMode;
  voiceName: MentorVoiceName;
  error: string | null;
}

const LANGUAGE_BCP47: Record<string, string> = {
  English: "en-IN",
  Kannada: "kn-IN",
  Hindi: "hi-IN",
};

const PCM_SAMPLE_RATE = 24000;

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = window.atob(base64);
  const len = binary.length;
  const buffer = new ArrayBuffer(len);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function stripAudioTags(text: string): string {
  return text
    .replace(/<(breath|laugh|gasp)>/gi, ", ")
    .replace(/\s+,/g, ",")
    .replace(/\s+/g, " ")
    .trim();
}

function concatFloat32(chunks: Float32Array[]): Float32Array<ArrayBuffer> {
  const totalLen = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Float32Array(new ArrayBuffer(totalLen * 4));
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

class LabVoiceNarrator {
  private snapshot: VoiceNarratorSnapshot = {
    status: "idle",
    activeKey: null,
    engine: "ai",
    voiceName: "Zephyr",
    error: null,
  };

  private listeners = new Set<() => void>();
  private audioCtx: AudioContext | null = null;
  private activeSources = new Set<AudioBufferSourceNode>();
  private currentAudio: HTMLAudioElement | null = null;
  private currentObjectUrl: string | null = null;
  private streamAbort: AbortController | null = null;
  private pcmCache = new Map<string, Float32Array<ArrayBuffer>>();
  private prefetchPromises = new Map<string, Promise<void>>();
  private requestSeq = 0;

  private emit(patch: Partial<VoiceNarratorSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((fn) => fn());
  }

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  public getSnapshot = (): VoiceNarratorSnapshot => {
    return this.snapshot;
  };

  public setEngine(engine: VoiceEngineMode): void {
    this.stop();
    this.emit({ engine, error: null });
  }

  public setVoiceName(voiceName: MentorVoiceName): void {
    this.stop();
    this.emit({ voiceName, error: null });
  }

  public clearError(): void {
    if (this.snapshot.error) {
      this.emit({ error: null });
    }
  }

  /**
   * Synchronously create & unlock Web AudioContext inside the user click/key gesture
   * BEFORE any async network await, preventing browser autoplay blocking inside iframes.
   */
  private unlockAudioContextSync(): AudioContext | null {
    if (typeof window === "undefined") return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return null;

    if (!this.audioCtx) {
      this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx.state === "suspended") {
      void this.audioCtx.resume().catch(() => {});
    }
    try {
      const silent = this.audioCtx.createBuffer(1, 1, PCM_SAMPLE_RATE);
      const src = this.audioCtx.createBufferSource();
      src.buffer = silent;
      src.connect(this.audioCtx.destination);
      src.start(0);
    } catch {
      // Ignore silent-prime errors
    }
    return this.audioCtx;
  }

  public stop(): void {
    this.requestSeq += 1;

    if (this.streamAbort) {
      this.streamAbort.abort();
      this.streamAbort = null;
    }

    this.activeSources.forEach((src) => {
      try {
        src.onended = null;
        src.stop();
        src.disconnect();
      } catch {
        // Ignore already-stopped nodes
      }
    });
    this.activeSources.clear();

    if (this.currentAudio) {
      this.currentAudio.onended = null;
      this.currentAudio.onerror = null;
      this.currentAudio.pause();
      this.currentAudio.src = "";
      this.currentAudio = null;
    }

    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl);
      this.currentObjectUrl = null;
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    if (
      this.snapshot.status !== "idle" ||
      this.snapshot.activeKey !== null
    ) {
      this.emit({ status: "idle", activeKey: null });
    }
  }

  public prefetch(
    text: string,
    options?: {
      style?: string;
      language?: "English" | "Kannada" | "Hindi";
      voiceName?: MentorVoiceName;
    },
  ): void {
    const cleanText = text.trim().slice(0, 2400);
    if (!cleanText || this.snapshot.engine !== "ai") return;

    const voiceName = options?.voiceName ?? this.snapshot.voiceName;
    const style = options?.style;
    const language = options?.language || "English";
    const cacheKey = `${voiceName}::${language}::${style || "default"}::${cleanText}`;

    if (this.pcmCache.has(cacheKey) || this.prefetchPromises.has(cacheKey)) {
      return;
    }

    const promise = (async () => {
      const floatChunks: Float32Array[] = [];
      let pendingByte: number | null = null;
      try {
        await requestTutorSpeechStream(
          { text: cleanText, style, language, voiceName },
          (chunk) => {
            const aligned = this.pcmBytesToFloat32(chunk, pendingByte);
            pendingByte = aligned.nextPendingByte;
            if (aligned.samples.length > 0) {
              floatChunks.push(aligned.samples);
            }
          },
        );
        if (floatChunks.length > 0) {
          this.saveToCache(cacheKey, concatFloat32(floatChunks));
        }
      } catch {
        // Prefetch failures are silent; foreground speak surfaces errors cleanly.
      } finally {
        this.prefetchPromises.delete(cacheKey);
      }
    })();

    this.prefetchPromises.set(cacheKey, promise);
  }

  private saveToCache(key: string, pcm: Float32Array<ArrayBuffer>): void {
    if (this.pcmCache.size >= 28) {
      const oldest = this.pcmCache.keys().next().value;
      if (oldest) this.pcmCache.delete(oldest);
    }
    this.pcmCache.set(key, pcm);
  }

  private pcmBytesToFloat32(
    chunk: Uint8Array,
    pendingByte: number | null,
  ): { samples: Float32Array; nextPendingByte: number | null } {
    const hasPending = pendingByte !== null;
    const totalBytes = chunk.byteLength + (hasPending ? 1 : 0);
    const usableBytes = totalBytes - (totalBytes % 2);
    const nextPendingByte =
      totalBytes % 2 === 1 ? chunk[chunk.byteLength - 1] : null;

    if (usableBytes <= 0) {
      return { samples: new Float32Array(0), nextPendingByte };
    }

    const sampleCount = usableBytes / 2;
    const samples = new Float32Array(sampleCount);

    let readOffset = 0;
    let outIdx = 0;

    if (hasPending) {
      let val = (pendingByte as number) | (chunk[0] << 8);
      if (val >= 0x8000) val -= 0x10000;
      samples[outIdx++] = val / 32768;
      readOffset = 1;
    }

    while (outIdx < sampleCount) {
      const lo = chunk[readOffset++];
      const hi = chunk[readOffset++];
      let val = lo | (hi << 8);
      if (val >= 0x8000) val -= 0x10000;
      samples[outIdx++] = val / 32768;
    }

    return { samples, nextPendingByte };
  }

  private playCachedPcm(
    key: string,
    pcm: Float32Array<ArrayBuffer>,
    ctx: AudioContext,
    token: number,
  ): void {
    const buffer = ctx.createBuffer(1, pcm.length, PCM_SAMPLE_RATE);
    buffer.copyToChannel(pcm, 0);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    this.activeSources.add(source);

    source.onended = () => {
      this.activeSources.delete(source);
      if (token !== this.requestSeq) return;
      this.emit({ status: "idle", activeKey: null });
    };

    this.emit({ status: "speaking", activeKey: key, error: null });
    source.start(0);
  }

  public async speak(
    key: string,
    text: string,
    options?: {
      language?: "English" | "Kannada" | "Hindi";
      style?: string;
      voiceName?: MentorVoiceName;
      forceEngine?: VoiceEngineMode;
    },
  ): Promise<void> {
    const cleanText = text.trim().slice(0, 2400);
    if (!cleanText) return;

    const engine = options?.forceEngine ?? this.snapshot.engine;

    if (
      this.snapshot.activeKey === key &&
      this.snapshot.status !== "idle"
    ) {
      this.stop();
      return;
    }

    this.stop();
    const token = ++this.requestSeq;
    const unlockedCtx = engine === "ai" ? this.unlockAudioContextSync() : null;
    const language = options?.language || "English";

    if (engine === "device") {
      this.speakWithDeviceVoice(
        key,
        stripAudioTags(cleanText),
        language,
        token,
      );
      return;
    }

    await this.speakWithAiStream(
      key,
      cleanText,
      options?.voiceName ?? this.snapshot.voiceName,
      options?.style,
      language,
      token,
      unlockedCtx,
    );
  }

  private speakWithDeviceVoice(
    key: string,
    text: string,
    language: string,
    token: number,
  ): void {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      this.emit({
        status: "idle",
        activeKey: null,
        error:
          "Device speech synthesis is not supported in this browser. Switch to AI Voice.",
      });
      return;
    }

    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    const targetLang = LANGUAGE_BCP47[language] || "en-IN";
    utterance.lang = targetLang;
    utterance.rate = 0.96;
    utterance.pitch = 1.02;

    const voices = synth.getVoices();
    const langPrefix = targetLang.split("-")[0].toLowerCase();
    const matchingVoices = voices.filter(
      (v) =>
        v.lang.toLowerCase() === targetLang.toLowerCase() ||
        v.lang.toLowerCase().startsWith(langPrefix),
    );
    const preferred =
      matchingVoices.find((v) => /natural|neural|google|samantha|rishi|veena/i.test(v.name)) ||
      matchingVoices[0] ||
      voices[0];
    if (preferred) {
      utterance.voice = preferred;
    }

    utterance.onstart = () => {
      if (token !== this.requestSeq) return;
      this.emit({ status: "speaking", activeKey: key, error: null });
    };

    utterance.onend = () => {
      if (token !== this.requestSeq) return;
      this.emit({ status: "idle", activeKey: null });
    };

    utterance.onerror = (ev) => {
      if (token !== this.requestSeq) return;
      if (ev.error === "canceled" || ev.error === "interrupted") {
        this.emit({ status: "idle", activeKey: null });
        return;
      }
      this.emit({
        status: "idle",
        activeKey: null,
        error: "Device voice could not play audio. Switch to AI Voice instead.",
      });
    };

    this.emit({ status: "speaking", activeKey: key, error: null });
    synth.speak(utterance);
  }

  private async playWithAudioElementFallback(
    key: string,
    text: string,
    voiceName: MentorVoiceName,
    style: string | undefined,
    language: "English" | "Kannada" | "Hindi",
    token: number,
  ): Promise<void> {
    this.emit({ status: "loading", activeKey: key, error: null });
    try {
      const res = await requestTutorSpeech({ text, style, language, voiceName });
      if (token !== this.requestSeq) return;
      const bytes = base64ToBytes(res.audioBase64);
      const blob = new Blob([bytes], { type: res.mimeType });
      const objectUrl = URL.createObjectURL(blob);
      this.currentObjectUrl = objectUrl;

      const audio = new Audio(objectUrl);
      this.currentAudio = audio;
      audio.onended = () => {
        if (token !== this.requestSeq) return;
        if (this.currentObjectUrl === objectUrl) {
          URL.revokeObjectURL(objectUrl);
          this.currentObjectUrl = null;
        }
        this.currentAudio = null;
        this.emit({ status: "idle", activeKey: null });
      };
      audio.onerror = () => {
        if (token !== this.requestSeq) return;
        this.currentAudio = null;
        this.emit({
          status: "idle",
          activeKey: null,
          error: "Browser blocked or failed to play narration audio.",
        });
      };

      this.emit({ status: "speaking", activeKey: key, error: null });
      await audio.play();
    } catch (err) {
      if (token !== this.requestSeq) return;
      this.emit({
        status: "idle",
        activeKey: null,
        error:
          err instanceof Error
            ? err.message
            : "Could not synthesize AI speech.",
      });
    }
  }

  private async speakWithAiStream(
    key: string,
    text: string,
    voiceName: MentorVoiceName,
    style: string | undefined,
    language: "English" | "Kannada" | "Hindi",
    token: number,
    unlockedCtx: AudioContext | null,
  ): Promise<void> {
    const ctx = unlockedCtx ?? this.audioCtx;
    if (!ctx) {
      await this.playWithAudioElementFallback(
        key,
        text,
        voiceName,
        style,
        language,
        token,
      );
      return;
    }

    if (ctx.state === "suspended") {
      await ctx.resume().catch(() => {});
    }

    const cacheKey = `${voiceName}::${language}::${style || "default"}::${text}`;

    // Wait briefly if a background prefetch for this exact clip is already downloading
    const inFlightPrefetch = this.prefetchPromises.get(cacheKey);
    if (inFlightPrefetch) {
      this.emit({ status: "loading", activeKey: key, error: null });
      await inFlightPrefetch;
      if (token !== this.requestSeq) return;
    }

    const cachedPcm = this.pcmCache.get(cacheKey);
    if (cachedPcm) {
      this.playCachedPcm(key, cachedPcm, ctx, token);
      return;
    }

    // Live progressive PCM streaming — plays as soon as the 1st chunk arrives!
    const abortCtrl = new AbortController();
    this.streamAbort = abortCtrl;
    this.emit({ status: "loading", activeKey: key, error: null });

    const floatChunks: Float32Array[] = [];
    let pendingByte: number | null = null;
    let nextPlayTime = 0;
    let startedSpeaking = false;
    let streamFinished = false;
    let lastSource: AudioBufferSourceNode | null = null;

    const scheduleChunk = (samples: Float32Array) => {
      if (token !== this.requestSeq || samples.length === 0) return;

      floatChunks.push(samples);
      const buffer = ctx.createBuffer(1, samples.length, PCM_SAMPLE_RATE);
      buffer.getChannelData(0).set(samples);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      this.activeSources.add(source);
      lastSource = source;

      const startAt = Math.max(ctx.currentTime + 0.03, nextPlayTime);
      nextPlayTime = startAt + buffer.duration;

      source.onended = () => {
        this.activeSources.delete(source);
        if (token !== this.requestSeq) return;
        if (streamFinished && lastSource === source && this.activeSources.size === 0) {
          this.emit({ status: "idle", activeKey: null });
        }
      };

      if (!startedSpeaking) {
        startedSpeaking = true;
        this.emit({ status: "speaking", activeKey: key, error: null });
      }
      source.start(startAt);
    };

    try {
      await requestTutorSpeechStream(
        { text, style, language, voiceName },
        (chunk) => {
          if (token !== this.requestSeq) return;
          const aligned = this.pcmBytesToFloat32(chunk, pendingByte);
          pendingByte = aligned.nextPendingByte;
          if (aligned.samples.length > 0) {
            scheduleChunk(aligned.samples);
          }
        },
        abortCtrl.signal,
      );

      if (token !== this.requestSeq) return;
      streamFinished = true;
      if (this.streamAbort === abortCtrl) {
        this.streamAbort = null;
      }

      if (floatChunks.length > 0) {
        this.saveToCache(cacheKey, concatFloat32(floatChunks));
      } else {
        this.emit({
          status: "idle",
          activeKey: null,
          error: "Server returned empty audio stream.",
        });
        return;
      }

      if (this.activeSources.size === 0) {
        this.emit({ status: "idle", activeKey: null });
      }
    } catch (err) {
      if (abortCtrl.signal.aborted || token !== this.requestSeq) return;
      if (this.streamAbort === abortCtrl) {
        this.streamAbort = null;
      }
      this.emit({
        status: "idle",
        activeKey: null,
        error:
          err instanceof Error
            ? err.message
            : "Could not stream AI speech.",
      });
    }
  }
}

export const labVoiceNarrator = new LabVoiceNarrator();

export function useVoiceNarrator(): VoiceNarratorSnapshot {
  return useSyncExternalStore(
    labVoiceNarrator.subscribe,
    labVoiceNarrator.getSnapshot,
    labVoiceNarrator.getSnapshot,
  );
}
