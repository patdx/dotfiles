export interface FileOptions {
  url: string
  filename?: string // Target filename, defaults to original name if not specified
  type?: 'zip' | 'targz' | 'raw' // Add 'raw' type for direct file download
  executable?: boolean // Whether to make the file executable (chmod +x)
  urlProvider?: string
}

export interface InstallOptions {
  files: FileOptions[] // Array of files to download
  binaryName?: string // Main executable name
  version?: string // Package version
  shortcut?: {
    name?: string
    icon?: string
  }
  doAfterInstall?: () => Promise<void>

  // Legacy fields for backward compatibility during migration
  /** @deprecated use files array instead */
  url?: string
  /** @deprecated use files array instead */
  urlProvider?: string
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
