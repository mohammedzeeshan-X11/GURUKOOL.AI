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
  Sparkles,
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
  EMPTY_COMPLETED_QUESTS,
  INITIAL_EXPERIMENT_STATE,
  LAB_QUESTS,
  LAB_ROOMS,
  ROOM_ORDER,
  ROOM_STATIONS,
  STATION_ORDER,
} from "../lab/quests";
import type { LabRoomId, StationId } from "../lab/types";
import {
  labVoiceNarrator,
  useVoiceNarrator,
} from "../lab/voiceNarrator";
import { useRouter } from "../router/RouterContext";
import type { TutorLanguage } from "../types/navigation";

type RoomFilter = "all" | LabRoomId;

export function LaboratoriesPage() {
  const { navigate } = useRouter();
  const { avatar, updateAvatar, setCustomizerOpen } = useStudentAvatar();
  const voice = useVoiceNarrator();
  const [labActive, setLabActive] = useState(false);
  const [entryStation, setEntryStation] = useState<StationId>("pendulum");
  const [roomFilter, setRoomFilter] = useState<RoomFilter>("all");
  const [completedQuests, setCompletedQuests] =
    useState<Record<StationId, boolean>>(() => ({ ...EMPTY_COMPLETED_QUESTS }));

  const enterAtStation = (station: StationId) => {
    setEntryStation(station);
    setLabActive(true);
  };

  const filteredStations = useMemo(() => {
    return roomFilter === "all" ? STATION_ORDER : ROOM_STATIONS[roomFilter];
  }, [roomFilter]);

  const totalXp = useMemo(
    () => STATION_ORDER.reduce((sum, id) => sum + LAB_QUESTS[id].xpReward, 0),
    [],
  );

  const progress = useMemo(
    () => buildProgressSnapshot(completedQuests),
    [completedQuests],
  );
  const completedCount = useMemo(
    () => STATION_ORDER.filter((id) => completedQuests[id]).length,
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
        title="Pocket Labs · 3D / AR / VR Subject Laboratories"
        description="Explore 24 foundational & advanced NCERT science experiments across 3 dedicated walkable 3D rooms — Physics Laboratory (01–10), Chemistry Laboratory (11–17), and Biology Laboratory (18–24)."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              size="md"
              onClick={() => enterAtStation("pendulum")}
            >
              Physics Lab
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => enterAtStation("titration")}
            >
              Chemistry Lab
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => enterAtStation("photosynthesis")}
            >
              Biology Lab
            </Button>
          </div>
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
              {progress.xp} / {totalXp} XP · {completedCount}/{STATION_ORDER.length} Experiments Completed
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

      {/* Three Dedicated Subject 3D Laboratory Rooms */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {ROOM_ORDER.map((roomId, idx) => {
          const roomInfo = LAB_ROOMS[roomId];
          const roomDone = ROOM_STATIONS[roomId].filter(
            (id) => completedQuests[id],
          ).length;
          const accentBadgeClass =
            roomId === "physics"
              ? "text-[#2F4368]"
              : roomId === "chemistry"
                ? "text-[#6F4E37]"
                : "text-[#2D6A4F]";

          return (
            <Card
              key={roomId}
              tone={roomId === "physics" ? "lavender" : "surface"}
              padding="md"
              className="flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span
                    className={[
                      "font-mono tabular-nums font-semibold",
                      accentBadgeClass,
                    ].join(" ")}
                  >
                    Room {idx + 1} · {roomInfo.stationRange}
                  </span>
                  <span className="font-mono tabular-nums text-[var(--text-muted)]">
                    {roomDone}/{ROOM_STATIONS[roomId].length} Done
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                    {roomInfo.name}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    {roomInfo.wingBadge}
                  </p>
                </div>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                  {roomInfo.description}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  variant={roomId === "physics" ? "primary" : "secondary"}
                  size="md"
                  onClick={() => enterAtStation(roomInfo.defaultStation)}
                >
                  Enter {roomInfo.shortLabel}
                </Button>
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => setRoomFilter(roomId)}
                >
                  Filter ({ROOM_STATIONS[roomId].length})
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Interactive 2D Workbench Quick Preview */}
      <VirtualLaboratory
        completedQuests={completedQuests}
        onQuestsChange={setCompletedQuests}
        onLaunchImmersiveLab={enterAtStation}
      />

      {/* Entry Modes Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card tone="surface" padding="md" className="space-y-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EEF2F7] text-[#2F4368]">
            <Footprints className="h-4 w-4" aria-hidden="true" />
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            3 Subject Rooms &amp; 3D Portals
          </h3>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            Walk across 24 detailed science benches in Physics, Chemistry, and Biology wings via WASD/touch with animated avatar hand interactions or click the South-wall 3D doorways to move between rooms.
          </p>
        </Card>

        <Card tone="lavender" padding="md" className="space-y-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[var(--accent-lavender-ink)]">
            <Glasses className="h-4 w-4" aria-hidden="true" />
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            WebXR &amp; Stereo VR Support
          </h3>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            Launches native WebXR headset sessions or split-screen Stereo 3D VR right in the browser with ray-click bench interaction.
          </p>
        </Card>

        <Card tone="surface" padding="md" className="space-y-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F1F6F2] text-[#2D6A4F]">
            <Camera className="h-4 w-4" aria-hidden="true" />
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            AR Tabletop Passthrough
          </h3>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            Isolate any apparatus onto your desk with WebXR AR passthrough or live camera-feed tabletop projection and pinch/slider scaling.
          </p>
        </Card>
      </div>

      {/* 18 Detailed Science Experiment Stations */}
      <div className="space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-xl font-semibold text-[var(--text-primary)]">
              Science Experiment Quests ({STATION_ORDER.length} Benches ·{" "}
              <span className="tabular-nums">{totalXp.toLocaleString()}</span>{" "}
              Total XP)
            </h3>
            <button
              type="button"
              onClick={() => navigate("/tutor")}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent-mocha)] hover:underline cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Need another NCERT concept? Generate a custom 3D simulation in AI Tutor
            </button>
          </div>

          <div
            role="tablist"
            aria-label="Filter experiments by subject room"
            className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface-muted)] p-1"
          >
            {(
              [
                { id: "all", label: `All Rooms (${STATION_ORDER.length})` },
                { id: "physics", label: "Physics (01–10)" },
                { id: "chemistry", label: "Chemistry (11–17)" },
                { id: "biology", label: "Biology (18–24)" },
              ] as const
            ).map((tab) => {
              const active = tab.id === roomFilter;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setRoomFilter(tab.id)}
                  className={[
                    "min-h-[36px] px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors",
                    active
                      ? "bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-hairline)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent",
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {filteredStations.map((id) => {
            const quest = LAB_QUESTS[id];
            const isCompleted = completedQuests[id];
            const disciplineTone =
              quest.discipline === "Physics"
                ? "text-[#2F4368]"
                : quest.discipline === "Chemistry"
                  ? "text-[#6F4E37]"
                  : "text-[#2D6A4F]";

            return (
              <Card
                key={id}
                tone={isCompleted ? "lavender" : "surface"}
                padding="md"
                className="flex flex-col justify-between gap-5"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <span
                      className={[
                        "font-mono tabular-nums font-medium",
                        disciplineTone,
                      ].join(" ")}
                    >
                      {quest.stationNumber} · {quest.discipline}
                    </span>
                    <span className="font-mono tabular-nums text-[var(--accent-lavender-ink)] font-medium">
                      {quest.classTag} · +{quest.xpReward} XP
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

                  <p className="text-[11px] font-mono text-[var(--text-secondary)] bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-md px-2 py-1 w-fit">
                    {quest.formula}
                  </p>

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
