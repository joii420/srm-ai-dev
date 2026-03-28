import { create } from 'zustand';

export interface SkillField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string | null;
  options: string[];
  token: string;
}

export interface SkillInfo {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  category: string | null;
  prompt: string;
  keywords: string[] | null;
  fields: SkillField[] | null;
  tags: string[] | null;
  enabled: boolean;
  version: string | null;
  callCount: number;
}

export interface SkillVersion {
  id: string;
  version: string;
  promptSnapshot: string;
  fieldsSnapshot: SkillField[];
  modifiedBy: { id: string; username: string; displayName: string | null } | null;
  createdAt: string;
}

interface SkillState {
  skills: SkillInfo[];
  activatedSkillIds: string[];
  loading: boolean;
  setSkills: (skills: SkillInfo[]) => void;
  toggleSkill: (skillId: string) => void;
  setActivatedSkills: (ids: string[]) => void;
  setLoading: (loading: boolean) => void;
}

export const useSkillStore = create<SkillState>((set, get) => ({
  skills: [],
  activatedSkillIds: [],
  loading: false,

  setSkills: (skills) => set({ skills }),

  toggleSkill: (skillId) => {
    const { activatedSkillIds } = get();
    const isActive = activatedSkillIds.includes(skillId);
    set({
      activatedSkillIds: isActive
        ? activatedSkillIds.filter((id) => id !== skillId)
        : [...activatedSkillIds, skillId],
    });
  },

  setActivatedSkills: (ids) => set({ activatedSkillIds: ids }),

  setLoading: (loading) => set({ loading }),
}));
