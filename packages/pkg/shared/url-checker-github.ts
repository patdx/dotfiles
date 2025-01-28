import process from 'node:process'
import { readGithubUrl } from './normalize-github-url.ts'
import type { UrlCheckResult, UrlProvider } from './types.ts'

export const githubProvider: UrlProvider = {
  name: 'github',
  check: checkGithubUrl,
}

export interface GithubRelease {
  tag_name: string
  assets: Array<{
    browser_download_url: string
    name: string
  }>
}

interface AssetAnalysis {
  name: string
  url: string
  analysis: {
    matchingPlatform: string | undefined
    matchingArch: string | undefined
    isBinary: boolean
    score: number // Default score for ranking multiple viable options
  }
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

interface CheckerContext {
  platform: string
  arch: string
}

export function getPlatformIdentifiers(
  context: CheckerContext = { platform: process.platform, arch: process.arch },
): { platforms: string[]; archs: string[] } {
  const platforms: string[] = [context.platform]

  if (context.platform === 'darwin') {
    platforms.push('macos', 'osx')
  } else if (context.platform === 'linux') {
    platforms.push('linux')
  } else if (context.platform === 'win32') {
    platforms.push('windows')
  } else {
    platforms.push(context.platform)
  }

  const archs: string[] = [context.arch]

  if (context.arch === 'x64') {
    archs.push('amd64', 'x64')
  } else if (context.arch === 'arm64') {
    archs.push('aarch64')
  }

  if (context.platform === 'darwin') {
    archs.push('universal')
  }

  return { platforms, archs }
}

export async function fetchGithubRelease(
  repoName: string,
): Promise<GithubRelease | null> {
  const apiUrl = `https://api.github.com/repos/${repoName}/releases/latest`
  const response = await fetch(apiUrl)

  if (!response.ok) return null

  const release: GithubRelease = await response.json()
  return release.assets.length > 0 ? release : null
}

export function analyzeAssets(
  assets: GithubRelease['assets'],
  context: CheckerContext,
): AssetAnalysis[] {
  const { platforms, archs } = getPlatformIdentifiers(context)

  const analyzed = assets.map((asset) => {
    const name = asset.name.toLowerCase()
    const matchingPlatform = platforms.find((platform) =>
      name.includes(platform.toLowerCase())
    )
    const matchingArch = archs.find((arch) => name.includes(arch.toLowerCase()))
    const isBinary = couldBeBinary(name)

    // Calculate score based on heuristics
    let score = 0

    // Positive patterns
    if (name.includes('cli')) score += 2
    if (
      name.includes('bin') || name.includes('exe') || name.includes('binary')
    ) score += 1

    // Negative patterns
    if (name.includes('lib')) score -= 1
    if (name.includes('src') || name.includes('source')) score -= 3
    if (name.includes('debug') || name.includes('dbg')) score -= 2
    if (name.includes('dev') || name.includes('devel')) score -= 2
    if (name.includes('symbols') || name.includes('pdb')) score -= 2
    if (name.includes('static') || name.includes('shared')) score -= 1

    return {
      name: asset.name,
      url: asset.browser_download_url,
      analysis: {
        matchingPlatform,
        matchingArch,
        isBinary,
        score,
      },
    }
  })

  // Sort by score in descending order (highest to lowest)
  return analyzed.sort((a, b) => b.analysis.score - a.analysis.score)
}

export function generateErrorDetails(
  assetAnalysis: AssetAnalysis[],
  context: CheckerContext,
): string {
  const { platforms, archs } = getPlatformIdentifiers(context)
  return [
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
        `  - Score: ${asset.analysis.score}`,
      ].join('\n')
    ),
  ].join('\n')
}

export function findViableAsset(
  assetAnalysis: AssetAnalysis[],
  context: CheckerContext,
): AssetAnalysis | null {
  const viableAssets = assetAnalysis.filter((asset) =>
    asset.analysis.matchingPlatform &&
    asset.analysis.matchingArch &&
    asset.analysis.isBinary
  )

  if (viableAssets.length > 1) {
    console.warn(
      [
        `Warning: Found multiple matching assets for your system:`,
        generateErrorDetails(viableAssets, context),
        `\nSelecting highest scored asset: ${viableAssets[0].name}`,
      ].join('\n'),
    )
  }

  return viableAssets[0] || null
}

async function checkGithubUrl(
  url: string,
  context: CheckerContext = { platform: process.platform, arch: process.arch },
): Promise<UrlCheckResult | null> {
  const gitHubUrl = readGithubUrl(url)
  if (!gitHubUrl) {
    return null
  }

  const release = await fetchGithubRelease(gitHubUrl.repoName)
  if (!release) return null

  const assetAnalysis = analyzeAssets(release.assets, context)
  const viableAsset = findViableAsset(assetAnalysis, context)

  if (!viableAsset) {
    throw new Error(generateErrorDetails(assetAnalysis, context))
  }

  return {
    binaryUrl: viableAsset.url,
    version: release.tag_name.replace(/^v/, ''),
    type: viableAsset.url.toLowerCase().endsWith('.tar.gz') ||
        viableAsset.url.toLowerCase().endsWith('.tgz')
      ? 'targz'
      : 'zip',
    urlType: 'github',
  }
}
