import { ValibotJsonStore } from './valibot-json-store.ts'
import { LlmCliConfig, type Model, type Provider } from './types.ts'
import * as v from 'valibot'

const CONFIG_FILE = 'llm-cli-config.json'

class LlmCliConfigStore {
  private store: ValibotJsonStore<typeof LlmCliConfig>

  constructor() {
    this.store = new ValibotJsonStore({
      schema: LlmCliConfig,
      fileName: CONFIG_FILE,
    })
  }

  async getConfig() {
    return await this.store.getData()
  }

  async updateConfig({
    files,
    provider,
    model,
  }: v.InferInput<typeof LlmCliConfig>) {
    await this.store.setData((currentConfig) => ({
      ...currentConfig,
      ...(files != undefined && Object.keys(files).length > 0 ? { files } : {}),
      ...(provider !== undefined ? { provider } : {}),
      ...(model !== undefined ? { model } : {}),
    }))
  }

  async reset() {
    await this.store.reset()
  }
}

// Export a singleton instance
export const llmCliConfigStore = new LlmCliConfigStore()
