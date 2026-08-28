import { create } from "zustand";

interface ThemeState {
  themeMode: "light" | "dark" | "system";
  setThemeMode: (mode: "light" | "dark" | "system") => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  themeMode: "light",
  setThemeMode: (mode) => set({ themeMode: mode }),
}));
