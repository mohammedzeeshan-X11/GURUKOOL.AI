import { useMemo, useState } from "react";
import {
  Award,
  Camera,
  CheckCircle2,
  FlaskConical,
  Footprints,
  Glasses,
  Loader2,
  SlidersHorizontal,
  Square,
  Volume2,
} from "lucide-react";
import { StudentAvatarSvg } from "../components/avatar/StudentAvatarSvg";
import { VirtualLaboratory } from "../components/lab/VirtualLaboratory";
import { VirtualLabViewport } from "../components/lab/VirtualLabViewport";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { SectionHeader } from "../components/ui/SectionHeader";
import { useStudentAvatar } from "../context/StudentAvatarContext";
import {
  buildSpokenExplanationScript,
  LAB_LANGUAGE_OPTIONS,
} from "../lab/explainability";
import {
  buildProgressSnapshot,
  INITIAL_EXPERIMENT_STATE,
  LAB_QUESTS,
} from "../lab/quests";
import type { StationId } from "../lab/types";
import {
  labVoiceNarrator,
  useVoiceNarrator,
} from "../lab/voiceNarrator";
import { useRouter } from "../router/RouterContext";
import type { TutorLanguage } from "../types/navigation";

const STATIONS: readonly StationId[] = [
  "pendulum",
  "optics",
  "titration",
  "circuit",
  "electrolysis",
  "photosynthesis",
  "microscope",
  "projectile",
  "boyles",
  "wave",
  "dna",
  "trig",
];

type DisciplineFilter =
  | "All STEM"
  | "Physics"
  | "Chemistry"
  | "Biology"
  | "Mathematics";

const DISCIPLINE_TABS: readonly DisciplineFilter[] = [
  "All STEM",
  "Physics",
  "Chemistry",
  "Biology",
  "Mathematics",
];

const INITIAL_COMPLETED: Record<StationId, boolean> = {
  pendulum: false,
  optics: false,
  titration: false,
  circuit: false,
  electrolysis: false,
  photosynthesis: false,
  microscope: false,
  projectile: false,
  boyles: false,
  wave: false,
  dna: false,
  trig: false,
};

