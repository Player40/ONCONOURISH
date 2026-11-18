export const ALLOWED_ROLES = ["patient", "caregiver", "clinician"] as const;
export type AppRole = (typeof ALLOWED_ROLES)[number];
