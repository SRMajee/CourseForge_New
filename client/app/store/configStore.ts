import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "~/services/api";

export interface AppConfig {
  costs: {
    createCourse: number;
    generateLesson: number;
    generateAudio: number;
    exportPdf: number;
    exportModulePdf: number;
    exportCoursePdf: number;
    createCoursePro: number;
    regenerateCourse: number;
    regenerateCoursePro: number;
    regenerateLessonPro: number;
    regenerateLesson: number;
  };
  // ✅ New Field: Syncs with backend COST_MENU
  costMenu: {
    action: string;
    cost: number;
    desc: string;
  }[];
  pricing: {
    topUp: { price: number; credits: number; label: string };
    pro: { price: number; credits: number; label: string };
  };
}

interface ConfigState {
  config: AppConfig | null;
  isLoading: boolean;
  fetchConfig: () => Promise<void>;
  getCost: (key: keyof AppConfig["costs"]) => number;
}

// Default fallback values (just in case API fails)
const DEFAULTS: AppConfig = {
  costs: {
    createCourse: 50,
    generateLesson: 35,
    generateAudio: 15,
    exportPdf: 5,
    createCoursePro: 100,
    regenerateCourse: 25,
    regenerateCoursePro: 75,
    regenerateLessonPro: 25,
    regenerateLesson: 15,
    exportModulePdf: 10,
    exportCoursePdf: 20,
  },
  // ✅ FIX: Added default to satisfy AppConfig interface
  costMenu: [],
  pricing: {
    topUp: { price: 400, credits: 300, label: "Top Up" },
    pro: { price: 999, credits: 1000, label: "Pro" },
  },
};

export const useConfigStore = create<ConfigState>()(
  persist(
    (set, get) => ({
      config: DEFAULTS,
      isLoading: false,

      fetchConfig: async () => {
        set({ isLoading: true });
        try {
          const { data } = await api.get("/config");
          // console.log("Fetched config from backend:", data);
          set({ config: data, isLoading: false });
        } catch (err) {
          console.error("Failed to sync config with backend", err);
          set({ isLoading: false }); // Keep defaults
        }
      },

      getCost: (key) => {
        return get().config?.costs[key] || DEFAULTS.costs[key];
      },
    }),
    {
      name: "app-config-storage", // Cache in localStorage so it works offline/reload
    },
  ),
);
