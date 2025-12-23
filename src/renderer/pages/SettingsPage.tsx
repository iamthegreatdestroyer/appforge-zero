/**
 * Settings Page - Application Configuration
 * User preferences, API keys, build settings
 */

import React from "react";
import { useSettingsStore } from "../stores/settingsStore";

const SettingsPage: React.FC = () => {
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  return (
    <div data-testid="page-settings" className="space-y-6 max-w-2xl">
      <h1 className="text-3xl font-bold text-gray-900">Settings</h1>

      {/* General Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">General</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Theme
            </label>
            <select className="w-full px-4 py-2 border rounded-lg">
              <option>Light</option>
              <option>Dark</option>
              <option>System</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Language
            </label>
            <select className="w-full px-4 py-2 border rounded-lg">
              <option>English</option>
              <option>Spanish</option>
              <option>French</option>
            </select>
          </div>
          <label className="flex items-center">
            <input type="checkbox" className="mr-3" defaultChecked />
            <span className="text-gray-700">Notifications enabled</span>
          </label>
        </div>
      </div>

      {/* Build Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Build Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Android SDK Path
            </label>
            <input
              type="text"
              placeholder="/path/to/android-sdk"
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Build Type
            </label>
            <select className="w-full px-4 py-2 border rounded-lg">
              <option>Debug</option>
              <option>Release</option>
            </select>
          </div>
          <label className="flex items-center">
            <input type="checkbox" className="mr-3" defaultChecked />
            <span className="text-gray-700">Sign APK automatically</span>
          </label>
        </div>
      </div>

      {/* API Configuration */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">API Configuration</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reddit API Key
            </label>
            <input
              type="password"
              placeholder="Enter your Reddit API key"
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              HuggingFace API Token
            </label>
            <input
              type="password"
              placeholder="Enter your HuggingFace token"
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* About */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">About</h2>
        <div className="space-y-2 text-gray-700">
          <div className="flex justify-between">
            <span>AppForge Zero</span>
            <span className="font-semibold">v1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span>Electron</span>
            <span className="font-semibold">28.1.0</span>
          </div>
          <div className="flex justify-between">
            <span>React</span>
            <span className="font-semibold">18.2.0</span>
          </div>
        </div>
      </div>

      <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded">
        Save Settings
      </button>
    </div>
  );
};

export default SettingsPage;