export function LaboratoriesPage() {
  const { navigate } = useRouter();
  const { avatar, updateAvatar, setCustomizerOpen } = useStudentAvatar();
  const voice = useVoiceNarrator();
  const [labActive, setLabActive] = useState(false);
  const [entryStation, setEntryStation] = useState<StationId>("pendulum");
  const [disciplineFilter, setDisciplineFilter] =
    useState<DisciplineFilter>("All STEM");
  const [completedQuests, setCompletedQuests] =
    useState<Record<StationId, boolean>>(INITIAL_COMPLETED);

  const enterAtStation = (station: StationId) => {
    setEntryStation(station);
    setLabActive(true);
  };

  const filteredStations = useMemo(() => {
    if (disciplineFilter === "All STEM") return STATIONS;
    return STATIONS.filter(
      (id) => LAB_QUESTS[id].discipline === disciplineFilter,
    );
  }, [disciplineFilter]);

  const totalXp = useMemo(
    () => STATIONS.reduce((sum, id) => sum + LAB_QUESTS[id].xpReward, 0),
    [],
  );

  const progress = useMemo(
    () => buildProgressSnapshot(completedQuests),
    [completedQuests],
  );
  const completedCount = useMemo(
    () => STATIONS.filter((id) => completedQuests[id]).length,
    [completedQuests],
  );

  if (labActive) {
    return (
      <VirtualLabViewport
        initialStation={entryStation}
        completedQuests={completedQuests}
        onQuestsChange={setCompletedQuests}
        onExitLab={() => setLabActive(false)}
      />
    );
  }

  return (
    <div className="space-y-10">
      <SectionHeader
        indexLabel="Laboratories"
        title="AR / VR Gamified STEM Laboratory"
        description="Perform 12 interactive experiments across Physics, Chemistry, Biology, and Mathematics inside the workbench below or inside the walkable 3D / AR / VR pavilion."
        action={
          <Button
            variant="primary"
            size="lg"
            onClick={() => enterAtStation("pendulum")}
          >
            Enter 3D / AR / VR Lab
          </Button>
        }
      />

      {/* Student Researcher Avatar & Progress Bar */}
      <Card
        tone="surface"
        padding="sm"
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <StudentAvatarSvg avatar={avatar} size="md" />
          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-x-2 text-xs text-[var(--text-muted)]">
              <span className="font-medium text-[var(--accent-mocha)]">
                Student Researcher
              </span>
              <span aria-hidden="true">·</span>
              <span>{avatar.classLevel}</span>
              <span aria-hidden="true">·</span>
              <span>{avatar.board}</span>
            </div>
            <p className="text-base font-semibold text-[var(--text-primary)]">
              {avatar.name || "Student"} ·{" "}
              <span className="text-[var(--accent-lavender-ink)]">
                {progress.rankTitle}
              </span>
            </p>
            <p className="text-xs font-mono tabular-nums text-[var(--text-secondary)]">
              {progress.xp} / {totalXp} XP · {completedCount}/{STATIONS.length} Experiments Completed
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <select
            aria-label="Preferred lab voice language"
            value={avatar.language}
            onChange={(e) => {
              labVoiceNarrator.stop();
              updateAvatar({ language: e.target.value as TutorLanguage });
            }}
            className="min-h-[38px] rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-2.5 text-xs font-medium text-[var(--text-primary)] cursor-pointer"
          >
            {LAB_LANGUAGE_OPTIONS.map((lang) => (
              <option key={lang.id} value={lang.id}>
                {lang.label}
              </option>
            ))}
          </select>

          <Button
            variant="secondary"
            size="md"
            onClick={() => setCustomizerOpen(true)}
            className="shrink-0"
          >
            <SlidersHorizontal
              className="h-3.5 w-3.5 inline mr-1.5"
              aria-hidden="true"
            />
            Customize Avatar
          </Button>
        </div>
      </Card>

      {/* Interactive 3D-Inspired Container Workbench */}
      <VirtualLaboratory
        completedQuests={completedQuests}
        onQuestsChange={setCompletedQuests}
        onLaunchImmersiveLab={enterAtStation}
      />

      {/* Entry Modes Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card tone="surface" padding="md" className="space-y-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F3ECE6] text-[var(--accent-mocha)]">
            <Footprints className="h-4 w-4" aria-hidden="true" />
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Walk-In 3D &amp; Bench Orbit
          </h3>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            Walk across the 12-station laboratory floor using WASD/touch controls or glide directly to any workbench.
          </p>
        </Card>

        <Card tone="lavender" padding="md" className="space-y-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[var(--accent-lavender-ink)]">
            <Glasses className="h-4 w-4" aria-hidden="true" />
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            WebXR VR Headset Support
          </h3>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            Launches immersive WebXR sessions with controller ray selection on compatible VR headsets and XR browsers.
          </p>
        </Card>

        <Card tone="surface" padding="md" className="space-y-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F3EFF9] text-[var(--accent-lavender-ink)]">
            <Camera className="h-4 w-4" aria-hidden="true" />
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            AR Tabletop Passthrough
          </h3>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            Supports WebXR AR passthrough and live camera-feed AR tabletop overlay so benches sit on your physical desk.
          </p>
        </Card>
      </div>

      {/* 12 Gamified STEM Experiment Stations */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-xl font-semibold text-[var(--text-primary)]">
              All STEM Experiment Quests ({STATIONS.length} Benches ·{" "}
              <span className="tabular-nums">{totalXp.toLocaleString()}</span>{" "}
              Total XP)
            </h3>
            <button
              type="button"
              onClick={() => navigate("/curriculum")}
              className="text-sm font-medium text-[var(--accent-mocha)] hover:underline cursor-pointer"
            >
              View Classes 6–10 Curriculum Slots
            </button>
          </div>

          <div
            role="tablist"
            aria-label="Filter experiments by STEM discipline"
            className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface-muted)] p-1"
          >
            {DISCIPLINE_TABS.map((tab) => {
              const active = tab === disciplineFilter;
              return (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setDisciplineFilter(tab)}
                  className={[
                    "min-h-[36px] px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors",
                    active
                      ? "bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-hairline)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent",
                  ].join(" ")}
                >
                  {tab}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {filteredStations.map((id) => {
            const quest = LAB_QUESTS[id];
            const isCompleted = completedQuests[id];
            return (
              <Card
                key={id}
                tone={isCompleted ? "lavender" : "surface"}
                padding="md"
                className="flex flex-col justify-between gap-5"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <span className="font-mono tabular-nums text-[var(--accent-mocha)]">
                      {quest.stationNumber} · {quest.discipline}
                    </span>
                    <span className="font-mono tabular-nums text-[var(--accent-lavender-ink)] font-medium">
                      +{quest.xpReward} XP
                    </span>
                  </div>

                  <h4 className="text-base font-semibold text-[var(--text-primary)] flex items-center justify-between gap-2">
                    <span>{quest.title}</span>
                    {isCompleted ? (
                      <CheckCircle2
                        className="h-4 w-4 text-[#2D6A4F] shrink-0"
                        aria-hidden="true"
                      />
                    ) : null}
                  </h4>

                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                    {quest.objective}
                  </p>

                  <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] pt-1">
                    <Award
                      className="h-3.5 w-3.5 text-[var(--accent-mocha)] shrink-0"
                      aria-hidden="true"
                    />
                    <span>Badge: {quest.badgeTitle}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => enterAtStation(id)}
                    className="flex-1"
                  >
                    <FlaskConical
                      className="h-4 w-4 inline mr-1.5"
                      aria-hidden="true"
                    />
                    Perform in 3D
                  </Button>

                  <Button
                    variant={
                      voice.activeKey === `card:${id}:${avatar.language}` &&
                      voice.status !== "idle"
                        ? "primary"
                        : "ghost"
                    }
                    size="md"
                    aria-label={`Listen to explanation for ${quest.title}`}
                    onClick={() =>
                      void labVoiceNarrator.speak(
                        `card:${id}:${avatar.language}`,
                        buildSpokenExplanationScript(
                          id,
                          INITIAL_EXPERIMENT_STATE,
                          avatar.name,
                          avatar.language,
                        ),
                        { language: avatar.language },
                      )
                    }
                  >
                    {voice.activeKey === `card:${id}:${avatar.language}` &&
                    voice.status === "loading" ? (
                      <Loader2
                        className="h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                    ) : voice.activeKey === `card:${id}:${avatar.language}` &&
                      voice.status === "speaking" ? (
                      <Square className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Volume2 className="h-4 w-4" aria-hidden="true" />
                    )}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
