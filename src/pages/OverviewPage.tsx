import {
  ArrowRight,
  Atom,
  Box,
  FlaskConical,
  Leaf,
  Sparkles,
} from "lucide-react";
import { LabSchematicIllustration } from "../components/layout/LabSchematicIllustration";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { SectionHeader } from "../components/ui/SectionHeader";
import { LAB_ROOMS, ROOM_ORDER, ROOM_STATIONS } from "../lab/quests";
import { useRouter } from "../router/RouterContext";
import type { AppRoutePath } from "../types/navigation";

interface WorkspacePillar {
  index: string;
  title: string;
  scope: string;
  description: string;
  path: AppRoutePath;
  actionLabel: string;
  icon: typeof FlaskConical;
}

const WORKSPACE_PILLARS: readonly WorkspacePillar[] = [
  {
    index: "01",
    title: "3D Subject Science Laboratories",
    scope: "Physics · Chemistry · Biology · WebXR AR/VR",
    description:
      "Walk across 3 dedicated 3D laboratory rooms containing 24 detailed interactive apparatuses — from foundational circuits to quantum double-slit optics, photoelectric tubes, Haber reactors, and PCR thermal cyclers.",
    path: "/labs",
    actionLabel: "Enter 3D Laboratories",
    icon: FlaskConical,
  },
  {
    index: "02",
    title: "AI NCERT Tutor & 3D Simulator",
    scope: "Any NCERT Concept · Instant 3D Generation",
    description:
      "Type any NCERT science experiment or concept — or upload a textbook diagram — to get a clear explanation in English, Kannada, or Hindi alongside a live interactive 3D simulation.",
    path: "/tutor",
    actionLabel: "Open AI Tutor & 3D Generator",
    icon: Sparkles,
  },
];

export function OverviewPage() {
  const { navigate } = useRouter();

  return (
    <div className="space-y-12 sm:space-y-16">
      {/* Hero Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <div className="lg:col-span-6 flex flex-col justify-between space-y-6 py-2">
          <div className="space-y-4">
            <p className="text-xs sm:text-sm font-medium text-[var(--accent-mocha)]">
              Pocket Labs · Classes 6–12 · NCERT / CBSE &amp; Karnataka State Board
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold tracking-tight leading-[1.15] text-[var(--text-primary)] text-balance">
              Interactive 3D science laboratories and instant AI-generated NCERT simulations.
            </h1>
            <p className="text-base text-[var(--text-secondary)] leading-relaxed max-w-xl">
              Explore dedicated Physics, Chemistry, and Biology 3D rooms with animated avatar hands, complex multi-variable apparatuses, and AR/VR support — or paste any NCERT concept into AI Tutor to generate a live 3D simulation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate("/labs")}
            >
              Enter 3D / AR / VR Labs
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => navigate("/tutor")}
            >
              AI Tutor &amp; 3D Generator
            </Button>
          </div>
        </div>

        <div className="lg:col-span-6">
          <LabSchematicIllustration />
        </div>
      </section>

      {/* Core Workspace Pillars */}
      <section className="space-y-6">
        <SectionHeader
          indexLabel="01"
          title="Core Learning Workspaces"
          description="Hands-on 3D laboratory rooms paired with an on-demand AI NCERT 3D simulation studio."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {WORKSPACE_PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <Card
                key={pillar.path}
                tone="surface"
                padding="md"
                className="flex flex-col justify-between gap-5"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-medium text-[var(--accent-mocha)] tabular-nums">
                      {pillar.index}
                    </span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F3EFF9] text-[var(--accent-lavender-ink)]">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-[var(--text-muted)]">
                      {pillar.scope}
                    </p>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                      {pillar.title}
                    </h3>
                  </div>

                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    {pillar.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => navigate(pillar.path)}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent-mocha)] hover:text-[var(--accent-mocha-hover)] whitespace-nowrap cursor-pointer w-fit"
                >
                  <span>{pillar.actionLabel}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Three Dedicated Subject Rooms Preview */}
      <section className="space-y-6">
        <SectionHeader
          indexLabel="02"
          title="Three Dedicated Subject Rooms"
          description="24 foundational & complex science experiments organized into Physics, Chemistry, and Biology wings."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {ROOM_ORDER.map((roomId) => {
            const room = LAB_ROOMS[roomId];
            const Icon =
              roomId === "physics"
                ? Atom
                : roomId === "chemistry"
                  ? FlaskConical
                  : Leaf;
            const iconBoxClass =
              roomId === "physics"
                ? "bg-[#EEF2F7] text-[#2F4368]"
                : roomId === "chemistry"
                  ? "bg-[#F5ECE4] text-[#6F4E37]"
                  : "bg-[#EDF5EF] text-[#2D6A4F]";

            return (
              <Card
                key={roomId}
                tone="surface"
                padding="md"
                className="flex flex-col justify-between gap-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div
                      className={[
                        "flex h-9 w-9 items-center justify-center rounded-lg",
                        iconBoxClass,
                      ].join(" ")}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <span className="font-mono text-xs tabular-nums text-[var(--text-muted)]">
                      {ROOM_STATIONS[roomId].length} Benches · {room.stationRange}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">
                    {room.name}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    {room.wingBadge}
                  </p>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    {room.description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/labs")}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent-mocha)] hover:underline cursor-pointer w-fit"
                >
                  <Box className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Explore {room.shortLabel} Wing</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
