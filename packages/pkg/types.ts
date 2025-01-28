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
