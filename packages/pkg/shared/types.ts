export interface InstallOptions {
  url: string
  binaryName?: string
  version?: string
  urlProvider?: string
  shortcut?: {
    name?: string
    icon?: string
  }
  doAfterInstall?: () => Promise<void>
}

export type KnownPackage = {
  name: string
  options: InstallOptions | (() => Promise<InstallOptions>)
}

export interface UrlCheckResult {
  binaryUrl: string
  version?: string
  type: 'zip' | 'targz'
  urlType: 'github' | 'direct' | string // extensible for future providers
}

export interface UrlProvider {
  name: string
  check: (url: string) => Promise<UrlCheckResult | null> | UrlCheckResult | null
}
