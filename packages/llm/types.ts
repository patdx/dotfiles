import * as v from 'valibot'

export const PROVIDERS = ['openrouter', 'groq', 'cerebras'] as const
export const Provider = v.picklist(PROVIDERS)
export type Provider = v.InferOutput<typeof Provider>

export const Model = v.picklist([
  'deepseek/deepseek-chat',
  'deepseek-r1-distill-llama-70b',
  'llama-3.3-70b-versatile',
  'llama-3.3-70b',
  'google/gemini-2.0-flash-thinking-exp:free',
  'google/gemini-2.0-flash-exp:free',
])
export type Model = v.InferOutput<typeof Model>

export const LlmCliConfig = v.object({
  files: v.nullish(v.record(v.string(), v.boolean())),
  provider: v.nullish(Provider),
  model: v.nullish(Model),
})
export type LlmCliConfig = v.InferOutput<typeof LlmCliConfig>

export const supportedModelByProvider: Record<Provider, Model[]> = {
  openrouter: [
    'deepseek/deepseek-chat',
    'google/gemini-2.0-flash-thinking-exp:free',
    'google/gemini-2.0-flash-exp:free',
  ],
  groq: ['deepseek-r1-distill-llama-70b', 'llama-3.3-70b-versatile'],
  cerebras: ['llama-3.3-70b'],
}

export type PromptResult = {
  fullPrompt: string
  loggedPrompt: string
}

export type CLIFlags = {
  _: string[]
  file?: string[]
  stdin: boolean
  provider: Provider
  model?: Model
  format: string
  context?: string
  interactive: boolean
  verbose: boolean
  help: boolean
  clear: boolean
}
