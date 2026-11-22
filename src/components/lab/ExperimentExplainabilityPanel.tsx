import { useEffect, useState } from "react";
import {
  BookOpen,
  Compass,
  Lightbulb,
  Loader2,
  Sparkles,
  Square,
  Volume2,
  X,
} from "lucide-react";
import { useStudentAvatar } from "../../context/StudentAvatarContext";
import {
  buildAiPromptContext,
  buildSpokenExplanationScript,
  EXPERIMENT_EXPLAINABILITY,
  normalizeForSpeech,
} from "../../lab/explainability";
import { LAB_QUESTS } from "../../lab/quests";
import type { LabExperimentState, StationId } from "../../lab/types";
import {
  labVoiceNarrator,
  useVoiceNarrator,
} from "../../lab/voiceNarrator";
import { type MentorVoiceName, requestTutorExplanation } from "../../services/api";
import { Button } from "../ui/Button";

interface ExperimentExplainabilityPanelProps {
  stationId: StationId;
  experimentState: LabExperimentState;
  variant?: "inline" | "overlay";
  onClose?: () => void;
}

const LANGUAGES = ["English", "Kannada", "Hindi"] as const;

const MENTOR_VOICES: readonly { id: MentorVoiceName; label: string }[] = [
  { id: "Zephyr", label: "Maya · Warm" },
  { id: "Puck", label: "Arjun · Lively" },
  { id: "Kore", label: "Ananya · Clear" },
  { id: "Charon", label: "Dr. Rao · Calm" },
];

