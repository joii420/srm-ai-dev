import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIntentDetection } from '../../../src/hooks/useIntentDetection';
import type { SkillInfo } from '../../../src/stores/skillStore';

// ---------------------------------------------------------------------------
//  Fixtures
// ---------------------------------------------------------------------------

function makeSkill(overrides: Partial<SkillInfo> = {}): SkillInfo {
  return {
    id: 'skill-1',
    name: 'Code Gen',
    description: 'Generates code',
    icon: '🔧',
    category: null,
    prompt: 'Generate {{component}} code',
    keywords: ['generate', 'code', 'create'],
    fields: [
      {
        id: 'f1',
        label: 'Component',
        type: 'text',
        required: true,
        placeholder: null,
        options: [],
        token: 'component',
      },
    ],
    tags: ['code'],
    enabled: true,
    version: '1',
    callCount: 10,
    ...overrides,
  };
}

const skillNoFields: SkillInfo = makeSkill({
  id: 'skill-no-fields',
  name: 'Simple Skill',
  keywords: ['simple'],
  fields: [],
  callCount: 5,
});

const skillA: SkillInfo = makeSkill({
  id: 'skill-a',
  name: 'Skill A',
  keywords: ['generate'],
  callCount: 20,
});

const skillB: SkillInfo = makeSkill({
  id: 'skill-b',
  name: 'Skill B',
  keywords: ['generate', 'build'],
  callCount: 5,
});

// ---------------------------------------------------------------------------
//  Tests
// ---------------------------------------------------------------------------

describe('useIntentDetection', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('matches input text against skill keywords after 300ms debounce', async () => {
    const skills = [skillA, skillB];

    const { result, rerender } = renderHook(
      ({ input }) => useIntentDetection(input, skills),
      { initialProps: { input: '' } },
    );

    // No match initially
    expect(result.current.matchedSkill).toBeNull();

    // Type something that matches
    rerender({ input: 'I want to generate' });

    // Before debounce: still null
    expect(result.current.matchedSkill).toBeNull();

    // Advance past 300ms debounce
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Should match skillA (higher callCount)
    expect(result.current.matchedSkill).not.toBeNull();
    expect(result.current.matchedSkill!.id).toBe('skill-a');
  });

  it('only matches skills with template params (fields)', () => {
    const skills = [skillNoFields, skillA];

    const { result, rerender } = renderHook(
      ({ input }) => useIntentDetection(input, skills),
      { initialProps: { input: '' } },
    );

    rerender({ input: 'simple task' });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // skillNoFields should NOT be matched because it has no fields
    expect(result.current.matchedSkill).toBeNull();
  });

  it('picks highest callCount on multi-match', () => {
    const skills = [skillA, skillB]; // both match "generate", A has callCount 20, B has 5

    const { result, rerender } = renderHook(
      ({ input }) => useIntentDetection(input, skills),
      { initialProps: { input: '' } },
    );

    rerender({ input: 'generate something' });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.matchedSkill!.id).toBe('skill-a'); // higher callCount
  });

  it('dismissed skill is not re-suggested in same session', () => {
    const skills = [skillA];

    const { result, rerender } = renderHook(
      ({ input }) => useIntentDetection(input, skills),
      { initialProps: { input: 'generate code' } },
    );

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.matchedSkill!.id).toBe('skill-a');

    // Dismiss it
    act(() => {
      result.current.dismiss();
    });

    expect(result.current.matchedSkill).toBeNull();

    // Change input and come back to matching text
    rerender({ input: '' });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    rerender({ input: 'generate again' });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Still null -- dismissed in this session
    expect(result.current.matchedSkill).toBeNull();
  });

  it('returns null when input is empty', () => {
    const skills = [skillA];

    const { result } = renderHook(
      ({ input }) => useIntentDetection(input, skills),
      { initialProps: { input: '' } },
    );

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.matchedSkill).toBeNull();
  });

  it('debounces properly - earlier timers are cancelled', () => {
    const skills = [skillA, skillB];

    const { result, rerender } = renderHook(
      ({ input }) => useIntentDetection(input, skills),
      { initialProps: { input: '' } },
    );

    // Rapid changes
    rerender({ input: 'gen' });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    rerender({ input: 'build something' });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // At 200ms total, nothing should have matched yet
    expect(result.current.matchedSkill).toBeNull();

    // 300ms from last change
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Should match "build" -> skillB
    expect(result.current.matchedSkill!.id).toBe('skill-b');
  });
});
