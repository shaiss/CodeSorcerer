import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AgentSettings, AIProviderSettings } from '../types/settings';

interface SettingsState {
  settings: AgentSettings;
  updateAIProvider: (provider: AIProviderSettings) => void;
  updateWalletKey: (key: string) => void;
  updateAdditionalSettings: (settings: Partial<AgentSettings['additionalSettings']>) => void;
  togglePrivateCompute: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: {
        aiProvider: {
          provider: 'openai',
          apiKey: '',
          modelName: 'gpt-4o'
        },
        walletKey: '',
        enablePrivateCompute: false,
        additionalSettings: {}
      },
      updateAIProvider: (provider) =>
        set((state) => ({
          settings: {
            ...state.settings,
            aiProvider: provider
          }
        })),
      updateWalletKey: (key) =>
        set((state) => ({
          settings: {
            ...state.settings,
            walletKey: key
          }
        })),
      updateAdditionalSettings: (newSettings) =>
        set((state) => ({
          settings: {
            ...state.settings,
            additionalSettings: {
              ...state.settings.additionalSettings,
              ...newSettings
            }
          }
        })),
      togglePrivateCompute: () =>
        set((state) => ({
          settings: {
            ...state.settings,
            enablePrivateCompute: !state.settings.enablePrivateCompute
          }
        }))
    }),
    {
      name: 'settings-storage'
    }
  )
); 