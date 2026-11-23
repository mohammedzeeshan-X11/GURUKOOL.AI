import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  ClassLevel,
  CurriculumBoard,
  TutorLanguage,
} from "../types/navigation";

export type AvatarHairStyle = "short" | "bob" | "curly" | "bun";
export type AvatarLabCoat = "platinum" | "mocha" | "lavender" | "sage";

export interface StudentAvatarProfile {
  name: string;
  classLevel: ClassLevel;
  board: CurriculumBoard;
  language: TutorLanguage;
  skinTone: string;
  hairStyle: AvatarHairStyle;
  hairColor: string;
  labCoat: AvatarLabCoat;
  goggles: boolean;
}

export const SKIN_TONE_PRESETS = [
  { id: "fair", label: "Warm Peach", hex: "#F8C99E" },
  { id: "wheat", label: "Warm Wheat", hex: "#D9A37C" },
  { id: "amber", label: "Golden Tan", hex: "#B57952" },
  { id: "deep", label: "Deep Umber", hex: "#764932" },
] as const;

export const HAIR_COLOR_PRESETS = [
  { id: "chestnut", label: "Chestnut", hex: "#8A4B24" },
  { id: "espresso", label: "Espresso", hex: "#2A1E17" },
  { id: "auburn", label: "Auburn", hex: "#A14B28" },
  { id: "slate", label: "Silver Slate", hex: "#6B6765" },
] as const;

export const LAB_COAT_PRESETS: Record<
  AvatarLabCoat,
  { label: string; coatHex: string; collarHex: string; trimHex: string }
> = {
  platinum: {
    label: "Classic White Coat",
    coatHex: "#FFFFFF",
    collarHex: "#E8EEF4",
    trimHex: "#1D8A70",
  },
  mocha: {
    label: "Mocha Coat",
    coatHex: "#6F4E37",
    collarHex: "#5A3E2B",
    trimHex: "#E5E4E2",
  },
  lavender: {
    label: "Lavender Coat",
    coatHex: "#E6E0F0",
    collarHex: "#D1C5E5",
    trimHex: "#42335C",
  },
  sage: {
    label: "Botanical Sage",
    coatHex: "#DCECE4",
    collarHex: "#BBD9CA",
    trimHex: "#2D6A4F",
  },
};

export const DEFAULT_STUDENT_AVATAR: StudentAvatarProfile = {
  name: "Aarav",
  classLevel: "Class 8",
  board: "NCERT / CBSE",
  language: "English",
  skinTone: "#F8C99E",
  hairStyle: "short",
  hairColor: "#8A4B24",
  labCoat: "platinum",
  goggles: true,
};

const STORAGE_KEY = "pocket_labs_student_avatar_v2";

function isValidLanguage(value: unknown): value is TutorLanguage {
  return value === "English" || value === "Kannada" || value === "Hindi";
}

function loadStoredAvatar(): StudentAvatarProfile {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STUDENT_AVATAR;
    const parsed = JSON.parse(raw) as Partial<StudentAvatarProfile>;
    return {
      ...DEFAULT_STUDENT_AVATAR,
      ...parsed,
      language: isValidLanguage(parsed.language)
        ? parsed.language
        : DEFAULT_STUDENT_AVATAR.language,
      name:
        typeof parsed.name === "string" && parsed.name.trim()
          ? parsed.name.trim().slice(0, 24)
          : DEFAULT_STUDENT_AVATAR.name,
    };
  } catch {
    return DEFAULT_STUDENT_AVATAR;
  }
}

interface StudentAvatarContextValue {
  avatar: StudentAvatarProfile;
  updateAvatar: (patch: Partial<StudentAvatarProfile>) => void;
  resetAvatar: () => void;
  customizerOpen: boolean;
  setCustomizerOpen: (open: boolean) => void;
}

const StudentAvatarContext = createContext<StudentAvatarContextValue | null>(
  null,
);

export function StudentAvatarProvider({ children }: { children: ReactNode }) {
  const [avatar, setAvatar] = useState<StudentAvatarProfile>(loadStoredAvatar);
  const [customizerOpen, setCustomizerOpen] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(avatar));
    } catch {
      // Ignore storage quota / private mode restrictions
    }
  }, [avatar]);

  const updateAvatar = useCallback((patch: Partial<StudentAvatarProfile>) => {
    setAvatar((prev) => ({
      ...prev,
      ...patch,
      name:
        patch.name !== undefined
          ? patch.name.slice(0, 24)
          : prev.name,
    }));
  }, []);

  const resetAvatar = useCallback(() => {
    setAvatar(DEFAULT_STUDENT_AVATAR);
  }, []);

  const value = useMemo(
    () => ({
      avatar,
      updateAvatar,
      resetAvatar,
      customizerOpen,
      setCustomizerOpen,
    }),
    [avatar, updateAvatar, resetAvatar, customizerOpen],
  );

  return (
    <StudentAvatarContext.Provider value={value}>
      {children}
    </StudentAvatarContext.Provider>
  );
}

export function useStudentAvatar(): StudentAvatarContextValue {
  const ctx = useContext(StudentAvatarContext);
  if (!ctx) {
    throw new Error(
      "useStudentAvatar must be used within a StudentAvatarProvider",
    );
  }
  return ctx;
}
