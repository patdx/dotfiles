import { Database } from '@db/sqlite'
import {
  LanguageModelV1Middleware,
  LanguageModelV1StreamPart,
  simulateReadableStream,
} from 'ai'

export const cacheDb = new Database('cache.db')

// Create cache table if it doesn't exist
cacheDb.prepare(`
  CREATE TABLE IF NOT EXISTS llm_cache (
    hash TEXT PRIMARY KEY,
    cache_key TEXT NOT NULL,
    result TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`).run()

// https://sdk.vercel.ai/docs/advanced/caching

function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  return crypto.subtle.digest('SHA-256', data).then((hash) => {
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  })
}

export const cacheMiddleware: LanguageModelV1Middleware = {
  wrapGenerate: async ({ doGenerate, params }) => {
    const paramsString = JSON.stringify(params)
    const cacheKey = await hashKey(paramsString)

    const cached = cacheDb.prepare(
      'SELECT result FROM llm_cache WHERE hash = ?',
    ).get([cacheKey]) as { result: string } | undefined

    if (cached !== undefined) {
      const result = JSON.parse(cached.result)
      return {
        ...result,
        response: {
          ...result.response,
          timestamp: result?.response?.timestamp
            ? new Date(result?.response?.timestamp)
            : undefined,
        },
      }
    }

    const result = await doGenerate()

    try {
      cacheDb.prepare(
        'INSERT INTO llm_cache (hash, cache_key, result) VALUES (?, ?, ?)',
      ).run(cacheKey, paramsString, JSON.stringify(result))
    } catch (error: unknown) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error)
      console.warn(
        `Warning: Failed to cache result for key ${cacheKey}: ${errorMessage}`,
      )
    }

    return result
  },
  wrapStream: async ({ doStream, params }) => {
    const paramsString = JSON.stringify(params)
    const cacheKey = await hashKey(paramsString)

    const cached = cacheDb.prepare(
      'SELECT result FROM llm_cache WHERE hash = ?',
    ).get([cacheKey]) as { result: string } | undefined

    if (cached !== undefined) {
      const formattedChunks = JSON.parse(cached.result).map(
        (p: LanguageModelV1StreamPart) => {
          if (p.type === 'response-metadata' && p.timestamp) {
            return { ...p, timestamp: new Date(p.timestamp) }
          } else return p
        },
      )
      return {
        stream: simulateReadableStream({
          chunks: formattedChunks,
        }),
        rawCall: { rawPrompt: null, rawSettings: {} },
      }
    }

    const { stream, ...rest } = await doStream()

    const fullResponse: LanguageModelV1StreamPart[] = []

    const transformStream = new TransformStream<
      LanguageModelV1StreamPart,
      LanguageModelV1StreamPart
    >({
      transform(chunk, controller) {
        fullResponse.push(chunk)
        controller.enqueue(chunk)
      },
      async flush() {
        try {
          cacheDb.prepare(
            'INSERT INTO llm_cache (hash, cache_key, result) VALUES (?, ?, ?)',
          ).run(cacheKey, paramsString, JSON.stringify(fullResponse))
        } catch (error: unknown) {
          const errorMessage = error instanceof Error
            ? error.message
            : String(error)
          console.warn(
            `Warning: Failed to cache stream for key ${cacheKey}: ${errorMessage}`,
          )
        }
      },
    })

    return {
      stream: stream.pipeThrough(transformStream),
      ...rest,
    }
  },
}
