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
      aria-label={`${avatar.name || "Student"} scientist avatar`}
      className={[
        SIZE_MAP[size],
        "rounded-full border border-[#D4E4F2] bg-[#4AA8E8] shrink-0 overflow-hidden",
        className,
      ].join(" ")}
    >
      <defs>
        <linearGradient id="pocketLabsSkyBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4DB5F2" />
          <stop offset="100%" stopColor="#2687CC" />
        </linearGradient>
      </defs>

      {/* Cheerful Lab Sky Backdrop */}
      <rect width="96" height="96" fill="url(#pocketLabsSkyBg)" />

      {/* Back Hair & Nape Tufts */}
      {avatar.hairStyle === "short" ? (
        <g fill={avatar.hairColor}>
          <path d="M 22 46 L 26 60 L 33 57 L 30 62 L 48 60 L 66 62 L 63 57 L 70 60 L 74 46 Z" />
        </g>
      ) : null}
      {avatar.hairStyle === "bob" ? (
        <path
          d="M 22 44 Q 21 68 30 74 L 66 74 Q 75 68 74 44 Z"
          fill={avatar.hairColor}
        />
      ) : null}
      {avatar.hairStyle === "bun" ? (
        <circle cx="48" cy="15" r="11" fill={avatar.hairColor} />
      ) : null}
      {avatar.hairStyle === "curly" ? (
        <g fill={avatar.hairColor}>
          <circle cx="25" cy="34" r="9.5" />
          <circle cx="71" cy="34" r="9.5" />
          <circle cx="23" cy="45" r="8.5" />
          <circle cx="73" cy="45" r="8.5" />
          <circle cx="36" cy="22" r="10.5" />
          <circle cx="60" cy="22" r="10.5" />
        </g>
      ) : null}

      {/* Neck & Crisp White Lab Coat Shoulders */}
      <rect x="42" y="61" width="12" height="12" rx="4" fill={avatar.skinTone} />
      <path
        d="M 16 96 C 18 77, 30 70, 48 70 C 66 70, 78 77, 80 96 Z"
        fill={coat.coatHex}
        stroke="#B8C7D6"
        strokeWidth="1.4"
      />

      {/* Teal Green V-Neck Shirt & Crisp Notched Lapels */}
      <polygon points="40,70 56,70 48,89" fill={coat.trimHex} />
      <polygon
        points="35,70 43,70 48,88 37,83"
        fill={coat.coatHex}
        stroke="#C5D2DF"
        strokeWidth="1"
      />
      <polygon
        points="61,70 53,70 48,88 59,83"
        fill={coat.coatHex}
        stroke="#C5D2DF"
        strokeWidth="1"
      />

      {/* Mini Round-Bottom Blue Liquid Flask Held Up on Right Side + Sparkles */}
      <g transform="translate(74, 67)">
        <rect x="-2.5" y="-14" width="5" height="7" rx="1" fill="#E6F4FF" stroke="#4D6680" strokeWidth="1" />
        <circle cx="0" cy="0" r="9" fill="#EBF6FF" fillOpacity="0.88" stroke="#4D6680" strokeWidth="1.2" />
        <path d="M -7.5 2 A 7.8 7.8 0 0 0 7.5 2 Q 0 5 -7.5 2 Z" fill="#1874F5" />
        <path d="M 4 -22 L 5.2 -19 L 8 -18 L 5.2 -17 L 4 -14 L 2.8 -17 L 0 -18 L 2.8 -19 Z" fill="#FFFFFF" />
      </g>

      {/* Rounded Cartoon Ears */}
      <circle cx="24.5" cy="46.5" r="5" fill={avatar.skinTone} stroke="#D99B6D" strokeWidth="0.9" />
      <circle cx="71.5" cy="46.5" r="5" fill={avatar.skinTone} stroke="#D99B6D" strokeWidth="0.9" />

      {/* Warm Peach Cartoon Head */}
      <rect
        x="26"
        y="22"
        width="44"
        height="42"
        rx="20"
        fill={avatar.skinTone}
        stroke="#DF9F70"
        strokeWidth="0.9"
      />

      {/* Signature Side-Swept Chestnut Brown Hair */}
      {avatar.hairStyle === "short" ? (
        <g>
          <path
            d="M 22 45 C 20 22, 34 12, 50 13 C 66 13, 75 23, 73 41 C 69 32, 61 29, 49 28 C 36 28, 29 33, 22 45 Z"
            fill={avatar.hairColor}
            stroke="#592E14"
            strokeWidth="1"
          />
          <path
            d="M 33 24 C 46 18, 62 21, 74 33 C 63 32, 53 26, 44 27 C 37 28, 32 32, 26 36 C 28 29, 30 26, 33 24 Z"
            fill={avatar.hairColor}
          />
          <path
            d="M 36 18 Q 50 15 62 22"
            fill="none"
            stroke="#B46D3C"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeOpacity="0.65"
          />
        </g>
      ) : null}
      {avatar.hairStyle === "bob" ? (
        <path
          d="M 24 43 C 24 21, 39 16, 48 16 C 59 16, 72 21, 72 43 C 65 32, 55 29, 48 33 C 41 29, 31 32, 24 43 Z"
          fill={avatar.hairColor}
        />
      ) : null}
      {avatar.hairStyle === "curly" ? (
        <g fill={avatar.hairColor}>
          <circle cx="48" cy="20" r="10.5" />
          <circle cx="35" cy="25" r="8" />
          <circle cx="61" cy="25" r="8" />
        </g>
      ) : null}
      {avatar.hairStyle === "bun" ? (
        <path
          d="M 26 41 C 26 21, 38 17, 48 17 C 58 17, 70 21, 70 41 C 62 32, 54 30, 48 30 C 42 30, 34 32, 26 41 Z"
          fill={avatar.hairColor}
        />
      ) : null}

      {/* Arched Expressive Eyebrows */}
      <path d="M 33.5 37.5 Q 39 34 44.5 37.5" fill="none" stroke="#2A1810" strokeWidth="2.1" strokeLinecap="round" />
      <path d="M 51.5 37.5 Q 57 34 62.5 37.5" fill="none" stroke="#2A1810" strokeWidth="2.1" strokeLinecap="round" />

      {/* Big Bright Cartoon Eyes (Sclera + Brown Iris + Pupil + Catchlight) */}
      <ellipse cx="39" cy="45" rx="4.6" ry="5.5" fill="#FFFFFF" stroke="#2B1C14" strokeWidth="1" />
      <ellipse cx="57" cy="45" rx="4.6" ry="5.5" fill="#FFFFFF" stroke="#2B1C14" strokeWidth="1" />
      <circle cx="39.5" cy="45.5" r="3.0" fill="#5E3018" />
      <circle cx="57.5" cy="45.5" r="3.0" fill="#5E3018" />
      <circle cx="39.6" cy="45.6" r="1.6" fill="#18100C" />
      <circle cx="57.6" cy="45.6" r="1.6" fill="#18100C" />
      <circle cx="40.9" cy="43.8" r="1.15" fill="#FFFFFF" />
      <circle cx="58.9" cy="43.8" r="1.15" fill="#FFFFFF" />

      {/* Cute Small Nose & Big Bright Toothy Smile */}
      <path d="M 46.5 49.5 Q 48 51.5 49.5 49.5" fill="none" stroke="#CC895D" strokeWidth="1.4" strokeLinecap="round" />
      <path
        d="M 39.5 53.5 Q 48 54.5 56.5 53.5 Q 55 61.5 48 61.5 Q 41 61.5 39.5 53.5 Z"
        fill="#FFFFFF"
        stroke="#C48358"
        strokeWidth="1.1"
      />

      {/* Clear Wrap-Around Safety Goggles with Dark Slate Top Frame */}
      {avatar.goggles ? (
        <g>
          <path
            d="M 27 40 L 69 40 L 67 51.5 Q 66.5 53 64 53 L 52.5 53 Q 50 53 48 50.5 Q 46 53 43.5 53 L 32 53 Q 29.5 53 29 51.5 Z"
            fill="#E8F6FF"
            fillOpacity="0.34"
            stroke="#D9ECFA"
            strokeWidth="1.4"
          />
          <rect x="25.5" y="38.5" width="45" height="3.2" rx="1.4" fill="#2B3A4B" />
          <line x1="33" y1="43" x2="36" y2="50" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="60" y1="43" x2="63" y2="50" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="1.6" strokeLinecap="round" />
        </g>
      ) : null}
    </svg>
  );
}
