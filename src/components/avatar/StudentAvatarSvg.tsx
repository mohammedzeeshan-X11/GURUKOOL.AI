import {
  LAB_COAT_PRESETS,
  type StudentAvatarProfile,
} from "../../context/StudentAvatarContext";

interface StudentAvatarSvgProps {
  avatar: StudentAvatarProfile;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_MAP = {
  sm: "h-10 w-10",
  md: "h-14 w-14",
  lg: "h-24 w-24",
} as const;

export function StudentAvatarSvg({
  avatar,
  size = "md",
  className = "",
}: StudentAvatarSvgProps) {
  const coat = LAB_COAT_PRESETS[avatar.labCoat];

  return (
    <svg
      viewBox="0 0 96 96"
      role="img"
      aria-label={`${avatar.name || "Kid"} young researcher avatar`}
      className={[
        SIZE_MAP[size],
        "rounded-full border border-[#E5E4E2] bg-[#FAF8F5] shrink-0 overflow-hidden",
        className,
      ].join(" ")}
    >
      {/* Warm Ivory & Subtle Lavender Halo Backdrop */}
      <rect width="96" height="96" fill="#F4F1EC" />
      <circle cx="48" cy="48" r="40" fill="#E6E0F0" fillOpacity="0.45" />

      {/* Back Hair Layers */}
      {avatar.hairStyle === "bob" ? (
        <path
          d="M 22 44 Q 21 68 30 74 L 66 74 Q 75 68 74 44 Z"
          fill={avatar.hairColor}
        />
      ) : null}
      {avatar.hairStyle === "bun" ? (
        <circle cx="48" cy="17" r="11.5" fill={avatar.hairColor} />
      ) : null}
      {avatar.hairStyle === "curly" ? (
        <g fill={avatar.hairColor}>
          <circle cx="26" cy="34" r="9.5" />
          <circle cx="70" cy="34" r="9.5" />
          <circle cx="24" cy="44" r="8.5" />
          <circle cx="72" cy="44" r="8.5" />
          <circle cx="36" cy="23" r="10.5" />
          <circle cx="60" cy="23" r="10.5" />
        </g>
      ) : null}

      {/* Neck & Kid Lab Coat Shoulders + Backpack Straps */}
      <rect x="42" y="61" width="12" height="11" rx="4" fill={avatar.skinTone} />
      <path
        d="M 19 96 C 21 78, 32 71, 48 71 C 64 71, 75 78, 77 96 Z"
        fill={coat.coatHex}
        stroke="#D2CEC7"
        strokeWidth="1.2"
      />
      {/* Backpack Straps */}
      <rect x="30" y="74" width="4.5" height="22" rx="2" fill="#5C4033" fillOpacity="0.88" />
      <rect x="61.5" y="74" width="4.5" height="22" rx="2" fill="#5C4033" fillOpacity="0.88" />

      {/* Inner Shirt & Collar Lapels */}
      <polygon points="41,71 55,71 48,89" fill={coat.trimHex} fillOpacity="0.9" />
      <polygon points="36,71 44,71 48,87 39,84" fill={coat.collarHex} />
      <polygon points="60,71 52,71 48,87 57,84" fill={coat.collarHex} />
      {/* Kid Researcher Badge Pin */}
      <rect x="57" y="81" width="10" height="5.5" rx="1.5" fill="#FAF8F5" stroke={coat.trimHex} strokeWidth="1" />
      <circle cx="60" cy="83.7" r="1.2" fill="#6F4E37" />

      {/* Rounded Kid Ears */}
      <circle cx="26.5" cy="46" r="4.8" fill={avatar.skinTone} />
      <circle cx="69.5" cy="46" r="4.8" fill={avatar.skinTone} />

      {/* Rounder Chubby Kid Head */}
      <rect
        x="27"
        y="24"
        width="42"
        height="40"
        rx="20"
        fill={avatar.skinTone}
      />

      {/* Front Hair Cap & Playful Kid Bangs */}
      {avatar.hairStyle === "short" ? (
        <g fill={avatar.hairColor}>
          <path d="M 26 42 C 26 23, 39 18, 49 18 C 61 18, 70 24, 70 42 C 65 32, 56 30, 48 31 C 38 30, 31 34, 26 42 Z" />
          <path d="M 35 28 Q 42 35 47 29 Q 53 35 59 28 Q 52 24 44 24 Z" />
        </g>
      ) : null}
      {avatar.hairStyle === "bob" ? (
        <path
          d="M 25 43 C 25 22, 39 18, 48 18 C 59 18, 71 23, 71 43 C 64 32, 55 29, 48 33 C 41 29, 32 32, 25 43 Z"
          fill={avatar.hairColor}
        />
      ) : null}
      {avatar.hairStyle === "curly" ? (
        <g fill={avatar.hairColor}>
          <circle cx="48" cy="21" r="10.5" />
          <circle cx="35" cy="26" r="8" />
          <circle cx="61" cy="26" r="8" />
        </g>
      ) : null}
      {avatar.hairStyle === "bun" ? (
        <path
          d="M 27 41 C 27 22, 38 19, 48 19 C 58 19, 69 22, 69 41 C 62 32, 54 31, 48 31 C 42 31, 34 32, 27 41 Z"
          fill={avatar.hairColor}
        />
      ) : null}

      {/* Rosy Kid Cheeks */}
      <ellipse cx="34.5" cy="51.5" rx="4.2" ry="2.6" fill="#F08C84" fillOpacity="0.45" />
      <ellipse cx="61.5" cy="51.5" rx="4.2" ry="2.6" fill="#F08C84" fillOpacity="0.45" />

      {/* Big Sparkling Kid Eyes, Button Nose & Cheerful Grin */}
      <circle cx="39.5" cy="45.5" r="3.1" fill="#1F1713" />
      <circle cx="56.5" cy="45.5" r="3.1" fill="#1F1713" />
      <circle cx="40.5" cy="44.3" r="1.0" fill="#FFFFFF" />
      <circle cx="57.5" cy="44.3" r="1.0" fill="#FFFFFF" />
      <circle cx="38.7" cy="46.6" r="0.5" fill="#FFFFFF" fillOpacity="0.8" />
      <circle cx="55.7" cy="46.6" r="0.5" fill="#FFFFFF" fillOpacity="0.8" />

      <path
        d="M 42.5 53.5 Q 48 58.5 53.5 53.5"
        fill="none"
        stroke="#6B3C2E"
        strokeWidth="2.1"
        strokeLinecap="round"
      />

      {/* Optional Oversized Kid Safety Goggles */}
      {avatar.goggles ? (
        <g>
          <rect
            x="31.5"
            y="39"
            width="15"
            height="12"
            rx="4"
            fill="#E6E0F0"
            fillOpacity="0.32"
            stroke="#42335C"
            strokeWidth="1.7"
          />
          <rect
            x="49.5"
            y="39"
            width="15"
            height="12"
            rx="4"
            fill="#E6E0F0"
            fillOpacity="0.32"
            stroke="#42335C"
            strokeWidth="1.7"
          />
          <line
            x1="46.5"
            y1="44.8"
            x2="49.5"
            y2="44.8"
            stroke="#42335C"
            strokeWidth="1.7"
          />
          <line
            x1="27"
            y1="44.5"
            x2="31.5"
            y2="44.5"
            stroke="#42335C"
            strokeWidth="1.4"
          />
          <line
            x1="64.5"
            y1="44.5"
            x2="69"
            y2="44.5"
            stroke="#42335C"
            strokeWidth="1.4"
          />
        </g>
      ) : null}
    </svg>
  );
}
