import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  Box,
  CheckCircle2,
  FlaskConical,
  ImagePlus,
  Loader2,
  Sparkles,
  Square,
  Volume2,
  X,
} from "lucide-react";
import { VirtualLabViewport } from "../components/lab/VirtualLabViewport";
import { DynamicConcept3DViewer } from "../components/tutor/DynamicConcept3DViewer";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { SectionHeader } from "../components/ui/SectionHeader";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../components/ui/StateFeedback";
import { useStudentAvatar } from "../context/StudentAvatarContext";
import { EMPTY_COMPLETED_QUESTS, LAB_QUESTS } from "../lab/quests";
import type { StationId } from "../lab/types";
import { labVoiceNarrator, useVoiceNarrator } from "../lab/voiceNarrator";
import { requestTutorExplanation } from "../services/api";
import type {
  ClassLevel,
  CurriculumBoard,
  SubjectArea,
  TutorLanguage,
} from "../types/navigation";
import type { TutorConceptResponse } from "../types/simulation3d";

const SUBJECT_OPTIONS: readonly SubjectArea[] = [
  "Physics",
  "Chemistry",
  "Biology",
];

const CLASS_OPTIONS: readonly ClassLevel[] = [
  "Class 6",
  "Class 7",
  "Class 8",
  "Class 9",
  "Class 10",
];

const BOARD_OPTIONS: readonly CurriculumBoard[] = [
  "NCERT / CBSE",
  "Karnataka State Board",
];

const LANGUAGE_OPTIONS: readonly TutorLanguage[] = [
  "English",
  "Kannada",
  "Hindi",
];

const NCERT_PRESETS: readonly {
  label: string;
  subject: SubjectArea;
  classLevel: ClassLevel;
  prompt: string;
}[] = [
  {
    label: "Glass Slab Refraction",
    subject: "Physics",
    classLevel: "Class 10",
    prompt:
      "NCERT Class 10 Activity: Refraction of light through a rectangular glass slab — explain lateral displacement and Snell's law with an interactive 3D ray simulation.",
  },
  {
    label: "Faraday's Induction",
    subject: "Physics",
    classLevel: "Class 10",
    prompt:
      "Electromagnetic induction: Moving a bar magnet into a copper coil connected to a galvanometer (NCERT Class 10 Magnetic Effects of Electric Current).",
  },
  {
    label: "Archimedes' Buoyancy",
    subject: "Physics",
    classLevel: "Class 9",
    prompt:
      "NCERT Class 9 Gravitation: Archimedes' principle — why a dense iron block sinks while a lighter block floats in water, showing upward buoyant force.",
  },
  {
    label: "Rutherford Gold Foil",
    subject: "Chemistry",
    classLevel: "Class 9",
    prompt:
      "NCERT Class 9 Structure of the Atom: Rutherford's alpha-particle scattering experiment on thin gold foil showing deflection by the dense positive nucleus.",
  },
  {
    label: "Neutralization Reaction",
    subject: "Chemistry",
    classLevel: "Class 10",
    prompt:
      "NCERT Class 10 Acids, Bases and Salts: Adding NaOH base into HCl acid with phenolphthalein indicator showing neutralization and salt-water formation.",
  },
  {
    label: "Human Heart Circulation",
    subject: "Biology",
    classLevel: "Class 10",
    prompt:
      "NCERT Class 10 Life Processes: Double circulation of oxygenated and deoxygenated blood through the four chambers of the human heart and lungs.",
  },
  {
    label: "Stomata & Transpiration",
    subject: "Biology",
    classLevel: "Class 10",
    prompt:
      "NCERT Class 10 Life Processes: Opening and closing of stomatal pore by guard cells and water vapour release during transpiration.",
  },
];

