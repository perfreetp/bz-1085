import { create } from 'zustand';
import { stores } from '@/data/stores';
import { UserRole } from '@/types';

interface AppState {
  currentStoreId: string;
  currentRole: UserRole;
  setCurrentStoreId: (id: string) => void;
  setCurrentRole: (role: UserRole) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentStoreId: stores[0].id,
  currentRole: 'hr',
  setCurrentStoreId: (id) => set({ currentStoreId: id }),
  setCurrentRole: (role) => set({ currentRole: role }),
}));
