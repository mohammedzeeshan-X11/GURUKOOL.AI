import { RotateCcw, X } from "lucide-react";
import {
  HAIR_COLOR_PRESETS,
  LAB_COAT_PRESETS,
  SKIN_TONE_PRESETS,
  useStudentAvatar,
  type AvatarHairStyle,
  type AvatarLabCoat,
} from "../../context/StudentAvatarContext";
import type {
  ClassLevel,
  CurriculumBoard,
  TutorLanguage,
} from "../../types/navigation";
import { Button } from "../ui/Button";
import { StudentAvatarSvg } from "./StudentAvatarSvg";

const CLASS_LEVELS: readonly ClassLevel[] = [
  "Class 6",
  "Class 7",
  "Class 8",
  "Class 9",
  "Class 10",
];

const BOARDS: readonly CurriculumBoard[] = [
  "NCERT / CBSE",
  "Karnataka State Board",
];

const LANGUAGES: readonly { id: TutorLanguage; label: string }[] = [
  { id: "English", label: "English" },
  { id: "Kannada", label: "ಕನ್ನಡ (Kannada)" },
  { id: "Hindi", label: "हिन्दी (Hindi)" },
];

const HAIR_STYLES: readonly { id: AvatarHairStyle; label: string }[] = [
  { id: "short", label: "Short Crop" },
  { id: "bob", label: "Classic Bob" },
  { id: "curly", label: "Curly" },
  { id: "bun", label: "Lab Bun" },
];

