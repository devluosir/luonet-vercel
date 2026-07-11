import { create } from 'zustand';

interface LogoutTransitionState {
  isLoggingOut: boolean;
  setLoggingOut: (value: boolean) => void;
}

export const useLogoutTransitionStore = create<LogoutTransitionState>((set) => ({
  isLoggingOut: false,
  setLoggingOut: (value) => set({ isLoggingOut: value }),
}));
