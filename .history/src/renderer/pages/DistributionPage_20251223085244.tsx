/**
 * Distribution Page - Publishing and Sales
 * Configure channels, publish apps, track sales
 */

import React, { useState } from 'react';

const DistributionPage: React.FC = () => {
  const [showPublishWizard, setShowPublishWizard] = useState(false);
  const [selectedChannelSettings, setSelectedChannelSettings] = useState<string | null>(null);

  const channels = [
    { id: 'gumroad', name: 'Gumroad', color: 'blue' },
    { id: 'kofi', name: 'Ko-fi', color: 'red' },
    { id: 'itchio', name: 'Itch.io', color: 'purple' },
  ];

  return (
    <div data-testid="page-distribution" className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Distribution</h1>
        <button
          data-testid="start-publish"
          onClick={() => setShowPublishWizard(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
        >
          Publish App
        </button>
      </div>

      {/* Channel Configuration */}
      <div data-testid="channel-config" className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Distribution Channels</h2>
        <div className="space-y-3">
          {channels.map((channel) => (
            <div
              key={channel.id}
              data-testid={`channel-${channel.id}`}
              className="flex justify-between items-center py-3 border-b"
            >
              <div data-testid="channel-item">
                <h3 className="font-semibold">{channel.name}</h3>
                <p className="text-sm text-gray-500">Connect your {channel.name} account</p>
              </div>
              <button
                data-testid="channel-settings"
                onClick={() => setSelectedChannelSettings(channel.id)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-1 px-3 rounded text-sm"
              >
                Settings
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Channel Settings Dialog */}
      {selectedChannelSettings && (
        <div data-testid="channel-settings-dialog" className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">
            {channels.find((c) => c.id === selectedChannelSettings)?.name} Settings
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
              <input
                data-testid="api-key-input"
                type="password"
                placeholder="Enter your API key"
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            <div className="flex gap-3">
              <button
                data-testid="save-channel-settings"
                onClick={() => setSelectedChannelSettings(null)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
              >
                Save
              </button>
              <button
                onClick={() => setSelectedChannelSettings(null)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold py-2 px-4 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publish Wizard */}
      {showPublishWizard && (
        <PublishWizard onClose={() => setShowPublishWizard(false)} />
      )}

      {/* Publications */}
      <div data-testid="publications-section" className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Publications</h2>
        <div className="mb-4 flex gap-3">
          <select
            data-testid="publication-status-filter"
            className="px-4 py-2 border rounded-lg"
          >
            <option value="all">All</option>
            <option value="live">Live</option>
            <option value="draft">Draft</option>
          </select>
        </div>
        <div data-testid="publications-list" className="space-y-2">
          <p className="text-gray-500 py-8 text-center">No publications yet</p>
        </div>
      </div>

      {/* Sales Summary */}
      <div data-testid="sales-summary" className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">Total Sales</div>
          <div className="mt-2 text-2xl font-bold">$0.00</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">This Month</div>
          <div className="mt-2 text-2xl font-bold">$0.00</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">Average Price</div>
          <div className="mt-2 text-2xl font-bold">$0.00</div>
        </div>
      </div>
    </div>
  );
};

interface PublishWizardProps {
  onClose: () => void;
}

const PublishWizard: React.FC<PublishWizardProps> = ({ onClose }) => {
  const [step, setStep] = useState<'app' | 'channels' | 'pricing'>('app');

  return (
    <div data-testid="publish-wizard" className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">Publish App</h2>
      
      {step === 'app' && (
        <div data-testid="wizard-step-app" className="space-y-4">
          <div data-testid="publishable-apps-list" className="border rounded-lg p-4">
            <p className="text-gray-500">No apps available to publish</p>
          </div>
        </div>
      )}

      {step === 'channels' && (
        <div data-testid="wizard-step-channels" className="space-y-4">
          <label className="flex items-center">
            <input
              data-testid="select-channel-gumroad"
              type="checkbox"
              className="mr-3"
            />
            <span>Gumroad</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              className="mr-3"
            />
            <span>Ko-fi</span>
          </label>
        </div>
      )}

      {step === 'pricing' && (
        <div data-testid="wizard-step-pricing" className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
            <input
              data-testid="price-input"
              type="number"
              step="0.01"
              placeholder="0.00"
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
        </div>
      )}

      <div className="mt-6 flex gap-3 justify-end">
        {step !== 'app' && (
          <button
            onClick={() => setStep(step === 'channels' ? 'app' : 'channels')}
            className="bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold py-2 px-4 rounded"
          >
            Back
          </button>
        )}
        {step !== 'pricing' && (
          <button
            data-testid="wizard-next"
            onClick={() => setStep(step === 'app' ? 'channels' : 'pricing')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
          >
            Next
          </button>
        )}
        {step === 'pricing' && (
          <button
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded"
          >
            Publish
          </button>
        )}
        <button
          data-testid="wizard-cancel"
          onClick={onClose}
          className="bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold py-2 px-4 rounded"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default DistributionPage;
