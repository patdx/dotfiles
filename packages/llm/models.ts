import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { createGroq } from '@ai-sdk/groq'
import { createCerebras } from '@ai-sdk/cerebras'
import { wrapLanguageModel } from 'ai'
import { Model, Provider } from './types.ts'
import { cacheMiddleware } from './cache-middleware.ts'

export function getOpenRouter(model: Model) {
  const apiKey = Deno.env.get('OPENROUTER_API_KEY')
  if (!apiKey) {
    console.error('Error: OPENROUTER_API_KEY environment variable is not set')
    Deno.exit(1)
  }
  console.log('Using OpenRouter' + model)
  return createOpenRouter({ apiKey }).chat(model)
}

export function getGroqModel(model: Model) {
  const groq = createGroq({
    apiKey: Deno.env.get('GROQ_API_KEY'),
  })

  return groq.languageModel(model)
}

export function getCerebrasModel(model: Model) {
  const cerebras = createCerebras({
    apiKey: Deno.env.get('CEREBRAS_API_KEY'),
  })
  return cerebras.languageModel(model)
}

export function getModelInstance(provider: Provider, model: Model) {
  if (provider === 'groq') {
    return getGroqModel(model)
  } else if (provider === 'openrouter') {
    return getOpenRouter(model)
  } else if (provider === 'cerebras') {
    return getCerebrasModel(model)
  } else {
    throw new Error('Invalid provider ' + provider)
  }
}

export function createWrappedModel(provider: Provider, model: Model) {
  const modelInstance = getModelInstance(provider, model)
  return wrapLanguageModel({
    model: modelInstance,
    middleware: cacheMiddleware,
  })
}
