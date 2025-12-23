/**
 * Settings Store - Application settings state management
 * Uses Zustand for persistent state with electron-store backend
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface AndroidSDKSettings {
  sdkPath: string;
  buildToolsVersion: string;
  compileSdkVersion: number;
  minSdkVersion: number;
  targetSdkVersion: number;
}

export interface BuildSettings {
  outputDirectory: string;
  parallelBuilds: number;
  cleanBuildEnabled: boolean;
  signApks: boolean;
  keystorePath: string;
  keystoreAlias: string;
}

export interface TrendSettings {
  autoScanEnabled: boolean;
  scanIntervalHours: number;
  maxTrendsToFetch: number;
  includeSources: ('google' | 'reddit' | 'playstore')[];
}

export interface AssetSettings {
  huggingFaceToken: string;
  defaultImageSize: '512x512' | '768x768' | '1024x1024';
  inferenceSteps: number;
  guidanceScale: number;
}

export interface UISettings {
  theme: 'light' | 'dark' | 'system';
  sidebarCollapsed: boolean;
  showNotifications: boolean;
  language: string;
}

export interface AppSettings {
  android: AndroidSDKSettings;
  build: BuildSettings;
  trends: TrendSettings;
  assets: AssetSettings;
  ui: UISettings;
  firstRun: boolean;
  lastUpdated: number;
}

interface SettingsState {
  settings: AppSettings;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadSettings: () => Promise<void>;
  updateSettings: <K extends keyof AppSettings>(
    section: K,
    updates: Partial<AppSettings[K]>
  ) => Promise<void>;
  resetSettings: () => Promise<void>;
  validateAndroidSdk: () => Promise<boolean>;
}

const defaultSettings: AppSettings = {
  android: {
    sdkPath: '',
    buildToolsVersion: '34.0.0',
    compileSdkVersion: 34,
    minSdkVersion: 24,
    targetSdkVersion: 34,
  },
  build: {
    outputDirectory: './output',
    parallelBuilds: 2,
    cleanBuildEnabled: true,
    signApks: false,
    keystorePath: '',
    keystoreAlias: '',
  },
  trends: {
    autoScanEnabled: false,
    scanIntervalHours: 24,
    maxTrendsToFetch: 50,
    includeSources: ['google', 'playstore'],
  },
  assets: {
    huggingFaceToken: '',
    defaultImageSize: '1024x1024',
    inferenceSteps: 30,
    guidanceScale: 7.5,
  },
  ui: {
    theme: 'dark',
    sidebarCollapsed: false,
    showNotifications: true,
    language: 'en',
  },
  firstRun: true,
  lastUpdated: Date.now(),
};

export const useSettingsStore = create<SettingsState>()(
  devtools(
    persist(
      (set, get) => ({
        settings: defaultSettings,
        isLoading: true,
        error: null,

        loadSettings: async () => {
          set({ isLoading: true, error: null });
          try {
            const loaded = await window.api.settings.getAll();
            set({
              settings: { ...defaultSettings, ...loaded },
              isLoading: false,
            });
          } catch (error) {
            console.error('Failed to load settings:', error);
            set({
              error: error instanceof Error ? error.message : 'Failed to load settings',
              isLoading: false,
            });
          }
        },

        updateSettings: async (section, updates) => {
          const currentSettings = get().settings;
          const newSectionSettings = {
            ...currentSettings[section],
            ...updates,
          };

          set({
            settings: {
              ...currentSettings,
              [section]: newSectionSettings,
              lastUpdated: Date.now(),
            },
          });

          try {
            await window.api.settings.update(section, newSectionSettings);
          } catch (error) {
            console.error('Failed to save settings:', error);
            set({ error: error instanceof Error ? error.message : 'Failed to save settings' });
          }
        },

        resetSettings: async () => {
          set({ settings: defaultSettings, isLoading: false, error: null });
          try {
            await window.api.settings.reset();
          } catch (error) {
            console.error('Failed to reset settings:', error);
          }
        },

        validateAndroidSdk: async () => {
          const { android } = get().settings;
          if (!android.sdkPath) return false;
          
          try {
            return await window.api.settings.validateSdk(android.sdkPath);
          } catch {
            return false;
          }
        },
      }),
      {
        name: 'appforge-settings',
        partialize: (state) => ({ settings: state.settings }),
      }
    ),
    { name: 'SettingsStore' }
  )
);

export default useSettingsStore;
