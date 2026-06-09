import type { UserProfile, LeaderboardRow } from "@/types/database";

/**
 * Returns the display name for a user
 * Priority: nickname > email
 */
export function getDisplayName(
  user: Pick<UserProfile, "email" | "nickname"> | Pick<LeaderboardRow, "email" | "nickname">
): string {
  return user.nickname ?? user.email;
}

/**
 * Returns a short display name (useful for avatars, compact views)
 */
export function getDisplayNameShort(
  user: Pick<UserProfile, "email" | "nickname"> | Pick<LeaderboardRow, "email" | "nickname">
): string {
  const name = getDisplayName(user);
  return name.split("@")[0]; // Remove domain if email
}

/**
 * Extracts initials from a display name
 */
export function getDisplayInitials(
  user: Pick<UserProfile, "email" | "nickname"> | Pick<LeaderboardRow, "email" | "nickname">
): string {
  const name = getDisplayName(user);
  return name
    .split(/[-_\s@.]/)
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
