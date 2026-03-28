import axios from "axios";
import pino from "pino";

const logger = pino({ name: "skill-usage-tracker" });

const BACKEND_URL =
  process.env["BACKEND_URL_FOR_CONTAINER"] ?? "http://localhost:4000";

/** Tracks which skills have been reported per session to avoid duplicate counting. */
const sessionUsageMap = new Map<string, Set<string>>();

/**
 * Determine which activated skill IDs were actually referenced in the AI response.
 * Matches skill IDs and skill names appearing in the response text.
 */
export function detectUsedSkills(
  responseText: string,
  activatedSkillIds: string[],
  skillNames: Map<string, string>
): string[] {
  const used: string[] = [];

  for (const skillId of activatedSkillIds) {
    const name = skillNames.get(skillId);
    // Check if the skill id or name appears in the response
    if (
      responseText.includes(skillId) ||
      (name && responseText.toLowerCase().includes(name.toLowerCase()))
    ) {
      used.push(skillId);
    }
  }

  return used;
}

/**
 * Report skill usage to the backend for each used skill,
 * avoiding duplicate reports within the same session.
 */
export async function reportSkillUsage(
  sessionId: string,
  usedSkillIds: string[]
): Promise<void> {
  if (usedSkillIds.length === 0) return;

  let reported = sessionUsageMap.get(sessionId);
  if (!reported) {
    reported = new Set<string>();
    sessionUsageMap.set(sessionId, reported);
  }

  const newSkills = usedSkillIds.filter((id) => !reported.has(id));
  if (newSkills.length === 0) return;

  const promises = newSkills.map(async (skillId) => {
    try {
      await axios.post(`${BACKEND_URL}/skills/${skillId}/use`);
      reported.add(skillId);
      logger.info({ skillId, sessionId }, "Reported skill usage");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn(
        { skillId, sessionId, error: message },
        "Failed to report skill usage"
      );
    }
  });

  await Promise.allSettled(promises);
}

/** Clear tracked usage for a session (on session reset). */
export function clearSessionUsage(sessionId: string): void {
  sessionUsageMap.delete(sessionId);
}

/** Clear all tracked session usage data. */
export function clearAllUsage(): void {
  sessionUsageMap.clear();
}
