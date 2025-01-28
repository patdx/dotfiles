import process from 'node:process'
import { readGithubUrl } from './normalize-github-url.ts'

interface UrlCheckResult {
  binaryUrl: string
  version?: string
  type: 'zip' | 'targz'
  urlType: 'github' | 'direct' | string // extensible for future providers
}

interface GithubRelease {
  tag_name: string
  assets: Array<{
    browser_download_url: string
    name: string
  }>
}

const BINARY_EXTENSIONS = ['.tar.gz', '.tgz', '.zip']
const NON_BINARY_EXTENSIONS = ['.symbols.tar.gz', '-symbols.tar.gz']

// Another example ambiguous case
// Warning: Found multiple matching assets for your system:
// - duckdb_cli-linux-amd64.zip
// - libduckdb-linux-amd64.zip
// Maybe add a heuristic where if it contains "cli", +1 point
// If it contains "lib", -1 point?

function couldBeBinary(url: string): boolean {
  url = url.toLowerCase()
  return BINARY_EXTENSIONS.some((ext) => url.endsWith(ext)) &&
    NON_BINARY_EXTENSIONS.every((ext) => !url.endsWith(ext))
}

function getPlatformIdentifiers(): { platforms: string[]; archs: string[] } {
  const platforms = process.platform === 'win32'
    ? ['windows']
    : [process.platform]
  const archs = process.arch === 'x64'
    ? ['x86_64', 'amd64', 'x64']
    : [process.arch]
  return { platforms, archs }
}

async function checkGithubUrl(url: string): Promise<UrlCheckResult | null> {
  const gitHubUrl = readGithubUrl(url)
  if (!gitHubUrl) {
    return null
  }

  const apiUrl =
    `https://api.github.com/repos/${gitHubUrl.repoName}/releases/latest`

  const response = await fetch(apiUrl)

  if (!response.ok) return null

  const release: GithubRelease = await response.json()
  if (release.assets.length === 0) return null

  const { platforms, archs } = getPlatformIdentifiers()

  // Create detailed asset analysis
  const assetAnalysis = release.assets.map((asset) => {
    const name = asset.name.toLowerCase()
    const matchingPlatform = platforms.find((platform) =>
      name.includes(platform.toLowerCase())
    )
    const matchingArch = archs.find((arch) => name.includes(arch.toLowerCase()))
    const isBinary = couldBeBinary(name)

    return {
      name: asset.name,
      url: asset.browser_download_url,
      analysis: {
        matchingPlatform,
        matchingArch,
        isBinary,
      },
    }
  })

  // Find all viable assets
  const viableAssets = release.assets.filter((asset) =>
    platforms.some((platform) =>
      asset.name.toLowerCase().includes(platform.toLowerCase())
    ) && archs.some((arch) =>
      asset.name.toLowerCase().includes(arch.toLowerCase())
    ) && couldBeBinary(asset.name)
  )

  if (viableAssets.length > 1) {
    console.warn(
      `Warning: Found multiple matching assets for your system:\n${
        viableAssets.map((asset) => `- ${asset.name}`).join('\n')
      }\nSelecting first matching asset: ${viableAssets[0].name}`,
    )
  }

  const platformAsset = viableAssets[0]
  const downloadUrl = platformAsset?.browser_download_url

  if (!downloadUrl) {
    const errorDetails = [
      `Could not find a matching release asset for your system:`,
      `- Platform(s): ${platforms.join(', ')}`,
      `- Architecture(s): ${archs.join(', ')}`,
      `\nAvailable assets:`,
      ...assetAnalysis.map((asset) =>
        [
          `\n${asset.name}:`,
          `  - Matches platform: ${asset.analysis.matchingPlatform || 'no'}`,
          `  - Matches architecture: ${asset.analysis.matchingArch || 'no'}`,
          `  - Is binary: ${asset.analysis.isBinary ? 'yes' : 'no'}`,
        ].join('\n')
      ),
    ].join('\n')

    throw new Error(errorDetails)
  }

  return {
    binaryUrl: downloadUrl,
    version: release.tag_name.replace(/^v/, ''),
    type: downloadUrl.toLowerCase().endsWith('.tar.gz') ||
        downloadUrl.toLowerCase().endsWith('.tgz')
      ? 'targz'
      : 'zip',
    urlType: 'github',
  }
}

function checkDirectUrl(url: string): UrlCheckResult | null {
  try {
    new URL(url)
    return {
      binaryUrl: url,
      type: url.toLowerCase().endsWith('.tar.gz') ||
          url.toLowerCase().endsWith('.tgz')
        ? 'targz'
        : 'zip',
      urlType: 'direct',
    }
  } catch {
    return null
  }
}

interface UrlProvider {
  name: string
  check: (url: string) => Promise<UrlCheckResult | null> | UrlCheckResult | null
}

const providers: UrlProvider[] = [
  {
    name: 'github',
    check: checkGithubUrl,
  },
  {
    name: 'direct',
    check: checkDirectUrl,
  },
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
