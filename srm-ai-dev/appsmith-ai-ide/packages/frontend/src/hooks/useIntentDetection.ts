import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { SkillInfo } from '../stores/skillStore';

interface UseIntentDetectionResult {
  matchedSkill: SkillInfo | null;
  dismiss: () => void;
}

/**
 * Detects user intent by matching input text against skill keywords.
 *
 * - 300ms debounce on input changes
 * - Only matches skills that have template fields
 * - On multi-match: picks the skill with the highest callCount
 * - Dismissed skills are not re-suggested in the same session
 */
export function useIntentDetection(
  input: string,
  skills: SkillInfo[],
): UseIntentDetectionResult {
  const [matchedSkill, setMatchedSkill] = useState<SkillInfo | null>(null);
  const dismissedRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Skills with template fields only
  const templateSkills = useMemo(
    () => (skills ?? []).filter((s) => (s.fields ?? []).length > 0),
    [skills],
  );

  useEffect(() => {
    // Clear previous timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    const trimmed = input.trim().toLowerCase();
    if (!trimmed) {
      setMatchedSkill(null);
      return;
    }

    // 300ms debounce
    timerRef.current = setTimeout(() => {
      const matches = templateSkills.filter((skill) => {
        if (dismissedRef.current.has(skill.id)) return false;
        return (skill.keywords ?? []).some((kw) => trimmed.includes(kw.toLowerCase()));
      });

      if (matches.length === 0) {
        setMatchedSkill(null);
        return;
      }

      // Pick highest callCount on multi-match
      matches.sort((a, b) => b.callCount - a.callCount);
      setMatchedSkill(matches[0]);
    }, 300);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [input, templateSkills]);

  const dismiss = useCallback(() => {
    if (matchedSkill) {
      dismissedRef.current.add(matchedSkill.id);
    }
    setMatchedSkill(null);
  }, [matchedSkill]);

  return { matchedSkill, dismiss };
}
