export type AppRoutePath = "/" | "/labs" | "/tutor";

export interface NavItem {
  label: string;
  path: AppRoutePath;
}

export const PRIMARY_NAV_ITEMS: readonly NavItem[] = [
  { label: "Overview", path: "/" },
  { label: "Laboratories", path: "/labs" },
  { label: "AI Tutor", path: "/tutor" },
] as const;

export type SubjectArea = "Physics" | "Chemistry" | "Biology";

export type ClassLevel = "Class 6" | "Class 7" | "Class 8" | "Class 9" | "Class 10";

export type CurriculumBoard = "NCERT / CBSE" | "Karnataka State Board";

export type TutorLanguage = "English" | "Kannada" | "Hindi";
