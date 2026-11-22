import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import {
  generateConceptExplanation,
  generateSpokenExplanation,
  isGeminiConfigured,
  streamSpokenExplanation,
} from "./server/gemini.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === "production";

async function startServer() {
  const app = express();

  app.use(express.json({ limit: "1mb" }));

  // Server health and readiness endpoint (never exposes secrets)
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "physix-ai",
      geminiConfigured: isGeminiConfigured(),
      timestamp: new Date().toISOString(),
    });
  });

  // Server-side AI Tutor endpoint
  app.post("/api/tutor/explain", async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const question =
      typeof body.question === "string" ? body.question.trim() : "";
    const subject =
      typeof body.subject === "string" && body.subject.trim()
        ? body.subject.trim()
        : "Physics";
    const classLevel =
      typeof body.classLevel === "string" && body.classLevel.trim()
        ? body.classLevel.trim()
        : "Class 8";
    const board =
      typeof body.board === "string" && body.board.trim()
        ? body.board.trim()
        : "NCERT / CBSE";
    const language =
      typeof body.language === "string" && body.language.trim()
        ? body.language.trim()
        : "English";

    if (!question) {
      res.status(400).json({
        error: "Please enter a STEM question or concept to explain.",
      });
      return;
    }

    if (question.length > 1500) {
      res.status(400).json({
        error: "Question is too long. Please keep it under 1500 characters.",
      });
      return;
    }

    if (!isGeminiConfigured()) {
      res.status(503).json({
        error:
          "Server-side Gemini integration is not configured in this environment. Set GEMINI_API_KEY in Settings > Secrets to enable live explanations.",
      });
      return;
    }

    try {
      const result = await generateConceptExplanation({
        question,
        subject,
        classLevel,
        board,
        language,
      });
      res.json(result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to generate explanation.";
      console.error("[PHYSIX AI] /api/tutor/explain error:", message);

      if (message.includes("403") || message.includes("PERMISSION_DENIED")) {
        res.status(403).json({
          error:
            "The configured Gemini API key lacks permission. Verify the key in Settings > Secrets.",
        });
        return;
      }

      if (message.includes("429") || message.includes("RESOURCE_EXHAUSTED")) {
        res.status(429).json({
          error:
            "Gemini API quota limit reached. Please try again shortly or review your quota settings.",
        });
        return;
      }

      res.status(502).json({
        error:
          "Unable to reach the AI tutor service right now. Please try again.",
      });
    }
  });

  // Server-side AI Spoken Explanation (TTS) endpoint
  app.post("/api/tutor/speak", async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const style =
      typeof body.style === "string" && body.style.trim()
        ? body.style.trim()
        : undefined;
    const allowedVoices = new Set(["Puck", "Charon", "Kore", "Fenrir", "Zephyr"]);
    const voiceName =
      typeof body.voiceName === "string" && allowedVoices.has(body.voiceName)
        ? (body.voiceName as "Puck" | "Charon" | "Kore" | "Fenrir" | "Zephyr")
        : undefined;
    const allowedLanguages = new Set(["English", "Kannada", "Hindi"]);
    const language =
      typeof body.language === "string" && allowedLanguages.has(body.language)
        ? (body.language as "English" | "Kannada" | "Hindi")
        : undefined;

    if (!text) {
      res.status(400).json({
        error: "Please provide text to narrate.",
      });
      return;
    }

    if (text.length > 2500) {
      res.status(400).json({
        error: "Narration script is too long. Please keep it under 2500 characters.",
      });
      return;
    }

    if (!isGeminiConfigured()) {
      res.status(503).json({
        error:
          "Server-side Gemini integration is not configured. Switch to Device Voice or set GEMINI_API_KEY in Settings > Secrets.",
      });
      return;
    }

    try {
      const result = await generateSpokenExplanation({
        text,
        style,
        language,
        voiceName,
      });
      res.json(result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to generate speech audio.";
      console.error("[PHYSIX AI] /api/tutor/speak error:", message);

      if (message.includes("403") || message.includes("PERMISSION_DENIED")) {
        res.status(403).json({
          error:
            "The configured Gemini API key lacks permission. Verify the key in Settings > Secrets.",
        });
        return;
      }

      if (message.includes("429") || message.includes("RESOURCE_EXHAUSTED")) {
        res.status(429).json({
          error:
            "Gemini API quota limit reached. Please try again shortly or use Device Voice.",
        });
        return;
      }

      res.status(502).json({
        error:
          "Unable to generate AI voice audio right now. Please try again or switch to Device Voice.",
      });
    }
  });

  // Low-latency streaming PCM TTS endpoint
  app.post("/api/tutor/speak-stream", async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const style =
      typeof body.style === "string" && body.style.trim()
        ? body.style.trim()
        : undefined;
    const allowedVoices = new Set(["Puck", "Charon", "Kore", "Fenrir", "Zephyr"]);
    const voiceName =
      typeof body.voiceName === "string" && allowedVoices.has(body.voiceName)
        ? (body.voiceName as "Puck" | "Charon" | "Kore" | "Fenrir" | "Zephyr")
        : undefined;
    const allowedLanguages = new Set(["English", "Kannada", "Hindi"]);
    const language =
      typeof body.language === "string" && allowedLanguages.has(body.language)
        ? (body.language as "English" | "Kannada" | "Hindi")
        : undefined;

    if (!text) {
      res.status(400).json({ error: "Please provide text to narrate." });
      return;
    }

    if (text.length > 2500) {
      res.status(400).json({
        error: "Narration script is too long. Please keep it under 2500 characters.",
      });
      return;
    }

    if (!isGeminiConfigured()) {
      res.status(503).json({
        error:
          "Server-side Gemini integration is not configured. Switch to Device Voice or set GEMINI_API_KEY in Settings > Secrets.",
      });
      return;
    }

    const abortController = new AbortController();
    res.on("close", () => {
      if (!res.writableEnded) {
        abortController.abort();
      }
    });

    try {
      let headersWritten = false;
      await streamSpokenExplanation(
        { text, style, language, voiceName },
        (pcmChunk) => {
          if (abortController.signal.aborted) return;
          if (!headersWritten) {
            headersWritten = true;
            res.status(200);
            res.setHeader("Content-Type", "application/octet-stream");
            res.setHeader("Cache-Control", "no-store");
            res.setHeader("X-Audio-Sample-Rate", "24000");
            res.setHeader("X-Audio-Format", "pcm-s16le");
            res.flushHeaders?.();
          }
          res.write(pcmChunk);
        },
        abortController.signal,
      );
      if (!res.writableEnded) {
        res.end();
      }
    } catch (err) {
      if (abortController.signal.aborted) return;
      const message =
        err instanceof Error ? err.message : "Failed to stream speech audio.";
      console.error("[PHYSIX AI] /api/tutor/speak-stream error:", message);
      if (res.headersSent) {
        if (!res.writableEnded) res.end();
        return;
      }
      if (message.includes("403") || message.includes("PERMISSION_DENIED")) {
        res.status(403).json({
          error:
            "The configured Gemini API key lacks permission. Verify the key in Settings > Secrets.",
        });
        return;
      }
      if (message.includes("429") || message.includes("RESOURCE_EXHAUSTED")) {
        res.status(429).json({
          error:
            "Gemini API quota limit reached. Please try again shortly or use Device Voice.",
        });
        return;
      }
      res.status(502).json({
        error:
          "Unable to stream AI voice audio right now. Please try again or switch to Device Voice.",
      });
    }
  });

  if (!IS_PRODUCTION) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("Application build not found. Run npm run build.");
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`PHYSIX AI server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start PHYSIX AI server:", err);
  process.exit(1);
});
