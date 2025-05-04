'use client';
import { useSettingsStore } from '../stores/settingsStore';
import { MainLayout } from '@/components/layouts/MainLayout';

export default function SettingsPage() {
  const { settings, updateAIProvider, updateWalletKey, updateAdditionalSettings, togglePrivateCompute } = useSettingsStore();

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateAIProvider({
      ...settings.aiProvider,
      provider: e.target.value as 'openai' | 'atoma' | 'venice'
    });
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateAIProvider({
      ...settings.aiProvider,
      modelName: e.target.value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Saving settings', settings);
    updateAIProvider({
      provider: settings.aiProvider.provider,
      apiKey: settings.aiProvider.apiKey,
      modelName: settings.aiProvider.modelName
    });
  };

  // Get model options based on selected provider
  const getModelOptions = () => {
    switch (settings.aiProvider.provider) {
      case 'venice':
        return [
          { value: 'dolphin-2.9.2-qwen2-72b', label: 'Dolphin 2.9.2 Qwen2 72B' },
          { value: 'sdxl-1.0', label: 'SDXL 1.0' }
        ];
      case 'openai':
        return [
          { value: 'gpt-4o', label: 'GPT-4o' },
          { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
        ];
      case 'atoma':
        return [
          { value: 'deepseek-r1', label: 'DeepSeek-R1' },
          { value: 'meta-llama/Llama-3.3-70B-Instruct', label: 'Llama 3.3 70B' }
        ];
      default:
        return [];
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Agent Settings</h1>

        <form onSubmit={handleSubmit}>
          {/* AI Provider Settings */}
          <section className="rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">AI Provider Configuration</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Provider</label>
                <select 
                  value={settings.aiProvider.provider}
                  onChange={handleProviderChange}
                  className="w-full border rounded-md p-2 bg-black"
                >
                  <option value="openai">OpenAI</option>
                  <option value="atoma">Atoma (Private Compute)</option>
                  <option value="venice">Venice AI</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">API Key</label>
                <input
                  type="password"
                  value={settings.aiProvider.apiKey}
                  onChange={(e) => updateAIProvider({
                    ...settings.aiProvider,
                    apiKey: e.target.value
                  })}
                  className="w-full border rounded-md p-2"
                  placeholder={`Enter your ${settings.aiProvider.provider} API key`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Model Name</label>
                <select 
                  value={settings.aiProvider.modelName}
                  onChange={handleModelChange}
                  className="w-full border rounded-md p-2 bg-black"
                >
                  {getModelOptions().map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {settings.aiProvider.provider === 'atoma' && (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.enablePrivateCompute}
                    onChange={togglePrivateCompute}
                    id="private-compute"
                  />
                  <label htmlFor="private-compute">
                    Enable Private Compute (TEE Protection)
                  </label>
                </div>
              )}

              {settings.aiProvider.provider === 'venice' && (
                <div className="mt-4 p-4 bg-blue-50 rounded-md">
                  <h3 className="text-sm font-medium text-blue-800 mb-2">Venice AI Information</h3>
                  <p className="text-sm text-blue-600">
                    Venice AI provides OpenAI-compatible APIs with additional features:
                  </p>
                  <ul className="list-disc list-inside text-sm text-blue-600 mt-2">
                    <li>High-performance models</li>
                    <li>Image generation capabilities</li>
                    <li>Customizable system prompts</li>
                    <li>Compatible with existing OpenAI tools</li>
                  </ul>
                </div>
              )}
            </div>
          </section>

          {/* Additional API Keys */}
          <section className="rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Additional API Keys</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Wallet Private Key</label>
                <input
                  type="password"
                  value={settings.walletKey}
                  onChange={(e) => updateWalletKey(e.target.value)}
                  className="w-full border rounded-md p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Brian API Key</label>
                <input
                  type="password"
                  value={settings.additionalSettings.brianApiKey || ''}
                  onChange={(e) => updateAdditionalSettings({ brianApiKey: e.target.value })}
                  className="w-full border rounded-md p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">CoinGecko API Key</label>
                <input
                  type="password"
                  value={settings.additionalSettings.coingeckoApiKey || ''}
                  onChange={(e) => updateAdditionalSettings({ coingeckoApiKey: e.target.value })}
                  className="w-full border rounded-md p-2"
                />
              </div>
            </div>
          </section>

          <div className="flex gap-4">
            <button
              type="submit"
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
            >
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
} 