export function TutorPage() {
  const { avatar, updateAvatar } = useStudentAvatar();
  const voice = useVoiceNarrator();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [subject, setSubject] = useState<SubjectArea>("Physics");
  const [classLevel, setClassLevel] = useState<ClassLevel>(avatar.classLevel);
  const [board, setBoard] = useState<CurriculumBoard>(avatar.board);
  const language = avatar.language;
  const [question, setQuestion] = useState("");

  const [uploadedImage, setUploadedImage] = useState<{
    previewUrl: string;
    base64: string;
    mimeType: string;
    fileName: string;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TutorConceptResponse | null>(null);

  // Optional direct launch into full 3D Lab when concept matches a built-in bench
  const [labStationLaunch, setLabStationLaunch] = useState<StationId | null>(
    null,
  );
  const [completedQuests, setCompletedQuests] =
    useState<Record<StationId, boolean>>(() => ({ ...EMPTY_COMPLETED_QUESTS }));

  const handleImagePick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Please upload a PNG, JPG, or WebP image of your NCERT page or diagram.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      const commaIdx = dataUrl.indexOf(",");
      if (commaIdx === -1) return;
      setUploadedImage({
        previewUrl: dataUrl,
        base64: dataUrl.slice(commaIdx + 1),
        mimeType: file.type,
        fileName: file.name,
      });
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const runGeneration = async (
    promptText: string,
    targetSubject: SubjectArea,
    targetClass: ClassLevel,
  ) => {
    const trimmed = promptText.trim();
    if (!trimmed && !uploadedImage) {
      setError(
        "Enter an NCERT experiment or science concept, or upload a textbook diagram.",
      );
      return;
    }

    labVoiceNarrator.stop();
    setIsLoading(true);
    setError(null);

    try {
      const response = await requestTutorExplanation({
        question: trimmed,
        subject: targetSubject,
        classLevel: targetClass,
        board,
        language,
        imageBase64: uploadedImage?.base64,
        imageMimeType: uploadedImage?.mimeType,
      });
      setResult(response);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to generate explanation and 3D simulation right now.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void runGeneration(question, subject, classLevel);
  };

  if (labStationLaunch) {
    return (
      <VirtualLabViewport
        initialStation={labStationLaunch}
        completedQuests={completedQuests}
        onQuestsChange={setCompletedQuests}
        onExitLab={() => setLabStationLaunch(null)}
      />
    );
  }

  const matchedStation =
    result &&
    result.matchingLabStation &&
    result.matchingLabStation !== "none" &&
    result.matchingLabStation in LAB_QUESTS
      ? (result.matchingLabStation as StationId)
      : null;

  const speechKey = result ? `tutor:${result.title}:${language}` : "";
  const isSpeaking =
    Boolean(speechKey) &&
    voice.activeKey === speechKey &&
    voice.status === "speaking";
  const isSpeechLoading =
    Boolean(speechKey) &&
    voice.activeKey === speechKey &&
    voice.status === "loading";

  return (
    <div className="space-y-8">
      <SectionHeader
        indexLabel="AI Tutor · 3D Generator"
        title="NCERT Concept Explainer & Live 3D Simulator"
        description="Paste any NCERT science experiment, ask any Physics, Chemistry, or Biology concept, or upload a textbook diagram — AI Tutor explains it step by step and builds an interactive 3D simulation on the spot."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Input Form & Quick NCERT Presets */}
        <div className="lg:col-span-4 space-y-4">
          <Card tone="surface" padding="md">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1 text-sm">
                  <span className="block text-xs font-medium text-[var(--text-secondary)]">
                    Subject
                  </span>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value as SubjectArea)}
                    className="w-full min-h-[40px] rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-2.5 text-sm text-[var(--text-primary)]"
                  >
                    {SUBJECT_OPTIONS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 text-sm">
                  <span className="block text-xs font-medium text-[var(--text-secondary)]">
                    Class
                  </span>
                  <select
                    value={classLevel}
                    onChange={(e) => setClassLevel(e.target.value as ClassLevel)}
                    className="w-full min-h-[40px] rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-2.5 text-sm text-[var(--text-primary)]"
                  >
                    {CLASS_OPTIONS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 text-sm">
                  <span className="block text-xs font-medium text-[var(--text-secondary)]">
                    Board
                  </span>
                  <select
                    value={board}
                    onChange={(e) =>
                      setBoard(e.target.value as CurriculumBoard)
                    }
                    className="w-full min-h-[40px] rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-2.5 text-sm text-[var(--text-primary)]"
                  >
                    {BOARD_OPTIONS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 text-sm">
                  <span className="block text-xs font-medium text-[var(--text-secondary)]">
                    Language
                  </span>
                  <select
                    value={language}
                    onChange={(e) => {
                      labVoiceNarrator.stop();
                      updateAvatar({
                        language: e.target.value as TutorLanguage,
                      });
                    }}
                    className="w-full min-h-[40px] rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-2.5 text-sm text-[var(--text-primary)]"
                  >
                    {LANGUAGE_OPTIONS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block space-y-1.5">
                <span className="block text-xs font-medium text-[var(--text-secondary)]">
                  NCERT Experiment or Science Concept
                </span>
                <textarea
                  rows={4}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Example: Explain refraction through a rectangular glass slab, or Rutherford's gold foil experiment, or human heart double circulation..."
                  className="w-full rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-y"
                />
              </label>

              {/* Optional NCERT Textbook Diagram Upload */}
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleImagePick}
                  className="hidden"
                />
                {uploadedImage ? (
                  <div className="flex items-center gap-3 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-2">
                    <img
                      src={uploadedImage.previewUrl}
                      alt="Uploaded NCERT diagram"
                      className="h-12 w-12 rounded-md object-cover border border-[var(--border-hairline)] shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                        {uploadedImage.fileName}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        Textbook diagram attached
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedImage(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      aria-label="Remove uploaded image"
                      className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-white hover:text-[var(--text-primary)] cursor-pointer"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 py-2.5 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--accent-mocha)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  >
                    <ImagePlus className="h-4 w-4" aria-hidden="true" />
                    <span>Upload NCERT Diagram / Textbook Photo (Optional)</span>
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isLoading}
                  className="flex-1"
                >
                  <Sparkles className="h-4 w-4 inline mr-1.5" aria-hidden="true" />
                  Explain &amp; Generate 3D
                </Button>
                {result || error || question || uploadedImage ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      labVoiceNarrator.stop();
                      setQuestion("");
                      setUploadedImage(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                      setResult(null);
                      setError(null);
                    }}
                  >
                    Clear
                  </Button>
                ) : null}
              </div>
            </form>
          </Card>

          {/* Quick 1-Click NCERT Experiments */}
          <Card tone="surface" padding="sm" className="space-y-2.5">
            <p className="text-xs font-semibold text-[var(--text-secondary)]">
              Try an NCERT Experiment Instant 3D Demo
            </p>
            <div className="flex flex-wrap gap-1.5">
              {NCERT_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    setSubject(preset.subject);
                    setClassLevel(preset.classLevel);
                    setQuestion(preset.prompt);
                    void runGeneration(
                      preset.prompt,
                      preset.subject,
                      preset.classLevel,
                    );
                  }}
                  className="rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--accent-mocha)] hover:bg-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column: Generated Live 3D Simulation + Structured NCERT Explanation */}
        <div className="lg:col-span-8 space-y-5">
          {isLoading ? (
            <LoadingState
              title="Generating explanation & 3D simulation"
              message={`Building an interactive 3D model and ${language} NCERT explanation for ${classLevel} ${subject}...`}
            />
          ) : error ? (
            <ErrorState title="Unable to generate simulation" message={error} />
          ) : result ? (
            <>
              {/* Interactive Generated 3D Simulation Canvas */}
              <DynamicConcept3DViewer spec={result.scene3d} />

              {/* Matching Full 3D Lab Bench Shortcut if available */}
              {matchedStation ? (
                <Card
                  tone="lavender"
                  padding="sm"
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-[var(--accent-lavender-ink)]">
                      Dedicated 3D Laboratory Apparatus Available
                    </p>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      Station {LAB_QUESTS[matchedStation].stationNumber}:{" "}
                      {LAB_QUESTS[matchedStation].title}
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => setLabStationLaunch(matchedStation)}
                    className="shrink-0"
                  >
                    <FlaskConical
                      className="h-4 w-4 inline mr-1.5"
                      aria-hidden="true"
                    />
                    Open Full Bench in 3D / AR / VR
                  </Button>
                </Card>
              ) : null}

              {/* Structured NCERT Explanation Card */}
              <Card tone="surface" padding="md" className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-[var(--border-hairline)]">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-[var(--accent-mocha)]">
                      {result.ncertTag} · {language}
                    </p>
                    <h3 className="text-xl font-semibold text-[var(--text-primary)]">
                      {result.title}
                    </h3>
                    {result.formula ? (
                      <p className="inline-block font-mono text-xs text-[#2F4368] bg-[#EEF2F7] rounded-md px-2.5 py-1 mt-1">
                        {result.formula}
                      </p>
                    ) : null}
                  </div>

                  <Button
                    variant={isSpeaking ? "primary" : "secondary"}
                    size="md"
                    onClick={() => {
                      const spokenText = [
                        result.title,
                        result.summary,
                        result.explanation,
                      ]
                        .filter(Boolean)
                        .join(". ")
                        .slice(0, 2200);
                      void labVoiceNarrator.speak(speechKey, spokenText, {
                        language,
                      });
                    }}
                  >
                    {isSpeechLoading ? (
                      <Loader2
                        className="h-4 w-4 inline mr-1.5 animate-spin"
                        aria-hidden="true"
                      />
                    ) : isSpeaking ? (
                      <Square
                        className="h-4 w-4 inline mr-1.5"
                        aria-hidden="true"
                      />
                    ) : (
                      <Volume2
                        className="h-4 w-4 inline mr-1.5"
                        aria-hidden="true"
                      />
                    )}
                    {isSpeaking ? "Stop Voice" : `Listen (${language})`}
                  </Button>
                </div>

                {result.summary ? (
                  <p className="text-sm sm:text-base font-medium text-[var(--text-primary)] leading-relaxed bg-[var(--bg-canvas)] rounded-lg p-3.5 border border-[var(--border-hairline)]">
                    {result.summary}
                  </p>
                ) : null}

                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Step-by-Step Explanation
                  </h4>
                  <div className="whitespace-pre-wrap text-sm sm:text-base text-[var(--text-primary)] leading-relaxed">
                    {result.explanation}
                  </div>
                </div>

                {result.observations.length > 0 ? (
                  <div className="space-y-2 pt-2 border-t border-[var(--border-hairline)]">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      Key Observations in This 3D Simulation
                    </h4>
                    <ul className="space-y-1.5">
                      {result.observations.map((obs, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-sm text-[var(--text-secondary)]"
                        >
                          <CheckCircle2
                            className="h-4 w-4 text-[#2D6A4F] shrink-0 mt-0.5"
                            aria-hidden="true"
                          />
                          <span>{obs}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {result.realWorldApplication ? (
                  <div className="rounded-lg bg-[#F1F6F2] border border-[#D4E6D9] px-3.5 py-2.5 text-sm text-[#234733]">
                    <span className="font-semibold">Real-World Connection: </span>
                    {result.realWorldApplication}
                  </div>
                ) : null}
              </Card>
            </>
          ) : (
            <EmptyState
              title="Type any NCERT experiment or concept to generate a 3D simulation"
              message="Pick one of the NCERT quick experiments on the left, type your own Physics/Chemistry/Biology concept, or upload a textbook diagram photo to see both an interactive 3D simulation and a clear multilingual explanation."
              icon={<Box className="h-5 w-5" aria-hidden="true" />}
            />
          )}
        </div>
      </div>
    </div>
  );
}
