import type { UrlCheckResult, UrlProvider } from './types.ts'
import { directProvider } from './url-checker-direct.ts'
import { githubProvider } from './url-checker-github.ts'

const providers: UrlProvider[] = [
  githubProvider,
  directProvider,
]

export async function checkUrl(
  url: string,
  preferredProvider?: string,
): Promise<UrlCheckResult> {
  // If preferred provider specified, try that first
  if (preferredProvider) {
    const provider = providers.find((p) => p.name === preferredProvider)
    if (!provider) {
      throw new Error(`Unknown provider: ${preferredProvider}`)
    }
    const result = await provider.check(url)
    if (result) return result
    throw new Error(
      `Preferred provider '${preferredProvider}' could not handle URL: ${url}`,
    )
  }

  // Otherwise try all providers
  for (const provider of providers) {
    const result = await provider.check(url)
    if (result) return result
  }

  throw new Error(`Unsupported URL format: ${url}`)
}

// Export provider names for external use
export const availableProviders = providers.map((p) => p.name)