export function ExperimentExplainabilityPanel({
  stationId,
  experimentState,
  variant = "inline",
  onClose,
}: ExperimentExplainabilityPanelProps) {
  const { avatar } = useStudentAvatar();
  const [aiLanguage, setAiLanguage] = useState<(typeof LANGUAGES)[number]>("English");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const voice = useVoiceNarrator();

  const info = EXPERIMENT_EXPLAINABILITY[stationId];
  const quest = LAB_QUESTS[stationId];
  const liveInsight = info.interpretLiveState(experimentState);

  const stationVoiceKey = `station:${stationId}`;
  const aiVoiceKey = `ai:${stationId}`;
  const isSpeakingStation =
    voice.activeKey === stationVoiceKey && voice.status !== "idle";
  const isSpeakingAi =
    voice.activeKey === aiVoiceKey && voice.status !== "idle";

  useEffect(() => {
    setAiResponse(null);
    setAiError(null);
    labVoiceNarrator.clearError();
  }, [stationId]);

  const handleAskAi = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const result = await requestTutorExplanation({
        question: buildAiPromptContext(stationId, experimentState),
        subject: quest.discipline,
        classLevel: avatar.classLevel,
        board: avatar.board,
        language: aiLanguage,
      });
      setAiResponse(result.explanation);
    } catch (err) {
      setAiError(
        err instanceof Error
          ? err.message
          : "Unable to reach the AI tutor right now.",
      );
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <section
      aria-label={`Scientific explainability for ${quest.title}`}
      className={
        variant === "overlay"
          ? "rounded-xl border border-[#E5E4E2] bg-[#FAF8F5]/95 p-4 shadow-lg space-y-4 max-h-full overflow-y-auto"
          : "border-t border-[#E5E4E2] bg-[#FAF8F5] px-5 py-6 sm:px-6 space-y-5"
      }
    >
      {/* Section Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-x-2 text-xs text-[#786D65]">
            <span className="font-mono text-[#6F4E37] font-medium">
              Experiment Explainability · {quest.stationNumber}
            </span>
            <span aria-hidden="true">·</span>
            <span>{info.governingPrinciple}</span>
          </div>
          <h4 className="font-display text-lg font-semibold text-[#231B16]">
            How {quest.title} Works
          </h4>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Voice Engine Selector */}
          <div
            role="group"
            aria-label="Voice narration engine"
            className="inline-flex items-center gap-0.5 rounded-lg border border-[#E5E4E2] bg-white p-0.5"
          >
            {(
              [
                { id: "ai", label: "AI Voice" },
                { id: "device", label: "Device Voice" },
              ] as const
            ).map((opt) => {
              const active = voice.engine === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => labVoiceNarrator.setEngine(opt.id)}
                  className={[
                    "px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap cursor-pointer transition-colors",
                    active
                      ? "bg-[#E6E0F0] text-[#42335C]"
                      : "text-[#5C5149] hover:text-[#231B16]",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {voice.engine === "ai" ? (
            <select
              aria-label="Select human mentor voice"
              value={voice.voiceName}
              onChange={(e) =>
                labVoiceNarrator.setVoiceName(e.target.value as MentorVoiceName)
              }
              className="min-h-[34px] rounded-lg border border-[#E5E4E2] bg-white px-2 text-xs text-[#231B16]"
            >
              {MENTOR_VOICES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          ) : null}

          <Button
            variant={isSpeakingStation ? "secondary" : "primary"}
            size="md"
            onClick={() =>
              void labVoiceNarrator.speak(
                stationVoiceKey,
                buildSpokenExplanationScript(
                  stationId,
                  experimentState,
                  avatar.name,
                ),
              )
            }
          >
            {isSpeakingStation && voice.status === "loading" ? (
              <>
                <Loader2
                  className="h-3.5 w-3.5 inline mr-1.5 animate-spin"
                  aria-hidden="true"
                />
                Preparing Audio...
              </>
            ) : isSpeakingStation ? (
              <>
                <Square
                  className="h-3.5 w-3.5 inline mr-1.5"
                  aria-hidden="true"
                />
                Stop Speaking
              </>
            ) : (
              <>
                <Volume2
                  className="h-3.5 w-3.5 inline mr-1.5"
                  aria-hidden="true"
                />
                Speak Experiment
              </>
            )}
          </Button>

          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close explainability panel"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E5E4E2] bg-white text-[#231B16] hover:bg-[#F4F1EC] cursor-pointer shrink-0"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>

      {voice.error ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-[#9E2A2B]/30 bg-[#FBEAEA] px-3.5 py-2 text-xs text-[#9E2A2B]">
          <span>{voice.error}</span>
          <button
            type="button"
            onClick={() => labVoiceNarrator.clearError()}
            className="font-medium underline cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {/* Live Apparatus Observation Analyzer */}
      <div className="rounded-xl border border-[#DCD3EB] bg-[#F3EFF9] p-4 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 font-semibold text-[#42335C]">
            <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Live Observation Analysis</span>
          </span>
          <span className="font-mono text-[#42335C] font-medium">
            {liveInsight.statusLabel}
          </span>
        </div>
        <p className="text-sm text-[#231B16] leading-relaxed">
          {liveInsight.summary}
        </p>
        <p className="text-xs text-[#42335C] font-medium">
          Try next: {liveInsight.nextStep}
        </p>
      </div>

      {/* Core Concept, Formula & Guided Steps */}
      <div
        className={
          variant === "overlay"
            ? "space-y-4"
            : "grid grid-cols-1 lg:grid-cols-12 gap-5 items-start"
        }
      >
        {/* Left: Formula & Variables */}
        <div className="lg:col-span-5 rounded-xl border border-[#E5E4E2] bg-white p-4 space-y-3">
          <div className="space-y-1">
            <span className="text-xs font-medium text-[#786D65]">
              Governing Equation
            </span>
            <p className="font-mono text-base font-semibold text-[#6F4E37] tabular-nums">
              {info.formula}
            </p>
          </div>
          <dl className="space-y-1.5 pt-2 border-t border-[#E5E4E2] text-xs">
            {info.variables.map((item) => (
              <div key={item.symbol} className="flex items-baseline gap-2.5">
                <dt className="font-mono font-semibold text-[#42335C] min-w-[54px] shrink-0">
                  {item.symbol}
                </dt>
                <dd className="text-[#5C5149]">{item.meaning}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Right: Why It Happens + 3-Step Guide + Real World */}
        <div className="lg:col-span-7 rounded-xl border border-[#E5E4E2] bg-white p-4 space-y-3.5">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6F4E37]">
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Why It Happens</span>
            </span>
            <p className="text-sm text-[#231B16] leading-relaxed">
              {info.whyItHappens}
            </p>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-[#E5E4E2]">
            <span className="text-xs font-semibold text-[#231B16]">
              What to Observe Step-by-Step
            </span>
            <ol className="space-y-1 text-xs sm:text-sm text-[#5C5149] list-decimal list-inside">
              {info.observationGuide.map((step, idx) => (
                <li key={idx} className="leading-relaxed">
                  {step}
                </li>
              ))}
            </ol>
          </div>

          <div className="pt-2 border-t border-[#E5E4E2] flex items-start gap-2 text-xs text-[#5C5149]">
            <Compass
              className="h-3.5 w-3.5 text-[#6F4E37] mt-0.5 shrink-0"
              aria-hidden="true"
            />
            <span>
              <strong className="text-[#231B16] font-medium">
                Real-World Use:
              </strong>{" "}
              {info.realWorldApplication}
            </span>
          </div>
        </div>
      </div>

      {/* Live AI Tutor Deep-Dive Contextualized to Student Avatar Profile */}
      <div className="rounded-xl border border-[#E5E4E2] bg-white p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-[#231B16]">
              AI Deep-Dive for {avatar.name || "Student"} ({avatar.classLevel} ·{" "}
              {avatar.board})
            </p>
            <p className="text-xs text-[#786D65]">
              Generates a custom explanation using your current apparatus readings
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <select
              aria-label="Select AI explanation language"
              value={aiLanguage}
              onChange={(e) =>
                setAiLanguage(e.target.value as (typeof LANGUAGES)[number])
              }
              className="min-h-[38px] rounded-lg border border-[#E5E4E2] bg-[#FAF8F5] px-2.5 text-xs text-[#231B16]"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>

            <Button
              variant="primary"
              size="md"
              onClick={() => void handleAskAi()}
              disabled={aiLoading}
            >
              {aiLoading ? (
                <>
                  <Loader2
                    className="h-3.5 w-3.5 inline mr-1.5 animate-spin"
                    aria-hidden="true"
                  />
                  Explaining...
                </>
              ) : (
                <>
                  <Sparkles
                    className="h-3.5 w-3.5 inline mr-1.5"
                    aria-hidden="true"
                  />
                  Explain Current Readings
                </>
              )}
            </Button>
          </div>
        </div>

        {aiError ? (
          <p className="rounded-lg border border-[#9E2A2B]/30 bg-[#FBEAEA] px-3 py-2 text-xs text-[#9E2A2B]">
            {aiError}
          </p>
        ) : null}

        {aiResponse ? (
          <div className="rounded-lg border border-[#E5E4E2] bg-[#FAF8F5] p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#E5E4E2]">
              <span className="text-xs font-medium text-[#42335C]">
                AI Explanation ({aiLanguage})
              </span>
              <button
                type="button"
                onClick={() =>
                  void labVoiceNarrator.speak(
                    aiVoiceKey,
                    normalizeForSpeech(aiResponse),
                    { language: aiLanguage },
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-md border border-[#E5E4E2] bg-white px-2.5 py-1 text-xs font-medium text-[#6F4E37] hover:bg-[#F3EFF9] cursor-pointer"
              >
                {isSpeakingAi && voice.status === "loading" ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                    <span>Loading Voice...</span>
                  </>
                ) : isSpeakingAi ? (
                  <>
                    <Square className="h-3 w-3" aria-hidden="true" />
                    <span>Stop Reading</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="h-3 w-3" aria-hidden="true" />
                    <span>Speak AI Answer</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-sm text-[#231B16] whitespace-pre-wrap leading-relaxed">
              {aiResponse}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