export function AvatarCustomizerModal() {
  const {
    avatar,
    updateAvatar,
    resetAvatar,
    customizerOpen,
    setCustomizerOpen,
  } = useStudentAvatar();

  if (!customizerOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="avatar-modal-title"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#231B16]/45 p-4"
    >
      <div className="w-full max-w-xl rounded-xl border border-[#E5E4E2] bg-[#FAF8F5] shadow-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5E4E2] bg-white px-5 py-4">
          <div>
            <h2
              id="avatar-modal-title"
              className="font-display text-lg font-semibold text-[#231B16]"
            >
              Student Researcher Avatar
            </h2>
            <p className="text-xs text-[#786D65]">
              Customize your profile and 3D virtual lab character
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCustomizerOpen(false)}
            aria-label="Close avatar customizer"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E5E4E2] bg-[#FAF8F5] text-[#231B16] hover:bg-[#F4F1EC] cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[78vh] overflow-y-auto">
          {/* Live Preview + Identity Inputs */}
          <div className="flex flex-col sm:flex-row items-center gap-5 rounded-xl border border-[#E5E4E2] bg-white p-4">
            <StudentAvatarSvg avatar={avatar} size="lg" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 w-full">
              <label className="block space-y-1 text-xs sm:col-span-2">
                <span className="font-medium text-[#231B16]">Student Name</span>
                <input
                  type="text"
                  value={avatar.name}
                  onChange={(e) => updateAvatar({ name: e.target.value })}
                  placeholder="Enter your name"
                  maxLength={24}
                  className="w-full min-h-[38px] rounded-lg border border-[#E5E4E2] bg-[#FAF8F5] px-3 text-sm text-[#231B16]"
                />
              </label>
              <label className="block space-y-1 text-xs">
                <span className="font-medium text-[#231B16]">Class</span>
                <select
                  value={avatar.classLevel}
                  onChange={(e) =>
                    updateAvatar({ classLevel: e.target.value as ClassLevel })
                  }
                  className="w-full min-h-[38px] rounded-lg border border-[#E5E4E2] bg-[#FAF8F5] px-2.5 text-xs text-[#231B16]"
                >
                  {CLASS_LEVELS.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1 text-xs">
                <span className="font-medium text-[#231B16]">Board</span>
                <select
                  value={avatar.board}
                  onChange={(e) =>
                    updateAvatar({ board: e.target.value as CurriculumBoard })
                  }
                  className="w-full min-h-[38px] rounded-lg border border-[#E5E4E2] bg-[#FAF8F5] px-2.5 text-xs text-[#231B16]"
                >
                  {BOARDS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1 text-xs sm:col-span-2">
                <span className="font-medium text-[#231B16]">
                  Voice &amp; Tutor Language
                </span>
                <select
                  value={avatar.language}
                  onChange={(e) =>
                    updateAvatar({ language: e.target.value as TutorLanguage })
                  }
                  className="w-full min-h-[38px] rounded-lg border border-[#E5E4E2] bg-[#FAF8F5] px-2.5 text-xs text-[#231B16]"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.id} value={lang.id}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {/* Skin Tone & Hair Color */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <span className="text-xs font-medium text-[#231B16]">
                Skin Tone
              </span>
              <div className="flex items-center gap-2.5">
                {SKIN_TONE_PRESETS.map((tone) => {
                  const active = avatar.skinTone === tone.hex;
                  return (
                    <button
                      key={tone.id}
                      type="button"
                      onClick={() => updateAvatar({ skinTone: tone.hex })}
                      aria-label={tone.label}
                      title={tone.label}
                      className={[
                        "h-9 w-9 rounded-full border-2 cursor-pointer transition-transform",
                        active
                          ? "border-[#6F4E37] scale-110"
                          : "border-[#E5E4E2] hover:scale-105",
                      ].join(" ")}
                      style={{ backgroundColor: tone.hex }}
                    />
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-medium text-[#231B16]">
                Hair Color
              </span>
              <div className="flex items-center gap-2.5">
                {HAIR_COLOR_PRESETS.map((hc) => {
                  const active = avatar.hairColor === hc.hex;
                  return (
                    <button
                      key={hc.id}
                      type="button"
                      onClick={() => updateAvatar({ hairColor: hc.hex })}
                      aria-label={hc.label}
                      title={hc.label}
                      className={[
                        "h-9 w-9 rounded-full border-2 cursor-pointer transition-transform",
                        active
                          ? "border-[#6F4E37] scale-110"
                          : "border-[#E5E4E2] hover:scale-105",
                      ].join(" ")}
                      style={{ backgroundColor: hc.hex }}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Hair Style */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-[#231B16]">
              Hair Style
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {HAIR_STYLES.map((style) => {
                const active = avatar.hairStyle === style.id;
                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => updateAvatar({ hairStyle: style.id })}
                    className={[
                      "min-h-[38px] rounded-lg border px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors",
                      active
                        ? "bg-[#6F4E37] text-white border-[#6F4E37]"
                        : "bg-white text-[#231B16] border-[#E5E4E2] hover:bg-[#F4F1EC]",
                    ].join(" ")}
                  >
                    {style.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lab Coat & Safety Goggles */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-[#231B16]">
              Laboratory Coat
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(LAB_COAT_PRESETS) as AvatarLabCoat[]).map((key) => {
                const preset = LAB_COAT_PRESETS[key];
                const active = avatar.labCoat === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => updateAvatar({ labCoat: key })}
                    className={[
                      "min-h-[38px] flex items-center justify-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium cursor-pointer transition-colors",
                      active
                        ? "bg-[#E6E0F0] text-[#42335C] border-[#42335C]"
                        : "bg-white text-[#231B16] border-[#E5E4E2] hover:bg-[#F4F1EC]",
                    ].join(" ")}
                  >
                    <span
                      className="h-3.5 w-3.5 rounded-full border border-[#C7C4BE] shrink-0"
                      style={{ backgroundColor: preset.coatHex }}
                    />
                    <span className="truncate">{preset.label.replace(" Coat", "")}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex items-center justify-between rounded-lg border border-[#E5E4E2] bg-white px-4 py-3 cursor-pointer">
            <div>
              <p className="text-sm font-medium text-[#231B16]">
                Wear Lab Safety Goggles
              </p>
              <p className="text-xs text-[#786D65]">
                Shown on your profile badge and 3D avatar inside the lab
              </p>
            </div>
            <input
              type="checkbox"
              checked={avatar.goggles}
              onChange={(e) => updateAvatar({ goggles: e.target.checked })}
              className="h-4 w-4 accent-[#6F4E37] cursor-pointer"
            />
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#E5E4E2] bg-white px-5 py-3.5">
          <Button variant="ghost" size="md" onClick={resetAvatar}>
            <RotateCcw className="h-3.5 w-3.5 inline mr-1.5" aria-hidden="true" />
            Reset Default
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => setCustomizerOpen(false)}
          >
            Save &amp; Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
