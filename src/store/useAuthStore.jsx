import { create } from "zustand";

export const useAuthStore = create((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
  rolePermissions: null,
  setRolePermissions: (rolePermissions) => set({ rolePermissions }),
}));
